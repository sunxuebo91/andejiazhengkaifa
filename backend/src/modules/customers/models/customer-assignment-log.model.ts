import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'customer_assignment_logs' })
export class CustomerAssignmentLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  oldAssignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  newAssignedTo: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedBy: Types.ObjectId;

  @Prop({ required: true })
  assignedAt: Date;

  @Prop()
  reason?: string;
}

export const CustomerAssignmentLogSchema = SchemaFactory.createForClass(CustomerAssignmentLog);

// 常用查询索引
CustomerAssignmentLogSchema.index({ customerId: 1, assignedAt: -1 });

