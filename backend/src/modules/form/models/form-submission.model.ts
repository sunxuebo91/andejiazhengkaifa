import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type FormSubmissionDocument = FormSubmission & Document;

/**
 * 表单提交记录模型
 */
@Schema({ timestamps: true, collection: 'form_submissions' })
export class FormSubmission extends Document {
  @ApiProperty({ description: '所属表单ID' })
  @Prop({ type: Types.ObjectId, ref: 'FormConfig', required: true })
  formId: Types.ObjectId;

  @ApiProperty({ description: '提交数据（JSON格式）' })
  @Prop({ type: Object, required: true })
  data: Record<string, any>;

  @ApiProperty({ description: '提交者设备指纹', required: false })
  @Prop()
  deviceFingerprint?: string;

  @ApiProperty({ description: '提交者IP地址', required: false })
  @Prop()
  ipAddress?: string;

  @ApiProperty({ description: '提交者User Agent', required: false })
  @Prop()
  userAgent?: string;

  @ApiProperty({ description: '微信OpenID（如果通过微信授权）', required: false })
  @Prop()
  wechatOpenId?: string;

  @ApiProperty({ description: '微信UnionID（如果通过微信授权）', required: false })
  @Prop()
  wechatUnionId?: string;

  @ApiProperty({ description: '提交来源', enum: ['h5', 'miniprogram', 'web'], default: 'h5' })
  @Prop({ default: 'h5', enum: ['h5', 'miniprogram', 'web'] })
  source: string;

  @ApiProperty({ description: '跟进状态', enum: ['pending', 'contacted', 'completed'], default: 'pending' })
  @Prop({ default: 'pending', enum: ['pending', 'contacted', 'completed'] })
  followUpStatus: string;

  @ApiProperty({ description: '跟进备注', required: false })
  @Prop()
  followUpNote?: string;

  @ApiProperty({ description: '跟进人ID', required: false })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  followUpBy?: Types.ObjectId;

  @ApiProperty({ description: '跟进时间', required: false })
  @Prop()
  followUpAt?: Date;

  @ApiProperty({ description: '用户归属（生成分享链接/二维码的用户ID）', required: false })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  referredBy?: Types.ObjectId;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export const FormSubmissionSchema = SchemaFactory.createForClass(FormSubmission);

// 创建索引
FormSubmissionSchema.index({ formId: 1, createdAt: -1 });
FormSubmissionSchema.index({ deviceFingerprint: 1, formId: 1 });
FormSubmissionSchema.index({ wechatOpenId: 1, formId: 1 });
FormSubmissionSchema.index({ ipAddress: 1, formId: 1 });
FormSubmissionSchema.index({ followUpStatus: 1 });

