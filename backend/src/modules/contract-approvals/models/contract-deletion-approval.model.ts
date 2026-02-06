import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ContractDeletionApprovalDocument = ContractDeletionApproval & Document;

@Schema({ timestamps: true })
export class ContractDeletionApproval extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Contract', required: true })
  contractId: Types.ObjectId;

  @Prop({ required: true })
  contractNumber: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  requestedBy: Types.ObjectId;

  @Prop({ required: true })
  requestedByName: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedByName?: string;

  @Prop()
  approvalComment?: string;

  @Prop()
  approvedAt?: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ContractDeletionApprovalSchema = SchemaFactory.createForClass(ContractDeletionApproval);

