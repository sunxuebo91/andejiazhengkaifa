import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ImageCacheService } from '../../utils/image-cache.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly imageCacheService: ImageCacheService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronTasks() {
    this.logger.log('执行每日定时任务...');
    await this.cleanupImageCache();
  }

  private async cleanupImageCache() {
    try {
      await this.imageCacheService.clearExpiredCache();
      this.logger.log('清理图片缓存完成');
    } catch (error) {
      this.logger.error('清理图片缓存失败:', error);
    }
  }
}