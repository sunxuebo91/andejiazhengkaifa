import { IsNotEmpty, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AvailabilityStatus } from '../models/availability-period.schema';

// 更新档期 DTO
export class UpdateAvailabilityDto {
  @ApiProperty({ description: '开始日期', example: '2024-01-01' })
  @IsNotEmpty({ message: '开始日期不能为空' })
  @IsDateString({}, { message: '开始日期格式不正确' })
  startDate: string;

  @ApiProperty({ description: '结束日期', example: '2024-01-26' })
  @IsNotEmpty({ message: '结束日期不能为空' })
  @IsDateString({}, { message: '结束日期格式不正确' })
  endDate: string;

  @ApiProperty({ 
    description: '档期状态', 
    enum: AvailabilityStatus,
    example: AvailabilityStatus.AVAILABLE 
  })
  @IsNotEmpty({ message: '档期状态不能为空' })
  @IsEnum(AvailabilityStatus, { message: '请选择正确的档期状态' })
  status: AvailabilityStatus;

  @ApiProperty({ description: '关联合同ID', required: false })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remarks?: string;
}

// 批量更新档期 DTO
export class BatchUpdateAvailabilityDto {
  @ApiProperty({ description: '日期列表', example: ['2024-01-01', '2024-01-02'] })
  @IsNotEmpty({ message: '日期列表不能为空' })
  dates: string[];

  @ApiProperty({ 
    description: '档期状态', 
    enum: AvailabilityStatus 
  })
  @IsNotEmpty({ message: '档期状态不能为空' })
  @IsEnum(AvailabilityStatus, { message: '请选择正确的档期状态' })
  status: AvailabilityStatus;

  @ApiProperty({ description: '关联合同ID', required: false })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remarks?: string;
}

// 查询档期 DTO
export class QueryAvailabilityDto {
  @ApiProperty({ description: '开始日期', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: '结束日期', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: '档期状态', enum: AvailabilityStatus, required: false })
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  status?: AvailabilityStatus;
}

