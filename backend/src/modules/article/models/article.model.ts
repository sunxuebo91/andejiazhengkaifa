import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ArticleDocument = Article & Document;

/**
 * 文章内容模型（褓贝后台内容管理）
 */
@Schema({ timestamps: true, collection: 'articles' })
export class Article extends Document {
  @ApiProperty({ description: '标题', required: false })
  @Prop()
  title?: string;

  @ApiProperty({ description: '作者', required: false })
  @Prop()
  author?: string;

  @ApiProperty({ description: '来源/出处', required: false })
  @Prop()
  source?: string;

  @ApiProperty({ description: '原始正文（纯文本/简易Markdown）' })
  @Prop({ required: true })
  contentRaw: string;

  @ApiProperty({ description: '智能排版后的HTML正文' })
  @Prop({ required: true })
  contentHtml: string;

  @ApiProperty({ description: '图片URL列表（腾讯云COS）', type: [String], required: false })
  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @ApiProperty({ description: '状态', enum: ['draft', 'published'], default: 'draft' })
  @Prop({ default: 'draft', enum: ['draft', 'published'] })
  status: string;

  @ApiProperty({ description: '创建人ID' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @ApiProperty({ description: '更新人ID' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);

// 索引：列表查询与检索
ArticleSchema.index({ status: 1, createdAt: -1 });
ArticleSchema.index({ title: 'text', contentRaw: 'text', author: 'text', source: 'text' });
