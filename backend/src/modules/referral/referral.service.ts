import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Referrer, ReferrerDocument } from './models/referrer.model';
import { MiniProgramUser } from '../miniprogram-user/models/miniprogram-user.entity';
import { ReferralResume, ReferralResumeDocument } from './models/referral-resume.model';
import { ReferralBindingLog, ReferralBindingLogDocument } from './models/referral-binding-log.model';
import { ReferralReward, ReferralRewardDocument } from './models/referral-reward.model';
import { Contract, ContractDocument } from '../contracts/models/contract.model';
import { ResumeService } from '../resume/resume.service';
import { UsersService } from '../users/users.service';
import { MiniProgramUserService } from '../miniprogram-user/miniprogram-user.service';
import { MiniProgramNotificationService } from '../miniprogram-notification/miniprogram-notification.service';
import { MiniProgramNotificationType } from '../miniprogram-notification/models/miniprogram-notification.model';
import { NotificationHelperService } from '../notification/notification-helper.service';
import { WechatCloudService } from '../weixin/services/wechat-cloud.service';
import { AuntBlacklistService } from '../aunt-blacklist/aunt-blacklist.service';

/** 简历库工种枚举（英文 key → 中文 label），小程序以此为准提交 serviceType */
export const REFERRAL_JOB_TYPES = [
  { value: 'yuesao',       label: '月嫂' },
  { value: 'zhujia-yuer',  label: '住家育儿嫂' },
  { value: 'baiban-yuer',  label: '白班育儿' },
  { value: 'baojie',       label: '保洁' },
  { value: 'baiban-baomu', label: '白班保姆' },
  { value: 'zhujia-baomu', label: '住家保姆' },
  { value: 'yangchong',    label: '养宠' },
  { value: 'xiaoshi',      label: '小时工' },
  { value: 'zhujia-hulao', label: '住家护老' },
  { value: 'jiajiao',      label: '家教' },
  { value: 'peiban',       label: '陪伴师' },
] as const;

/** value Set，用于快速校验 */
const VALID_JOB_TYPE_VALUES = new Set<string>(REFERRAL_JOB_TYPES.map(j => j.value));

/** 历史中文 → 英文 key 兜底映射（云DB同步旧数据用） */
const LEGACY_SERVICE_TYPE_MAP: Record<string, string> = {
  '月嫂':   'yuesao',
  '育婴嫂': 'zhujia-yuer',
  '保姆':   'zhujia-baomu',
  '护老':   'zhujia-hulao',
  '小时工': 'xiaoshi',
};

/**
 * 将任意 serviceType（英文 key 或历史中文）统一转换为合法英文 key。
 * 转换失败返回 undefined。
 */
function normalizeServiceType(raw: string): string | undefined {
  if (VALID_JOB_TYPE_VALUES.has(raw)) return raw;
  return LEGACY_SERVICE_TYPE_MAP[raw];
}

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectModel(Referrer.name)
    private readonly referrerModel: Model<ReferrerDocument>,
    @InjectModel(ReferralResume.name)
    private readonly referralResumeModel: Model<ReferralResumeDocument>,
    @InjectModel(ReferralBindingLog.name)
    private readonly bindingLogModel: Model<ReferralBindingLogDocument>,
    @InjectModel(ReferralReward.name)
    private readonly rewardModel: Model<ReferralRewardDocument>,
    @InjectModel(MiniProgramUser.name)
    private readonly mpUserModel: Model<MiniProgramUser>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
    private readonly resumeService: ResumeService,
    private readonly usersService: UsersService,
    private readonly mpUserService: MiniProgramUserService,
    private readonly notificationService: MiniProgramNotificationService,
    private readonly notificationHelperService: NotificationHelperService,
    private readonly wechatCloudService: WechatCloudService,
    private readonly auntBlacklistService: AuntBlacklistService,
  ) {}

  // ============================================================
  // 工具方法
  // ============================================================

  /** 返回小程序可选工种列表（value=英文 key，label=中文） */
  getJobTypes() {
    return REFERRAL_JOB_TYPES;
  }

  /** 获取管理员用户信息 */
  private async getAdminUser(): Promise<any> {
    const admin = await this.usersService.findAdminUser();
    if (!admin) throw new Error('系统中未找到管理员账号');
    return admin;
  }

  /** 发送站内通知 */
  private async sendNotification(phone: string, type: MiniProgramNotificationType, title: string, content: string, extra?: Record<string, any>) {
    try {
      await this.notificationService.createNotification({ phone, type, title, content, extra });
    } catch (err) {
      this.logger.error(`发送通知失败 [${type}] to ${phone}: ${err.message}`);
    }
  }

  // ============================================================
  // 推荐人注册相关（referrer 侧）
  // ============================================================

  /**
   * 注册为推荐人（提交申请）
   * approvalStatus = pending_approval，users.role 保持不变
   *
   * 来源员工身份三件套（sourceOpenid / sourcePhone / sourceStaffId）按优先级解析，
   * 命中后用真实 users._id 写进 referrers.sourceStaffId，避免脏 ID 漏到库里。
   */
  async registerReferrer(openid: string, data: {
    name: string;
    phone: string;
    wechatId: string;
    sourceStaffId?: string;
    sourceOpenid?: string;
    sourcePhone?: string;
    sourceCustomerId?: string; // 可选：来源客户ID
  }): Promise<ReferrerDocument> {
    // 解析真实的 sourceStaffId（openid → phone → staffId，均未命中兜底管理员）
    const resolvedSourceStaffId = await this.resolveSourceStaffId({
      sourceOpenid: data.sourceOpenid,
      sourcePhone: data.sourcePhone,
      sourceStaffId: data.sourceStaffId,
    });

    // 检查是否已有申请记录
    const existing = await this.referrerModel.findOne({ openid }).exec();
    if (existing) {
      if (existing.approvalStatus === 'approved') {
        throw new BadRequestException('您已是推荐人，无需重复申请');
      }
      if (existing.approvalStatus === 'pending_approval') {
        throw new BadRequestException('您的申请正在审批中，请等待管理员审核');
      }
      // rejected 状态允许重新申请，更新记录
      existing.name = data.name;
      existing.phone = data.phone;
      existing.wechatId = data.wechatId;
      existing.sourceStaffId = resolvedSourceStaffId;
      if (data.sourceCustomerId) existing.sourceCustomerId = data.sourceCustomerId;
      existing.approvalStatus = 'pending_approval';
      existing.rejectedReason = undefined;
      await existing.save();
      await this.notifyReferrerRegistration(existing);
      return existing;
    }

    // 检查手机号是否已被其他推荐人使用
    const phoneExists = await this.referrerModel.findOne({ phone: data.phone, openid: { $ne: openid } }).exec();
    if (phoneExists) {
      throw new BadRequestException('该手机号已注册为推荐人');
    }

    const referrer = await this.referrerModel.create({
      openid,
      name: data.name,
      phone: data.phone,
      wechatId: data.wechatId,
      sourceStaffId: resolvedSourceStaffId,
      sourceCustomerId: data.sourceCustomerId,
      approvalStatus: 'pending_approval',
      totalReferrals: 0,
      totalRewardAmount: 0,
      status: 'active',
    });

    await this.notifyReferrerRegistration(referrer);
    return referrer;
  }

  /**
   * 按 openid → phone → staffId 优先级解析来源员工真实 users._id。
   * 若命中 phone 分支且该员工 wechatOpenId 为空，顺手回填 sourceOpenid。
   * 三个都未命中时兜底到管理员 _id，保证 sourceStaffId 始终指向一个有效用户。
   */
  private async resolveSourceStaffId(input: {
    sourceOpenid?: string;
    sourcePhone?: string;
    sourceStaffId?: string;
  }): Promise<string> {
    // 1) 优先用 openid 匹配 users.wechatOpenId
    if (input.sourceOpenid) {
      const staff = await this.usersService.findByWeChatOpenId(input.sourceOpenid);
      if (staff?._id) return staff._id.toString();
    }

    // 2) 回落到 phone 匹配 users.phone；命中且 wechatOpenId 空 → 回填 sourceOpenid
    if (input.sourcePhone) {
      const staff = await this.usersService.findByPhone(input.sourcePhone);
      if (staff?._id) {
        const staffId = staff._id.toString();
        if (input.sourceOpenid && !staff.wechatOpenId) {
          try {
            await this.usersService.updateWeChatInfo(staffId, { openId: input.sourceOpenid });
            this.logger.log(
              `[registerReferrer] 回填 users.wechatOpenId: userId=${staffId} openid=${input.sourceOpenid}`,
            );
          } catch (err) {
            this.logger.warn(`[registerReferrer] 回填 wechatOpenId 失败: ${(err as any).message}`);
          }
        }
        return staffId;
      }
    }

    // 3) 最后回落到 sourceStaffId（必须是合法 ObjectId 且能查到用户）
    if (input.sourceStaffId && Types.ObjectId.isValid(input.sourceStaffId)) {
      const staff = await this.usersService.findById(input.sourceStaffId);
      if (staff?._id) return staff._id.toString();
    }

    // 4) 三项全部未命中 → 兜底管理员，保证 sourceStaffId 永远落在合法用户上
    const admin = await this.usersService.findAdminUser();
    if (admin?._id) {
      this.logger.warn(
        `[registerReferrer] 无法解析来源员工，兜底至管理员: sourceOpenid=${input.sourceOpenid || ''} ` +
        `sourcePhone=${input.sourcePhone || ''} sourceStaffId=${input.sourceStaffId || ''} admin=${admin._id}`,
      );
      return admin._id.toString();
    }
    throw new BadRequestException('未能定位到有效的来源员工');
  }

  /**
   * 查询当前 openid 的推荐人申请状态（供等待页轮询）
   */
  async checkReferrerStatus(openid: string): Promise<{
    approvalStatus: string;
    name?: string;
    phone?: string;
    sourceStaffId?: string;
    sourceCustomerId?: string;
    rejectedReason?: string;
    createdAt?: Date;
  }> {
    const referrer = await this.referrerModel.findOne({ openid }).lean().exec();
    if (!referrer) return { approvalStatus: 'not_applied' };
    // 字段全部展开到顶层，小程序可直接读 data.approvalStatus / data.name 等，无需二次解包
    return {
      approvalStatus: (referrer as any).approvalStatus,
      name: referrer.name,
      phone: referrer.phone,
      sourceStaffId: referrer.sourceStaffId,
      sourceCustomerId: (referrer as any).sourceCustomerId,
      rejectedReason: (referrer as any).rejectedReason,
      createdAt: (referrer as any).createdAt,
    };
  }

  /** 通知来源员工和管理员有新的推荐人申请 */
  private async notifyReferrerRegistration(referrer: ReferrerDocument) {
    try {
      const referrerId = referrer._id?.toString();
      const crmNotifyUserIds: string[] = []; // 收集需要推送 CRM 铃铛的用户 ID

      // 通知来源员工（小程序通知 + CRM 铃铛）
      const sourceStaff = await this.usersService.findById(referrer.sourceStaffId);
      if (sourceStaff?.phone) {
        await this.sendNotification(
          sourceStaff.phone,
          MiniProgramNotificationType.REFERRAL_NEW_REFERRER,
          '有人通过您的海报申请成为推荐人',
          `${referrer.name} 通过您的招募海报申请注册推荐人，请等待管理员审批`,
          { referrerId, referrerName: referrer.name },
        );
        if (sourceStaff._id) crmNotifyUserIds.push(sourceStaff._id.toString());
      }

      // 通知管理员（小程序通知 + CRM 铃铛）
      const admin = await this.usersService.findAdminUser();
      if (admin?.phone) {
        await this.sendNotification(
          admin.phone,
          MiniProgramNotificationType.REFERRAL_NEW_REFERRER,
          '新的推荐人注册待审批',
          `${referrer.name}（${referrer.phone}）申请注册推荐人，请尽快审批`,
          { referrerId },
        );
        const adminId = (admin as any)._id?.toString();
        if (adminId && !crmNotifyUserIds.includes(adminId)) crmNotifyUserIds.push(adminId);
      }

      // 推送 CRM 通知中心铃铛（WebSocket 实时推送）
      if (crmNotifyUserIds.length > 0) {
        await this.notificationHelperService.notifyReferralNewApplicant(crmNotifyUserIds, {
          referrerName: referrer.name,
          referrerPhone: referrer.phone,
          referrerId: referrerId ?? '',
        });
      }
    } catch (err) {
      this.logger.warn(`通知推荐人注册失败: ${err.message}`);
    }
  }

  // ============================================================
  // 简历去重与提交（referrer 侧）
  // ============================================================

  /**
   * 去重查询：跨 resumes + referral_resumes 两集合查询 phone 或 idCard
   * （submitReferral 已内联更精细的逻辑，此方法保留供其他场景复用）
   */
  async checkDuplicate(phone?: string, idCard?: string): Promise<{ isDuplicate: boolean; matchField: string | null }> {
    const resumeCheck = await this.resumeService.checkExistsByPhoneOrIdCard(phone, idCard);
    if (resumeCheck.exists) return { isDuplicate: true, matchField: resumeCheck.matchField };

    const activeStatuses = { $nin: ['rejected', 'invalid'] };
    if (phone) {
      const ref = await this.referralResumeModel.findOne({ phone, status: activeStatuses }).select('_id').lean().exec();
      if (ref) return { isDuplicate: true, matchField: 'phone' };
    }
    if (idCard) {
      const ref = await this.referralResumeModel.findOne({ idCard, status: activeStatuses }).select('_id').lean().exec();
      if (ref) return { isDuplicate: true, matchField: 'idCard' };
    }

    return { isDuplicate: false, matchField: null };
  }

  /**
   * 录入被推荐阿姨信息（仅 referrer 可调用）
   * assignedStaffId 取值优先级：
   *   1. 入参 targetStaffId（本次扫码海报员工，且该员工在职）
   *   2. 回落到 referrer.sourceStaffId
   * 若最终 assignedStaffId 对应员工已离职，自动兜底为管理员。
   * reviewDeadlineAt = 提交时间 + 24h
   */
  async submitReferral(openid: string, data: {
    name: string;
    phone?: string;
    idCard?: string;
    serviceType: string;
    experience?: string;
    remark?: string;
    targetStaffId?: string;
  }): Promise<ReferralResumeDocument> {
    // 校验推荐人身份
    const referrer = await this.referrerModel.findOne({ openid, approvalStatus: 'approved' }).exec();
    if (!referrer) throw new ForbiddenException('您没有权限提交推荐，请先申请并通过推荐人审批');

    // 手机号和身份证号至少填一个
    if (!data.phone && !data.idCard) {
      throw new BadRequestException('手机号和身份证号至少需要填写一项');
    }

    // 校验 serviceType 必须是合法工种 key（英文 key 或可识别的历史中文值）
    const normalizedServiceType = normalizeServiceType(data.serviceType);
    if (!normalizedServiceType) {
      throw new BadRequestException(
        `无效的工种：${data.serviceType}，请调用 /api/referral/miniprogram/job-types 获取合法选项`,
      );
    }

    // 确定本次推荐的归属员工（assignedStaffId）
    const assignedStaffId = await this.resolveAssignedStaffId(
      data.targetStaffId,
      referrer.sourceStaffId,
    );

    // 去重检查（先查简历库，再查推荐记录）
    const resumeCheck = await this.resumeService.checkExistsByPhoneOrIdCard(data.phone, data.idCard);
    if (resumeCheck.exists) {
      // 简历库已存在 → 打激活标记 + 创建 activated 推荐记录（不进审核队列）
      try {
        const existingResume = data.phone && resumeCheck.matchField === 'phone'
          ? await this.resumeService.findByPhone(data.phone)
          : await this.resumeService.findByIdNumber(data.idCard!);
        if (existingResume) {
          const resumeId = (existingResume as any)._id.toString();
          // 1. 在简历库打激活标记
          await this.resumeService.markAsReferralActivated(resumeId, referrer.name);
          // 2. 创建 activated 推荐记录（供审核页"已激活"标签页展示）
          await this.referralResumeModel.create({
            referrerId:      (referrer._id as any).toString(),
            referrerPhone:   referrer.phone,
            referrerName:    referrer.name,
            name:            data.name,
            phone:           data.phone,
            idCard:          data.idCard,
            serviceType:     normalizedServiceType,
            experience:      data.experience,
            remark:          data.remark,
            assignedStaffId,
            reviewStatus:    'activated',
            status:          'activated',
            linkedResumeId:  resumeId,
          });
          this.logger.log(`[submitReferral] 简历已存在，创建 activated 记录: resumeId=${resumeId}`);
        }
      } catch (err) {
        this.logger.warn(`[submitReferral] 激活处理失败: ${err.message}`);
      }
      throw new BadRequestException(`该阿姨[${resumeCheck.matchField === 'phone' ? '手机号' : '身份证号'}]已在系统中存在，无法重复录入`);
    }

    // 查推荐记录去重（排除已拒绝/无效）
    const activeStatuses = { $nin: ['rejected', 'invalid'] };
    if (data.phone) {
      const ref = await this.referralResumeModel.findOne({ phone: data.phone, status: activeStatuses }).select('_id').lean().exec();
      if (ref) throw new BadRequestException('该阿姨[手机号]已在系统中存在，无法重复录入');
    }
    if (data.idCard) {
      const ref = await this.referralResumeModel.findOne({ idCard: data.idCard, status: activeStatuses }).select('_id').lean().exec();
      if (ref) throw new BadRequestException('该阿姨[身份证号]已在系统中存在，无法重复录入');
    }

    // 黑名单命中：允许落库，但自动拒绝（写入 reviewNote 记录原因）
    const blacklistHit = await this.auntBlacklistService.checkActive({
      phone: data.phone,
      idCard: data.idCard,
    });

    // 计算审核截止时间（提交时间+24小时）
    const reviewDeadlineAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const baseDoc: any = {
      referrerId: (referrer._id as any).toString(),
      referrerPhone: referrer.phone,
      referrerName: referrer.name,
      name: data.name,
      phone: data.phone,
      idCard: data.idCard,
      serviceType: normalizedServiceType,   // 统一存英文 key
      experience: data.experience,
      remark: data.remark,
      assignedStaffId,
      // 从推荐人记录继承来源客户ID（若推荐人注册时扫的是客户海报）
      ...(referrer.sourceCustomerId ? { customerId: referrer.sourceCustomerId } : {}),
      reviewDeadlineAt,
      rewardStatus: 'pending',
    };

    if (blacklistHit) {
      baseDoc.reviewStatus = 'rejected';
      baseDoc.status = 'rejected';
      baseDoc.reviewedAt = new Date();
      baseDoc.reviewedBy = 'system:blacklist';
      baseDoc.reviewNote = `命中阿姨黑名单：${blacklistHit.reason}`;
      this.logger.warn(
        `[submitReferral] 黑名单命中自动拒绝 referrerId=${(referrer._id as any).toString()} phone=${data.phone || '-'} idCard=${data.idCard || '-'} blacklistId=${String(blacklistHit._id)}`,
      );
    } else {
      baseDoc.reviewStatus = 'pending_review';
      baseDoc.status = 'pending_review';
    }

    const resume = await this.referralResumeModel.create(baseDoc);

    // 更新推荐人累计数量
    await this.referrerModel.findByIdAndUpdate(referrer._id, { $inc: { totalReferrals: 1 } });

    // 通知归属员工（assignedStaffId = 本次扫码海报员工，或回落 sourceStaffId，或兜底管理员）
    // 黑名单命中已自动拒绝，无需推送待审核通知
    if (!blacklistHit) {
      try {
        const staff = await this.usersService.findById(assignedStaffId);
        if (staff?.phone) {
          await this.sendNotification(
            staff.phone,
            MiniProgramNotificationType.REFERRAL_SUBMITTED,
            '您有新的推荐简历待审核',
            `推荐人 ${referrer.name} 提交了一条新的推荐简历（${data.name}），请在24小时内完成审核`,
            { referralResumeId: (resume._id as any).toString() },
          );
        }
      } catch (err) {
        this.logger.warn(`通知员工失败: ${err.message}`);
      }
    }

    return resume;
  }

  /**
   * 解析本次推荐的归属员工（assignedStaffId）
   * 优先使用入参 targetStaffId；若为空、无效或对应员工已离职，则回落 sourceStaffId；
   * sourceStaffId 也已离职时，最终兜底为管理员 openid。
   */
  private async resolveAssignedStaffId(
    targetStaffId: string | undefined,
    sourceStaffId: string,
  ): Promise<string> {
    const candidate = targetStaffId && targetStaffId.trim() ? targetStaffId.trim() : sourceStaffId;
    const staff = await this.usersService.findById(candidate).catch(() => null);
    if (staff && staff.isActive !== false) return candidate;

    // 候选员工离职或不存在，尝试回落 sourceStaffId（若候选本身就是 sourceStaffId 则跳过）
    if (candidate !== sourceStaffId) {
      const src = await this.usersService.findById(sourceStaffId).catch(() => null);
      if (src && src.isActive !== false) {
        this.logger.log(`[resolveAssignedStaffId] 目标员工 ${candidate} 已离职，回落至 sourceStaffId=${sourceStaffId}`);
        return sourceStaffId;
      }
    }

    // sourceStaffId 也已离职，兜底管理员
    const admin = await this.usersService.findAdminUser();
    if (!admin) {
      this.logger.warn(`[resolveAssignedStaffId] 归属员工均已离职且未找到管理员，使用原始候选 ${candidate}`);
      return candidate;
    }
    this.logger.log(`[resolveAssignedStaffId] 候选员工均已离职，兜底管理员 ${(admin._id as any).toString()}`);
    return (admin._id as any).toString();
  }

  /**
   * 按 staffId 查员工公共信息（供海报扫码落地页展示、离职判断）
   * 返回字段刻意最小化，避免泄露敏感信息
   */
  async getStaffPublicInfo(staffId: string): Promise<{
    _id: string;
    name: string;
    avatar?: string;
    phone?: string;
    isActive: boolean;
  } | null> {
    const user = await this.usersService.findById(staffId).catch(() => null);
    if (!user) return null;
    return {
      _id: (user._id as any).toString(),
      name: user.name,
      avatar: user.avatar,
      phone: user.phone,
      isActive: user.isActive !== false,
    };
  }

  // ============================================================
  // 推荐人视图
  // ============================================================

  /** 获取我的推荐记录列表（仅自己，脱敏） */
  async getMyReferrals(openid: string, page = 1, pageSize = 20): Promise<any> {
    const referrer = await this.referrerModel.findOne({ openid }).lean().exec();
    if (!referrer) return { list: [], total: 0 };

    const referrerId = (referrer as any)._id.toString();
    const skip = (page - 1) * pageSize;

    const [list, total] = await Promise.all([
      this.referralResumeModel.find({ referrerId }).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean().exec(),
      this.referralResumeModel.countDocuments({ referrerId }),
    ]);

    // 白名单：只返回列表页所需字段，不含任何内部字段或客户隐私
    const desensitized = list.map((item: any) => {
      const isContracted = ['contracted', 'onboarded', 'reward_pending', 'reward_paid'].includes(item.status);
      // 已激活状态对小程序脱敏：推荐人只看到"推荐人已存在"，不暴露"已激活"字样
      // （CRM 员工侧仍正常显示激活状态）
      const isActivated = item.status === 'activated';
      return {
        _id:              item._id,
        // 展示字段（以 CRM 为准，覆盖本地库）
        name:             item.name,
        serviceType:      item.serviceType,
        createdAt:        item.createdAt        ?? null,
        experience:       item.experience       ?? null,
        remark:           item.remark           ?? null,
        // 状态
        status:           isActivated ? 'referrer_exists' : item.status,
        statusLabel:      isActivated ? '推荐人已存在' : (ReferralService.STATUS_LABEL[item.status] ?? item.status),
        // 时间轴
        contractSignedAt: item.contractSignedAt ?? null,
        onboardedAt:      item.onboardedAt      ?? null,
        // 财务：签单后才暴露
        rewardAmount:     isContracted ? (item.rewardAmount     ?? null) : undefined,
        rewardExpectedAt: isContracted ? (item.rewardExpectedAt ?? null) : undefined,
        rewardPaidAt:     isContracted ? (item.rewardPaidAt     ?? null) : undefined,
      };
    });

    return { list: desensitized, total, page, pageSize };
  }

  /** 获取推荐记录详情（推荐人视角，白名单字段，不含任何客户隐私） */
  async getReferralDetail(openid: string, id: string): Promise<any> {
    const referrer = await this.referrerModel.findOne({ openid }).lean().exec();
    if (!referrer) throw new ForbiddenException('无权限');

    const resume = await this.referralResumeModel
      .findOne({ _id: id, referrerId: (referrer as any)._id.toString() })
      .lean()
      .exec();
    if (!resume) throw new NotFoundException('推荐记录不存在');

    const r = resume as any;
    const isContracted = ['contracted', 'onboarded', 'reward_pending', 'reward_approved', 'reward_paid'].includes(r.status);
    // 已激活状态对小程序脱敏：推荐人只看到"推荐人已存在"，不暴露"已激活"字样
    // （CRM 员工侧通过 getAdminReferralDetail 仍拿到原始 activated 状态）
    const isActivated = r.status === 'activated';

    // ⚡ 白名单：只返回小程序详情页所需字段，不含 referrerPhone / assignedStaffId 等内部字段
    const result: any = {
      // 基础信息
      name:              r.name,  // 推荐官自己填的，直接返回完整姓名
      serviceType:       r.serviceType,
      experience:        r.experience        ?? null,
      remark:            r.remark            ?? null,
      // 状态
      status:            isActivated ? 'referrer_exists' : r.status,
      statusLabel:       isActivated ? '推荐人已存在' : (ReferralService.STATUS_LABEL[r.status] ?? r.status),
      reviewNote:        r.reviewNote ?? null,   // 审核备注（拒绝时由员工填写）
      // 时间轴
      createdAt:         r.createdAt         ?? null,
      contractSignedAt:  r.contractSignedAt  ?? null,
      onboardedAt:       r.onboardedAt       ?? null,
      // 财务：签单后才暴露
      serviceFee:        isContracted ? (r.serviceFee        ?? null) : undefined,
      rewardAmount:      isContracted ? (r.rewardAmount      ?? null) : undefined,
      rewardExpectedAt:  isContracted ? (r.rewardExpectedAt  ?? null) : undefined,
      rewardPaidAt:      isContracted ? (r.rewardPaidAt      ?? null) : undefined,
    };

    // 合同对象：有 contractId 时查询并附加（推荐官只读展示，不含客户隐私）
    if (r.contractId) {
      try {
        const contract = await this.contractModel
          .findById(r.contractId)
          .populate('createdBy', 'name')
          .lean()
          .exec();

        if (contract) {
          const c = contract as any;
          const serviceFee = c.customerServiceFee ?? 0;
          result.contract = {
            orderNumber:       c.contractNumber,
            orderType:         c.contractType,
            serviceFee,
            rewardAmount:      serviceFee ? Math.round(serviceFee * 0.1) : null,
            onboardDate:       c.startDate      ?? null,
            nannySalary:       c.workerSalary,
            contractStartDate: c.startDate      ?? null,
            contractEndDate:   c.endDate        ?? null,
            createdByName:     c.createdBy && typeof c.createdBy === 'object'
                                 ? c.createdBy.name
                                 : null,
          };
        }
      } catch (err) {
        this.logger.warn(`getReferralDetail: 查询合同失败 contractId=${r.contractId} err=${err.message}`);
      }
    }

    return result;
  }

  /**
   * 推荐记录详情（CRM 管理员/员工视角，完整字段 + 关联合同数据）
   */
  async getAdminReferralDetail(id: string): Promise<any> {
    const resume = await this.referralResumeModel.findById(id).lean().exec();
    if (!resume) throw new NotFoundException('推荐记录不存在');
    const r = resume as any;

    const result: any = { ...r };

    // 关联合同数据（同小程序详情逻辑，CRM 侧不脱敏）
    if (r.contractId) {
      try {
        const contract = await this.contractModel
          .findById(r.contractId)
          .populate('createdBy', 'name')
          .lean()
          .exec();

        if (contract) {
          const c = contract as any;
          result.contract = {
            orderNumber:       c.contractNumber,
            orderType:         c.contractType,
            serviceFee:        c.customerServiceFee ?? null,
            nannySalary:       c.workerSalary       ?? null,
            onboardDate:       c.startDate          ?? null,
            contractStartDate: c.startDate          ?? null,
            contractEndDate:   c.endDate            ?? null,
            createdByName:     c.createdBy && typeof c.createdBy === 'object' ? c.createdBy.name : null,
          };
        }
      } catch (err) {
        this.logger.warn(`getAdminReferralDetail: 查询合同失败 contractId=${r.contractId} err=${err.message}`);
      }
    }

    return result;
  }

  /** 整体状态枚举 → 小程序展示文字 */
  private static readonly STATUS_LABEL: Record<string, string> = {
    pending_review:  '待审核',
    rejected:        '审核未通过',
    following_up:    '推荐中',
    contracted:      '已签单',
    onboarded:       '已上户',
    reward_pending:  '返费待审核',
    reward_approved: '返费待打款',  // 员工审核通过，等待财务打款
    reward_paid:     '返费已打款',
    invalid:         '未录用',
    activated:       '已激活',   // 简历库已存在，不进审核队列，仅作激活提醒
  };

  private desensitizeName(name: string): string {
    if (!name || name.length <= 1) return name;
    return name[0] + '*'.repeat(name.length - 1);
  }

  // ============================================================
  // 员工侧：审核与跟进
  // ============================================================

  /**
   * 获取分配给我的推荐简历列表（员工侧）
   * 管理员可查全量
   * reviewStatus 支持特殊值：
   *   'processed' → 查 approved + rejected（已处理的）
   *   'pending_review' → 仅待审核
   *   undefined → 全部
   */
  async getMyAssignedReferrals(staffId: string, isAdmin: boolean, reviewStatus?: string, page = 1, pageSize = 20): Promise<any> {
    const skip = (page - 1) * pageSize;
    const query: any = {};
    if (!isAdmin) query.assignedStaffId = staffId;

    if (reviewStatus === 'processed') {
      // 已处理：通过 + 拒绝（排除 activated）
      query.reviewStatus = { $in: ['approved', 'rejected'] };
    } else if (reviewStatus === 'activated') {
      query.reviewStatus = 'activated';
    } else if (reviewStatus === 'pending_review') {
      query.reviewStatus = 'pending_review';
    } else if (!reviewStatus) {
      // 全部：排除 activated（激活记录走单独 tab）
      query.reviewStatus = { $ne: 'activated' };
    }

    const [list, total] = await Promise.all([
      this.referralResumeModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean().exec(),
      this.referralResumeModel.countDocuments(query),
    ]);

    return { list, total, page, pageSize };
  }

  /**
   * 审核推荐简历（通过/拒绝）
   * 必须校验 assignedStaffId === callerStaffId（admin 可绕过）
   */
  async reviewReferral(callerStaffId: string, isAdmin: boolean, id: string, result: 'approve' | 'reject', note?: string): Promise<void> {
    const resume = await this.referralResumeModel.findById(id).exec();
    if (!resume) throw new NotFoundException('推荐记录不存在');

    // 权限校验
    if (!isAdmin && resume.assignedStaffId !== callerStaffId) {
      throw new ForbiddenException('您无权审核该简历，permission denied');
    }

    if (resume.reviewStatus !== 'pending_review') {
      throw new BadRequestException('该简历已审核完毕，不可重复操作');
    }

    if (result === 'reject' && !note) {
      throw new BadRequestException('拒绝时必须填写原因');
    }

    const now = new Date();
    const updateData: any = {
      reviewStatus: result === 'approve' ? 'approved' : 'rejected',
      reviewedAt: now,
      reviewedBy: callerStaffId,
      reviewNote: note,
    };

    if (result === 'approve') {
      updateData.status = 'following_up';
    } else {
      updateData.status = 'rejected';
    }

    await this.referralResumeModel.findByIdAndUpdate(id, updateData).exec();

    // ── 审核通过：自动入库简历库 ─────────────────────────────────
    if (result === 'approve') {
      try {
        const { resumeId, isDuplicate } = await this.resumeService.createFromReferral({
          referralResumeId: id,
          assignedStaffId: resume.assignedStaffId,
          name: resume.name,
          phone: resume.phone,
          idCard: resume.idCard,
          serviceType: resume.serviceType,
          experience: resume.experience,
          remark: resume.remark,
          operatorId: callerStaffId,
        });
        // 回写 linkedResumeId，方便从推荐记录跳转到简历详情
        await this.referralResumeModel.findByIdAndUpdate(id, { linkedResumeId: resumeId }).exec();
        if (isDuplicate) {
          this.logger.warn(`⚠️ 推荐简历 [${id}] 审核通过入库时发现重复，已关联现有简历: ${resumeId}`);
        } else {
          this.logger.log(`✅ 推荐简历 [${id}] 审核通过，已自动入库，简历ID: ${resumeId}`);
        }
      } catch (err) {
        // 入库失败不阻断审核流程，记录日志等待人工处理
        this.logger.error(`❌ 推荐简历 [${id}] 审核通过入库失败: ${err.message}`);
      }
    }

    // 通知推荐人审核结果
    try {
      const referrer = await this.referrerModel.findById(resume.referrerId).lean().exec();
      if (referrer) {
        const r = referrer as any;
        const mpUser = await this.mpUserService.findByPhone(r.phone);
        if (mpUser?.phone) {
          await this.sendNotification(
            mpUser.phone,
            MiniProgramNotificationType.REFERRAL_REVIEW_RESULT,
            result === 'approve' ? '您的推荐简历已通过审核' : '您的推荐简历审核未通过',
            result === 'approve'
              ? `您推荐的阿姨（${resume.name}）已通过审核，员工将尽快跟进`
              : `您推荐的阿姨（${resume.name}）未通过审核：${note}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`通知推荐人失败: ${err.message}`);
    }
  }

  /**
   * 更新跟进状态（员工侧）
   * 强校验 assignedStaffId === callerStaffId
   */
  async updateReferralStatus(callerStaffId: string, isAdmin: boolean, id: string, status: string): Promise<void> {
    const resume = await this.referralResumeModel.findById(id).exec();
    if (!resume) throw new NotFoundException('推荐记录不存在');

    if (!isAdmin && resume.assignedStaffId !== callerStaffId) {
      throw new ForbiddenException('您无权操作该简历，permission denied');
    }

    const allowedTransitions: Record<string, string[]> = {
      following_up: ['invalid'],
      contracted: ['onboarded'],
      onboarded: ['reward_pending'],
    };
    const currentAllowed = allowedTransitions[resume.status] || [];
    if (!currentAllowed.includes(status) && !isAdmin) {
      throw new BadRequestException(`当前状态 ${resume.status} 不允许转换到 ${status}`);
    }

    await this.referralResumeModel.findByIdAndUpdate(id, { status }).exec();

    // 转到 reward_pending 时通知 rewardOwnerStaffId（返费待审核提醒）
    if (status === 'reward_pending' && resume.rewardOwnerStaffId) {
      try {
        const staff = await this.usersService.findById(resume.rewardOwnerStaffId);
        if (staff?.phone) {
          await this.sendNotification(
            staff.phone,
            MiniProgramNotificationType.REFERRAL_SUBMITTED,
            '有推荐记录进入返费待审核',
            `推荐阿姨「${resume.name}」已上户，推荐记录进入返费待审核阶段，请及时处理`,
            { referralResumeId: id },
          );
        }
      } catch (err) {
        this.logger.warn(`[updateReferralStatus] 通知返费待审核失败: ${(err as any).message}`);
      }
    }
  }

  /**
   * 释放推荐记录到简历库
   * - 权限：管理员 或 当前 assignedStaffId
   * - 可释放状态：approved / following_up（推荐已通过审核但尚未签单，手动把它搬进简历库）
   * - 数据流转：将 referral_resume.status 置为 released，然后在 resumes 创建一条新记录
   *   （leadSource='referral'，只带核心字段，CRM 侧后续补全），最后回写 linkedResumeId
   */
  async releaseToResumeLibrary(
    callerStaffId: string,
    isAdmin: boolean,
    referralResumeId: string,
  ): Promise<{ resumeId: string }> {
    const ref = await this.referralResumeModel.findById(referralResumeId).exec();
    if (!ref) throw new NotFoundException('推荐记录不存在');

    // 权限：管理员 或 assignedStaffId
    if (!isAdmin && ref.assignedStaffId !== callerStaffId) {
      throw new ForbiddenException('仅简历归属员工或管理员可释放该记录');
    }

    // 状态校验：仅 approved / following_up 可释放
    if (!['approved', 'following_up'].includes(ref.status)) {
      throw new BadRequestException(`当前状态「${ref.status}」不支持释放，仅 approved/following_up 可释放`);
    }

    // 防重：已有关联简历则不允许再次释放
    if (ref.linkedResumeId) {
      throw new BadRequestException('该推荐记录已关联简历，无需重复释放');
    }

    // 黑名单兜底：释放入简历库前再次探针，命中则拒绝释放
    const blacklistHit = await this.auntBlacklistService.checkActive({
      phone: ref.phone,
      idCard: ref.idCard,
    });
    if (blacklistHit) {
      throw new BadRequestException({
        message: `该阿姨已在黑名单中（原因：${blacklistHit.reason}），无法释放到简历库`,
        error: 'AUNT_BLACKLISTED',
        blacklistId: String(blacklistHit._id),
        reason: blacklistHit.reason,
      });
    }

    // 先将推荐记录状态置为 released（排除于双向查重），释放后续 resume.create 路径
    const originalStatus = ref.status;
    await this.referralResumeModel.updateOne(
      { _id: ref._id },
      { $set: { status: 'released', releasedAt: new Date(), releasedBy: callerStaffId } },
    ).exec();

    // 创建正式简历（最小字段 + leadSource=referral）
    let savedResume: any;
    try {
      savedResume = await this.resumeService.createMinimalFromReferral({
        name: ref.name,
        phone: ref.phone,
        idCard: ref.idCard,
        jobType: ref.serviceType,
        experience: ref.experience,
        remark: ref.remark,
        referrerName: ref.referrerName,
        operatorStaffId: callerStaffId,
      });
    } catch (err) {
      // 回滚推荐记录状态，避免状态与 resumes 脱节
      await this.referralResumeModel.updateOne(
        { _id: ref._id },
        { $set: { status: originalStatus }, $unset: { releasedAt: 1, releasedBy: 1 } },
      ).exec();
      throw err;
    }

    // 回写 linkedResumeId，完成闭环（后续签单/上户/返费结算仍走推荐记录）
    const resumeId = (savedResume._id as any).toString();
    await this.referralResumeModel.updateOne(
      { _id: ref._id },
      { $set: { linkedResumeId: resumeId } },
    ).exec();

    // 写简历操作日志，详情页可见
    const caller = await this.usersService.findById(callerStaffId).catch(() => null);
    const callerName = caller?.name || caller?.username || callerStaffId;
    const assignedStaff = ref.assignedStaffId !== callerStaffId
      ? await this.usersService.findById(ref.assignedStaffId).catch(() => null)
      : caller;
    const assignedStaffName = assignedStaff?.name || assignedStaff?.username || ref.assignedStaffId;
    await this.resumeService.logOperation(
      resumeId,
      callerStaffId,
      'release_from_referral',
      '从推荐库释放',
      {
        description: `操作人：${callerName}；归属员工：${assignedStaffName}；推荐人：${ref.referrerName || '-'}（${ref.referrerPhone || '-'}）；原推荐记录：${referralResumeId}；原状态：${originalStatus}`,
        relatedId: referralResumeId,
        relatedType: 'referral_resume',
      },
    );

    this.logger.log(`[releaseToResumeLibrary] 推荐记录 ${referralResumeId} 已释放到简历库 ${resumeId}，操作人: ${callerStaffId}`);
    return { resumeId };
  }

  /**
   * 推荐人申请结算（小程序侧）
   * 校验推荐记录状态为 onboarded，保存收款信息，推进到 reward_pending（返费待审核）
   */
  async applySettlement(openid: string, data: {
    referralId: string;
    idCard: string;       // 推荐人本人身份证号（防刷单）
    payeeName: string;
    payeePhone: string;
    bankCard: string;
    bankName: string;
  }): Promise<void> {
    // 校验推荐人身份
    const referrer = await this.referrerModel.findOne({ openid, approvalStatus: 'approved' }).lean().exec();
    if (!referrer) throw new ForbiddenException('您没有推荐人权限');

    const referrerId = (referrer as any)._id.toString();
    const resume = await this.referralResumeModel.findById(data.referralId).exec();
    if (!resume) throw new NotFoundException('推荐记录不存在');

    // 只允许本人申请自己的记录
    if (resume.referrerId !== referrerId) throw new ForbiddenException('您无权操作该记录');

    // 只有 onboarded 状态才允许申请结算
    if (resume.status !== 'onboarded') {
      throw new BadRequestException(`当前状态（${ReferralService.STATUS_LABEL[resume.status] ?? resume.status}）不允许申请结算，须在"已上户"状态下申请`);
    }

    // 校验必填字段（含身份证）
    if (!data.idCard) {
      throw new BadRequestException('身份证号为必填项，用于身份核验');
    }
    if (!/^\d{17}[\dXx]$/.test(data.idCard)) {
      throw new BadRequestException('身份证号格式不正确，请填写18位居民身份证号');
    }
    if (!data.payeeName || !data.payeePhone || !data.bankCard || !data.bankName) {
      throw new BadRequestException('收款人姓名、手机号、银行卡号、开户行均为必填项');
    }

    // 防刷单：若该推荐人档案已存有身份证，校验必须一致
    const existingIdCard = (referrer as any).idCard;
    if (existingIdCard && existingIdCard !== data.idCard) {
      throw new BadRequestException('身份证号与注册信息不符，请核实后重新填写');
    }

    const now = new Date();
    await this.referralResumeModel.findByIdAndUpdate(data.referralId, {
      status:               'reward_pending',
      rewardStatus:         'reviewing',
      payeeName:            data.payeeName,
      payeePhone:           data.payeePhone,
      bankCard:             data.bankCard,
      bankName:             data.bankName,
      settlementAppliedAt:  now,
    }).exec();

    // 同步收款信息 + 身份证到推荐人档案
    await this.referrerModel.findByIdAndUpdate(referrerId, {
      idCard:         data.idCard,
      bankCardNumber: data.bankCard,
      bankName:       data.bankName,
    }).exec();

    this.logger.log(`[applySettlement] 推荐人 ${referrer.name} 申请结算，referralId=${data.referralId}，已同步身份证+银行卡`);

    // 通知 rewardOwnerStaffId 对应员工（返费归属人）有新的结算待审核
    if (resume.rewardOwnerStaffId) {
      try {
        const staff = await this.usersService.findById(resume.rewardOwnerStaffId);
        if (staff?.phone) {
          await this.sendNotification(
            staff.phone,
            MiniProgramNotificationType.REFERRAL_SUBMITTED,
            '有新的返费结算待审核',
            `推荐人 ${referrer.name} 提交了返费结算申请（${resume.name}），请尽快审核`,
            { referralResumeId: data.referralId },
          );
        }
      } catch (err) {
        this.logger.warn(`[applySettlement] 通知员工失败: ${(err as any).message}`);
      }
    }
  }

  /**
   * 返费审核/打款（员工侧，强校验 rewardOwnerStaffId === callerStaffId）
   */
  async processReward(callerStaffId: string, isAdmin: boolean, referralResumeId: string, action: 'approve' | 'reject' | 'markPaid', remark?: string): Promise<void> {
    const resume = await this.referralResumeModel.findById(referralResumeId).exec();
    if (!resume) throw new NotFoundException('推荐记录不存在');

    if (!isAdmin && resume.rewardOwnerStaffId !== callerStaffId) {
      throw new ForbiddenException('您无权操作该返费，permission denied');
    }

    if (action === 'approve') {
      // 审核通过：rewardStatus → approved，整体 status → reward_approved（返费待打款）
      await this.referralResumeModel.findByIdAndUpdate(referralResumeId, {
        rewardStatus: 'approved',
        status: 'reward_approved',
      }).exec();
    } else if (action === 'reject') {
      await this.referralResumeModel.findByIdAndUpdate(referralResumeId, {
        rewardStatus: 'rejected',
        status: 'reward_pending',  // 打回返费待审核，等推荐人或员工重新发起
      }).exec();
    } else if (action === 'markPaid') {
      // 硬校验1：防止重复打款
      if (resume.rewardStatus === 'paid') {
        throw new BadRequestException('该推荐记录已经打款，不可重复操作');
      }
      // 硬校验2：必须先经过审核通过（reward_approved），否则流程不合规
      if (resume.status !== 'reward_approved') {
        throw new BadRequestException('请先完成返费审核（通过）再执行打款操作');
      }
      // 硬校验3：30天周期未到不允许打款
      if (resume.rewardExpectedAt && new Date() < new Date(resume.rewardExpectedAt)) {
        const dateStr = new Date(resume.rewardExpectedAt).toLocaleDateString('zh-CN');
        throw new BadRequestException(`合同上户未满30天，预计可打款时间：${dateStr}`);
      }
      const now = new Date();
      await this.referralResumeModel.findByIdAndUpdate(referralResumeId, {
        rewardStatus: 'paid',
        rewardPaidAt: now,
        status: 'reward_paid',
      }).exec();

      // 写返费打款记录
      const referrer = await this.referrerModel.findById(resume.referrerId).lean().exec();
      if (referrer) {
        const r = referrer as any;
        await this.rewardModel.create({
          referralResumeId,
          assignedStaffId: resume.assignedStaffId,
          referrerId: resume.referrerId,
          referrerPhone: r.phone,
          referrerWechatId: r.wechatId,
          amount: resume.rewardAmount || 0,
          status: 'paid',
          reviewedBy: callerStaffId,
          paidAt: now,
          paidBy: callerStaffId,
          remark,
        });

        // 更新推荐人累计金额
        await this.referrerModel.findByIdAndUpdate(resume.referrerId, {
          $inc: { totalRewardAmount: resume.rewardAmount || 0 },
        });

        // 通知推荐人
        const mpUser = await this.mpUserService.findByPhone(r.phone);
        if (mpUser?.phone) {
          await this.sendNotification(
            mpUser.phone,
            MiniProgramNotificationType.REFERRAL_REWARD_PAID,
            '推荐返费已到账',
            `您推荐的阿姨（${resume.name}）的返费 ¥${resume.rewardAmount || 0} 已打款至您的微信号 ${r.wechatId}`,
          );
        }
      }
    }
  }

  // ============================================================
  // 管理员侧：推荐人审批
  // ============================================================

  /** 获取待审批的推荐人申请列表 */
  async listPendingReferrers(page = 1, pageSize = 20): Promise<any> {
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.referrerModel.find({ approvalStatus: 'pending_approval' }).sort({ createdAt: 1 }).skip(skip).limit(pageSize).lean().exec(),
      this.referrerModel.countDocuments({ approvalStatus: 'pending_approval' }),
    ]);
    return { list, total, page, pageSize };
  }

  /**
   * 通过推荐人注册申请
   * 权限：管理员 或 该推荐人的来源员工（sourceStaffId === callerStaffId）
   */
  async approveReferrer(callerStaffId: string, referrerId: string): Promise<void> {
    const referrer = await this.referrerModel.findById(referrerId).exec();
    if (!referrer) throw new NotFoundException('推荐人申请不存在');
    if (referrer.approvalStatus !== 'pending_approval') throw new BadRequestException('该申请已处理');

    const caller = await this.usersService.findById(callerStaffId).catch(() => null);
    const isAdmin = !!caller?.isAdmin;
    if (!isAdmin && referrer.sourceStaffId !== callerStaffId) {
      throw new ForbiddenException('您无权审批该推荐人，仅管理员或该推荐人的来源员工可操作');
    }

    const now = new Date();
    await this.referrerModel.findByIdAndUpdate(referrerId, {
      approvalStatus: 'approved',
      approvedBy: callerStaffId,
      approvedAt: now,
    }).exec();

    // 更新小程序用户角色为推荐官
    // 注意：用 mpUser.openid（小程序真实 openid），而不是 referrer.openid（可能是 admin_created_ 占位符）
    const mpUser = await this.mpUserService.findByPhone(referrer.phone);
    if (mpUser) {
      await this.mpUserService.updateRoleByOpenid((mpUser as any).openid, '推荐官');
    }

    // 通知申请人
    if (mpUser?.phone) {
      await this.sendNotification(
        mpUser.phone,
        MiniProgramNotificationType.REFERRAL_APPROVED,
        '您的推荐人申请已通过',
        '恭喜！您已成为推荐人，可以开始录入推荐阿姨信息并获取推荐返费',
      );
    }

    // 通知来源员工
    try {
      const sourceStaff = await this.usersService.findById(referrer.sourceStaffId);
      if (sourceStaff?.phone) {
        await this.sendNotification(
          sourceStaff.phone,
          MiniProgramNotificationType.REFERRAL_NEW_REFERRER,
          '您的海报推荐人已审批通过',
          `通过您海报申请的推荐人 ${referrer.name} 已审批通过，可以开始推荐阿姨啦`,
        );
      }
    } catch {}
  }

  /**
   * 拒绝推荐人注册申请
   * 权限：管理员 或 该推荐人的来源员工（sourceStaffId === callerStaffId）
   */
  async rejectReferrer(callerStaffId: string, referrerId: string, reason: string): Promise<void> {
    if (!reason) throw new BadRequestException('拒绝时必须填写原因');
    const referrer = await this.referrerModel.findById(referrerId).exec();
    if (!referrer) throw new NotFoundException('推荐人申请不存在');
    if (referrer.approvalStatus !== 'pending_approval') throw new BadRequestException('该申请已处理');

    const caller = await this.usersService.findById(callerStaffId).catch(() => null);
    const isAdmin = !!caller?.isAdmin;
    if (!isAdmin && referrer.sourceStaffId !== callerStaffId) {
      throw new ForbiddenException('您无权拒绝该推荐人，仅管理员或该推荐人的来源员工可操作');
    }

    await this.referrerModel.findByIdAndUpdate(referrerId, {
      approvalStatus: 'rejected',
      rejectedReason: reason,
    }).exec();

    // 通知申请人
    const mpUser = await this.mpUserService.findByPhone(referrer.phone);
    if (mpUser?.phone) {
      await this.sendNotification(
        mpUser.phone,
        MiniProgramNotificationType.REFERRAL_REJECTED,
        '您的推荐人申请未通过',
        `很遗憾，您的推荐人申请未通过，原因：${reason}`,
      );
    }
  }

  // ============================================================
  // 管理员侧：全量推荐管理
  // ============================================================

  /** 全量推荐记录查询（附带推荐人来源员工 referrerSourceStaffId） */
  async listAllReferrals(filter: { assignedStaffId?: string; status?: string; page?: number; pageSize?: number }): Promise<any> {
    const { assignedStaffId, status, page = 1, pageSize = 20 } = filter;
    const skip = (page - 1) * pageSize;
    const query: any = {};
    if (assignedStaffId) query.assignedStaffId = assignedStaffId;
    if (status) query.status = status;

    // reward_pending / reward_approved / pending_review 置顶（需要人工处理），其余按创建时间倒序
    const PRIORITY_ORDER = ['reward_pending', 'reward_approved', 'pending_review'];
    const [sortedList, total] = await Promise.all([
      this.referralResumeModel.aggregate([
        { $match: query },
        {
          $addFields: {
            _sortPriority: {
              $switch: {
                branches: PRIORITY_ORDER.map((s, i) => ({ case: { $eq: ['$status', s] }, then: i })),
                default: PRIORITY_ORDER.length,
              },
            },
          },
        },
        { $sort: { _sortPriority: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: pageSize },
      ]).exec(),
      this.referralResumeModel.countDocuments(query),
    ]);

    // 批量查询推荐人的 sourceStaffId（来源员工）
    const referrerIds = Array.from(new Set(sortedList.map((r: any) => r.referrerId).filter(Boolean)));
    const referrers = referrerIds.length
      ? await this.referrerModel.find({ _id: { $in: referrerIds } }).select('_id sourceStaffId').lean().exec()
      : [];
    const sourceMap: Record<string, string> = {};
    for (const r of referrers as any[]) sourceMap[r._id.toString()] = r.sourceStaffId;

    // 收集所有需要查名字的员工 ID（来源员工 + 归属员工 + 返费归属员工），单次批量查询
    const allStaffIds = Array.from(new Set([
      ...Object.values(sourceMap).filter(Boolean),
      ...sortedList.map((r: any) => r.assignedStaffId).filter(Boolean),
      ...sortedList.map((r: any) => r.rewardOwnerStaffId).filter(Boolean),
    ])) as string[];
    const staffNameMap = await this.usersService.findNamesByIds(allStaffIds);

    const list = sortedList.map((r: any) => {
      const sourceStaffId = sourceMap[r.referrerId] || null;
      return {
        ...r,
        referrerSourceStaffId: sourceStaffId,
        referrerSourceStaffName: sourceStaffId ? (staffNameMap[sourceStaffId] ?? null) : null,
        assignedStaffName: r.assignedStaffId ? (staffNameMap[r.assignedStaffId] ?? null) : null,
        rewardOwnerStaffName: r.rewardOwnerStaffId ? (staffNameMap[r.rewardOwnerStaffId] ?? null) : null,
      };
    });
    return { list, total, page, pageSize };
  }

  /**
   * 从小程序云数据库同步待审核推荐简历到 CRM MongoDB
   * 解决小程序云函数 submitReferral 未调用 CRM 后端 API 的问题
   * @param adminStaffId 操作管理员ID（作为 assignedStaffId 的兜底值）
   */
  async syncFromCloudDb(adminStaffId: string): Promise<{ imported: number; activated: number; skipped: number; errors: number; details: string[] }> {
    let imported = 0, activated = 0, skipped = 0, errors = 0;
    const details: string[] = [];

    try {
      // 查询云数据库中 reviewStatus = pending_review 的记录（最多100条）
      const cloudRecords = await this.wechatCloudService.queryCloudDatabase(
        `db.collection('referral_resumes').where({reviewStatus:'pending_review'}).orderBy('createdAt','asc').limit(100).get()`,
      );

      this.logger.log(`[syncFromCloudDb] 云数据库返回 ${cloudRecords.length} 条待审核记录`);

      for (const record of cloudRecords) {
        const cloudId = record._id;
        try {
          // 检查是否已导入（cloudDbId 去重，无论最终状态为 pending_review 还是 activated）
          const existing = await this.referralResumeModel.findOne({ cloudDbId: cloudId }).exec();
          if (existing) {
            skipped++;
            details.push(`跳过（已存在）: ${cloudId} - ${record.name}`);
            continue;
          }

          // 活跃推荐记录去重：排除 rejected/invalid/activated —
          // activated 不阻断本次同步，简历库命中时每次都应单独落一条 activated 记录（与 submitReferral 对齐）
          const activeNonActivatedStatuses = { $nin: ['rejected', 'invalid', 'activated'] };
          if (record.phone) {
            const phoneDup = await this.referralResumeModel.findOne({ phone: record.phone, status: activeNonActivatedStatuses }).select('_id').lean().exec();
            if (phoneDup) {
              skipped++;
              details.push(`跳过（手机号重复）: ${cloudId} - ${record.name}（${record.phone}）`);
              this.logger.warn(`[syncFromCloudDb] 手机号 ${record.phone} 已存在活跃推荐记录，跳过云DB记录 ${cloudId}`);
              continue;
            }
          }
          if (record.idCard) {
            const idCardDup = await this.referralResumeModel.findOne({ idCard: record.idCard, status: activeNonActivatedStatuses }).select('_id').lean().exec();
            if (idCardDup) {
              skipped++;
              details.push(`跳过（身份证重复）: ${cloudId} - ${record.name}（${record.idCard}）`);
              this.logger.warn(`[syncFromCloudDb] 身份证 ${record.idCard} 已存在活跃推荐记录，跳过云DB记录 ${cloudId}`);
              continue;
            }
          }

          // 查找简历库已有档案，若命中则本次同步走 activated 路径
          let existingResume: any = null;
          if (record.phone) {
            existingResume = await this.resumeService.findByPhone(record.phone);
          }
          if (!existingResume && record.idCard) {
            existingResume = await this.resumeService.findByIdNumber(record.idCard);
          }

          // 根据 referrerOpenid 查找 CRM 推荐人
          const referrer = await this.referrerModel.findOne({
            openid: record.referrerOpenid,
            approvalStatus: 'approved',
          }).exec();

          if (!referrer) {
            errors++;
            details.push(`错误（推荐人不存在）: ${cloudId} - openid=${record.referrerOpenid}`);
            this.logger.warn(`[syncFromCloudDb] 未找到推荐人 openid=${record.referrerOpenid}，跳过记录 ${cloudId}`);
            continue;
          }

          // 确定 assignedStaffId：优先用推荐人的 sourceStaffId，兜底用管理员ID
          const assignedStaffId = (referrer.sourceStaffId && referrer.sourceStaffId !== '')
            ? referrer.sourceStaffId
            : adminStaffId;

          const baseDoc = {
            cloudDbId:     cloudId,
            referrerId:    (referrer._id as any).toString(),
            referrerPhone: referrer.phone,
            referrerName:  referrer.name,
            name:          record.name,
            phone:         record.phone  || undefined,
            idCard:        record.idCard || undefined,
            serviceType:   record.serviceType,
            experience:    record.experience || undefined,
            remark:        record.remark     || undefined,
            assignedStaffId,
            rewardStatus:  'pending' as const,
          };

          if (existingResume) {
            // 简历库已存在 → 打激活标记 + 创建 activated 推荐记录（供审核页"已激活"标签页展示）
            const resumeId = (existingResume as any)._id.toString();
            await this.resumeService.markAsReferralActivated(resumeId, referrer.name);
            await this.referralResumeModel.create({
              ...baseDoc,
              reviewStatus:   'activated',
              status:         'activated',
              linkedResumeId: resumeId,
            });
            activated++;
            details.push(`激活（简历库已存在）: ${cloudId} - ${record.name}`);
            this.logger.log(`[syncFromCloudDb] ✅ 激活简历: cloudId=${cloudId} resumeId=${resumeId} name=${record.name}`);
          } else {
            // 简历库无记录 → 黑名单命中则自动拒绝，否则导入为待审核
            const reviewDeadlineAt = record.reviewDeadlineAt
              ? new Date(record.reviewDeadlineAt)
              : new Date(Date.now() + 24 * 60 * 60 * 1000);

            const blacklistHit = await this.auntBlacklistService.checkActive({
              phone: record.phone,
              idCard: record.idCard,
            });

            if (blacklistHit) {
              await this.referralResumeModel.create({
                ...baseDoc,
                reviewStatus: 'rejected',
                status:       'rejected',
                reviewDeadlineAt,
                reviewedAt:   new Date(),
                reviewedBy:   'system:blacklist',
                reviewNote:   `命中阿姨黑名单：${blacklistHit.reason}`,
              });
              imported++;
              details.push(`导入并自动拒绝（黑名单）: ${cloudId} - ${record.name}`);
              this.logger.warn(`[syncFromCloudDb] ⚠️ 黑名单命中自动拒绝: cloudId=${cloudId} name=${record.name} blacklistId=${String(blacklistHit._id)}`);
            } else {
              await this.referralResumeModel.create({
                ...baseDoc,
                reviewStatus: 'pending_review',
                status:       'pending_review',
                reviewDeadlineAt,
              });
              imported++;
              details.push(`导入成功: ${cloudId} - ${record.name}（分配给员工 ${assignedStaffId}）`);
              this.logger.log(`[syncFromCloudDb] ✅ 导入成功: cloudId=${cloudId} name=${record.name}`);
            }
          }
        } catch (err) {
          errors++;
          details.push(`错误（导入失败）: ${cloudId} - ${err.message}`);
          this.logger.error(`[syncFromCloudDb] 导入记录 ${cloudId} 失败: ${err.message}`);
        }
      }
    } catch (err) {
      this.logger.error(`[syncFromCloudDb] 查询云数据库失败: ${err.message}`);
      throw err;
    }

    this.logger.log(`[syncFromCloudDb] 完成：导入=${imported} 激活=${activated} 跳过=${skipped} 错误=${errors}`);
    return { imported, activated, skipped, errors, details };
  }

  /** 重新分配绑定员工（管理员手动干预） */
  async reassignBinding(adminStaffId: string, id: string, newStaffId: string, reason: string): Promise<void> {
    if (!reason) throw new BadRequestException('干预原因不能为空');
    const resume = await this.referralResumeModel.findById(id).exec();
    if (!resume) throw new NotFoundException('推荐记录不存在');

    const oldStaffId = resume.assignedStaffId;
    await this.referralResumeModel.findByIdAndUpdate(id, { assignedStaffId: newStaffId }).exec();

    // 写审计日志
    await this.bindingLogModel.create({
      referralResumeId: id,
      fromStaffId: oldStaffId,
      toStaffId: newStaffId,
      reassignType: 'manual',
      operatedBy: adminStaffId,
      reason,
    });

    // 通知原员工和新员工
    try {
      const [oldStaff, newStaff] = await Promise.all([
        this.usersService.findById(oldStaffId),
        this.usersService.findById(newStaffId),
      ]);
      if (oldStaff?.phone) {
        await this.sendNotification(oldStaff.phone, MiniProgramNotificationType.REFERRAL_REASSIGNED,
          '您的推荐记录已被重新分配',
          `您名下的推荐记录已被管理员重新分配给 ${newStaff?.name || '其他员工'}，原因：${reason}`);
      }
      if (newStaff?.phone) {
        await this.sendNotification(newStaff.phone, MiniProgramNotificationType.REFERRAL_REASSIGNED,
          '有推荐记录已分配给您',
          `管理员将一条推荐记录分配给您，请尽快跟进`);
      }
    } catch {}
  }

  /** 查询某条记录的绑定变更日志 */
  async getBindingLogs(referralResumeId: string): Promise<any[]> {
    return this.bindingLogModel.find({ referralResumeId }).sort({ createdAt: -1 }).lean().exec();
  }

  /** 管理员全量返费操作（无 rewardOwnerStaffId 限制） */
  async adminProcessReward(adminStaffId: string, referralResumeId: string, action: 'approve' | 'reject' | 'markPaid', remark?: string): Promise<void> {
    return this.processReward(adminStaffId, true, referralResumeId, action, remark);
  }

  // ============================================================
  // 员工离职处理（触发批量自动流转）
  // ============================================================

  /**
   * 标记员工离职：
   * 1. staff.isActive→false, staff.leftAt→离职日期
   * 2. 批量流转 pending_review/following_up 记录到管理员
   * 3. 写 referral_binding_logs（reassignType=departure）
   * 4. 通知管理员
   */
  async markStaffDeparted(adminStaffId: string, staffId: string, leftAt: Date): Promise<{ transferredCount: number }> {
    // 标记离职
    await this.usersService.markStaffDeparted(staffId, leftAt);

    // 获取管理员
    const admin = await this.getAdminUser();
    const adminId = (admin as any)._id.toString();

    // 批量查询需要流转的记录
    const affectedResumes = await this.referralResumeModel.find({
      assignedStaffId: staffId,
      status: { $in: ['pending_review', 'following_up'] },
    }).lean().exec();

    if (affectedResumes.length === 0) {
      return { transferredCount: 0 };
    }

    // 批量更新 assignedStaffId → 管理员ID
    const resumeIds = affectedResumes.map((r: any) => r._id.toString());
    await this.referralResumeModel.updateMany(
      { _id: { $in: resumeIds } },
      { assignedStaffId: adminId },
    ).exec();

    // 批量写审计日志
    const logs = resumeIds.map((rid) => ({
      referralResumeId: rid,
      fromStaffId: staffId,
      toStaffId: adminId,
      reassignType: 'departure' as const,
      staffDepartedAt: leftAt,
      operatedBy: adminStaffId,
      reason: `员工离职（离职日期：${leftAt.toISOString().split('T')[0]}），推荐记录自动转入管理员`,
    }));
    await this.bindingLogModel.insertMany(logs);

    // 通知管理员
    if (admin?.phone) {
      const departedStaff = await this.usersService.findById(staffId);
      await this.sendNotification(
        admin.phone,
        MiniProgramNotificationType.REFERRAL_REASSIGNED,
        '员工离职，推荐记录已转入您名下',
        `员工 ${departedStaff?.name || staffId} 已离职，共 ${affectedResumes.length} 条推荐记录已自动转入您名下，请跟进`,
      );
    }

    return { transferredCount: affectedResumes.length };
  }

  // ============================================================
  // CRM 回调接口
  // ============================================================

  /**
   * 合同签署回调：快照 rewardOwnerStaffId，计算 rewardExpectedAt
   */
  async crmCallbackContractSigned(data: {
    referralResumeId: string;
    contractId: string;
    contractSignedAt: Date;
    serviceFee: number;
  }): Promise<void> {
    const resume = await this.referralResumeModel.findById(data.referralResumeId).exec();
    if (!resume) throw new NotFoundException('推荐记录不存在');

    // ── 校验合同状态：只有 active（已签约生效）才计入推荐返费 ──────────────
    // signing（签约中）、cancelled（已作废）等状态不触发推荐流转
    const contract = await this.contractModel.findById(data.contractId).lean().exec() as any;
    if (!contract || contract.contractStatus !== 'active') {
      this.logger.warn(
        `[contractSigned] 合同 ${data.contractId} 状态为 ${contract?.contractStatus ?? '未知'}，非 active，跳过推荐返费流转`,
      );
      return;
    }

    // 已打款的推荐记录：仅更新合同引用，不重置返费字段（一次返费终态，不可再触发）
    if (resume.rewardStatus === 'paid' || resume.status === 'reward_paid') {
      await this.referralResumeModel.findByIdAndUpdate(data.referralResumeId, {
        contractId: data.contractId,
        contractSignedAt: data.contractSignedAt,
        status: 'contracted',
      }).exec();
      this.logger.log(`[contractSigned] 推荐 ${data.referralResumeId} 已打款，仅更新合同引用，不重置返费`);
      return;
    }

    // 计算 rewardOwnerStaffId（返费归属快照）
    // 规则：以员工离职日为分割线
    //   - 员工仍在职 → 归当前 assignedStaffId
    //   - 员工已离职 + 合同签于离职日之前 → 归离职前的原始员工（从 departure 日志取 fromStaffId）
    //   - 员工已离职 + 合同签于离职日及之后 → 归当前 assignedStaffId（管理员或新员工）
    let rewardOwnerStaffId = resume.assignedStaffId;
    try {
      const staffInfo = await this.usersService.findByIdWithDeparture(resume.assignedStaffId);
      if (staffInfo && staffInfo.isActive === false && staffInfo.leftAt) {
        const contractSignedAt = new Date(data.contractSignedAt);
        const leftAt = new Date(staffInfo.leftAt);
        if (contractSignedAt < leftAt) {
          // 合同在离职前签署，返费归原始员工（从 departure 绑定日志找 fromStaffId）
          const departureLog = await this.bindingLogModel
            .findOne({ referralResumeId: data.referralResumeId, reassignType: 'departure' })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
          if (departureLog) {
            rewardOwnerStaffId = (departureLog as any).fromStaffId;
          }
          // 若找不到日志则保持当前 assignedStaffId（兜底）
        }
        // contractSignedAt >= leftAt → rewardOwnerStaffId = resume.assignedStaffId（默认值，无需改变）
      }
    } catch {}

    // 计算返费金额（默认用固定金额制，待业务确认后可调整）
    const rewardAmount = this.calculateRewardAmount(resume.serviceType, data.serviceFee);
    const rewardExpectedAt = new Date(new Date(data.contractSignedAt).getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.referralResumeModel.findByIdAndUpdate(data.referralResumeId, {
      status: 'contracted',
      contractId: data.contractId,
      contractSignedAt: data.contractSignedAt,
      serviceFee: data.serviceFee,
      rewardOwnerStaffId,
      rewardAmount,
      rewardExpectedAt,
    }).exec();
  }

  /**
   * 上户回调：更新 onboardedAt，status→onboarded
   *
   * 30天基准日选取规则（优先级从高到低）：
   *  1. 客户已在小程序确认上户（onboardStatus=confirmed）→ 使用 contract.onboardConfirmedAt（最严谨）
   *  2. 未确认 → 使用 contract.startDate（合同约定服务开始日，fallback）
   *  3. 以上均无 → 使用 CRM 传入的 onboardedAt（兜底）
   */
  async crmCallbackOnboarded(data: { referralResumeId: string; onboardedAt: Date }): Promise<void> {
    const resume = await this.referralResumeModel.findById(data.referralResumeId).lean().exec() as any;

    // 查关联合同，判断是否已客户确认上户
    let baseDate: Date = new Date(data.onboardedAt);
    if (resume?.contractId) {
      try {
        const contract = await this.contractModel.findById(resume.contractId).lean().exec() as any;
        if (contract?.onboardStatus === 'confirmed' && contract?.onboardConfirmedAt) {
          // 开关已开：客户在小程序确认了上户，用确认时间（最严谨）
          baseDate = new Date(contract.onboardConfirmedAt);
          this.logger.log(
            `[onboarded] 使用客户确认上户时间 onboardConfirmedAt=${baseDate.toISOString()} 作为30天基准`,
          );
        } else if (contract?.startDate) {
          // 开关未开：降级用合同约定开始日
          baseDate = new Date(contract.startDate);
          this.logger.log(
            `[onboarded] 客户未确认上户，降级使用 startDate=${baseDate.toISOString()} 作为30天基准`,
          );
        }
      } catch (err) {
        this.logger.warn(`[onboarded] 查询合同失败，使用传入的 onboardedAt 作为基准: ${(err as any).message}`);
      }
    }

    const rewardExpectedAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.referralResumeModel.findByIdAndUpdate(data.referralResumeId, {
      onboardedAt: baseDate,
      status: 'onboarded',
      rewardExpectedAt,
    }).exec();
  }

  /**
   * 合同提前终止回调（工作不足30天）
   * - 推荐记录回到 following_up，等待新合同
   * - 清除本次合同相关字段（contractId / onboardedAt / rewardExpectedAt）
   * - 保留 rewardOwnerStaffId 快照（归属以第一次签约时为准）
   * - 若已打款（reward_paid）则不做任何变更（返费不可撤销）
   */
  async crmCallbackContractTerminated(data: {
    referralResumeId: string;
    reason?: string;
  }): Promise<void> {
    const resume = await this.referralResumeModel.findById(data.referralResumeId).exec();
    if (!resume) throw new NotFoundException('推荐记录不存在');

    // 已打款 → 不允许撤销，直接返回
    if (resume.rewardStatus === 'paid' || resume.status === 'reward_paid') {
      this.logger.warn(`[contractTerminated] 推荐 ${data.referralResumeId} 已打款，跳过终止处理`);
      return;
    }

    await this.referralResumeModel.findByIdAndUpdate(data.referralResumeId, {
      status:          'following_up',  // 回到跟进中，等待新合同
      contractId:      null,
      contractSignedAt: null,
      onboardedAt:     null,
      rewardExpectedAt: null,
      rewardAmount:    null,
      rewardStatus:    'pending',
      // rewardOwnerStaffId 保留（归属以第一次签约时为准，不重置）
      ...(data.reason ? { reviewNote: `合同终止：${data.reason}` } : {}),
    }).exec();

    this.logger.log(`[contractTerminated] 推荐 ${data.referralResumeId} 合同终止，已回到 following_up`);
  }

  /** 按服务类型计算固定返费金额（方案A，待业务确认）
   *  同时支持英文 key（新格式）和历史中文字符串（旧格式兜底） */
  private calculateRewardAmount(serviceType: string, _serviceFee: number): number {
    // 英文 key → 返费金额
    const rewardsByKey: Record<string, number> = {
      'yuesao':       500,
      'zhujia-yuer':  300,
      'baiban-yuer':  300,
      'baojie':       200,
      'baiban-baomu': 300,
      'zhujia-baomu': 300,
      'yangchong':    200,
      'xiaoshi':      100,
      'zhujia-hulao': 200,
      'jiajiao':      200,
      'peiban':       200,
    };
    // 历史中文字符串 → 返费金额（兜底）
    const legacyRewards: Record<string, number> = {
      '月嫂':   500,
      '育婴嫂': 300,
      '保姆':   300,
      '护老':   200,
      '小时工': 100,
    };
    return rewardsByKey[serviceType] ?? legacyRewards[serviceType] ?? 300;
  }

  // ============================================================
  // 定时任务：24小时审核超时自动流转
  // ============================================================

  /**
   * 每30分钟扫描超时未审核简历，自动流转给管理员
   */
  @Cron('0 */30 * * * *', { timeZone: 'Asia/Shanghai' })
  async handleReviewTimeout(): Promise<void> {
    this.logger.log('⏰ [定时任务] 开始扫描超时未审核推荐简历...');

    try {
      const now = new Date();
      const timedOutResumes = await this.referralResumeModel.find({
        reviewStatus: 'pending_review',
        reviewDeadlineAt: { $lt: now },
      }).lean().exec();

      if (timedOutResumes.length === 0) {
        this.logger.log('✅ 无超时简历');
        return;
      }

      const admin = await this.usersService.findAdminUser();
      if (!admin) {
        this.logger.error('❌ 找不到管理员，无法执行超时流转');
        return;
      }
      const adminId = (admin as any)._id.toString();

      // 按原员工分组，用于合并通知
      const byStaff: Record<string, any[]> = {};
      for (const resume of timedOutResumes as any[]) {
        if (!byStaff[resume.assignedStaffId]) byStaff[resume.assignedStaffId] = [];
        byStaff[resume.assignedStaffId].push(resume);
      }

      const resumeIds = timedOutResumes.map((r: any) => r._id.toString());

      // 批量更新 assignedStaffId → 管理员
      await this.referralResumeModel.updateMany(
        { _id: { $in: resumeIds } },
        { assignedStaffId: adminId },
      ).exec();

      // 批量写审计日志
      const logs = (timedOutResumes as any[]).map((r) => ({
        referralResumeId: r._id.toString(),
        fromStaffId: r.assignedStaffId,
        toStaffId: adminId,
        reassignType: 'review_timeout' as const,
        operatedBy: 'system',
        reason: `超过24小时未审核，系统自动流转`,
      }));
      await this.bindingLogModel.insertMany(logs);

      // 合并通知各原员工
      for (const [staffId, resumes] of Object.entries(byStaff)) {
        try {
          const staff = await this.usersService.findById(staffId);
          if (staff?.phone) {
            await this.sendNotification(
              staff.phone,
              MiniProgramNotificationType.REFERRAL_TIMEOUT,
              '待审核简历已超时转给管理员',
              `您有 ${resumes.length} 条待审核简历超过24小时未处理，已自动转给管理员`,
            );
          }
        } catch {}
      }

      // 通知管理员汇总
      if (admin?.phone) {
        await this.sendNotification(
          admin.phone,
          MiniProgramNotificationType.REFERRAL_TIMEOUT,
          '超时简历已转入您名下',
          `有 ${timedOutResumes.length} 条推荐简历因超时审核，已自动流转至您名下，请跟进`,
        );
      }

      this.logger.log(`✅ 超时流转完成，共处理 ${timedOutResumes.length} 条简历`);
    } catch (err) {
      this.logger.error(`❌ 超时流转任务失败: ${err.message}`, err.stack);
    }
  }

  // ============================================================
  // 推荐人列表（管理员，带统计信息）
  // ============================================================

  /**
   * 获取推荐人列表，附带：
   *  - 推荐成功上户量（referral_resumes.status IN onboarded/contracted/reward_pending/reward_paid）
   *  - 最近登录时间（miniprogram_users.lastLoginAt）
   * 支持分页、按审批状态筛选、搜索姓名/手机
   */
  async listReferrers(params: {
    approvalStatus?: string;
    search?: string;
    sourceStaffId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: any[]; total: number }> {
    const { approvalStatus, search, sourceStaffId, page = 1, pageSize = 20 } = params;
    const skip = (page - 1) * pageSize;

    const match: any = {};
    if (approvalStatus) match.approvalStatus = approvalStatus;
    if (sourceStaffId) match.sourceStaffId = sourceStaffId;
    if (search) {
      match.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // 聚合：联表 referral_resumes 统计上户量
    const pipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: 'referral_resumes',
          let: { rid: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$referrerId', '$$rid'] },
                status: { $in: ['onboarded', 'contracted', 'reward_pending', 'reward_paid'] },
              },
            },
            { $count: 'cnt' },
          ],
          as: 'onboardedStats',
        },
      },
      {
        $addFields: {
          onboardedCount: {
            $ifNull: [{ $arrayElemAt: ['$onboardedStats.cnt', 0] }, 0],
          },
        },
      },
      { $unset: 'onboardedStats' },
    ];

    const [countResult, docs] = await Promise.all([
      this.referrerModel.aggregate([{ $match: match }, { $count: 'total' }]),
      this.referrerModel.aggregate([...pipeline, { $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: pageSize }]),
    ]);

    const total = countResult[0]?.total ?? 0;

    // 批量查询最近登录时间（通过 openid 查 miniprogram_users）
    const openids = docs.map((d: any) => d.openid).filter(Boolean);
    const mpUsers = openids.length
      ? await this.mpUserModel.find({ openid: { $in: openids } }).select('openid lastLoginAt').lean().exec()
      : [];
    const loginMap: Record<string, Date | null> = {};
    for (const u of mpUsers as any[]) {
      loginMap[u.openid] = u.lastLoginAt || null;
    }

    // 批量查询推荐人归属员工姓名（sourceStaffId → users.name）
    const sourceStaffIds = Array.from(new Set(
      docs.map((d: any) => d.sourceStaffId).filter(Boolean) as string[],
    ));
    const staffNameMap = sourceStaffIds.length
      ? await this.usersService.findNamesByIds(sourceStaffIds)
      : {};

    const list = docs.map((d: any) => ({
      ...d,
      lastLoginAt: loginMap[d.openid] ?? null,
      sourceStaffName: d.sourceStaffId ? (staffNameMap[d.sourceStaffId] ?? null) : null,
    }));

    return { list, total };
  }

  /**
   * 管理员直接创建推荐人（跳过申请审批流程，直接 approved）
   * openid 使用 admin_created_ 前缀生成唯一标识
   */
  async adminCreateReferrer(adminStaffId: string, data: {
    name: string;
    phone: string;
    wechatId?: string;
    idCard?: string;
    bankCardNumber?: string;
    bankName?: string;
  }): Promise<ReferrerDocument> {
    // 手机号去重
    const exists = await this.referrerModel.findOne({ phone: data.phone }).exec();
    if (exists) {
      throw new BadRequestException('该手机号已存在推荐人记录');
    }

    // 优先使用小程序真实 openid；若该手机号尚无小程序账号，才生成占位符
    let realOpenid: string | null = null;
    try {
      const mpUser = await this.mpUserService.findByPhone(data.phone);
      if (mpUser) {
        realOpenid = (mpUser as any).openid;
      }
    } catch (err) {
      this.logger.warn(`管理员创建推荐人时查询小程序用户失败: ${err.message}`);
    }

    const uniqueOpenid = realOpenid ?? `admin_created_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const referrer = await this.referrerModel.create({
      openid: uniqueOpenid,
      name: data.name,
      phone: data.phone,
      wechatId: data.wechatId || '',
      idCard: data.idCard,
      bankCardNumber: data.bankCardNumber,
      bankName: data.bankName,
      sourceStaffId: adminStaffId,
      approvalStatus: 'approved',
      approvedBy: adminStaffId,
      approvedAt: new Date(),
      totalReferrals: 0,
      totalRewardAmount: 0,
      status: 'active',
    });

    // 若该手机号已有小程序账号，同步设置角色为推荐官
    if (realOpenid) {
      try {
        await this.mpUserService.updateRoleByOpenid(realOpenid, '推荐官');
      } catch (err) {
        this.logger.warn(`管理员创建推荐人时同步小程序角色失败: ${err.message}`);
      }
    }

    return referrer;
  }

  /** 更新推荐人银行/身份证信息（管理员操作） */
  async updateReferrerInfo(referrerId: string, data: {
    idCard?: string;
    bankCardNumber?: string;
    bankName?: string;
  }): Promise<void> {
    if (!Types.ObjectId.isValid(referrerId)) {
      throw new BadRequestException('无效的推荐人ID');
    }
    const update: any = {};
    if (data.idCard !== undefined) update.idCard = data.idCard;
    if (data.bankCardNumber !== undefined) update.bankCardNumber = data.bankCardNumber;
    if (data.bankName !== undefined) update.bankName = data.bankName;
    await this.referrerModel.findByIdAndUpdate(referrerId, update).exec();
  }

  /** 删除单条推荐记录（仅管理员，硬删除） */
  async deleteReferralResume(adminStaffId: string, referralResumeId: string): Promise<void> {
    if (!Types.ObjectId.isValid(referralResumeId)) {
      throw new BadRequestException('无效的推荐记录ID');
    }
    const resume = await this.referralResumeModel.findById(referralResumeId).exec();
    if (!resume) throw new NotFoundException('推荐记录不存在');

    await this.referralResumeModel.findByIdAndDelete(referralResumeId).exec();
    this.logger.log(`[deleteReferralResume] 管理员 ${adminStaffId} 删除推荐记录 ${resume.name}（${referralResumeId}）`);
  }

  /** 删除推荐人（仅管理员）：同时软删除关联推荐简历（置为 invalid），并降级小程序角色 */
  async deleteReferrer(adminStaffId: string, referrerId: string): Promise<void> {
    if (!Types.ObjectId.isValid(referrerId)) {
      throw new BadRequestException('无效的推荐人ID');
    }
    const referrer = await this.referrerModel.findById(referrerId).exec();
    if (!referrer) throw new NotFoundException('推荐人不存在');

    // 将该推荐人名下所有未终态的推荐记录标记为 invalid
    await this.referralResumeModel.updateMany(
      {
        referrerId: referrerId,
        status: { $nin: ['contracted', 'onboarded', 'reward_pending', 'reward_approved', 'reward_paid'] },
      },
      { status: 'invalid' },
    ).exec();

    await this.referrerModel.findByIdAndDelete(referrerId).exec();

    // 同步降级小程序用户角色：推荐官 → staff（如果是员工）或 customer
    // 严格遵循 PRD §10 角色优先级：admin > staff > referrer > customer
    // admin_created_ 占位 openid 的推荐人无对应 mpUser，findByPhone 会返回 null，静默跳过
    try {
      const mpUser = await this.mpUserService.findByPhone(referrer.phone);
      if (mpUser) {
        const { role: resolvedRole } = await this.mpUserService.resolveUserRole(
          (mpUser as any).openid,
          referrer.phone,
        );
        // resolveUserRole 已去掉推荐人身份后实时计算：若是员工会返回 staff，否则返回 customer
        // 但此时 referrers 记录刚被删除（上方 findByIdAndDelete），referrer 优先级自然失效
        // 若仍返回推荐官（极端竞态），则强制降为 customer
        const targetRole = (resolvedRole === '推荐官' || resolvedRole === 'referrer') ? 'customer' : resolvedRole;
        await this.mpUserService.updateRoleByOpenid((mpUser as any).openid, targetRole);
        this.logger.log(`[deleteReferrer] 已将 ${referrer.name} 小程序角色降级为 ${targetRole}`);
      }
    } catch (err) {
      this.logger.warn(`[deleteReferrer] 降级小程序角色失败（不影响删除）: ${(err as Error).message}`);
    }

    this.logger.log(`[deleteReferrer] 管理员 ${adminStaffId} 删除推荐人 ${referrer.name}（${referrerId}）`);
  }
}
