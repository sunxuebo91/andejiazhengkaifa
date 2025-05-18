import COS from 'cos-nodejs-sdk-v5';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { cosConfig } from '../../config/cos.config';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';

// 腾讯云OCR SDK客户端
const OcrClient = tencentcloud.ocr.v20181119.Client;

@Injectable()
export class UploadService {
  private cos: COS;
  private ocrClient: any; // 腾讯云OCR客户端
  private readonly logger = new Logger(UploadService.name);

  constructor() {
    this.cos = new COS({
      SecretId: cosConfig.SecretId,
      SecretKey: cosConfig.SecretKey,
    });

    // 初始化OCR客户端
    try {
      const clientConfig = {
        credential: {
          secretId: cosConfig.SecretId,
          secretKey: cosConfig.SecretKey,
        },
        region: cosConfig.Region,
        profile: {
          httpProfile: {
            endpoint: 'ocr.tencentcloudapi.com',
          },
        },
      };
      
      this.ocrClient = new OcrClient(clientConfig);
      this.logger.log('腾讯云OCR客户端初始化成功');
    } catch (error) {
      this.logger.error('腾讯云OCR客户端初始化失败:', error);
    }
  }

  async testConnection(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.cos.getBucket(
        {
          Bucket: cosConfig.Bucket,
          Region: cosConfig.Region,
        },
        (err, data) => {
          if (err) {
            reject(new Error(`无法连接到COS: ${err.message}`));
            return;
          }
          resolve(true);
        }
      );
    });
  }

  private async uploadToCOS(file: Express.Multer.File, folder: string): Promise<string> {
    const key = `${folder}/${Date.now()}-${file.originalname}`;

    return new Promise((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: cosConfig.Bucket,
          Region: cosConfig.Region,
          Key: key,
          Body: file.buffer,
          ContentLength: file.size,
          ContentType: file.mimetype,
        },
        (err, data) => {
          if (err) {
            reject(new BadRequestException('上传文件失败'));
            return;
          }
          resolve(`https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${key}`);
        },
      );
    });
  }

  /**
   * 识别身份证图片
   * @param imageUrl 身份证图片URL
   * @param type 身份证类型（front/back）
   * @returns 识别结果
   */
  private async recognizeIdCard(imageUrl: string, type: 'front' | 'back'): Promise<any> {
    try {
      if (!this.ocrClient) {
        throw new Error('OCR客户端未初始化');
      }

      const params = {
        ImageUrl: imageUrl,
        CardSide: type === 'front' ? 'FRONT' : 'BACK'
      };

      this.logger.log(`开始识别${type === 'front' ? '身份证正面' : '身份证背面'}: ${imageUrl}`);
      const result = await this.ocrClient.IDCardOCR(params);
      
      this.logger.log(`身份证识别成功, 结果:`, result);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error(`身份证识别失败:`, error);
      return {
        success: false,
        error: error.message || '身份证识别失败'
      };
    }
  }

  async uploadIdCard(file: Express.Multer.File, type: 'front' | 'back'): Promise<any> {
    if (!cosConfig.allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('不支持的文件类型');
    }
    if (file.size > cosConfig.maxFileSize) {
      throw new BadRequestException('文件大小超过限制');
    }

    try {
      // 1. 上传文件到COS
      const imageUrl = await this.uploadToCOS(file, `id-cards/${type}`);
      this.logger.log(`身份证${type === 'front' ? '正面' : '背面'}上传成功: ${imageUrl}`);
      
      // 2. 调用OCR识别
      try {
        const ocrResult = await this.recognizeIdCard(imageUrl, type);
        
        // 3. 返回OCR结果和图片URL
        return {
          success: true,
          imageUrl,
          ocrResult: ocrResult.data,
          message: ocrResult.success ? '身份证识别成功' : '身份证识别失败，仅返回图片URL'
        };
      } catch (ocrError) {
        this.logger.error('OCR识别失败，返回图片URL:', ocrError);
        
        // OCR失败时仍返回图片URL
        return {
          success: true,
          imageUrl,
          message: '身份证识别失败，仅返回图片URL',
          error: ocrError.message
        };
      }
    } catch (error) {
      this.logger.error('身份证上传失败:', error);
      throw new BadRequestException('身份证上传失败: ' + error.message);
    }
  }

  async uploadFile(file: Express.Multer.File, category: string): Promise<string> {
    this.logger.log('上传文件信息:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      category
    });

    if (!cosConfig.allowedFileTypes.includes(file.mimetype)) {
      this.logger.error('不支持的文件类型:', file.mimetype);
      throw new BadRequestException(`不支持的文件类型: ${file.mimetype}, 仅支持: ${cosConfig.allowedFileTypes.join(', ')}`);
    }

    if (file.size > cosConfig.maxFileSize) {
      this.logger.error('文件大小超过限制:', file.size);
      throw new BadRequestException(`文件大小超过限制: ${file.size}字节, 最大允许: ${cosConfig.maxFileSize}字节`);
    }

    try {
      const result = await this.uploadToCOS(file, category);
      this.logger.log('文件上传成功:', result);
      return result;
    } catch (error) {
      this.logger.error('文件上传失败:', error);
      throw new BadRequestException('文件上传失败: ' + error.message);
    }
  }

  async getFileUrl(key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cos.getObjectUrl(
        {
          Bucket: cosConfig.Bucket,
          Region: cosConfig.Region,
          Key: key,
          Expires: 3600, // URL有效期1小时
        },
        (err, data) => {
          if (err) {
            reject(new BadRequestException('获取文件URL失败'));
            return;
          }
          resolve(data.Url);
        },
      );
    });
  }
}