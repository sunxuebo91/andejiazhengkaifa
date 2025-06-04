import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, IsMongoId } from 'class-validator';
import { FollowUpType } from '../models/follow-up.entity';

export class CreateFollowUpDto {
  @ApiProperty({ description: '关联的简历ID' })
  @IsMongoId()
  @IsNotEmpty()
  resumeId: string;

  @ApiProperty({ description: '跟进类型', enum: FollowUpType })
  @IsEnum(FollowUpType)
  @IsNotEmpty()
  type: FollowUpType;

  @ApiProperty({ description: '跟进内容' })
  @IsString()
  @IsNotEmpty()
  content: string;
} 