import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'public_pool_logs' })
export class PublicPoolLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId;

  @Prop({ required: true, enum: ['enter', 'claim', 'assign', 'release'] })
  action: string; // enter=进入公海, claim=员工领取, assign=管理员分配, release=释放到公海

  @Prop({ type: Types.ObjectId, ref: 'User' })
  operatorId: Types.ObjectId; // 操作人

  @Prop({ type: Types.ObjectId, ref: 'User' })
  fromUserId: Types.ObjectId; // 来源用户（释放时）

  @Prop({ type: Types.ObjectId, ref: 'User' })
  toUserId: Types.ObjectId; // 目标用户（领取/分配时）

  @Prop()
  reason: string; // 原因

  @Prop({ required: true })
  operatedAt: Date;
}

export const PublicPoolLogSchema = SchemaFactory.createForClass(PublicPoolLog);

// 常用查询索引
PublicPoolLogSchema.index({ customerId: 1, operatedAt: -1 });
PublicPoolLogSchema.index({ action: 1, operatedAt: -1 });

