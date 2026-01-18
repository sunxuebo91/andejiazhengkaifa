import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'employee_evaluations' })
export class EmployeeEvaluation extends Document {
  // 被评价员工ID（简历ID）
  @Prop({ type: Types.ObjectId, ref: 'Resume', required: true, index: true })
  employeeId: Types.ObjectId;

  // 被评价员工姓名（冗余字段，方便查询）
  @Prop({ required: true })
  employeeName: string;

  // 评价人ID（用户ID）
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  evaluatorId: Types.ObjectId;

  // 评价人姓名
  @Prop({ required: true })
  evaluatorName: string;

  // 关联订单/合同ID（可选）
  @Prop({ type: Types.ObjectId, ref: 'Contract' })
  contractId?: Types.ObjectId;

  // 订单编号（冗余字段）
  @Prop()
  contractNo?: string;

  // 评价类型
  @Prop({ 
    enum: ['daily', 'monthly', 'contract_end', 'special'], 
    default: 'daily',
    index: true
  })
  evaluationType: string; // daily=日常评价, monthly=月度评价, contract_end=合同结束评价, special=专项评价

  // 综合评分（1-5分）
  @Prop({ required: true, min: 1, max: 5 })
  overallRating: number;

  // 服务态度评分（1-5分）
  @Prop({ min: 1, max: 5 })
  serviceAttitudeRating?: number;

  // 专业技能评分（1-5分）
  @Prop({ min: 1, max: 5 })
  professionalSkillRating?: number;

  // 工作效率评分（1-5分）
  @Prop({ min: 1, max: 5 })
  workEfficiencyRating?: number;

  // 沟通能力评分（1-5分）
  @Prop({ min: 1, max: 5 })
  communicationRating?: number;

  // 评价内容
  @Prop({ required: true })
  comment: string;

  // 优点
  @Prop()
  strengths?: string;

  // 待改进项
  @Prop()
  improvements?: string;

  // 评价标签
  @Prop({ type: [String], default: [] })
  tags?: string[]; // 如：['认真负责', '技能熟练', '沟通良好']

  // 是否公开（显示给员工）
  @Prop({ default: false })
  isPublic: boolean;

  // 评价状态
  @Prop({ 
    enum: ['draft', 'published', 'archived'], 
    default: 'published',
    index: true
  })
  status: string;

  // 评价时间
  @Prop({ default: Date.now, index: true })
  evaluationDate: Date;

  // 创建时间（自动）
  createdAt?: Date;

  // 更新时间（自动）
  updatedAt?: Date;
}

export const EmployeeEvaluationSchema = SchemaFactory.createForClass(EmployeeEvaluation);

// 创建复合索引
EmployeeEvaluationSchema.index({ employeeId: 1, evaluationDate: -1 });
EmployeeEvaluationSchema.index({ evaluatorId: 1, createdAt: -1 });
EmployeeEvaluationSchema.index({ status: 1, evaluationDate: -1 });

