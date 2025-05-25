import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OcrMetricsService {
  private readonly logger = new Logger(OcrMetricsService.name);
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    cacheHits: number;
    cacheMisses: number;
    averageProcessingTime: number;
    totalProcessingTime: number;
    requestsCount: number;
    lastResetTime: number;
  };

  constructor() {
    this.resetMetrics();
  }

  private resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      requestsCount: 0,
      lastResetTime: Date.now(),
    };
  }

  recordRequest() {
    try {
      this.metrics.totalRequests++;
    } catch (error) {
      this.logger.error('记录请求失败:', error);
    }
  }

  recordSuccess() {
    try {
      this.metrics.successfulRequests++;
    } catch (error) {
      this.logger.error('记录成功失败:', error);
    }
  }

  recordFailure() {
    try {
      this.metrics.failedRequests++;
    } catch (error) {
      this.logger.error('记录失败失败:', error);
    }
  }

  recordCacheHit() {
    try {
      this.metrics.cacheHits++;
    } catch (error) {
      this.logger.error('记录缓存命中失败:', error);
    }
  }

  recordCacheMiss() {
    try {
      this.metrics.cacheMisses++;
    } catch (error) {
      this.logger.error('记录缓存未命中失败:', error);
    }
  }

  recordProcessingTime(timeMs: number) {
    try {
      this.metrics.totalProcessingTime += timeMs;
      this.metrics.requestsCount++;
      this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.requestsCount;
    } catch (error) {
      this.logger.error('记录处理时间失败:', error);
    }
  }

  getMetrics() {
    try {
      return {
        ...this.metrics,
        successRate: this.calculateSuccessRate(),
        cacheHitRate: this.calculateCacheHitRate(),
        uptime: this.getUptime(),
      };
    } catch (error) {
      this.logger.error('获取指标失败:', error);
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        cacheHitRate: 0,
        averageProcessingTime: 0,
        uptime: 0,
        error: '获取指标失败',
      };
    }
  }

  private calculateSuccessRate(): number {
    try {
      if (this.metrics.totalRequests === 0) return 0;
      return (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
    } catch (error) {
      this.logger.error('计算成功率失败:', error);
      return 0;
    }
  }

  private calculateCacheHitRate(): number {
    try {
      const totalCacheAttempts = this.metrics.cacheHits + this.metrics.cacheMisses;
      if (totalCacheAttempts === 0) return 0;
      return (this.metrics.cacheHits / totalCacheAttempts) * 100;
    } catch (error) {
      this.logger.error('计算缓存命中率失败:', error);
      return 0;
    }
  }

  private getUptime(): number {
    try {
      return Date.now() - this.metrics.lastResetTime;
    } catch (error) {
      this.logger.error('获取运行时间失败:', error);
      return 0;
    }
  }

  getDailyReport(): string {
    try {
      const metrics = this.getMetrics();
      const uptimeHours = Math.floor(metrics.uptime / (1000 * 60 * 60));
      const uptimeMinutes = Math.floor((metrics.uptime % (1000 * 60 * 60)) / (1000 * 60));
      
      const report = `OCR 服务状态报告：
运行时间：${uptimeHours}小时${uptimeMinutes}分钟
总请求数：${metrics.totalRequests}
成功请求：${metrics.successfulRequests}
失败请求：${metrics.failedRequests}
成功率：${metrics.successRate.toFixed(2)}%
缓存命中率：${metrics.cacheHitRate.toFixed(2)}%
平均处理时间：${metrics.averageProcessingTime.toFixed(2)}ms`;

      // 只有在成功获取报告后才重置指标
      this.resetMetrics();
      return report;
    } catch (error) {
      this.logger.error('生成日报失败:', error);
      return 'OCR 服务状态报告生成失败';
    }
  }
}