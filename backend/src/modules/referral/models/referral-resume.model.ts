import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReferralResumeDocument = ReferralResume & Document;

export type ReferralReviewStatus = 'pending_review' | 'approved' | 'rejected' | 'activated';
export type ReferralStatus =
  | 'pending_review'
  | 'rejected'
  | 'following_up'
  | 'contracted'
  | 'onboarded'
  | 'reward_pending'
  | 'reward_approved'   // 返费待打款（员工审核通过，等待财务打款）
  | 'reward_paid'
  | 'invalid'
  | 'activated'         // 简历已存在，推荐激活标记，无需审核
  | 'released';         // 已手动释放到简历库（由 assignedStaff/管理员点击释放按钮触发）
export type ReferralRewardStatus = 'pending' | 'reviewing' | 'approved' | 'paid' | 'rejected';

/**
 * 推荐提交的阿姨简历 Collection: referral_resumes
 */
@Schema({ timestamps: true, collection: 'referral_resumes' })
export class ReferralResume {
  @Prop({ required: true, index: true })
  referrerId: string; // 推荐人 referrers._id

  @Prop({ required: true })
  referrerPhone: string; // 推荐人手机号（冗余）

  @Prop()
  referrerName?: string; // 推荐人姓名（冗余，列表展示用）

  @Prop({ required: true })
  name: string; // 被推荐阿姨姓名

  @Prop()
  phone?: string; // 被推荐阿姨手机号（索引由底部 schema.index sparse 定义）

  @Prop()
  idCard?: string; // 被推荐阿姨身份证号（索引由底部 schema.index sparse 定义）

  @Prop()
  customerId?: string; // 关联客户ID（来源客户扫码推荐时携带，对应 CRM customers._id，索引由底部 schema.index 定义）

  @Prop({ required: true })
  serviceType: string; // 服务类型：月嫂/育婴嫂/保姆/护老/小时工

  @Prop()
  experience?: string; // 从业经验描述

  @Prop()
  remark?: string; // 推荐人备注

  @Prop({ required: true, index: true })
  assignedStaffId: string; // 当前绑定员工ID（CRM users._id），唯一有审核/跟进权的员工

  @Prop()
  rewardOwnerStaffId?: string; // 返费归属员工ID（合同签署时快照，索引由底部 schema.index 定义）

  @Prop({
    type: String,
    enum: ['pending_review', 'approved', 'rejected', 'activated'],
    default: 'pending_review',
    index: true,
  })
  reviewStatus: ReferralReviewStatus;

  @Prop()
  reviewDeadlineAt?: Date; // 审核截止时间（提交时间+24h，索引由底部 schema.index 定义）

  @Prop()
  reviewedAt?: Date; // 实际审核时间

  @Prop()
  reviewedBy?: string; // 审核员工ID

  @Prop()
  reviewNote?: string; // 审核备注（拒绝时必填）

  @Prop({
    type: String,
    enum: ['pending_review', 'rejected', 'following_up', 'contracted', 'onboarded', 'reward_pending', 'reward_approved', 'reward_paid', 'invalid', 'activated', 'released'],
    default: 'pending_review',
    index: true,
  })
  status: ReferralStatus;

  @Prop()
  releasedAt?: Date; // 手动释放到简历库的时间

  @Prop()
  releasedBy?: string; // 执行释放操作的员工ID

  @Prop()
  contractId?: string; // 关联合同ID（签单后CRM回填）

  @Prop()
  contractSignedAt?: Date; // 合同签署时间

  @Prop()
  onboardedAt?: Date; // 上户时间（CRM回填）

  @Prop()
  serviceFee?: number; // 合同服务费（元）

  @Prop()
  rewardAmount?: number; // 返费金额（元）

  @Prop()
  rewardExpectedAt?: Date; // 预计到账日期（签单日+30天）

  @Prop()
  rewardPaidAt?: Date; // 实际打款日期

  @Prop({
    type: String,
    enum: ['pending', 'reviewing', 'approved', 'paid', 'rejected'],
    default: 'pending',
  })
  rewardStatus: ReferralRewardStatus;

  // ── 结算申请收款信息（推荐人在小程序提交，随结算申请保存）──────────────
  @Prop()
  payeeName?: string;       // 收款人姓名

  @Prop()
  payeePhone?: string;      // 收款人手机号

  @Prop()
  bankCard?: string;        // 银行卡号

  @Prop()
  bankName?: string;        // 开户行名称

  @Prop()
  settlementAppliedAt?: Date; // 推荐人提交结算申请的时间

  /** 审核通过后入库的简历 ID（resumes._id），去重时指向已有简历 */
  @Prop({ sparse: true })
  linkedResumeId?: string;

  /** 小程序云数据库中的原始 _id（用于防止重复从云DB导入） */
  @Prop({ sparse: true })
  cloudDbId?: string;
}

export const ReferralResumeSchema = SchemaFactory.createForClass(ReferralResume);

ReferralResumeSchema.index({ assignedStaffId: 1, reviewStatus: 1 });
ReferralResumeSchema.index({ assignedStaffId: 1, status: 1 });
ReferralResumeSchema.index({ rewardOwnerStaffId: 1 });
ReferralResumeSchema.index({ reviewDeadlineAt: 1 });
ReferralResumeSchema.index({ phone: 1 }, { sparse: true });
ReferralResumeSchema.index({ idCard: 1 }, { sparse: true });
ReferralResumeSchema.index({ customerId: 1 }, { sparse: true });
ReferralResumeSchema.index({ cloudDbId: 1 }, { sparse: true, unique: true });
