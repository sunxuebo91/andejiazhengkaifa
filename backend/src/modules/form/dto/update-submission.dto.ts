import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';

/**
 * 更新提交记录DTO（用于跟进）
 */
export class UpdateSubmissionDto {
  @ApiProperty({ description: '跟进状态', enum: ['pending', 'contacted', 'completed'], required: false })
  @IsOptional()
  @IsEnum(['pending', 'contacted', 'completed'])
  followUpStatus?: string;

  @ApiProperty({ description: '跟进备注', required: false })
  @IsOptional()
  @IsString()
  followUpNote?: string;
}

