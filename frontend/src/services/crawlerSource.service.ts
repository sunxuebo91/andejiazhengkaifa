import apiService from './api';

export interface ArticleSelectors {
  articleList: string;
  articleLink: string;
  title: string;
  content: string;
  author?: string;
}

export interface CrawlerSource {
  _id: string;
  name: string;
  url: string;
  type: 'html' | 'rss';
  selectors?: ArticleSelectors;
  isEnabled: boolean;
  maxPerCrawl: number;
  sourceLabel?: string;
  lastCrawledAt?: string;
  lastCrawlCount: number;
  totalCrawlCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIStatus {
  aiEnabled: boolean;
  provider: string;
  model: string;
  fallbackMode: boolean;
}

export interface CrawlerIntent {
  action: string;
  topic: string;
  keywords: string[];
  count: number;
  frequency: string;
  filters?: {
    maxSimilarity?: number;
  };
}

export interface AICommandResult {
  intent: CrawlerIntent;
  articlesFound: number;
  articlesSaved: number;
  duplicatesSkipped: number;
  sources: string[];
}

export interface CreateCrawlerSourceDto {
  name: string;
  url: string;
  type: 'html' | 'rss';
  selectors?: ArticleSelectors;
  maxPerCrawl?: number;
  sourceLabel?: string;
}

const crawlerSourceService = {
  async getList() {
    return apiService.get('/api/crawler-sources');
  },

  async create(data: CreateCrawlerSourceDto) {
    return apiService.post('/api/crawler-sources', data);
  },

  async update(id: string, data: Partial<CreateCrawlerSourceDto> & { isEnabled?: boolean }) {
    return apiService.patch(`/api/crawler-sources/${id}`, data);
  },

  async remove(id: string) {
    return apiService.delete(`/api/crawler-sources/${id}`);
  },

  async runNow() {
    return apiService.post('/api/crawler-sources/run-now', {});
  },

  async testSource(id: string) {
    return apiService.post(`/api/crawler-sources/${id}/test`, {});
  },

  // AI 智能指令
  async getAIStatus() {
    return apiService.get<AIStatus>('/api/crawler-sources/ai/status');
  },

  async executeAICommand(command: string) {
    return apiService.post<AICommandResult>('/api/crawler-sources/ai/command', { command });
  },
};

export default crawlerSourceService;
