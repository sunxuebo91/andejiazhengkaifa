import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 客户操作日志模型
 * 记录客户相关的所有操作：创建、编辑、发起合同、分配、跟进等
 * 仅管理员可查看
 */
@Schema({ timestamps: true, collection: 'customer_operation_logs' })
export class CustomerOperationLog extends Document {
  // 客户ID
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  // 操作类型
  @Prop({
    required: true,
    enum: [
      'create',           // 创建客户
      'update',           // 编辑客户信息
      'delete',           // 删除客户
      'assign',           // 分配负责人
      'release_to_pool',  // 释放到公海
      'claim_from_pool',  // 从公海领取
      'create_contract',  // 发起合同
      'create_follow_up', // 添加跟进记录
      'change_status',    // 变更状态
      'change_lead_level',// 变更线索等级
      'batch_assign',     // 批量分配
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
    before?: Record<string, any>;  // 变更前的值
    after?: Record<string, any>;   // 变更后的值
    description?: string;          // 操作描述
    relatedId?: string;            // 关联ID（如合同ID、跟进记录ID等）
    relatedType?: string;          // 关联类型（如 contract, follow_up）
  };

  // 操作人ID
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  operatorId: Types.ObjectId;

  // 操作时间
  @Prop({ required: true, default: Date.now, index: true })
  operatedAt: Date;

  // IP地址（可选）
  @Prop()
  ipAddress?: string;

  // 用户代理（可选）
  @Prop()
  userAgent?: string;
}

export const CustomerOperationLogSchema = SchemaFactory.createForClass(CustomerOperationLog);

// 添加复合索引，优化按客户和时间查询
CustomerOperationLogSchema.index({ customerId: 1, operatedAt: -1 });

