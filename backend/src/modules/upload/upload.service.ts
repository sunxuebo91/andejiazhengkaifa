import { Injectable, Logger } from '@nestjs/common';
import { CosService } from './cos.service';

interface CosMetadata {
  'x-cos-meta-mimetype'?: string;
  'x-cos-meta-size'?: string;
  'x-cos-meta-uploadtime'?: string;
  'x-cos-meta-type'?: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly cosService: CosService) {}

  async uploadFile(file: Express.Multer.File, metadata: any = {}): Promise<string> {
    try {
      // 生成文件存储路径
      const key = this.cosService.generateFileKey(file.originalname, metadata.type || 'other');
      
      // 上传到 COS
      const fileUrl = await this.cosService.uploadFile(file, key);
      
      this.logger.log(`文件上传成功: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      this.logger.error(`文件上传过程出错: ${error.message}`);
      throw error;
    }
  }

  async getFile(fileUrl: string): Promise<{ url: string; metadata: any }> {
    try {
      // 从 URL 中提取文件 key
      const urlObj = new URL(fileUrl);
      const key = urlObj.pathname.substring(1); // 移除开头的斜杠
      
      // 获取文件元数据
      const metadata = await this.cosService.getFileInfo(key);
      
      // 获取带签名的访问 URL
      const signedUrl = await this.cosService.getSignedUrl(key);
      
      // 从 COS 元数据中提取信息
      const cosMetadata = metadata.headers as CosMetadata;
      
      return {
        url: signedUrl,
        metadata: {
          filename: key.split('/').pop(),
          mimeType: cosMetadata['x-cos-meta-mimetype'] || 'application/octet-stream',
          size: parseInt(cosMetadata['x-cos-meta-size'] || '0', 10),
          uploadTime: cosMetadata['x-cos-meta-uploadtime'] ? new Date(cosMetadata['x-cos-meta-uploadtime']) : new Date(),
          type: cosMetadata['x-cos-meta-type'] || key.split('/')[0] // 从元数据或路径中提取类型
        }
      };
    } catch (error) {
      this.logger.error(`获取文件失败: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // 从 URL 中提取文件 key
      const urlObj = new URL(fileUrl);
      const key = urlObj.pathname.substring(1); // 移除开头的斜杠
      
      await this.cosService.deleteFile(key);
      this.logger.log(`文件删除成功: ${fileUrl}`);
    } catch (error) {
      this.logger.error(`文件删除失败: ${error.message}`);
      throw error;
    }
  }
}