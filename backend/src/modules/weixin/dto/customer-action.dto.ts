import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerActionDto {
  @ApiProperty({ description: '客户ID', example: 'customer_123' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: '顾问ID', example: 'advisor_123' })
  @IsString()
  @IsNotEmpty()
  advisorId: string;

  @ApiProperty({ description: '行为类型', example: 'view_resume' })
  @IsString()
  @IsNotEmpty()
  actionType: string;

  @ApiProperty({ description: '行为相关数据', example: { resumeId: 'resume_123' } })
  @IsObject()
  @IsNotEmpty()
  actionData: any;

  @ApiProperty({ description: '客户姓名', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ description: '客户电话', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ description: '简历ID', required: false })
  @IsOptional()
  @IsString()
  resumeId?: string;

  @ApiProperty({ description: '客户IP地址', required: false })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiProperty({ description: '用户代理', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: '关联的客户记录ID', required: false })
  @IsOptional()
  @IsString()
  customerRecordId?: string;
}
