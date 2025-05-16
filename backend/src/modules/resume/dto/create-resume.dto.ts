import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, IsDateString } from 'class-validator';

export class CreateResumeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  wechat?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  currentAddress?: string;

  @IsOptional()
  @IsString()
  nativePlace?: string;

  @IsOptional()
  @IsString()
  hukouAddress?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  ethnicity?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  zodiac?: string;

  @IsOptional()
  @IsString()
  zodiacSign?: string;

  @IsOptional()
  @IsString()
  jobType?: string;

  @IsOptional()
  @IsNumber()
  expectedSalary?: number;

  @IsOptional()
  @IsString()
  serviceArea?: string;

  @IsOptional()
  @IsString()
  orderStatus?: string;

  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  @IsNumber()
  experienceYears?: number;

  @IsOptional()
  @IsString()
  leadSource?: string;

  @IsOptional()
  @IsArray()
  workExperience?: Array<{
    startDate: string;
    endDate: string;
    description: string;
  }>;

  @IsOptional()
  @IsString()
  idCardFrontUrl?: string;

  @IsOptional()
  @IsString()
  idCardBackUrl?: string;

  @IsOptional()
  @IsArray()
  photoUrls?: string[];

  @IsOptional()
  @IsArray()
  certificateUrls?: string[];

  @IsOptional()
  @IsArray()
  medicalReportUrls?: string[];
}