import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type CrawlerSourceDocument = CrawlerSource & Document;

export class ArticleSelectors {
  @ApiProperty({ description: '文章列表容器 selector，如 ".article-list li"' })
  articleList: string;

  @ApiProperty({ description: '列表项中的链接 selector，如 "a"' })
  articleLink: string;

  @ApiProperty({ description: '详情页标题 selector，如 "h1.title"' })
  title: string;

  @ApiProperty({ description: '详情页正文容器 selector，如 ".article-body"' })
  content: string;

  @ApiProperty({ description: '详情页作者 selector（可选）', required: false })
  author?: string;
}

/**
 * 智能爬虫配置
 */
export class SmartCrawlConfig {
  @ApiProperty({ description: '是否启用智能爬取模式', default: false })
  enabled: boolean;

  @ApiProperty({ description: '最大爬取深度（1=只爬入口页, 2=爬入口+栏目页）', default: 2 })
  maxDepth: number;

  @ApiProperty({ description: '每个栏目最大翻页数', default: 3 })
  maxPagesPerCategory: number;

  @ApiProperty({ description: '每次爬取最大文章总数', default: 50 })
  maxArticlesTotal: number;

  @ApiProperty({ description: '栏目链接识别正则，如 "/z/t\\d+/"', required: false })
  categoryPattern?: string;

  @ApiProperty({ description: '分页链接识别正则，如 "page=\\d+"', required: false })
  paginationPattern?: string;

  @ApiProperty({ description: '分页参数名，用于自动构造翻页URL', default: 'page' })
  paginationParam?: string;

  @ApiProperty({ description: '排除的URL模式（不抓取）', required: false })
  excludePatterns?: string[];
}

/**
 * 爬虫来源配置
 */
@Schema({ timestamps: true, collection: 'crawler_sources' })
export class CrawlerSource extends Document {
  @ApiProperty({ description: '来源名称，如"今日头条-家政"' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: '入口 URL（列表页或 RSS Feed 地址）' })
  @Prop({ required: true })
  url: string;

  @ApiProperty({ description: '解析方式', enum: ['html', 'rss'] })
  @Prop({ required: true, enum: ['html', 'rss'], default: 'rss' })
  type: 'html' | 'rss';

  @ApiProperty({ description: 'HTML 模式下的 CSS Selector 配置', required: false })
  @Prop({ type: Object })
  selectors?: ArticleSelectors;

  @ApiProperty({ description: '智能爬虫配置', required: false })
  @Prop({ type: Object })
  smartCrawl?: SmartCrawlConfig;

  @ApiProperty({ description: '是否启用', default: true })
  @Prop({ default: true })
  isEnabled: boolean;

  @ApiProperty({ description: '每次最多抓取条数', default: 10 })
  @Prop({ default: 10 })
  maxPerCrawl: number;

  @ApiProperty({ description: '写入文章 source 字段的来源标签（不填则使用 name）', required: false })
  @Prop()
  sourceLabel?: string;

  @ApiProperty({ description: '最近一次成功抓取时间', required: false })
  @Prop()
  lastCrawledAt?: Date;

  @ApiProperty({ description: '最近一次抓取到的新文章数量', required: false })
  @Prop({ default: 0 })
  lastCrawlCount: number;

  @ApiProperty({ description: '累计抓取文章总数', required: false })
  @Prop({ default: 0 })
  totalCrawlCount: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export const CrawlerSourceSchema = SchemaFactory.createForClass(CrawlerSource);
CrawlerSourceSchema.index({ isEnabled: 1 });
