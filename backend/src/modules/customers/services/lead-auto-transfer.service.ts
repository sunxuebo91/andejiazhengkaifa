import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { hostname } from 'os';
import { Customer, CustomerDocument } from '../models/customer.model';
import { LeadTransferRule, LeadTransferRuleDocument } from '../models/lead-transfer-rule.model';
import { LeadTransferRecord, LeadTransferRecordDocument } from '../models/lead-transfer-record.model';
import { CustomerAssignmentLog } from '../models/customer-assignment-log.model';
import { CustomerFollowUp } from '../models/customer-follow-up.entity';
import { CustomerOperationLog } from '../models/customer-operation-log.model';
import { LeadTransferRuleService } from './lead-transfer-rule.service';
import { User } from '../../users/models/user.entity';
import { NotificationHelperService } from '../../notification/notification-helper.service';
import { RequestContextStore } from '../../../common/logging/request-context';

@Injectable()
export class LeadAutoTransferService implements OnModuleInit {
  private readonly logger = new Logger(LeadAutoTransferService.name);
  private isAutoTransferRunning = false;
  private readonly runningRuleIds = new Set<string>();
  private readonly executionLockOwner = `${hostname()}:${process.pid}`;
  private readonly ruleExecutionLockTtlMs = 55 * 60 * 1000;

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(LeadTransferRule.name) private ruleModel: Model<LeadTransferRuleDocument>,
    @InjectModel(LeadTransferRecord.name) private recordModel: Model<LeadTransferRecordDocument>,
    @InjectModel(CustomerAssignmentLog.name) private assignmentLogModel: Model<CustomerAssignmentLog>,
    @InjectModel(CustomerFollowUp.name) private followUpModel: Model<CustomerFollowUp>,
    @InjectModel(CustomerOperationLog.name) private operationLogModel: Model<CustomerOperationLog>,
    @InjectModel(User.name) private userModel: Model<User>,
    private ruleService: LeadTransferRuleService,
    private schedulerRegistry: SchedulerRegistry,
    private notificationHelper: NotificationHelperService,
  ) {
    this.logger.log('✅ LeadAutoTransferService 构造函数已执行');
  }

  onModuleInit() {
    this.logger.log('✅ LeadAutoTransferService 模块已初始化');

    // 🔒 只在生产环境启用定时任务，避免多进程重复执行
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      this.logger.warn('⚠️ 非生产环境，跳过注册线索自动流转定时任务');
      this.logger.log(`📋 当前环境: ${process.env.NODE_ENV || 'undefined'}`);
      return;
    }

    // 手动注册定时任务（因为@Cron装饰器在当前环境下无法自动注册）
    const CronJob = require('cron').CronJob;

    // 每小时整点执行的任务
    const hourlyJob = new CronJob(
      '0 * * * *', // 每小时整点执行
      () => {
        this.logger.log('⏰ 定时任务触发！');
        this.executeAutoTransfer().catch(err => {
          this.logger.error('定时任务执行失败:', err);
        });
      },
      null,
      true,
      'Asia/Shanghai'
    );

    this.schedulerRegistry.addCronJob('lead-auto-transfer-hourly', hourlyJob);

    const nextDate = hourlyJob.nextDate().toJSDate();
    this.logger.log('✅ 线索自动流转定时任务已注册（每小时整点执行，时区: Asia/Shanghai）');
    this.logger.log(`📋 当前环境: ${process.env.NODE_ENV}`);
    this.logger.log(`📅 当前服务器时间: ${new Date().toLocaleString('zh-CN')}`);
    this.logger.log(`⏰ 下次执行时间: ${nextDate.toLocaleString('zh-CN')}`);
  }

  /**
   * 定时任务：每小时执行一次自动流转
   */
  async executeAutoTransfer() {
    if (this.isAutoTransferRunning) {
      this.logger.warn('⚠️ 自动流转任务正在执行中，跳过本次重复触发');
      return;
    }

    this.isAutoTransferRunning = true;
    this.logger.log('🔄 开始执行线索自动流转任务...');

    try {
      // 查询所有启用的规则
      const enabledRules = await this.ruleService.findEnabledRules();

      if (enabledRules.length === 0) {
        this.logger.log('⏭️ 没有启用的流转规则，跳过执行');
        return;
      }

      // 对每个规则执行流转
      for (const rule of enabledRules) {
        try {
          await this.executeRuleTransfer(rule);
        } catch (error) {
          this.logger.error(`❌ 规则 ${rule.ruleName} 执行失败:`, error);
        }
      }

      this.logger.log('✅ 线索自动流转任务执行完成');
    } catch (error) {
      this.logger.error('❌ 自动流转任务执行失败:', error);
    } finally {
      this.isAutoTransferRunning = false;
    }
  }

  /**
   * 执行单个规则的流转
   * @param rule 规则对象
   * @param ignoreTimeWindow 是否忽略时间窗口限制（手动执行时为true）
   * @returns 返回执行结果，包含总数和每个用户的详细统计
   */
  async executeRuleTransfer(
    rule: LeadTransferRule,
    ignoreTimeWindow = false
  ): Promise<{
    transferredCount: number;
    userStats: Array<{
      userId: string;
      userName: string;
      transferredOut: number;
      transferredIn: number;
    }>;
  }> {
    this.logger.log(`📋 执行规则: ${rule.ruleName}`);
    const ruleId = rule._id.toString();

    if (this.runningRuleIds.has(ruleId)) {
      this.logger.warn(`⚠️ 规则 ${rule.ruleName} 正在执行中，跳过重复执行`);
      return { transferredCount: 0, userStats: [] };
    }

    this.runningRuleIds.add(ruleId);
    const lockToken = await this.acquireRuleExecutionLock(ruleId, rule.ruleName);

    if (!lockToken) {
      this.runningRuleIds.delete(ruleId);
      return { transferredCount: 0, userStats: [] };
    }

    try {
      // 检查规则的执行时间窗口（手动执行时忽略）
      if (!ignoreTimeWindow && rule.executionWindow?.enabled) {
        const isWithinWindow = this.isWithinRuleExecutionWindow(rule);
        this.logger.log(`⏰ 时间窗口检查: ${rule.executionWindow.startTime} - ${rule.executionWindow.endTime}, 当前时间: ${new Date().toLocaleTimeString('zh-CN')}, 在窗口内: ${isWithinWindow}`);
        if (!isWithinWindow) {
          this.logger.log(`⏰ 规则 ${rule.ruleName} 不在执行时间窗口内，跳过`);
          return { transferredCount: 0, userStats: [] };
        }
      }

      const { triggerConditions } = rule;

      // 计算时间阈值
      const thresholdTime = new Date();
      thresholdTime.setHours(thresholdTime.getHours() - triggerConditions.inactiveHours);

      // 构建查询条件
      const query: any = {
        // 负责人在流出名单中（转换为 ObjectId）
        assignedTo: {
          $in: rule.userQuotas
            .filter(u => u.role === 'source' || u.role === 'both')
            .map(u => new Types.ObjectId(u.userId))
        },

        // 客户状态在指定范围内
        contractStatus: { $in: triggerConditions.contractStatuses },

        // 最后活动时间早于阈值（如果没有 lastActivityAt，则使用 updatedAt）
        $or: [
          { lastActivityAt: { $lt: thresholdTime } },
          {
            lastActivityAt: { $exists: false },
            updatedAt: { $lt: thresholdTime }
          },
          {
            lastActivityAt: null,
            updatedAt: { $lt: thresholdTime }
          }
        ],

        // 不在公海中
        inPublicPool: false,

        // 允许自动流转
        autoTransferEnabled: { $ne: false },

        // 未被冻结
        isFrozen: { $ne: true },

        // 排除转介绍线索（不参与自动流转）
        leadSource: { $ne: '转介绍' },
      };

      // 添加线索来源过滤（字段名是 leadSource 而不是 source）
      if (triggerConditions.leadSources && triggerConditions.leadSources.length > 0) {
        query.leadSource = { $in: triggerConditions.leadSources };
      }

      if ((triggerConditions.maxTransferCount ?? 0) > 0) {
        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              { transferCount: { $exists: false } },
              { transferCount: { $lt: triggerConditions.maxTransferCount } },
            ],
          },
        ];
      }

      if ((triggerConditions.transferCooldownHours ?? 0) > 0) {
        const cooldownThreshold = new Date();
        cooldownThreshold.setHours(cooldownThreshold.getHours() - triggerConditions.transferCooldownHours);
        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              { lastTransferredAt: { $exists: false } },
              { lastTransferredAt: null },
              { lastTransferredAt: { $lt: cooldownThreshold } },
            ],
          },
        ];
      }

      // 添加创建日期范围过滤
      if (triggerConditions.createdDateRange) {
        const { startDate, endDate } = triggerConditions.createdDateRange;
        if (startDate || endDate) {
          query.createdAt = {};
          if (startDate) query.createdAt.$gte = new Date(startDate);
          if (endDate) query.createdAt.$lte = new Date(endDate);
        }
      }

      this.logger.log(`📝 查询条件: 阈值时间=${thresholdTime.toLocaleString('zh-CN')}, 状态=${triggerConditions.contractStatuses.join(',')}`);

      // 查询符合条件的线索（限制每次最多处理100条）
      const customers = await this.customerModel
        .find(query)
        .sort({ lastActivityAt: 1, updatedAt: 1, _id: 1 })
        .limit(100)
        .exec();

      if (customers.length === 0) {
        this.logger.log(`规则 ${rule.ruleName}: 没有符合条件的线索`);
        return { transferredCount: 0, userStats: [] };
      }

      this.logger.log(`规则 ${rule.ruleName}: 找到 ${customers.length} 条符合条件的线索`);

      // 按流出用户分组
      const customersBySource = this.groupBySourceUser(customers);

      // 使用新的轮流分配算法
      const allocationPlan = this.calculateRoundRobinAllocation(rule, customersBySource);

      this.logger.log(`📊 分配计划: ${JSON.stringify(allocationPlan, null, 2)}`);

      // 执行流转
      let successCount = 0;
      let failedCount = 0;

      // 统计每个用户本次的流出和流入
      const userStatsMap = new Map<string, { userId: string; userName: string; transferredOut: number; transferredIn: number }>();

      // 初始化所有用户的统计
      for (const user of rule.userQuotas) {
        userStatsMap.set(user.userId.toString(), {
          userId: user.userId.toString(),
          userName: user.userName,
          transferredOut: 0,
          transferredIn: 0,
        });
      }

      // 🔥 [FIX] 记录已经流转的客户ID，防止重复
      const transferredCustomerIds = new Set<string>();

      // 🔥 [FIX] 创建客户ID到客户对象的映射，方便快速查找
      const customerMap = new Map<string, any>();
      for (const [, customerList] of customersBySource) {
        for (const customer of customerList) {
          customerMap.set(customer._id.toString(), customer);
        }
      }

      for (const allocation of allocationPlan) {
        // 🔥 [FIX] 使用分配计划中的具体客户ID
        if (!allocation.customerId) {
          this.logger.warn(`分配计划缺少客户ID，跳过`);
          continue;
        }

        // 🔥 [FIX] 检查是否已经流转过（防止重复）
        if (transferredCustomerIds.has(allocation.customerId)) {
          this.logger.warn(`客户 ${allocation.customerId} 已被流转，跳过重复分配`);
          continue;
        }

        const customer = customerMap.get(allocation.customerId);
        if (!customer) {
          this.logger.warn(`找不到客户 ${allocation.customerId}，跳过`);
          continue;
        }

        try {
          // 执行流转
          const transferred = await this.transferCustomer(customer, allocation.targetUserId, rule);
          if (!transferred) {
            this.logger.warn(`客户 ${customer._id} 在执行时状态已变化，跳过本次流转`);
            continue;
          }

          // 🔥 [FIX] 标记该客户已被流转
          transferredCustomerIds.add(allocation.customerId);

          // 更新本次统计
          const sourceStats = userStatsMap.get(allocation.sourceUserId);
          if (sourceStats) {
            sourceStats.transferredOut++;
          }

          const targetStats = userStatsMap.get(allocation.targetUserId);
          if (targetStats) {
            targetStats.transferredIn++;
          }

          successCount++;
        } catch (error) {
          this.logger.error(`流转客户 ${customer._id} 失败:`, error);
          await this.recordFailedTransfer(customer, allocation.targetUserId, rule, error);
          failedCount++;
        }
      }

      // 更新规则统计
      await this.ruleService.updateStatistics(rule._id.toString(), successCount);

      this.logger.log(`规则 ${rule.ruleName}: 成功 ${successCount}, 失败 ${failedCount}`);

      // 输出平衡报告
      await this.logBalanceReport(rule);

      // 返回详细统计
      const userStats = Array.from(userStatsMap.values()).filter(
        stat => stat.transferredOut > 0 || stat.transferredIn > 0
      );

      // 🔔 发送流转通知
      if (successCount > 0) {
        await this.sendTransferNotifications(userStats, rule.ruleName);
      }

      return { transferredCount: successCount, userStats };
    } finally {
      await this.releaseRuleExecutionLock(ruleId, lockToken);
      this.runningRuleIds.delete(ruleId);
    }
  }

  /**
   * 发送流转通知给相关用户
   */
  private async sendTransferNotifications(
    userStats: Array<{ userId: string; userName: string; transferredOut: number; transferredIn: number }>,
    ruleName: string
  ): Promise<void> {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    for (const stat of userStats) {
      try {
        // 发送流出通知
        if (stat.transferredOut > 0) {
          await this.notificationHelper.notifyLeadTransferOut(stat.userId, {
            count: stat.transferredOut,
            time: timeStr,
            ruleName,
          });
          this.logger.log(`🔔 已发送流出通知给 ${stat.userName}: ${stat.transferredOut} 条线索`);
        }

        // 发送流入通知
        if (stat.transferredIn > 0) {
          await this.notificationHelper.notifyLeadTransferIn(stat.userId, {
            count: stat.transferredIn,
            time: timeStr,
            ruleName,
          });
          this.logger.log(`🔔 已发送流入通知给 ${stat.userName}: ${stat.transferredIn} 条线索`);
        }
      } catch (error) {
        this.logger.error(`发送通知给 ${stat.userName} 失败:`, error);
        // 不影响主流程，继续处理其他用户
      }
    }
  }

  private async acquireRuleExecutionLock(ruleId: string, ruleName: string): Promise<string | null> {
    const now = new Date();
    const lockToken = randomUUID();
    const lockExpiresAt = new Date(now.getTime() + this.ruleExecutionLockTtlMs);

    const lockedRule = await this.ruleModel.findOneAndUpdate(
      {
        _id: ruleId,
        $or: [
          { executionState: { $exists: false } },
          { 'executionState.lockExpiresAt': { $exists: false } },
          { 'executionState.lockExpiresAt': null },
          { 'executionState.lockExpiresAt': { $lte: now } },
        ],
      },
      {
        $set: {
          executionState: {
            lockToken,
            lockOwner: this.executionLockOwner,
            lockedAt: now,
            lockExpiresAt,
          },
        },
      },
      { new: true }
    );

    if (!lockedRule) {
      this.logger.warn(`⚠️ 规则 ${ruleName} 已被其他实例锁定，跳过本次执行`);
      return null;
    }

    return lockToken;
  }

  private async releaseRuleExecutionLock(ruleId: string, lockToken: string): Promise<void> {
    try {
      await this.ruleModel.updateOne(
        {
          _id: ruleId,
          'executionState.lockToken': lockToken,
        },
        {
          $unset: {
            executionState: 1,
          },
        }
      );
    } catch (error) {
      this.logger.error(`释放规则执行锁失败: ${ruleId}`, error);
    }
  }

  private async recordFailedTransfer(
    customer: CustomerDocument,
    targetUserId: string,
    rule: LeadTransferRule,
    error: any,
  ): Promise<void> {
    try {
      const lastActivity = customer.lastActivityAt || customer.updatedAt;
      const inactiveHours = Math.floor(
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)
      );

      await this.recordModel.create({
        ruleId: rule._id,
        customerId: customer._id,
        fromUserId: customer.assignedTo,
        toUserId: new Types.ObjectId(targetUserId),
        snapshot: {
          customerNumber: customer.customerId,
          customerName: customer.name,
          contractStatus: customer.contractStatus,
          inactiveHours,
          lastActivityAt: lastActivity,
          createdAt: customer.createdAt,
        },
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        transferredAt: new Date(),
      });
    } catch (recordError) {
      this.logger.error(`记录失败流转日志失败: ${customer._id}`, recordError);
    }
  }

  /**
   * 轮流分配算法（Round-Robin + 余量补偿）
   * 返回包含具体客户ID的分配计划
   */
  private calculateRoundRobinAllocation(
    rule: LeadTransferRule,
    customersBySource: Map<string, any[]>
  ): Array<{ sourceUserId: string; targetUserId: string; count: number; customerId?: string }> {
    const allocationPlan: Array<{ sourceUserId: string; targetUserId: string; count: number; customerId?: string }> = [];

    // 🎴 [轮流发牌模式] 把所有线索收集并打散

    // 第一步：收集所有线索到一个数组，记录每条线索的原负责人
    const allCustomers: Array<{ customerId: string; sourceUserId: string }> = [];

    for (const [sourceUserId, customers] of customersBySource) {
      for (const customer of customers) {
        allCustomers.push({
          customerId: customer._id.toString(),
          sourceUserId
        });
      }
    }

    const totalCustomers = allCustomers.length;
    this.logger.log(`📊 收集到 ${totalCustomers} 条线索，准备打散分配`);

    if (totalCustomers === 0) {
      return allocationPlan;
    }

    // 第二步：打乱线索顺序（Fisher-Yates 洗牌算法）
    for (let i = allCustomers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCustomers[i], allCustomers[j]] = [allCustomers[j], allCustomers[i]];
    }
    this.logger.log(`🔀 线索已打乱顺序`);

    // 第三步：获取所有目标用户（role = target 或 both）
    const targetUsers = rule.userQuotas.filter(u => u.role === 'target' || u.role === 'both');

    if (targetUsers.length === 0) {
      this.logger.error('没有可用的流入用户');
      return allocationPlan;
    }

    const activeUsers = targetUsers;

    this.logger.log(`📊 流转统计: 总客户${totalCustomers}条, 目标用户${activeUsers.length}人`);

    // 第四步：🎴 轮流发牌分配
    // 准备目标用户ID列表
    const targetUserIds = activeUsers.map(u => u.userId.toString());

    // 记录每个用户分配到的数量（用于统计）
    const userAllocationCount = new Map<string, number>();
    activeUsers.forEach(u => userAllocationCount.set(u.userId.toString(), 0));

    // 当前发牌位置
    let currentTargetIndex = 0;

    this.logger.log(`\n🎴 开始轮流发牌分配...`);

    // 遍历打散后的线索，轮流分配
    for (let i = 0; i < allCustomers.length; i++) {
      const customer = allCustomers[i];
      const sourceUserId = customer.sourceUserId;

      // 找到下一个可以接收的目标用户（不能是线索原负责人）
      let attempts = 0;
      let targetUserId = targetUserIds[currentTargetIndex];

      // 如果当前目标是线索原负责人，跳到下一个
      while (targetUserId === sourceUserId && attempts < targetUserIds.length) {
        currentTargetIndex = (currentTargetIndex + 1) % targetUserIds.length;
        targetUserId = targetUserIds[currentTargetIndex];
        attempts++;
      }

      // 如果所有目标用户都是原负责人（理论上不可能），跳过这条线索
      if (attempts >= targetUserIds.length) {
        this.logger.warn(`线索 ${customer.customerId} 找不到合适的接收者，跳过`);
        continue;
      }

      // 添加到分配计划，包含具体的客户ID
      allocationPlan.push({
        sourceUserId,
        targetUserId,
        count: 1,
        customerId: customer.customerId  // 🔥 [FIX] 使用MongoDB ObjectId作为唯一标识（已在第364行转换为string）
      });

      // 更新统计
      userAllocationCount.set(targetUserId, (userAllocationCount.get(targetUserId) || 0) + 1);

      // 打印前5条和后5条的日志
      if (i < 5 || i >= allCustomers.length - 5) {
        const sourceName = activeUsers.find(u => u.userId.toString() === sourceUserId)?.userName || sourceUserId;
        const targetName = activeUsers.find(u => u.userId.toString() === targetUserId)?.userName || targetUserId;
        this.logger.log(`  第${i + 1}条: ${sourceName} → ${targetName}`);
      } else if (i === 5) {
        this.logger.log(`  ... (省略中间 ${allCustomers.length - 10} 条) ...`);
      }

      // 移动到下一个目标用户
      currentTargetIndex = (currentTargetIndex + 1) % targetUserIds.length;
    }

    // 输出最终分配结果
    this.logger.log(`\n📊 最终分配统计: ${JSON.stringify(
      Array.from(userAllocationCount.entries()).map(([userId, count]) => ({
        userName: activeUsers.find(u => u.userId.toString() === userId)?.userName,
        count
      })), null, 2
    )}`);

    return allocationPlan;
  }

  /**
   * 平衡随机算法选择目标用户（已废弃，保留作为备用）
   */
  private async selectTargetUser(rule: LeadTransferRule, sourceUserId: string): Promise<string> {
    // 获取所有流入用户
    const targetUsers = rule.userQuotas.filter(u => u.role === 'target' || u.role === 'both');

    if (targetUsers.length === 0) {
      throw new Error('没有可用的流入用户');
    }

    // 计算每个用户的权重
    const weightedUsers = targetUsers.map(user => {
      let weight = 1; // 基础权重

      // 如果启用补偿机制
      if (rule.distributionConfig.enableCompensation) {
        // 计算亏欠值（正数表示流出多于流入，需要补偿）
        const deficit = user.balance;

        if (deficit > 0) {
          // 有亏欠，增加权重
          weight += deficit * rule.distributionConfig.compensationPriority;
        }
      }

      return {
        userId: user.userId.toString(),
        weight: Math.max(weight, 1), // 确保权重至少为1
        balance: user.balance,
      };
    });

    // 按权重随机选择
    const selected = this.weightedRandomSelect(weightedUsers);

    this.logger.debug(
      `选择目标用户: ${selected.userId}, 权重: ${selected.weight}, 平衡值: ${selected.balance}`
    );

    return selected.userId;
  }

  /**
   * 加权随机选择
   */
  private weightedRandomSelect(users: Array<{ userId: string; weight: number }>): any {
    const totalWeight = users.reduce((sum, user) => sum + user.weight, 0);
    let random = Math.random() * totalWeight;

    for (const user of users) {
      random -= user.weight;
      if (random <= 0) {
        return user;
      }
    }

    // 兜底：返回最后一个
    return users[users.length - 1];
  }

  /**
   * 执行客户流转
   */
  private async transferCustomer(
    customer: CustomerDocument,
    targetUserId: string,
    rule: LeadTransferRule
  ): Promise<boolean> {
    const now = new Date();
    const oldAssignedTo = customer.assignedTo;

    // 获取用户信息
    const [oldUser, newUser] = await Promise.all([
      this.userModel.findById(oldAssignedTo).select('name username').lean(),
      this.userModel.findById(targetUserId).select('name username').lean(),
    ]);

    // 计算无活动时长（如果没有 lastActivityAt，使用 updatedAt）
    const lastActivity = customer.lastActivityAt || customer.updatedAt;
    const inactiveHours = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    );

    const transferCooldownHours = rule.triggerConditions.transferCooldownHours ?? 24;
    const maxTransferCount = rule.triggerConditions.maxTransferCount ?? 0;
    const cooldownThreshold = new Date(now);
    cooldownThreshold.setHours(cooldownThreshold.getHours() - transferCooldownHours);

    const updateConditions: any = {
      _id: customer._id,
      assignedTo: oldAssignedTo,
      inPublicPool: false,
      autoTransferEnabled: { $ne: false },
      isFrozen: { $ne: true },
    };

    if (maxTransferCount > 0) {
      updateConditions.$or = [
        { transferCount: { $exists: false } },
        { transferCount: { $lt: maxTransferCount } },
      ];
    }

    if (transferCooldownHours > 0) {
      updateConditions.$and = [
        ...(updateConditions.$and || []),
        {
          $or: [
            { lastTransferredAt: { $exists: false } },
            { lastTransferredAt: null },
            { lastTransferredAt: { $lt: cooldownThreshold } },
          ],
        },
      ];
    }

    // 1. 更新客户信息（原子操作）
    const updateResult = await this.customerModel.updateOne(
      updateConditions,
      {
        $set: {
          assignedTo: new Types.ObjectId(targetUserId),
          assignedBy: new Types.ObjectId(targetUserId),
          assignedAt: now,
          assignmentReason: `自动流转-规则: ${rule.ruleName}`,
          lastTransferredAt: now,
        },
        $inc: { transferCount: 1 },
      }
    );

    if (!updateResult.modifiedCount) {
      return false;
    }

    // 2. 记录分配日志（非关键，失败不影响流转结果）
    try {
      await this.assignmentLogModel.create([{
        customerId: customer._id,
        oldAssignedTo: oldAssignedTo,
        newAssignedTo: new Types.ObjectId(targetUserId),
        assignedBy: new Types.ObjectId(targetUserId),
        assignedAt: now,
        reason: `自动流转-规则: ${rule.ruleName}`,
      }]);
    } catch (e) {
      this.logger.warn(`记录分配日志失败（不影响流转）: ${e instanceof Error ? e.message : e}`);
    }

    // 3. 记录流转日志
    await this.recordModel.create([{
      ruleId: rule._id,
      customerId: customer._id,
      fromUserId: oldAssignedTo,
      toUserId: new Types.ObjectId(targetUserId),
      snapshot: {
        customerNumber: customer.customerId,
        customerName: customer.name,
        contractStatus: customer.contractStatus,
        inactiveHours,
        lastActivityAt: lastActivity,
        createdAt: customer.createdAt,
      },
      status: 'success',
      transferredAt: now,
    }]);

    // 4. 创建客户操作日志（非关键，失败不影响流转结果）
    try {
      await this.operationLogModel.create([{
        customerId: customer._id,
        operatorId: new Types.ObjectId(targetUserId),
        entityType: 'customer',
        entityId: customer._id.toString(),
        operationType: 'assign',
        operationName: '系统自动流转',
        details: {
          description: `系统自动流转：因${inactiveHours}小时无跟进，从${(oldUser as any)?.name || '未知'}流转至${(newUser as any)?.name || '未知'}`,
          before: {
            assignedTo: (oldUser as any)?.name || '未知',
          },
          after: {
            assignedTo: (newUser as any)?.name || '未知',
          },
        },
        operatedAt: now,
        requestId: RequestContextStore.getValue('requestId'),
      }]);
    } catch (e) {
      this.logger.warn(`记录操作日志失败（不影响流转）: ${e instanceof Error ? e.message : e}`);
    }

    // 5. 更新配额统计（非关键，失败不影响流转结果）
    try {
      await this.ruleService.updateUserQuota(
        rule._id.toString(),
        oldAssignedTo.toString(),
        targetUserId,
      );
    } catch (e) {
      this.logger.warn(`更新配额统计失败（不影响流转）: ${e instanceof Error ? e.message : e}`);
    }

    this.logger.log(
      `✅ 客户 ${customer.name} 从 ${(oldUser as any)?.name} 流转至 ${(newUser as any)?.name}`
    );
    return true;
  }

  /**
   * 按流出用户分组
   */
  private groupBySourceUser(customers: CustomerDocument[]): Map<string, CustomerDocument[]> {
    const grouped = new Map<string, CustomerDocument[]>();

    for (const customer of customers) {
      const sourceUserId = customer.assignedTo.toString();
      if (!grouped.has(sourceUserId)) {
        grouped.set(sourceUserId, []);
      }
      grouped.get(sourceUserId)!.push(customer);
    }

    return grouped;
  }

  /**
   * 输出平衡报告
   */
  private async logBalanceReport(rule: LeadTransferRule) {
    // 重新查询规则以获取最新的配额数据
    const updatedRule = await this.ruleModel.findById(rule._id);
    if (!updatedRule) return;

    this.logger.log('📊 平衡报告：');

    for (const user of updatedRule.userQuotas) {
      const status = user.balance > 0 ? '亏欠' : user.balance < 0 ? '盈余' : '平衡';
      this.logger.log(
        `  ${user.userName}: 流出${user.transferredOut}, 流入${user.transferredIn}, ` +
          `balance=${user.balance} (${status})`
      );
    }
  }

  /**
   * 检查是否在规则的执行时间窗口内
   */
  private isWithinRuleExecutionWindow(rule: LeadTransferRule): boolean {
    if (!rule.executionWindow?.enabled) {
      return true;
    }

    const now = new Date();
    const [startHour, startMinute] = rule.executionWindow.startTime.split(':').map(Number);
    const [endHour, endMinute] = rule.executionWindow.endTime.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  /**
   * 手动执行指定规则
   */
  async executeRuleById(ruleId: string): Promise<{
    transferredCount: number;
    userStats: Array<{
      userId: string;
      userName: string;
      transferredOut: number;
      transferredIn: number;
    }>;
  }> {
    this.logger.log(`🔄 手动执行规则: ${ruleId}`);

    try {
      // 查询规则
      const rule = await this.ruleModel.findById(ruleId).exec();

      if (!rule) {
        throw new Error('规则不存在');
      }

      if (!rule.enabled) {
        throw new Error('规则未启用');
      }

      // 执行规则流转（忽略时间窗口限制）
      const result = await this.executeRuleTransfer(rule, true);

      this.logger.log(`✅ 规则 ${rule.ruleName} 手动执行完成，流转了 ${result.transferredCount} 条线索`);

      return result;
    } catch (error) {
      this.logger.error(`❌ 手动执行规则失败:`, error);
      throw error;
    }
  }

  /**
   * 预测下次流转情况
   */
  async predictNextTransfer(ruleId: string): Promise<{
    nextExecutionTime: Date;
    pendingLeadsCount: number;
    userPredictions: Array<{
      userId: string;
      userName: string;
      role: string;
      currentBalance: number;
      estimatedTransferOut: number;
      estimatedTransferIn: number;
      estimatedNewBalance: number;
    }>;
    allocationPlan: Array<{
      sourceUserId: string;
      sourceUserName: string;
      targetUserId: string;
      targetUserName: string;
      count: number;
    }>;
  }> {
    this.logger.log(`🔮 预测规则流转: ${ruleId}`);

    try {
      // 查询规则
      const rule = await this.ruleModel.findById(ruleId).exec();

      if (!rule) {
        throw new Error('规则不存在');
      }

      // 计算下次执行时间
      const nextExecutionTime = this.calculateNextExecutionTime(rule);

      const { triggerConditions } = rule;

      // 计算时间阈值
      const thresholdTime = new Date();
      thresholdTime.setHours(thresholdTime.getHours() - triggerConditions.inactiveHours);

      // 构建查询条件（与实际执行相同）
      const query: any = {
        assignedTo: {
          $in: rule.userQuotas
            .filter(u => u.role === 'source' || u.role === 'both')
            .map(u => new Types.ObjectId(u.userId))
        },
        contractStatus: { $in: triggerConditions.contractStatuses },
        $or: [
          { lastActivityAt: { $lt: thresholdTime } },
          {
            lastActivityAt: { $exists: false },
            updatedAt: { $lt: thresholdTime }
          },
          {
            lastActivityAt: null,
            updatedAt: { $lt: thresholdTime }
          }
        ],
        inPublicPool: false,
        autoTransferEnabled: { $ne: false },
        // 排除转介绍线索（不参与自动流转）
        leadSource: { $ne: '转介绍' },
      };

      if (triggerConditions.leadSources && triggerConditions.leadSources.length > 0) {
        query.leadSource = { $in: triggerConditions.leadSources };
      }

      if ((triggerConditions.maxTransferCount ?? 0) > 0) {
        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              { transferCount: { $exists: false } },
              { transferCount: { $lt: triggerConditions.maxTransferCount } },
            ],
          },
        ];
      }

      if ((triggerConditions.transferCooldownHours ?? 0) > 0) {
        const cooldownThreshold = new Date();
        cooldownThreshold.setHours(cooldownThreshold.getHours() - triggerConditions.transferCooldownHours);
        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              { lastTransferredAt: { $exists: false } },
              { lastTransferredAt: null },
              { lastTransferredAt: { $lt: cooldownThreshold } },
            ],
          },
        ];
      }

      if (triggerConditions.createdDateRange) {
        const { startDate, endDate } = triggerConditions.createdDateRange;
        if (startDate || endDate) {
          query.createdAt = {};
          if (startDate) query.createdAt.$gte = new Date(startDate);
          if (endDate) query.createdAt.$lte = new Date(endDate);
        }
      }

      // 查询符合条件的线索（限制100条）
      const customers = await this.customerModel.find(query).limit(100).exec();
      const pendingLeadsCount = customers.length;

      if (pendingLeadsCount === 0) {
        return {
          nextExecutionTime,
          pendingLeadsCount: 0,
          userPredictions: rule.userQuotas.map(user => ({
            userId: user.userId.toString(),
            userName: user.userName,
            role: user.role,
            currentBalance: user.balance,
            estimatedTransferOut: 0,
            estimatedTransferIn: 0,
            estimatedNewBalance: user.balance,
          })),
          allocationPlan: [],
        };
      }

      // 按流出用户分组
      const customersBySource = this.groupBySourceUser(customers);

      // 计算分配计划
      const allocationPlan = this.calculateRoundRobinAllocation(rule, customersBySource);

      // 统计每个用户的预测流出和流入
      const userTransferStats = new Map<string, { out: number; in: number }>();

      // 初始化
      for (const user of rule.userQuotas) {
        userTransferStats.set(user.userId.toString(), { out: 0, in: 0 });
      }

      // 统计分配计划
      for (const allocation of allocationPlan) {
        const sourceStats = userTransferStats.get(allocation.sourceUserId);
        if (sourceStats) {
          sourceStats.out += allocation.count;
        }

        const targetStats = userTransferStats.get(allocation.targetUserId);
        if (targetStats) {
          targetStats.in += allocation.count;
        }
      }

      // 生成用户预测
      const userPredictions = rule.userQuotas.map(user => {
        const userId = user.userId.toString();
        const stats = userTransferStats.get(userId) || { out: 0, in: 0 };
        const estimatedNewBalance = user.balance + stats.out - stats.in;

        return {
          userId,
          userName: user.userName,
          role: user.role,
          currentBalance: user.balance,
          estimatedTransferOut: stats.out,
          estimatedTransferIn: stats.in,
          estimatedNewBalance,
        };
      });

      // 生成详细的分配计划（包含用户名）
      const detailedAllocationPlan = allocationPlan.map(allocation => {
        const sourceUser = rule.userQuotas.find(u => u.userId.toString() === allocation.sourceUserId);
        const targetUser = rule.userQuotas.find(u => u.userId.toString() === allocation.targetUserId);

        return {
          sourceUserId: allocation.sourceUserId,
          sourceUserName: sourceUser?.userName || '未知',
          targetUserId: allocation.targetUserId,
          targetUserName: targetUser?.userName || '未知',
          count: allocation.count,
        };
      });

      return {
        nextExecutionTime,
        pendingLeadsCount,
        userPredictions,
        allocationPlan: detailedAllocationPlan,
      };
    } catch (error) {
      this.logger.error(`❌ 预测流转失败:`, error);
      throw error;
    }
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextExecutionTime(rule: LeadTransferRule): Date {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);

    // 如果启用了时间窗口，需要考虑时间窗口
    if (rule.executionWindow?.enabled) {
      const [startHour, startMinute] = rule.executionWindow.startTime.split(':').map(Number);
      const [endHour, endMinute] = rule.executionWindow.endTime.split(':').map(Number);

      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;

      // 如果当前时间在窗口之前，返回今天的开始时间
      if (currentTimeInMinutes < startTimeInMinutes) {
        const result = new Date(now);
        result.setHours(startHour, startMinute, 0, 0);
        return result;
      }

      // 如果当前时间在窗口之后，返回明天的开始时间
      if (currentTimeInMinutes >= endTimeInMinutes) {
        const result = new Date(now);
        result.setDate(result.getDate() + 1);
        result.setHours(startHour, startMinute, 0, 0);
        return result;
      }

      // 如果在窗口内，返回下一个整点
      return nextHour;
    }

    return nextHour;
  }
}
