import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MiniProgramNotificationDocument = MiniProgramNotification & Document;

/**
 * 小程序通知类型枚举
 */
export enum MiniProgramNotificationType {
  CONTRACT_INVITE = 'contract_invite',       // 合同签约邀请
  CONTRACT_SIGNED = 'contract_signed',       // 合同签署完成
  PAYMENT_DONE = 'payment_done',             // 付款完成
  NANNY_CONFIRMED = 'nanny_confirmed',       // 阿姨确认上户
  CONTRACT_EXPIRING = 'contract_expiring',   // 合同即将到期
}

/**
 * 小程序通知 Model（褓贝小程序客户端用）
 * 与 CRM 内部通知系统独立，按手机号关联客户
 */
@Schema({ timestamps: true, collection: 'miniprogram_notifications' })
export class MiniProgramNotification {
  @Prop({ required: true, index: true })
  phone: string; // 用户手机号（关联 customer.phone）

  @Prop({ required: true, enum: Object.values(MiniProgramNotificationType) })
  type: MiniProgramNotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  contractId?: string; // 关联合同 ID（可选）

  @Prop({ type: Object, default: {} })
  extra: Record<string, any>; // 扩展字段（如剩余天数）

  @Prop({ default: false, index: true })
  isRead: boolean;

  // timestamps: true 自动生成 createdAt, updatedAt
}

export const MiniProgramNotificationSchema = SchemaFactory.createForClass(MiniProgramNotification);

// 复合索引：按手机号 + 已读状态 + 创建时间查询
MiniProgramNotificationSchema.index({ phone: 1, isRead: 1, createdAt: -1 });
// 用于定时任务去重：同一天同类型同合同不重复推送
MiniProgramNotificationSchema.index({ phone: 1, type: 1, contractId: 1, createdAt: -1 });
