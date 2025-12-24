import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

// 被保险人信息
@Schema({ _id: false })
export class InsuredPerson {
  @Prop()
  insuredId?: string;

  @Prop({ required: true })
  insuredName: string;

  @Prop({ enum: ['1', '2', '3'], default: '1' }) // 1-成人, 2-儿童, 3-老人
  insuredType: string;

  @Prop({ required: true, enum: ['1', '2', '3', '4', '5', '6', '7', '8'] }) // 证件类型
  idType: string;

  @Prop({ required: true })
  idNumber: string;

  @Prop()
  birthDate?: string; // yyyyMMddHHmmss

  @Prop({ enum: ['M', 'F', 'O'] })
  gender?: string;

  @Prop()
  mobile?: string;

  @Prop()
  email?: string;

  @Prop()
  occupationCode?: string;

  @Prop()
  occupationName?: string;

  @Prop({ enum: ['1', '2', '3', '4'] }) // 1-法定, 2-顺位, 3-均分, 4-比例
  beneficialType?: string;

  @Prop()
  relationShip?: string; // 与投保人关系
}

export const InsuredPersonSchema = SchemaFactory.createForClass(InsuredPerson);

// 投保人信息
@Schema({ _id: false })
export class PolicyHolder {
  @Prop({ required: true, enum: ['I', 'C'] }) // I-个人(Individual), C-企业或机构(Company)
  policyHolderType: string;

  @Prop({ required: true })
  policyHolderName: string;

  @Prop({ required: true })
  phIdType: string;

  @Prop({ required: true })
  phIdNumber: string;

  @Prop()
  phBirthDate?: string;

  @Prop({ enum: ['M', 'F', 'O'] })
  gender?: string;

  @Prop()
  phTelephone?: string;

  @Prop()
  phAddress?: string;

  @Prop()
  phPostCode?: string;

  @Prop()
  phEmail?: string;

  @Prop({ default: '0' }) // 是否打印发票
  reqFaPiao?: string;

  @Prop({ default: '0' }) // 是否邮寄发票
  reqMail?: string;

  @Prop({ enum: ['1', '2'] }) // 1-平邮, 2-快递
  mailType?: string;

  @Prop()
  phProvinceCode?: string;

  @Prop()
  phCityCode?: string;

  @Prop()
  phDistrictCode?: string;
}

export const PolicyHolderSchema = SchemaFactory.createForClass(PolicyHolder);

// 返佣信息
@Schema({ _id: false })
export class RebateInfo {
  @Prop()
  rebateRate?: number;

  @Prop()
  rebateCusName?: string;

  @Prop()
  rebateCusIdNo?: string;

  @Prop()
  rebateAccountNo?: string;

  @Prop()
  rebateBankKeepMobile?: string;

  @Prop()
  rebateDelayDays?: number;

  @Prop()
  rebateMoney?: string;

  @Prop()
  executeDate?: string;

  @Prop()
  taskState?: string;
}

export const RebateInfoSchema = SchemaFactory.createForClass(RebateInfo);

// 保单状态枚举
export enum PolicyStatus {
  PENDING = 'pending',         // 待支付
  PROCESSING = 'processing',   // 处理中
  ACTIVE = 'active',           // 已生效
  EXPIRED = 'expired',         // 已过期
  CANCELLED = 'cancelled',     // 已注销
  SURRENDERED = 'surrendered', // 已退保
}

// 保险记录实体
@Schema({ timestamps: true, collection: 'insurance_policies' })
export class InsurancePolicy {
  @ApiProperty({ description: '渠道流水号（唯一标识）' })
  @Prop({ required: true, unique: true, index: true })
  agencyPolicyRef: string;

  @ApiProperty({ description: '大树保保单号' })
  @Prop({ index: true })
  policyNo?: string;

  @ApiProperty({ description: '大树保订单ID' })
  @Prop()
  orderId?: string;

  @ApiProperty({ description: '产品代码' })
  @Prop()
  productCode?: string;

  @ApiProperty({ description: '计划代码' })
  @Prop({ required: true })
  planCode: string;

  @ApiProperty({ description: '出单日期' })
  @Prop()
  issueDate?: string;

  @ApiProperty({ description: '生效日期' })
  @Prop({ required: true })
  effectiveDate: string;

  @ApiProperty({ description: '结束日期' })
  @Prop({ required: true })
  expireDate: string;

  @ApiProperty({ description: '被保险人数量' })
  @Prop({ required: true })
  groupSize: number;

  @ApiProperty({ description: '总保费' })
  @Prop({ required: true })
  totalPremium: number;

  @ApiProperty({ description: '保费计算方式' })
  @Prop()
  premiumCalType?: string;

  @ApiProperty({ description: '目的地' })
  @Prop()
  destination?: string;

  @ApiProperty({ description: '备注' })
  @Prop()
  remark?: string;

  @ApiProperty({ description: '服务地址（工单险必传）' })
  @Prop()
  serviceAddress?: string;

  @ApiProperty({ description: '订单编号（工单险必传）' })
  @Prop()
  workOrderId?: string;

  @ApiProperty({ description: '投保人信息' })
  @Prop({ type: PolicyHolderSchema, required: true })
  policyHolder: PolicyHolder;

  @ApiProperty({ description: '被保险人列表' })
  @Prop({ type: [InsuredPersonSchema], required: true })
  insuredList: InsuredPerson[];

  @ApiProperty({ description: '返佣信息' })
  @Prop({ type: RebateInfoSchema })
  rebateInfo?: RebateInfo;

  @ApiProperty({ description: '保单状态' })
  @Prop({ enum: PolicyStatus, default: PolicyStatus.PENDING, index: true })
  status: PolicyStatus;

  @ApiProperty({ description: '电子保单URL' })
  @Prop()
  policyPdfUrl?: string;

  @ApiProperty({ description: '实名认证URL' })
  @Prop()
  authUrl?: string;

  @ApiProperty({ description: '微信支付相关信息' })
  @Prop({ type: Object })
  wechatPayInfo?: {
    appId?: string;
    timeStamp?: string;
    nonceStr?: string;
    packageValue?: string;
    sign?: string;
    prepayId?: string;
    webUrl?: string;
  };

  @ApiProperty({ description: '关联的阿姨简历ID' })
  @Prop({ type: Types.ObjectId, ref: 'Resume', index: true })
  resumeId?: Types.ObjectId;

  @ApiProperty({ description: '创建人ID' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @ApiProperty({ description: '错误信息' })
  @Prop()
  errorMessage?: string;

  @ApiProperty({ description: '大树保原始响应' })
  @Prop({ type: Object })
  rawResponse?: Record<string, any>;
}

export type InsurancePolicyDocument = InsurancePolicy & Document;
export const InsurancePolicySchema = SchemaFactory.createForClass(InsurancePolicy);

// 索引
InsurancePolicySchema.index({ createdAt: -1 });
InsurancePolicySchema.index({ resumeId: 1, status: 1 });
InsurancePolicySchema.index({ policyHolder: 1 });

