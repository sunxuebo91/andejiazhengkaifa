import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MiniMaxAIService, CrawlerIntent } from './minimax-ai.service';
import { ArticleCrawlerService } from './article-crawler.service';
import { CrawlerSourceService } from './crawler-source.service';
import { CrawlerSource, CrawlerSourceDocument } from './models/crawler-source.model';
import { Article, ArticleDocument } from '../article/models/article.model';

// 执行结果
export interface ExecutionResult {
  success: boolean;
  intent: CrawlerIntent;
  articlesFound: number;
  articlesSaved: number;
  duplicatesSkipped: number;
  sources: string[];
  message: string;
}

@Injectable()
export class AICrawlerExecutorService {
  private readonly logger = new Logger(AICrawlerExecutorService.name);

  constructor(
    private readonly aiService: MiniMaxAIService,
    private readonly crawlerService: ArticleCrawlerService,
    private readonly sourceService: CrawlerSourceService,
    @InjectModel(Article.name) private articleModel: Model<ArticleDocument>,
    @InjectModel(CrawlerSource.name) private crawlerSourceModel: Model<CrawlerSourceDocument>,
  ) {}

  /**
   * 执行自然语言指令
   */
  async executeCommand(command: string): Promise<ExecutionResult> {
    this.logger.log(`📝 收到指令: ${command}`);

    // 1. AI 解析指令
    const intent = await this.aiService.parseCommand(command);
    this.logger.log(`🧠 解析意图: ${JSON.stringify(intent)}`);

    // 2. 根据意图找到匹配的来源
    const sources = await this.findMatchingSources(intent);
    this.logger.log(`🔍 找到 ${sources.length} 个匹配来源`);

    if (sources.length === 0) {
      return {
        success: false,
        intent,
        articlesFound: 0,
        articlesSaved: 0,
        duplicatesSkipped: 0,
        sources: [],
        message: `未找到与"${intent.topic}"相关的爬虫来源，请先配置来源`,
      };
    }

    // 3. 执行爬取
    let totalFound = 0;
    let totalSaved = 0;
    let totalDuplicates = 0;
    const usedSources: string[] = [];

    for (const source of sources) {
      if (totalSaved >= intent.count) break;

      try {
        const beforeCount = await this.articleModel.countDocuments({});
        const newCount = await this.crawlerService.crawlSource(source);
        const afterCount = await this.articleModel.countDocuments({});
        
        totalFound += newCount;
        totalSaved += (afterCount - beforeCount);
        totalDuplicates += (newCount - (afterCount - beforeCount));
        usedSources.push(source.name);

        this.logger.log(`✅ ${source.name}: 抓取 ${newCount} 篇，保存 ${afterCount - beforeCount} 篇`);
      } catch (error) {
        this.logger.error(`❌ ${source.name} 爬取失败:`, error);
      }
    }

    // 4. 语义去重（如果配置了）
    if (intent.filters?.maxSimilarity) {
      // TODO: 实现语义去重
      this.logger.log(`📊 语义去重阈值: ${intent.filters.maxSimilarity * 100}%`);
    }

    return {
      success: totalSaved > 0,
      intent,
      articlesFound: totalFound,
      articlesSaved: totalSaved,
      duplicatesSkipped: totalDuplicates,
      sources: usedSources,
      message: this.generateResultMessage(intent, totalSaved, usedSources),
    };
  }

  /**
   * 根据意图查找匹配的爬虫来源
   */
  private async findMatchingSources(intent: CrawlerIntent): Promise<CrawlerSourceDocument[]> {
    // 获取所有启用的来源
    const allSources = await this.sourceService.findEnabled();

    // 按关键词匹配打分
    const scored = allSources.map((source) => {
      let score = 0;
      const nameAndUrl = `${source.name} ${source.url}`.toLowerCase();

      for (const keyword of intent.keywords) {
        if (nameAndUrl.includes(keyword.toLowerCase())) {
          score += 10;
        }
      }

      // 智能爬取来源优先
      if (source.smartCrawl?.enabled) {
        score += 5;
      }

      return { source, score };
    });

    // 按分数排序，取前 5 个
    return scored
      .filter((s) => s.score > 0 || scored.length <= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.source as CrawlerSourceDocument);
  }

  private generateResultMessage(
    intent: CrawlerIntent,
    savedCount: number,
    sources: string[],
  ): string {
    if (savedCount === 0) {
      return `未能抓取到新的${intent.topic}相关文章，可能已全部存在`;
    }

    const sourceText = sources.length > 0 ? `来源：${sources.join('、')}` : '';
    const frequencyText = intent.frequency === 'daily' ? '（已设置每日自动执行）' : '';

    return `成功抓取 ${savedCount} 篇${intent.topic}相关文章！${sourceText}${frequencyText}`;
  }
}

