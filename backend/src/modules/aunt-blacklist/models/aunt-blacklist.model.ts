import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuntBlacklistDocument = AuntBlacklist & Document;

export type BlacklistStatus = 'active' | 'released';

export type BlacklistReasonType =
  | 'fraud'               // 诈骗/欺骗
  | 'serious_complaint'   // 严重投诉
  | 'work_quality'        // 工作质量恶劣
  | 'contract_breach'     // 严重违约
  | 'other';              // 其他

export type BlacklistSourceType = 'resume' | 'referral' | 'manual';

export interface BlacklistEvidence {
  url: string;
  filename?: string;
  size?: number;
  mimetype?: string;
}

/**
 * 阿姨黑名单 Collection: aunt_blacklists
 *
 * 独立集合承担"不可发起合同/不可录入"的单一事实源：
 * - 简历库、推荐库录入时反查本表（status=active）；
 * - 合同创建（含换人）时反查本表；
 * - 仅 admin 角色可执行 release 操作。
 *
 * 匹配口径：phone 或 idCard 任一命中。
 */
@Schema({ timestamps: true, collection: 'aunt_blacklists' })
export class AuntBlacklist {
  @Prop({ required: true })
  name: string; // 阿姨姓名（冗余便于展示）

  @Prop()
  phone?: string; // 手机号（索引由 schema.index 定义）

  @Prop()
  idCard?: string; // 身份证号（索引由 schema.index 定义）

  @Prop({ required: true })
  reason: string; // 拉黑原因说明（自由文本，必填）

  @Prop({
    type: String,
    enum: ['fraud', 'serious_complaint', 'work_quality', 'contract_breach', 'other'],
    required: true,
    default: 'other',
  })
  reasonType: BlacklistReasonType;

  @Prop({ type: [Object], default: [] })
  evidence: BlacklistEvidence[]; // 证据材料（截图/录音等）

  @Prop({
    type: String,
    enum: ['resume', 'referral', 'manual'],
    default: 'manual',
  })
  sourceType: BlacklistSourceType; // 来源渠道

  @Prop()
  sourceResumeId?: string; // 来源简历 resumes._id（从简历库一键拉黑时回填）

  @Prop()
  sourceReferralResumeId?: string; // 来源推荐记录 referral_resumes._id

  @Prop({
    type: String,
    enum: ['active', 'released'],
    default: 'active',
    index: true,
  })
  status: BlacklistStatus;

  @Prop({ required: true })
  operatorId: string; // 拉黑操作人 users._id

  @Prop()
  operatorName?: string; // 冗余便于列表展示

  @Prop()
  releasedBy?: string; // 释放人 users._id（仅 admin 可写）

  @Prop()
  releasedByName?: string; // 冗余便于展示

  @Prop()
  releasedAt?: Date;

  @Prop()
  releaseReason?: string; // 释放原因（释放时必填）

  @Prop()
  remarks?: string; // 内部备注
}

export const AuntBlacklistSchema = SchemaFactory.createForClass(AuntBlacklist);

// 复合索引：按 (phone, status) / (idCard, status) 查询 active 记录
AuntBlacklistSchema.index({ phone: 1, status: 1 });
AuntBlacklistSchema.index({ idCard: 1, status: 1 });
AuntBlacklistSchema.index({ operatorId: 1 });
AuntBlacklistSchema.index({ createdAt: -1 });
