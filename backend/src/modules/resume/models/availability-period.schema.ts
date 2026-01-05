import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

// 档期状态枚举
export enum AvailabilityStatus {
  UNSET = 'unset',                   // 未设置（灰色）
  AVAILABLE = 'available',           // 可接单（绿色）
  UNAVAILABLE = 'unavailable',       // 不可接单（黑色）
  OCCUPIED = 'occupied',             // 订单占用（红色）
  LEAVE = 'leave'                    // 已请假（黄色）
}

// 档期子文档 Schema
@Schema({ _id: false })
export class AvailabilityPeriodSchema {
  @Prop({ type: Date, required: true })
  date: Date; // 具体日期

  @Prop({ 
    type: String, 
    enum: Object.values(AvailabilityStatus),
    default: AvailabilityStatus.AVAILABLE 
  })
  status: AvailabilityStatus;

  @Prop({ type: Types.ObjectId, ref: 'Contract' })
  contractId?: Types.ObjectId; // 关联合同ID

  @Prop()
  remarks?: string; // 备注信息
}

export const AvailabilityPeriodSchemaFactory = SchemaFactory.createForClass(AvailabilityPeriodSchema);

