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

// 跟进结果枚举
export enum FollowUpResult {
  // 电话类结果
  PHONE_CONNECTED = '已接通',
  PHONE_NOT_CONNECTED = '未接通',
  PHONE_POWER_OFF = '关机',
  PHONE_OUT_OF_SERVICE = '停机',
  PHONE_REJECTED = '拒接',
  PHONE_BUSY = '忙线',

  // 微信类结果
  WECHAT_REPLIED = '已回复',
  WECHAT_NOT_REPLIED = '未回复',
  WECHAT_READ_NOT_REPLY = '已读未回',
  WECHAT_BLOCKED = '已拉黑',

  // 到店类结果
  VISIT_ARRIVED = '已到店',
  VISIT_NOT_ARRIVED = '未到店',
  VISIT_CANCELLED = '爽约',

  // 其他
  OTHER_SUCCESS = '成功',
  OTHER_FAILED = '失败'
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

  @ApiProperty({ description: '跟进结果', enum: FollowUpResult })
  @Prop({
    required: true,
    enum: Object.values(FollowUpResult)
  })
  followUpResult: string;

  @ApiProperty({ description: '是否联系成功' })
  @Prop({ default: false })
  contactSuccess: boolean;

  @ApiProperty({ description: '跟进内容' })
  @Prop({ required: true, minlength: 1, maxlength: 1000 })
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

// 自动计算联系成功状态
TrainingLeadFollowUpSchema.pre('save', function(next) {
  const successResults = [
    FollowUpResult.PHONE_CONNECTED,
    FollowUpResult.WECHAT_REPLIED,
    FollowUpResult.VISIT_ARRIVED,
    FollowUpResult.OTHER_SUCCESS
  ];

  this.contactSuccess = successResults.includes(this.followUpResult as any);
  next();
});

// 创建索引
TrainingLeadFollowUpSchema.index({ leadId: 1 });
TrainingLeadFollowUpSchema.index({ createdBy: 1 });
TrainingLeadFollowUpSchema.index({ createdAt: -1 });
TrainingLeadFollowUpSchema.index({ followUpResult: 1 });
TrainingLeadFollowUpSchema.index({ contactSuccess: 1 });

