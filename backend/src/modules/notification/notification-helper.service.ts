import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationType } from './models/notification-template.model';

/**
 * 通知辅助服务 - 提供业务场景的快捷通知方法
 */
@Injectable()
export class NotificationHelperService {
  private readonly logger = new Logger(NotificationHelperService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * 发送通知并实时推送
   */
  private async sendAndPush(userIds: string[], type: NotificationType, data: Record<string, any>) {
    try {
      // 1. 创建通知记录
      const notifications = await this.notificationService.send({
        userIds,
        type,
        data,
      });

      // 2. 实时推送
      for (const notification of notifications) {
        await this.notificationGateway.sendToUser(
          notification.userId.toString(),
          notification
        );

        // 3. 更新未读数量
        const unreadCount = await this.notificationService.getUnreadCount(
          notification.userId.toString()
        );
        await this.notificationGateway.sendUnreadCount(
          notification.userId.toString(),
          unreadCount
        );
      }

      return notifications;
    } catch (error) {
      this.logger.error(`发送通知失败: ${error.message}`, error.stack);
      // 不抛出错误，避免影响主业务流程
      return [];
    }
  }

  // ========== 简历相关通知 ==========

  /**
   * 新简历创建通知
   */
  async notifyResumeCreated(adminUserIds: string[], data: {
    resumeId: string;
    resumeName: string;
    phone: string;
    jobType: string;
    creatorName: string;
  }) {
    return this.sendAndPush(adminUserIds, NotificationType.RESUME_CREATED, data);
  }

  /**
   * 简历分配通知
   */
  async notifyResumeAssigned(userId: string, data: {
    resumeId: string;
    resumeName: string;
  }) {
    return this.sendAndPush([userId], NotificationType.RESUME_ASSIGNED, data);
  }

  // ========== 客户相关通知 ==========

  /**
   * 新客户创建通知
   */
  async notifyCustomerCreated(adminUserIds: string[], data: {
    customerId: string;
    customerName: string;
    phone: string;
    leadSource: string;
    creatorName: string;
  }) {
    return this.sendAndPush(adminUserIds, NotificationType.CUSTOMER_CREATED, data);
  }

  /**
   * 客户分配通知
   */
  async notifyCustomerAssigned(userId: string, data: {
    customerId: string;
    customerName: string;
    phone: string;
    leadSource: string;
  }) {
    return this.sendAndPush([userId], NotificationType.CUSTOMER_ASSIGNED, data);
  }

  /**
   * 客户转移通知
   */
  async notifyCustomerTransferred(newUserId: string, data: {
    customerId: string;
    customerName: string;
    oldOwner: string;
  }) {
    return this.sendAndPush([newUserId], NotificationType.CUSTOMER_TRANSFERRED, data);
  }

  /**
   * 客户回收通知
   */
  async notifyCustomerReclaimed(oldUserId: string, data: {
    customerName: string;
    reason: string;
  }) {
    return this.sendAndPush([oldUserId], NotificationType.CUSTOMER_RECLAIMED, data);
  }

  /**
   * 从公海分配客户通知
   */
  async notifyCustomerAssignedFromPool(userId: string, data: {
    customerId: string;
    customerName: string;
  }) {
    return this.sendAndPush([userId], NotificationType.CUSTOMER_ASSIGNED_FROM_POOL, data);
  }

  // ========== 合同相关通知 ==========

  /**
   * 合同创建通知
   */
  async notifyContractCreated(userIds: string[], data: {
    contractId: string;
    contractNumber: string;
    customerName: string;
  }) {
    return this.sendAndPush(userIds, NotificationType.CONTRACT_CREATED, data);
  }

  /**
   * 合同签署完成通知
   */
  async notifyContractSigned(userIds: string[], data: {
    contractId: string;
    contractNumber: string;
    customerName: string;
  }) {
    return this.sendAndPush(userIds, NotificationType.CONTRACT_SIGNED, data);
  }

  /**
   * 合同换人通知
   */
  async notifyContractWorkerChanged(userIds: string[], data: {
    contractId: string;
    customerName: string;
    oldWorker: string;
    newWorker: string;
  }) {
    return this.sendAndPush(userIds, NotificationType.CONTRACT_WORKER_CHANGED, data);
  }
}

