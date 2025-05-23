import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import { Education, Gender, JobType, LeadSource, MaritalStatus, OrderStatus, Religion, Skill, Zodiac, ZodiacSign } from '../dto/create-resume.dto';

// 定义工作经历接口
interface WorkExperience {
  startDate: string;
  endDate: string;
  description: string;
}

@Schema({ timestamps: true })
export class ResumeEntity extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true })
  age: number;

  @Prop()
  wechat?: string;

  @Prop({ unique: true, sparse: true })
  idNumber?: string;

  @Prop({ required: true, enum: Education })
  education: Education;

  @Prop({ required: true })
  nativePlace: string;

  @Prop({ required: true })
  experienceYears: number;

  @Prop({ enum: MaritalStatus })
  maritalStatus?: MaritalStatus;

  @Prop({ enum: Religion })
  religion?: Religion;

  @Prop()
  currentAddress?: string;

  @Prop()
  hukouAddress?: string;

  @Prop()
  birthDate?: string;

  @Prop()
  ethnicity?: string;

  @Prop({ required: true, enum: Gender })
  gender: Gender;

  @Prop({ enum: Zodiac })
  zodiac?: Zodiac;

  @Prop({ enum: ZodiacSign })
  zodiacSign?: ZodiacSign;

  @Prop({ required: true, enum: JobType })
  jobType: JobType;

  @Prop()
  expectedSalary?: number;

  @Prop()
  serviceArea?: string;

  @Prop({ enum: OrderStatus })
  orderStatus?: OrderStatus;

  @Prop({ type: [String], enum: Skill })
  skills?: Skill[];

  @Prop({ enum: LeadSource })
  leadSource?: LeadSource;

  @Prop({ type: [{ startDate: String, endDate: String, description: String }] })
  workExperiences?: WorkExperience[];

  @Prop()
  idCardFrontUrl?: string;

  @Prop()
  idCardBackUrl?: string;

  @Prop({ type: [String] })
  photoUrls?: string[];

  @Prop({ type: [String] })
  certificateUrls?: string[];

  @Prop({ type: [String] })
  medicalReportUrls?: string[];

  @Prop()
  emergencyContactName?: string;

  @Prop()
  emergencyContactPhone?: string;

  @Prop()
  medicalExamDate?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export type ResumeDocument = Document & ResumeEntity;
export const ResumeSchema = SchemaFactory.createForClass(ResumeEntity);

// 定义模型类型
export type ResumeModel = Model<ResumeEntity>;
