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
import { TrainingLead, TrainingLeadDocument, LeadLevel, LeadStatus } from './models/training-lead.model';
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
   * 生成线索编号
   */
  private generateLeadId(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TL${timestamp}${random}`;
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

    // 生成线索编号
    const leadId = this.generateLeadId();

    // 处理日期字段
    const leadData: any = {
      ...createDto,
      leadId,
      createdBy: new Types.ObjectId(userId),
    };

    // 如果提供了归属用户ID，设置referredBy字段
    if (referredByUserId) {
      leadData.referredBy = new Types.ObjectId(referredByUserId);
    }

    if (createDto.expectedStartDate) {
      leadData.expectedStartDate = new Date(createDto.expectedStartDate);
    }

    // 如果客户分级是"0-成交"，自动设置状态为"已成交"
    if (createDto.leadLevel === LeadLevel.CLOSED) {
      leadData.status = LeadStatus.CLOSED;
    } else {
      leadData.status = LeadStatus.NEW;
    }

    const lead = new this.trainingLeadModel(leadData);
    const saved = await lead.save();

    this.logger.log(`培训线索创建成功: ${saved.leadId}`);
    return saved;
  }

  /**
   * 查询培训线索列表
   */
  async findAll(query: TrainingLeadQueryDto): Promise<any> {
    const { page = 1, pageSize = 10, search, leadLevel, status, leadSource, trainingType, startDate, endDate, assignedTo } = query;

    const filter: any = {};

    // 搜索条件
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { wechatId: { $regex: search, $options: 'i' } },
        { leadId: { $regex: search, $options: 'i' } }
      ];
    }

    // 筛选条件
    if (leadLevel) filter.leadLevel = leadLevel;
    if (status) filter.status = status;
    if (leadSource) filter.leadSource = leadSource;
    if (trainingType) filter.trainingType = trainingType;
    if (assignedTo) filter.assignedTo = new Types.ObjectId(assignedTo);

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
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.trainingLeadModel.countDocuments(filter)
    ]);

    return {
      items,
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

    return {
      ...lead,
      followUps
    };
  }

  /**
   * 更新培训线索
   */
  async update(id: string, updateDto: UpdateTrainingLeadDto): Promise<TrainingLead> {
    this.logger.log(`更新培训线索: ${id}`);

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

    // 如果客户分级改为"0-成交"，自动设置状态为"已成交"
    if (updateDto.leadLevel === LeadLevel.CLOSED) {
      updateData.status = LeadStatus.CLOSED;
    }

    Object.assign(lead, updateData);
    const updated = await lead.save();

    this.logger.log(`培训线索更新成功: ${updated.leadId}`);
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

    this.logger.log(`培训线索删除成功: ${lead.leadId}`);
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
    // 客户分级映射
    const leadLevelMap: Record<string, LeadLevel> = {
      'A类': LeadLevel.A,
      'A': LeadLevel.A,
      'B类': LeadLevel.B,
      'B': LeadLevel.B,
      'C类': LeadLevel.C,
      'C': LeadLevel.C,
      'D类': LeadLevel.D,
      'D': LeadLevel.D,
      '0-成交': LeadLevel.CLOSED,
      '成交': LeadLevel.CLOSED,
      '0': LeadLevel.CLOSED
    };

    // 意向程度映射
    const intentionLevelMap: Record<string, string> = {
      '高': '高',
      '中': '中',
      '低': '低'
    };

    // 创建基本数据
    const dto: any = {
      name: rowData['姓名']?.toString().trim(),
      leadLevel: leadLevelMap[rowData['客户分级']?.toString().trim()] || LeadLevel.D
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

    // 备注信息
    if (rowData['备注']) {
      dto.remarks = rowData['备注']?.toString().trim();
    }

    // 返回转换后的DTO
    return dto as CreateTrainingLeadDto;
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
