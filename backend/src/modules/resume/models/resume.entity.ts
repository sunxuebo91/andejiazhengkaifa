import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/models/user.entity';
import { Education, Gender, JobType, LeadSource, MaritalStatus, OrderStatus, Religion, Skill, Zodiac, ZodiacSign, LearningIntention, CurrentStage, MaternityNurseLevel } from '../dto/create-resume.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, IsArray } from 'class-validator';
import { WorkExperienceSchema } from './work-experience.schema';
import { FileInfoSchema } from './file-info.schema';
import { AvailabilityPeriodSchema } from './availability-period.schema';

// 定义工作经历接口
interface WorkExperience {
  startDate: string;
  endDate: string;
  description: string;
}

// 定义文件信息接口
interface FileInfo {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

// 定义档期接口
interface AvailabilityPeriod {
  date: Date;
  status: 'unset' | 'available' | 'unavailable' | 'occupied' | 'leave';
  contractId?: Types.ObjectId;
  remarks?: string;
}

// 定义Resume接口
export interface IResume extends Document {
  title: string;
  content: string;
  userId: Types.ObjectId;
  lastUpdatedBy?: Types.ObjectId;
  fileIds: Types.ObjectId[];
  name: string;
  gender: Gender;
  age: number;
  phone: string;
  wechat?: string;
  idNumber?: string;
  expectedPosition: string;
  jobType: JobType;
  expectedSalary: number;
  maternityNurseLevel?: MaternityNurseLevel;
  workExperience: number;
  education: Education;
  workHistory: WorkExperience[];
  skills: Skill[];
  selfIntroduction?: string;
  status: string;
  remarks?: string;
  ethnicity?: string;
  zodiacSign?: ZodiacSign;
  nativePlace: string;
  experienceYears: number;
  maritalStatus?: MaritalStatus;
  religion?: Religion;
  currentAddress?: string;
  hukouAddress?: string;
  birthDate?: string;
  zodiac?: Zodiac;
  serviceArea?: string[];
  orderStatus?: OrderStatus;
  leadSource?: LeadSource;
  workExperiences?: WorkExperience[];
  idCardFront?: FileInfo;
  idCardBack?: FileInfo;
  personalPhoto?: FileInfo[];
  photoUrls?: string[];
  certificates?: FileInfo[];
  reports?: FileInfo[];
  certificateUrls?: string[];
  medicalReportUrls?: string[];
  confinementMealPhotos?: FileInfo[];
  cookingPhotos?: FileInfo[];
  complementaryFoodPhotos?: FileInfo[];
  positiveReviewPhotos?: FileInfo[];
  selfIntroductionVideo?: FileInfo;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalExamDate?: string;
  learningIntention?: LearningIntention;
  currentStage?: CurrentStage;
  availabilityCalendar?: AvailabilityPeriod[];
}

@Schema({ timestamps: true, collection: 'resumes' })
export class Resume extends Document implements IResume {
  @Prop()
  title: string;

  @Prop()
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', nullable: true })
  lastUpdatedBy?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId }] })
  fileIds: Types.ObjectId[];

  @ApiProperty({ description: '姓名' })
  @Prop()
  @IsString()
  name: string;

  @ApiProperty({ description: '性别', enum: Gender })
  @Prop({ type: String, enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ description: '年龄' })
  @Prop()
  @IsNumber()
  age: number;

  @ApiProperty({ description: '手机号' })
  @Prop()
  @IsString()
  phone: string;

  @ApiProperty({ description: '微信' })
  @Prop({ nullable: true })
  @IsString()
  @IsOptional()
  wechat?: string;

  @ApiProperty({ description: '身份证号' })
  @Prop({ sparse: true, nullable: true })
  @IsString()
  @IsOptional()
  idNumber?: string;

  @ApiProperty({ description: '期望职位' })
  @Prop()
  @IsString()
  expectedPosition: string;

  @ApiProperty({ description: '工作类型', enum: JobType })
  @Prop({ type: String, enum: JobType })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({ description: '期望薪资' })
  @Prop()
  @IsNumber()
  expectedSalary: number;

  @ApiProperty({ description: '月嫂档位', enum: MaternityNurseLevel })
  @Prop({ type: String, enum: MaternityNurseLevel, nullable: true })
  @IsEnum(MaternityNurseLevel)
  @IsOptional()
  maternityNurseLevel?: MaternityNurseLevel;

  @ApiProperty({ description: '工作经验（年）' })
  @Prop()
  @IsNumber()
  workExperience: number;

  @ApiProperty({ description: '学历', enum: Education })
  @Prop({ type: String, enum: Education })
  @IsEnum(Education)
  education: Education;

  @ApiProperty({ description: '工作经历' })
  @Prop({ type: [WorkExperienceSchema], default: [] })
  @IsArray()
  workHistory: WorkExperience[];

  @ApiProperty({ description: '技能特长', enum: Skill, isArray: true })
  @Prop({ type: [String], enum: Skill, default: [] })
  @IsArray()
  @IsEnum(Skill, { each: true })
  skills: Skill[];

  @ApiProperty({ description: '自我介绍' })
  @Prop({ nullable: true })
  @IsString()
  @IsOptional()
  selfIntroduction?: string;

  @ApiProperty({ description: '状态' })
  @Prop({ type: String, default: 'pending' })
  @IsString()
  status: string;

  @ApiProperty({ description: '备注' })
  @Prop({ nullable: true })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiProperty({ description: '民族' })
  @Prop({ nullable: true })
  @IsString()
  @IsOptional()
  ethnicity?: string;

  @ApiProperty({ description: '星座' })
  @Prop({ type: String, enum: ZodiacSign, nullable: true })
  @IsEnum(ZodiacSign)
  @IsOptional()
  zodiacSign?: ZodiacSign;

  @Prop()
  nativePlace: string;

  @Prop()
  experienceYears: number;

  @Prop({ type: String, enum: MaritalStatus, nullable: true })
  maritalStatus?: MaritalStatus;

  @Prop({ type: String, enum: Religion, nullable: true })
  religion?: Religion;

  @Prop({ nullable: true })
  currentAddress?: string;

  @Prop({ nullable: true })
  hukouAddress?: string;

  @Prop({ nullable: true })
  birthDate?: string;

  @Prop({ type: String, enum: Zodiac, nullable: true })
  zodiac?: Zodiac;

  @Prop({ type: [String], default: [] })
  serviceArea?: string[];

  @Prop({ type: String, enum: OrderStatus, nullable: true })
  orderStatus?: OrderStatus;

  @Prop({ type: String, enum: LeadSource, nullable: true })
  leadSource?: LeadSource;

  @Prop({ type: [WorkExperienceSchema], default: [] })
  workExperiences?: WorkExperience[];

  @Prop({ type: FileInfoSchema, nullable: true })
  idCardFront?: FileInfo;

  @Prop({ type: FileInfoSchema, nullable: true })
  idCardBack?: FileInfo;

  @Prop({ type: [FileInfoSchema], default: [] })
  personalPhoto?: FileInfo[];

  @Prop({ type: [String], default: [] })
  photoUrls?: string[];

  @Prop({ type: [FileInfoSchema], default: [] })
  certificates?: FileInfo[];

  @Prop({ type: [FileInfoSchema], default: [] })
  reports?: FileInfo[];

  @Prop({ type: [String], default: [] })
  certificateUrls?: string[];

  @Prop({ type: [String], default: [] })
  medicalReportUrls?: string[];

  @ApiProperty({ description: '月子餐照片' })
  @Prop({ type: [FileInfoSchema], default: [] })
  confinementMealPhotos?: FileInfo[];

  @ApiProperty({ description: '烹饪照片' })
  @Prop({ type: [FileInfoSchema], default: [] })
  cookingPhotos?: FileInfo[];

  @ApiProperty({ description: '辅食添加照片' })
  @Prop({ type: [FileInfoSchema], default: [] })
  complementaryFoodPhotos?: FileInfo[];

  @ApiProperty({ description: '好评展示照片' })
  @Prop({ type: [FileInfoSchema], default: [] })
  positiveReviewPhotos?: FileInfo[];

  @ApiProperty({ description: '自我介绍视频' })
  @Prop({ type: FileInfoSchema, nullable: true })
  selfIntroductionVideo?: FileInfo;

  @Prop({ nullable: true })
  emergencyContactName?: string;

  @Prop({ nullable: true })
  emergencyContactPhone?: string;

  @Prop({ nullable: true })
  medicalExamDate?: string;

  @ApiProperty({ description: '学习意向', enum: LearningIntention })
  @Prop({ type: String, enum: LearningIntention, nullable: true })
  @IsEnum(LearningIntention)
  @IsOptional()
  learningIntention?: LearningIntention;

  @ApiProperty({ description: '当前阶段', enum: CurrentStage })
  @Prop({ type: String, enum: CurrentStage, nullable: true })
  @IsEnum(CurrentStage)
  @IsOptional()
  currentStage?: CurrentStage;

  @ApiProperty({ description: '档期日历' })
  @Prop({ type: [AvailabilityPeriodSchema], default: [] })
  @IsArray()
  @IsOptional()
  availabilityCalendar?: AvailabilityPeriodSchema[];
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

// 确保idNumber字段的索引是稀疏的，这样null值不会参与唯一性检查
// 移除之前的索引定义
// 显式指定索引选项，确保null值不参与唯一性验证
ResumeSchema.index({ idNumber: 1 }, { unique: true, sparse: true, background: true });

// 为档期日历添加索引，提高查询性能
ResumeSchema.index({
  'availabilityCalendar.date': 1,
  'availabilityCalendar.status': 1
});
