import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReferralRewardDocument = ReferralReward & Document;

/**
 * 返费打款记录 Collection: referral_rewards
 */
@Schema({ timestamps: true, collection: 'referral_rewards' })
export class ReferralReward {
  @Prop({ required: true })
  referralResumeId: string; // 关联 referral_resumes._id（索引由底部 schema.index 定义）

  @Prop({ required: true })
  assignedStaffId: string; // 绑定员工ID（复合索引由底部 schema.index 定义）

  @Prop({ required: true })
  referrerId: string; // 推荐人ID

  @Prop({ required: true })
  referrerPhone: string; // 推荐人手机号

  @Prop()
  referrerWechatId?: string; // 推荐人微信号（可选）

  @Prop({ required: true })
  amount: number; // 返费金额（元）

  @Prop({
    type: String,
    enum: ['reviewing', 'paid', 'rejected'],
    default: 'reviewing',
    index: true,
  })
  status: 'reviewing' | 'paid' | 'rejected';

  @Prop()
  reviewedBy?: string; // 审核员工ID

  @Prop()
  paidAt?: Date; // 打款时间

  @Prop()
  paidBy?: string; // 打款操作员ID

  @Prop()
  remark?: string; // 审核备注
}

export const ReferralRewardSchema = SchemaFactory.createForClass(ReferralReward);

ReferralRewardSchema.index({ referralResumeId: 1 });
ReferralRewardSchema.index({ assignedStaffId: 1, status: 1 });
ReferralRewardSchema.index({ referrerId: 1 });
