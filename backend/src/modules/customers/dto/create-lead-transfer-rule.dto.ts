import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsArray, IsNumber, Min, Max, IsEnum, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// 日期范围 DTO (必须在 TriggerConditionsDto 之前定义)
export class DateRangeDto {
  @ApiProperty({ description: '开始日期', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: '结束日期', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// 触发条件 DTO
export class TriggerConditionsDto {
  @ApiProperty({ description: '无活动小时数', example: 48 })
  @IsNumber()
  @Min(1)
  inactiveHours: number;

  @ApiProperty({ description: '客户状态', example: ['待定', '匹配中'] })
  @IsArray()
  @IsEnum(['已签约', '匹配中', '已面试', '流失客户', '已退款', '退款中', '待定'], { each: true })
  contractStatuses: string[];

  @ApiProperty({ description: '线索来源筛选', required: false, example: ['美团', '抖音'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  leadSources?: string[];

  @ApiProperty({ description: '线索创建日期范围', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  createdDateRange?: DateRangeDto;
}

// 执行时间窗口 DTO
export class ExecutionWindowDto {
  @ApiProperty({ description: '是否启用时间窗口', example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: '开始时间', example: '09:30' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: '结束时间', example: '18:30' })
  @IsString()
  endTime: string;
}

// 分配策略配置 DTO
export class DistributionConfigDto {
  @ApiProperty({ description: '分配策略', example: 'balanced-random' })
  @IsString()
  @IsEnum(['balanced-random'])
  strategy: string;

  @ApiProperty({ description: '是否启用补偿机制', example: true })
  @IsBoolean()
  enableCompensation: boolean;

  @ApiProperty({ description: '补偿优先级（1-10）', example: 5 })
  @IsNumber()
  @Min(1)
  @Max(10)
  compensationPriority: number;
}

// 创建规则 DTO
export class CreateLeadTransferRuleDto {
  @ApiProperty({ description: '规则名称', example: '销售组48小时流转规则' })
  @IsString()
  @IsNotEmpty()
  ruleName: string;

  @ApiProperty({ description: '规则描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '是否启用', example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: '触发条件' })
  @ValidateNested()
  @Type(() => TriggerConditionsDto)
  triggerConditions: TriggerConditionsDto;

  @ApiProperty({ description: '执行时间窗口', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExecutionWindowDto)
  executionWindow?: ExecutionWindowDto;

  @ApiProperty({ description: '流出用户ID列表', example: ['userId1', 'userId2'] })
  @IsArray()
  @IsString({ each: true })
  sourceUserIds: string[];

  @ApiProperty({ description: '流入用户ID列表', example: ['userId3', 'userId4'] })
  @IsArray()
  @IsString({ each: true })
  targetUserIds: string[];

  @ApiProperty({ description: '分配策略配置', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => DistributionConfigDto)
  distributionConfig?: DistributionConfigDto;
}

