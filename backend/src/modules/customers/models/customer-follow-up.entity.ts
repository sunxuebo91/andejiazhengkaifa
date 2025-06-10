import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { User } from '../../users/models/user.entity';

// 客户跟进方式枚举
export enum CustomerFollowUpType {
  PHONE = 'phone',      // 电话跟进
  WECHAT = 'wechat',    // 微信跟进
  VISIT = 'visit',      // 到店跟进
  OTHER = 'other'       // 其他
}

// 客户跟进记录接口
export interface ICustomerFollowUp extends Document {
  customerId: Types.ObjectId;    // 关联的客户ID
  type: CustomerFollowUpType;    // 跟进方式
  content: string;               // 跟进内容
  createdBy: Types.ObjectId | User; // 创建人ID或用户对象
  createdAt: Date;              // 创建时间
  updatedAt: Date;              // 更新时间
}

@Schema({ timestamps: true, collection: 'customer_follow_ups' })
export class CustomerFollowUp extends Document implements ICustomerFollowUp {
  @ApiProperty({ description: '关联的客户ID' })
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  @IsNotEmpty()
  customerId: Types.ObjectId;

  @ApiProperty({ description: '跟进方式', enum: CustomerFollowUpType })
  @Prop({ type: String, enum: CustomerFollowUpType, required: true })
  @IsEnum(CustomerFollowUpType)
  type: CustomerFollowUpType;

  @ApiProperty({ description: '跟进内容' })
  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '创建人ID' })
  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true, 
    autopopulate: { select: 'name username' }
  })
  @IsNotEmpty()
  createdBy: Types.ObjectId | User;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export const CustomerFollowUpSchema = SchemaFactory.createForClass(CustomerFollowUp);

// 添加索引以提高查询性能
CustomerFollowUpSchema.index({ customerId: 1, createdAt: -1 });
CustomerFollowUpSchema.index({ createdBy: 1 }); 