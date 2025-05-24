import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, IsDateString, IsEnum, Matches, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// 定义枚举类型
export enum Education {
  NO = 'no',
  PRIMARY = 'primary',
  MIDDLE = 'middle',
  SECONDARY = 'secondary',
  VOCATIONAL = 'vocational',
  HIGH = 'high',
  COLLEGE = 'college',
  BACHELOR = 'bachelor',
  GRADUATE = 'graduate'
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed'
}

export enum Religion {
  NONE = 'none',
  BUDDHISM = 'buddhism',
  TAOISM = 'taoism',
  CHRISTIANITY = 'christianity',
  CATHOLICISM = 'catholicism',
  ISLAM = 'islam',
  OTHER = 'other'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
}

export enum Zodiac {
  RAT = 'rat',
  OX = 'ox',
  TIGER = 'tiger',
  RABBIT = 'rabbit',
  DRAGON = 'dragon',
  SNAKE = 'snake',
  HORSE = 'horse',
  GOAT = 'goat',
  MONKEY = 'monkey',
  ROOSTER = 'rooster',
  DOG = 'dog',
  PIG = 'pig'
}

export enum ZodiacSign {
  ARIES = 'aries',
  TAURUS = 'taurus',
  GEMINI = 'gemini',
  CANCER = 'cancer',
  LEO = 'leo',
  VIRGO = 'virgo',
  LIBRA = 'libra',
  SCORPIO = 'scorpio',
  SAGITTARIUS = 'sagittarius',
  CAPRICORN = 'capricorn',
  AQUARIUS = 'aquarius',
  PISCES = 'pisces'
}

export enum JobType {
  YUEXIN = 'yuexin',
  ZHUJIA_YUER = 'zhujia-yuer',
  BAIBAN_YUER = 'baiban-yuer',
  BAOJIE = 'baojie',
  BAIBAN_BAOMU = 'baiban-baomu',
  ZHUJIA_BAOMU = 'zhujia-baomu',
  YANGCHONG = 'yangchong',
  XIAOSHI = 'xiaoshi'
}

export enum OrderStatus {
  ACCEPTING = 'accepting',
  NOT_ACCEPTING = 'not-accepting',
  ON_SERVICE = 'on-service'
}

export enum Skill {
  CHANHOU = 'chanhou',
  TESHU_YINGER = 'teshu-yinger',
  YILIAO_BACKGROUND = 'yiliaobackground',
  YUYING = 'yuying',
  ZAOJIAO = 'zaojiao',
  FUSHI = 'fushi',
  ERTUI = 'ertui',
  WAIYU = 'waiyu',
  ZHONGCAN = 'zhongcan',
  XICAN = 'xican',
  MIANSHI = 'mianshi',
  JIASHI = 'jiashi',
  SHOUYI = 'shouyi'
}

export enum LeadSource {
  REFERRAL = 'referral',
  PAID_LEAD = 'paid-lead',
  COMMUNITY = 'community',
  DOOR_TO_DOOR = 'door-to-door',
  SHARED_ORDER = 'shared-order',
  OTHER = 'other'
}

export class CreateResumeDto {
  @ApiProperty({ description: '用户ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: '姓名', example: '张三' })
  @IsNotEmpty({ message: '姓名不能为空' })
  @IsString({ message: '姓名必须是字符串' })
  name: string;

  @ApiProperty({ description: '手机号码', example: '13800138000' })
  @IsNotEmpty({ message: '手机号码不能为空' })
  @IsString({ message: '手机号码必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入正确的手机号码' })
  phone: string;

  @ApiProperty({ description: '年龄', example: 35 })
  @IsNotEmpty({ message: '年龄不能为空' })
  @IsNumber({}, { message: '年龄必须是数字' })
  @Min(18, { message: '年龄必须大于等于18岁' })
  @Max(80, { message: '年龄必须小于等于80岁' })
  age: number;

  @ApiProperty({ description: '微信号', example: 'wxid_123456' })
  @IsOptional()
  @IsString()
  wechat?: string;

  @ApiProperty({ description: '身份证号', example: '110101199001011234' })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiProperty({ description: '学历', enum: Education })
  @IsNotEmpty({ message: '学历不能为空' })
  @IsEnum(Education, { message: '请选择正确的学历' })
  education: Education;

  @ApiProperty({ description: '婚姻状况', enum: MaritalStatus })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @ApiProperty({ description: '宗教信仰', enum: Religion })
  @IsOptional()
  @IsEnum(Religion)
  religion?: Religion;

  @ApiProperty({ description: '现居地址', example: '北京市朝阳区建国路88号' })
  @IsOptional()
  @IsString()
  currentAddress?: string;

  @ApiProperty({ description: '籍贯', example: '河南省郑州市' })
  @IsNotEmpty({ message: '籍贯不能为空' })
  @IsString({ message: '籍贯必须是字符串' })
  nativePlace: string;

  @ApiProperty({ description: '户口所在地', example: '河南省郑州市金水区' })
  @IsOptional()
  @IsString()
  hukouAddress?: string;

  @ApiProperty({ description: '出生日期', example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ description: '民族', example: '汉族' })
  @IsOptional()
  @IsString()
  ethnicity?: string;

  @ApiProperty({ description: '性别', enum: Gender })
  @IsNotEmpty({ message: '性别不能为空' })
  @IsEnum(Gender, { message: '性别必须是 male 或 female' })
  gender: Gender;

  @ApiProperty({ description: '生肖', enum: Zodiac })
  @IsOptional()
  @IsEnum(Zodiac)
  zodiac?: Zodiac;

  @ApiProperty({ description: '星座', enum: ZodiacSign })
  @IsOptional()
  @IsEnum(ZodiacSign)
  zodiacSign?: ZodiacSign;

  @ApiProperty({ description: '工作类型', enum: JobType })
  @IsNotEmpty({ message: '工种不能为空' })
  @IsEnum(JobType, { message: '请选择正确的工种' })
  jobType: JobType;

  @ApiProperty({ description: '期望薪资', example: 8000 })
  @IsOptional()
  @IsNumber({}, { message: '期望薪资必须是数字' })
  @Min(0, { message: '期望薪资必须大于等于0' })
  expectedSalary?: number;

  @ApiProperty({ description: '服务区域', example: '郑州市金水区' })
  @IsOptional()
  @IsString()
  serviceArea?: string;

  @ApiProperty({ description: '接单状态', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;

  @ApiProperty({ description: '技能列表', enum: Skill, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Skill, { each: true })
  skills?: Skill[];

  @ApiProperty({ description: '工作经验年限', example: 5 })
  @IsNotEmpty({ message: '工作经验年限不能为空' })
  @IsNumber({}, { message: '工作经验年限必须是数字' })
  @Min(0, { message: '工作经验年限必须大于等于0' })
  @Max(50, { message: '工作经验年限必须小于等于50' })
  experienceYears: number;

  @ApiProperty({ description: '来源渠道', enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  leadSource?: LeadSource;

  @ApiProperty({ 
    description: '工作经历', 
    example: [
      {
        startDate: '2020-01',
        endDate: '2022-12',
        description: '在郑州市某家庭担任育儿嫂，负责照顾2岁幼儿的日常生活和早教'
      }
    ]
  })
  @IsOptional()
  @IsArray()
  workExperiences?: Array<{
    startDate: string;
    endDate: string;
    description: string;
  }>;

  @ApiProperty({ description: '身份证正面照片URL', example: 'https://example.com/idcard_front.jpg' })
  @IsOptional()
  @IsString()
  idCardFrontUrl?: string;

  @ApiProperty({ description: '身份证背面照片URL', example: 'https://example.com/idcard_back.jpg' })
  @IsOptional()
  @IsString()
  idCardBackUrl?: string;

  @ApiProperty({ description: '个人照片URL列表', example: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'] })
  @IsOptional()
  @IsArray()
  photoUrls?: string[];

  @ApiProperty({ description: '证书照片URL列表', example: ['https://example.com/cert1.jpg', 'https://example.com/cert2.jpg'] })
  @IsOptional()
  @IsArray()
  certificateUrls?: string[];

  @ApiProperty({ description: '体检报告URL列表', example: ['https://example.com/medical1.pdf', 'https://example.com/medical2.pdf'] })
  @IsOptional()
  @IsArray()
  medicalReportUrls?: string[];

  // 新增字段
  @ApiProperty({ description: '紧急联系人姓名', example: '李四' })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiProperty({ description: '紧急联系人电话', example: '13900139000' })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiProperty({ description: '体检时间', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  medicalExamDate?: string;
}