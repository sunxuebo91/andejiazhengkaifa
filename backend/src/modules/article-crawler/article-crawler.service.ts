import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import axios from 'axios';
import * as cheerio from 'cheerio';
import RssParser from 'rss-parser';

import { CrawlerSource, CrawlerSourceDocument, SmartCrawlConfig } from './models/crawler-source.model';
import { Article, ArticleDocument } from '../article/models/article.model';
import { CrawlerSourceService } from './crawler-source.service';
import { formatArticleToHtml, deriveTitleFromRaw } from '../article/utils/format-article.util';

// 智能爬虫状态追踪
interface CrawlState {
  visitedUrls: Set<string>;
  articleUrls: Set<string>;
  discoveredCategories: string[];
  totalArticlesSaved: number;
}

const RSS_PARSER = new RssParser({
  timeout: 10000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; AndeCrawler/1.0; +https://crm.andejiazheng.com)',
  },
});

const HTTP_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

interface ScrapedMeta {
  title: string;
  url: string;
  author?: string;
  contentRaw?: string;
  imageUrls?: string[];
}

@Injectable()
export class ArticleCrawlerService implements OnModuleInit {
  private readonly logger = new Logger(ArticleCrawlerService.name);

  constructor(
    private readonly crawlerSourceService: CrawlerSourceService,
    @InjectModel(Article.name) private articleModel: Model<ArticleDocument>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      this.logger.warn('⚠️ 非生产环境，跳过注册文章爬虫定时任务（可用 /run-now 手动触发）');
      return;
    }

    // 每 30 分钟执行一次：0 */30 * * * * (秒级 cron)
    const job = new CronJob(
      '0 */30 * * * *',
      () => {
        this.runCrawlCycle().catch((err) =>
          this.logger.error('爬虫定时任务执行失败:', err),
        );
      },
      null,
      true,
      'Asia/Shanghai',
    );

    this.schedulerRegistry.addCronJob('article-crawler-30min', job);
    this.logger.log('✅ 文章爬虫定时任务已注册（每30分钟执行）');
  }

  /**
   * 执行全量爬取，返回本次统计
   */
  async runCrawlCycle(): Promise<{ success: number; failed: number; newArticles: number }> {
    const sources = await this.crawlerSourceService.findEnabled();
    this.logger.log(`开始爬取，共 ${sources.length} 个来源`);

    let success = 0;
    let failed = 0;
    let newArticles = 0;

    const results = await Promise.allSettled(
      sources.map((s) => this.crawlSource(s)),
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        success++;
        newArticles += result.value;
      } else {
        failed++;
        this.logger.error(
          `来源 [${sources[i].name}] 抓取失败: ${result.reason?.message || result.reason}`,
        );
      }
    });

    this.logger.log(
      `爬取完成：成功 ${success} 个来源，失败 ${failed} 个，新增文章 ${newArticles} 篇`,
    );
    return { success, failed, newArticles };
  }

  /**
   * 爬取单个来源，返回新增文章数
   */
  async crawlSource(source: CrawlerSourceDocument): Promise<number> {
    // 判断是否使用智能爬取模式
    if (source.smartCrawl?.enabled && source.type === 'html') {
      return this.smartCrawlSource(source);
    }

    // 普通模式
    const metas =
      source.type === 'rss'
        ? await this.parseRss(source)
        : await this.parseHtml(source);

    const limit = source.maxPerCrawl ?? 10;
    const toProcess = metas.slice(0, limit);

    let newCount = 0;
    for (const meta of toProcess) {
      try {
        const saved = await this.saveArticle(meta, source);
        if (saved) newCount++;
      } catch (err) {
        this.logger.warn(`文章保存失败 [${meta.title}]: ${err.message}`);
      }
    }

    await this.crawlerSourceService.updateCrawlStats(
      (source._id as Types.ObjectId).toString(),
      newCount,
    );
    this.logger.log(`[${source.name}] 本次抓取 ${toProcess.length} 篇，新增 ${newCount} 篇`);
    return newCount;
  }

  // ─── 智能爬取模式 ─────────────────────────────────────────────────────────────

  /**
   * 智能爬取：自动发现栏目、翻页、抓取文章
   */
  private async smartCrawlSource(source: CrawlerSourceDocument): Promise<number> {
    const config = source.smartCrawl!;
    const state: CrawlState = {
      visitedUrls: new Set<string>(),
      articleUrls: new Set<string>(),
      discoveredCategories: [],
      totalArticlesSaved: 0,
    };

    const maxTotal = config.maxArticlesTotal ?? 50;
    this.logger.log(`[${source.name}] 🧠 智能爬取模式启动，最大抓取 ${maxTotal} 篇`);

    try {
      // 第一步：访问入口页，发现栏目和文章
      await this.crawlPage(source.url, source, config, state, 1);

      // 第二步：遍历发现的栏目
      if (config.maxDepth >= 2 && state.discoveredCategories.length > 0) {
        this.logger.log(`[${source.name}] 发现 ${state.discoveredCategories.length} 个栏目`);

        for (const categoryUrl of state.discoveredCategories) {
          if (state.totalArticlesSaved >= maxTotal) break;

          // 爬取栏目首页
          await this.crawlPage(categoryUrl, source, config, state, 2);

          // 自动翻页
          if (config.maxPagesPerCategory > 1) {
            await this.crawlPagination(categoryUrl, source, config, state);
          }

          // 请求间隔，避免过快
          await this.sleep(500);
        }
      }
    } catch (err) {
      this.logger.error(`[${source.name}] 智能爬取出错: ${err.message}`);
    }

    await this.crawlerSourceService.updateCrawlStats(
      (source._id as Types.ObjectId).toString(),
      state.totalArticlesSaved,
    );

    this.logger.log(
      `[${source.name}] 🧠 智能爬取完成：访问 ${state.visitedUrls.size} 个页面，` +
      `发现 ${state.articleUrls.size} 篇文章，新增 ${state.totalArticlesSaved} 篇`,
    );

    return state.totalArticlesSaved;
  }

  /**
   * 爬取单个页面：发现栏目链接 + 提取文章
   */
  private async crawlPage(
    pageUrl: string,
    source: CrawlerSourceDocument,
    config: SmartCrawlConfig,
    state: CrawlState,
    depth: number,
  ): Promise<void> {
    if (state.visitedUrls.has(pageUrl)) return;
    state.visitedUrls.add(pageUrl);

    const maxTotal = config.maxArticlesTotal ?? 50;
    if (state.totalArticlesSaved >= maxTotal) return;

    this.logger.debug(`[${source.name}] 访问页面: ${pageUrl} (深度=${depth})`);

    try {
      const resp = await axios.get(pageUrl, {
        headers: HTTP_HEADERS,
        timeout: 15000,
      });

      const $ = cheerio.load(resp.data as string);
      const baseUrl = new URL(pageUrl);

      // 发现栏目链接（只在入口页执行）
      if (depth === 1 && config.categoryPattern) {
        this.discoverCategories($, baseUrl, config, state);
      }

      // 提取文章链接并保存
      const articleMetas = this.extractArticleLinks($, source, baseUrl, config);

      for (const meta of articleMetas) {
        if (state.totalArticlesSaved >= maxTotal) break;
        if (state.articleUrls.has(meta.url)) continue;

        state.articleUrls.add(meta.url);

        try {
          const saved = await this.saveArticle(meta, source);
          if (saved) {
            state.totalArticlesSaved++;
            this.logger.debug(`[${source.name}] ✅ 保存文章: ${meta.title}`);
          }
        } catch (err) {
          this.logger.warn(`[${source.name}] 文章保存失败 [${meta.title}]: ${err.message}`);
        }

        // 请求间隔
        await this.sleep(300);
      }
    } catch (err) {
      this.logger.warn(`[${source.name}] 页面访问失败 [${pageUrl}]: ${err.message}`);
    }
  }

  /**
   * 发现栏目/分类链接
   */
  private discoverCategories(
    $: cheerio.CheerioAPI,
    baseUrl: URL,
    config: SmartCrawlConfig,
    state: CrawlState,
  ): void {
    if (!config.categoryPattern) return;

    const categoryRegex = new RegExp(config.categoryPattern);
    const excludePatterns = (config.excludePatterns ?? []).map(p => new RegExp(p));

    $('a[href]').each((_i, el) => {
      let href = $(el).attr('href') ?? '';
      if (!href) return;

      // 补全相对路径
      href = this.resolveUrl(href, baseUrl);
      if (!href) return;

      // 检查是否匹配栏目模式
      if (!categoryRegex.test(href)) return;

      // 检查排除模式
      for (const exclude of excludePatterns) {
        if (exclude.test(href)) return;
      }

      // 去重
      if (!state.discoveredCategories.includes(href)) {
        state.discoveredCategories.push(href);
      }
    });
  }

  /**
   * 自动翻页爬取
   */
  private async crawlPagination(
    categoryUrl: string,
    source: CrawlerSourceDocument,
    config: SmartCrawlConfig,
    state: CrawlState,
  ): Promise<void> {
    const maxPages = config.maxPagesPerCategory ?? 3;
    const maxTotal = config.maxArticlesTotal ?? 50;

    for (let page = 2; page <= maxPages; page++) {
      if (state.totalArticlesSaved >= maxTotal) break;

      // 构造分页URL
      const pageUrl = this.buildPageUrl(categoryUrl, page, config);
      if (!pageUrl || state.visitedUrls.has(pageUrl)) continue;

      this.logger.debug(`[${source.name}] 翻页: ${pageUrl}`);
      await this.crawlPage(pageUrl, source, config, state, 2);

      // 请求间隔
      await this.sleep(500);
    }
  }

  /**
   * 构造分页URL
   */
  private buildPageUrl(baseUrl: string, page: number, config: SmartCrawlConfig): string | null {
    try {
      const url = new URL(baseUrl);

      // 方式1：使用分页参数
      if (config.paginationParam) {
        url.searchParams.set(config.paginationParam, String(page));
        return url.href;
      }

      // 方式2：尝试识别URL中的分页模式
      // 常见模式：/page/2/, ?page=2, ?p=2, _2.html
      const patterns = [
        { regex: /\/page\/\d+/, replace: `/page/${page}` },
        { regex: /_\d+\.html$/, replace: `_${page}.html` },
        { regex: /-\d+\.html$/, replace: `-${page}.html` },
      ];

      for (const pattern of patterns) {
        if (pattern.regex.test(baseUrl)) {
          return baseUrl.replace(pattern.regex, pattern.replace);
        }
      }

      // 默认添加 page 参数
      url.searchParams.set('page', String(page));
      return url.href;
    } catch {
      return null;
    }
  }

  /**
   * 从页面提取文章链接
   */
  private extractArticleLinks(
    $: cheerio.CheerioAPI,
    source: CrawlerSourceDocument,
    baseUrl: URL,
    config: SmartCrawlConfig,
  ): ScrapedMeta[] {
    const sel = source.selectors;
    const metas: ScrapedMeta[] = [];
    const excludePatterns = (config.excludePatterns ?? []).map(p => new RegExp(p));

    if (!sel?.articleList) {
      // 如果没有选择器，尝试智能识别文章链接
      return this.smartExtractArticleLinks($, baseUrl, excludePatterns);
    }

    $(sel.articleList).each((_i, el) => {
      const $el = $(el);
      let linkEl: ReturnType<typeof $> | null = null;

      if (sel.articleLink) {
        const foundLink = $el.find(sel.articleLink).first();
        linkEl = foundLink.length ? foundLink : null;
      }
      if (!linkEl) {
        linkEl = $el.is('a') ? $el : $el.find('a').first();
      }
      if (!linkEl || !linkEl.length) return;

      let href = linkEl.attr('href') ?? '';
      if (!href) return;

      href = this.resolveUrl(href, baseUrl);
      if (!href) return;

      // 检查排除模式
      for (const exclude of excludePatterns) {
        if (exclude.test(href)) return;
      }

      const title = linkEl.text().trim() || (sel.title ? $el.find(sel.title).text().trim() : '');
      if (!title) return;

      metas.push({ title, url: href });
    });

    return metas;
  }

  /**
   * 智能识别文章链接（无选择器时使用）
   */
  private smartExtractArticleLinks(
    $: cheerio.CheerioAPI,
    baseUrl: URL,
    excludePatterns: RegExp[],
  ): ScrapedMeta[] {
    const metas: ScrapedMeta[] = [];
    const seen = new Set<string>();

    // 常见文章URL模式
    const articlePatterns = [
      /\/\d{4,}\.html?$/,     // /12345.html
      /\/article\/\d+/,       // /article/123
      /\/post\/\d+/,          // /post/123
      /\/a\/\d+/,             // /a/123
      /\/p\/\d+/,             // /p/123
      /\/news\/\d+/,          // /news/123
      /\/[a-z]+\/\d+\/?$/,    // /z/12345/
    ];

    $('a[href]').each((_i, el) => {
      const $el = $(el);
      let href = $el.attr('href') ?? '';
      if (!href) return;

      href = this.resolveUrl(href, baseUrl);
      if (!href || seen.has(href)) return;

      // 检查是否匹配文章模式
      const isArticle = articlePatterns.some(p => p.test(href));
      if (!isArticle) return;

      // 检查排除模式
      for (const exclude of excludePatterns) {
        if (exclude.test(href)) return;
      }

      const title = $el.text().trim();
      if (!title || title.length < 4 || title.length > 100) return;

      seen.add(href);
      metas.push({ title, url: href });
    });

    return metas;
  }

  /**
   * 解析URL，补全相对路径
   */
  private resolveUrl(href: string, baseUrl: URL): string {
    if (!href) return '';
    if (href.startsWith('javascript:') || href.startsWith('#')) return '';

    try {
      if (href.startsWith('//')) {
        return `${baseUrl.protocol}${href}`;
      }
      if (href.startsWith('/')) {
        return `${baseUrl.protocol}//${baseUrl.host}${href}`;
      }
      if (!href.startsWith('http')) {
        const base = baseUrl.href.substring(0, baseUrl.href.lastIndexOf('/') + 1);
        return `${base}${href}`;
      }
      return href;
    } catch {
      return '';
    }
  }

  // ─── RSS 解析 ─────────────────────────────────────────────────────────────

  private async parseRss(source: CrawlerSourceDocument): Promise<ScrapedMeta[]> {
    const feed = await RSS_PARSER.parseURL(source.url);
    return (feed.items ?? []).map((item) => ({
      title: (item.title ?? '').trim(),
      url: item.link ?? '',
      author: item.creator ?? item['dc:creator'] ?? '',
      // RSS 有时直接带正文
      contentRaw: this.htmlToText(item['content:encoded'] || item.content || item.summary || ''),
    })).filter((m) => m.title && m.url);
  }

  // ─── HTML 爬取 ────────────────────────────────────────────────────────────

  private async parseHtml(source: CrawlerSourceDocument): Promise<ScrapedMeta[]> {
    const sel = source.selectors;
    if (!sel) {
      this.logger.warn(`[${source.name}] HTML 来源未配置 selectors，跳过`);
      return [];
    }

    const resp = await axios.get(source.url, {
      headers: HTTP_HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(resp.data as string);
    const metas: ScrapedMeta[] = [];

    $(sel.articleList).each((_i, el) => {
      const $el = $(el);
      // 如果 articleList 元素本身就是链接，直接使用；否则在内部查找
      let linkEl: ReturnType<typeof $> | null = null;
      if (sel.articleLink) {
        const foundLink = $el.find(sel.articleLink).first();
        linkEl = foundLink.length ? foundLink : null;
      }
      if (!linkEl) {
        // 检查元素本身是否是链接
        linkEl = $el.is('a') ? $el : $el.find('a').first();
      }
      if (!linkEl || !linkEl.length) return;
      let href = linkEl.attr('href') ?? '';
      if (!href) return;

      // 补全相对路径
      if (href.startsWith('/')) {
        const base = new URL(source.url);
        href = `${base.protocol}//${base.host}${href}`;
      } else if (!href.startsWith('http')) {
        return;
      }

      const title = linkEl.text().trim() || $el.find(sel.title).text().trim();
      if (!title) return;

      metas.push({ title, url: href });
    });

    return metas;
  }

  // ─── 详情页内容抓取 ───────────────────────────────────────────────────────

  private async fetchDetail(
    url: string,
    source: CrawlerSourceDocument,
  ): Promise<{ contentRaw: string; author?: string; imageUrls?: string[] }> {
    const sel = source.selectors;
    const resp = await axios.get(url, {
      headers: HTTP_HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(resp.data as string);
    const baseUrl = new URL(url);

    let contentRaw = '';
    let $contentEl: ReturnType<typeof $> | null = null;

    if (sel?.content) {
      $contentEl = $(sel.content);
      contentRaw = this.htmlToText($contentEl.html() ?? '');
    }
    if (!contentRaw) {
      // 降级：取 <article> 或 <main> 标签
      $contentEl = $('article').length ? $('article') : ($('main').length ? $('main') : $('body'));
      contentRaw = this.htmlToText($contentEl.html() ?? '');
    }

    let author = '';
    if (sel?.author) {
      author = $(sel.author).first().text().trim();
    }

    // 提取图片
    const imageUrls = this.extractImages($, $contentEl, baseUrl);

    return { contentRaw, author, imageUrls };
  }

  // ─── 图片提取 ─────────────────────────────────────────────────────────────

  private extractImages(
    $: cheerio.CheerioAPI,
    $container: ReturnType<cheerio.CheerioAPI> | null,
    baseUrl: URL,
  ): string[] {
    const images: string[] = [];
    const seen = new Set<string>();

    // 过滤无关图片的规则
    const isIrrelevantImage = (src: string, imgEl: any): boolean => {
      const $img = $(imgEl);
      const srcLower = src.toLowerCase();
      const alt = ($img.attr('alt') || '').toLowerCase();
      const className = ($img.attr('class') || '').toLowerCase();
      const id = ($img.attr('id') || '').toLowerCase();
      const width = parseInt($img.attr('width') || '0');
      const height = parseInt($img.attr('height') || '0');

      // 1. 过滤二维码
      if (
        srcLower.includes('qrcode') ||
        srcLower.includes('qr_code') ||
        srcLower.includes('qr-code') ||
        srcLower.includes('weixin') ||
        srcLower.includes('wechat') ||
        alt.includes('二维码') ||
        alt.includes('qrcode') ||
        alt.includes('微信') ||
        className.includes('qrcode') ||
        className.includes('qr-code') ||
        className.includes('weixin')
      ) {
        return true;
      }

      // 2. 过滤广告图片
      if (
        srcLower.includes('ad') ||
        srcLower.includes('banner') ||
        srcLower.includes('advert') ||
        className.includes('ad') ||
        className.includes('banner') ||
        className.includes('advert') ||
        id.includes('ad') ||
        id.includes('banner')
      ) {
        return true;
      }

      // 3. 过滤logo、图标、认证标识
      if (
        srcLower.includes('logo') ||
        srcLower.includes('icon') ||
        srcLower.includes('favicon') ||
        srcLower.includes('cert') ||
        srcLower.includes('certificate') ||
        srcLower.includes('gongshang') ||
        srcLower.includes('beian') ||
        className.includes('logo') ||
        className.includes('icon') ||
        id.includes('logo') ||
        id.includes('icon')
      ) {
        return true;
      }

      // 4. 过滤默认占位图
      if (
        srcLower.includes('default') ||
        srcLower.includes('placeholder') ||
        srcLower.includes('no-image') ||
        srcLower.includes('noimage')
      ) {
        return true;
      }

      // 5. 过滤尺寸太小的图片（可能是图标、按钮等）
      if ((width > 0 && width < 200) || (height > 0 && height < 200)) {
        return true;
      }

      // 6. 过滤常见的静态资源路径（非内容图片）
      if (
        srcLower.includes('/static/') ||
        srcLower.includes('/assets/') ||
        srcLower.includes('/common/') ||
        srcLower.includes('/ui/') ||
        srcLower.includes('/widget/') ||
        srcLower.includes('/std/images/') // 妈妈网的标准图片目录
      ) {
        // 但如果明确在内容区域内，则保留
        const isInContent = $img.closest('article, .article, .content, .post, main, .wiki-content').length > 0;
        if (!isInContent) {
          return true;
        }
      }

      return false;
    };

    const addImage = (src: string, imgEl: any) => {
      if (!src) return;

      // 补全相对路径
      let fullUrl = src;
      if (src.startsWith('//')) {
        fullUrl = `${baseUrl.protocol}${src}`;
      } else if (src.startsWith('/')) {
        fullUrl = `${baseUrl.protocol}//${baseUrl.host}${src}`;
      } else if (!src.startsWith('http')) {
        // 相对路径
        const base = baseUrl.href.substring(0, baseUrl.href.lastIndexOf('/') + 1);
        fullUrl = `${base}${src}`;
      }

      // 过滤掉Base64图片
      if (fullUrl.includes('data:') || fullUrl.includes('base64')) return;

      // 过滤无关图片
      if (isIrrelevantImage(fullUrl, imgEl)) {
        this.logger.debug(`过滤无关图片: ${fullUrl}`);
        return;
      }

      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);
      images.push(fullUrl);
    };

    // 优先提取封面图
    const coverSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      '.article-cover img',
      '.post-cover img',
      '.featured-image img',
      '.cover-image img',
    ];

    for (const selector of coverSelectors) {
      const el = $(selector).first();
      if (el.length) {
        const src = el.attr('content') || el.attr('src');
        if (src && el[0]) {
          addImage(src, el[0]);
          break; // 只取第一个封面图
        }
      }
    }

    // 在内容容器中查找正文图片
    if ($container) {
      $container.find('img').each((_i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
        if (src) addImage(src, el);
      });
    }

    // 限制图片数量（封面图 + 最多9张正文图）
    return images.slice(0, 10);
  }

  // ─── 保存文章 ─────────────────────────────────────────────────────────────

  private async saveArticle(
    meta: ScrapedMeta,
    source: CrawlerSourceDocument,
  ): Promise<boolean> {
    if (!meta.title) return false;

    // 按标题去重（翻译后的标题也要检查）
    const exists = await this.articleModel.exists({ title: meta.title });
    if (exists) return false;

    let contentRaw = meta.contentRaw ?? '';
    let author = meta.author ?? '';
    let imageUrls = meta.imageUrls ?? [];

    // 如果 RSS/列表页没有正文，且有 HTML selectors，则抓详情页
    if (!contentRaw && meta.url && source.selectors) {
      try {
        const detail = await this.fetchDetail(meta.url, source);
        contentRaw = detail.contentRaw;
        author = author || detail.author || '';
        imageUrls = detail.imageUrls ?? [];
      } catch {
        // 详情页抓取失败时用空正文也保存
      }
    }

    if (!contentRaw) contentRaw = meta.title;

    // 检测是否需要翻译（英文内容）
    let title = meta.title || deriveTitleFromRaw(contentRaw);
    const needsTranslation = this.detectEnglish(title) || this.detectEnglish(contentRaw.substring(0, 200));

    if (needsTranslation) {
      try {
        // 翻译标题
        const translatedTitle = await this.translateToZh(title);
        // 再次检查翻译后的标题是否重复
        const existsTranslated = await this.articleModel.exists({ title: translatedTitle });
        if (existsTranslated) return false;
        title = translatedTitle;

        // 翻译正文（分段翻译以避免超长文本问题）
        contentRaw = await this.translateLongText(contentRaw);
      } catch (err) {
        this.logger.warn(`翻译失败，使用原文: ${err.message}`);
      }
    }

    const systemUserId = this.configService.get<string>('CRAWLER_SYSTEM_USER_ID');
    const userId = new Types.ObjectId(systemUserId);

    const contentHtml = formatArticleToHtml({ contentRaw, imageUrls });

    await new this.articleModel({
      title,
      author,
      source: source.sourceLabel || source.name,
      contentRaw,
      contentHtml,
      imageUrls,
      status: 'draft',
      createdBy: userId,
      updatedBy: userId,
    }).save();

    return true;
  }

  // ─── 翻译功能 ─────────────────────────────────────────────────────────────

  /**
   * 检测文本是否为英文
   */
  private detectEnglish(text: string): boolean {
    if (!text) return false;
    // 移除常见符号和数字
    const cleaned = text.replace(/[0-9\s\.\,\!\?\-\:\;\'\"\(\)\[\]\{\}\/\\@#\$%\^&\*\+\=\<\>\|~`]/g, '');
    if (!cleaned) return false;
    // 计算英文字符占比
    const englishChars = cleaned.match(/[a-zA-Z]/g)?.length ?? 0;
    const ratio = englishChars / cleaned.length;
    return ratio > 0.7;
  }

  /**
   * 使用免费Google翻译API翻译文本
   */
  private async translateToZh(text: string): Promise<string> {
    if (!text || text.length < 2) return text;

    try {
      // 使用 Google Translate 免费 API
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
      const resp = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      // 响应格式: [[["翻译结果","原文",null,null,10]],null,"en",...]
      const data = resp.data;
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item: any[]) => item[0]).join('');
        return translated || text;
      }
      return text;
    } catch (err) {
      this.logger.warn(`翻译请求失败: ${err.message}`);
      return text;
    }
  }

  /**
   * 分段翻译长文本
   */
  private async translateLongText(text: string): Promise<string> {
    if (!text) return text;

    // 按段落分割
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    const translated: string[] = [];

    for (const para of paragraphs) {
      if (para.length > 2000) {
        // 超长段落按句子分割
        const sentences = para.split(/(?<=[.!?。！？])\s*/);
        const chunks: string[] = [];
        let currentChunk = '';

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > 1500) {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
        if (currentChunk) chunks.push(currentChunk);

        for (const chunk of chunks) {
          const result = await this.translateToZh(chunk);
          translated.push(result);
          // 添加延迟避免请求过快
          await this.sleep(200);
        }
      } else {
        const result = await this.translateToZh(para);
        translated.push(result);
        await this.sleep(200);
      }
    }

    return translated.join('\n\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── 工具函数 ─────────────────────────────────────────────────────────────

  /**
   * 将 HTML 转为可读纯文本（保留换行结构）
   */
  private htmlToText(html: string): string {
    if (!html) return '';
    const $ = cheerio.load(html);

    // 移除脚本、样式、广告等
    $('script, style, nav, header, footer, .ad, .advertisement, [class*="share"], [class*="social"]').remove();

    // 段落和标题加换行
    $('p, div, h1, h2, h3, h4, h5, h6, br, li').each((_i, el) => {
      $(el).append('\n');
    });

    let text = $.root().text();
    // 清理多余空行（保留最多2个连续换行）
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
  }
}
