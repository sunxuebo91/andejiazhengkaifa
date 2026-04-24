import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, IResume } from './models/resume.entity';
import { ResumeOperationLog } from './models/resume-operation-log.model';
import { CreateResumeDto, CreateResumeV2Dto, OrderStatus } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { Logger } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { Contract, ContractDocument } from '../contracts/models/contract.model';
import { User } from '../users/models/user.entity';

import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UpdateAvailabilityDto, BatchUpdateAvailabilityDto, QueryAvailabilityDto } from './dto/availability.dto';
import { AvailabilityStatus } from './models/availability-period.schema';
import { EmployeeEvaluation } from '../employee-evaluation/models/employee-evaluation.entity';
import { ResumeQueryService } from './resume-query.service';
import { DashubaoService } from '../dashubao/dashubao.service';
import { BackgroundCheck, BackgroundCheckDocument } from '../zmdb/models/background-check.model';
import { QwenAIService } from '../ai/qwen-ai.service';
import { ReferralResume, ReferralResumeDocument } from '../referral/models/referral-resume.model';
import { ContractConsistencyService } from '../contracts/contract-consistency.service';
import { AuntBlacklistService } from '../aunt-blacklist/aunt-blacklist.service';

/** 状态中文 label（推荐冲突提示用） */
const REFERRAL_STATUS_LABEL: Record<string, string> = {
  pending_review:   '待审核',
  approved:         '已通过',
  following_up:     '推荐中',
  contracted:       '已签单',
  onboarded:        '已上户',
  reward_pending:   '返费待审核',
  reward_approved:  '返费待打款',
  reward_paid:      '返费已打款',
};

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);
  private readonly idempotencyCache = new Map<string, any>(); // 简单内存缓存，生产环境应使用Redis
  private readonly rateLimitCache = new Map<string, { count: number; resetTime: number }>(); // 限流缓存

  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<IResume>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
    @InjectModel(ResumeOperationLog.name)
    private readonly resumeOperationLogModel: Model<ResumeOperationLog>,
    private uploadService: UploadService,
    private readonly jwtService: JwtService,
    @InjectModel(EmployeeEvaluation.name)
    private readonly employeeEvaluationModel: Model<EmployeeEvaluation>,
    private readonly resumeQueryService: ResumeQueryService,
    @InjectModel(User.name)
    private readonly userModel: Model<any>,
    private readonly dashubaoService: DashubaoService,
    @InjectModel(BackgroundCheck.name)
    private readonly backgroundCheckModel: Model<BackgroundCheckDocument>,
    private readonly qwenAIService: QwenAIService,
    @InjectModel(ReferralResume.name)
    private readonly referralResumeModel: Model<ReferralResumeDocument>,
    @Inject(forwardRef(() => ContractConsistencyService))
    private readonly consistencyService: ContractConsistencyService,
    private readonly auntBlacklistService: AuntBlacklistService,
  ) {}

  /**
   * 反查黑名单：命中 active 记录则拒绝简历落库/更新。
   * 与 validateReferralUniqueness 并列调用，处于 CRM 录入/编辑入口处。
   */
  private async validateBlacklist(phone?: string, idNumber?: string): Promise<void> {
    if (!phone && !idNumber) return;
    const hit = await this.auntBlacklistService.checkActive({ phone, idCard: idNumber });
    if (!hit) return;
    throw new ConflictException({
      message: `该阿姨已在黑名单中（原因：${hit.reason}），无法录入或更新，如需调整请先由管理员释放`,
      error: 'AUNT_BLACKLISTED',
      blacklistId: String(hit._id),
      reason: hit.reason,
      reasonType: hit.reasonType,
    });
  }

  // 🆕 系统操作人ID（用于系统自动操作）
  private readonly systemOperatorId = new Types.ObjectId('000000000000000000000000');

  /**
   * 🆕 记录简历操作日志
   * @param resumeId 简历ID
   * @param operatorId 操作人ID
   * @param operationType 操作类型
   * @param operationName 操作名称（中文）
   * @param details 操作详情
   */
  async logOperation(
    resumeId: string | Types.ObjectId,
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
      const operatorObjectId = isValidObjectId(operatorId) ? new Types.ObjectId(operatorId) : this.systemOperatorId;

      await this.resumeOperationLogModel.create({
        resumeId: new Types.ObjectId(resumeId.toString()),
        operatorId: operatorObjectId,
        entityType: 'resume',
        entityId: resumeId.toString(),
        operationType,
        operationName,
        details,
        operatedAt: new Date(),
      });
    } catch (error) {
      this.logger.error('audit.resume.write_failed', error, {
        resumeId: resumeId.toString(),
        operationType,
      });
    }
  }

  /**
   * 带文件创建简历
   * ✅ 已重构：调用 coreCreate() 核心逻辑 + 文件处理
   */
  async createWithFiles(
    createResumeDto: CreateResumeDto & { userId: string },
    files: Express.Multer.File[] = [],
    fileTypes: string[] = []
  ) {
    if (!createResumeDto.userId) {
      throw new BadRequestException('用户ID不能为空');
    }

    // 1. 数据规范化
    const normalizedData = this.normalizeData(createResumeDto);

    // 2. 统一去重检查（手机号 + 身份证号）
    await this.validateUniqueness(normalizedData.phone, normalizedData.idNumber);

    // 2b. 反查推荐库（双向去重，保护推荐人权益）
    await this.validateReferralUniqueness(normalizedData.phone, normalizedData.idNumber);

    // 2c. 反查黑名单（命中 active 记录则拒绝）
    await this.validateBlacklist(normalizedData.phone, normalizedData.idNumber);

    // 3. 处理文件上传
    const filesArray = Array.isArray(files) ? files : [];
    const fileUploadErrors: string[] = [];
    const categorizedFiles = await this.processFileUploads(filesArray, fileTypes, fileUploadErrors);

    // 4. 构建简历数据
    // 优先使用前端传来的 leadSource，如果没有则默认为 'sales'
    const resumeData = this.buildResumeData(normalizedData, {
      userId: createResumeDto.userId,
      leadSource: (createResumeDto as any).leadSource || 'sales',
      status: 'pending',
      isDraft: !normalizedData.phone,
    });

    // 处理预上传的个人照片URL（创建模式下已由 /api/ai/swap-uniform 上传）
    if (createResumeDto.preUploadedPhotoUrls) {
      try {
        const preUrls: string[] = JSON.parse(createResumeDto.preUploadedPhotoUrls);
        if (Array.isArray(preUrls) && preUrls.length > 0) {
          categorizedFiles.photoUrls.push(...preUrls);
          this.logger.log(`使用 ${preUrls.length} 个预上传的个人照片URL`);
        }
      } catch {
        this.logger.warn('解析 preUploadedPhotoUrls 失败，忽略该字段');
      }
    }

    // 合并文件信息
    Object.assign(resumeData, {
      idCardFront: categorizedFiles.idCardFront,
      idCardBack: categorizedFiles.idCardBack,
      photoUrls: categorizedFiles.photoUrls,
      certificateUrls: categorizedFiles.certificateUrls,
      medicalReportUrls: categorizedFiles.medicalReportUrls,
      certificates: categorizedFiles.certificates,
      reports: categorizedFiles.reports,
      selfIntroductionVideo: categorizedFiles.selfIntroductionVideo,
      // 新增 4 个照片字段
      confinementMealPhotos: categorizedFiles.confinementMealPhotos,
      cookingPhotos: categorizedFiles.cookingPhotos,
      complementaryFoodPhotos: categorizedFiles.complementaryFoodPhotos,
      positiveReviewPhotos: categorizedFiles.positiveReviewPhotos
    });

    // 处理预上传的自我介绍视频 URL（通过 VideoUpload 组件预先上传）
    if (!categorizedFiles.selfIntroductionVideo && createResumeDto.selfIntroductionVideoUrl) {
      this.logger.debug(`使用预上传的视频URL: ${createResumeDto.selfIntroductionVideoUrl}`);
      resumeData.selfIntroductionVideo = {
        url: createResumeDto.selfIntroductionVideoUrl,
        filename: 'selfIntroductionVideo.mp4',
        mimetype: 'video/mp4'
      };
    }

    // 处理预生成的工装照URL（前端已通过 /api/ai/swap-uniform 生成，无需二次AI处理）
    if (createResumeDto.preGeneratedUniformPhotoUrl) {
      resumeData.uniformPhoto = {
        url: createResumeDto.preGeneratedUniformPhotoUrl,
        filename: 'uniform-photo.jpg',
        mimetype: 'image/jpeg',
      };
      this.logger.log(`使用预生成的工装照: ${createResumeDto.preGeneratedUniformPhotoUrl.substring(0, 60)}...`);
    }

    // 5. 创建并保存
    try {
      const resume = new this.resumeModel(resumeData);
      const savedResume = await resume.save();

      this.logger.log(`✅ createWithFiles 成功: ${savedResume._id}`);

      // 📝 记录操作日志 - 创建简历
      await this.logOperation(
        savedResume._id.toString(),
        createResumeDto.userId,
        'create',
        '创建简历',
        {
          description: `创建简历：${savedResume.name || '未命名'}`,
          after: {
            name: savedResume.name,
            phone: savedResume.phone ? `${savedResume.phone.slice(0, 3)}****${savedResume.phone.slice(-4)}` : undefined,
            jobType: savedResume.jobType,
            leadSource: savedResume.leadSource,
          }
        }
      );

      return {
        success: true,
        data: savedResume,
        message: fileUploadErrors.length > 0
          ? `简历创建成功，但部分文件上传失败: ${fileUploadErrors.join(', ')}`
          : '简历创建成功'
      };
    } catch (error) {
      this.logger.error('保存简历失败:', error);
      throw new BadRequestException(`创建简历失败: ${error.message}`);
    }
  }

  /**
   * 处理文件上传（提取为独立方法）
   */
  private async processFileUploads(
    files: Express.Multer.File[],
    fileTypes: string[],
    errors: string[]
  ): Promise<{
    idCardFront: any;
    idCardBack: any;
    photoUrls: string[];
    certificateUrls: string[];
    medicalReportUrls: string[];
    certificates: any[];
    reports: any[];
    selfIntroductionVideo: any;
    confinementMealPhotos: any[];
    cookingPhotos: any[];
    complementaryFoodPhotos: any[];
    positiveReviewPhotos: any[];
  }> {
    const categorizedFiles = {
      idCardFront: null as any,
      idCardBack: null as any,
      photoUrls: [] as string[],
      certificateUrls: [] as string[],
      medicalReportUrls: [] as string[],
      certificates: [] as any[],
      reports: [] as any[],
      selfIntroductionVideo: null as any,
      confinementMealPhotos: [] as any[],
      cookingPhotos: [] as any[],
      complementaryFoodPhotos: [] as any[],
      positiveReviewPhotos: [] as any[]
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = fileTypes[i] || 'other';

      if (!file) continue;

      try {
        const fileUrl = await this.uploadService.uploadFile(file, { type: fileType });
        if (!fileUrl) continue;

        const fileInfo = {
          url: fileUrl,
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        };

        switch (fileType) {
          case 'idCardFront':
            categorizedFiles.idCardFront = fileInfo;
            break;
          case 'idCardBack':
            categorizedFiles.idCardBack = fileInfo;
            break;
          case 'personalPhoto':
            categorizedFiles.photoUrls.push(fileUrl);
            break;
          case 'certificate':
            categorizedFiles.certificates.push(fileInfo);
            categorizedFiles.certificateUrls.push(fileUrl);
            break;
          case 'medicalReport':
            categorizedFiles.reports.push(fileInfo);
            categorizedFiles.medicalReportUrls.push(fileUrl);
            break;
          case 'selfIntroductionVideo':
            categorizedFiles.selfIntroductionVideo = fileInfo;
            break;
          case 'confinementMealPhoto':
            categorizedFiles.confinementMealPhotos.push(fileInfo);
            break;
          case 'cookingPhoto':
            categorizedFiles.cookingPhotos.push(fileInfo);
            break;
          case 'complementaryFoodPhoto':
            categorizedFiles.complementaryFoodPhotos.push(fileInfo);
            break;
          case 'positiveReviewPhoto':
            categorizedFiles.positiveReviewPhotos.push(fileInfo);
            break;
          default:
            categorizedFiles.photoUrls.push(fileUrl);
            break;
        }
      } catch (error) {
        this.logger.error(`文件上传失败: ${error.message}`);
        errors.push(`文件 ${file.originalname} 上传失败: ${error.message}`);
      }
    }

    return categorizedFiles;
  }

  async findAll(page: number, pageSize: number, keyword?: string, jobType?: string, orderStatus?: string, maxAge?: number, nativePlace?: string, ethnicity?: string, currentUserId?: string, isDraft?: boolean, isAdmin?: boolean, filterLowQuality?: boolean) {
    return this.resumeQueryService.findAll(page, pageSize, keyword, jobType, orderStatus, maxAge, nativePlace, ethnicity, currentUserId, isDraft, isAdmin, filterLowQuality);
  }

  async findOne(id: string, currentUserId?: string, isAdmin?: boolean) {
    return this.resumeQueryService.findOne(id, currentUserId, isAdmin);
  }

  /**
   * 更新简历
   * ✅ 已重构：调用 coreUpdate() 核心逻辑
   */
  async update(id: string, updateResumeDto: UpdateResumeDto, userId?: string) {
    return this.coreUpdate(id, updateResumeDto, { userId });
  }

  async remove(id: string, userId?: string) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    // 📝 记录操作日志 - 删除简历（在删除前记录）
    if (userId) {
      await this.logOperation(
        id,
        userId,
        'delete',
        '删除简历',
        {
          description: `删除简历：${resume.name || '未命名'}`,
          before: {
            name: resume.name,
            phone: resume.phone ? `${resume.phone.slice(0, 3)}****${resume.phone.slice(-4)}` : undefined,
            jobType: resume.jobType,
            status: resume.status,
          }
        }
      );
    }

    // 注意：不再删除关联的 COS 文件，因为文件可能被其他地方引用
    // 如果需要删除 COS 文件，应该单独实现清理逻辑

    await resume.deleteOne();
    return { message: '删除成功' };
  }

  /**
   * 获取可分配的员工列表（管理员/经理用）
   */
  async getAssignableUsers(): Promise<Array<{ _id: string; name: string; username: string; role: string }>> {
    const users = await this.userModel.find({
      active: true,
      role: { $in: ['admin', 'manager', 'employee', 'operator', 'dispatch', 'admissions'] },
    }).select('_id name username role').lean();

    return users.map((u: any) => ({
      _id: u._id.toString(),
      name: u.name,
      username: u.username,
      role: u.role,
    }));
  }

  /**
   * 分配阿姨给指定员工
   */
  async assignResume(resumeId: string, assignedToId: string, operatorId: string): Promise<IResume> {
    const operator = await this.userModel.findById(operatorId).select('role name').lean();
    if (!operator || !['admin', 'manager', 'operator'].includes((operator as any).role)) {
      throw new ForbiddenException('只有管理员、经理或运营可以分配阿姨');
    }

    const resume = await this.resumeModel.findById(resumeId).exec();
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    // 获取原负责人信息
    const oldAssignedTo = (resume as any).assignedTo;
    const oldUser = oldAssignedTo ? await this.userModel.findById(oldAssignedTo).select('name username').lean() : null;

    const targetUser = await this.userModel.findById(assignedToId).select('name username active').lean();
    if (!targetUser) {
      throw new NotFoundException('指定的员工不存在');
    }
    if ((targetUser as any).active === false) {
      throw new ConflictException('指定的员工未激活');
    }

    const updated = await this.resumeModel.findByIdAndUpdate(
      resumeId,
      { assignedTo: new Types.ObjectId(assignedToId), assignedAt: new Date() },
      { new: true },
    ).exec();

    // 📝 记录操作日志 - 分配简历
    await this.logOperation(
      resumeId,
      operatorId,
      'assign',
      '分配阿姨',
      {
        description: `负责人由${(oldUser as any)?.name || '未分配'}变更为${(targetUser as any).name}`,
        before: {
          assignedTo: (oldUser as any)?.name || '未分配',
        },
        after: {
          assignedTo: (targetUser as any).name,
        },
      }
    );

    this.logger.log(`✅ 分配简历 ${resumeId}（${resume.name}）给员工 ${(targetUser as any).name}`);
    return updated;
  }

  /**
   * @deprecated 使用 addFileWithType 代替
   * 此方法已废弃，保留仅为兼容性
   */
  async addFiles(id: string, files: Express.Multer.File[]) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    // 上传新文件到 personalPhoto
    for (const file of files) {
      await this.addFileWithType(id, file, 'personalPhoto');
    }

    // 返回更新后的简历
    return this.resumeModel.findById(new Types.ObjectId(id));
  }

  async addFileWithType(id: string, file: Express.Multer.File, fileType: string) {
    try {
      this.logger.debug(`开始处理文件上传: id=${id}, type=${fileType}, filename=${file.originalname}`);

      // 验证文件类型参数
      const validFileTypes = ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'medicalReport', 'selfIntroductionVideo', 'confinementMealPhoto', 'cookingPhoto', 'complementaryFoodPhoto', 'positiveReviewPhoto', 'workExperiencePhoto'];
      if (!validFileTypes.includes(fileType)) {
        this.logger.error(`无效的文件类型: ${fileType}, 有效类型: ${validFileTypes.join(', ')}`);
        throw new BadRequestException(`无效的文件类型: ${fileType}`);
      }

      // 验证 ID 格式
      if (!Types.ObjectId.isValid(id)) {
        this.logger.error(`无效的简历ID格式: ${id}`);
        throw new BadRequestException('无效的简历ID格式');
      }

      const resumeId = new Types.ObjectId(id);
      const resumeDoc = await this.resumeModel.findById(resumeId);

      if (!resumeDoc) {
        this.logger.error(`简历不存在: id=${id}`);
        throw new NotFoundException('简历不存在');
      }

      // 上传文件，获取完整的COS URL
      this.logger.debug('开始上传文件到存储服务');
      const fileUrl = await this.uploadService.uploadFile(file, { type: fileType });
      this.logger.debug(`文件上传成功: fileUrl=${fileUrl}, fileType=${fileType}`);

      const uploadedFileInfo = {
        url: fileUrl,  // 直接使用返回的完整URL
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };

      // 根据文件类型分类存储
      switch (fileType) {
        case 'idCardFront':
          resumeDoc.idCardFront = uploadedFileInfo;
          this.logger.debug(`更新了idCardFront: ${fileUrl}`);
          break;
        case 'idCardBack':
          resumeDoc.idCardBack = uploadedFileInfo;
          this.logger.debug(`更新了idCardBack: ${fileUrl}`);
          break;
        case 'personalPhoto':
          if (!resumeDoc.photoUrls) resumeDoc.photoUrls = [];
          resumeDoc.photoUrls.push(fileUrl);
          // 同时更新personalPhoto字段（支持多张个人照片）
          if (!resumeDoc.personalPhoto) resumeDoc.personalPhoto = [];
          resumeDoc.personalPhoto.push(uploadedFileInfo);
          this.logger.debug(`添加到个人照片: ${fileUrl}, 总数: ${resumeDoc.photoUrls.length}`);
          break;
        case 'certificate':
          if (!resumeDoc.certificates) resumeDoc.certificates = [];
          resumeDoc.certificates.push(uploadedFileInfo);
          if (!resumeDoc.certificateUrls) resumeDoc.certificateUrls = [];
          resumeDoc.certificateUrls.push(fileUrl);
          this.logger.debug(`添加到证书: ${fileUrl}, 总数: ${resumeDoc.certificates.length}`);
          break;
        case 'medicalReport':
          if (!resumeDoc.reports) resumeDoc.reports = [];
          resumeDoc.reports.push(uploadedFileInfo);
          if (!resumeDoc.medicalReportUrls) resumeDoc.medicalReportUrls = [];
          resumeDoc.medicalReportUrls.push(fileUrl);
          this.logger.debug(`添加到体检报告: ${fileUrl}, 总数: ${resumeDoc.reports.length}`);
          break;
        case 'selfIntroductionVideo':
          resumeDoc.selfIntroductionVideo = uploadedFileInfo;
          this.logger.debug(`设置自我介绍视频: ${fileUrl}`);
          break;
        case 'confinementMealPhoto':
          if (!resumeDoc.confinementMealPhotos) resumeDoc.confinementMealPhotos = [];
          resumeDoc.confinementMealPhotos.push(uploadedFileInfo);
          this.logger.debug(`添加到月子餐照片: ${fileUrl}, 总数: ${resumeDoc.confinementMealPhotos.length}`);
          break;
        case 'cookingPhoto':
          if (!resumeDoc.cookingPhotos) resumeDoc.cookingPhotos = [];
          resumeDoc.cookingPhotos.push(uploadedFileInfo);
          this.logger.debug(`添加到烹饪照片: ${fileUrl}, 总数: ${resumeDoc.cookingPhotos.length}`);
          break;
        case 'complementaryFoodPhoto':
          if (!resumeDoc.complementaryFoodPhotos) resumeDoc.complementaryFoodPhotos = [];
          resumeDoc.complementaryFoodPhotos.push(uploadedFileInfo);
          this.logger.debug(`添加到辅食添加照片: ${fileUrl}, 总数: ${resumeDoc.complementaryFoodPhotos.length}`);
          break;
        case 'positiveReviewPhoto':
          if (!resumeDoc.positiveReviewPhotos) resumeDoc.positiveReviewPhotos = [];
          resumeDoc.positiveReviewPhotos.push(uploadedFileInfo);
          this.logger.debug(`添加到好评展示照片: ${fileUrl}, 总数: ${resumeDoc.positiveReviewPhotos.length}`);
          break;
        case 'workExperiencePhoto':
          // 工作经历照片暂时不存储在简历顶层，由前端在保存时关联到具体的工作经历
          // 这里只返回上传成功的文件信息，前端会将其添加到对应的工作经历中
          this.logger.debug(`工作经历照片上传成功: ${fileUrl}`);
          break;
        default:
          // 移除默认归类，如果到了这里说明验证有问题
          this.logger.error(`文件类型验证失败，未处理的类型: ${fileType}`);
          throw new BadRequestException(`未知的文件类型: ${fileType}`);
      }

      this.logger.debug('保存更新后的简历信息');
      const savedResume = await resumeDoc.save();
      this.logger.debug(`简历更新成功，当前文件统计: photoUrls=${savedResume.photoUrls?.length || 0}, certificates=${savedResume.certificates?.length || 0}, reports=${savedResume.reports?.length || 0}`);


      // 返回包含文件URL的结果
      return {
        resume: savedResume,
        fileUrl: fileUrl,
        fileInfo: uploadedFileInfo
      };
    } catch (error) {
      this.logger.error(`文件上传处理失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 异步触发AI换装：将个人照片头部替换到工装模板上，结果保存到uniformPhoto字段
   * @param resumeId 简历ID
   * @param personalPhotoUrl 已上传的个人照片COS URL
   */
  /**
   * 从环境变量中解析所有可用的工装模板URL列表
   * 支持两种配置方式：
   *   1. UNIFORM_TEMPLATE_URLS=url1,url2,url3  （多模板，推荐）
   *   2. UNIFORM_TEMPLATE_URL=url1             （单模板，向下兼容）
   */
  private getUniformTemplateUrls(): string[] {
    const multi = process.env.UNIFORM_TEMPLATE_URLS;
    if (multi) {
      return multi.split(',').map(u => u.trim()).filter(Boolean);
    }
    const single = process.env.UNIFORM_TEMPLATE_URL;
    return single ? [single.trim()] : [];
  }

  private async triggerUniformPhotoGeneration(resumeId: string, personalPhotoUrl: string): Promise<void> {
    const templateUrls = this.getUniformTemplateUrls();
    if (templateUrls.length === 0) {
      this.logger.warn('未配置任何工装模板URL（UNIFORM_TEMPLATE_URLS 或 UNIFORM_TEMPLATE_URL），跳过AI换装');
      return;
    }

    if (!this.qwenAIService.isUniformSwapConfigured()) {
      this.logger.warn('AI换装服务未配置，跳过AI换装');
      return;
    }

    // 随机选取一个模板，保证每次生成结果不重复
    const templateUrl = templateUrls[Math.floor(Math.random() * templateUrls.length)];
    const templateIndex = templateUrls.indexOf(templateUrl) + 1;
    this.logger.log(`[AI换装] 开始处理: resumeId=${resumeId}，共${templateUrls.length}个模板，本次使用模板${templateIndex}`);

    let imageBuffer: Buffer;

    // 优先使用豆包Seedream（效果更自然），失败则回退到FaceChain（带内存保护）
    if (this.qwenAIService.isSeedreamConfigured()) {
      try {
        this.logger.log(`[AI换装] 使用豆包Seedream模式`);
        imageBuffer = await this.qwenAIService.swapHeadWithSeedream(personalPhotoUrl, templateUrl);
      } catch (seedreamErr) {
        // 内存保护：FaceChain需要加载TensorFlow，内存不足时跳过回退
        const freeMB = Math.round(require('os').freemem() / 1024 / 1024);
        if (freeMB < 200) {
          this.logger.error(`[AI换装] Seedream失败且系统可用内存仅${freeMB}MB，跳过FaceChain回退防止OOM`);
          throw new Error(`AI生成失败，请稍后重试（Seedream: ${seedreamErr.message}）`);
        }
        this.logger.warn(`[AI换装] Seedream失败(${seedreamErr.message})，可用内存${freeMB}MB，回退到FaceChain模式`);
        imageBuffer = await this.fallbackToFaceChain(resumeId, personalPhotoUrl, templateUrl);
      }
    } else {
      imageBuffer = await this.fallbackToFaceChain(resumeId, personalPhotoUrl, templateUrl);
    }

    // 伪造 Multer.File 对象，复用 UploadService 上传到 COS
    const fakeFile = {
      buffer: imageBuffer,
      originalname: `uniform-photo-${Date.now()}.jpg`,
      mimetype: 'image/jpeg',
      size: imageBuffer.length,
      fieldname: 'uniformPhoto',
      encoding: '7bit',
    } as Express.Multer.File;

    const uniformPhotoUrl = await this.uploadService.uploadFile(fakeFile, { type: 'personalPhoto' });

    const uniformFileInfo = {
      url: uniformPhotoUrl,
      filename: fakeFile.originalname,
      mimetype: 'image/jpeg',
      size: imageBuffer.length,
    };

    // 将结果保存到简历 uniformPhoto 字段，同时移除源个人照片
    const resumeDoc = await this.resumeModel.findById(new Types.ObjectId(resumeId)).exec();
    if (resumeDoc) {
      resumeDoc.uniformPhoto = uniformFileInfo as any;

      // 从 personalPhoto 数组中移除用于生成工装照的源照片
      if (Array.isArray(resumeDoc.personalPhoto)) {
        resumeDoc.personalPhoto = resumeDoc.personalPhoto.filter(
          (p: any) => p.url !== personalPhotoUrl
        );
      }
      // 从 photoUrls 数组中同步移除
      if (Array.isArray(resumeDoc.photoUrls)) {
        resumeDoc.photoUrls = resumeDoc.photoUrls.filter(
          (url: string) => url !== personalPhotoUrl
        );
      }

      await resumeDoc.save();
    }

    this.logger.log(`[AI换装] 完成: resumeId=${resumeId}, uniformPhotoUrl=${uniformPhotoUrl}, 已移除源照片`);
  }

  /**
   * 回退到FaceChain模式（LoRA训练 + 生成）
   */
  private async fallbackToFaceChain(resumeId: string, personalPhotoUrl: string, templateUrl: string): Promise<Buffer> {
    let resourceId: string | undefined;
    try {
      const resume = await this.resumeModel.findById(new Types.ObjectId(resumeId)).exec();
      if (resume?.faceTrainingResourceId) {
        resourceId = resume.faceTrainingResourceId;
        this.logger.log(`[AI换装-FaceChain] 已有LoRA resource_id=${resourceId}，跳过训练直接生成`);
      } else {
        const photoUrls: string[] = [];
        if (resume?.personalPhoto && resume.personalPhoto.length > 0) {
          for (const photo of resume.personalPhoto) {
            if ((photo as any)?.url) photoUrls.push((photo as any).url);
          }
        }
        if (!photoUrls.includes(personalPhotoUrl)) {
          photoUrls.unshift(personalPhotoUrl);
        }
        const trainingPhotos = photoUrls.slice(0, 10);

        this.logger.log(`[AI换装-FaceChain] 开始LoRA训练, ${trainingPhotos.length}张照片`);
        resourceId = await this.qwenAIService.trainFaceLoRA(trainingPhotos);

        await this.resumeModel.findByIdAndUpdate(
          new Types.ObjectId(resumeId),
          { faceTrainingResourceId: resourceId },
        ).exec();
        this.logger.log(`[AI换装-FaceChain] LoRA训练完成，resource_id=${resourceId} 已保存`);
      }
    } catch (trainErr) {
      this.logger.warn(`[AI换装-FaceChain] LoRA训练失败(${trainErr.message})，回退到免训练模式`);
      resourceId = undefined;
    }

    return this.qwenAIService.swapHeadToUniform(personalPhotoUrl, templateUrl, resourceId);
  }

  async removeFile(id: string, fileUrlOrId: string) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    this.logger.debug(`开始删除文件: resumeId=${id}, fileUrlOrId=${fileUrlOrId}`);

    // 判断传入的是完整URL还是fileId
    let fileUrl: string;
    let fileId: string | null = null;

    if (fileUrlOrId.startsWith('http://') || fileUrlOrId.startsWith('https://')) {
      // 传入的是完整URL
      fileUrl = fileUrlOrId;
      this.logger.debug(`处理完整URL: ${fileUrl}`);
    } else {
      // 传入的是fileId，构建URL
      fileId = fileUrlOrId;
      fileUrl = `/api/upload/file/${fileId}`;
      this.logger.debug(`根据fileId构建URL: ${fileUrl}`);
    }

    // 从所有URL数组中移除对应的文件URL
    let fileRemoved = false;

    if (resume.photoUrls) {
      const originalLength = resume.photoUrls.length;
      resume.photoUrls = resume.photoUrls.filter(url => url !== fileUrl);
      if (resume.photoUrls.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从photoUrls中移除了文件: ${fileUrl}`);
      }
    }

    if (resume.certificateUrls) {
      const originalLength = resume.certificateUrls.length;
      resume.certificateUrls = resume.certificateUrls.filter(url => url !== fileUrl);
      if (resume.certificateUrls.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从certificateUrls中移除了文件: ${fileUrl}`);
      }
    }

    if (resume.medicalReportUrls) {
      const originalLength = resume.medicalReportUrls.length;
      resume.medicalReportUrls = resume.medicalReportUrls.filter(url => url !== fileUrl);
      if (resume.medicalReportUrls.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从medicalReportUrls中移除了文件: ${fileUrl}`);
      }
    }

    // 从结构化文件信息中移除
    if (resume.personalPhoto && Array.isArray(resume.personalPhoto)) {
      const originalLength = resume.personalPhoto.length;
      resume.personalPhoto = resume.personalPhoto.filter(photo => photo.url !== fileUrl);
      if (resume.personalPhoto.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从personalPhoto数组中移除了文件: ${fileUrl}`);
      }
    }

    if (resume.certificates) {
      const originalLength = resume.certificates.length;
      resume.certificates = resume.certificates.filter(cert => cert.url !== fileUrl);
      if (resume.certificates.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从certificates中移除了文件: ${fileUrl}`);
      }
    }

    if (resume.reports) {
      const originalLength = resume.reports.length;
      resume.reports = resume.reports.filter(report => report.url !== fileUrl);
      if (resume.reports.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从reports中移除了文件: ${fileUrl}`);
      }
    }

    // 从月子餐照片中移除
    if (resume.confinementMealPhotos && Array.isArray(resume.confinementMealPhotos)) {
      const originalLength = resume.confinementMealPhotos.length;
      resume.confinementMealPhotos = resume.confinementMealPhotos.filter(photo => photo.url !== fileUrl);
      if (resume.confinementMealPhotos.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从confinementMealPhotos数组中移除了文件: ${fileUrl}`);
      }
    }

    // 从辅食添加照片中移除
    if (resume.complementaryFoodPhotos && Array.isArray(resume.complementaryFoodPhotos)) {
      const originalLength = resume.complementaryFoodPhotos.length;
      resume.complementaryFoodPhotos = resume.complementaryFoodPhotos.filter(photo => photo.url !== fileUrl);
      if (resume.complementaryFoodPhotos.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从complementaryFoodPhotos数组中移除了文件: ${fileUrl}`);
      }
    }

    // 从好评展示照片中移除
    if (resume.positiveReviewPhotos && Array.isArray(resume.positiveReviewPhotos)) {
      const originalLength = resume.positiveReviewPhotos.length;
      resume.positiveReviewPhotos = resume.positiveReviewPhotos.filter(photo => photo.url !== fileUrl);
      if (resume.positiveReviewPhotos.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从positiveReviewPhotos数组中移除了文件: ${fileUrl}`);
      }
    }

    // 检查身份证照片
    if (resume.idCardFront?.url === fileUrl) {
      resume.idCardFront = undefined;
      fileRemoved = true;
      this.logger.debug(`移除了idCardFront: ${fileUrl}`);
    }

    if (resume.idCardBack?.url === fileUrl) {
      resume.idCardBack = undefined;
      fileRemoved = true;
      this.logger.debug(`移除了idCardBack: ${fileUrl}`);
    }

    // 检查AI工装照
    if (resume.uniformPhoto?.url === fileUrl) {
      resume.uniformPhoto = undefined;
      fileRemoved = true;
      this.logger.debug(`移除了uniformPhoto: ${fileUrl}`);
    }

    // 保存更新后的简历
    await resume.save();

    // 尝试删除物理文件
    try {
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        // 对于完整的COS URL，直接调用uploadService删除
        await this.uploadService.deleteFile(fileUrl);
        this.logger.log(`物理文件删除成功: ${fileUrl}`);
      } else if (fileId) {
        // 对于fileId，也可以尝试删除
        await this.uploadService.deleteFile(fileId);
        this.logger.log(`物理文件删除成功: ${fileId}`);
      }
    } catch (deleteError) {
      this.logger.warn(`物理文件删除失败，但数据库记录已清理: ${deleteError.message}`);
      // 不抛出错误，因为数据库记录已经清理完成
    }

    if (fileRemoved) {
      this.logger.log(`文件删除成功: ${fileUrl}`);
      return { message: '文件删除成功' };
    } else {
      this.logger.warn(`未找到要删除的文件: ${fileUrl}`);
      return { message: '文件未找到，可能已被删除' };
    }
  }

  /**
   * 根据文件URL和类型删除文件（小程序专用）
   */
  async removeFileByUrl(id: string, fileUrl: string, fileType: string) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    this.logger.debug(`开始删除文件: resumeId=${id}, fileType=${fileType}, fileUrl=${fileUrl}`);

    let fileRemoved = false;

    // 根据文件类型进行删除
    switch (fileType) {
      case 'idCardFront':
        if (resume.idCardFront?.url === fileUrl) {
          resume.idCardFront = undefined;
          fileRemoved = true;
          this.logger.debug(`移除了idCardFront: ${fileUrl}`);
        }
        break;

      case 'idCardBack':
        if (resume.idCardBack?.url === fileUrl) {
          resume.idCardBack = undefined;
          fileRemoved = true;
          this.logger.debug(`移除了idCardBack: ${fileUrl}`);
        }
        break;

      case 'personalPhoto':
        // 从photoUrls数组中移除
        if (resume.photoUrls) {
          const originalLength = resume.photoUrls.length;
          resume.photoUrls = resume.photoUrls.filter(url => url !== fileUrl);
          if (resume.photoUrls.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从photoUrls中移除了文件: ${fileUrl}`);
          }
        }
        // 从personalPhoto数组中移除匹配的文件
        if (resume.personalPhoto && Array.isArray(resume.personalPhoto)) {
          const originalLength = resume.personalPhoto.length;
          resume.personalPhoto = resume.personalPhoto.filter(photo => photo.url !== fileUrl);
          if (resume.personalPhoto.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从personalPhoto数组中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'certificate':
        // 从certificates数组中移除
        if (resume.certificates) {
          const originalLength = resume.certificates.length;
          resume.certificates = resume.certificates.filter(cert => cert.url !== fileUrl);
          if (resume.certificates.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从certificates中移除了文件: ${fileUrl}`);
          }
        }
        // 从certificateUrls数组中移除
        if (resume.certificateUrls) {
          const originalLength = resume.certificateUrls.length;
          resume.certificateUrls = resume.certificateUrls.filter(url => url !== fileUrl);
          if (resume.certificateUrls.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从certificateUrls中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'medicalReport':
        // 从reports数组中移除
        if (resume.reports) {
          const originalLength = resume.reports.length;
          resume.reports = resume.reports.filter(report => report.url !== fileUrl);
          if (resume.reports.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从reports中移除了文件: ${fileUrl}`);
          }
        }
        // 从medicalReportUrls数组中移除
        if (resume.medicalReportUrls) {
          const originalLength = resume.medicalReportUrls.length;
          resume.medicalReportUrls = resume.medicalReportUrls.filter(url => url !== fileUrl);
          if (resume.medicalReportUrls.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从medicalReportUrls中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'selfIntroductionVideo':
        // 移除自我介绍视频
        if (resume.selfIntroductionVideo && resume.selfIntroductionVideo.url === fileUrl) {
          resume.selfIntroductionVideo = null;
          fileRemoved = true;
          this.logger.debug(`移除了自我介绍视频: ${fileUrl}`);
        }
        break;

      case 'confinementMealPhoto':
        // 从confinementMealPhotos数组中移除
        if (resume.confinementMealPhotos) {
          const originalLength = resume.confinementMealPhotos.length;
          resume.confinementMealPhotos = resume.confinementMealPhotos.filter(photo => photo.url !== fileUrl);
          if (resume.confinementMealPhotos.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从confinementMealPhotos中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'cookingPhoto':
        // 从cookingPhotos数组中移除
        if (resume.cookingPhotos) {
          const originalLength = resume.cookingPhotos.length;
          resume.cookingPhotos = resume.cookingPhotos.filter(photo => photo.url !== fileUrl);
          if (resume.cookingPhotos.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从cookingPhotos中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'complementaryFoodPhoto':
        // 从complementaryFoodPhotos数组中移除
        if (resume.complementaryFoodPhotos) {
          const originalLength = resume.complementaryFoodPhotos.length;
          resume.complementaryFoodPhotos = resume.complementaryFoodPhotos.filter(photo => photo.url !== fileUrl);
          if (resume.complementaryFoodPhotos.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从complementaryFoodPhotos中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'positiveReviewPhoto':
        // 从positiveReviewPhotos数组中移除
        if (resume.positiveReviewPhotos) {
          const originalLength = resume.positiveReviewPhotos.length;
          resume.positiveReviewPhotos = resume.positiveReviewPhotos.filter(photo => photo.url !== fileUrl);
          if (resume.positiveReviewPhotos.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从positiveReviewPhotos中移除了文件: ${fileUrl}`);
          }
        }
        break;

      default:
        throw new BadRequestException(`不支持的文件类型: ${fileType}`);
    }

    if (!fileRemoved) {
      throw new NotFoundException('未找到要删除的文件');
    }

    // 保存更新后的简历
    await resume.save();

    // 尝试删除物理文件
    try {
      await this.uploadService.deleteFile(fileUrl);
      this.logger.log(`物理文件删除成功: ${fileUrl}`);
    } catch (deleteError) {
      this.logger.warn(`物理文件删除失败，但数据库记录已清理: ${deleteError.message}`);
      // 不抛出错误，因为数据库记录已经清理完成
    }

    this.logger.log(`文件删除成功: ${fileUrl}`);
    return resume;
  }

  /**
   * V2版本创建简历 - 支持幂等性、去重和规范化
   * ✅ 已重构：调用 coreCreate() 核心逻辑
   */
  async createV2(dto: CreateResumeV2Dto, idempotencyKey?: string, userId?: string) {
    // 特殊处理 createOrUpdate 模式（允许更新已存在的手机号）
    if (dto.createOrUpdate) {
      const normalizedPhone = dto.phone?.replace(/\D/g, '');
      const existingResume = await this.resumeModel.findOne({ phone: normalizedPhone });
      if (existingResume) {
        // 更新模式：调用核心更新逻辑
        const updatedResume = await this.coreUpdate(existingResume._id.toString(), dto as any, { userId });
        const result = {
          id: updatedResume._id.toString(),
          createdAt: (updatedResume as any).createdAt,
          action: 'UPDATED'
        };

        // 缓存结果（幂等性）
        if (idempotencyKey) {
          const cacheKey = `idempotency:${idempotencyKey}`;
          this.idempotencyCache.set(cacheKey, result);
          setTimeout(() => this.idempotencyCache.delete(cacheKey), 5 * 60 * 1000);
        }

        return result;
      }
    }

    // 正常创建模式：调用核心创建逻辑
    // 优先使用小程序传来的 leadSource，否则默认为 'other'
    const savedResume = await this.coreCreate(dto, {
      userId,
      leadSource: (dto as any).leadSource || 'other',
      idempotencyKey
    });

    return {
      id: savedResume._id.toString(),
      createdAt: (savedResume as any).createdAt,
      action: 'CREATED'
    };
  }

  // ========================================
  // 🔥 核心业务逻辑层 - 统一简历创建/更新逻辑
  // ========================================

  /**
   * 统一去重检查（手机号 + 身份证号）
   * @param phone 手机号
   * @param idNumber 身份证号
   * @param excludeId 排除的简历ID（更新时排除自身）
   * @throws ConflictException 如果存在重复
   */
  /** 计算两份草稿的字段重合率（0~1） */
  private calcDraftSimilarity(a: any, b: any): number {
    const weighted: Array<{ key: string; weight: number; compare?: (x: any, y: any) => boolean }> = [
      // 强标识字段
      { key: 'phone',           weight: 3 },
      { key: 'idNumber',        weight: 3 },
      { key: 'wechat',          weight: 2 },
      // 基本信息
      { key: 'gender',          weight: 1 },
      { key: 'nativePlace',     weight: 2 },
      { key: 'jobType',         weight: 1 },
      { key: 'education',       weight: 1 },
      { key: 'maritalStatus',   weight: 1 },
      { key: 'ethnicity',       weight: 1 },
      { key: 'zodiac',          weight: 1 },
      { key: 'religion',        weight: 1 },
      { key: 'age',             weight: 2, compare: (x, y) => Math.abs(Number(x) - Number(y)) <= 1 },
      { key: 'birthDate',       weight: 2, compare: (x, y) => String(x).slice(0, 7) === String(y).slice(0, 7) },
      { key: 'height',          weight: 1, compare: (x, y) => Math.abs(Number(x) - Number(y)) <= 2 },
      { key: 'weight',          weight: 1, compare: (x, y) => Math.abs(Number(x) - Number(y)) <= 2 },
      { key: 'experienceYears', weight: 1, compare: (x, y) => Math.abs(Number(x) - Number(y)) <= 1 },
      { key: 'expectedSalary',  weight: 1, compare: (x, y) => Math.abs(Number(x) - Number(y)) <= 500 },
      // 技能数组：Jaccard 相似度 ≥ 0.5 算匹配
      {
        key: 'skills', weight: 2,
        compare: (x: string[], y: string[]) => {
          if (!Array.isArray(x) || !Array.isArray(y) || x.length === 0 || y.length === 0) return false;
          const setA = new Set(x);
          const intersection = y.filter(v => setA.has(v)).length;
          const union = new Set([...x, ...y]).size;
          return union > 0 && intersection / union >= 0.5;
        },
      },
      // 自我介绍文本：字符重合率 ≥ 50% 算匹配
      {
        key: 'selfIntroduction', weight: 2,
        compare: (x: string, y: string) => {
          if (!x || !y) return false;
          const shorter = x.length <= y.length ? x : y;
          const longer  = x.length <= y.length ? y : x;
          const matched = shorter.split('').filter(ch => longer.includes(ch)).length;
          return shorter.length > 0 && matched / shorter.length >= 0.5;
        },
      },
    ];

    let matchWeight = 0;
    let totalWeight = 0;

    for (const { key, weight, compare } of weighted) {
      const av = a[key];
      const bv = b[key];
      const aEmpty = av === undefined || av === null || av === '' || (Array.isArray(av) && av.length === 0);
      const bEmpty = bv === undefined || bv === null || bv === '' || (Array.isArray(bv) && bv.length === 0);
      if (aEmpty || bEmpty) continue; // 任一方没有该字段，跳过
      totalWeight += weight;
      const equal = compare ? compare(av, bv) : av === bv;
      if (equal) matchWeight += weight;
    }

    return totalWeight === 0 ? 0 : matchWeight / totalWeight;
  }

  /** 草稿去重：同名草稿重合率≥80% 则删除较早的那份 */
  private async deduplicateDraft(newData: any): Promise<void> {
    const candidates = await this.resumeModel
      .find({ name: newData.name, isDraft: true })
      .sort({ createdAt: 1 }) // 最旧的排前面
      .limit(10)
      .lean();

    for (const old of candidates) {
      const similarity = this.calcDraftSimilarity(newData, old);
      if (similarity >= 0.8) {
        await this.resumeModel.deleteOne({ _id: old._id });
        this.logger.log('草稿去重：删除重复草稿', {
          deletedId: String(old._id),
          name: newData.name,
          similarity: Math.round(similarity * 100),
        });
      }
    }
  }

  private async validateUniqueness(
    phone?: string,
    idNumber?: string,
    excludeId?: string
  ): Promise<void> {
    // 手机号去重检查
    if (phone) {
      const phoneQuery: any = { phone };
      if (excludeId) {
        phoneQuery._id = { $ne: new Types.ObjectId(excludeId) };
      }
      const existingWithPhone = await this.resumeModel.findOne(phoneQuery);
      if (existingWithPhone) {
        throw new ConflictException({
          message: '该手机号已被使用',
          error: 'DUPLICATE_PHONE',
          existingId: existingWithPhone._id.toString()
        });
      }
    }

    // 身份证号去重检查
    if (idNumber) {
      const idQuery: any = { idNumber };
      if (excludeId) {
        idQuery._id = { $ne: new Types.ObjectId(excludeId) };
      }
      const existingWithIdNumber = await this.resumeModel.findOne(idQuery);
      if (existingWithIdNumber) {
        throw new ConflictException({
          message: '该身份证号已被使用',
          error: 'DUPLICATE_ID_NUMBER',
          existingId: existingWithIdNumber._id.toString()
        });
      }
    }
  }

  /**
   * 反查推荐库去重（双向去重：CRM 录简历时调用，保护推荐人权益）
   * 排除 rejected/invalid/activated/released 四种"已终结"或"已放行"状态。
   * 命中则抛 ConflictException，错误信息带推荐人姓名+状态 label。
   */
  private async validateReferralUniqueness(phone?: string, idNumber?: string): Promise<void> {
    if (!phone && !idNumber) return;

    const excludedStatuses = ['rejected', 'invalid', 'activated', 'released'];
    const or: any[] = [];
    if (phone)    or.push({ phone });
    if (idNumber) or.push({ idCard: idNumber });

    const hit = await this.referralResumeModel
      .findOne({ $or: or, status: { $nin: excludedStatuses } })
      .select('_id phone idCard referrerName status assignedStaffId')
      .lean()
      .exec();

    if (!hit) return;

    const matchField = phone && (hit as any).phone === phone ? 'phone' : 'idCard';
    const errorCode = matchField === 'phone' ? 'DUPLICATE_REFERRAL_PHONE' : 'DUPLICATE_REFERRAL_ID_NUMBER';
    const referrerName = (hit as any).referrerName || '未知推荐人';

    // 解析归属员工姓名
    let assignedStaffName = '未知员工';
    const assignedStaffId = (hit as any).assignedStaffId;
    if (assignedStaffId && Types.ObjectId.isValid(assignedStaffId)) {
      try {
        const staff = await this.userModel
          .findById(assignedStaffId)
          .select('name username')
          .lean()
          .exec();
        if (staff) assignedStaffName = (staff as any).name || (staff as any).username || assignedStaffName;
      } catch { /* ignore, 保底文案 */ }
    }

    throw new ConflictException({
      message: `该阿姨已被${assignedStaffName}的${referrerName}推荐，请联系该同学释放！`,
      error: errorCode,
      referralResumeId: (hit as any)._id?.toString(),
      referrerName,
      assignedStaffName,
      referralStatus: (hit as any).status,
    });
  }

  /**
   * 释放流程专用：从一条 referral_resume 派生一条 resumes 记录。
   * 调用前调用方（ReferralService.releaseToResumeLibrary）应已将该推荐记录状态置为 released，
   * 这样 validateReferralUniqueness 会因排除 released 而放行。
   */
  async createMinimalFromReferral(data: {
    name: string;
    phone?: string;
    idCard?: string;
    jobType: string;
    experience?: string;
    remark?: string;
    referrerName?: string;
    operatorStaffId: string;
  }): Promise<IResume> {
    // 规范化手机号/身份证号
    const normalizedPhone = data.phone ? data.phone.replace(/\D/g, '') : undefined;
    const normalizedIdCard = data.idCard ? data.idCard.trim().toUpperCase() : undefined;

    // 只做 resumes 集合本身的冲突检查；推荐库查重由 releaseToResumeLibrary 之前的状态切换保证
    await this.validateUniqueness(normalizedPhone, normalizedIdCard);

    const noteParts: string[] = [];
    if (data.referrerName) noteParts.push(`推荐人：${data.referrerName}`);
    if (data.experience)   noteParts.push(`经验：${data.experience}`);
    if (data.remark)       noteParts.push(`推荐备注：${data.remark}`);

    const doc: any = {
      userId: Types.ObjectId.isValid(data.operatorStaffId) ? new Types.ObjectId(data.operatorStaffId) : undefined,
      name: data.name,
      jobType: data.jobType,
      leadSource: 'referral-release',
      status: 'pending',
      isDraft: !normalizedPhone,
      remarks: noteParts.join('\n') || undefined,
    };
    if (normalizedPhone)  doc.phone = normalizedPhone;
    if (normalizedIdCard) doc.idNumber = normalizedIdCard;

    try {
      const saved = await new this.resumeModel(doc).save();
      this.logger.log(`✅ 推荐释放创建简历成功: ${saved._id}, 推荐人: ${data.referrerName || '-'}`);
      return saved;
    } catch (error: any) {
      if (error?.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        if (field === 'phone')    throw new ConflictException({ message: '该手机号已被使用', error: 'DUPLICATE_PHONE' });
        if (field === 'idNumber') throw new ConflictException({ message: '该身份证号已被使用', error: 'DUPLICATE_ID_NUMBER' });
        throw new ConflictException({ message: '数据重复', error: 'DUPLICATE_ERROR' });
      }
      throw new BadRequestException(`释放到简历库失败: ${error.message}`);
    }
  }

  /**
   * 统一数据规范化处理
   * @param data 原始输入数据
   * @returns 规范化后的数据
   */
  private normalizeData(data: any): any {
    const normalized = { ...data };

    // 规范化手机号（去除非数字字符）
    if (normalized.phone && typeof normalized.phone === 'string') {
      normalized.phone = normalized.phone.replace(/\D/g, '');
    }

    // 规范化身份证号（去除空格，X转大写）
    if (normalized.idNumber && typeof normalized.idNumber === 'string') {
      normalized.idNumber = normalized.idNumber.trim().toUpperCase();
    }

    // 规范化字符串字段（去除首尾空格，合并连续空格）
    const stringFields = ['name', 'nativePlace', 'selfIntroduction', 'currentAddress', 'hukouAddress', 'wechat'];
    stringFields.forEach(field => {
      if (normalized[field] && typeof normalized[field] === 'string') {
        normalized[field] = normalized[field].trim().replace(/[\u3000\s]+/g, ' ');
      }
    });

    // 确保数组字段
    if (normalized.skills !== undefined && !Array.isArray(normalized.skills)) {
      normalized.skills = [];
    }
    if (normalized.serviceArea !== undefined && !Array.isArray(normalized.serviceArea)) {
      normalized.serviceArea = [];
    }

    // 技能枚举校验和过滤
    if (Array.isArray(normalized.skills)) {
      const validSkills = ['chanhou', 'teshu-yinger', 'yiliaobackground', 'yuying', 'zaojiao', 'fushi', 'ertui', 'waiyu', 'zhongcan', 'xican', 'mianshi', 'jiashi', 'shouyi', 'muying', 'cuiru', 'yuezican', 'yingyang', 'liliao-kangfu', 'shuangtai-huli', 'yanglao-huli'];
      normalized.skills = normalized.skills.filter(skill => validSkills.includes(skill));
    }

    return normalized;
  }

  /**
   * 统一构建简历数据
   * @param data 规范化后的数据
   * @param options 构建选项
   */
  private buildResumeData(
    data: any,
    options: {
      userId?: string;
      leadSource?: string;  // 支持所有有效的 leadSource 值
      status?: string;
      isDraft?: boolean;
    }
  ): any {
    const resumeData: any = {
      ...data,
      status: options.status || 'pending',
      isDraft: options.isDraft ?? false,
    };

    // 设置用户ID
    if (options.userId) {
      resumeData.userId = new Types.ObjectId(options.userId);
    }

    // 设置来源（强制设置，不信任前端传递的值）
    if (options.leadSource) {
      resumeData.leadSource = options.leadSource;
    }

    // 清理空值避免唯一索引问题
    if (!resumeData.idNumber || resumeData.idNumber === '') {
      delete resumeData.idNumber;
    }
    if (!resumeData.phone || resumeData.phone === '') {
      delete resumeData.phone;
    }

    // 将 selfIntroductionVideoUrl 转换为 FileInfo 对象
    if (resumeData.selfIntroductionVideoUrl && !resumeData.selfIntroductionVideo) {
      resumeData.selfIntroductionVideo = {
        url: resumeData.selfIntroductionVideoUrl,
        filename: 'selfIntroductionVideo.mp4',
        mimetype: 'video/mp4',
        size: 0,
      };
    }
    delete resumeData.selfIntroductionVideoUrl;

    return resumeData;
  }

  /**
   * 🔥 核心创建方法 - 所有创建入口的统一逻辑
   * @param data 简历数据
   * @param options 创建选项
   */
  private async coreCreate(
    data: CreateResumeV2Dto,
    options: {
      userId?: string;
      leadSource: string;  // 支持所有有效的 leadSource 值
      idempotencyKey?: string;
    }
  ): Promise<IResume> {
    // 1. 幂等性检查
    if (options.idempotencyKey) {
      const cacheKey = `idempotency:${options.idempotencyKey}`;
      const cached = this.idempotencyCache.get(cacheKey);
      if (cached) {
        this.logger.log(`幂等性命中，返回缓存结果: ${options.idempotencyKey}`);
        return cached;
      }
    }

    // 2. 数据规范化
    const normalizedData = this.normalizeData(data);

    // 3. 统一去重检查
    await this.validateUniqueness(normalizedData.phone, normalizedData.idNumber);

    // 3a. 反查推荐库（双向去重，保护推荐人权益）
    await this.validateReferralUniqueness(normalizedData.phone, normalizedData.idNumber);

    // 3a2. 反查黑名单（命中 active 记录则拒绝）
    await this.validateBlacklist(normalizedData.phone, normalizedData.idNumber);

    // 3b. 草稿去重：无手机号时检查同名草稿字段重合率，≥80% 则删除旧草稿
    if (!normalizedData.phone && normalizedData.name) {
      await this.deduplicateDraft(normalizedData);
    }

    // 4. 构建简历数据
    const resumeData = this.buildResumeData(normalizedData, {
      userId: options.userId,
      leadSource: options.leadSource,
      status: 'pending',
      isDraft: !normalizedData.phone,
    });

    // 5. 创建并保存
    try {
      const resume = new this.resumeModel(resumeData);
      const savedResume = await resume.save();

      // 缓存结果（幂等性）
      if (options.idempotencyKey) {
        const cacheKey = `idempotency:${options.idempotencyKey}`;
        this.idempotencyCache.set(cacheKey, savedResume);
        setTimeout(() => this.idempotencyCache.delete(cacheKey), 5 * 60 * 1000);
      }

      this.logger.log(`✅ 核心创建成功: ${savedResume._id}, 来源: ${options.leadSource}`);
      return savedResume;
    } catch (error) {
      // 处理 MongoDB 唯一索引冲突
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        if (field === 'phone') {
          throw new ConflictException({ message: '该手机号已被使用', error: 'DUPLICATE_PHONE' });
        } else if (field === 'idNumber') {
          throw new ConflictException({ message: '该身份证号已被使用', error: 'DUPLICATE_ID_NUMBER' });
        }
        throw new ConflictException({ message: '数据重复', error: 'DUPLICATE_ERROR' });
      }
      this.logger.error('核心创建失败:', error);
      throw new BadRequestException(`创建简历失败: ${error.message}`);
    }
  }

  /**
   * 🔥 核心更新方法 - 所有更新入口的统一逻辑
   * @param id 简历ID
   * @param data 更新数据
   * @param options 更新选项
   */
  private async coreUpdate(
    id: string,
    data: UpdateResumeDto,
    options: {
      userId?: string;
    } = {}
  ): Promise<IResume> {
    // 0. 获取当前简历信息（用于操作日志对比）
    const currentResume = await this.resumeModel.findById(new Types.ObjectId(id)).lean();
    if (!currentResume) {
      throw new NotFoundException('简历不存在');
    }

    // 1. 数据规范化
    const normalizedData = this.normalizeData(data);

    // 1b. 推荐人录入来源不允许修改（保护推荐记录与返费结算关联）
    if ((currentResume as any).leadSource === 'referral-release' && 'leadSource' in normalizedData) {
      delete normalizedData.leadSource;
    }

    // 2. 统一去重检查（排除自身）
    await this.validateUniqueness(normalizedData.phone, normalizedData.idNumber, id);

    // 2b. 反查推荐库（双向去重，保护推荐人权益）
    await this.validateReferralUniqueness(normalizedData.phone, normalizedData.idNumber);

    // 2c. 反查黑名单（命中 active 记录则拒绝）
    await this.validateBlacklist(normalizedData.phone, normalizedData.idNumber);

    // 3. 构建更新数据
    const updateData: any = { ...normalizedData };

    // 🔥 自动更新草稿状态：如果添加了手机号，自动取消草稿状态
    if (normalizedData.phone) {
      updateData.isDraft = false;
      this.logger.debug(`📋 检测到手机号，自动取消草稿状态`);
    }

    // 设置最后更新人
    if (options.userId) {
      updateData.lastUpdatedBy = new Types.ObjectId(options.userId);
    }

    // 允许更新 leadSource 字段
    if (updateData.leadSource !== undefined) {
      this.logger.debug(`📋 更新 leadSource: ${updateData.leadSource}`);
    }

    // 4. 同步更新文件字段（URL数组 ↔ FileInfo对象）
    this.syncFileFields(updateData);

    // 5. 执行更新
    const resume = await this.resumeModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        updateData,
        { new: true, timestamps: true, runValidators: true }
      )
      .populate('userId', 'username name')
      .populate('lastUpdatedBy', 'username name')
      .exec();

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    // 📝 记录操作日志 - 编辑简历
    if (options.userId) {
      // 构建变更字段对比
      const fieldsToTrack = ['name', 'phone', 'jobType', 'status', 'expectedSalary', 'education', 'skills', 'serviceArea', 'selfIntroduction', 'leadSource'];
      const fieldNameMap: Record<string, string> = {
        name: '姓名', phone: '手机号', jobType: '工作类型', status: '状态', expectedSalary: '期望薪资',
        education: '学历', skills: '技能', serviceArea: '服务区域', selfIntroduction: '自我介绍', leadSource: '来源'
      };
      const changedFields: string[] = [];
      const beforeData: Record<string, any> = {};
      const afterData: Record<string, any> = {};

      for (const field of fieldsToTrack) {
        const currentValue = currentResume[field];
        const newValue = normalizedData[field];
        if (newValue !== undefined && JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
          changedFields.push(field);
          beforeData[field] = currentValue;
          afterData[field] = newValue;
        }
      }

      if (changedFields.length > 0) {
        const changedFieldsInChinese = changedFields.map(field => fieldNameMap[field] || field);
        await this.logOperation(
          id,
          options.userId,
          'update',
          '编辑简历',
          {
            before: beforeData,
            after: afterData,
            description: `修改了: ${changedFieldsInChinese.join('、')}`,
          }
        );
      }
    }

    // 一致性回灌：简历变更 → 该阿姨名下所有"已签约 + 最新"合同
    const beforeSnapshot = {
      name: (currentResume as any).name,
      phone: (currentResume as any).phone,
      idNumber: (currentResume as any).idNumber,
    };
    const afterSnapshot = {
      name: (resume as any).name,
      phone: (resume as any).phone,
      idNumber: (resume as any).idNumber,
    };
    this.consistencyService
      .onResumeUpdated(id, beforeSnapshot, afterSnapshot, options.userId)
      .catch(err => this.logger.error(`resume.update.consistency_sync_failed resumeId=${id}: ${(err as Error)?.message}`));

    this.logger.log(`✅ 核心更新成功: ${id}`);
    return resume;
  }

  /**
   * 同步文件字段（URL数组 ↔ FileInfo对象）
   * 确保 photoUrls/personalPhoto, certificateUrls/certificates 等字段同步
   */
  private syncFileFields(updateData: any): void {
    // 同步 certificateUrls ↔ certificates
    if (updateData.certificateUrls !== undefined) {
      if (Array.isArray(updateData.certificateUrls)) {
        if (updateData.certificateUrls.length === 0) {
          updateData.certificates = [];
        } else {
          updateData.certificates = updateData.certificateUrls.map(url => ({
            url: url,
            filename: url.split('/').pop() || '',
            mimetype: 'image/jpeg',
            size: 0
          }));
        }
      }
    }

    // 同步 medicalReportUrls ↔ reports
    if (updateData.medicalReportUrls !== undefined) {
      if (Array.isArray(updateData.medicalReportUrls)) {
        if (updateData.medicalReportUrls.length === 0) {
          updateData.reports = [];
        } else {
          updateData.reports = updateData.medicalReportUrls.map(url => ({
            url: url,
            filename: url.split('/').pop() || '',
            mimetype: url.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            size: 0
          }));
        }
      }
    }

    // 同步 photoUrls ↔ personalPhoto
    if (updateData.photoUrls !== undefined) {
      if (Array.isArray(updateData.photoUrls)) {
        if (updateData.photoUrls.length === 0) {
          updateData.personalPhoto = [];
        } else {
          updateData.personalPhoto = updateData.photoUrls.map(url => ({
            url: url,
            filename: url.split('/').pop() || '',
            mimetype: 'image/jpeg',
            size: 0
          }));
        }
      }
    }
  }

  // ========================================
  // 以下为兼容保留的方法
  // ========================================

  /**
   * 兼容测试用例的 create 方法
   * ✅ 已重构：调用 coreCreate() 核心逻辑
   */
  async create(createResumeDto: CreateResumeDto) {
    return this.coreCreate(createResumeDto as any, {
      leadSource: 'other',
      userId: (createResumeDto as any).userId
    });
  }

  /**
   * 带文件更新简历
   * ✅ 已重构：调用 coreUpdate() 核心逻辑 + 文件处理
   */
  async updateWithFiles(
    id: string,
    updateResumeDto: UpdateResumeDto,
    files?: Express.Multer.File[],
    fileTypes?: string[],
    userId?: string
  ) {
    // 1. 数据规范化
    const normalizedData = this.normalizeData(updateResumeDto);

    // 1b. 推荐人录入来源不允许修改（保护推荐记录与返费结算关联）
    const existing = await this.resumeModel.findById(new Types.ObjectId(id)).select('leadSource').lean();
    if ((existing as any)?.leadSource === 'referral-release' && 'leadSource' in normalizedData) {
      delete normalizedData.leadSource;
    }

    // 2. 统一去重检查（手机号 + 身份证号，排除自身）
    await this.validateUniqueness(normalizedData.phone, normalizedData.idNumber, id);

    // 2b. 反查推荐库（双向去重，保护推荐人权益）
    await this.validateReferralUniqueness(normalizedData.phone, normalizedData.idNumber);

    // 2c. 反查黑名单（命中 active 记录则拒绝）
    await this.validateBlacklist(normalizedData.phone, normalizedData.idNumber);

    // 3. 检查简历是否存在，并保存原始数据用于日志对比
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }
    // 保存原始简历数据用于操作日志对比（必须在修改前保存）
    const originalResumeData = resume.toObject();

    // 4. 处理文件上传
    const filesArray = Array.isArray(files) ? files : [];
    const fileTypesArray = Array.isArray(fileTypes) ? fileTypes : [];
    const uploadedFiles = await this.processUpdateFileUploads(filesArray, fileTypesArray);

    // 5. 构建更新数据（排除文件相关字段）
    const updateFields = Object.keys(normalizedData)
      .filter(key => normalizedData[key] !== undefined && normalizedData[key] !== null)
      .filter(key => !['idCardFront', 'idCardBack', 'photoUrls', 'certificateUrls', 'medicalReportUrls', 'certificates', 'reports', 'personalPhoto'].includes(key))
      .reduce((obj, key) => {
        obj[key] = normalizedData[key];
        return obj;
      }, {} as Record<string, any>);

    // 允许更新 leadSource 字段
    if ((updateFields as any).leadSource !== undefined) {
      this.logger.debug(`📋 更新 leadSource: ${(updateFields as any).leadSource}`);
    }

    // 🔥 自动更新草稿状态：如果添加了手机号，自动取消草稿状态
    if (normalizedData.phone) {
      (updateFields as any).isDraft = false;
      this.logger.debug(`📋 检测到手机号，自动取消草稿状态`);
    }

    // 同步文件字段
    this.syncFileFields(updateFields);

    // 更新基本字段
    Object.assign(resume, updateFields);

    // 设置最后更新人
    if (userId) {
      resume.lastUpdatedBy = new Types.ObjectId(userId);
    }

    // 6. 合并新上传的文件
    this.mergeUploadedFilesToResume(resume, uploadedFiles);

    // 7. 保存
    const savedResume = await resume.save();

    this.logger.log(`✅ updateWithFiles 成功: ${id}`);

    // 📝 记录操作日志 - 编辑简历（updateWithFiles入口）
    if (userId) {
      // 构建变更字段对比（使用之前保存的 originalResumeData）
      const fieldsToTrack = ['name', 'phone', 'jobType', 'status', 'expectedSalary', 'education', 'skills', 'serviceArea', 'selfIntroduction', 'leadSource'];
      const fieldNameMap: Record<string, string> = {
        name: '姓名', phone: '手机号', jobType: '工作类型', status: '状态', expectedSalary: '期望薪资',
        education: '学历', skills: '技能', serviceArea: '服务区域', selfIntroduction: '自我介绍', leadSource: '来源'
      };
      const changedFields: string[] = [];
      const beforeData: Record<string, any> = {};
      const afterData: Record<string, any> = {};

      for (const field of fieldsToTrack) {
        const newValue = normalizedData[field];
        if (newValue !== undefined && JSON.stringify(originalResumeData[field]) !== JSON.stringify(newValue)) {
          changedFields.push(field);
          beforeData[field] = originalResumeData[field];
          afterData[field] = newValue;
        }
      }

      // 检查文件更新
      const uploadedFileTypes = Object.keys(uploadedFiles);
      if (uploadedFileTypes.length > 0) {
        changedFields.push(...uploadedFileTypes.map(t => `文件(${t})`));
      }

      if (changedFields.length > 0) {
        const changedFieldsInChinese = changedFields.map(field => fieldNameMap[field] || field);
        await this.logOperation(
          id,
          userId,
          'update',
          '编辑简历',
          {
            before: beforeData,
            after: afterData,
            description: `修改了: ${changedFieldsInChinese.join('、')}`,
          }
        );
        this.logger.log(`📝 操作日志已记录: 修改了 ${changedFieldsInChinese.join('、')}`);
      }
    }

    // 一致性回灌：简历变更 → 该阿姨名下所有"已签约 + 最新"合同
    const beforeSnapshotU = {
      name: (originalResumeData as any).name,
      phone: (originalResumeData as any).phone,
      idNumber: (originalResumeData as any).idNumber,
    };
    const afterSnapshotU = {
      name: (savedResume as any).name,
      phone: (savedResume as any).phone,
      idNumber: (savedResume as any).idNumber,
    };
    this.consistencyService
      .onResumeUpdated(id, beforeSnapshotU, afterSnapshotU, userId)
      .catch(err => this.logger.error(`resume.updateWithFiles.consistency_sync_failed resumeId=${id}: ${(err as Error)?.message}`));

    return {
      success: true,
      data: savedResume,
      message: '简历更新成功'
    };
  }

  /**
   * 处理更新时的文件上传
   */
  private async processUpdateFileUploads(
    files: Express.Multer.File[],
    fileTypes: string[]
  ): Promise<Record<string, any[]>> {
    const categorizedFiles: Record<string, any[]> = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = fileTypes[i] || 'personalPhoto';

      const fileUrl = await this.uploadService.uploadFile(file, { type: fileType });

      const fileInfo = {
        url: fileUrl,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };

      if (!categorizedFiles[fileType]) {
        categorizedFiles[fileType] = [];
      }
      categorizedFiles[fileType].push(fileInfo);
    }

    return categorizedFiles;
  }

  /**
   * 合并上传的文件到简历对象
   */
  private mergeUploadedFilesToResume(resume: any, uploadedFiles: Record<string, any[]>): void {
    Object.keys(uploadedFiles).forEach(type => {
      switch (type) {
        case 'personalPhoto':
          if (!resume.personalPhoto) resume.personalPhoto = [];
          resume.personalPhoto.push(...uploadedFiles[type]);
          if (!resume.photoUrls) resume.photoUrls = [];
          resume.photoUrls.push(...uploadedFiles[type].map((f: any) => f.url));
          break;
        case 'idCardFront':
          resume.idCardFront = uploadedFiles[type][0];
          break;
        case 'idCardBack':
          resume.idCardBack = uploadedFiles[type][0];
          break;
        case 'certificate':
          if (!resume.certificates) resume.certificates = [];
          resume.certificates.push(...uploadedFiles[type]);
          if (!resume.certificateUrls) resume.certificateUrls = [];
          resume.certificateUrls.push(...uploadedFiles[type].map((f: any) => f.url));
          break;
        case 'medicalReport':
          if (!resume.reports) resume.reports = [];
          resume.reports.push(...uploadedFiles[type]);
          if (!resume.medicalReportUrls) resume.medicalReportUrls = [];
          resume.medicalReportUrls.push(...uploadedFiles[type].map((f: any) => f.url));
          break;
        case 'selfIntroductionVideo':
          resume.selfIntroductionVideo = uploadedFiles[type][0];
          break;
        default:
          if (!resume.photoUrls) resume.photoUrls = [];
          resume.photoUrls.push(...uploadedFiles[type].map((f: any) => f.url));
          break;
      }
    });
  }

  /**
   * 获取所有简历的筛选选项
   * 包括籍贯和民族列表
   */
  async getFilterOptions() {
    // 获取所有简历记录
    const resumes = await this.resumeModel.find({}, { nativePlace: 1, ethnicity: 1 }).exec();

    // 手动收集不同的籍贯和民族
    const nativePlaceSet = new Set<string>();
    const ethnicitySet = new Set<string>();

    resumes.forEach(resume => {
      if (resume.nativePlace && typeof resume.nativePlace === 'string' && resume.nativePlace.trim() !== '') {
        nativePlaceSet.add(resume.nativePlace.trim());
      }

      if (resume.ethnicity && typeof resume.ethnicity === 'string' && resume.ethnicity.trim() !== '') {
        ethnicitySet.add(resume.ethnicity.trim());
      }
    });

    // 转换为数组并排序
    const nativePlaces = Array.from(nativePlaceSet).sort();
    const ethnicities = Array.from(ethnicitySet).sort();

    return {
      nativePlaces,
      ethnicities
    };
  }

  /**
   * 搜索服务人员
   * 根据手机号或姓名搜索简历库中的服务人员
   */
  async searchWorkers(phone?: string, name?: string, limit: number = 10) {
    try {
      const orConditions = [];
      if (phone) {
        orConditions.push({ phone: { $regex: phone, $options: 'i' } });
      }
      if (name) {
        orConditions.push({ name: { $regex: name, $options: 'i' } });
      }

      if (orConditions.length === 0) {
        return [];
      }

      const query = { $or: orConditions };

      this.logger.log(`搜索服务人员，查询条件: ${JSON.stringify(query)}`);

      const workers = await this.resumeModel
        .find(query)
        .sort({ updatedAt: -1, createdAt: -1 }) // 先排序
        .select('_id name phone idNumber age jobType nativePlace currentAddress')
        .limit(limit)
        .exec();

      this.logger.log(`搜索结果: ${JSON.stringify(workers, null, 2)}`);

      return workers;
    } catch (error) {
      this.logger.error(`搜索服务人员失败: ${error.message}`, error.stack);
      throw new Error('搜索服务人员失败');
    }
  }

  /**
   * 批量修复所有缺失的 updatedAt 字段
   */
  public async batchFixMissingUpdatedAt() {
    return this.resumeQueryService.batchFixMissingUpdatedAt();
  }

  /**
   * 从Excel文件导入简历数据
   * @param filePath Excel文件路径
   * @param userId 当前用户ID
   */
  async importFromExcel(filePath: string, userId: string): Promise<{ success: number; fail: number; errors: string[] }> {
    this.logger.log(`开始处理Excel文件导入: ${filePath}`);

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
      const requiredColumns = ['姓名', '手机号', '工种'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        throw new BadRequestException(`Excel文件缺少必需的列: ${missingColumns.join(', ')}`);
      }

      // 从第二行开始，顺序处理每一行（避免并发导致手机号重复）
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

        // 检查必填字段
        if (!rowData['姓名'] || !rowData['手机号'] || !rowData['工种']) {
          result.fail++;
          result.errors.push(`第 ${rowNumber} 行缺少必填字段`);
          continue;
        }

        // 转换数据为DTO格式
        const resumeData = this.mapExcelRowToResumeDto(rowData, userId);

        // 顺序创建简历（逐行等待，防止同批次相同手机号并发写入）
        try {
          await this.create(resumeData);
          result.success++;
        } catch (error) {
          result.fail++;
          result.errors.push(`第 ${rowNumber} 行导入失败: ${error.message}`);
        }
      }

      // 清理临时文件
      fs.unlinkSync(filePath);

      this.logger.log(`Excel导入完成，成功: ${result.success}, 失败: ${result.fail}`);
      return result;
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      this.logger.error(`Excel导入过程中发生错误: ${error.message}`);
      throw error;
    }
  }

  /**
   * 将Excel行数据映射到简历DTO
   */
  private mapExcelRowToResumeDto(rowData: Record<string, any>, userId: string): CreateResumeDto {
    // 工种映射
    const jobTypeMap: Record<string, string> = {
      '月嫂': 'yuesao',
      '住家育儿嫂': 'zhujia-yuer',
      '白班育儿': 'baiban-yuer',
      '保洁': 'baojie',
      '白班保姆': 'baiban-baomu',
      '住家保姆': 'zhujia-baomu',
      '养宠': 'yangchong',
      '小时工': 'xiaoshi',
      '住家护老': 'zhujia-hulao',
      '家教': 'jiajiao',
      '陪伴师': 'peiban'
    };

    // 性别映射
    const genderMap: Record<string, string> = {
      '男': 'male',
      '女': 'female'
    };

    // 学历映射
    const educationMap: Record<string, string> = {
      '小学': 'primary',
      '初中': 'juniorHigh',
      '高中': 'highSchool',
      '中专': 'technicalSchool',
      '大专': 'associateDegree',
      '本科': 'bachelor',
      '硕士': 'master',
      '博士': 'doctorate'
    };

    // 创建基本数据
    const dto: any = {
      userId,
      name: rowData['姓名']?.toString().trim(),
      phone: rowData['手机号']?.toString().trim(),
      jobType: jobTypeMap[rowData['工种']?.toString().trim()] || rowData['工种']?.toString().trim(),
      status: 'pending'
    };

    // 可选字段
    if (rowData['性别']) {
      dto.gender = genderMap[rowData['性别']?.toString().trim()] || 'female';
    }

    if (rowData['年龄']) {
      dto.age = Number(rowData['年龄']) || 0;
    }

    if (rowData['身份证号']) {
      dto.idNumber = rowData['身份证号']?.toString().trim();
    }

    if (rowData['微信']) {
      dto.wechat = rowData['微信']?.toString().trim();
    }

    if (rowData['工作经验']) {
      dto.experienceYears = Number(rowData['工作经验']) || 0;
    }

    if (rowData['学历']) {
      dto.education = educationMap[rowData['学历']?.toString().trim()] || 'juniorHigh';
    }

    if (rowData['期望薪资']) {
      dto.expectedSalary = Number(rowData['期望薪资']) || 0;
    }

    if (rowData['籍贯']) {
      dto.nativePlace = rowData['籍贯']?.toString().trim();
    }

    if (rowData['民族']) {
      dto.ethnicity = rowData['民族']?.toString().trim();
    }

    if (rowData['接单状态']) {
      const statusMap: Record<string, string> = {
        '想接单': 'accepting',
        '不接单': 'not-accepting',
        '已签约': 'signed',
        '已上户': 'on-service'
      };
      dto.orderStatus = statusMap[rowData['接单状态']?.toString().trim()] || 'accepting';
    }

    // 返回转换后的DTO
    return dto as CreateResumeDto;
  }

  /**
   * 调试方法：直接查询最新的记录
   */
  async debugLatestRecords(limit: number = 10) {
    try {
      this.logger.log(`🔍 直接查询最新的${limit}条记录...`);

      const records = await this.resumeModel
        .find({})
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(limit)
        .select('name updatedAt createdAt')
        .lean()
        .exec();

      this.logger.log(`🔍 查询到${records.length}条记录`);
      return records;
    } catch (error) {
      this.logger.error('❌ 调试查询失败:', error);
      throw error;
    }
  }

  /**
   * 生成分享令牌（仅包含简历ID与有效期）
   */
  public createShareToken(resumeId: string, expiresInHours = 72) {
    if (!resumeId) throw new BadRequestException('简历ID不能为空');
    const payload = { rid: resumeId };
    const expiresIn = `${expiresInHours}h`;
    const token = this.jwtService.sign(payload, { expiresIn });
    const expireAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();
    return { token, expireAt };
  }

  /**
   * 通过分享令牌获取脱敏后的公开简历详情
   */
  public async findSharedByToken(token: string) {
    try {
      const payload: any = this.jwtService.verify(token);
      const rid = payload?.rid;
      if (!rid) throw new BadRequestException('无效的分享令牌');
      const resume = await this.resumeModel.findById(new Types.ObjectId(rid)).lean();
      if (!resume) throw new NotFoundException('分享已失效或简历不存在');
      return this.toMaskedPublicResume(resume as any);
    } catch (e) {
      this.logger.warn(`分享令牌校验失败: ${e?.message}`);
      throw new BadRequestException('分享链接无效或已过期');
    }
  }

  /** 将原始简历转换为公开可见（脱敏）结构 */
  private toMaskedPublicResume(r: any) {
    if (!r) return null;
    const result: any = {
      id: (r._id || r.id)?.toString?.(),
      nameMasked: this.maskName(r.name),
      phoneMasked: this.maskPhone(r.phone),
      gender: r.gender,
      age: r.age,
      jobType: r.jobType,
      education: r.education,
      experienceYears: r.experienceYears,
      expectedSalary: r.expectedSalary,
      nativePlace: r.nativePlace,
      skills: r.skills,
      selfIntroduction: r.selfIntroduction,
      serviceArea: r.serviceArea,
      photoUrls: r.photoUrls,
      // 自我介绍视频（公开可见）
      selfIntroductionVideo: r.selfIntroductionVideo || null,
      selfIntroductionVideoUrl: r.selfIntroductionVideo?.url || null,
      // 工作经历
      workExperiences: r.workExperiences || []
    };

    // 去掉强敏感信息（即使存在也不返回）
    delete result.idNumber;
    delete result.idCardFront;
    delete result.idCardBack;
    delete result.personalPhoto;
    delete result.certificates;
    delete result.reports;
    delete result.certificateUrls;
    delete result.medicalReportUrls;
    delete result.emergencyContactName;
    delete result.emergencyContactPhone;
    delete result.currentAddress;
    delete result.hukouAddress;
    delete result.birthDate;
    return result;
  }

  private maskName(name?: string) {
    if (!name) return '';
    const first = name.charAt(0);
    return `${first}**`;
  }

  private maskPhone(phone?: string) {
    if (!phone) return '';
    const m = String(phone).match(/^(\d{3})(\d{4})(\d{4})$/);
    if (m) return `${m[1]}****${m[3]}`;
    // 通用兜底：仅显示前3后2
    if (phone.length > 5) return `${phone.slice(0,3)}****${phone.slice(-2)}`;
    return '****';
  }
  /**
   * 获取公开脱敏简历列表（无需登录）
   */
  public async findPublicList(page = 1, pageSize = 20, keyword?: string, jobType?: string, nativePlace?: string) {
    try {
      const query: any = {};

      // 关键词搜索（姓名、工种）
      if (keyword) {
        query.$or = [
          { name: { $regex: keyword, $options: 'i' } },
          { jobType: { $regex: keyword, $options: 'i' } }
        ];
      }

      // 工种筛选
      if (jobType) {
        query.jobType = jobType;
      }

      // 籍贯筛选
      if (nativePlace) {
        query.nativePlace = nativePlace;
      }

      const skip = (page - 1) * pageSize;
      const total = await this.resumeModel.countDocuments(query);

      const resumes = await this.resumeModel
        .find(query)
        .select('_id name phone gender age jobType education experienceYears nativePlace skills expectedSalary serviceArea photoUrls selfIntroduction')
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean();

      // 脱敏处理
      const maskedResumes = resumes.map(resume => ({
        id: resume._id.toString(),
        nameMasked: this.maskName(resume.name),
        phoneMasked: this.maskPhone(resume.phone),
        gender: resume.gender,
        age: resume.age,
        jobType: resume.jobType,
        education: resume.education,
        experienceYears: resume.experienceYears,
        nativePlace: resume.nativePlace,
        skills: resume.skills,
        expectedSalary: resume.expectedSalary,
        serviceArea: resume.serviceArea,
        photoUrls: resume.photoUrls,
        selfIntroduction: resume.selfIntroduction
      }));

      return {
        items: maskedResumes,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    } catch (error) {
      this.logger.error(`获取公开简历列表失败: ${error.message}`);
      throw error;
    }
  }

  async updatePersonalPhotos(id: string, photos: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>, userId?: string) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    // 更新个人照片数组，保持传入的顺序
    resume.personalPhoto = photos.map(photo => ({
      url: photo.url,
      filename: photo.filename || '',
      size: photo.size || 0,
      mimetype: photo.mimetype || 'image/jpeg'
    }));

    // 同时更新photoUrls数组以保持兼容性
    resume.photoUrls = photos.map(photo => photo.url);

    // 设置最后更新人
    if (userId) {
      resume.lastUpdatedBy = new Types.ObjectId(userId);
    }

    await resume.save();

    this.logger.log(`个人照片排序更新成功: ${id}, 照片数量: ${photos.length}`);
    return resume;
  }

  /**
   * 根据手机号查找简历
   */
  async findByPhone(phone: string) {
    return this.resumeQueryService.findByPhone(phone);
  }

  /**
   * 根据手机号获取CRM员工的姓名、头像、手机号、在职状态（供安得褓贝小程序使用）
   * 只查询CRM员工（User表），不查阿姨简历
   */
  async getStaffInfoByPhone(phone: string): Promise<{ name: string; avatar: string; phone: string; isActive: boolean } | null> {
    const user = await this.userModel
      .findOne({ phone, active: true })
      .select('name avatar phone isActive')
      .lean()
      .exec();

    if (!user) return null;

    return {
      name: (user as any).name || '',
      avatar: (user as any).avatar || '',
      phone: (user as any).phone || '',
      isActive: (user as any).isActive !== false,
    };
  }

  /**
   * 统计简历总数
   */
  async count(): Promise<number> {
    return await this.resumeModel.countDocuments();
  }

  /**
   * 统计包含自我介绍的简历数量
   */
  async countWithSelfIntroduction(): Promise<number> {
    return await this.resumeModel.countDocuments({
      selfIntroduction: { $exists: true, $nin: [null, ''] }
    });
  }

  /**
   * 统计最近N天创建的简历数量
   */
  async countRecentResumes(days: number): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.resumeModel.countDocuments({
      createdAt: { $gte: startDate }
    });
  }

  /**
   * 根据身份证号查找简历
   */
  async findByIdNumber(idNumber: string): Promise<IResume | null> {
    return this.resumeQueryService.findByIdNumber(idNumber);
  }

  /**
   * 限流检查
   * @param key 限流键（如IP地址、手机号等）
   * @param maxRequests 最大请求次数
   * @param windowSeconds 时间窗口（秒）
   * @returns { allowed: boolean, remaining: number }
   */
  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const cached = this.rateLimitCache.get(key);

    if (!cached || now > cached.resetTime) {
      // 创建新的限流记录
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + windowSeconds * 1000
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (cached.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // 增加计数
    cached.count++;
    this.rateLimitCache.set(key, cached);
    return { allowed: true, remaining: maxRequests - cached.count };
  }

  /**
   * 小程序阿姨自助注册 - 完整业务逻辑（含数据验证、限流、去重、DTO组装）
   * 将原 controller 中的验证与业务规则集中到服务层，controller 只负责提取 IP 并调用本方法。
   */
  async selfRegisterMiniprogram(
    dto: CreateResumeV2Dto,
    requestIp: string,
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      _id: string;
      id: string;
      name: string;
      phone: string;
      status: string;
      leadSource: string;
      createdAt: any;
    };
    error?: string;
    details?: Array<{ field: string; message: string }>;
    status?: number;
  }> {
    this.logger.log(`新建自助注册简历:`);
    this.logger.log(`注册数据: ${JSON.stringify(dto, null, 2)}`);
    this.logger.log(`请求IP: ${requestIp}`);

    // ---------- 数据验证 ----------
    if (!dto.name || dto.name.trim().length < 2 || dto.name.trim().length > 20) {
      return {
        success: false,
        message: '数据验证失败',
        error: 'VALIDATION_ERROR',
        details: [{ field: 'name', message: '姓名必须是2-20个字符' }],
      };
    }

    if (!dto.age || dto.age < 18 || dto.age > 65) {
      return {
        success: false,
        message: '数据验证失败',
        error: 'VALIDATION_ERROR',
        details: [{ field: 'age', message: '年龄必须在18-65之间' }],
      };
    }

    if (!dto.gender || !['male', 'female'].includes(dto.gender)) {
      return {
        success: false,
        message: '数据验证失败',
        error: 'VALIDATION_ERROR',
        details: [{ field: 'gender', message: '性别必须是male或female' }],
      };
    }

    if (!dto.jobType) {
      return {
        success: false,
        message: '数据验证失败',
        error: 'VALIDATION_ERROR',
        details: [{ field: 'jobType', message: '工种不能为空' }],
      };
    }

    // 验证身份证号格式（如果提供）
    if (dto.idNumber) {
      const idRegex =
        /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
      if (!idRegex.test(dto.idNumber)) {
        return {
          success: false,
          message: '数据验证失败',
          error: 'VALIDATION_ERROR',
          details: [{ field: 'idNumber', message: '身份证号格式不正确' }],
        };
      }

      // 检查身份证号是否已存在
      const existingWithIdNumber = await this.findByIdNumber(dto.idNumber);
      if (existingWithIdNumber) {
        return {
          success: false,
          message: '该身份证号已注册',
          error: 'DUPLICATE_ID_NUMBER',
          status: 409,
        };
      }
    }

    // ---------- 限流检查（简单实现，生产环境应使用Redis）----------
    const rateLimitKey = `rate_limit:${requestIp}`;
    const rateLimitResult = await this.checkRateLimit(rateLimitKey, 3, 60); // 每分钟3次
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: '提交过于频繁，请稍后再试',
        error: 'RATE_LIMIT_EXCEEDED',
        status: 429,
      };
    }

    // ---------- 强制设置字段（不信任前端传值）----------
    // 使用 any 类型以允许设置 DTO 中未声明的 status 字段（与原 controller 行为一致）
    const selfRegisterDto: any = {
      ...dto,
      leadSource: 'self-registration', // 固定值，标记为自助注册
      status: 'draft',                 // 固定值
      education: dto.education || 'middle',
      expectedSalary: dto.expectedSalary || 0,
      experienceYears: dto.experienceYears || 0,
      workExperiences: dto.workExperiences || [],
      skills: dto.skills || [],
    };

    try {
      // 调用服务层创建简历（不需要userId）
      const result = await this.createSelfRegister(selfRegisterDto);

      this.logger.log(`自助注册成功:`, {
        resumeId: result._id,
        name: result.name,
        phone: result.phone,
        leadSource: result.leadSource,
        ip: requestIp,
      });

      return {
        success: true,
        message: '简历创建成功',
        data: {
          _id: result._id.toString(),
          id: result._id.toString(),
          name: result.name,
          phone: result.phone,
          status: result.status,
          leadSource: result.leadSource,
          createdAt: (result as any).createdAt,
        },
      };
    } catch (error) {
      this.logger.error(`自助注册失败: ${error.message}`, error.stack);

      // 处理特定错误类型
      if (error instanceof ConflictException) {
        return {
          success: false,
          message: error.message,
          error: 'DUPLICATE_ERROR',
          status: 409,
        };
      }

      if (error instanceof BadRequestException) {
        return {
          success: false,
          message: error.message,
          error: 'VALIDATION_ERROR',
          status: 400,
        };
      }

      return {
        success: false,
        message: '服务器内部错误',
        error: 'INTERNAL_ERROR',
        status: 500,
      };
    }
  }

  /**
   * 阿姨自助注册 - 创建简历（无需JWT认证）
   * ✅ 已重构：调用 coreCreate() 核心逻辑
   */
  async createSelfRegister(dto: CreateResumeV2Dto): Promise<IResume> {
    return this.coreCreate(dto, {
      leadSource: 'self-registration',
      userId: undefined  // 自助注册没有 userId
    });
  }

  /**
   * 将简历文档格式化为小程序友好的响应对象。
   * 供 createForMiniprogram、getForMiniprogram、updateForMiniprogram 三个接口共用，
   * 统一维护字段映射，避免重复的大块内联对象拼装。
   *
   * @param resume 从数据库取出的简历文档（IResume）
   * @returns 包含所有小程序所需字段的普通对象
   */
  public formatResumeForMiniprogram(resume: any): Record<string, any> {
    return {
      id: resume._id || resume.id,
      name: resume.name,
      phone: resume.phone,
      isDraft: resume.isDraft ?? !resume.phone,
      age: resume.age,
      gender: resume.gender,
      jobType: resume.jobType,
      education: resume.education,
      experienceYears: resume.experienceYears,
      nativePlace: resume.nativePlace,
      selfIntroduction: resume.selfIntroduction, // 自我介绍
      internalEvaluation: resume.internalEvaluation, // 内部员工评价
      wechat: resume.wechat,
      currentAddress: resume.currentAddress,
      hukouAddress: resume.hukouAddress,
      birthDate: resume.birthDate,
      skills: resume.skills || [],
      serviceArea: resume.serviceArea || [],
      expectedSalary: resume.expectedSalary,
      maternityNurseLevel: resume.maternityNurseLevel || null, // 月嫂档位
      workExperiences: resume.workExperiences || [],
      // 文件信息 - 完整对象格式（包含 url, filename, size, mimetype）
      idCardFront: resume.idCardFront,
      idCardBack: resume.idCardBack,
      // 如果有工装照，将其插入个人照片数组最前面，确保小程序能显示
      personalPhoto: resume.uniformPhoto?.url
        ? [resume.uniformPhoto, ...(resume.personalPhoto || [])]
        : (resume.personalPhoto || []),
      certificates: resume.certificates || [], // 技能证书图片（FileInfo 对象数组）
      reports: resume.reports || [], // 体检报告（FileInfo 对象数组）
      selfIntroductionVideo: resume.selfIntroductionVideo || null, // 自我介绍视频
      // 新增的 4 个相册字段（FileInfo 对象数组）
      confinementMealPhotos: resume.confinementMealPhotos || [], // 月子餐照片
      cookingPhotos: resume.cookingPhotos || [], // 烹饪照片
      complementaryFoodPhotos: resume.complementaryFoodPhotos || [], // 辅食添加照片
      positiveReviewPhotos: resume.positiveReviewPhotos || [], // 好评展示照片
      uniformPhoto: resume.uniformPhoto || null, // AI生成工装照片
      uniformPhotoUrl: resume.uniformPhoto?.url || null, // 工装照URL（兼容）
      // 兼容旧格式 - 仅 URL 字符串数组
      idCardFrontUrl: resume.idCardFront?.url,
      idCardBackUrl: resume.idCardBack?.url,
      // 如果有工装照，将其URL插入photoUrls最前面
      photoUrls: resume.uniformPhoto?.url
        ? [resume.uniformPhoto.url, ...(resume.photoUrls || [])]
        : (resume.photoUrls || []),
      certificateUrls: resume.certificateUrls || [], // 技能证书图片 URL 数组（兼容旧版）
      medicalReportUrls: resume.medicalReportUrls || [], // 体检报告 URL 数组（兼容旧版）
      selfIntroductionVideoUrl: resume.selfIntroductionVideo?.url || null, // 视频 URL 兼容
      // 新增的 4 个相册字段的 URL 数组（兼容旧版）
      confinementMealPhotoUrls: (resume.confinementMealPhotos || []).map((photo: any) => photo.url).filter(Boolean),
      cookingPhotoUrls: (resume.cookingPhotos || []).map((photo: any) => photo.url).filter(Boolean),
      complementaryFoodPhotoUrls: (resume.complementaryFoodPhotos || []).map((photo: any) => photo.url).filter(Boolean),
      positiveReviewPhotoUrls: (resume.positiveReviewPhotos || []).map((photo: any) => photo.url).filter(Boolean),
      // 时间戳
      createdAt: (resume as any).createdAt || new Date(),
      updatedAt: (resume as any).updatedAt || new Date(),
    };
  }

  /**
   * 获取月嫂档期
   */
  async getAvailability(
    resumeId: string,
    query?: QueryAvailabilityDto
  ) {
    const resume = await this.resumeModel.findById(resumeId);
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    let periods = resume.availabilityCalendar || [];

    // 如果指定了日期范围，进行筛选
    if (query?.startDate && query?.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      periods = periods.filter(p => {
        const date = new Date(p.date);
        return date >= start && date <= end;
      });
    }

    // 如果指定了状态，进行筛选
    if (query?.status) {
      periods = periods.filter(p => p.status === query.status);
    }

    return {
      resumeId: resume._id,
      name: resume.name,
      jobType: resume.jobType,
      availabilityCalendar: periods.map(p => ({
        date: p.date,
        status: p.status,
        contractId: p.contractId,
        remarks: p.remarks
      }))
    };
  }

  /**
   * 更新月嫂档期（按日期范围）
   */
  async updateAvailability(resumeId: string, dto: UpdateAvailabilityDto) {
    const resume = await this.resumeModel.findById(resumeId);
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    // 验证日期范围
    if (start > end) {
      throw new BadRequestException('开始日期不能晚于结束日期');
    }

    // 生成日期范围内的所有日期
    const periods = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      periods.push({
        date: new Date(d),
        status: dto.status,
        contractId: dto.contractId ? new Types.ObjectId(dto.contractId) : undefined,
        remarks: dto.remarks
      });
    }

    // 删除旧的档期（在日期范围内的）
    resume.availabilityCalendar = (resume.availabilityCalendar || []).filter(p => {
      const date = new Date(p.date);
      return date < start || date > end;
    });

    // 添加新的档期
    resume.availabilityCalendar.push(...periods);

    // 按日期排序
    resume.availabilityCalendar.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    await resume.save();

    this.logger.log(`更新档期成功: resumeId=${resumeId}, 更新了${periods.length}天`);

    return {
      updated: periods.length,
      message: `成功更新${periods.length}天的档期`
    };
  }

  /**
   * 批量更新档期（按日期列表）
   */
  async batchUpdateAvailability(resumeId: string, dto: BatchUpdateAvailabilityDto) {
    const resume = await this.resumeModel.findById(resumeId);
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    const periods = dto.dates.map(dateStr => ({
      date: new Date(dateStr),
      status: dto.status,
      contractId: dto.contractId ? new Types.ObjectId(dto.contractId) : undefined,
      remarks: dto.remarks
    }));

    // 删除旧的档期（在日期列表中的）
    const datesToUpdate = new Set(dto.dates.map(d => new Date(d).toISOString().split('T')[0]));
    resume.availabilityCalendar = (resume.availabilityCalendar || []).filter(p => {
      const dateStr = new Date(p.date).toISOString().split('T')[0];
      return !datesToUpdate.has(dateStr);
    });

    // 添加新的档期
    resume.availabilityCalendar.push(...periods);

    // 按日期排序
    resume.availabilityCalendar.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    await resume.save();

    return {
      updated: periods.length,
      message: `成功更新${periods.length}天的档期`
    };
  }

  /**
   * 检查档期是否可用（无冲突）
   */
  async checkAvailability(
    resumeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const resume = await this.resumeModel.findById(resumeId);
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    const periods = resume.availabilityCalendar || [];

    // 检查是否有档期冲突（occupied 状态）
    const hasConflict = periods.some(period => {
      const periodDate = new Date(period.date);
      return (
        period.status === AvailabilityStatus.OCCUPIED &&
        periodDate >= startDate &&
        periodDate <= endDate
      );
    });

    return !hasConflict;
  }

  /**
   * 删除指定日期范围的档期
   */
  async deleteAvailability(resumeId: string, startDate: string, endDate: string) {
    const resume = await this.resumeModel.findById(resumeId);
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const originalLength = resume.availabilityCalendar?.length || 0;

    // 删除指定日期范围内的档期
    resume.availabilityCalendar = (resume.availabilityCalendar || []).filter(p => {
      const date = new Date(p.date);
      return date < start || date > end;
    });

    const deletedCount = originalLength - (resume.availabilityCalendar?.length || 0);

    await resume.save();

    return {
      deleted: deletedCount,
      message: `成功删除${deletedCount}天的档期`
    };
  }

  /**
   * 获取员工评价数据
   */
  async getEmployeeEvaluations(resumeId: string) {
    try {
      // 直接查询 employee_evaluations 集合
      const EmployeeEvaluation = this.resumeModel.db.collection('employee_evaluations');

      const evaluations = await EmployeeEvaluation
        .find({
          employeeId: new Types.ObjectId(resumeId),
          status: 'published'
        })
        .sort({ evaluationDate: -1 })
        .limit(10)
        .toArray();

      return evaluations.map(evaluation => ({
        id: evaluation._id.toString(),
        overallRating: evaluation.overallRating,
        comment: evaluation.comment,
        evaluatorName: evaluation.evaluatorName,
        evaluationDate: evaluation.evaluationDate,
        evaluationType: evaluation.evaluationType,
        tags: evaluation.tags || [],
        strengths: evaluation.strengths,
        improvements: evaluation.improvements
      }));
    } catch (error) {
      this.logger.error(`获取员工评价失败: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 从评价内容中提取标签（4-6个字）
   */
  private extractTagsFromComment(comment: string): string[] {
    if (!comment) return [];

    // 常见的正面评价关键词（4-6个字）
    const positiveKeywords = [
      '形象气质好', '好沟通', '相处愉快', '有亲和力', '做事仔细认真',
      '个人形象好', '干净整洁', '沟通顺畅', '做事认真心', '做饭好吃',
      '月子餐好吃', '个人卫生好', '不计较', '有爱任性', '诚实轻经',
      '和蔼可亲', '对产妇耐心', '活不空实', '对宝宝有爱心', '专业知识丰富',
      '责任心强', '服务态度好', '工作效率高', '技能熟练', '经验丰富',
      '认真负责', '细心周到', '温柔体贴', '勤快麻利', '手脚麻利',
      '喜欢孩子', '形象气质佳', '乐观开朗', '信任度高', '执行力强',
      '产后恢复好', '产专专业', '开朗爱笑', '信性度高', '热心力强',
      '爱快头方', '沟通能力强', '开朗爱笑', '执行力强', '热心助人'
    ];

    const foundTags: string[] = [];

    // 在评价内容中查找匹配的关键词
    for (const keyword of positiveKeywords) {
      if (comment.includes(keyword)) {
        foundTags.push(keyword);
      }
    }

    return foundTags;
  }

  /**
   * 计算推荐理由标签（从客户评价和员工评价中提取）
   */
  async getRecommendationTags(resumeId: string) {
    try {
      const tagCountMap = new Map<string, number>();

      // 1. 从员工评价中提取标签
      const EmployeeEvaluation = this.resumeModel.db.collection('employee_evaluations');
      const employeeEvaluations = await EmployeeEvaluation
        .find({
          employeeId: new Types.ObjectId(resumeId),
          status: 'published'
        })
        .toArray();

      // 统计员工评价中的标签
      for (const evaluation of employeeEvaluations) {
        // 从tags字段获取标签
        if (evaluation.tags && Array.isArray(evaluation.tags)) {
          for (const tag of evaluation.tags) {
            if (tag && tag.length >= 2 && tag.length <= 6) {
              tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
            }
          }
        }

        // 从评价内容中提取标签
        if (evaluation.comment) {
          const extractedTags = this.extractTagsFromComment(evaluation.comment);
          for (const tag of extractedTags) {
            tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
          }
        }
      }

      // 2. 从工作经历中的客户评价提取标签
      const resume = await this.resumeModel.findById(resumeId);
      if (resume && resume.workExperiences && Array.isArray(resume.workExperiences)) {
        for (const workExp of resume.workExperiences) {
          if (workExp.customerReview) {
            const extractedTags = this.extractTagsFromComment(workExp.customerReview);
            for (const tag of extractedTags) {
              tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
            }
          }
        }
      }

      // 3. 转换为数组并按出现次数排序
      const sortedTags = Array.from(tagCountMap.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      return sortedTags;
    } catch (error) {
      this.logger.error(`计算推荐理由标签失败: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 查询简历对应劳动者的保险和背调状态
   * 用于小程序接口：根据简历ID返回是否有效保险和背调记录
   */
  async checkWorkerStatus(
    resumeId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _user?: { userId?: string; role?: string; permissions?: string[] },
  ): Promise<{ hasInsurance: boolean; hasBackgroundCheck: boolean; latestInsurance: any; latestBackgroundCheck: any }> {
    // 1. 查找简历，获取身份证号
    const resume = await this.resumeModel.findById(resumeId).select('idNumber').lean().exec();
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    const idNumber: string | undefined = (resume as any).idNumber;

    if (!idNumber) {
      // 没有身份证号，无法匹配保险/背调
      return { hasInsurance: false, hasBackgroundCheck: false, latestInsurance: null, latestBackgroundCheck: null };
    }

    const normalizedId = idNumber.trim().toUpperCase();

    // 2. 并发查询保险和背调
    const [activePolicies, bgCheck] = await Promise.all([
      this.dashubaoService.getActivePoliciesByIdCard(normalizedId),
      this.backgroundCheckModel
        .findOne({ idNo: normalizedId })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    ]);

    const latestInsurance = activePolicies.length > 0
      ? activePolicies.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      : null;
    const hasInsurance = !!latestInsurance;
    const hasBackgroundCheck = !!bgCheck;

    this.logger.log(
      `[checkWorkerStatus] resumeId=${resumeId}, idNumber=${normalizedId}, ` +
      `hasInsurance=${hasInsurance}, hasBackgroundCheck=${hasBackgroundCheck}`,
    );

    return { hasInsurance, hasBackgroundCheck, latestInsurance, latestBackgroundCheck: bgCheck ?? null };
  }

  /**
   * 直接根据身份证号查询劳动者的保险和背调状态
   * 用于小程序接口：无需先查简历，直接输入身份证号
   */
  async checkWorkerStatusByIdCard(
    idCard: string,
  ): Promise<{ hasInsurance: boolean; hasBackgroundCheck: boolean; latestInsurance: any; latestBackgroundCheck: any }> {
    if (!idCard || !idCard.trim()) {
      return { hasInsurance: false, hasBackgroundCheck: false, latestInsurance: null, latestBackgroundCheck: null };
    }

    const normalizedId = idCard.trim().toUpperCase();

    // 并发查询保险（有效保单）和背调记录
    const [activePolicies, bgCheck] = await Promise.all([
      this.dashubaoService.getActivePoliciesByIdCard(normalizedId),
      this.backgroundCheckModel
        .findOne({ idNo: normalizedId })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    ]);

    const latestInsurance = activePolicies.length > 0
      ? activePolicies.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      : null;
    const hasInsurance = !!latestInsurance;
    const hasBackgroundCheck = !!bgCheck;

    this.logger.log(
      `[checkWorkerStatusByIdCard] idCard=${normalizedId}, ` +
      `hasInsurance=${hasInsurance}, hasBackgroundCheck=${hasBackgroundCheck}`,
    );

    return { hasInsurance, hasBackgroundCheck, latestInsurance, latestBackgroundCheck: bgCheck ?? null };
  }

  /**
   * 校验手机号是否属于 CRM 员工（用于无Token接口鉴权）
   */
  async checkStaffByPhone(phone: string): Promise<boolean> {
    try {
      const user = await this.userModel.findOne({ phone, active: true }).select('_id').lean().exec();
      return !!user;
    } catch {
      return false;
    }
  }

  /**
   * 根据简历ID调用千问AI生成约50字推荐文案
   */
  async generateResumeRecommendation(resumeId: string): Promise<string> {
    const resume = await this.resumeModel.findById(new Types.ObjectId(resumeId)).lean().exec();
    if (!resume) {
      throw new NotFoundException(`简历 ${resumeId} 不存在`);
    }

    // DB-first：有缓存直接返回
    if (resume.recommendationReason) {
      return resume.recommendationReason;
    }

    // 否则调 AI 生成，并写回 DB
    const recommendation = await this.qwenAIService.generateRecommendation({
      name: resume.name,
      jobType: resume.jobType,
      skills: resume.skills as string[],
      experienceYears: resume.experienceYears,
      workExperiences: (resume.workExperiences || []) as Array<{ description?: string; jobType?: string }>,
    });

    await this.resumeModel.updateOne(
      { _id: new Types.ObjectId(resumeId) },
      { $set: { recommendationReason: recommendation } },
    ).exec();

    return recommendation;
  }

  /**
   * 获取简历操作日志（仅管理员可用）
   */
  async getOperationLogs(resumeId: string): Promise<any[]> {
    this.logger.log(`获取简历操作日志: resumeId=${resumeId}`);

    const logs = await this.resumeOperationLogModel
      .find({ resumeId: new Types.ObjectId(resumeId) })
      .populate('operatorId', 'name username')
      .sort({ operatedAt: -1 })
      .lean()
      .exec();

    return logs.map(log => ({
      ...log,
      operator: log.operatorId,
    }));
  }

  /**
   * 查询 resumes 集合中 phone 或 idCard 是否已存在
   * 被 referralService.checkDuplicate 调用（内部方法，不对外暴露接口）
   * @returns { exists: boolean; matchField: 'phone' | 'idCard' | null }
   */
  async checkExistsByPhoneOrIdCard(phone?: string, idCard?: string): Promise<{ exists: boolean; matchField: 'phone' | 'idCard' | null }> {
    if (!phone && !idCard) {
      return { exists: false, matchField: null };
    }

    if (phone) {
      const byPhone = await this.resumeModel.findOne({ phone }).select('_id').lean().exec();
      if (byPhone) {
        return { exists: true, matchField: 'phone' };
      }
    }

    if (idCard) {
      const byIdCard = await this.resumeModel.findOne({ idNumber: idCard }).select('_id').lean().exec();
      if (byIdCard) {
        return { exists: true, matchField: 'idCard' };
      }
    }

    return { exists: false, matchField: null };
  }

  /**
   * 标记简历"推荐激活"：简历已存在时，不新建记录，仅在原简历上打激活标记。
   * 员工可在简历列表看到"已被推荐"标签，提示有推荐人关注该阿姨。
   */
  async markAsReferralActivated(resumeId: string, referrerName: string): Promise<void> {
    await this.resumeModel.findByIdAndUpdate(resumeId, {
      referralActivated: true,
      referralActivatedAt: new Date(),
      referralActivatedByName: referrerName,
    }).exec();
  }

  // ============================================================
  // 推荐来源简历：自动入库 + 隐藏控制
  // ============================================================

  /**
   * 将推荐简历审核通过后自动入库（resumeService 内部调用）
   * - 先做去重：phone / idNumber 任意命中已有简历，直接返回已有简历ID
   * - 不重复时，创建新的 isDraft=true 简历，isHidden=true，只有归属员工/管理员可见
   * @returns { resumeId: string; isDuplicate: boolean; existingResumeId?: string }
   */
  async createFromReferral(params: {
    referralResumeId: string;
    assignedStaffId: string;    // referral_resumes.assignedStaffId（归属员工，控制可见性）
    name: string;
    phone?: string;
    idCard?: string;
    serviceType: string;
    experience?: string;
    remark?: string;
    operatorId?: string;
  }): Promise<{ resumeId: string; isDuplicate: boolean }> {
    const { referralResumeId, assignedStaffId, name, phone, idCard, serviceType, experience, remark, operatorId } = params;

    // 1. 去重检查
    const dupCheck = await this.checkExistsByPhoneOrIdCard(phone, idCard);
    if (dupCheck.exists) {
      // 已有同手机号/身份证的简历，直接关联，不重复创建
      const existing = phone
        ? await this.resumeModel.findOne({ phone }).select('_id').lean().exec()
        : await this.resumeModel.findOne({ idNumber: idCard }).select('_id').lean().exec();
      const existingId = (existing as any)?._id?.toString();
      return { resumeId: existingId, isDuplicate: true };
    }

    // 2. serviceType → jobType 映射
    //    新格式：serviceType 已是英文 key（与 JobType 枚举一致），直接透传
    //    历史格式：中文字符串（云DB同步旧数据），走旧映射兜底
    const validJobTypeKeys = new Set([
      'yuesao', 'zhujia-yuer', 'baiban-yuer', 'baojie', 'baiban-baomu',
      'zhujia-baomu', 'yangchong', 'xiaoshi', 'zhujia-hulao', 'jiajiao', 'peiban',
    ]);
    const legacyJobTypeMap: Record<string, string> = {
      '月嫂':   'yuesao',
      '育婴嫂': 'zhujia-yuer',
      '保姆':   'zhujia-baomu',
      '护老':   'zhujia-hulao',
      '小时工': 'xiaoshi',
    };
    const jobType = validJobTypeKeys.has(serviceType)
      ? serviceType
      : (legacyJobTypeMap[serviceType] || 'zhujia-baomu');

    // 3. 创建草稿简历（缺少的字段用合理默认值，员工后续补全）
    const resume = await this.resumeModel.create({
      name,
      phone: phone || undefined,
      idNumber: idCard || undefined,
      jobType,
      gender: 'female',        // 家政从业者多为女性，默认值，员工可修改
      age: 0,                  // 待员工补全
      education: 'junior',     // 默认初中，员工可修改
      expectedSalary: 0,       // 待员工补全
      nativePlace: '',
      experienceYears: 0,
      skills: [],
      selfIntroduction: experience || '',
      remarks: remark || '',
      leadSource: 'referral',
      status: 'pending',
      isDraft: true,           // 草稿状态，需员工补全基本信息
      // 推荐来源字段
      fromReferral: true,
      linkedReferralResumeId: referralResumeId,
      referralAssignedStaffId: assignedStaffId,
      isHidden: true,          // 默认隐藏，只有归属员工和管理员可见
    });

    // 4. 写操作日志
    await this.logOperation(
      (resume as any)._id.toString(),
      operatorId || assignedStaffId,
      'create_from_referral',
      '推荐入库（自动创建）',
      { description: `推荐简历审核通过，自动入库，来源推荐记录ID: ${referralResumeId}` },
    );

    return { resumeId: (resume as any)._id.toString(), isDuplicate: false };
  }

  /**
   * 切换简历隐藏状态（管理员或归属员工可操作）
   * true→隐藏，false→取消隐藏
   */
  async toggleHidden(resumeId: string, currentUserId: string, isAdmin: boolean): Promise<{ isHidden: boolean }> {
    if (!Types.ObjectId.isValid(resumeId)) {
      throw new BadRequestException('无效的简历ID');
    }
    const resume = await this.resumeModel.findById(resumeId).lean().exec();
    if (!resume) throw new NotFoundException('简历不存在');

    const r = resume as any;
    // 只有管理员或归属员工可操作
    if (!isAdmin && r.referralAssignedStaffId !== currentUserId) {
      throw new ForbiddenException('您没有权限操作该简历的可见性');
    }

    const newHidden = !r.isHidden;
    await this.resumeModel.findByIdAndUpdate(resumeId, { isHidden: newHidden }).exec();

    await this.logOperation(
      resumeId,
      currentUserId,
      newHidden ? 'hide' : 'unhide',
      newHidden ? '隐藏简历' : '取消隐藏简历',
      { description: `简历可见性变更为: ${newHidden ? '仅归属员工可见' : '全员可见'}` },
    );

    return { isHidden: newHidden };
  }

}
