import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 学员线索操作日志模型
 * 记录学员线索相关的所有操作：创建、编辑、分配、跟进、释放/认领等
 * 仅管理员可查看
 */
@Schema({ timestamps: true, collection: 'training_lead_operation_logs' })
export class TrainingLeadOperationLog extends Document {
  // 学员线索ID
  @Prop({ type: Types.ObjectId, ref: 'TrainingLead', index: true })
  leadId?: Types.ObjectId;

  // 审计实体类型
  @Prop({
    required: true,
    enum: ['training_lead', 'follow_up', 'user', 'system'],
    index: true
  })
  entityType: string;

  // 审计实体ID
  @Prop({ required: true, index: true })
  entityId: string;

  // 操作类型
  @Prop({
    required: true,
    enum: [
      'create',           // 创建线索
      'update',           // 编辑线索信息
      'delete',           // 删除线索
      'assign',           // 分配负责人
      'release_to_pool',  // 释放到公海
      'claim_from_pool',  // 从公海领取
      'create_follow_up', // 添加跟进记录
      'change_status',    // 变更状态
      'other'             // 其他操作
    ],
    index: true
  })
  operationType: string;

  // 操作名称（中文描述）
  @Prop({ required: true })
  operationName: string;

  // 操作详情（记录具体变更内容）
  @Prop({ type: Object })
  details?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    description?: string;
    relatedId?: string;
    relatedType?: string;
  };

  // 操作人ID
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  operatorId: Types.ObjectId;

  // 操作时间
  @Prop({ required: true, default: Date.now, index: true })
  operatedAt: Date;

  // 请求追踪ID
  @Prop({ index: true })
  requestId?: string;

  // IP地址
  @Prop()
  ipAddress?: string;

  // 用户代理
  @Prop()
  userAgent?: string;
}

export const TrainingLeadOperationLogSchema = SchemaFactory.createForClass(TrainingLeadOperationLog);

// 复合索引，优化按线索和时间查询
TrainingLeadOperationLogSchema.index({ leadId: 1, operatedAt: -1 });
TrainingLeadOperationLogSchema.index({ entityType: 1, entityId: 1, operatedAt: -1 });
