import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LeadTransferRecordDocument = LeadTransferRecord & Document;

// 流转时的状态快照
@Schema({ _id: false })
export class TransferSnapshot {
  @Prop()
  customerNumber: string; // 客户编号快照

  @Prop()
  customerName: string; // 客户名称快照

  @Prop({ required: true })
  contractStatus: string; // 客户状态

  @Prop({ required: true })
  inactiveHours: number; // 无活动时长（小时）

  @Prop({ required: true })
  lastActivityAt: Date; // 最后活动时间

  @Prop({ required: true })
  createdAt: Date; // 线索创建时间
}

export const TransferSnapshotSchema = SchemaFactory.createForClass(TransferSnapshot);

// 线索流转记录
@Schema({ timestamps: true, collection: 'lead_transfer_records' })
export class LeadTransferRecord extends Document {
  @Prop({ type: Types.ObjectId, ref: 'LeadTransferRule', required: true })
  ruleId: Types.ObjectId; // 使用的规则ID

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId; // 客户ID

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  fromUserId: Types.ObjectId; // 原负责人

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  toUserId: Types.ObjectId; // 新负责人

  @Prop({ type: TransferSnapshotSchema, required: true })
  snapshot: TransferSnapshot; // 触发条件快照

  @Prop({ required: true, enum: ['success', 'failed'], default: 'success' })
  status: string; // 执行状态

  @Prop()
  errorMessage: string; // 错误信息（如果失败）

  @Prop({ required: true, default: Date.now })
  transferredAt: Date; // 流转时间
}

export const LeadTransferRecordSchema = SchemaFactory.createForClass(LeadTransferRecord);

// 索引
LeadTransferRecordSchema.index({ ruleId: 1, transferredAt: -1 });
LeadTransferRecordSchema.index({ customerId: 1, transferredAt: -1 });
LeadTransferRecordSchema.index({ fromUserId: 1, transferredAt: -1 });
LeadTransferRecordSchema.index({ toUserId: 1, transferredAt: -1 });
LeadTransferRecordSchema.index({ transferredAt: -1 });

