import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsDateString, 
  IsUrl, 
  IsBoolean,
  IsArray,
  ValidateNested,
  ArrayMinSize
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 字段选项DTO
 */
export class FieldOptionDto {
  @ApiProperty({ description: '选项值', example: 'option1' })
  @IsString()
  value: string;

  @ApiProperty({ description: '选项标签', example: '选项一' })
  @IsString()
  label: string;
}

/**
 * 表单字段DTO
 */
export class FormFieldDto {
  @ApiProperty({ description: '字段标签', example: '姓名' })
  @IsString()
  label: string;

  @ApiProperty({ description: '字段名称（英文key）', example: 'name' })
  @IsString()
  fieldName: string;

  @ApiProperty({ 
    description: '字段类型', 
    enum: ['text', 'textarea', 'radio', 'checkbox', 'select', 'phone', 'date', 'email'],
    example: 'text'
  })
  @IsEnum(['text', 'textarea', 'radio', 'checkbox', 'select', 'phone', 'date', 'email'])
  fieldType: string;

  @ApiProperty({ description: '是否必填', default: false })
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiProperty({ description: '占位符提示', required: false, example: '请输入姓名' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiProperty({ description: '字段选项（用于radio、checkbox、select）', type: [FieldOptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @ApiProperty({ description: '排序顺序', default: 0 })
  @IsOptional()
  order?: number;

  @ApiProperty({ description: '验证规则（正则表达式）', required: false })
  @IsOptional()
  @IsString()
  validationRule?: string;

  @ApiProperty({ description: '验证错误提示', required: false })
  @IsOptional()
  @IsString()
  validationMessage?: string;
}

/**
 * 创建表单DTO
 */
export class CreateFormDto {
  @ApiProperty({ description: '表单标题', example: '用户意见收集表' })
  @IsString()
  title: string;

  @ApiProperty({ description: '表单描述', required: false, example: '请填写您的宝贵意见' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Banner图片URL', required: false })
  @IsOptional()
  @IsString()
  @IsUrl()
  bannerUrl?: string;

  @ApiProperty({ 
    description: '状态', 
    enum: ['active', 'inactive'],
    default: 'active'
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;

  @ApiProperty({ description: '生效开始时间', required: false })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiProperty({ description: '生效结束时间', required: false })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiProperty({ description: '提交成功提示语', default: '提交成功！感谢您的参与。' })
  @IsOptional()
  @IsString()
  successMessage?: string;

  @ApiProperty({ description: '是否允许重复提交', default: false })
  @IsOptional()
  @IsBoolean()
  allowMultipleSubmissions?: boolean;

  @ApiProperty({ description: '表单字段列表', type: [FormFieldDto] })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一个字段' })
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];
}

