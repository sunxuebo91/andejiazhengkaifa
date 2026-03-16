import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// AI 解析后的爬虫意图
export interface CrawlerIntent {
  action: 'crawl' | 'search' | 'analyze' | 'unknown';
  topic: string;           // 主题关键词
  keywords: string[];      // 扩展关键词
  count: number;           // 目标数量
  frequency?: 'once' | 'daily' | 'hourly'; // 执行频率
  sources?: string[];      // 推荐/指定的来源
  filters?: {
    minQuality?: number;     // 最低质量分
    maxSimilarity?: number;  // 去重相似度阈值
    language?: string;       // 语言
  };
}

// MiniMax API 响应
interface MiniMaxResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    total_tokens: number;
  };
}

@Injectable()
export class MiniMaxAIService {
  private readonly logger = new Logger(MiniMaxAIService.name);
  private readonly apiKey: string;
  private readonly groupId: string;
  private readonly baseUrl = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MINIMAX_API_KEY', '');
    this.groupId = this.configService.get<string>('MINIMAX_GROUP_ID', '');
  }

  /**
   * 检查 API 是否配置
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey !== 'your_minimax_api_key_here');
  }

  /**
   * 解析自然语言指令为爬虫意图
   */
  async parseCommand(command: string): Promise<CrawlerIntent> {
    if (!this.isConfigured()) {
      this.logger.warn('MiniMax API 未配置，使用规则解析');
      return this.fallbackParse(command);
    }

    try {
      const systemPrompt = `你是一个智能爬虫助手。用户会给你一个自然语言指令，你需要解析出爬虫任务的参数。

请严格按照以下 JSON 格式输出，不要添加任何其他文字：
{
  "action": "crawl",
  "topic": "主题",
  "keywords": ["关键词1", "关键词2"],
  "count": 数量,
  "frequency": "once/daily/hourly",
  "filters": {
    "maxSimilarity": 0.7
  }
}

注意：
- action 固定为 "crawl"
- count 默认 30，如果用户说"每天30篇"则为 30
- frequency：如果用户说"每天"则为 "daily"，否则为 "once"
- keywords 要扩展相关词汇，比如"育儿"可以扩展为["育儿", "早教", "婴儿护理", "宝宝"]
- maxSimilarity 默认 0.7，表示相似度超过 70% 视为重复`;

      const response = await axios.post<MiniMaxResponse>(
        this.baseUrl,
        {
          model: 'MiniMax-Text-01',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: command },
          ],
          max_tokens: 500,
          temperature: 0.1,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const content = response.data.choices[0]?.message?.content || '';
      this.logger.log(`MiniMax 响应: ${content}`);

      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const intent = JSON.parse(jsonMatch[0]) as CrawlerIntent;
        return this.validateIntent(intent);
      }

      return this.fallbackParse(command);
    } catch (error) {
      this.logger.error('MiniMax API 调用失败:', error);
      return this.fallbackParse(command);
    }
  }

  /**
   * 规则解析（备用方案）
   */
  private fallbackParse(command: string): CrawlerIntent {
    const countMatch = command.match(/(\d+)\s*篇/);
    const count = countMatch ? parseInt(countMatch[1], 10) : 30;

    const isDaily = /每天|每日|daily/i.test(command);

    // 关键词提取
    const keywords: string[] = [];
    if (/育儿|宝宝|婴儿|幼儿/i.test(command)) keywords.push('育儿', '早教', '婴儿护理');
    if (/月嫂|产后|坐月子/i.test(command)) keywords.push('月嫂', '产后护理', '月子餐');
    if (/家政|保姆|阿姨/i.test(command)) keywords.push('家政', '保洁', '家务');
    if (/养老|老人|护理/i.test(command)) keywords.push('养老护理', '老人照护');

    if (keywords.length === 0) {
      keywords.push('育儿', '家政', '月嫂');
    }

    return {
      action: 'crawl',
      topic: keywords[0] || '家政知识',
      keywords,
      count,
      frequency: isDaily ? 'daily' : 'once',
      filters: { maxSimilarity: 0.7 },
    };
  }

  private validateIntent(intent: Partial<CrawlerIntent>): CrawlerIntent {
    return {
      action: intent.action || 'crawl',
      topic: intent.topic || '家政知识',
      keywords: intent.keywords || [],
      count: intent.count || 30,
      frequency: intent.frequency || 'once',
      filters: intent.filters || { maxSimilarity: 0.7 },
    };
  }
}

