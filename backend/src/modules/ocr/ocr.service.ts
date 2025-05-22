import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as retry from 'retry';
import { ImageCacheService } from '../../utils/image-cache.service';
import { OcrMetricsService } from './ocr.metrics.service';

@Injectable()
export class OcrService {
  private client: any;
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private configService: ConfigService,
    private imageCacheService: ImageCacheService,
    private metricsService: OcrMetricsService
  ) {
    // 正确初始化百度 OCR 客户端
    const BaiduAip = require('baidu-aip-sdk');
    const AipOcrClient = BaiduAip.ocr;
    
    const APP_ID = this.configService.get('BAIDU_OCR_APP_ID') || '118332507';
    const API_KEY = this.configService.get('BAIDU_OCR_API_KEY') || 'y4AniiwpEIsK5qNHnHbm4YDV';
    const SECRET_KEY = this.configService.get('BAIDU_OCR_SECRET_KEY') || 'ORMoWvctBsi0X8CjmIdMJAgv8UmbE6r2';
    
    this.client = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY);
    this.logger.log('百度 OCR 客户端初始化完成');
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    const retryOperation = retry.operation({
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 5000,
    });

    return new Promise((resolve, reject) => {
      retryOperation.attempt(async (currentAttempt) => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          this.logger.warn(`尝试 ${currentAttempt} 失败: ${error.message}`);
          if (retryOperation.retry(error)) {
            return;
          }
          reject(error);
        }
      });
    });
  }

  async idCardFront(image: Buffer): Promise<any> {
    const startTime = Date.now();
    this.metricsService.recordRequest();

    try {
      this.logger.log('开始识别身份证正面');

      // 先尝试从缓存获取结果
      const cachedResult = await this.imageCacheService.getCachedResult(image, 'idcard-front');
      if (cachedResult) {
        this.logger.log('使用缓存的识别结果');
        this.metricsService.recordCacheHit();
        this.metricsService.recordSuccess();
        this.metricsService.recordProcessingTime(Date.now() - startTime);
        return cachedResult;
      }

      this.metricsService.recordCacheMiss();
      const result = await this.retryOperation(async () => {
        try {
          if (!this.client?.idcardFront) {
            throw new Error('OCR客户端未正确初始化');
          }

          const result = await this.client.idcardFront(image, { detect_risk: 'true' });
          
          if (result.error_code) {
            throw new Error(`百度OCR API错误: ${result.error_msg}`);
          }

          // 验证必要字段
          const requiredFields = ['姓名', '民族', '住址', '公民身份号码'];
          const missingFields = requiredFields.filter(field => !result.words_result?.[field]);
          
          if (missingFields.length > 0) {
            throw new Error(`身份证识别结果缺少必要字段: ${missingFields.join(', ')}`);
          }

          // 验证身份证号格式
          const idNumber = result.words_result.公民身份号码.words;
          if (!/^\d{17}[\dXx]$/.test(idNumber)) {
            throw new Error('身份证号格式不正确');
          }

          // 缓存识别结果
          await this.imageCacheService.setCachedResult(image, 'idcard-front', result);
          
          this.logger.log('身份证正面识别成功');
          return result;
        } catch (error) {
          this.logger.error('身份证正面识别失败:', error);
          throw error;
        }
      });

      this.metricsService.recordSuccess();
      this.metricsService.recordProcessingTime(Date.now() - startTime);
      return result;

    } catch (error) {
      this.metricsService.recordFailure();
      this.metricsService.recordProcessingTime(Date.now() - startTime);
      throw error;
    }
  }

  async idCardBack(image: Buffer): Promise<any> {
    const startTime = Date.now();
    this.metricsService.recordRequest();

    try {
      this.logger.log('开始识别身份证背面');

      // 先尝试从缓存获取结果
      const cachedResult = await this.imageCacheService.getCachedResult(image, 'idcard-back');
      if (cachedResult) {
        this.logger.log('使用缓存的识别结果');
        this.metricsService.recordCacheHit();
        this.metricsService.recordSuccess();
        this.metricsService.recordProcessingTime(Date.now() - startTime);
        return cachedResult;
      }

      this.metricsService.recordCacheMiss();
      const result = await this.retryOperation(async () => {
        try {
          if (!this.client?.idcardBack) {
            throw new Error('OCR客户端未正确初始化');
          }

          const result = await this.client.idcardBack(image, { detect_risk: 'true' });
          
          if (result.error_code) {
            throw new Error(`百度OCR API错误: ${result.error_msg}`);
          }

          // 验证必要字段
          const requiredFields = ['签发机关', '签发日期', '失效日期'];
          const missingFields = requiredFields.filter(field => !result.words_result?.[field]);
          
          if (missingFields.length > 0) {
            throw new Error(`身份证背面识别结果缺少必要字段: ${missingFields.join(', ')}`);
          }

          // 缓存识别结果
          await this.imageCacheService.setCachedResult(image, 'idcard-back', result);

          this.logger.log('身份证背面识别成功');
          return result;
        } catch (error) {
          this.logger.error('身份证背面识别失败:', error);
          throw error;
        }
      });

      this.metricsService.recordSuccess();
      this.metricsService.recordProcessingTime(Date.now() - startTime);
      return result;

    } catch (error) {
      this.metricsService.recordFailure();
      this.metricsService.recordProcessingTime(Date.now() - startTime);
      throw error;
    }
  }

  // 清理过期缓存的方法
  async clearExpiredCache(): Promise<void> {
    await this.imageCacheService.clearExpiredCache();
  }

  // 获取OCR服务性能报告
  async getPerformanceReport(): Promise<string> {
    return this.metricsService.getDailyReport();
  }
}
