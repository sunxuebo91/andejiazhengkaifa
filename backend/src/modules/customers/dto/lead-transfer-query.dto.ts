import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LeadTransferQueryDto {
  @ApiProperty({ description: '规则ID', required: false })
  @IsOptional()
  @IsString()
  ruleId?: string;

  @ApiProperty({ description: '客户ID', required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ description: '原负责人ID', required: false })
  @IsOptional()
  @IsString()
  fromUserId?: string;

  @ApiProperty({ description: '新负责人ID', required: false })
  @IsOptional()
  @IsString()
  toUserId?: string;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @IsEnum(['success', 'failed'])
  status?: string;

  @ApiProperty({ description: '开始日期', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: '结束日期', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: '每页数量', required: false, default: 20 })
  @IsOptional()
  limit?: number;
}

