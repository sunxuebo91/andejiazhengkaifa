import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReferrerDocument = Referrer & Document;

export type ReferrerApprovalStatus = 'pending_approval' | 'approved' | 'rejected';

/**
 * 推荐人档案 Collection: referrers
 */
@Schema({ timestamps: true, collection: 'referrers' })
export class Referrer {
  @Prop({ required: true })
  openid: string; // 微信 openid

  @Prop({ required: true })
  name: string; // 真实姓名

  @Prop({ required: true })
  phone: string; // 手机号（唯一索引由底部 schema.index 定义）

  @Prop()
  wechatId?: string; // 微信号，用于接收返费（可选，管理员创建时可以后填）

  @Prop()
  idCard?: string; // 身份证号

  @Prop()
  bankCardNumber?: string; // 银行卡号

  @Prop()
  bankName?: string; // 开户行

  @Prop({ required: true })
  sourceStaffId: string; // 来源员工ID（扫哪位员工的海报），对应 CRM users._id

  @Prop()
  sourceCustomerId?: string; // 来源客户ID（扫码海报时携带的客户上下文），对应 CRM customers._id

  @Prop({
    type: String,
    enum: ['pending_approval', 'approved', 'rejected'],
    default: 'pending_approval',
  })
  approvalStatus: ReferrerApprovalStatus; // 审批状态

  @Prop()
  approvedBy?: string; // 审批通过的管理员 openid

  @Prop()
  approvedAt?: Date; // 审批通过时间

  @Prop()
  rejectedReason?: string; // 拒绝原因

  @Prop({ default: 0 })
  totalReferrals: number; // 累计推荐数

  @Prop({ default: 0 })
  totalRewardAmount: number; // 累计已获返费金额（元）

  @Prop({ type: String, enum: ['active', 'disabled'], default: 'active' })
  status: 'active' | 'disabled'; // 推荐人状态
}

export const ReferrerSchema = SchemaFactory.createForClass(Referrer);

// 唯一索引：手机号防重复注册
ReferrerSchema.index({ phone: 1 }, { unique: true });
ReferrerSchema.index({ openid: 1 });
ReferrerSchema.index({ approvalStatus: 1 });
ReferrerSchema.index({ sourceStaffId: 1 });
