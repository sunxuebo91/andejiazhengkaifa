import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  ValidateIf,
  Min,
  MaxLength,
  Matches,
  IsArray,
  IsBoolean,
  IsMongoId
} from 'class-validator';
import { IntentionLevel } from '../models/training-lead.model';

export class CreateTrainingLeadDto {
  @ApiProperty({ description: '客户姓名', example: '张三' })
  @IsString()
  @IsNotEmpty({ message: '客户姓名不能为空' })
  @MaxLength(50, { message: '客户姓名不能超过50个字符' })
  name: string;

  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiPropertyOptional({ description: '微信号', example: 'wechat123' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '微信号不能超过50个字符' })
  wechatId?: string;

  @ApiPropertyOptional({
    description: '线索来源',
    enum: ['美团', '抖音', '快手', '小红书', '转介绍', '其他'],
    example: '美团'
  })
  @IsOptional()
  @IsString()
  @IsEnum(['美团', '抖音', '快手', '小红书', '转介绍', '其他'], {
    message: '线索来源必须是：美团、抖音、快手、小红书、转介绍、其他之一'
  })
  leadSource?: string;

  @ApiPropertyOptional({
    description: '培训类型',
    enum: ['月嫂', '育儿嫂', '保姆', '护老', '师资'],
    example: '月嫂'
  })
  @IsOptional()
  @IsString()
  @IsEnum(['月嫂', '育儿嫂', '保姆', '护老', '师资'], {
    message: '培训类型必须是：月嫂、育儿嫂、保姆、护老、师资之一'
  })
  trainingType?: string;

  @ApiPropertyOptional({
    description: '意向课程（多选）',
    type: [String],
    example: ['高级母婴护理师', '高级催乳师']
  })
  @IsOptional()
  @IsArray({ message: '意向课程必须是数组' })
  @IsEnum(
    [
      '高级母婴护理师',
      '高级催乳师',
      '高级产后修复师',
      '月子餐营养师',
      '高级育婴师',
      '早教指导师',
      '辅食营养师',
      '小儿推拿师',
      '高级养老护理师',
      '早教精英班'
    ],
    { each: true, message: '意向课程选项不正确' }
  )
  intendedCourses?: string[];

  @ApiPropertyOptional({
    description: '已报证书（多选）',
    type: [String],
    example: ['高级母婴护理师', '高级催乳师']
  })
  @IsOptional()
  @IsArray({ message: '已报证书必须是数组' })
  @IsEnum(
    [
      '高级母婴护理师',
      '高级催乳师',
      '高级产后修复师',
      '月子餐营养师',
      '高级育婴师',
      '早教指导师',
      '辅食营养师',
      '小儿推拿师',
      '高级养老护理师',
      '早教精英班'
    ],
    { each: true, message: '已报证书选项不正确' }
  )
  reportedCertificates?: string[];

  @ApiPropertyOptional({
    description: '意向程度',
    enum: IntentionLevel,
    example: IntentionLevel.MEDIUM
  })
  @IsOptional()
  @IsEnum(IntentionLevel, { message: '意向程度必须是：高、中、低之一' })
  intentionLevel?: string;

  @ApiPropertyOptional({ description: '期望开课时间', example: '2026-02-01' })
  @IsOptional()
  @IsDateString({}, { message: '期望开课时间格式不正确' })
  expectedStartDate?: string;

  @ApiPropertyOptional({ description: '预算金额', example: 5000 })
  @IsOptional()
  @IsNumber({}, { message: '预算金额必须是数字' })
  @Min(0, { message: '预算金额不能为负数' })
  budget?: number;

  @ApiPropertyOptional({ description: '所在地区', example: '杭州市西湖区' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '所在地区不能超过100个字符' })
  address?: string;

  @ApiPropertyOptional({ description: '是否报征', example: false })
  @IsOptional()
  @IsBoolean({ message: '是否报征必须是布尔值' })
  isReported?: boolean;

  @ApiPropertyOptional({ description: '学员归属（负责该学员的人员ID）', example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsMongoId({ message: '学员归属必须是有效的用户ID' })
  studentOwner?: string;

  @ApiPropertyOptional({ description: '备注信息', example: '客户对月嫂培训很感兴趣' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '备注信息不能超过500个字符' })
  remarks?: string;
}

