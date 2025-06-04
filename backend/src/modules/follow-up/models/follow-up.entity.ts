import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

// 跟进类型枚举
export enum FollowUpType {
  PHONE = 'phone',      // 电话沟通
  WECHAT = 'wechat',    // 微信沟通
  VISIT = 'visit',      // 到店沟通
  INTERVIEW = 'interview', // 面试沟通
  SIGNED = 'signed',    // 已签单
  OTHER = 'other'       // 其他
}

// 跟进记录接口
export interface IFollowUp extends Document {
  resumeId: Types.ObjectId;  // 关联的简历ID
  type: FollowUpType;        // 跟进类型
  content: string;           // 跟进内容
  createdBy: Types.ObjectId; // 创建人ID
  createdAt: Date;          // 创建时间
  updatedAt: Date;          // 更新时间
}

@Schema({ timestamps: true, collection: 'follow_ups' })
export class FollowUp extends Document implements IFollowUp {
  @ApiProperty({ description: '关联的简历ID' })
  @Prop({ type: Types.ObjectId, ref: 'Resume', required: true })
  @IsNotEmpty()
  resumeId: Types.ObjectId;

  @ApiProperty({ description: '跟进类型', enum: FollowUpType })
  @Prop({ type: String, enum: FollowUpType, required: true })
  @IsEnum(FollowUpType)
  type: FollowUpType;

  @ApiProperty({ description: '跟进内容' })
  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '创建人ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @IsNotEmpty()
  createdBy: Types.ObjectId;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export const FollowUpSchema = SchemaFactory.createForClass(FollowUp);

// 添加索引以提高查询性能
FollowUpSchema.index({ resumeId: 1, createdAt: -1 });
FollowUpSchema.index({ createdBy: 1 }); 