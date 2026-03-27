import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ImageCacheService } from '../../utils/image-cache.service';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly imageCacheService: ImageCacheService,
    private readonly contractsService: ContractsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronTasks() {
    this.logger.log('执行每日定时任务...');
    await this.cleanupImageCache();
  }

  /**
   * 每10分钟自动同步"签约中"合同的爱签状态
   * 确保签约完成后自动更新为"已签约"并同步客户状态（不依赖 webhook）
   */
  @Cron('0 */10 * * * *')
  async autoSyncSigningContracts() {
    try {
      const result = await this.contractsService.autoSyncSigningContracts();
      if (result.synced > 0 || result.errors > 0) {
        this.logger.log(`🔄 自动同步完成: 同步 ${result.synced} 份合同，失败 ${result.errors} 份`);
      }
    } catch (error) {
      this.logger.error('自动同步签约合同任务失败:', error);
    }
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