import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { TrainingLead, TrainingLeadDocument, LeadStatus } from './models/training-lead.model';
import { TrainingLeadFollowUp, TrainingLeadFollowUpDocument } from './models/training-lead-follow-up.model';
import { TrainingLeadOperationLog } from './models/training-lead-operation-log.model';
import { CreateTrainingLeadDto } from './dto/create-training-lead.dto';
import { UpdateTrainingLeadDto } from './dto/update-training-lead.dto';
import { TrainingLeadQueryDto } from './dto/training-lead-query.dto';
import { CreateTrainingLeadFollowUpDto } from './dto/create-training-lead-follow-up.dto';
import { User } from '../users/models/user.entity';
import { NotificationHelperService } from '../notification/notification-helper.service';

@Injectable()
export class TrainingLeadsService {
  private readonly logger = new Logger(TrainingLeadsService.name);

  constructor(
    @InjectModel(TrainingLead.name) private trainingLeadModel: Model<TrainingLeadDocument>,
    @InjectModel(TrainingLeadFollowUp.name) private followUpModel: Model<TrainingLeadFollowUpDocument>,
    @InjectModel(TrainingLeadOperationLog.name) private operationLogModel: Model<TrainingLeadOperationLog>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly notificationHelper: NotificationHelperService,
  ) {}

  /**
   * 记录学员线索操作日志
   */
  async logOperation(
    leadId: string | Types.ObjectId,
    operatorId: string,
    operationType: string,
    operationName: string,
    details?: {
      before?: Record<string, any>;
      after?: Record<string, any>;
      description?: string;
      relatedId?: string;
      relatedType?: string;
    }
  ): Promise<void> {
    try {
      const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);
      const operatorObjectId = operatorId && isValidObjectId(operatorId)
        ? new Types.ObjectId(operatorId)
        : new Types.ObjectId('000000000000000000000000');

      await this.operationLogModel.create({
        leadId: new Types.ObjectId(leadId.toString()),
        operatorId: operatorObjectId,
        entityType: 'training_lead',
        entityId: leadId.toString(),
        operationType,
        operationName,
        details,
        operatedAt: new Date(),
      });
    } catch (error: any) {
      this.logger.warn(`写入学员线索操作日志失败: ${error?.message}`);
    }
  }

  /**
   * 获取学员线索操作日志
   */
  async getOperationLogs(leadId: string): Promise<any[]> {
    const lead = await this.trainingLeadModel.findById(leadId);
    if (!lead) {
      throw new NotFoundException('培训线索不存在');
    }
    return this.operationLogModel
      .find({ leadId: new Types.ObjectId(leadId) })
      .populate('operatorId', 'name username')
      .sort({ operatedAt: -1 })
      .lean()
      .exec()
      .then((logs: any[]) =>
        logs.map((log) => ({
          ...log,
          operator: log.operatorId && typeof log.operatorId === 'object' && log.operatorId._id
            ? { _id: log.operatorId._id, name: log.operatorId.name, username: log.operatorId.username }
            : null,
        }))
      );
  }

  /**
   * 生成学员编号
   */
  private generateStudentId(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ST${timestamp}${random}`;
  }

  /**
   * 创建培训线索
   */
  async create(createDto: CreateTrainingLeadDto, userId: string, referredByUserId?: string): Promise<TrainingLead> {
    this.logger.log(`创建培训线索: ${createDto.name}`);

    // 验证手机号和微信号至少有一个
    if (!createDto.phone && !createDto.wechatId) {
      throw new BadRequestException('手机号和微信号至少填写一个');
    }

    // 如果有手机号，检查唯一性
    if (createDto.phone) {
      const existingLead = await this.trainingLeadModel.findOne({ phone: createDto.phone });
      if (existingLead) {
        throw new ConflictException('该手机号已存在');
      }
    }

    // 生成学员编号
    const studentId = this.generateStudentId();

    // 处理日期字段
    const leadData: any = {
      ...createDto,
      studentId,
      createdBy: new Types.ObjectId(userId),
      status: LeadStatus.FOLLOWING
    };

    // 如果提供了归属用户ID，设置referredBy字段
    if (referredByUserId) {
      leadData.referredBy = new Types.ObjectId(referredByUserId);
    }

    if (createDto.expectedStartDate) {
      leadData.expectedStartDate = new Date(createDto.expectedStartDate);
    }

    // 处理学员归属
    if (createDto.studentOwner) {
      leadData.studentOwner = new Types.ObjectId(createDto.studentOwner);
    }

    const lead = new this.trainingLeadModel(leadData);
    const saved = await lead.save();

    this.logger.log(`培训线索创建成功: ${saved.studentId}`);

    // 📝 记录操作日志 - 创建线索
    await this.logOperation(
      (saved as any)._id.toString(),
      userId,
      'create',
      '创建学员线索',
      {
        description: `创建学员线索：${saved.name}（${saved.studentId}）`,
        after: {
          name: saved.name,
          phone: saved.phone || '',
          wechatId: saved.wechatId || '',
          leadSource: saved.leadSource || '',
          intentionLevel: saved.intentionLevel || '',
          leadGrade: saved.leadGrade || '',
        },
      }
    );

    // 🔔 通知管理员：新线索创建
    try {
      const admins = await this.userModel
        .find({ role: { $in: ['admin', 'operator', '系统管理员'] } })
        .select('_id')
        .lean();
      const adminIds = admins.map((u: any) => u._id.toString()).filter(id => id !== userId);
      if (adminIds.length > 0) {
        const creator = await this.userModel.findById(userId).select('name').lean();
        await this.notificationHelper.notifyTrainingLeadCreated(adminIds, {
          leadId: (saved as any)._id.toString(),
          leadName: saved.name,
          phone: saved.phone || '未填写',
          creatorName: (creator as any)?.name || '未知',
        }).catch(e => this.logger.warn(`发送新线索通知失败: ${e?.message}`));
      }
    } catch (e: any) {
      this.logger.warn(`新线索通知查询失败: ${e?.message}`);
    }

    return saved;
  }

  /**
   * 计算线索的跟进状态
   * @param lead 线索对象
   * @param followUps 跟进记录列表
   * @returns 跟进状态标签：'新客未跟进' | '流转未跟进' | null
   */
  // 终态：人工设置后系统不覆盖
  private static readonly TERMINAL_STATUSES = new Set([
    LeadStatus.ENROLLED,   // 已报名
    LeadStatus.GRADUATED,  // 已结业
    LeadStatus.VISITED,    // 已到店
    LeadStatus.INVALID,    // 无效线索
  ]);

  /**
   * 计算统一的 leadStatus 字段：
   * - 终态（已报名/已结业/已到店/无效线索）→ 保持 status 原值，不覆盖
   * - 非终态 → 根据跟进记录实时计算，覆盖 status 的 DB 值
   *   · 已流转 + 无跟进 → '流转未跟进'
   *   · 未流转 + 无跟进 → '新客未跟进'
   *   · 有跟进 → '跟进中'
   */
  private computeLeadStatus(lead: any, followUps: any[]): string {
    // 终态直接返回，不被系统计算覆盖
    if (TrainingLeadsService.TERMINAL_STATUSES.has(lead.status)) {
      return lead.status;
    }

    const hasFollowUps = followUps && followUps.length > 0;

    if (!hasFollowUps) {
      // 判断是否流转（studentOwner !== createdBy）
      const studentOwnerId = lead.studentOwner?._id?.toString?.() ?? lead.studentOwner?.toString?.();
      const createdById   = lead.createdBy?._id?.toString?.()    ?? lead.createdBy?.toString?.();
      const isTransferred = !!(studentOwnerId && createdById && studentOwnerId !== createdById);
      return isTransferred ? LeadStatus.TRANSFER_NOT_FOLLOWED_UP : LeadStatus.NEW_NOT_FOLLOWED_UP;
    }

    return LeadStatus.FOLLOWING;
  }

  /**
   * 计算线索注意力标记（只标记"需要关注"的状态）
   * 返回: '新客未跟进' | '流转未跟进' | null
   */
  private calculateFollowUpStatus(lead: any, followUps: any[]): string | null {
    const hasFollowUps = followUps && followUps.length > 0;

    // 判断是否发生了流转（studentOwner !== createdBy）
    let isTransferred = false;
    if (lead.studentOwner && lead.createdBy) {
      const studentOwnerId = typeof lead.studentOwner === 'object'
        ? lead.studentOwner._id?.toString()
        : lead.studentOwner.toString();
      const createdById = typeof lead.createdBy === 'object'
        ? lead.createdBy._id?.toString()
        : lead.createdBy.toString();
      isTransferred = studentOwnerId !== createdById;
    }

    // 已流转但无跟进记录 → 流转未跟进（新负责人尚未跟进）
    if (isTransferred && !hasFollowUps) {
      return '流转未跟进';
    }

    // 未流转且无跟进记录 → 新客未跟进
    if (!hasFollowUps) {
      return '新客未跟进';
    }

    // 有跟进记录 → 正常跟进中，无特殊标记
    return null;
  }

  /**
   * 获取最近一次跟进结果
   * 返回: '已接通' | '未接通' | '已回复' | '未回复' | ... | null
   */
  private getLastFollowUpResult(followUps: any[]): string | null {
    if (!followUps || followUps.length === 0) return null;
    const last = followUps.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return last?.followUpResult || null;
  }

  /**
   * 查询培训线索列表
   */
  async findAll(query: TrainingLeadQueryDto): Promise<any> {
    // 小程序端传 limit，CRM端传 pageSize，兼容两者
    const limit = (query as any).limit;
    const { page = 1, pageSize = limit ? Number(limit) : 10, search, status, leadSource, trainingType, startDate, endDate, assignedTo, createdBy, isReported, studentOwner } = query;

    const filter: any = {};
    const andConditions: any[] = [];

    // 按归属人过滤：
    // 1. 当前持有人（studentOwner）是自己
    // 2. 已分配给自己（assignedTo）
    // 3. 自己创建 且 尚未分配给他人（studentOwner 为空）
    // ⚠️ 线索一旦被分配给他人，创建者就不再可见，避免数据泄露
    if (createdBy) {
      const uid = new Types.ObjectId(createdBy);
      andConditions.push({
        $or: [
          { studentOwner: uid },
          { studentOwner: createdBy },
          { assignedTo: uid },
          { assignedTo: createdBy },
          {
            $and: [
              { $or: [{ createdBy: uid }, { createdBy: createdBy }] },
              { $or: [{ studentOwner: null }, { studentOwner: { $exists: false } }] }
            ]
          }
        ]
      });
    }

    // 搜索条件（search 来自 CRM端，keyword 来自小程序端，兼容两者）
    const searchKeyword = search || (query as any).keyword;
    if (searchKeyword) {
      andConditions.push({
        $or: [
          { name: { $regex: searchKeyword, $options: 'i' } },
          { phone: { $regex: searchKeyword, $options: 'i' } },
          { wechatId: { $regex: searchKeyword, $options: 'i' } },
          { studentId: { $regex: searchKeyword, $options: 'i' } }
        ]
      });
    }

    // 合并 $and 条件
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // 筛选条件
    // ─────────────────────────────────────────────────────────────────────
    // 状态筛选：UI 显示的是「计算状态」(leadStatus)，由 computeLeadStatus() 动态算出，
    // 并非 DB 中存储的 status 字段。两者映射关系：
    //   终态（已报名/已结业/已到店/无效线索）→ DB status 直接存储，直接过滤即可
    //   跟进中                              → 非终态 + 有跟进记录
    //   新客未跟进/流转未跟进/未跟进         → 非终态 + 无跟进记录
    //   7天未跟进/15天未跟进               → 非终态 + 无跟进记录 + DB status 精确匹配
    // 直接用 filter.status = status 只能查终态或时间段状态，动态状态会不准，故分支处理。
    // ─────────────────────────────────────────────────────────────────────
    if (status) {
      const terminalStatusList = [
        LeadStatus.ENROLLED,
        LeadStatus.GRADUATED,
        LeadStatus.VISITED,
        LeadStatus.INVALID,
      ];
      if (terminalStatusList.includes(status as LeadStatus)) {
        // 终态：DB 中有确定值，直接过滤
        filter.status = status;
      } else if (status === LeadStatus.FOLLOWING) {
        // 跟进中 = 非终态 + 有跟进记录
        const followedIds = await this.followUpModel.distinct('leadId');
        andConditions.push({ status: { $nin: terminalStatusList } });
        andConditions.push({ _id: { $in: followedIds } });
        filter.$and = andConditions;
      } else {
        // 新客未跟进 / 流转未跟进 / 未跟进 / 7天未跟进 / 15天未跟进
        // 共同特征：非终态 + 无跟进记录
        const followedIds = await this.followUpModel.distinct('leadId');
        andConditions.push({ status: { $nin: terminalStatusList } });
        andConditions.push({ _id: { $nin: followedIds } });
        // 7天/15天 额外按 DB 存储的状态细分
        if (
          status === LeadStatus.NOT_FOLLOWED_UP_7_DAYS ||
          status === LeadStatus.NOT_FOLLOWED_UP_15_DAYS
        ) {
          andConditions.push({ status });
        }
        filter.$and = andConditions;
      }
    }
    if (leadSource) filter.leadSource = leadSource;
    if (trainingType) filter.trainingType = trainingType;
    if (assignedTo) filter.assignedTo = new Types.ObjectId(assignedTo);
    if (isReported !== undefined) filter.isReported = isReported;
    if (studentOwner === '__unassigned__') {
      // 筛选未分配跟进人（跟进人列显示的是 studentOwner，studentOwner 为空即视为"未分配"）
      andConditions.push({
        $or: [{ studentOwner: null }, { studentOwner: { $exists: false } }]
      });
      if (andConditions.length > 0) filter.$and = andConditions;
    } else if (studentOwner) {
      filter.studentOwner = new Types.ObjectId(studentOwner);
    }

    // 公海池筛选：传 inPublicPool=true 只查公海，否则默认排除公海线索
    const inPublicPool = (query as any).inPublicPool;
    if (inPublicPool === true || inPublicPool === 'true') {
      filter.inPublicPool = true;
    } else {
      filter.inPublicPool = { $ne: true };
    }

    // 按最近跟进结果筛选（聚合最新跟进记录后过滤）
    const { lastFollowUpResult } = query as any;
    if (lastFollowUpResult) {
      const latestFollowUps = await this.followUpModel.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$leadId', latestResult: { $first: '$followUpResult' } } },
        { $match: { latestResult: lastFollowUpResult } }
      ]);
      const matchingIds = latestFollowUps.map(r => r._id);
      filter._id = { $in: matchingIds };
    }

    // statFilter：按 leadStatus 分组过滤（与现有 status 单值过滤互不干扰）
    // notFollowed  → leadStatus in ['新客未跟进','流转未跟进','7天未跟进','15天未跟进']
    //               = 非终态 + 无跟进记录
    // followingUp  → leadStatus = '跟进中' = 非终态 + 有跟进记录
    // enrolled     → leadStatus = '已报名' = status === '已报名'
    const statFilter = (query as any).statFilter;
    if (statFilter) {
      const terminalStatuses = [
        LeadStatus.ENROLLED,
        LeadStatus.GRADUATED,
        LeadStatus.VISITED,
        LeadStatus.INVALID,
      ];
      if (statFilter === 'enrolled') {
        andConditions.push({ status: LeadStatus.ENROLLED });
      } else {
        // 查出全部有跟进记录的 leadId（后续与 filter 中的可见性条件做交集，不影响权限）
        const leadsWithFollowUps = await this.followUpModel.distinct('leadId');
        andConditions.push({ status: { $nin: terminalStatuses } });
        if (statFilter === 'notFollowed') {
          andConditions.push({ _id: { $nin: leadsWithFollowUps } });
        } else {
          // followingUp
          andConditions.push({ _id: { $in: leadsWithFollowUps } });
        }
      }
      filter.$and = andConditions;
    }

    // 日期范围
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.trainingLeadModel.aggregate([
        { $match: filter },
        // 按创建时间倒序排列（新到旧）
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: pageSize },
        // populate: createdBy
        { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: '_cb' } },
        { $addFields: { createdBy: { $arrayElemAt: ['$_cb', 0] } } },
        // populate: assignedTo
        { $lookup: { from: 'users', localField: 'assignedTo', foreignField: '_id', as: '_at' } },
        { $addFields: { assignedTo: { $arrayElemAt: ['$_at', 0] } } },
        // populate: referredBy
        { $lookup: { from: 'users', localField: 'referredBy', foreignField: '_id', as: '_rb' } },
        { $addFields: { referredBy: { $arrayElemAt: ['$_rb', 0] } } },
        // populate: studentOwner
        { $lookup: { from: 'users', localField: 'studentOwner', foreignField: '_id', as: '_so' } },
        { $addFields: { studentOwner: { $arrayElemAt: ['$_so', 0] } } },
        // 清除临时字段
        { $project: { _hasFollowUp: 0, _cb: 0, _at: 0, _rb: 0, _so: 0 } }
      ]),
      this.trainingLeadModel.countDocuments(filter)
    ]);

    // 为每个线索计算跟进状态
    const itemsWithFollowUpStatus = await Promise.all(
      items.map(async (lead) => {
        // 获取该线索的跟进记录
        const followUps = await this.followUpModel
          .find({ leadId: lead._id })
          .populate('createdBy', '_id name username')
          .lean()
          .exec();

        // 注意力标记（新客未跟进 / 流转未跟进 / null）
        const followUpStatus = this.calculateFollowUpStatus(lead, followUps);
        // 最近跟进结果（已接通 / 未接通 / 已回复 / 未回复 / ... / null）
        const lastFollowUpResult = this.getLastFollowUpResult(followUps);
        // 统一线索状态（合并 status + followUpStatus，前端只读此字段）
        const leadStatus = this.computeLeadStatus(lead, followUps);

        return {
          ...lead,
          followUpStatus,
          lastFollowUpResult,
          leadStatus,
        };
      })
    );

    return {
      items: itemsWithFollowUpStatus,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * 获取单个培训线索详情（包含跟进记录）
   */
  async findOne(id: string): Promise<any> {
    const lead = await this.trainingLeadModel
      .findById(id)
      .populate('createdBy', 'name username')
      .populate('assignedTo', 'name username')
      .populate('referredBy', 'name username')
      .populate('studentOwner', 'name username')
      .lean()
      .exec();

    if (!lead) {
      throw new NotFoundException('培训线索不存在');
    }

    // 获取跟进记录
    const followUps = await this.followUpModel
      .find({ leadId: new Types.ObjectId(id) })
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // 注意力标记（新客未跟进 / 流转未跟进 / null）
    const followUpStatus = this.calculateFollowUpStatus(lead, followUps);
    // 最近跟进结果（已接通 / 未接通 / 已回复 / 未回复 / ... / null）
    const lastFollowUpResult = this.getLastFollowUpResult(followUps);
    // 统一线索状态（合并 status + followUpStatus，前端只读此字段）
    const leadStatus = this.computeLeadStatus(lead, followUps);

    return {
      ...lead,
      followUps,
      followUpStatus,
      lastFollowUpResult,
      leadStatus,
    };
  }

  /**
   * 更新培训线索
   */
  async update(id: string, updateDto: UpdateTrainingLeadDto, userId?: string): Promise<TrainingLead> {
    this.logger.log(`更新培训线索: ${id}, 数据: ${JSON.stringify(updateDto)}`);

    const lead = await this.trainingLeadModel.findById(id);
    if (!lead) {
      throw new NotFoundException('培训线索不存在');
    }

    // 如果更新手机号，检查唯一性
    if (updateDto.phone && updateDto.phone !== lead.phone) {
      const existingLead = await this.trainingLeadModel.findOne({ phone: updateDto.phone });
      if (existingLead) {
        throw new ConflictException('该手机号已存在');
      }
    }

    // 保留修改前的值，用于后续写操作日志
    const leadBeforeSnapshot: any = (lead as any).toObject ? (lead as any).toObject() : { ...(lead as any) };

    // 处理日期字段
    const updateData: any = { ...updateDto };
    if (updateDto.expectedStartDate) {
      updateData.expectedStartDate = new Date(updateDto.expectedStartDate);
    }

    // 处理学员归属
    const prevOwnerId = lead.studentOwner?.toString();
    if (updateDto.studentOwner) {
      updateData.studentOwner = new Types.ObjectId(updateDto.studentOwner);
    }

    // 标记为无效线索时自动流入公海池
    const wasMarkedInvalid =
      updateDto.status === LeadStatus.INVALID && lead.status !== LeadStatus.INVALID;
    if (wasMarkedInvalid) {
      updateData.inPublicPool = true;
      updateData.publicPoolAt = new Date();
      updateData.publicPoolReason = 'invalid';
      updateData.assignedTo = null;
      updateData.studentOwner = null;
      this.logger.log(`线索 ${lead.studentId} 标记为无效，自动流入公海池`);
    }

    Object.assign(lead, updateData);
    const updated = await lead.save();

    this.logger.log(`培训线索更新成功: ${updated.studentId}`);

    // 📝 记录操作日志 - 编辑线索 / 分配 / 变更状态 / 释放到公海
    if (userId) {
      await this.writeUpdateOperationLogs(
        id,
        userId,
        updateDto,
        leadBeforeSnapshot,
        updated,
        prevOwnerId,
        wasMarkedInvalid
      );
    }

    // 🔔 通知新负责人：线索已分配给你
    const newOwnerId = updateDto.studentOwner;
    if (newOwnerId && newOwnerId !== prevOwnerId) {
      this.notificationHelper.notifyTrainingLeadAssigned(newOwnerId, {
        leadId: (updated as any)._id.toString(),
        leadName: updated.name,
        phone: updated.phone || '未填写',
      }).catch(e => this.logger.warn(`发送线索分配通知失败: ${e?.message}`));
    }

    return updated;
  }

  /**
   * 根据 update DTO 拆分记录多条操作日志（字段修改 / 分配负责人 / 状态变更 / 自动流入公海）
   */
  private async writeUpdateOperationLogs(
    leadId: string,
    userId: string,
    updateDto: UpdateTrainingLeadDto,
    before: any,
    after: any,
    prevOwnerId: string | undefined,
    wasMarkedInvalid: boolean,
  ): Promise<void> {
    // 1) 分配负责人变更
    if (updateDto.studentOwner !== undefined) {
      const newOwnerId = updateDto.studentOwner ? String(updateDto.studentOwner) : '';
      if (newOwnerId && newOwnerId !== (prevOwnerId || '')) {
        let prevOwnerName = '-';
        let newOwnerName = '-';
        try {
          if (prevOwnerId) {
            const u = await this.userModel.findById(prevOwnerId).select('name username').lean();
            prevOwnerName = (u as any)?.name || (u as any)?.username || '-';
          }
          const nu = await this.userModel.findById(newOwnerId).select('name username').lean();
          newOwnerName = (nu as any)?.name || (nu as any)?.username || '-';
        } catch (_) {}
        await this.logOperation(leadId, userId, 'assign', '分配负责人', {
          description: `学员归属由【${prevOwnerName}】变更为【${newOwnerName}】`,
          before: { studentOwner: prevOwnerName },
          after: { studentOwner: newOwnerName },
        });
      }
    }

    // 2) 状态变更（status）
    if (updateDto.status !== undefined && updateDto.status !== before.status) {
      await this.logOperation(leadId, userId, 'change_status', '变更线索状态', {
        description: `状态由【${before.status || '-'}】变更为【${updateDto.status}】`,
        before: { status: before.status },
        after: { status: updateDto.status },
      });
    }

    // 3) 标记无效 → 自动流入公海
    if (wasMarkedInvalid) {
      await this.logOperation(leadId, userId, 'release_to_pool', '标记无效，流入公海', {
        description: '线索被标记为无效，自动流入公海池',
      });
    }

    // 4) 其他字段编辑（字段差异）
    const fieldNameMap: Record<string, string> = {
      name: '客户姓名', gender: '性别', age: '年龄', consultPosition: '咨询职位',
      phone: '手机号', wechatId: '微信号', leadSource: '线索来源',
      trainingType: '培训类型', intendedCourses: '意向课程', reportedCertificates: '已报证书',
      intentionLevel: '意向程度', leadGrade: '线索等级', expectedStartDate: '期望开课时间',
      budget: '预算金额', courseAmount: '报课金额', serviceFeeAmount: '服务费金额',
      isOnlineCourse: '网课', address: '所在地区', isReported: '是否报征',
      remarks: '备注信息',
    };
    const trackedFields = Object.keys(fieldNameMap);
    const beforeData: Record<string, any> = {};
    const afterData: Record<string, any> = {};
    const changed: string[] = [];
    for (const f of trackedFields) {
      if (!(f in updateDto)) continue;
      const newVal = (updateDto as any)[f];
      const oldVal = (before as any)[f];
      const norm = (v: any) => (Array.isArray(v) ? v.join(',') : v instanceof Date ? v.toISOString() : String(v ?? ''));
      if (norm(oldVal) !== norm(newVal)) {
        changed.push(f);
        beforeData[f] = Array.isArray(oldVal) ? oldVal : oldVal ?? '';
        afterData[f] = Array.isArray(newVal) ? newVal : newVal ?? '';
      }
    }
    if (changed.length > 0) {
      const names = changed.map(f => fieldNameMap[f]).join('、');
      await this.logOperation(leadId, userId, 'update', '编辑学员信息', {
        description: `修改了：${names}`,
        before: beforeData,
        after: afterData,
      });
    }
  }

  /**
   * 释放线索到公海池（手动）
   * 本人持有 或 管理员 可操作
   */
  async releaseLead(id: string, userId: string, isAdmin: boolean): Promise<TrainingLead> {
    const lead = await this.trainingLeadModel.findById(id);
    if (!lead) throw new NotFoundException('培训线索不存在');

    const currentOwner = lead.assignedTo?.toString() || lead.studentOwner?.toString();
    if (!isAdmin && currentOwner !== userId) {
      throw new ForbiddenException('只能释放自己持有的线索');
    }
    if ((lead as any).inPublicPool) {
      throw new BadRequestException('该线索已在公海池中');
    }

    const updated = await this.trainingLeadModel.findByIdAndUpdate(
      id,
      {
        $set: {
          inPublicPool: true,
          publicPoolAt: new Date(),
          publicPoolReason: 'manual',
          assignedTo: null,
          studentOwner: null,
        }
      },
      { new: true }
    );

    this.logger.log(`线索 ${lead.studentId} 被用户 ${userId} 手动释放到公海池`);

    // 📝 记录操作日志 - 释放到公海
    await this.logOperation(id, userId, 'release_to_pool', '释放到公海池', {
      description: `将学员线索【${lead.name}】释放到公海池`,
    });

    return updated as TrainingLead;
  }

  /**
   * 从公海池认领线索（原子操作防并发）
   */
  async claimLead(id: string, userId: string): Promise<TrainingLead> {
    const uid = new Types.ObjectId(userId);
    const updated = await this.trainingLeadModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), inPublicPool: true, assignedTo: null },
      {
        $set: {
          inPublicPool: false,
          publicPoolAt: null,
          publicPoolReason: null,
          assignedTo: uid,
          studentOwner: uid,
        }
      },
      { new: true }
    );

    if (!updated) {
      // 检查线索是否存在
      const lead = await this.trainingLeadModel.findById(id);
      if (!lead) throw new NotFoundException('培训线索不存在');
      throw new ConflictException('该线索已被他人认领');
    }

    this.logger.log(`线索 ${(updated as any).studentId} 被用户 ${userId} 认领`);

    // 📝 记录操作日志 - 从公海领取
    await this.logOperation(id, userId, 'claim_from_pool', '从公海领取', {
      description: `从公海池认领学员线索【${updated.name}】`,
    });

    return updated as TrainingLead;
  }

  /**
   * 删除培训线索
   */
  async remove(id: string, userId?: string): Promise<void> {
    this.logger.log(`删除培训线索: ${id}`);

    const lead = await this.trainingLeadModel.findById(id);
    if (!lead) {
      throw new NotFoundException('培训线索不存在');
    }

    // 📝 记录操作日志 - 删除线索（在删除前记录）
    if (userId) {
      await this.logOperation(id, userId, 'delete', '删除学员线索', {
        description: `删除学员线索：${lead.name}（${lead.studentId}）`,
        before: {
          name: lead.name,
          phone: lead.phone || '',
          studentId: lead.studentId,
        },
      });
    }

    // 删除相关的跟进记录
    await this.followUpModel.deleteMany({ leadId: new Types.ObjectId(id) });

    // 删除线索
    await this.trainingLeadModel.findByIdAndDelete(id);

    this.logger.log(`培训线索删除成功: ${lead.studentId}`);
  }

  /**
   * 创建跟进记录
   */
  async createFollowUp(
    leadId: string,
    createDto: CreateTrainingLeadFollowUpDto,
    userId: string
  ): Promise<TrainingLeadFollowUp> {
    this.logger.log(`为线索 ${leadId} 创建跟进记录`);

    // 验证线索是否存在
    const lead = await this.trainingLeadModel.findById(leadId);
    if (!lead) {
      throw new NotFoundException('培训线索不存在');
    }

    // 创建跟进记录
    const followUpData: any = {
      ...createDto,
      leadId: new Types.ObjectId(leadId),
      createdBy: new Types.ObjectId(userId),
    };

    if (createDto.nextFollowUpDate) {
      followUpData.nextFollowUpDate = new Date(createDto.nextFollowUpDate);
    }

    const followUp = new this.followUpModel(followUpData);
    const saved = await followUp.save();

    // 更新线索的最后跟进时间 & 最后活跃时间
    const now = new Date();
    lead.lastFollowUpAt = now;
    (lead as any).lastActivityAt = now;

    // 确保跟进时线索状态为"跟进中"
    if (lead.status !== LeadStatus.ENROLLED && lead.status !== LeadStatus.GRADUATED) {
      lead.status = LeadStatus.FOLLOWING;
    }

    await lead.save();

    // 填充创建人信息
    const populated = await this.followUpModel
      .findById(saved._id)
      .populate('createdBy', 'name username')
      .lean()
      .exec();

    this.logger.log(`跟进记录创建成功`);

    // 📝 记录操作日志 - 添加跟进记录
    await this.logOperation(
      leadId,
      userId,
      'create_follow_up',
      '添加跟进记录',
      {
        description: `新增跟进记录：${createDto.type || ''}${createDto.followUpResult ? ' / ' + createDto.followUpResult : ''}`,
        relatedId: (saved as any)._id.toString(),
        relatedType: 'follow_up',
        after: {
          type: createDto.type,
          followUpResult: createDto.followUpResult,
          content: (createDto.content || '').slice(0, 200),
        },
      }
    );

    // 🔔 通知线索负责人：有人跟进了你的线索（跟进人 ≠ 负责人时才通知）
    const ownerId = lead.studentOwner?.toString();
    if (ownerId && ownerId !== userId) {
      try {
        const operator = await this.userModel.findById(userId).select('name').lean();
        const operatorName = (operator as any)?.name || '同事';
        const summary = createDto.content
          ? createDto.content.slice(0, 30) + (createDto.content.length > 30 ? '…' : '')
          : '（无内容）';
        this.notificationHelper.notifyTrainingLeadFollowUpAdded(ownerId, {
          leadId: leadId,
          leadName: lead.name,
          operatorName,
          summary,
        }).catch(e => this.logger.warn(`发送跟进通知失败: ${e?.message}`));
      } catch (e: any) {
        this.logger.warn(`发送跟进通知查询失败: ${e?.message}`);
      }
    }

    return populated as any;
  }

  /**
   * 获取线索的跟进记录列表
   */
  async getFollowUps(leadId: string): Promise<TrainingLeadFollowUp[]> {
    const lead = await this.trainingLeadModel.findById(leadId);
    if (!lead) {
      throw new NotFoundException('培训线索不存在');
    }

    const followUps = await this.followUpModel
      .find({ leadId: new Types.ObjectId(leadId) })
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return followUps as any;
  }

  /**
   * 获取线索统计数据（小程序用）
   * @param userId 如果提供，只统计该用户的线索；否则统计全部
   */
  async getStatisticsForMiniprogram(userId?: string) {
    const match: any = {};
    if (userId) {
      const { Types } = await import('mongoose');
      match.$or = [
        { createdBy: new Types.ObjectId(userId) },
        { assignedTo: new Types.ObjectId(userId) },
        { studentOwner: new Types.ObjectId(userId) },
      ];
    }

    const [total, byStatus, bySource, byTrainingType, recentFollowUps] = await Promise.all([
      this.trainingLeadModel.countDocuments(match),
      this.trainingLeadModel.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.trainingLeadModel.aggregate([
        { $match: match },
        { $group: { _id: '$leadSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      this.trainingLeadModel.aggregate([
        { $match: match },
        { $group: { _id: '$trainingType', count: { $sum: 1 } } },
      ]),
      this.followUpModel.countDocuments(
        userId ? { createdBy: new (require('mongoose').Types.ObjectId)(userId) } : {},
      ),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s: any) => { if (s._id) statusMap[s._id] = s.count; });

    // ----------------------------------------------------------------
    // 与 statFilter=notFollowed / followingUp 使用完全相同的逻辑：
    //   · 非终态 + 有跟进记录  → followingUp（跟进中）
    //   · 非终态 + 无跟进记录  → notFollowedCount（待跟进）
    // 这样保证统计数字与列表筛选结果严格一致。
    // ----------------------------------------------------------------
    const terminalStatuses = [
      LeadStatus.ENROLLED,
      LeadStatus.GRADUATED,
      LeadStatus.VISITED,
      LeadStatus.INVALID,
    ];

    // 1. 取可见范围内的非终态线索 _id 列表
    const nonTerminalIds: any[] = await this.trainingLeadModel.distinct('_id', {
      ...match,
      status: { $nin: terminalStatuses },
    });

    // 2. 在上述 ID 中，找出有跟进记录的
    const idsWithFollowUp: any[] = await this.followUpModel.distinct('leadId', {
      leadId: { $in: nonTerminalIds },
    });

    const followingUpCount = idsWithFollowUp.length;
    const notFollowedCount = nonTerminalIds.length - followingUpCount;

    return {
      total,
      byStatus: statusMap,
      // 由跟进记录表动态计算，与 statFilter=followingUp 列表结果一致
      followingUp: followingUpCount,
      // 由跟进记录表动态计算，与 statFilter=notFollowed 列表结果一致
      notFollowedCount,
      enrolled: statusMap['已报名'] || 0,
      graduated: statusMap['已结业'] || 0,
      newNotFollowedUp: statusMap['新客未跟进'] || 0,
      transferNotFollowedUp: statusMap['流转未跟进'] || 0,
      notFollowedUp: statusMap['未跟进'] || 0,
      notFollowedUp7Days: statusMap['7天未跟进'] || 0,
      notFollowedUp15Days: statusMap['15天未跟进'] || 0,
      invalid: statusMap['无效线索'] || 0,
      bySource: bySource.map((s: any) => ({ source: s._id || '未知', count: s.count })),
      byTrainingType: byTrainingType.map((t: any) => ({ type: t._id || '未知', count: t.count })),
      totalFollowUps: recentFollowUps,
    };
  }

  /**
   * 根据手机号批量查询已存在的线索（用于导入去重）
   */
  async findByPhones(phones: string[]): Promise<TrainingLead[]> {
    if (!phones || phones.length === 0) return [];
    return this.trainingLeadModel
      .find({ phone: { $in: phones } })
      .select('phone name studentId')
      .lean()
      .exec() as any;
  }

  /**
   * 从Excel文件批量导入培训线索
   * @param filePath Excel文件路径
   * @param userId 当前用户ID
   */
  async importFromExcel(filePath: string, userId: string): Promise<{ success: number; fail: number; errors: string[] }> {
    this.logger.log(`开始处理培训线索Excel文件导入: ${filePath}`);

    // 统计结果
    const result = {
      success: 0,
      fail: 0,
      errors: [] as string[]
    };

    try {
      // 使用ExcelJS读取文件
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      // 获取第一个工作表
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new BadRequestException('Excel文件中没有找到工作表');
      }

      // 检查是否有数据
      if (worksheet.rowCount <= 1) {
        throw new BadRequestException('Excel文件中没有数据');
      }

      // 获取表头
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString().trim() || '';
      });

      // 检查必需的列是否存在
      const requiredColumns = ['姓名'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        throw new BadRequestException(`Excel文件缺少必需的列: ${missingColumns.join(', ')}`);
      }

      // 解析每一行数据
      const promises = [];

      // 从第二行开始，跳过表头
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData: Record<string, any> = {};

        // 获取每个单元格的值
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            rowData[header] = cell.value;
          }
        });

        // 检查必填字段（姓名必填，手机号和微信号至少一个）
        if (!rowData['姓名']) {
          result.fail++;
          result.errors.push(`第 ${rowNumber} 行缺少姓名`);
          continue;
        }

        if (!rowData['手机号'] && !rowData['微信号']) {
          result.fail++;
          result.errors.push(`第 ${rowNumber} 行手机号和微信号至少填写一个`);
          continue;
        }

        // 转换数据为DTO格式
        const leadData = this.mapExcelRowToLeadDto(rowData, userId);

        // 创建培训线索(异步)
        promises.push(
          this.create(leadData, userId)
            .then(() => {
              result.success++;
            })
            .catch(error => {
              result.fail++;
              result.errors.push(`第 ${rowNumber} 行导入失败: ${error.message}`);
            })
        );
      }

      // 等待所有创建操作完成
      await Promise.all(promises);

      // 清理临时文件
      fs.unlinkSync(filePath);

      this.logger.log(`培训线索Excel导入完成，成功: ${result.success}, 失败: ${result.fail}`);
      return result;
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      this.logger.error(`培训线索Excel导入过程中发生错误: ${error.message}`);
      throw error;
    }
  }

  /**
   * 将Excel行数据映射到培训线索DTO
   */
  private mapExcelRowToLeadDto(rowData: Record<string, any>, userId: string): CreateTrainingLeadDto {
    // 意向程度映射
    const intentionLevelMap: Record<string, string> = {
      '高': '高',
      '中': '中',
      '低': '低'
    };

    // 创建基本数据
    const dto: any = {
      name: rowData['姓名']?.toString().trim()
    };

    // 手机号（可选）
    if (rowData['手机号']) {
      dto.phone = rowData['手机号']?.toString().trim();
    }

    // 微信号（可选）
    if (rowData['微信号']) {
      dto.wechatId = rowData['微信号']?.toString().trim();
    }

    // 培训类型
    if (rowData['培训类型']) {
      dto.trainingType = rowData['培训类型']?.toString().trim();
    }

    // 意向课程（多选，用逗号或分号分隔）
    if (rowData['意向课程']) {
      const coursesStr = rowData['意向课程']?.toString().trim();
      if (coursesStr) {
        // 支持逗号、分号、顿号分隔
        dto.intendedCourses = coursesStr
          .split(/[,，;；、]/)
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);
      }
    }

    // 意向程度
    if (rowData['意向程度']) {
      dto.intentionLevel = intentionLevelMap[rowData['意向程度']?.toString().trim()] || '中';
    }

    // 线索来源
    if (rowData['线索来源']) {
      dto.leadSource = rowData['线索来源']?.toString().trim();
    }

    // 期望开课时间
    if (rowData['期望开课时间']) {
      try {
        dto.expectedStartDate = new Date(rowData['期望开课时间']);
      } catch (e) {
        // 忽略无效日期
      }
    }

    // 预算金额
    if (rowData['预算金额']) {
      dto.budget = Number(rowData['预算金额']) || 0;
    }

    // 所在地区
    if (rowData['所在地区']) {
      dto.address = rowData['所在地区']?.toString().trim();
    }

    // 是否报征
    if (rowData['是否报征']) {
      const value = rowData['是否报征']?.toString().trim().toLowerCase();
      dto.isReported = value === '是' || value === 'true' || value === '1';
    }

    // 备注信息
    if (rowData['备注']) {
      dto.remarks = rowData['备注']?.toString().trim();
    }

    // 返回转换后的DTO
    return dto as CreateTrainingLeadDto;
  }

  /**
   * 批量创建培训线索（用于AI导入预览后确认）
   * 遇到重复手机号时跳过，不中断整体流程
   */
  async bulkCreateLeads(
    leads: Array<Partial<CreateTrainingLeadDto>>,
    userId: string,
  ): Promise<{ success: number; fail: number; errors: string[]; created: any[] }> {
    const result = { success: 0, fail: 0, errors: [] as string[], created: [] as any[] };

    const VALID_GENDER = ['男', '女', '其他'];
    const VALID_LEAD_SOURCE = ['美团', '抖音', '快手', '小红书', '转介绍', '幼亲舒', 'BOSS', 'BOSS直聘', '其他'];
    const VALID_TRAINING_TYPE = ['月嫂', '育儿嫂', '保姆', '护老', '师资'];
    const VALID_CONSULT_POS = ['育婴师', '母婴护理师', '养老护理员', '住家保姆', '其他'];
    const VALID_INTENTION = ['高', '中', '低'];

    // 标准化 leadSource：去空格、BOSS变体统一为"BOSS直聘"
    const normalizeLeadSource = (s?: string) => {
      if (!s) return s;
      const t = s.replace(/\s+/g, '');
      if (/^BOSS/i.test(t)) return 'BOSS直聘';
      return s.trim();
    };

    for (let i = 0; i < leads.length; i++) {
      const lead = { ...leads[i] };
      try {
        if (!lead.name) {
          result.fail++;
          result.errors.push(`第 ${i + 1} 条：姓名不能为空`);
          continue;
        }
        if (!lead.phone && !lead.wechatId) {
          result.fail++;
          result.errors.push(`第 ${i + 1} 条 [${lead.name}]：手机号和微信号至少填写一个`);
          continue;
        }
        // 清理 enum 字段：空字符串或非法值 → undefined，避免 Mongoose 校验失败
        if (!lead.gender || !VALID_GENDER.includes(lead.gender)) lead.gender = undefined;
        lead.leadSource = normalizeLeadSource(lead.leadSource);
        if (!lead.leadSource || !VALID_LEAD_SOURCE.includes(lead.leadSource)) lead.leadSource = undefined;
        if (!lead.trainingType || !VALID_TRAINING_TYPE.includes(lead.trainingType)) lead.trainingType = undefined;
        if (!lead.consultPosition || !VALID_CONSULT_POS.includes(lead.consultPosition)) lead.consultPosition = undefined;
        if (!lead.intentionLevel || !VALID_INTENTION.includes(lead.intentionLevel)) lead.intentionLevel = undefined;
        // 清理空字符串 phone（unique sparse 索引遇到多个空串会冲突）
        if (!lead.phone) lead.phone = undefined;
        if (!lead.wechatId) lead.wechatId = undefined;

        // 提取跟进字段和人员字段，不传给 create
        const creatorName: string | undefined = (lead as any).creatorName || (lead as any).followUpPerson || undefined;
        const assignedToName: string | undefined = (lead as any).assignedToName || undefined;
        let followUpContent: string | undefined = (lead as any).followUpContent || undefined;
        const followUpType: string | undefined = (lead as any).followUpType || undefined;
        const followUpTime: string | undefined = (lead as any).followUpTime || undefined;

        delete (lead as any).creatorName;
        delete (lead as any).assignedToName;
        delete (lead as any).followUpPerson;
        delete (lead as any).followUpContent;
        delete (lead as any).followUpType;
        delete (lead as any).followUpTime;

        // 按姓名匹配系统账号
        let resolvedCreatorId = userId;
        let resolvedFollowUpUserId = new Types.ObjectId(userId);

        // 录入人 → createdBy（谁录入的这条线索）
        if (creatorName) {
          const matched = await this.userModel.findOne({ name: creatorName.trim(), suspended: { $ne: true } }).select('_id').lean();
          if (matched) {
            resolvedCreatorId = (matched as any)._id.toString();
            this.logger.log(`第 ${i + 1} 条 [${lead.name}]：录入人 "${creatorName}" → createdBy`);
          }
        }

        // 跟进人 → assignedTo + studentOwner（线索归属谁跟进）
        if (assignedToName) {
          const matched = await this.userModel.findOne({ name: assignedToName.trim(), suspended: { $ne: true } }).select('_id').lean();
          if (matched) {
            const matchedId = (matched as any)._id;
            resolvedFollowUpUserId = matchedId;
            (lead as any).assignedTo = matchedId;
            (lead as any).studentOwner = matchedId;
            this.logger.log(`第 ${i + 1} 条 [${lead.name}]：跟进人 "${assignedToName}" → assignedTo + studentOwner`);
          } else {
            this.logger.warn(`第 ${i + 1} 条 [${lead.name}]：跟进人 "${assignedToName}" 未找到系统账号`);
          }
        } else if (creatorName && !assignedToName) {
          // 如果只有录入人没有跟进人，则录入人同时作为跟进人
          resolvedFollowUpUserId = new Types.ObjectId(resolvedCreatorId);
          (lead as any).assignedTo = new Types.ObjectId(resolvedCreatorId);
          (lead as any).studentOwner = new Types.ObjectId(resolvedCreatorId);
        }

        const created = await this.create(lead as CreateTrainingLeadDto, resolvedCreatorId);
        result.success++;
        result.created.push(created);

        this.logger.log(`第 ${i + 1} 条 [${lead.name}]：录入人=${creatorName || '无'} 跟进人=${assignedToName || '无'} 跟进内容长度=${followUpContent?.length || 0}`);

        // 有跟进内容则创建跟进记录
        if (followUpContent && followUpContent.length >= 1) {
          try {
            const VALID_FOLLOW_TYPE = ['电话', '微信', '到店', '其他'];
            const resolvedType = (followUpType && VALID_FOLLOW_TYPE.includes(followUpType)) ? followUpType : '电话';
            let followUpDate = new Date();
            if (followUpTime) {
              // 尝试多种格式解析日期
              let parsed = new Date(followUpTime);
              if (isNaN(parsed.getTime())) {
                // 处理中文日期格式："3月23日" / "2026年3月23日"
                const cnMatch = followUpTime.match(/(\d{4})?年?(\d{1,2})月(\d{1,2})日?/);
                if (cnMatch) {
                  const y = cnMatch[1] ? parseInt(cnMatch[1]) : new Date().getFullYear();
                  const m = parseInt(cnMatch[2]) - 1;
                  const d = parseInt(cnMatch[3]);
                  parsed = new Date(y, m, d);
                }
              }
              if (!isNaN(parsed.getTime())) {
                followUpDate = parsed;
              }
            }
            const followUp = new this.followUpModel({
              leadId: (created as any)._id,
              type: resolvedType,
              content: followUpContent,
              createdBy: resolvedFollowUpUserId,
              // 不覆盖 createdAt，由 Mongoose timestamps 自动设置为当前时间
              // Excel 里的日期（仅有日期无时分）只用于更新 lastFollowUpAt
            });
            await followUp.save();
            // 同步更新线索的最后跟进时间 & 最后活跃时间
            await this.trainingLeadModel.findByIdAndUpdate(
              (created as any)._id,
              { lastFollowUpAt: followUpDate, lastActivityAt: followUpDate }
            );
          } catch (fuErr) {
            this.logger.warn(`第 ${i + 1} 条 [${lead.name}] 跟进记录创建失败: ${fuErr.message}`);
          }
        }
      } catch (error) {
        result.fail++;
        const errMsg = `第 ${i + 1} 条 [${lead.name || ''}]：${error.message}`;
        result.errors.push(errMsg);
        this.logger.warn(`批量创建失败 - ${errMsg}`);
      }
    }

    this.logger.log(`批量创建线索完成，成功: ${result.success}，失败: ${result.fail}`);
    return result;
  }

  /**
   * 生成分享令牌（用于追踪线索归属）
   */
  async createShareToken(userId: string, expiresInHours = 720): Promise<{ token: string; expireAt: string; shareUrl: string; qrCodeUrl: string }> {
    this.logger.log(`生成分享令牌: userId=${userId}`);

    // 验证用户是否存在
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 生成JWT令牌，包含用户ID
    const payload = { uid: userId };
    const expiresIn = `${expiresInHours}h`;
    const token = this.jwtService.sign(payload, { expiresIn });
    const expireAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();

    // 生成分享URL（前端公开表单页面）
    const baseUrl = process.env.FRONTEND_URL || 'https://crm.andejiazheng.com';
    const shareUrl = `${baseUrl}/public/training-lead?token=${token}`;

    // 生成二维码URL（可以使用第三方服务或自己实现）
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

    return {
      token,
      expireAt,
      shareUrl,
      qrCodeUrl
    };
  }

  /**
   * 验证分享令牌并获取用户ID
   */
  async verifyShareToken(token: string): Promise<string> {
    try {
      const payload: any = this.jwtService.verify(token);
      const userId = payload?.uid;
      if (!userId) {
        throw new BadRequestException('无效的分享令牌');
      }
      return userId;
    } catch (e) {
      this.logger.warn(`分享令牌校验失败: ${e?.message}`);
      throw new BadRequestException('分享链接无效或已过期');
    }
  }
}
