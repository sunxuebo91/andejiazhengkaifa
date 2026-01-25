import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Article, ArticleDocument } from './models/article.model';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { deriveTitleFromRaw, formatArticleToHtml } from './utils/format-article.util';

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(
    @InjectModel(Article.name) private articleModel: Model<ArticleDocument>,
  ) {}

  /**
   * 从内容中提取图片URL（支持Markdown和HTML格式）
   */
  private extractImageUrls(contentRaw: string): string[] {
    const imageUrls: string[] = [];

    // 提取Markdown格式的图片: ![](url)
    const markdownImageRe = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = markdownImageRe.exec(contentRaw)) !== null) {
      const url = (match[1] || '').trim();
      if (url && url.startsWith('http')) {
        imageUrls.push(url);
      }
    }

    // 提取HTML格式的图片: <img src="url">
    const htmlImageRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    while ((match = htmlImageRe.exec(contentRaw)) !== null) {
      const url = (match[1] || '').trim();
      if (url && url.startsWith('http')) {
        imageUrls.push(url);
      }
    }

    // 去重
    return Array.from(new Set(imageUrls));
  }

  async create(dto: CreateArticleDto, userId: string): Promise<Article> {
    const title = (dto.title || '').trim() || deriveTitleFromRaw(dto.contentRaw);

    // 从内容中提取图片URL
    const extractedImageUrls = this.extractImageUrls(dto.contentRaw);

    // 合并前端传来的imageUrls和从内容中提取的imageUrls
    const allImageUrls = Array.from(new Set([
      ...(dto.imageUrls || []),
      ...extractedImageUrls,
    ]));

    const contentHtml = formatArticleToHtml({
      contentRaw: dto.contentRaw,
      imageUrls: allImageUrls,
    });

    const article = new this.articleModel({
      ...dto,
      title,
      contentHtml,
      imageUrls: allImageUrls,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    this.logger.log(`创建文章: ${title}, 图片数量: ${allImageUrls.length}`);
    return article.save();
  }

  async findAll(query: QueryArticleDto) {
    const { status, keyword, page = 1, pageSize = 10 } = query;

    const filter: any = {};
    if (status) filter.status = status;

    if (keyword) {
      filter.$text = { $search: keyword };
    }

    const skip = (page - 1) * pageSize;

    const findQuery = this.articleModel
      .find(filter)
      .sort(keyword ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select('-contentHtml -contentRaw')
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username');

    if (keyword) {
      findQuery.select({ score: { $meta: 'textScore' } });
    }

    const [list, total] = await Promise.all([
      findQuery.exec(),
      this.articleModel.countDocuments(filter),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string): Promise<Article> {
    const article = await this.articleModel
      .findById(id)
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .exec();

    if (!article) throw new NotFoundException(`文章 ${id} 不存在`);
    return article;
  }

  async update(id: string, dto: UpdateArticleDto, userId: string): Promise<Article> {
    const existing = await this.articleModel.findById(id).exec();
    if (!existing) throw new NotFoundException(`文章 ${id} 不存在`);

    const nextRaw = dto.contentRaw ?? existing.contentRaw;

    // 从内容中提取图片URL
    const extractedImageUrls = this.extractImageUrls(nextRaw);

    // 合并前端传来的imageUrls和从内容中提取的imageUrls
    const allImageUrls = Array.from(new Set([
      ...(dto.imageUrls ?? existing.imageUrls ?? []),
      ...extractedImageUrls,
    ]));

    const contentHtml = formatArticleToHtml({
      contentRaw: nextRaw,
      imageUrls: allImageUrls,
    });

    const title = (dto.title || '').trim() || existing.title || deriveTitleFromRaw(nextRaw);

    this.logger.log(`更新文章: ${id}, 图片数量: ${allImageUrls.length}`);

    const article = await this.articleModel
      .findByIdAndUpdate(
        id,
        {
          ...dto,
          title,
          contentHtml,
          imageUrls: allImageUrls,
          updatedBy: new Types.ObjectId(userId),
        },
        { new: true },
      )
      .exec();

    if (!article) throw new NotFoundException(`文章 ${id} 不存在`);
    return article;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`删除文章: ${id}`);
    const result = await this.articleModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`文章 ${id} 不存在`);
  }

  async updateStatus(id: string, status: string, userId: string): Promise<Article> {
    const article = await this.articleModel
      .findByIdAndUpdate(
        id,
        {
          status,
          updatedBy: new Types.ObjectId(userId),
        },
        { new: true },
      )
      .exec();

    if (!article) throw new NotFoundException(`文章 ${id} 不存在`);
    return article;
  }
}
