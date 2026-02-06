import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type TrainingLeadDocument = TrainingLead & Document;

// 客户分级枚举
export enum LeadLevel {
  A = 'A类',
  B = 'B类',
  C = 'C类',
  D = 'D类',
  CLOSED = '0-成交'
}

// 线索状态枚举
export enum LeadStatus {
  NEW = '新线索',
  FOLLOWING = '跟进中',
  CLOSED = '已成交',
  LOST = '已流失'
}

// 意向程度枚举
export enum IntentionLevel {
  HIGH = '高',
  MEDIUM = '中',
  LOW = '低'
}

@Schema({ timestamps: true, collection: 'training_leads' })
export class TrainingLead {
  @ApiProperty({ description: '线索编号（自动生成）' })
  @Prop({ unique: true })
  leadId: string;

  @ApiProperty({ description: '客户姓名' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: '手机号（与微信号二选一）' })
  @Prop({ unique: true, sparse: true })
  phone: string;

  @ApiProperty({ description: '微信号（与手机号二选一）' })
  @Prop()
  wechatId: string;

  @ApiProperty({ description: '客户分级', enum: LeadLevel })
  @Prop({
    required: true,
    enum: Object.values(LeadLevel),
    default: LeadLevel.D
  })
  leadLevel: string;

  @ApiProperty({ description: '线索来源' })
  @Prop({
    enum: ['美团', '抖音', '快手', '小红书', '转介绍', '其他']
  })
  leadSource: string;

  @ApiProperty({ description: '培训类型' })
  @Prop({
    enum: ['月嫂', '育儿嫂', '保姆', '护老', '师资']
  })
  trainingType: string;

  @ApiProperty({ description: '意向课程（多选）', type: [String] })
  @Prop({
    type: [String],
    enum: [
      '高级母婴护理师',
      '高级催乳师',
      '高级产后修复师',
      '月子餐营养师',
      '高级育婴师',
      '早教指导师',
      '辅食营养师',
      '小儿推拿师',
      '高级养老护理师',
      '早教精英班'
    ]
  })
  intendedCourses: string[];

  @ApiProperty({ description: '意向程度', enum: IntentionLevel })
  @Prop({
    enum: Object.values(IntentionLevel)
  })
  intentionLevel: string;

  @ApiProperty({ description: '期望开课时间' })
  @Prop()
  expectedStartDate: Date;

  @ApiProperty({ description: '预算金额' })
  @Prop({ min: 0 })
  budget: number;

  @ApiProperty({ description: '所在地区' })
  @Prop()
  address: string;

  @ApiProperty({ description: '备注信息' })
  @Prop()
  remarks: string;

  @ApiProperty({ description: '状态', enum: LeadStatus })
  @Prop({
    required: true,
    enum: Object.values(LeadStatus),
    default: LeadStatus.NEW
  })
  status: string;

  @ApiProperty({ description: '创建人ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @ApiProperty({ description: '分配给（销售人员ID）' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo: Types.ObjectId;

  @ApiProperty({ description: '用户归属（生成分享链接/二维码的用户ID）' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  referredBy: Types.ObjectId;

  @ApiProperty({ description: '最后跟进时间' })
  @Prop()
  lastFollowUpAt: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export const TrainingLeadSchema = SchemaFactory.createForClass(TrainingLead);

// 创建索引
TrainingLeadSchema.index({ phone: 1 }, { unique: true, sparse: true });
TrainingLeadSchema.index({ leadLevel: 1 });
TrainingLeadSchema.index({ status: 1 });
TrainingLeadSchema.index({ createdBy: 1 });
TrainingLeadSchema.index({ assignedTo: 1 });
TrainingLeadSchema.index({ referredBy: 1 });
TrainingLeadSchema.index({ createdAt: -1 });

