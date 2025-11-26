import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LeadTransferRuleDocument = LeadTransferRule & Document;

// 用户配额追踪
@Schema({ _id: false })
export class UserQuota {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true, enum: ['source', 'target', 'both'] })
  role: string; // source=流出方, target=流入方, both=既流出又流入

  @Prop({ default: 0 })
  transferredOut: number; // 累计流出数量

  @Prop({ default: 0 })
  transferredIn: number; // 累计流入数量

  @Prop({ default: 0 })
  balance: number; // 平衡值 = transferredOut - transferredIn

  @Prop({ default: 0 })
  pendingCompensation: number; // 待补偿数量

  @Prop()
  lastCompensatedAt: Date; // 最后补偿时间
}

export const UserQuotaSchema = SchemaFactory.createForClass(UserQuota);

// 触发条件配置
@Schema({ _id: false })
export class TriggerConditions {
  @Prop({ required: true, default: 48 })
  inactiveHours: number; // 无活动小时数

  @Prop({ type: [String], required: true })
  contractStatuses: string[]; // 客户状态：['待定', '匹配中']

  @Prop({ type: [String] })
  leadSources: string[]; // 线索来源筛选（可选）

  @Prop({ type: Object })
  createdDateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
}

export const TriggerConditionsSchema = SchemaFactory.createForClass(TriggerConditions);

// 执行时间窗口配置
@Schema({ _id: false })
export class ExecutionWindow {
  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: '09:30' })
  startTime: string;

  @Prop({ default: '18:30' })
  endTime: string;
}

export const ExecutionWindowSchema = SchemaFactory.createForClass(ExecutionWindow);

// 分配策略配置
@Schema({ _id: false })
export class DistributionConfig {
  @Prop({ default: 'balanced-random' })
  strategy: string; // balanced-random=平衡随机分配

  @Prop({ default: true })
  enableCompensation: boolean; // 是否启用补偿机制

  @Prop({ default: 5, min: 1, max: 10 })
  compensationPriority: number; // 补偿优先级（1-10）
}

export const DistributionConfigSchema = SchemaFactory.createForClass(DistributionConfig);

// 执行统计
@Schema({ _id: false })
export class Statistics {
  @Prop({ default: 0 })
  totalTransferred: number; // 累计流转数量

  @Prop()
  lastExecutedAt: Date; // 上次执行时间

  @Prop({ default: 0 })
  lastTransferredCount: number; // 上次流转数量
}

export const StatisticsSchema = SchemaFactory.createForClass(Statistics);

// 线索流转规则主模型
@Schema({ timestamps: true, collection: 'lead_transfer_rules' })
export class LeadTransferRule extends Document {
  @Prop({ required: true })
  ruleName: string; // 规则名称

  @Prop()
  description: string; // 规则描述

  @Prop({ default: true })
  enabled: boolean; // 是否启用

  @Prop({ type: TriggerConditionsSchema, required: true })
  triggerConditions: TriggerConditions; // 触发条件

  @Prop({ type: ExecutionWindowSchema })
  executionWindow: ExecutionWindow; // 执行时间窗口

  @Prop({ type: [UserQuotaSchema], default: [] })
  userQuotas: UserQuota[]; // 用户配额追踪

  @Prop({ type: DistributionConfigSchema })
  distributionConfig: DistributionConfig; // 分配策略配置

  @Prop({ type: StatisticsSchema })
  statistics: Statistics; // 执行统计

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const LeadTransferRuleSchema = SchemaFactory.createForClass(LeadTransferRule);

// 索引
LeadTransferRuleSchema.index({ enabled: 1, 'executionWindow.enabled': 1 });
LeadTransferRuleSchema.index({ createdBy: 1, createdAt: -1 });

