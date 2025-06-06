import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, IsDateString, IsEnum, Matches, Min, Max, Allow } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import dayjs from 'dayjs';

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
  SHOUYI = 'shouyi',
  MUYING = 'muying',
  CUIRU = 'cuiru',
  YUEZICAN = 'yuezican'
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
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    return value;
  })
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
  @IsEnum(MaritalStatus, { message: '请选择有效的婚姻状况' })
  @Transform(({ value }) => {
    if (!value || value === '' || value === null || value === undefined) return undefined;
    // 如果值不在枚举中，返回undefined
    if (!Object.values(MaritalStatus).includes(value as MaritalStatus)) {
      return undefined;
    }
    return value;
  })
  maritalStatus?: MaritalStatus;

  @ApiProperty({ description: '宗教信仰', enum: Religion })
  @IsOptional()
  @IsEnum(Religion, { message: '请选择有效的宗教信仰' })
  @Transform(({ value }) => {
    if (!value || value === '' || value === null || value === undefined) return undefined;
    // 处理前端可能传入的中文值
    const religionMap = {
      '无': Religion.NONE,
      '佛教': Religion.BUDDHISM,
      '基督教': Religion.CHRISTIANITY,
      '伊斯兰教': Religion.ISLAM,
      '天主教': Religion.CATHOLICISM,
      '道教': Religion.TAOISM,
      '其他': Religion.OTHER
    };
    const mappedValue = religionMap[value] || value;
    // 如果映射后的值不在枚举中，返回undefined
    if (!Object.values(Religion).includes(mappedValue as Religion)) {
      return undefined;
    }
    return mappedValue;
  })
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
  @IsOptional()
  @ApiProperty({ description: '出生日期', example: '1990-01-01' })
  @IsOptional()
  @IsDateString({}, { message: 'birthDate must be a valid date string (YYYY-MM-DD or ISO 8601)' })
  @Transform(({ value }) => {
  // 处理空值情况
  if (!value || value === '' || value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    // 尝试解析多种日期格式
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return value; // 返回原值，让验证器处理错误
    }
    return date.toISOString().split('T')[0]; // 返回 YYYY-MM-DD 格式
  }
  return value;
  })
  birthDate?: string;

  @ApiProperty({ description: '民族', example: '汉族' })
  @IsOptional()
  @IsString()
  ethnicity?: string;

  @ApiProperty({ description: '性别', enum: Gender })
  @IsNotEmpty({ message: '性别不能为空' })
  @IsEnum(Gender, { message: '性别必须是 male 或 female' })
  @Transform(({ value }) => {
    if (value === 'male') return Gender.MALE;
    if (value === 'female') return Gender.FEMALE;
    return value;
  })
  gender: Gender;

  @ApiProperty({ description: '生肖', enum: Zodiac })
  @IsOptional()
  @IsEnum(Zodiac, { message: '请选择有效的生肖' })
  @Transform(({ value }) => {
    if (!value || value === '' || value === null || value === undefined) return undefined;
    if (!Object.values(Zodiac).includes(value as Zodiac)) {
      return undefined;
    }
    return value;
  })
  zodiac?: Zodiac;

  @ApiProperty({ description: '星座', enum: ZodiacSign })
  @IsOptional()
  @IsEnum(ZodiacSign, { message: '请选择有效的星座' })
  @Transform(({ value }) => {
    if (!value || value === '' || value === null || value === undefined) return undefined;
    if (!Object.values(ZodiacSign).includes(value as ZodiacSign)) {
      return undefined;
    }
    return value;
  })
  zodiacSign?: ZodiacSign;

  @ApiProperty({ description: '工作类型', enum: JobType })
  @IsNotEmpty({ message: '工种不能为空' })
  @IsEnum(JobType, { message: '请选择正确的工种' })
  @Transform(({ value }) => {
    if (!value) return value; // 保持原值，让 @IsNotEmpty 处理
    const jobType = value.toLowerCase();
    // 确保值在枚举范围内
    if (Object.values(JobType).includes(jobType as JobType)) {
      return jobType;
    }
    return value; // 返回原值，让 @IsEnum 处理验证错误
  })
  jobType: JobType;

  @ApiProperty({ description: '期望薪资', example: 8000 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : Math.max(0, Math.floor(num));
  })
  @IsNumber({}, { message: '期望薪资必须是数字' })
  @Min(0, { message: '期望薪资必须大于等于0' })
  expectedSalary?: number;

  @ApiProperty({ description: '服务区域', example: ['郑州市金水区'] })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  serviceArea?: string[];

  @ApiProperty({ description: '接单状态', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus, { message: '请选择有效的接单状态' })
  @Transform(({ value }) => {
    if (!value || value === '' || value === null || value === undefined) return undefined;
    if (!Object.values(OrderStatus).includes(value as OrderStatus)) {
      return undefined;
    }
    return value;
  })
  orderStatus?: OrderStatus;

  @ApiProperty({ description: '技能列表', enum: Skill, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Skill, { each: true, message: '请选择有效的技能标签' })
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(s => s.toLowerCase()) : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value.map(s => s.toLowerCase()) : [];
  })
  skills?: Skill[];

  @ApiProperty({ description: '工作经验年限', example: 5 })
  @IsNotEmpty({ message: '工作经验年限不能为空' })
  @IsNumber({}, { message: '工作经验年限必须是数字' })
  @Min(0, { message: '工作经验年限必须大于等于0' })
  @Max(50, { message: '工作经验年限必须小于等于50' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  experienceYears: number;

  @ApiProperty({ description: '来源渠道', enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource, { message: '请选择有效的来源渠道' })
  @Transform(({ value }) => {
    if (!value || value === '' || value === null || value === undefined) return undefined;
    if (!Object.values(LeadSource).includes(value as LeadSource)) {
      return undefined;
    }
    return value;
  })
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
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(exp => ({
          startDate: exp.startDate ? dayjs(exp.startDate).format('YYYY-MM') : undefined,
          endDate: exp.endDate ? dayjs(exp.endDate).format('YYYY-MM') : undefined,
          description: exp.description
        })) : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value.map(exp => ({
      startDate: exp.startDate ? dayjs(exp.startDate).format('YYYY-MM') : undefined,
      endDate: exp.endDate ? dayjs(exp.endDate).format('YYYY-MM') : undefined,
      description: exp.description
    })) : [];
  })
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

  @ApiProperty({ description: '文件类型数组', example: ['idCardFront', 'idCardBack', 'personalPhoto'] })
  @IsOptional()
  @Allow()
  fileTypes?: string[];
}