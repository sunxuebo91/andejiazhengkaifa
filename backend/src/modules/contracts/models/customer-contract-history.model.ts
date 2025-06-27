import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerContractHistoryDocument = CustomerContractHistory & Document;

// 历史合同记录子文档
@Schema({ _id: false })
export class ContractHistoryRecord {
  @Prop({ type: Types.ObjectId, ref: 'Contract', required: true })
  contractId: Types.ObjectId;

  @Prop({ required: true })
  contractNumber: string;

  @Prop({ required: true })
  workerName: string;

  @Prop({ required: true })
  workerPhone: string;

  @Prop({ required: true })
  workerSalary: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ enum: ['active', 'replaced'], default: 'active' })
  status: 'active' | 'replaced';

  @Prop()
  esignContractNo?: string;

  @Prop()
  esignStatus?: string;

  @Prop({ required: true })
  order: number; // 第几任阿姨

  @Prop()
  serviceDays?: number; // 实际服务天数

  @Prop()
  terminationDate?: Date; // 终止日期

  @Prop()
  terminationReason?: string; // 终止原因
}

@Schema({ timestamps: true })
export class CustomerContractHistory {
  @Prop({ required: true, unique: true })
  customerPhone: string; // 客户手机号（关联键）

  @Prop({ required: true })
  customerName: string; // 客户姓名

  @Prop({ type: [ContractHistoryRecord], default: [] })
  contracts: ContractHistoryRecord[]; // 合同历史记录

  @Prop({ type: Types.ObjectId, ref: 'Contract', required: true })
  latestContractId: Types.ObjectId; // 最新合同ID

  @Prop({ default: 1 })
  totalWorkers: number; // 总共换过几个阿姨

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ContractHistoryRecordSchema = SchemaFactory.createForClass(ContractHistoryRecord);
export const CustomerContractHistorySchema = SchemaFactory.createForClass(CustomerContractHistory); 