import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type TrainingLeadFollowUpDocument = TrainingLeadFollowUp & Document;

// 跟进方式枚举
export enum FollowUpType {
  PHONE = '电话',
  WECHAT = '微信',
  VISIT = '到店',
  OTHER = '其他'
}

@Schema({ timestamps: true, collection: 'training_lead_follow_ups' })
export class TrainingLeadFollowUp {
  @ApiProperty({ description: '关联的培训线索ID' })
  @Prop({ type: Types.ObjectId, ref: 'TrainingLead', required: true })
  leadId: Types.ObjectId;

  @ApiProperty({ description: '跟进方式', enum: FollowUpType })
  @Prop({
    required: true,
    enum: Object.values(FollowUpType)
  })
  type: string;

  @ApiProperty({ description: '跟进内容' })
  @Prop({ required: true, minlength: 5, maxlength: 1000 })
  content: string;

  @ApiProperty({ description: '下次跟进时间' })
  @Prop()
  nextFollowUpDate: Date;

  @ApiProperty({ description: '跟进人ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export const TrainingLeadFollowUpSchema = SchemaFactory.createForClass(TrainingLeadFollowUp);

// 创建索引
TrainingLeadFollowUpSchema.index({ leadId: 1 });
TrainingLeadFollowUpSchema.index({ createdBy: 1 });
TrainingLeadFollowUpSchema.index({ createdAt: -1 });

