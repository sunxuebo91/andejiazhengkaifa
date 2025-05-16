import { Controller, Post, Get, UploadedFile, UseInterceptors, Param, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { cosConfig } from '../../config/cos.config';

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('test-connection')
  async testCOSConnection() {
    try {
      await this.uploadService.testConnection();
      return {
        status: 'success',
        message: 'COS连接成功',
        config: {
          region: cosConfig.Region,
          bucket: cosConfig.Bucket
        }
      };
    } catch (error) {
      throw new BadRequestException(`COS连接失败: ${error.message}`);
    }
  }

  @Post('id-card/:type')
  @UseInterceptors(FileInterceptor('file'))
  async uploadIdCard(
    @UploadedFile() file: Express.Multer.File,
    @Param('type') type: 'front' | 'back'
  ) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }
    return this.uploadService.uploadIdCard(file, type);
  }

  @Post('file/:category')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Param('category') category: string
  ) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }
    return this.uploadService.uploadFile(file, category);
  }

  @Get('preview/:key')
  async getPreviewUrl(@Param('key') key: string) {
    return this.uploadService.getFileUrl(key);
  }
}