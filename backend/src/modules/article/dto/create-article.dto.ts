import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  ArrayMaxSize,
} from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({ description: '标题', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '作者', required: false })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ description: '来源/出处', required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ description: '正文（纯文本/简易Markdown）' })
  @IsString()
  contentRaw: string;

  @ApiProperty({ description: '图片URL列表（腾讯云COS）', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiProperty({ description: '状态', enum: ['draft', 'published'], required: false, default: 'draft' })
  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: string;
}
