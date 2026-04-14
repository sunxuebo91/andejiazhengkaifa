import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TrainingLeadTransferRecordDocument = TrainingLeadTransferRecord & Document;

// 流转时的状态快照
@Schema({ _id: false })
export class TrainingTransferSnapshot {
  @Prop()
  studentId: string; // 学员编号快照

  @Prop()
  studentName: string; // 学员姓名快照

  @Prop({ required: true })
  leadStatus: string; // 流转时的线索状态

  @Prop({ required: true })
  inactiveHours: number; // 无活动时长（小时）

  @Prop({ required: true })
  lastActivityAt: Date; // 最后活动时间

  @Prop({ required: true })
  createdAt: Date; // 线索创建时间

  @Prop()
  transferCount: number; // 流转时已流转次数
}

export const TrainingTransferSnapshotSchema = SchemaFactory.createForClass(TrainingTransferSnapshot);

// 学员线索流转记录
@Schema({ timestamps: true, collection: 'training_lead_transfer_records' })
export class TrainingLeadTransferRecord extends Document {
  @Prop({ type: Types.ObjectId, ref: 'LeadTransferRule', required: true })
  ruleId: Types.ObjectId; // 使用的规则ID

  @Prop({ type: Types.ObjectId, ref: 'TrainingLead', required: true })
  leadId: Types.ObjectId; // 学员线索ID

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  fromUserId: Types.ObjectId; // 原负责人

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  toUserId: Types.ObjectId; // 新负责人

  @Prop({ type: TrainingTransferSnapshotSchema, required: true })
  snapshot: TrainingTransferSnapshot; // 触发条件快照

  @Prop({ required: true, enum: ['success', 'failed'], default: 'success' })
  status: string; // 执行状态

  @Prop()
  errorMessage: string; // 错误信息（如果失败）

  @Prop({ required: true, default: Date.now })
  transferredAt: Date; // 流转时间
}

export const TrainingLeadTransferRecordSchema = SchemaFactory.createForClass(TrainingLeadTransferRecord);

// 索引
TrainingLeadTransferRecordSchema.index({ ruleId: 1, transferredAt: -1 });
TrainingLeadTransferRecordSchema.index({ leadId: 1, transferredAt: -1 });
TrainingLeadTransferRecordSchema.index({ fromUserId: 1, transferredAt: -1 });
TrainingLeadTransferRecordSchema.index({ toUserId: 1, transferredAt: -1 });
TrainingLeadTransferRecordSchema.index({ transferredAt: -1 });
