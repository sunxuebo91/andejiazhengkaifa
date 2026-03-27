import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { TrainingLead, TrainingLeadDocument, LeadStatus } from './models/training-lead.model';
import { TrainingLeadFollowUp, TrainingLeadFollowUpDocument } from './models/training-lead-follow-up.model';
import { CreateTrainingLeadDto } from './dto/create-training-lead.dto';
import { UpdateTrainingLeadDto } from './dto/update-training-lead.dto';
import { TrainingLeadQueryDto } from './dto/training-lead-query.dto';
import { CreateTrainingLeadFollowUpDto } from './dto/create-training-lead-follow-up.dto';
import { User } from '../users/models/user.entity';

@Injectable()
export class TrainingLeadsService {
  private readonly logger = new Logger(TrainingLeadsService.name);

  constructor(
    @InjectModel(TrainingLead.name) private trainingLeadModel: Model<TrainingLeadDocument>,
    @InjectModel(TrainingLeadFollowUp.name) private followUpModel: Model<TrainingLeadFollowUpDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

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
      status: LeadStatus.NEW
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
    return saved;
  }

  /**
   * 计算线索的跟进状态
   * @param lead 线索对象
   * @param followUps 跟进记录列表
   * @returns 跟进状态标签：'新客未跟进' | '流转未跟进' | null
   */
  private calculateFollowUpStatus(lead: any, followUps: any[]): string | null {
    // 如果没有任何跟进记录，显示"新客未跟进"
    if (!followUps || followUps.length === 0) {
      return '新客未跟进';
    }

    // 如果有学员归属，检查当前归属人是否做过跟进
    if (lead.studentOwner) {
      const studentOwnerId = typeof lead.studentOwner === 'object'
        ? lead.studentOwner._id?.toString()
        : lead.studentOwner.toString();

      // 检查是否有当前归属人创建的跟进记录
      const hasOwnerFollowUp = followUps.some(followUp => {
        const createdById = typeof followUp.createdBy === 'object'
          ? followUp.createdBy._id?.toString()
          : followUp.createdBy.toString();
        return createdById === studentOwnerId;
      });

      // 如果当前归属人没有做过跟进，显示"流转未跟进"
      if (!hasOwnerFollowUp) {
        return '流转未跟进';
      }
    }

    return null;
  }

  /**
   * 查询培训线索列表
   */
  async findAll(query: TrainingLeadQueryDto): Promise<any> {
    const { page = 1, pageSize = 10, search, status, leadSource, trainingType, startDate, endDate, assignedTo, createdBy, isReported, studentOwner } = query;

    const filter: any = {};
    const andConditions: any[] = [];

    // 按创建人过滤（用于普通员工只看自己的线索）
    if (createdBy) {
      andConditions.push({
        $or: [
          { createdBy: new Types.ObjectId(createdBy) },
          { createdBy: createdBy }
        ]
      });
    }

    // 搜索条件
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { wechatId: { $regex: search, $options: 'i' } },
          { studentId: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // 合并 $and 条件
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // 筛选条件
    if (status) filter.status = status;
    if (leadSource) filter.leadSource = leadSource;
    if (trainingType) filter.trainingType = trainingType;
    if (assignedTo) filter.assignedTo = new Types.ObjectId(assignedTo);
    if (isReported !== undefined) filter.isReported = isReported;
    if (studentOwner) filter.studentOwner = new Types.ObjectId(studentOwner);

    // 日期范围
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.trainingLeadModel
        .find(filter)
        .populate('createdBy', 'name username')
        .populate('assignedTo', 'name username')
        .populate('referredBy', 'name username')
        .populate('studentOwner', 'name username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
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

        // 计算跟进状态
        const followUpStatus = this.calculateFollowUpStatus(lead, followUps);

        return {
          ...lead,
          followUpStatus
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

    // 计算跟进状态
    const followUpStatus = this.calculateFollowUpStatus(lead, followUps);

    return {
      ...lead,
      followUps,
      followUpStatus
    };
  }

  /**
   * 更新培训线索
   */
  async update(id: string, updateDto: UpdateTrainingLeadDto): Promise<TrainingLead> {
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

    // 处理日期字段
    const updateData: any = { ...updateDto };
    if (updateDto.expectedStartDate) {
      updateData.expectedStartDate = new Date(updateDto.expectedStartDate);
    }

    // 处理学员归属
    if (updateDto.studentOwner) {
      updateData.studentOwner = new Types.ObjectId(updateDto.studentOwner);
    }

    Object.assign(lead, updateData);
    const updated = await lead.save();

    this.logger.log(`培训线索更新成功: ${updated.studentId}`);
    return updated;
  }

  /**
   * 删除培训线索
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`删除培训线索: ${id}`);

    const lead = await this.trainingLeadModel.findById(id);
    if (!lead) {
      throw new NotFoundException('培训线索不存在');
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

    // 更新线索的最后跟进时间
    lead.lastFollowUpAt = new Date();

    // 如果线索状态是"新线索"，自动改为"跟进中"
    if (lead.status === LeadStatus.NEW) {
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

        // 提取跟进字段，不传给 create
        const followUpPerson: string | undefined = (lead as any).followUpPerson || undefined;
        let followUpContent: string | undefined = (lead as any).followUpContent || undefined;
        const followUpType: string | undefined = (lead as any).followUpType || undefined;
        const followUpTime: string | undefined = (lead as any).followUpTime || undefined;

        // AI 常见 mapping 错误：把"跟进记录"列放进了 remarks 而非 followUpContent
        // 修正策略：有跟进人 + 跟进内容为空 + 备注有内容 → 把备注内容作为跟进内容
        if (followUpPerson && !followUpContent && (lead as any).remarks) {
          followUpContent = (lead as any).remarks;
          delete (lead as any).remarks; // 避免同时写入备注和跟进记录
          this.logger.log(`第 ${i + 1} 条 [${lead.name}]：检测到AI将跟进记录放入remarks，已自动修正到followUpContent`);
        }
        delete (lead as any).followUpPerson;
        delete (lead as any).followUpContent;
        delete (lead as any).followUpType;
        delete (lead as any).followUpTime;

        // 按姓名匹配系统账号：跟进人/创建人/发起人/录入人 → 若匹配成功，用该用户作为线索创建人和归属人
        let resolvedCreatorId = userId;
        let resolvedFollowUpUserId = new Types.ObjectId(userId);
        if (followUpPerson) {
          const trimmedName = followUpPerson.trim();
          const matchedUser = await this.userModel.findOne({ name: trimmedName, suspended: { $ne: true } }).select('_id').lean();
          if (matchedUser) {
            const matchedId = (matchedUser as any)._id;
            resolvedCreatorId = matchedId.toString();
            resolvedFollowUpUserId = matchedId;
            // 同时设为学员归属（归属人）
            (lead as any).studentOwner = matchedId.toString();
            this.logger.log(`第 ${i + 1} 条 [${lead.name}]：识别到人员 "${trimmedName}"，创建人和归属人设为该用户`);
          } else {
            this.logger.warn(`第 ${i + 1} 条 [${lead.name}]：人员 "${trimmedName}" 未找到对应系统账号，使用导入人`);
          }
        }

        const created = await this.create(lead as CreateTrainingLeadDto, resolvedCreatorId);
        result.success++;
        result.created.push(created);

        this.logger.log(`第 ${i + 1} 条 [${lead.name}]：followUpPerson=${followUpPerson || '无'} followUpContent长度=${followUpContent?.length || 0}`);

        // 有跟进内容则创建跟进记录
        if (followUpContent && followUpContent.length >= 1) {
          try {
            const VALID_FOLLOW_TYPE = ['电话', '微信', '到店', '其他'];
            const resolvedType = (followUpType && VALID_FOLLOW_TYPE.includes(followUpType)) ? followUpType : '电话';
            const followUpDate = followUpTime ? new Date(followUpTime) : new Date();
            const followUp = new this.followUpModel({
              leadId: (created as any)._id,
              type: resolvedType,
              content: followUpContent,
              createdBy: resolvedFollowUpUserId,
              ...(followUpTime ? { nextFollowUpDate: undefined, createdAt: followUpDate } : {}),
            });
            await followUp.save();
            // 同步更新线索的最后跟进时间
            await this.trainingLeadModel.findByIdAndUpdate(
              (created as any)._id,
              { lastFollowUpAt: followUpDate }
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
