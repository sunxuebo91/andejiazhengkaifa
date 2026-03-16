import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BackgroundCheckDocument = BackgroundCheck & Document;

@Schema({ timestamps: true })
export class BackgroundCheck {
  @Prop()
  reportId?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  mobile: string;

  @Prop()
  idNo?: string;

  @Prop()
  position?: string;

  @Prop()
  hrName?: string;

  @Prop()
  stuffId?: string;

  @Prop()
  authStuffUrl?: string;

  @Prop()
  esignContractNo?: string;

  @Prop({ default: '1' })
  packageType?: string; // 套餐类型: '1' = 标准版, '2' = 深度版

  @Prop({ default: 0 })
  status: number;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({
    type: [{ notifyType: Number, status: Number, receivedAt: Date }],
    default: [],
  })
  callbackHistory: Array<{ notifyType: number; status: number; receivedAt: Date }>;

  // 关联合同ID（通过身份证号自动关联）
  @Prop({ type: Types.ObjectId, ref: 'Contract' })
  contractId?: Types.ObjectId;

  // 背调报告风险结果（status=4/16 完成后自动拉取）
  @Prop({
    type: {
      riskLevel: String,
      riskScore: Number,
      failNum: Number,
      summary: String,
      identityRiskLevel: String,
      socialRiskLevel: String,
      courtRiskLevel: String,
      financeRiskLevel: String,
      digestList: [{ name: String, risk: String, result: String, remark: String }],
      fetchedAt: Date,
    },
  })
  reportResult?: {
    riskLevel: string;
    riskScore: number;
    failNum: number;
    summary: string;
    identityRiskLevel: string;
    socialRiskLevel: string;
    courtRiskLevel: string;
    financeRiskLevel: string;
    digestList: Array<{ name: string; risk: string; result: string; remark: string }>;
    fetchedAt: Date;
  };
}

export const BackgroundCheckSchema = SchemaFactory.createForClass(BackgroundCheck);

BackgroundCheckSchema.index({ reportId: 1 }, { sparse: true });
BackgroundCheckSchema.index({ createdAt: -1 });
BackgroundCheckSchema.index({ idNo: 1 }); // 添加身份证号索引，用于快速查询
BackgroundCheckSchema.index({ contractId: 1 }); // 添加合同ID索引
