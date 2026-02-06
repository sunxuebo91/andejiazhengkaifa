import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShortUrl, ShortUrlDocument } from './models/short-url.model';
import { nanoid } from 'nanoid';

@Injectable()
export class ShortUrlService {
  private readonly logger = new Logger(ShortUrlService.name);

  constructor(
    @InjectModel(ShortUrl.name)
    private shortUrlModel: Model<ShortUrlDocument>,
  ) {}

  /**
   * 生成短链接
   */
  async createShortUrl(targetUrl: string, expireAt?: Date): Promise<string> {
    this.logger.log(`创建短链接: targetUrl=${targetUrl}`);

    // 检查是否已存在相同的目标URL（未过期的）
    const existing = await this.shortUrlModel.findOne({
      targetUrl,
      $or: [
        { expireAt: { $exists: false } },
        { expireAt: { $gt: new Date() } },
      ],
    });

    if (existing) {
      this.logger.log(`使用已存在的短链接: ${existing.shortId}`);
      return existing.shortId;
    }

    // 生成6位短ID
    let shortId: string;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      shortId = nanoid(6); // 生成6位随机字符串
      
      // 检查是否已存在
      const exists = await this.shortUrlModel.findOne({ shortId });
      if (!exists) {
        break;
      }
      
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('无法生成唯一的短链接ID');
    }

    // 创建短链接记录
    const shortUrl = new this.shortUrlModel({
      shortId,
      targetUrl,
      expireAt,
    });

    await shortUrl.save();
    this.logger.log(`短链接创建成功: ${shortId}`);

    return shortId;
  }

  /**
   * 根据短ID获取目标URL
   */
  async getTargetUrl(shortId: string): Promise<string> {
    const shortUrl = await this.shortUrlModel.findOne({ shortId });

    if (!shortUrl) {
      throw new NotFoundException('短链接不存在');
    }

    // 检查是否过期
    if (shortUrl.expireAt && shortUrl.expireAt < new Date()) {
      throw new NotFoundException('短链接已过期');
    }

    // 增加访问次数
    await this.shortUrlModel.updateOne(
      { shortId },
      { $inc: { visitCount: 1 } },
    );

    return shortUrl.targetUrl;
  }

  /**
   * 删除短链接
   */
  async deleteShortUrl(shortId: string): Promise<void> {
    await this.shortUrlModel.deleteOne({ shortId });
    this.logger.log(`短链接已删除: ${shortId}`);
  }
}

