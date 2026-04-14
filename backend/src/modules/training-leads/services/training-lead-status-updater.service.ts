import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrainingLead, TrainingLeadDocument } from '../models/training-lead.model';
import { LeadStatus } from '../models/training-lead.model';
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class TrainingLeadStatusUpdaterService implements OnModuleInit {
  private readonly logger = new Logger(TrainingLeadStatusUpdaterService.name);
  private isRunning = false;

  constructor(
    @InjectModel(TrainingLead.name) private leadModel: Model<TrainingLeadDocument>,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    this.logger.log('✅ TrainingLeadStatusUpdaterService 已初始化');

    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      this.logger.warn('⚠️ 非生产环境，跳过注册学员线索状态推进定时任务');
      return;
    }

    const CronJob = require('cron').CronJob;

    const job = new CronJob(
      '30 * * * *', // 每小时30分执行（与自动流转任务错开）
      () => {
        this.executeStatusUpdate().catch(err => {
          this.logger.error('状态推进任务执行失败:', err);
        });
      },
      null,
      true,
      'Asia/Shanghai'
    );

    this.schedulerRegistry.addCronJob('training-lead-status-updater', job);
    this.logger.log(`✅ 学员线索状态推进任务已注册（每小时:30分执行），下次: ${job.nextDate().toJSDate().toLocaleString('zh-CN')}`);
  }

  /**
   * 执行状态自动推进
   * 规则：
   *   1. 新客未跟进 + 创建超48h 且 从未被跟进  → 入公海池
   *   2. 跟进中 / 未跟进         + lastActivityAt > 7天   → 7天未跟进
   *   3. 7天未跟进               + lastActivityAt > 15天  → 15天未跟进
   *   4. 流转未跟进              + lastTransferredAt > 48h → 入公海池
   */
  async executeStatusUpdate(): Promise<{ updated: number; pooled: number }> {
    if (this.isRunning) {
      this.logger.warn('⚠️ 状态推进任务正在执行中，跳过');
      return { updated: 0, pooled: 0 };
    }

    this.isRunning = true;
    this.logger.log('🔄 开始执行学员线索状态推进...');

    let totalUpdated = 0;
    let totalPooled = 0;

    try {
      const now = new Date();

      // ── 1. 新客未跟进 超48h → 公海池 ─────────────────────────────
      const newLeadThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const newLeadResult = await this.leadModel.updateMany(
        {
          status: LeadStatus.NEW_NOT_FOLLOWED_UP,
          inPublicPool: false,
          autoTransferEnabled: { $ne: false },
          $or: [
            { lastActivityAt: { $exists: false } },
            { lastActivityAt: null },
            { lastActivityAt: { $lt: newLeadThreshold } },
          ],
          createdAt: { $lt: newLeadThreshold },
        },
        {
          $set: {
            inPublicPool: true,
            publicPoolAt: now,
            publicPoolReason: 'auto_transfer',
            assignedTo: null,
            studentOwner: null,
          },
        }
      );
      totalPooled += newLeadResult.modifiedCount;
      if (newLeadResult.modifiedCount > 0) {
        this.logger.log(`📤 新客未跟进→公海池: ${newLeadResult.modifiedCount} 条`);
      }

      // ── 2. 跟进中 / 未跟进 超7天无活动 → 7天未跟进 ──────────────
      const sevenDayThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sevenDayResult = await this.leadModel.updateMany(
        {
          status: { $in: [LeadStatus.FOLLOWING, LeadStatus.NOT_FOLLOWED_UP] },
          inPublicPool: false,
          $or: [
            { lastActivityAt: { $lt: sevenDayThreshold } },
            { lastActivityAt: { $exists: false }, updatedAt: { $lt: sevenDayThreshold } },
            { lastActivityAt: null, updatedAt: { $lt: sevenDayThreshold } },
          ],
        },
        { $set: { status: LeadStatus.NOT_FOLLOWED_UP_7_DAYS } }
      );
      totalUpdated += sevenDayResult.modifiedCount;
      if (sevenDayResult.modifiedCount > 0) {
        this.logger.log(`⏰ 跟进中→7天未跟进: ${sevenDayResult.modifiedCount} 条`);
      }

      // ── 3. 7天未跟进 超15天无活动 → 15天未跟进 ──────────────────
      const fifteenDayThreshold = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const fifteenDayResult = await this.leadModel.updateMany(
        {
          status: LeadStatus.NOT_FOLLOWED_UP_7_DAYS,
          inPublicPool: false,
          $or: [
            { lastActivityAt: { $lt: fifteenDayThreshold } },
            { lastActivityAt: { $exists: false }, updatedAt: { $lt: fifteenDayThreshold } },
            { lastActivityAt: null, updatedAt: { $lt: fifteenDayThreshold } },
          ],
        },
        { $set: { status: LeadStatus.NOT_FOLLOWED_UP_15_DAYS } }
      );
      totalUpdated += fifteenDayResult.modifiedCount;
      if (fifteenDayResult.modifiedCount > 0) {
        this.logger.log(`⏰ 7天未跟进→15天未跟进: ${fifteenDayResult.modifiedCount} 条`);
      }

      // ── 4. 流转未跟进 超48h 仍无跟进 → 公海池 ────────────────────
      const transferThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const transferPoolResult = await this.leadModel.updateMany(
        {
          status: LeadStatus.TRANSFER_NOT_FOLLOWED_UP,
          inPublicPool: false,
          $or: [
            { lastActivityAt: { $lt: transferThreshold } },
            { lastActivityAt: { $exists: false }, lastTransferredAt: { $lt: transferThreshold } },
            { lastActivityAt: null, lastTransferredAt: { $lt: transferThreshold } },
          ],
        },
        {
          $set: {
            inPublicPool: true,
            publicPoolAt: now,
            publicPoolReason: 'auto_transfer',
            assignedTo: null,
            studentOwner: null,
          },
        }
      );
      totalPooled += transferPoolResult.modifiedCount;
      if (transferPoolResult.modifiedCount > 0) {
        this.logger.log(`📤 流转未跟进→公海池: ${transferPoolResult.modifiedCount} 条`);
      }

      this.logger.log(`✅ 状态推进完成: 更新 ${totalUpdated} 条，入池 ${totalPooled} 条`);
      return { updated: totalUpdated, pooled: totalPooled };
    } catch (error) {
      this.logger.error('❌ 状态推进任务失败:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}
