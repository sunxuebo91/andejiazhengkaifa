import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

import { CrawlerSource, CrawlerSourceSchema } from './models/crawler-source.model';
import { Article, ArticleSchema } from '../article/models/article.model';
import { CrawlerSourceService } from './crawler-source.service';
import { ArticleCrawlerService } from './article-crawler.service';
import { CrawlerSourceController } from './crawler-source.controller';
import { MiniMaxAIService } from './minimax-ai.service';
import { AICrawlerExecutorService } from './ai-crawler-executor.service';

@Module({
  imports: [
    ScheduleModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: CrawlerSource.name, schema: CrawlerSourceSchema },
      { name: Article.name, schema: ArticleSchema },
    ]),
  ],
  controllers: [CrawlerSourceController],
  providers: [
    CrawlerSourceService,
    ArticleCrawlerService,
    MiniMaxAIService,
    AICrawlerExecutorService,
  ],
  exports: [ArticleCrawlerService, MiniMaxAIService],
})
export class ArticleCrawlerModule {}
