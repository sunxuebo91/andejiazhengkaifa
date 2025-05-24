import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkExperienceDocument = WorkExperienceSchema & Document;

@Schema({ _id: false })
export class WorkExperienceSchema {
  @Prop({ type: String, required: true })
  company: string;

  @Prop({ type: String, required: true })
  position: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: String, required: true })
  description: string;
}

export const WorkExperienceSchemaFactory = SchemaFactory.createForClass(WorkExperienceSchema); 