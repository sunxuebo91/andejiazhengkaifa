import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsMongoId } from 'class-validator';

export class QueryEvaluationDto {
  @ApiProperty({ description: '员工ID', required: false })
  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @ApiProperty({ description: '评价人ID', required: false })
  @IsOptional()
  @IsMongoId()
  evaluatorId?: string;

  @ApiProperty({ 
    description: '评价类型', 
    enum: ['daily', 'monthly', 'contract_end', 'special'],
    required: false
  })
  @IsOptional()
  @IsEnum(['daily', 'monthly', 'contract_end', 'special'])
  evaluationType?: string;

  @ApiProperty({ 
    description: '评价状态', 
    enum: ['draft', 'published', 'archived'],
    required: false
  })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: string;

  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  pageSize?: number;
}

