import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type FormFieldDocument = FormField & Document;

/**
 * 表单字段选项
 */
@Schema({ _id: false })
export class FieldOption {
  @ApiProperty({ description: '选项值' })
  @Prop({ required: true })
  value: string;

  @ApiProperty({ description: '选项标签' })
  @Prop({ required: true })
  label: string;
}

export const FieldOptionSchema = SchemaFactory.createForClass(FieldOption);

/**
 * 表单字段配置模型
 */
@Schema({ timestamps: true, collection: 'form_fields' })
export class FormField extends Document {
  @ApiProperty({ description: '所属表单ID' })
  @Prop({ type: Types.ObjectId, ref: 'FormConfig', required: true })
  formId: Types.ObjectId;

  @ApiProperty({ description: '字段标签（显示名称）' })
  @Prop({ required: true })
  label: string;

  @ApiProperty({ description: '字段名称（英文key）' })
  @Prop({ required: true })
  fieldName: string;

  @ApiProperty({ 
    description: '字段类型', 
    enum: ['text', 'textarea', 'radio', 'checkbox', 'select', 'phone', 'date', 'email']
  })
  @Prop({ 
    required: true, 
    enum: ['text', 'textarea', 'radio', 'checkbox', 'select', 'phone', 'date', 'email']
  })
  fieldType: string;

  @ApiProperty({ description: '是否必填', default: false })
  @Prop({ default: false })
  required: boolean;

  @ApiProperty({ description: '占位符提示', required: false })
  @Prop()
  placeholder?: string;

  @ApiProperty({ description: '字段选项（用于radio、checkbox、select）', type: [FieldOption], required: false })
  @Prop({ type: [FieldOptionSchema], default: [] })
  options: FieldOption[];

  @ApiProperty({ description: '排序顺序（数字越小越靠前）', default: 0 })
  @Prop({ default: 0 })
  order: number;

  @ApiProperty({ description: '验证规则（正则表达式）', required: false })
  @Prop()
  validationRule?: string;

  @ApiProperty({ description: '验证错误提示', required: false })
  @Prop()
  validationMessage?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export const FormFieldSchema = SchemaFactory.createForClass(FormField);

// 创建索引
FormFieldSchema.index({ formId: 1, order: 1 });
FormFieldSchema.index({ formId: 1, fieldName: 1 }, { unique: true });

