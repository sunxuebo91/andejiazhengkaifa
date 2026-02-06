import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ShortUrlDocument = ShortUrl & Document;

@Schema({ timestamps: true, collection: 'short_urls' })
export class ShortUrl {
  @ApiProperty({ description: '短链接ID（6位随机字符串）' })
  @Prop({ required: true, unique: true, index: true })
  shortId: string;

  @ApiProperty({ description: '完整的目标URL' })
  @Prop({ required: true })
  targetUrl: string;

  @ApiProperty({ description: '访问次数' })
  @Prop({ default: 0 })
  visitCount: number;

  @ApiProperty({ description: '过期时间' })
  @Prop()
  expireAt?: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export const ShortUrlSchema = SchemaFactory.createForClass(ShortUrl);

// 创建索引
ShortUrlSchema.index({ shortId: 1 });
ShortUrlSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 }); // TTL索引，自动删除过期记录

