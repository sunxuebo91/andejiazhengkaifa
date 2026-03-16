import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CrawlerSourceService } from './crawler-source.service';
import { ArticleCrawlerService } from './article-crawler.service';
import { AICrawlerExecutorService } from './ai-crawler-executor.service';
import { MiniMaxAIService } from './minimax-ai.service';
import { CreateCrawlerSourceDto } from './dto/create-source.dto';
import { UpdateCrawlerSourceDto } from './dto/update-source.dto';

@ApiTags('文章爬虫来源管理')
@Controller('crawler-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager', '系统管理员', '经理')
@ApiBearerAuth()
export class CrawlerSourceController {
  constructor(
    private readonly sourceService: CrawlerSourceService,
    private readonly crawlerService: ArticleCrawlerService,
    private readonly aiExecutor: AICrawlerExecutorService,
    private readonly aiService: MiniMaxAIService,
  ) {}

  @Post()
  @ApiOperation({ summary: '新增爬取来源' })
  async create(@Body() dto: CreateCrawlerSourceDto) {
    const data = await this.sourceService.create(dto);
    return { success: true, data, message: '创建成功' };
  }

  @Get()
  @ApiOperation({ summary: '查询所有爬取来源' })
  async findAll() {
    const data = await this.sourceService.findAll();
    return { success: true, data, message: '获取成功' };
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新来源配置（可用于启用/禁用）' })
  @ApiParam({ name: 'id', description: '来源 ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateCrawlerSourceDto) {
    const data = await this.sourceService.update(id, dto);
    return { success: true, data, message: '更新成功' };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除爬取来源' })
  @ApiParam({ name: 'id', description: '来源 ID' })
  async remove(@Param('id') id: string) {
    await this.sourceService.remove(id);
    return { success: true, message: '删除成功' };
  }

  @Post('run-now')
  @ApiOperation({ summary: '立即执行一次全量抓取（手动触发）' })
  async runNow() {
    const stats = await this.crawlerService.runCrawlCycle();
    return {
      success: true,
      data: stats,
      message: `抓取完成：成功 ${stats.success} 个来源，新增 ${stats.newArticles} 篇文章`,
    };
  }

  @Post(':id/test')
  @ApiOperation({ summary: '手动触发单个来源抓取（测试用）' })
  @ApiParam({ name: 'id', description: '来源 ID' })
  async testSource(@Param('id') id: string) {
    const source = await this.sourceService.findOne(id);
    const newCount = await this.crawlerService.crawlSource(source as any);
    return {
      success: true,
      data: { newArticles: newCount },
      message: `抓取完成，新增 ${newCount} 篇文章`,
    };
  }

  // ==================== AI 智能指令 ====================

  @Post('ai/command')
  @ApiOperation({ summary: '🧠 AI智能指令 - 用自然语言控制爬虫' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          example: '每天更新30篇育儿相关的家政知识',
          description: '自然语言指令',
        },
      },
      required: ['command'],
    },
  })
  async aiCommand(@Body('command') command: string) {
    if (!command || command.trim().length === 0) {
      return {
        success: false,
        message: '请输入指令，例如：每天更新30篇育儿相关的家政知识',
      };
    }

    const result = await this.aiExecutor.executeCommand(command);

    return {
      success: result.success,
      data: {
        intent: result.intent,
        articlesFound: result.articlesFound,
        articlesSaved: result.articlesSaved,
        duplicatesSkipped: result.duplicatesSkipped,
        sources: result.sources,
      },
      message: result.message,
    };
  }

  @Get('ai/status')
  @ApiOperation({ summary: '检查 AI 服务状态' })
  async aiStatus() {
    const configured = this.aiService.isConfigured();
    return {
      success: true,
      data: {
        aiEnabled: configured,
        provider: 'MiniMax',
        model: 'MiniMax-Text-01',
        fallbackMode: !configured,
      },
      message: configured
        ? 'AI 服务已启用（MiniMax）'
        : 'AI 服务未配置，使用规则解析模式',
    };
  }
}
