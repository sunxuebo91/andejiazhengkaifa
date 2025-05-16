import COS from 'cos-nodejs-sdk-v5';
import { Injectable, BadRequestException } from '@nestjs/common';
import { cosConfig } from '../../config/cos.config';

@Injectable()
export class UploadService {
  private cos: COS;

  constructor() {
    this.cos = new COS({
      SecretId: process.env.COS_SECRET_ID,
      SecretKey: process.env.COS_SECRET_KEY,
    });
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

  async uploadIdCard(file: Express.Multer.File, type: 'front' | 'back'): Promise<string> {
    if (!cosConfig.allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('不支持的文件类型');
    }
    if (file.size > cosConfig.maxFileSize) {
      throw new BadRequestException('文件大小超过限制');
    }
    return this.uploadToCOS(file, `id-cards/${type}`);
  }

  async uploadFile(file: Express.Multer.File, category: string): Promise<string> {
    console.log('上传文件信息:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      category
    });

    if (!cosConfig.allowedFileTypes.includes(file.mimetype)) {
      console.error('不支持的文件类型:', file.mimetype);
      throw new BadRequestException(`不支持的文件类型: ${file.mimetype}, 仅支持: ${cosConfig.allowedFileTypes.join(', ')}`);
    }

    if (file.size > cosConfig.maxFileSize) {
      console.error('文件大小超过限制:', file.size);
      throw new BadRequestException(`文件大小超过限制: ${file.size}字节, 最大允许: ${cosConfig.maxFileSize}字节`);
    }

    try {
      const result = await this.uploadToCOS(file, category);
      console.log('文件上传成功:', result);
      return result;
    } catch (error) {
      console.error('文件上传失败:', error);
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