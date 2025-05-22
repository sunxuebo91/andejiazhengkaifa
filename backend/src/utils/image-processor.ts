import sharp from 'sharp';
import { BadRequestException } from '@nestjs/common';

export class ImageProcessor {
  private static readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly TARGET_SIZE = 1024; // 1024px
  private static readonly QUALITY = 80;

  static async processIdCardImage(buffer: Buffer): Promise<Buffer> {
    try {
      // 获取图片信息
      const metadata = await sharp(buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('无效的图片格式');
      }

      // 检查文件大小
      if (buffer.length > this.MAX_SIZE) {
        throw new BadRequestException('图片大小不能超过5MB');
      }

      // 调整图片大小和质量
      const processedBuffer = await sharp(buffer)
        .resize(this.TARGET_SIZE, this.TARGET_SIZE, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: this.QUALITY })
        .toBuffer();

      return processedBuffer;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('图片处理失败');
    }
  }

  static async validateImage(buffer: Buffer): Promise<void> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      // 验证图片格式
      if (!['jpeg', 'jpg', 'png'].includes(metadata.format || '')) {
        throw new BadRequestException('只支持JPG/PNG格式的图片');
      }

      // 验证图片尺寸
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('无法读取图片尺寸');
      }

      // 验证最小尺寸
      if (metadata.width < 300 || metadata.height < 300) {
        throw new BadRequestException('图片尺寸太小，最小尺寸为300x300');
      }

      // 验证长宽比
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio < 1.4 || aspectRatio > 1.6) {
        throw new BadRequestException('请上传标准身份证比例的图片');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('图片验证失败');
    }
  }
}