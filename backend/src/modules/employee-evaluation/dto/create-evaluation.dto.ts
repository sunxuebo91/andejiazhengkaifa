import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, Min, Max, IsMongoId } from 'class-validator';

export class CreateEvaluationDto {
  @ApiProperty({ description: '被评价员工ID（简历ID）', example: '507f1f77bcf86cd799439011' })
  @IsMongoId({ message: '员工ID格式不正确' })
  employeeId: string;

  @ApiProperty({ description: '被评价员工姓名', example: '张三' })
  @IsString()
  employeeName: string;

  @ApiProperty({ description: '关联合同ID', required: false, example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsMongoId({ message: '合同ID格式不正确' })
  contractId?: string;

  @ApiProperty({ description: '订单编号', required: false, example: 'CON20240101001' })
  @IsOptional()
  @IsString()
  contractNo?: string;

  @ApiProperty({ 
    description: '评价类型', 
    enum: ['daily', 'monthly', 'contract_end', 'special'],
    example: 'daily'
  })
  @IsEnum(['daily', 'monthly', 'contract_end', 'special'], { message: '评价类型不正确' })
  evaluationType: string;

  @ApiProperty({ description: '综合评分（1-5分）', example: 4.5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1, { message: '综合评分最低1分' })
  @Max(5, { message: '综合评分最高5分' })
  overallRating: number;

  @ApiProperty({ description: '服务态度评分（1-5分）', required: false, example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  serviceAttitudeRating?: number;

  @ApiProperty({ description: '专业技能评分（1-5分）', required: false, example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  professionalSkillRating?: number;

  @ApiProperty({ description: '工作效率评分（1-5分）', required: false, example: 4.5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  workEfficiencyRating?: number;

  @ApiProperty({ description: '沟通能力评分（1-5分）', required: false, example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiProperty({ description: '评价内容', example: '工作认真负责，专业技能强' })
  @IsString()
  comment: string;

  @ApiProperty({ description: '优点', required: false, example: '服务态度好，技能熟练' })
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiProperty({ description: '待改进项', required: false, example: '沟通可以更主动' })
  @IsOptional()
  @IsString()
  improvements?: string;

  @ApiProperty({ 
    description: '评价标签', 
    required: false, 
    example: ['认真负责', '技能熟练', '沟通良好'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: '是否公开（显示给员工）', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ 
    description: '评价状态', 
    enum: ['draft', 'published', 'archived'],
    required: false,
    example: 'published'
  })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: string;
}

