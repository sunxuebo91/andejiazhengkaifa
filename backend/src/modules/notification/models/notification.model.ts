import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { NotificationType, NotificationPriority } from './notification-template.model';

/**
 * 通知状态
 */
export enum NotificationStatus {
  PENDING = 'PENDING',   // 待发送
  SENT = 'SENT',         // 已发送
  READ = 'READ',         // 已读
  FAILED = 'FAILED',     // 发送失败
}

/**
 * 通知记录
 */
@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId; // 接收用户ID

  @Prop({ type: String, required: true, enum: Object.values(NotificationType), index: true })
  type: NotificationType; // 通知类型

  @Prop({ type: String, required: true })
  title: string; // 通知标题

  @Prop({ type: String, required: true })
  content: string; // 通知内容

  @Prop({ type: String, enum: Object.values(NotificationPriority), default: NotificationPriority.MEDIUM })
  priority: NotificationPriority; // 优先级

  @Prop({ type: String, enum: Object.values(NotificationStatus), default: NotificationStatus.PENDING, index: true })
  status: NotificationStatus; // 状态

  @Prop({ type: Object })
  data: Record<string, any>; // 附加数据（用于模板变量替换和前端使用）

  @Prop()
  icon?: string; // 图标

  @Prop()
  color?: string; // 颜色

  @Prop()
  actionUrl?: string; // 点击跳转URL

  @Prop()
  actionText?: string; // 操作按钮文本

  @Prop()
  sentAt?: Date; // 发送时间

  @Prop()
  readAt?: Date; // 阅读时间

  @Prop({ default: 0 })
  retryCount: number; // 重试次数

  @Prop()
  errorMessage?: string; // 错误信息

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: MongooseSchema.Types.ObjectId; // 创建人（系统通知时使用）

  @Prop({ type: Object })
  metadata?: Record<string, any>; // 额外的元数据
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// 创建复合索引
NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ createdAt: -1 });

