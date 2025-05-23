import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';

// 定义基础文档类型
export interface IResume {
  name: string;
  phone: string;
  age: number;
  wechat?: string;
  idNumber?: string;
  education: string;
  nativePlace: string;
  experienceYears: number;
  maritalStatus?: string;
  religion?: string;
  currentAddress?: string;
  hukouAddress?: string;
  birthDate?: string;
  ethnicity?: string;
  gender?: string;
  zodiac?: string;
  zodiacSign?: string;
  jobType: string;
  expectedSalary?: number;
  serviceArea?: string;
  orderStatus?: string;
  skills?: string[];
  leadSource?: string;
  workExperience?: { startDate: string; endDate: string; description: string }[];
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  photoUrls?: string[];
  certificateUrls?: string[];
  medicalReportUrls?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalExamDate?: string;
}

@Schema({ timestamps: true })
export class ResumeEntity {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  age: number;

  @Prop({ required: true })
  gender: string;

  @Prop()
  education: string;

  @Prop()
  school: string;

  @Prop()
  major: string;

  @Prop()
  workExperience: string;

  @Prop()
  expectedPosition: string;

  @Prop()
  expectedSalary: string;

  @Prop()
  selfEvaluation: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export type ResumeDocument = Document & ResumeEntity;
export const ResumeSchema = SchemaFactory.createForClass(ResumeEntity);

// 定义模型类型
export type ResumeModel = Model<ResumeEntity>;
