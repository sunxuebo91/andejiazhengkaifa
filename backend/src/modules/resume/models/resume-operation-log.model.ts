import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 简历操作日志模型
 * 记录简历相关的所有操作：创建、编辑、删除、分配等
 * 仅管理员可查看
 */
@Schema({ timestamps: true, collection: 'resume_operation_logs' })
export class ResumeOperationLog extends Document {
  // 简历ID
  @Prop({ type: Types.ObjectId, ref: 'Resume', required: true, index: true })
  resumeId: Types.ObjectId;

  // 审计实体类型
  @Prop({
    required: true,
    enum: ['resume', 'file', 'system'],
    default: 'resume',
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
      'create',                // 创建简历
      'update',                // 编辑简历信息
      'delete',                // 删除简历
      'assign',                // 分配负责人
      'upload_file',           // 上传文件
      'delete_file',           // 删除文件
      'generate_uniform',      // 生成工装照
      'change_status',         // 变更状态
      'import',                // 导入简历
      'create_from_referral',  // 推荐审核通过自动入库
      'release_from_referral', // 从推荐库手动释放到简历库
      'other'                  // 其他操作
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
    relatedId?: string;            // 关联ID
    relatedType?: string;          // 关联类型
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

  // IP地址（可选）
  @Prop()
  ipAddress?: string;

  // 用户代理（可选）
  @Prop()
  userAgent?: string;
}

export const ResumeOperationLogSchema = SchemaFactory.createForClass(ResumeOperationLog);

// 添加复合索引，优化按简历和时间查询
ResumeOperationLogSchema.index({ resumeId: 1, operatedAt: -1 });
ResumeOperationLogSchema.index({ entityType: 1, entityId: 1, operatedAt: -1 });

