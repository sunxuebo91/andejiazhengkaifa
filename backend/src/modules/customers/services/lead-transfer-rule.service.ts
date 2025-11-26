import { Injectable, Logger, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeadTransferRule, LeadTransferRuleDocument } from '../models/lead-transfer-rule.model';
import { CreateLeadTransferRuleDto } from '../dto/create-lead-transfer-rule.dto';
import { UpdateLeadTransferRuleDto } from '../dto/update-lead-transfer-rule.dto';
import { User } from '../../users/models/user.entity';

@Injectable()
export class LeadTransferRuleService {
  private readonly logger = new Logger(LeadTransferRuleService.name);

  constructor(
    @InjectModel(LeadTransferRule.name) private ruleModel: Model<LeadTransferRuleDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /**
   * 创建流转规则
   */
  async create(dto: CreateLeadTransferRuleDto, userId: string): Promise<LeadTransferRule> {
    this.logger.log(`创建流转规则: ${dto.ruleName}`);

    // 验证用户权限
    await this.validateAdminPermission(userId);

    // 验证用户ID是否存在
    await this.validateUserIds([...dto.sourceUserIds, ...dto.targetUserIds]);

    // 初始化用户配额
    const userQuotas = await this.initializeUserQuotas(dto.sourceUserIds, dto.targetUserIds);

    // 创建规则
    const rule = new this.ruleModel({
      ruleName: dto.ruleName,
      description: dto.description,
      enabled: dto.enabled,
      triggerConditions: {
        inactiveHours: dto.triggerConditions.inactiveHours,
        contractStatuses: dto.triggerConditions.contractStatuses,
        leadSources: dto.triggerConditions.leadSources || [],
        createdDateRange: dto.triggerConditions.createdDateRange || { startDate: null, endDate: null },
      },
      executionWindow: dto.executionWindow || {
        enabled: true,
        startTime: '09:30',
        endTime: '18:30',
      },
      userQuotas,
      distributionConfig: dto.distributionConfig || {
        strategy: 'balanced-random',
        enableCompensation: true,
        compensationPriority: 5,
      },
      statistics: {
        totalTransferred: 0,
        lastExecutedAt: null,
        lastTransferredCount: 0,
      },
      createdBy: new Types.ObjectId(userId),
    });

    const saved = await rule.save();
    this.logger.log(`规则创建成功: ${saved._id}`);
    return saved;
  }

  /**
   * 更新流转规则
   */
  async update(ruleId: string, dto: UpdateLeadTransferRuleDto, userId: string): Promise<LeadTransferRule> {
    this.logger.log(`更新流转规则: ${ruleId}`);

    // 验证用户权限
    await this.validateAdminPermission(userId);

    const rule = await this.ruleModel.findById(ruleId);
    if (!rule) {
      throw new NotFoundException('规则不存在');
    }

    // 如果更新了用户列表，重新初始化配额
    if (dto.sourceUserIds || dto.targetUserIds) {
      const sourceIds = dto.sourceUserIds || rule.userQuotas.filter(u => u.role === 'source' || u.role === 'both').map(u => u.userId.toString());
      const targetIds = dto.targetUserIds || rule.userQuotas.filter(u => u.role === 'target' || u.role === 'both').map(u => u.userId.toString());
      
      await this.validateUserIds([...sourceIds, ...targetIds]);
      rule.userQuotas = await this.initializeUserQuotas(sourceIds, targetIds);
    }

    // 更新其他字段
    if (dto.ruleName) rule.ruleName = dto.ruleName;
    if (dto.description !== undefined) rule.description = dto.description;
    if (dto.enabled !== undefined) rule.enabled = dto.enabled;
    if (dto.triggerConditions) rule.triggerConditions = dto.triggerConditions as any;
    if (dto.executionWindow) rule.executionWindow = dto.executionWindow as any;
    if (dto.distributionConfig) rule.distributionConfig = dto.distributionConfig as any;

    const updated = await rule.save();
    this.logger.log(`规则更新成功: ${ruleId}`);
    return updated;
  }

  /**
   * 切换规则启用状态
   */
  async toggleEnabled(ruleId: string, enabled: boolean, userId: string): Promise<LeadTransferRule> {
    await this.validateAdminPermission(userId);

    const rule = await this.ruleModel.findById(ruleId);
    if (!rule) {
      throw new NotFoundException('规则不存在');
    }

    rule.enabled = enabled;
    const updated = await rule.save();

    this.logger.log(`规则 ${ruleId} ${enabled ? '已启用' : '已禁用'}`);
    return updated;
  }

  /**
   * 删除规则
   */
  async remove(ruleId: string, userId: string): Promise<void> {
    await this.validateAdminPermission(userId);

    const result = await this.ruleModel.findByIdAndDelete(ruleId);
    if (!result) {
      throw new NotFoundException('规则不存在');
    }

    this.logger.log(`规则已删除: ${ruleId}`);
  }

  /**
   * 获取规则列表
   */
  async findAll(): Promise<LeadTransferRule[]> {
    return await this.ruleModel
      .find()
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * 获取规则详情
   */
  async findOne(ruleId: string): Promise<LeadTransferRule> {
    const rule = await this.ruleModel
      .findById(ruleId)
      .populate('createdBy', 'name username')
      .exec();

    if (!rule) {
      throw new NotFoundException('规则不存在');
    }

    return rule;
  }

  /**
   * 获取所有启用的规则
   */
  async findEnabledRules(): Promise<LeadTransferRule[]> {
    return await this.ruleModel.find({ enabled: true }).exec();
  }

  /**
   * 更新规则统计信息
   */
  async updateStatistics(ruleId: string, transferredCount: number): Promise<void> {
    await this.ruleModel.findByIdAndUpdate(ruleId, {
      $inc: { 'statistics.totalTransferred': transferredCount },
      $set: {
        'statistics.lastExecutedAt': new Date(),
        'statistics.lastTransferredCount': transferredCount,
      },
    });
  }

  /**
   * 更新用户配额
   */
  async updateUserQuota(ruleId: string, sourceUserId: string, targetUserId: string): Promise<void> {
    const rule = await this.ruleModel.findById(ruleId);
    if (!rule) return;

    // 更新流出用户统计
    const sourceUser = rule.userQuotas.find(u => u.userId.toString() === sourceUserId);
    if (sourceUser) {
      sourceUser.transferredOut += 1;
      sourceUser.balance = sourceUser.transferredOut - sourceUser.transferredIn;
    }

    // 更新流入用户统计
    const targetUser = rule.userQuotas.find(u => u.userId.toString() === targetUserId);
    if (targetUser) {
      targetUser.transferredIn += 1;
      targetUser.balance = targetUser.transferredOut - targetUser.transferredIn;
      targetUser.lastCompensatedAt = new Date();
    }

    await rule.save();
  }

  /**
   * 验证管理员权限
   */
  private async validateAdminPermission(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).select('role').lean();
    if (!user || !['admin', 'manager'].includes((user as any).role)) {
      throw new ForbiddenException('只有管理员或经理可以管理流转规则');
    }
  }

  /**
   * 验证用户ID是否存在
   */
  private async validateUserIds(userIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(userIds)];
    const users = await this.userModel.find({ _id: { $in: uniqueIds } }).select('_id').lean();

    if (users.length !== uniqueIds.length) {
      throw new NotFoundException('部分用户不存在');
    }
  }

  /**
   * 初始化用户配额
   */
  private async initializeUserQuotas(sourceUserIds: string[], targetUserIds: string[]): Promise<any[]> {
    const allUserIds = [...new Set([...sourceUserIds, ...targetUserIds])];
    const users = await this.userModel.find({ _id: { $in: allUserIds } }).select('_id name').lean();

    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    const quotas: any[] = [];

    // 处理流出用户
    for (const userId of sourceUserIds) {
      const user = userMap.get(userId);
      if (!user) continue;

      const isAlsoTarget = targetUserIds.includes(userId);
      quotas.push({
        userId: new Types.ObjectId(userId),
        userName: (user as any).name,
        role: isAlsoTarget ? 'both' : 'source',
        transferredOut: 0,
        transferredIn: 0,
        balance: 0,
        pendingCompensation: 0,
      });
    }

    // 处理仅流入的用户
    for (const userId of targetUserIds) {
      if (sourceUserIds.includes(userId)) continue; // 已处理

      const user = userMap.get(userId);
      if (!user) continue;

      quotas.push({
        userId: new Types.ObjectId(userId),
        userName: (user as any).name,
        role: 'target',
        transferredOut: 0,
        transferredIn: 0,
        balance: 0,
        pendingCompensation: 0,
      });
    }

    return quotas;
  }
}

