import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContractDocument = Contract & Document;

export enum ContractType {
  YUEXIN = '月嫂',
  ZHUJIA_YUER = '住家育儿嫂',
  BAOJIE = '保洁',
  ZHUJIA_BAOMU = '住家保姆',
  YANGCHONG = '养宠',
  XIAOSHI = '小时工',
  BAIBAN_YUER = '白班育儿',
  BAIBAN_BAOMU = '白班保姆',
  ZHUJIA_HULAO = '住家护老'
}

@Schema({ timestamps: true })
export class Contract {
  @Prop({ required: true, unique: true })
  contractNumber: string; // 合同编号，自动生成

  @Prop({ required: true })
  customerName: string; // 客户姓名

  @Prop({ required: true })
  customerPhone: string; // 客户手机号

  @Prop()
  customerIdCard?: string; // 客户身份证号

  @Prop({ required: true, enum: ContractType })
  contractType: ContractType; // 合同类型

  @Prop({ required: true })
  startDate: Date; // 开始时间

  @Prop({ required: true })
  endDate: Date; // 结束时间

  @Prop({ required: true })
  workerName: string; // 劳动者姓名

  @Prop({ required: true })
  workerPhone: string; // 劳动者电话

  @Prop({ required: true })
  workerIdCard: string; // 劳动者身份证号

  @Prop({ required: true })
  workerSalary: number; // 家政员工资

  @Prop({ required: true })
  customerServiceFee: number; // 客户服务费

  @Prop()
  workerServiceFee?: number; // 家政员服务费（选填）

  @Prop()
  deposit?: number; // 约定定金（选填）

  @Prop()
  finalPayment?: number; // 约定尾款（选填）

  @Prop()
  expectedDeliveryDate?: Date; // 预产期（选填）

  @Prop({ min: 1, max: 31 })
  salaryPaymentDay?: number; // 工资发放日（1-31）（选填）

  @Prop()
  remarks?: string; // 备注（选填）

  @Prop({ min: 1, max: 31 })
  monthlyWorkDays?: number; // 月工作天数（1-31）（选填）

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId; // 关联客户ID

  @Prop({ type: Types.ObjectId, ref: 'Resume', required: true })
  workerId: Types.ObjectId; // 关联简历ID

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId; // 创建人

  // 爱签相关字段
  @Prop()
  esignContractNo?: string; // 爱签合同编号

  @Prop()
  esignStatus?: string; // 爱签合同状态缓存

  @Prop()
  esignCreatedAt?: Date; // 爱签合同创建时间

  @Prop()
  esignTemplateNo?: string; // 爱签模板编号

  @Prop()
  esignPreviewUrl?: string; // 爱签预览链接（缓存）

  @Prop({ default: Date.now })
  createdAt: Date; // 录入时间，自动生成

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ContractSchema = SchemaFactory.createForClass(Contract); 