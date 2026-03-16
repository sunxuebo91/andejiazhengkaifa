import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ArticleSelectorsDto {
  @ApiProperty()
  @IsString()
  articleList: string;

  @ApiProperty()
  @IsString()
  articleLink: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  author?: string;
}

export class CreateCrawlerSourceDto {
  @ApiProperty({ description: '来源名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '入口 URL' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: '解析方式', enum: ['html', 'rss'] })
  @IsEnum(['html', 'rss'])
  type: 'html' | 'rss';

  @ApiProperty({ description: 'HTML 模式下的 CSS Selector 配置', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ArticleSelectorsDto)
  selectors?: ArticleSelectorsDto;

  @ApiProperty({ description: '每次最多抓取条数（1-50）', required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxPerCrawl?: number;

  @ApiProperty({ description: '写入文章 source 字段的来源标签', required: false })
  @IsOptional()
  @IsString()
  sourceLabel?: string;
}
