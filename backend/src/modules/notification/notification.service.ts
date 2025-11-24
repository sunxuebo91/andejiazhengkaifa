import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationStatus } from './models/notification.model';
import { NotificationTemplate, NotificationType, NotificationPriority } from './models/notification-template.model';
import { CreateNotificationDto, SendNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto, MarkReadDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(NotificationTemplate.name)
    private templateModel: Model<NotificationTemplate>,
  ) {}

  /**
   * 发送通知（核心方法）
   */
  async send(dto: SendNotificationDto): Promise<Notification[]> {
    try {
      // 1. 获取通知模板
      const template = await this.templateModel.findOne({ 
        type: dto.type,
        enabled: true 
      }).lean();

      if (!template) {
        this.logger.warn(`通知模板不存在或未启用: ${dto.type}`);
        return [];
      }

      // 2. 渲染模板
      const title = this.renderTemplate(template.title, dto.data);
      const content = this.renderTemplate(template.content, dto.data);
      const actionUrl = template.actionUrl ? this.renderTemplate(template.actionUrl, dto.data) : undefined;

      // 3. 批量创建通知记录
      const notifications = dto.userIds.map(userId => ({
        userId: new Types.ObjectId(userId),
        type: dto.type,
        title,
        content,
        priority: dto.priority || template.priority,
        status: NotificationStatus.SENT,
        data: dto.data,
        icon: template.icon,
        color: template.color,
        actionUrl,
        actionText: template.actionText,
        sentAt: new Date(),
        retryCount: 0,
      }));

      const created = await this.notificationModel.insertMany(notifications);

      this.logger.log(`成功发送 ${created.length} 条通知，类型: ${dto.type}`);

      return created as any;
    } catch (error) {
      this.logger.error(`发送通知失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 模板渲染引擎
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * 查询用户的通知列表
   */
  async findByUser(userId: string, query: QueryNotificationDto) {
    const { page = 1, pageSize = 20, type, status, startDate, endDate } = query;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const filter: any = { userId: new Types.ObjectId(userId) };
    
    if (type) {
      filter.type = type;
    }
    
    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // 查询
    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取未读数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      status: { $in: [NotificationStatus.SENT, NotificationStatus.PENDING] },
    }).exec();
  }

  /**
   * 标记为已读
   */
  async markAsRead(userId: string, dto: MarkReadDto): Promise<number> {
    const result = await this.notificationModel.updateMany(
      {
        _id: { $in: dto.notificationIds.map(id => new Types.ObjectId(id)) },
        userId: new Types.ObjectId(userId),
        status: { $ne: NotificationStatus.READ },
      },
      {
        $set: {
          status: NotificationStatus.READ,
          readAt: new Date(),
        },
      }
    ).exec();

    this.logger.log(`用户 ${userId} 标记了 ${result.modifiedCount} 条通知为已读`);
    return result.modifiedCount;
  }

  /**
   * 标记全部为已读
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        status: { $ne: NotificationStatus.READ },
      },
      {
        $set: {
          status: NotificationStatus.READ,
          readAt: new Date(),
        },
      }
    ).exec();

    this.logger.log(`用户 ${userId} 标记了全部 ${result.modifiedCount} 条通知为已读`);
    return result.modifiedCount;
  }
}

