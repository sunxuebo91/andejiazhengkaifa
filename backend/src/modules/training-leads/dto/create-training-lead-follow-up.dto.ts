import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength
} from 'class-validator';
import { FollowUpType } from '../models/training-lead-follow-up.model';

export class CreateTrainingLeadFollowUpDto {
  @ApiProperty({
    description: '跟进方式',
    enum: FollowUpType,
    example: FollowUpType.PHONE
  })
  @IsEnum(FollowUpType, { message: '跟进方式必须是：电话、微信、到店、其他之一' })
  @IsNotEmpty({ message: '跟进方式不能为空' })
  type: string;

  @ApiProperty({
    description: '跟进内容',
    example: '客户表示对月嫂培训很感兴趣，已发送课程资料，约定下周三再次联系'
  })
  @IsString()
  @IsNotEmpty({ message: '跟进内容不能为空' })
  @MinLength(5, { message: '跟进内容至少5个字符' })
  @MaxLength(1000, { message: '跟进内容不能超过1000个字符' })
  content: string;

  @ApiPropertyOptional({
    description: '下次跟进时间',
    example: '2026-02-01T10:00:00.000Z'
  })
  @IsOptional()
  @IsDateString({}, { message: '下次跟进时间格式不正确' })
  nextFollowUpDate?: string;
}

