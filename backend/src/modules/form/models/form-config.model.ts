import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type FormConfigDocument = FormConfig & Document;

/**
 * 表单配置模型
 */
@Schema({ timestamps: true, collection: 'form_configs' })
export class FormConfig extends Document {
  @ApiProperty({ description: '表单标题' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ description: '表单描述', required: false })
  @Prop()
  description?: string;

  @ApiProperty({ description: 'Banner图片URL（腾讯云COS）', required: false })
  @Prop()
  bannerUrl?: string;

  @ApiProperty({ 
    description: '状态', 
    enum: ['active', 'inactive'],
    default: 'active'
  })
  @Prop({ default: 'active', enum: ['active', 'inactive'] })
  status: string;

  @ApiProperty({ description: '生效开始时间', required: false })
  @Prop()
  startTime?: Date;

  @ApiProperty({ description: '生效结束时间', required: false })
  @Prop()
  endTime?: Date;

  @ApiProperty({ description: '提交成功提示语', default: '提交成功！感谢您的参与。' })
  @Prop({ default: '提交成功！感谢您的参与。' })
  successMessage: string;

  @ApiProperty({ description: '是否允许重复提交', default: false })
  @Prop({ default: false })
  allowMultipleSubmissions: boolean;

  @ApiProperty({ description: '提交次数统计', default: 0 })
  @Prop({ default: 0 })
  submissionCount: number;

  @ApiProperty({ description: '浏览次数统计', default: 0 })
  @Prop({ default: 0 })
  viewCount: number;

  @ApiProperty({ description: '创建人ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @ApiProperty({ description: '更新人ID' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export const FormConfigSchema = SchemaFactory.createForClass(FormConfig);

// 创建索引
FormConfigSchema.index({ status: 1, createdAt: -1 });
FormConfigSchema.index({ startTime: 1, endTime: 1 });

