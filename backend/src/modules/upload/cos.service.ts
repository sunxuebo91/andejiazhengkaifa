import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import COS from 'cos-nodejs-sdk-v5';
import { Readable } from 'stream';
import { cosConfig } from '../../config/cos.config';

@Injectable()
export class CosService {
  private readonly cos: any; // 使用 any 类型避免构造签名问题
  private readonly logger = new Logger(CosService.name);

  constructor(private configService: ConfigService) {
    // 初始化 COS 实例
    this.cos = new (require('cos-nodejs-sdk-v5'))({
      SecretId: cosConfig.SecretId,
      SecretKey: cosConfig.SecretKey,
    });
  }

  /**
   * 生成文件在COS中的唯一标识符
   */
  generateFileKey(originalName: string, type: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = originalName.includes('.') 
      ? originalName.split('.').pop() 
      : '';
    
    return `${type}/${timestamp}-${randomStr}${extension ? `.${extension}` : ''}`;
  }

  /**
   * 上传文件到COS
   */
  async uploadFile(file: Express.Multer.File, key: string): Promise<string> {
    try {
      const result = await this.cos.putObject({
        Bucket: cosConfig.Bucket,
        Region: cosConfig.Region,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      if (result.statusCode === 200) {
        return `https://${cosConfig.Domain}/${key}`;
      }
      throw new Error('上传文件失败');
    } catch (error) {
      this.logger.error(`上传文件到COS失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 从COS获取文件流
   */
  async getFile(key: string): Promise<Readable> {
    try {
      const result = await this.cos.getObject({
        Bucket: cosConfig.Bucket,
        Region: cosConfig.Region,
        Key: key,
      });

      if (result.statusCode === 200) {
        // 将 Buffer 转换为 Readable 流
        const stream = new Readable();
        stream.push(result.Body);
        stream.push(null);
        return stream;
      }
      throw new Error('获取文件失败');
    } catch (error) {
      this.logger.error(`从COS获取文件失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除COS中的文件
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const result = await this.cos.deleteObject({
        Bucket: cosConfig.Bucket,
        Region: cosConfig.Region,
        Key: key,
      });

      if (result.statusCode !== 204 && result.statusCode !== 200) {
        throw new Error('删除文件失败');
      }
    } catch (error) {
      this.logger.error(`删除COS文件失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取文件的签名URL
   */
  async getSignedUrl(key: string, expires?: number): Promise<string> {
    try {
      const result = await new Promise<{ Url: string }>((resolve, reject) => {
        this.cos.getObjectUrl({
          Bucket: cosConfig.Bucket,
          Region: cosConfig.Region,
          Key: key,
          Expires: expires || cosConfig.DownloadExpireTime,
          Sign: true,
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      return result.Url;
    } catch (error) {
      this.logger.error(`获取文件签名URL失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async doesFileExist(key: string): Promise<boolean> {
    try {
      const result = await this.cos.headObject({
        Bucket: cosConfig.Bucket,
        Region: cosConfig.Region,
        Key: key,
      });

      return result.statusCode === 200;
    } catch (error) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string) {
    try {
      const result = await this.cos.headObject({
        Bucket: cosConfig.Bucket,
        Region: cosConfig.Region,
        Key: key,
      });

      return result;
    } catch (error) {
      this.logger.error(`获取文件信息失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取文件列表
   */
  async listFiles(prefix?: string, maxKeys?: number) {
    try {
      const result = await this.cos.getBucket({
        Bucket: cosConfig.Bucket,
        Region: cosConfig.Region,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      return result.Contents;
    } catch (error) {
      this.logger.error(`获取文件列表失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取上传凭证
   */
  async getUploadCredentials(key: string, expires?: number) {
    try {
      return await new Promise<{ Url: string }>((resolve, reject) => {
        this.cos.getObjectUrl({
          Bucket: cosConfig.Bucket,
          Region: cosConfig.Region,
          Key: key,
          Expires: expires || cosConfig.UploadExpireTime,
          Sign: true,
          Method: 'PUT',
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    } catch (error) {
      this.logger.error(`获取上传凭证失败: ${error.message}`);
      throw error;
    }
  }
}