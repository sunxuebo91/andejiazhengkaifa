import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { LeadStatus } from '../models/training-lead.model';

export class TrainingLeadQueryDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '搜索关键词（姓名、手机号、微信号、学员编号）', example: '张三' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '状态筛选',
    enum: LeadStatus,
    example: LeadStatus.FOLLOWING
  })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: string;

  @ApiPropertyOptional({
    description: '线索来源筛选',
    enum: ['美团', '抖音', '快手', '小红书', '转介绍', '其他'],
    example: '美团'
  })
  @IsOptional()
  @IsString()
  leadSource?: string;

  @ApiPropertyOptional({
    description: '培训类型筛选',
    enum: ['月嫂', '育儿嫂', '保洁', '养老护理', '催乳师', '小儿推拿', '其他'],
    example: '月嫂'
  })
  @IsOptional()
  @IsString()
  trainingType?: string;

  @ApiPropertyOptional({ description: '创建开始日期', example: '2026-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '创建结束日期', example: '2026-01-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: '分配给（销售人员ID）' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: '创建人ID（用于权限过滤）' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: '是否报征筛选', example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isReported?: boolean;

  @ApiPropertyOptional({ description: '学员归属筛选（负责该学员的人员ID，或传 __unassigned__ 筛选未分配）' })
  @IsOptional()
  @IsString()
  studentOwner?: string;

  @ApiPropertyOptional({ description: '最近跟进结果筛选', example: '已接通' })
  @IsOptional()
  @IsString()
  lastFollowUpResult?: string;

  @ApiPropertyOptional({ description: '是否查询公海池线索', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inPublicPool?: boolean;
}

