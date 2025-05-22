import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ImageCacheService } from '../../utils/image-cache.service';
import { OcrService } from '../ocr/ocr.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly imageCacheService: ImageCacheService,
    private readonly ocrService: OcrService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyTasks() {
    try {
      // 清理过期缓存
      this.logger.log('开始执行每日维护任务...');
      await this.imageCacheService.clearExpiredCache();
      this.logger.log('缓存清理完成');

      // 生成并记录性能报告
      const report = await this.ocrService.getPerformanceReport();
      this.logger.log('性能报告已生成：\n' + report);
    } catch (error) {
      this.logger.error('每日维护任务执行失败:', error);
    }
  }

  // 每小时执行一次健康检查
  @Cron(CronExpression.EVERY_HOUR)
  async healthCheck() {
    try {
      this.logger.log('执行系统健康检查...');
      // 检查OCR服务状态
      const metrics = await this.ocrService.getPerformanceReport();
      
      // 记录系统状态
      this.logger.log('系统状态正常，当前指标：\n' + metrics);
    } catch (error) {
      this.logger.error('健康检查失败:', error);
    }
  }
}