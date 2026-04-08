import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import {
  MiniProgramNotification,
  MiniProgramNotificationDocument,
  MiniProgramNotificationType,
} from './models/miniprogram-notification.model';
import { QueryMiniProgramNotificationDto } from './dto/query-miniprogram-notification.dto';
import { Contract, ContractDocument } from '../contracts/models/contract.model';

@Injectable()
export class MiniProgramNotificationService {
  private readonly logger = new Logger(MiniProgramNotificationService.name);

  constructor(
    @InjectModel(MiniProgramNotification.name)
    private notificationModel: Model<MiniProgramNotificationDocument>,
    @InjectModel(Contract.name)
    private contractModel: Model<ContractDocument>,
  ) {}

  // ==================== 查询接口 ====================

  /**
   * 获取通知列表 + 未读数量
   */
  async findByPhone(query: QueryMiniProgramNotificationDto) {
    const { phone, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const filter = { phone };

    const [list, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
      this.notificationModel.countDocuments({ phone, isRead: false }).exec(),
    ]);

    return { list, total, unreadCount };
  }

  /**
   * 标记单条已读
   */
  async markAsRead(id: string, phone: string): Promise<boolean> {
    const result = await this.notificationModel.findOneAndUpdate(
      { _id: id, phone }, // phone 校验防止越权
      { isRead: true },
      { new: true },
    ).exec();
    return !!result;
  }

  /**
   * 全部已读
   */
  async markAllAsRead(phone: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { phone, isRead: false },
      { isRead: true },
    ).exec();
    return result.modifiedCount;
  }

  // ==================== 创建通知辅助方法 ====================

  /**
   * 创建通知（通用方法，供其他模块调用）
   */
  async createNotification(data: {
    phone: string;
    type: MiniProgramNotificationType;
    title: string;
    content: string;
    contractId?: string;
    extra?: Record<string, any>;
  }): Promise<MiniProgramNotificationDocument> {
    const notification = await this.notificationModel.create(data);
    this.logger.log(`📬 小程序通知已创建: [${data.type}] ${data.title} → ${data.phone}`);
    return notification;
  }

  // ==================== 便捷方法（按类型） ====================

  async notifyContractInvite(phone: string, contractId: string) {
    return this.createNotification({
      phone,
      type: MiniProgramNotificationType.CONTRACT_INVITE,
      title: '您有一份合同待签署',
      content: '安得褓贝邀请您签署服务合同，请尽快完成签署',
      contractId,
    });
  }

  async notifyContractSigned(phone: string, contractId: string, contractNumber: string) {
    return this.createNotification({
      phone,
      type: MiniProgramNotificationType.CONTRACT_SIGNED,
      title: '合同签署成功',
      content: `您的服务合同已签署完成，合同编号：${contractNumber}`,
      contractId,
    });
  }

  async notifyPaymentDone(phone: string, contractId: string, amountCents: number) {
    const amountYuan = (amountCents / 100).toFixed(2);
    return this.createNotification({
      phone,
      type: MiniProgramNotificationType.PAYMENT_DONE,
      title: '服务费支付成功',
      content: `服务费 ¥${amountYuan} 支付成功，感谢您的信任`,
      contractId,
    });
  }

  async notifyNannyConfirmed(phone: string, contractId: string, nannyName: string) {
    return this.createNotification({
      phone,
      type: MiniProgramNotificationType.NANNY_CONFIRMED,
      title: '阿姨已确认上户',
      content: `${nannyName}已确认上户，祝您服务顺心`,
      contractId,
    });
  }

  async notifyContractExpiring(phone: string, contractId: string, daysLeft: number) {
    return this.createNotification({
      phone,
      type: MiniProgramNotificationType.CONTRACT_EXPIRING,
      title: '合同即将到期',
      content: `您的合同将于 ${daysLeft} 天后到期，如需续签请联系顾问`,
      contractId,
      extra: { daysLeft },
    });
  }

  // ==================== 定时任务：合同到期提醒 ====================

  /**
   * 每天早上 9:00 检查 30 天内到期的合同，推送到期提醒
   */
  @Cron('0 0 9 * * *', { timeZone: 'Asia/Shanghai' })
  async checkExpiringContracts() {
    this.logger.log('⏰ 开始检查即将到期的合同...');

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      const thirtyDaysLater = new Date(todayStart.getTime() + 30 * 24 * 60 * 60 * 1000);

      // 查询 1~30 天内到期的生效中合同
      const expiringContracts = await this.contractModel.find({
        contractStatus: 'active',
        endDate: { $gte: tomorrow, $lte: thirtyDaysLater },
        customerPhone: { $exists: true, $ne: null },
      }).lean().exec();

      this.logger.log(`📋 发现 ${expiringContracts.length} 份即将到期的合同`);

      let sentCount = 0;
      for (const contract of expiringContracts) {
        const phone = (contract as any).customerPhone;
        const contractId = (contract as any)._id.toString();

        // 去重：今天是否已推送过该合同的到期提醒
        const existingToday = await this.notificationModel.findOne({
          phone,
          type: MiniProgramNotificationType.CONTRACT_EXPIRING,
          contractId,
          createdAt: { $gte: todayStart },
        }).exec();

        if (existingToday) continue;

        // 计算剩余天数
        const endDate = new Date((contract as any).endDate);
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        await this.notifyContractExpiring(phone, contractId, daysLeft);
        sentCount++;
      }

      this.logger.log(`✅ 合同到期提醒完成，发送 ${sentCount} 条通知`);
    } catch (error) {
      this.logger.error('❌ 合同到期提醒任务失败:', error.message);
    }
  }
}
