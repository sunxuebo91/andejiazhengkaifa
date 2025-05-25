import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TencentCloudSDK from 'tencentcloud-sdk-nodejs-ocr';
import * as retry from 'retry';
import { OcrMetricsService } from './ocr.metrics.service';

const OcrClient = TencentCloudSDK.ocr.v20181119.Client;

@Injectable()
export class TencentOcrService {
  private client: any;
  private readonly logger = new Logger(TencentOcrService.name);

  constructor(
    private configService: ConfigService,
    private metricsService: OcrMetricsService
  ) {
    // 初始化腾讯云OCR客户端
    const SECRET_ID = this.configService.get('TENCENT_OCR_SECRET_ID');
    const SECRET_KEY = this.configService.get('TENCENT_OCR_SECRET_KEY');
    
    if (!SECRET_ID || !SECRET_KEY) {
      throw new Error('腾讯云OCR凭证未配置');
    }

    const clientConfig = {
      credential: {
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
      },
      region: 'ap-guangzhou',
      profile: {
        httpProfile: {
          endpoint: 'ocr.tencentcloudapi.com',
        },
      },
    };

    this.client = new OcrClient(clientConfig);
    this.logger.log('腾讯云OCR客户端初始化完成');
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
      const result = await this.retryOperation(async () => {
        try {
          const params = {
            ImageBase64: image.toString('base64'),
            CardSide: 'FRONT',
          };

          const response = await this.client.IDCardOCR(params);
          
          if (response.Error) {
            throw new Error(`腾讯云OCR API错误: ${response.Error.Message}`);
          }

          // 验证必要字段
          const requiredFields = ['Name', 'Nation', 'Address', 'IdNum', 'Sex', 'Birth'];
          const missingFields = requiredFields.filter(field => !response[field]);
          
          if (missingFields.length > 0) {
            throw new Error(`身份证识别结果缺少必要字段: ${missingFields.join(', ')}`);
          }

          // 验证身份证号格式
          const idNumber = response.IdNum;
          if (!/^\d{17}[\dXx]$/.test(idNumber)) {
            throw new Error('身份证号格式不正确');
          }

          // 转换为与百度OCR相同的格式
          const formattedResult = {
            words_result: {
              姓名: { words: response.Name },
              性别: { words: response.Sex },
              民族: { words: response.Nation },
              出生: { words: response.Birth },
              住址: { words: response.Address },
              公民身份号码: { words: response.IdNum },
            },
            risk_info: response.WarningInfos || [],
          };

          this.logger.log('身份证正面识别成功');
          return formattedResult;
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
      const result = await this.retryOperation(async () => {
        try {
          const params = {
            ImageBase64: image.toString('base64'),
            CardSide: 'BACK',
          };

          const response = await this.client.IDCardOCR(params);
          
          if (response.Error) {
            throw new Error(`腾讯云OCR API错误: ${response.Error.Message}`);
          }

          // 验证必要字段
          const requiredFields = ['Authority', 'ValidDate'];
          const missingFields = requiredFields.filter(field => !response[field]);
          
          if (missingFields.length > 0) {
            throw new Error(`身份证背面识别结果缺少必要字段: ${missingFields.join(', ')}`);
          }

          // 转换为与百度OCR相同的格式
          const formattedResult = {
            words_result: {
              签发机关: { words: response.Authority },
              签发日期: { words: response.ValidDate.split('-')[0] },
              失效日期: { words: response.ValidDate.split('-')[1] },
            },
            risk_info: response.WarningInfos || [],
          };

          this.logger.log('身份证背面识别成功');
          return formattedResult;
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

  // 获取OCR服务性能报告
  async getPerformanceReport(): Promise<string> {
    return this.metricsService.getDailyReport();
  }
}