import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type BannerDocument = Banner & Document;

/**
 * Banner轮播图模型
 */
@Schema({ timestamps: true, collection: 'banners' })
export class Banner extends Document {
  @ApiProperty({ description: 'Banner标题' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ description: '图片URL（腾讯云COS）' })
  @Prop({ required: true })
  imageUrl: string;

  @ApiProperty({ description: '跳转链接', required: false })
  @Prop()
  linkUrl?: string;

  @ApiProperty({ 
    description: '链接类型', 
    enum: ['none', 'miniprogram', 'h5', 'external'],
    default: 'none'
  })
  @Prop({ default: 'none' })
  linkType: string;

  @ApiProperty({ description: '排序顺序（数字越小越靠前）', default: 0 })
  @Prop({ default: 0 })
  order: number;

  @ApiProperty({ 
    description: '状态', 
    enum: ['active', 'inactive'],
    default: 'active'
  })
  @Prop({ default: 'active' })
  status: string;

  @ApiProperty({ description: '生效开始时间', required: false })
  @Prop()
  startTime?: Date;

  @ApiProperty({ description: '生效结束时间', required: false })
  @Prop()
  endTime?: Date;

  @ApiProperty({ description: '浏览次数', default: 0 })
  @Prop({ default: 0 })
  viewCount: number;

  @ApiProperty({ description: '点击次数', default: 0 })
  @Prop({ default: 0 })
  clickCount: number;

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

export const BannerSchema = SchemaFactory.createForClass(Banner);

// 创建索引
BannerSchema.index({ status: 1, order: 1 });
BannerSchema.index({ createdAt: -1 });

