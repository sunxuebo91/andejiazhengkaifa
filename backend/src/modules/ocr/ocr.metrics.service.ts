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
    };
  }

  recordRequest() {
    this.metrics.totalRequests++;
  }

  recordSuccess() {
    this.metrics.successfulRequests++;
  }

  recordFailure() {
    this.metrics.failedRequests++;
  }

  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  recordProcessingTime(timeMs: number) {
    this.metrics.totalProcessingTime += timeMs;
    this.metrics.requestsCount++;
    this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.requestsCount;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.calculateSuccessRate(),
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  private calculateSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
  }

  private calculateCacheHitRate(): number {
    const totalCacheAttempts = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (totalCacheAttempts === 0) return 0;
    return (this.metrics.cacheHits / totalCacheAttempts) * 100;
  }

  getDailyReport(): string {
    const metrics = this.getMetrics();
    const report = `OCR 服务日报：
总请求数：${metrics.totalRequests}
成功请求：${metrics.successfulRequests}
失败请求：${metrics.failedRequests}
成功率：${metrics.successRate.toFixed(2)}%
缓存命中率：${metrics.cacheHitRate.toFixed(2)}%
平均处理时间：${metrics.averageProcessingTime.toFixed(2)}ms`;

    // 重置统计数据
    this.resetMetrics();

    return report;
  }
}