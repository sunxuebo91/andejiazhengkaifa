import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrawlerSource, CrawlerSourceDocument } from './models/crawler-source.model';
import { CreateCrawlerSourceDto } from './dto/create-source.dto';
import { UpdateCrawlerSourceDto } from './dto/update-source.dto';

@Injectable()
export class CrawlerSourceService {
  private readonly logger = new Logger(CrawlerSourceService.name);

  constructor(
    @InjectModel(CrawlerSource.name)
    private crawlerSourceModel: Model<CrawlerSourceDocument>,
  ) {}

  async create(dto: CreateCrawlerSourceDto): Promise<CrawlerSource> {
    const source = new this.crawlerSourceModel({
      ...dto,
      isEnabled: true,
      maxPerCrawl: dto.maxPerCrawl ?? 10,
    });
    return source.save();
  }

  async findAll(): Promise<CrawlerSource[]> {
    return this.crawlerSourceModel.find().sort({ createdAt: -1 }).exec();
  }

  async findEnabled(): Promise<CrawlerSource[]> {
    return this.crawlerSourceModel.find({ isEnabled: true }).exec();
  }

  async findOne(id: string): Promise<CrawlerSource> {
    const source = await this.crawlerSourceModel.findById(id).exec();
    if (!source) throw new NotFoundException(`爬取来源 ${id} 不存在`);
    return source;
  }

  async update(id: string, dto: UpdateCrawlerSourceDto): Promise<CrawlerSource> {
    const source = await this.crawlerSourceModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!source) throw new NotFoundException(`爬取来源 ${id} 不存在`);
    return source;
  }

  async remove(id: string): Promise<void> {
    const result = await this.crawlerSourceModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`爬取来源 ${id} 不存在`);
  }

  async updateCrawlStats(
    id: string,
    newCount: number,
  ): Promise<void> {
    await this.crawlerSourceModel.findByIdAndUpdate(id, {
      lastCrawledAt: new Date(),
      lastCrawlCount: newCount,
      $inc: { totalCrawlCount: newCount },
    });
  }
}
