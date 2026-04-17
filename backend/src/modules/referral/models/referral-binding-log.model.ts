import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReferralBindingLogDocument = ReferralBindingLog & Document;

export type ReassignType = 'manual' | 'departure' | 'review_timeout';

/**
 * 绑定关系变更审计日志 Collection: referral_binding_logs
 * 只可追加，不可删除
 */
@Schema({ timestamps: true, collection: 'referral_binding_logs' })
export class ReferralBindingLog {
  @Prop({ required: true })
  referralResumeId: string; // 关联的 referral_resumes._id（索引由底部 schema.index 定义）

  @Prop({ required: true })
  fromStaffId: string; // 原绑定员工ID

  @Prop({ required: true })
  toStaffId: string; // 新绑定员工ID

  @Prop({
    type: String,
    enum: ['manual', 'departure', 'review_timeout'],
    required: true,
    index: true,
  })
  reassignType: ReassignType; // 变更类型

  @Prop()
  staffDepartedAt?: Date; // 仅 departure 类型：员工离职日期（返费归属分割线）

  @Prop({ required: true })
  operatedBy: string; // 操作人ID（管理员ID 或 'system'）

  @Prop()
  reason?: string; // 干预原因（manual 类型必填；其余类型系统自动填写）
}

export const ReferralBindingLogSchema = SchemaFactory.createForClass(ReferralBindingLog);

ReferralBindingLogSchema.index({ referralResumeId: 1 });
ReferralBindingLogSchema.index({ fromStaffId: 1 });
ReferralBindingLogSchema.index({ toStaffId: 1 });
