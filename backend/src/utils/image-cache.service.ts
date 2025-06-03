import { Injectable, Logger } from '@nestjs/common';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

declare const process: any;
declare const Buffer: any;

type PromiseVoid = Promise<void>;
type PromiseAny = Promise<any>;

@Injectable()
export class ImageCacheService {
  private readonly logger = new Logger(ImageCacheService.name);
  private readonly cacheDir = path.join(process.cwd(), 'cache', 'images');

  constructor() {
    // 确保缓存目录存在
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private generateCacheKey(buffer: any, type: string): string {
    const hash = crypto.createHash('md5');
    hash.update(buffer);
    hash.update(type);
    return hash.digest('hex');
  }

  async getCachedResult(buffer: any, type: string): PromiseAny {
    try {
      const cacheKey = this.generateCacheKey(buffer, type);
      const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);

      if (fs.existsSync(cachePath)) {
        const stats = fs.statSync(cachePath);
        const cacheAge = Date.now() - stats.mtimeMs;
        
        // 缓存有效期为24小时
        if (cacheAge < 24 * 60 * 60 * 1000) {
          const cacheData = fs.readFileSync(cachePath, 'utf8');
          return JSON.parse(cacheData);
        }
        
        // 删除过期缓存
        fs.unlinkSync(cachePath);
      }
      
      return null;
    } catch (error) {
      this.logger.error('读取缓存失败:', error);
      return null;
    }
  }

  async setCachedResult(buffer: any, type: string, result: any): PromiseVoid {
    try {
      const cacheKey = this.generateCacheKey(buffer, type);
      const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
      
      fs.writeFileSync(cachePath, JSON.stringify(result));
      this.logger.log(`缓存结果已保存: ${cacheKey}`);
    } catch (error) {
      this.logger.error('保存缓存失败:', error);
    }
  }

  async clearExpiredCache(): PromiseVoid {
    try {
      const files = fs.readdirSync(this.cacheDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        // 删除超过24小时的缓存
        if (fileAge > 24 * 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          this.logger.log(`删除过期缓存: ${file}`);
        }
      }
    } catch (error) {
      this.logger.error('清理缓存失败:', error);
    }
  }
}