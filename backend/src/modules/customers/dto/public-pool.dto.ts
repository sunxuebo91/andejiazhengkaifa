import { IsArray, IsString, IsOptional, IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// 领取客户 DTO
export class ClaimCustomersDto {
  @ApiProperty({ description: '客户ID列表', type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  customerIds: string[];
}

// 从公海分配客户 DTO
export class AssignFromPoolDto {
  @ApiProperty({ description: '客户ID列表', type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  customerIds: string[];

  @ApiProperty({ description: '分配给的用户ID' })
  @IsMongoId()
  @IsNotEmpty()
  assignedTo: string;

  @ApiProperty({ description: '分配原因', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

// 释放到公海 DTO
export class ReleaseToPoolDto {
  @ApiProperty({ description: '释放原因' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

// 批量释放到公海 DTO
export class BatchReleaseToPoolDto {
  @ApiProperty({ description: '客户ID列表', type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  customerIds: string[];

  @ApiProperty({ description: '释放原因' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

// 公海查询 DTO
export class PublicPoolQueryDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  limit?: number;

  @ApiProperty({ description: '线索来源', required: false })
  @IsOptional()
  @IsString()
  leadSource?: string;

  @ApiProperty({ description: '服务类别', required: false })
  @IsOptional()
  @IsString()
  serviceCategory?: string;

  @ApiProperty({ description: '线索等级', required: false })
  @IsOptional()
  @IsString()
  leadLevel?: string;

  @ApiProperty({ description: '最小预算', required: false })
  @IsOptional()
  minBudget?: number;

  @ApiProperty({ description: '最大预算', required: false })
  @IsOptional()
  maxBudget?: number;

  @ApiProperty({ description: '搜索关键词（姓名/电话）', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

