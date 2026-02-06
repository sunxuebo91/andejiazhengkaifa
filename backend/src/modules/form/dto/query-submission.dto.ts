import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySubmissionDto {
  @ApiProperty({ description: '跟进状态筛选', enum: ['pending', 'contacted', 'completed'], required: false })
  @IsOptional()
  @IsEnum(['pending', 'contacted', 'completed'])
  followUpStatus?: string;

  @ApiProperty({ description: '开始日期', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: '结束日期', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ description: '每页数量', default: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;
}

