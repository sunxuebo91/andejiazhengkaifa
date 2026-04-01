import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, Min, Max } from 'class-validator';

export class UpdateEvaluationDto {
  @ApiProperty({ description: '评价类型', enum: ['daily', 'monthly', 'contract_end', 'special'], required: false })
  @IsOptional()
  @IsEnum(['daily', 'monthly', 'contract_end', 'special'], { message: '评价类型不正确' })
  evaluationType?: string;

  @ApiProperty({ description: '综合评分（1-5分）', required: false, example: 4.5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: '综合评分最低1分' })
  @Max(5, { message: '综合评分最高5分' })
  overallRating?: number;

  @ApiProperty({ description: '服务态度评分（1-5分）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  serviceAttitudeRating?: number;

  @ApiProperty({ description: '专业技能评分（1-5分）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  professionalSkillRating?: number;

  @ApiProperty({ description: '工作效率评分（1-5分）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  workEfficiencyRating?: number;

  @ApiProperty({ description: '沟通能力评分（1-5分）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiProperty({ description: '评价内容', required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: '优点', required: false })
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiProperty({ description: '待改进项', required: false })
  @IsOptional()
  @IsString()
  improvements?: string;

  @ApiProperty({ description: '评价标签', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: '是否公开', required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ description: '评价状态', enum: ['draft', 'published', 'archived'], required: false })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: string;
}

