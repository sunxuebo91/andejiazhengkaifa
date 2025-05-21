import { Controller, Post, Get, UploadedFile, UseInterceptors, Param, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { cosConfig } from '../../config/cos.config';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('文件上传')
@ApiBearerAuth()
@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('test-connection')
  @ApiOperation({ summary: '测试COS连接', description: '测试与腾讯云对象存储的连接状态' })
  @ApiResponse({ status: 200, description: '连接成功' })
  @ApiResponse({ status: 400, description: '连接失败' })
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
  @ApiOperation({ summary: '上传身份证照片', description: '上传身份证正面或背面照片' })
  @ApiParam({ name: 'type', description: '照片类型', enum: ['front', 'back'] })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '身份证照片文件'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: '上传成功' })
  @ApiResponse({ status: 400, description: '上传失败' })
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
  @ApiOperation({ summary: '上传其他文件', description: '上传其他类型的文件（如证书、体检报告等）' })
  @ApiParam({ name: 'category', description: '文件类别', example: 'certificate' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: '上传成功' })
  @ApiResponse({ status: 400, description: '上传失败' })
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
  @ApiOperation({ summary: '获取文件预览URL', description: '获取已上传文件的预览URL' })
  @ApiParam({ name: 'key', description: '文件在COS中的键值' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '文件不存在' })
  async getPreviewUrl(@Param('key') key: string) {
    return this.uploadService.getFileUrl(key);
  }
}