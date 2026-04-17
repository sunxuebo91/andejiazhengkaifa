import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MiniProgramNotificationDocument = MiniProgramNotification & Document;

/**
 * 小程序通知类型枚举
 */
export enum MiniProgramNotificationType {
  // ── 褓贝客户端（合同/支付） ─────────────────────────────────
  CONTRACT_INVITE = 'contract_invite',       // 合同签约邀请
  CONTRACT_SIGNED = 'contract_signed',       // 合同签署完成
  PAYMENT_DONE = 'payment_done',             // 付款完成
  NANNY_CONFIRMED = 'nanny_confirmed',       // 阿姨确认上户
  CONTRACT_EXPIRING = 'contract_expiring',   // 合同即将到期

  // ── 推荐奖励系统（推荐人小程序端） ─────────────────────────
  REFERRAL_NEW_REFERRER = 'referral_new_referrer',   // 新推荐人申请（通知员工/管理员）
  REFERRAL_APPROVED = 'referral_approved',           // 推荐人申请已通过（通知推荐人）
  REFERRAL_REJECTED = 'referral_rejected',           // 推荐人申请未通过（通知推荐人）
  REFERRAL_SUBMITTED = 'referral_submitted',         // 新推荐简历提交（通知绑定员工）
  REFERRAL_REVIEW_RESULT = 'referral_review_result', // 简历审核结果（通知推荐人）
  REFERRAL_REASSIGNED = 'referral_reassigned',       // 推荐记录重新分配（通知员工）
  REFERRAL_TIMEOUT = 'referral_timeout',             // 超时未审核，自动流转（通知员工/管理员）
  REFERRAL_REWARD_PAID = 'referral_reward_paid',     // 返费已打款（通知推荐人）
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
