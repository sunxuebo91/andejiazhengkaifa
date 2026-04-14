import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { hostname } from 'os';
import { SchedulerRegistry } from '@nestjs/schedule';
import { TrainingLead, TrainingLeadDocument } from '../models/training-lead.model';
import { LeadStatus } from '../models/training-lead.model';
import { TrainingLeadTransferRecord, TrainingLeadTransferRecordDocument } from '../models/training-lead-transfer-record.model';
import { LeadTransferRule, LeadTransferRuleDocument } from '../../customers/models/lead-transfer-rule.model';
import { User } from '../../users/models/user.entity';
import { LeadTransferRuleService } from '../../customers/services/lead-transfer-rule.service';
import { NotificationHelperService } from '../../notification/notification-helper.service';

@Injectable()
export class TrainingLeadAutoTransferService implements OnModuleInit {
  private readonly logger = new Logger(TrainingLeadAutoTransferService.name);
  private isRunning = false;
  private readonly runningRuleIds = new Set<string>();
  private readonly lockOwner = `${hostname()}:${process.pid}`;
  private readonly lockTtlMs = 55 * 60 * 1000;

  constructor(
    @InjectModel(TrainingLead.name) private leadModel: Model<TrainingLeadDocument>,
    @InjectModel(TrainingLeadTransferRecord.name) private recordModel: Model<TrainingLeadTransferRecordDocument>,
    @InjectModel(LeadTransferRule.name) private ruleModel: Model<LeadTransferRuleDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private ruleService: LeadTransferRuleService,
    private schedulerRegistry: SchedulerRegistry,
    private notificationHelper: NotificationHelperService,
  ) {}

  onModuleInit() {
    this.logger.log('✅ TrainingLeadAutoTransferService 已初始化');

    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      this.logger.warn('⚠️ 非生产环境，跳过注册学员线索自动流转定时任务');
      return;
    }

    const CronJob = require('cron').CronJob;
    const job = new CronJob(
      '0 * * * *', // 每小时整点执行
      () => {
        this.executeAutoTransfer().catch(err =>
          this.logger.error('学员线索自动流转任务失败:', err)
        );
      },
      null,
      true,
      'Asia/Shanghai'
    );

    this.schedulerRegistry.addCronJob('training-lead-auto-transfer-hourly', job);
    this.logger.log(`✅ 学员线索自动流转任务已注册（每小时整点），下次: ${job.nextDate().toJSDate().toLocaleString('zh-CN')}`);
  }

  /** 定时任务入口 */
  async executeAutoTransfer(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('⚠️ 学员线索自动流转任务执行中，跳过');
      return;
    }
    this.isRunning = true;
    this.logger.log('🔄 开始执行学员线索自动流转...');

    try {
      const rules = await this.ruleService.findEnabledTrainingRules();
      if (!rules.length) {
        this.logger.log('⏭️ 无已启用的学员线索流转规则');
        return;
      }
      for (const rule of rules) {
        try {
          await this.executeRuleTransfer(rule);
        } catch (err) {
          this.logger.error(`规则 ${rule.ruleName} 执行失败:`, err);
        }
      }
      this.logger.log('✅ 学员线索自动流转执行完成');
    } finally {
      this.isRunning = false;
    }
  }

  /** 手动触发指定规则 */
  async executeRuleById(ruleId: string): Promise<{ transferredCount: number; userStats: any[] }> {
    const rule = await this.ruleModel.findById(ruleId).exec();
    if (!rule) throw new Error('规则不存在');
    if (!rule.enabled) throw new Error('规则未启用');
    if (rule.targetModule !== 'training') throw new Error('该规则不适用于学员线索');
    return this.executeRuleTransfer(rule, true);
  }

  /** 执行单条规则 */
  async executeRuleTransfer(
    rule: LeadTransferRule,
    ignoreTimeWindow = false
  ): Promise<{ transferredCount: number; userStats: any[] }> {
    const ruleId = rule._id.toString();
    if (this.runningRuleIds.has(ruleId)) {
      this.logger.warn(`规则 ${rule.ruleName} 执行中，跳过`);
      return { transferredCount: 0, userStats: [] };
    }
    this.runningRuleIds.add(ruleId);

    const lockToken = await this.acquireLock(ruleId, rule.ruleName);
    if (!lockToken) {
      this.runningRuleIds.delete(ruleId);
      return { transferredCount: 0, userStats: [] };
    }

    try {
      // 时间窗口检查
      if (!ignoreTimeWindow && rule.executionWindow?.enabled && !this.isInWindow(rule)) {
        this.logger.log(`⏰ 规则 ${rule.ruleName} 不在执行时间窗口内，跳过`);
        return { transferredCount: 0, userStats: [] };
      }

      const leads = await this.queryEligibleLeads(rule);
      if (!leads.length) {
        this.logger.log(`规则 ${rule.ruleName}: 无符合条件的学员线索`);
        return { transferredCount: 0, userStats: [] };
      }

      this.logger.log(`规则 ${rule.ruleName}: 找到 ${leads.length} 条符合条件的学员线索`);

      const allocationPlan = this.calcRoundRobinAllocation(rule, leads);
      const leadMap = new Map(leads.map(l => [l._id.toString(), l]));
      const transferredIds = new Set<string>();
      const statsMap = new Map<string, { userId: string; userName: string; transferredOut: number; transferredIn: number }>();

      for (const u of rule.userQuotas) {
        statsMap.set(u.userId.toString(), { userId: u.userId.toString(), userName: u.userName, transferredOut: 0, transferredIn: 0 });
      }

      let successCount = 0;
      let failedCount = 0;

      for (const alloc of allocationPlan) {
        if (!alloc.leadId || transferredIds.has(alloc.leadId)) continue;
        const lead = leadMap.get(alloc.leadId);
        if (!lead) continue;

        try {
          const ok = await this.transferLead(lead, alloc.targetUserId, rule);
          if (!ok) {
            this.logger.warn(`线索 ${lead._id} 状态已变化，跳过`);
            continue;
          }
          transferredIds.add(alloc.leadId);
          statsMap.get(alloc.sourceUserId)!.transferredOut++;
          statsMap.get(alloc.targetUserId)!.transferredIn++;
          successCount++;
        } catch (err) {
          this.logger.error(`流转线索 ${lead._id} 失败:`, err);
          await this.recordFailed(lead, alloc.targetUserId, rule, err);
          failedCount++;
        }
      }

      // 更新规则统计
      await this.ruleService.updateStatistics(ruleId, successCount);
      this.logger.log(`规则 ${rule.ruleName}: 成功 ${successCount}, 失败 ${failedCount}`);

      const userStats = [...statsMap.values()].filter(s => s.transferredOut > 0 || s.transferredIn > 0);
      if (successCount > 0) await this.sendNotifications(userStats, rule.ruleName);

      return { transferredCount: successCount, userStats };
    } finally {
      await this.releaseLock(ruleId, lockToken);
      this.runningRuleIds.delete(ruleId);
    }
  }

  /** 查询符合流转条件的学员线索 */
  private async queryEligibleLeads(rule: LeadTransferRule): Promise<TrainingLeadDocument[]> {
    const { triggerConditions } = rule;
    const thresholdTime = new Date(Date.now() - triggerConditions.inactiveHours * 60 * 60 * 1000);

    const query: any = {
      assignedTo: {
        $in: rule.userQuotas
          .filter(u => u.role === 'source' || u.role === 'both')
          .map(u => new Types.ObjectId(u.userId)),
      },
      // 状态匹配：未到店/未报名等未转化状态
      status: { $in: triggerConditions.contractStatuses },
      // 持有时长超过阈值：
      //   已流转过 → 取 lastTransferredAt（上次分配给当前人的时间）
      //   未流转过 → 取 createdAt（线索创建时间）
      // 不管期间有没有互动，只要持有超时未转化就触发
      $or: [
        { lastTransferredAt: { $lt: thresholdTime } },
        { lastTransferredAt: { $exists: false }, createdAt: { $lt: thresholdTime } },
        { lastTransferredAt: null, createdAt: { $lt: thresholdTime } },
      ],
      inPublicPool: false,
      autoTransferEnabled: { $ne: false },
      // 排除转介绍线索
      leadSource: { $ne: '转介绍' },
    };

    if (triggerConditions.leadSources?.length) {
      query.leadSource = { $in: triggerConditions.leadSources };
    }

    if ((triggerConditions.maxTransferCount ?? 0) > 0) {
      query.$and = [
        ...(query.$and || []),
        { $or: [{ transferCount: { $exists: false } }, { transferCount: { $lt: triggerConditions.maxTransferCount } }] },
      ];
    }

    if ((triggerConditions.transferCooldownHours ?? 0) > 0) {
      const cooldown = new Date(Date.now() - triggerConditions.transferCooldownHours * 60 * 60 * 1000);
      query.$and = [
        ...(query.$and || []),
        { $or: [{ lastTransferredAt: { $exists: false } }, { lastTransferredAt: null }, { lastTransferredAt: { $lt: cooldown } }] },
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

    return this.leadModel
      .find(query)
      .sort({ lastActivityAt: 1, updatedAt: 1, _id: 1 })
      .limit(100)
      .exec();
  }

  /** 轮流发牌分配算法 */
  private calcRoundRobinAllocation(
    rule: LeadTransferRule,
    leads: TrainingLeadDocument[]
  ): Array<{ leadId: string; sourceUserId: string; targetUserId: string }> {
    const plan: Array<{ leadId: string; sourceUserId: string; targetUserId: string }> = [];
    const allLeads = leads.map(l => ({ leadId: l._id.toString(), sourceUserId: l.assignedTo?.toString() || '' }));

    // 打乱顺序
    for (let i = allLeads.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allLeads[i], allLeads[j]] = [allLeads[j], allLeads[i]];
    }

    const targetIds = rule.userQuotas
      .filter(u => u.role === 'target' || u.role === 'both')
      .map(u => u.userId.toString());

    if (!targetIds.length) return plan;

    let idx = 0;
    for (const lead of allLeads) {
      let attempts = 0;
      while (targetIds[idx % targetIds.length] === lead.sourceUserId && attempts < targetIds.length) {
        idx++;
        attempts++;
      }
      if (attempts >= targetIds.length) {
        this.logger.warn(`线索 ${lead.leadId} 找不到合适接收者，跳过`);
        continue;
      }
      plan.push({ leadId: lead.leadId, sourceUserId: lead.sourceUserId, targetUserId: targetIds[idx % targetIds.length] });
      idx++;
    }
    return plan;
  }

  /** 执行单条线索流转（原子操作） */
  private async transferLead(
    lead: TrainingLeadDocument,
    targetUserId: string,
    rule: LeadTransferRule,
  ): Promise<boolean> {
    const now = new Date();
    const oldAssignedTo = lead.assignedTo;
    // 持有时长 = 从上次分配（或创建）到现在的小时数
    const heldSince = (lead as any).lastTransferredAt || (lead as any).createdAt || lead.updatedAt;
    const inactiveHours = Math.floor((now.getTime() - heldSince.getTime()) / (1000 * 60 * 60));

    const cond: any = {
      _id: lead._id,
      assignedTo: oldAssignedTo,
      inPublicPool: false,
      autoTransferEnabled: { $ne: false },
    };

    const { maxTransferCount = 0, transferCooldownHours = 24 } = rule.triggerConditions;
    if (maxTransferCount > 0) {
      cond.$or = [{ transferCount: { $exists: false } }, { transferCount: { $lt: maxTransferCount } }];
    }
    if (transferCooldownHours > 0) {
      const cooldown = new Date(now.getTime() - transferCooldownHours * 60 * 60 * 1000);
      cond.$and = [
        ...(cond.$and || []),
        { $or: [{ lastTransferredAt: { $exists: false } }, { lastTransferredAt: null }, { lastTransferredAt: { $lt: cooldown } }] },
      ];
    }

    // 原子更新
    const result = await this.leadModel.updateOne(cond, {
      $set: {
        assignedTo: new Types.ObjectId(targetUserId),
        studentOwner: new Types.ObjectId(targetUserId),
        lastTransferredAt: now,
        status: LeadStatus.TRANSFER_NOT_FOLLOWED_UP,
      },
      $inc: { transferCount: 1 },
    });

    if (!result.modifiedCount) return false;

    // 写流转记录
    await this.recordModel.create([{
      ruleId: rule._id,
      leadId: lead._id,
      fromUserId: oldAssignedTo,
      toUserId: new Types.ObjectId(targetUserId),
      snapshot: {
        studentId: (lead as any).studentId,
        studentName: lead.name,
        leadStatus: lead.status,
        inactiveHours,
        lastActivityAt: heldSince,
        createdAt: (lead as any).createdAt,
        transferCount: (lead as any).transferCount ?? 0,
      },
      status: 'success',
      transferredAt: now,
    }]);

    // 更新规则配额统计（非关键）
    this.ruleService.updateUserQuota(rule._id.toString(), oldAssignedTo?.toString() || '', targetUserId).catch(e =>
      this.logger.warn(`更新配额失败（不影响流转）: ${e?.message}`)
    );

    const [oldUser, newUser] = await Promise.all([
      this.userModel.findById(oldAssignedTo).select('name').lean(),
      this.userModel.findById(targetUserId).select('name').lean(),
    ]);
    this.logger.log(`✅ ${lead.name} 从 ${(oldUser as any)?.name || '?'} → ${(newUser as any)?.name || '?'}`);
    return true;
  }

  /** 记录失败的流转 */
  private async recordFailed(lead: TrainingLeadDocument, targetUserId: string, rule: LeadTransferRule, error: any) {
    try {
      const heldSince = (lead as any).lastTransferredAt || (lead as any).createdAt || lead.updatedAt;
      const inactiveHours = Math.floor((Date.now() - heldSince.getTime()) / (1000 * 60 * 60));
      await this.recordModel.create([{
        ruleId: rule._id,
        leadId: lead._id,
        fromUserId: lead.assignedTo,
        toUserId: new Types.ObjectId(targetUserId),
        snapshot: {
          studentId: (lead as any).studentId,
          studentName: lead.name,
          leadStatus: lead.status,
          inactiveHours,
          lastActivityAt: heldSince,
          createdAt: (lead as any).createdAt,
          transferCount: (lead as any).transferCount ?? 0,
        },
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        transferredAt: new Date(),
      }]);
    } catch (e) {
      this.logger.error('记录失败流转日志出错:', e);
    }
  }

  /** 发送流转通知 */
  private async sendNotifications(userStats: any[], ruleName: string) {
    const timeStr = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    for (const stat of userStats) {
      try {
        if (stat.transferredOut > 0) {
          await this.notificationHelper.notifyTrainingLeadTransferOut(stat.userId, { count: stat.transferredOut, time: timeStr, ruleName });
        }
        if (stat.transferredIn > 0) {
          await this.notificationHelper.notifyTrainingLeadTransferIn(stat.userId, { count: stat.transferredIn, time: timeStr, ruleName });
        }
      } catch (e) {
        this.logger.error(`通知 ${stat.userName} 失败:`, e);
      }
    }
  }

  /** 获取分布式执行锁 */
  private async acquireLock(ruleId: string, ruleName: string): Promise<string | null> {
    const now = new Date();
    const lockToken = randomUUID();
    const lockExpiresAt = new Date(now.getTime() + this.lockTtlMs);

    const locked = await this.ruleModel.findOneAndUpdate(
      {
        _id: ruleId,
        $or: [
          { executionState: { $exists: false } },
          { 'executionState.lockExpiresAt': { $exists: false } },
          { 'executionState.lockExpiresAt': null },
          { 'executionState.lockExpiresAt': { $lte: now } },
        ],
      },
      { $set: { executionState: { lockToken, lockOwner: this.lockOwner, lockedAt: now, lockExpiresAt } } },
      { new: true }
    );

    if (!locked) {
      this.logger.warn(`规则 ${ruleName} 已被其他实例锁定，跳过`);
      return null;
    }
    return lockToken;
  }

  /** 释放执行锁 */
  private async releaseLock(ruleId: string, lockToken: string) {
    try {
      await this.ruleModel.updateOne(
        { _id: ruleId, 'executionState.lockToken': lockToken },
        { $unset: { executionState: 1 } }
      );
    } catch (e) {
      this.logger.error('释放规则锁失败:', e);
    }
  }

  /** 时间窗口检查 */
  private isInWindow(rule: LeadTransferRule): boolean {
    if (!rule.executionWindow?.enabled) return true;
    const now = new Date();
    const [sh, sm] = rule.executionWindow.startTime.split(':').map(Number);
    const [eh, em] = rule.executionWindow.endTime.split(':').map(Number);
    const cur = now.getHours() * 60 + now.getMinutes();
    return cur >= sh * 60 + sm && cur <= eh * 60 + em;
  }
}
