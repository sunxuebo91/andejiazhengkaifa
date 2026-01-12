import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FileInfoSchema } from './file-info.schema';

export type WorkExperienceDocument = WorkExperienceSchema & Document;

@Schema({ _id: false })
export class WorkExperienceSchema {
  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: String, required: true })
  description: string;

  // 新增字段（全部选填）
  @Prop({ type: String, required: false })
  orderNumber?: string;

  @Prop({ type: String, required: false })
  district?: string;

  @Prop({ type: String, required: false })
  customerName?: string;

  @Prop({ type: String, required: false })
  customerReview?: string;

  @Prop({ type: [FileInfoSchema], required: false, default: [] })
  photos?: FileInfoSchema[];
}

export const WorkExperienceSchemaFactory = SchemaFactory.createForClass(WorkExperienceSchema);