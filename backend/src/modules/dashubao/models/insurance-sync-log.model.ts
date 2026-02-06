import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type InsuranceSyncLogDocument = InsuranceSyncLog & Document;

// 保险同步日志状态枚举
export enum SyncStatus {
  PENDING = 'pending',   // 待处理
  SUCCESS = 'success',   // 成功
  FAILED = 'failed',     // 失败
}

@Schema({ timestamps: true, collection: 'insurance_sync_logs' })
export class InsuranceSyncLog {
  @ApiProperty({ description: '关联的合同ID' })
  @Prop({ type: Types.ObjectId, ref: 'Contract', required: true, index: true })
  contractId: Types.ObjectId;

  @ApiProperty({ description: '关联的保单ID' })
  @Prop({ type: Types.ObjectId, ref: 'InsurancePolicy', required: true, index: true })
  policyId: Types.ObjectId;

  @ApiProperty({ description: '保单号' })
  @Prop()
  policyNo?: string;

  @ApiProperty({ description: '原服务人员姓名' })
  @Prop({ required: true })
  oldWorkerName: string;

  @ApiProperty({ description: '原服务人员身份证号' })
  @Prop({ required: true })
  oldWorkerIdCard: string;

  @ApiProperty({ description: '新服务人员姓名' })
  @Prop({ required: true })
  newWorkerName: string;

  @ApiProperty({ description: '新服务人员身份证号' })
  @Prop({ required: true })
  newWorkerIdCard: string;

  @ApiProperty({ description: '新服务人员手机号' })
  @Prop()
  newWorkerPhone?: string;

  @ApiProperty({ description: '同步状态' })
  @Prop({ enum: SyncStatus, default: SyncStatus.PENDING, index: true })
  status: SyncStatus;

  @ApiProperty({ description: '错误信息' })
  @Prop()
  errorMessage?: string;

  @ApiProperty({ description: '大树保API响应' })
  @Prop({ type: Object })
  dashubaoResponse?: Record<string, any>;

  @ApiProperty({ description: '同步完成时间' })
  @Prop()
  syncedAt?: Date;

  @ApiProperty({ description: '重试次数' })
  @Prop({ default: 0 })
  retryCount: number;

  @ApiProperty({ description: '创建时间' })
  @Prop({ default: Date.now })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const InsuranceSyncLogSchema = SchemaFactory.createForClass(InsuranceSyncLog);

// 索引
InsuranceSyncLogSchema.index({ contractId: 1, createdAt: -1 });
InsuranceSyncLogSchema.index({ policyId: 1, createdAt: -1 });
InsuranceSyncLogSchema.index({ status: 1, createdAt: -1 });

