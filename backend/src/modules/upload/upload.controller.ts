
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Param,
  Res,
  Delete,
  Body,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Logger
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UploadService } from './upload.service';
import { VideoTranscoderService } from './video-transcoder.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CosException, CosErrorType } from './exceptions/cos.exception';

@ApiTags('文件上传')
@Controller('upload')
// @UseGuards(JwtAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly uploadService: UploadService,
    private readonly videoTranscoderService: VideoTranscoderService
  ) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传文件', description: '上传文件到腾讯云COS' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件',
        },
        type: {
          type: 'string',
          enum: ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'report', 'medicalReport', 'confinementMealPhoto', 'cookingPhoto', 'complementaryFoodPhoto', 'positiveReviewPhoto', 'workExperiencePhoto', 'banner', 'article'],
          description: '文件类型',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: '文件上传成功' })
  @ApiResponse({ status: 400, description: '文件验证失败或上传失败' })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    const validTypes = ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'report', 'medicalReport', 'confinementMealPhoto', 'cookingPhoto', 'complementaryFoodPhoto', 'positiveReviewPhoto', 'workExperiencePhoto', 'banner', 'article'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException('无效的文件类型');
    }

    try {
      const fileUrl = await this.uploadService.uploadFile(file, { type });
      return {
        success: true,
        data: {
          fileUrl,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        }
      };
    } catch (error) {
      if (error instanceof CosException) {
        throw error;
      }
      throw new CosException(
        CosErrorType.UPLOAD_FAILED,
        `文件上传失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
        error
      );
    }
  }

  @Get('file/:fileUrl')
  @ApiOperation({ summary: '获取文件', description: '通过文件URL获取文件' })
  @ApiResponse({ status: 307, description: '重定向到文件URL' })
  @ApiResponse({ status: 400, description: '文件获取失败' })
  @ApiResponse({ status: 404, description: '文件不存在' })
  async getFile(
    @Param('fileUrl') fileUrl: string,
    @Res() res: Response
  ) {
    try {
      const { url, metadata } = await this.uploadService.getFile(decodeURIComponent(fileUrl));
      
      // 设置缓存头
      res.set({
        'Cache-Control': 'max-age=31536000', // 缓存一年
      });
      
      // 重定向到 COS 的签名 URL
      res.redirect(HttpStatus.TEMPORARY_REDIRECT, url);
    } catch (error) {
      if (error instanceof CosException) {
        throw error;
      }
      
      if (error.message.includes('not found')) {
        throw new CosException(
          CosErrorType.FILE_NOT_FOUND,
          '文件不存在',
          HttpStatus.NOT_FOUND,
          error
        );
      }
      
      throw new CosException(
        CosErrorType.DOWNLOAD_FAILED,
        `获取文件失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
        error
      );
    }
  }

  @Delete('file/:fileUrl')
  @ApiOperation({ summary: '删除文件', description: '通过文件URL删除文件' })
  @ApiResponse({ status: 200, description: '文件删除成功' })
  @ApiResponse({ status: 400, description: '文件删除失败' })
  @ApiResponse({ status: 404, description: '文件不存在' })
  async deleteFile(@Param('fileUrl') fileUrl: string) {
    try {
      await this.uploadService.deleteFile(decodeURIComponent(fileUrl));
      return {
        success: true,
        message: '文件删除成功'
      };
    } catch (error) {
      if (error instanceof CosException) {
        throw error;
      }
      
      if (error.message.includes('not found')) {
        throw new CosException(
          CosErrorType.FILE_NOT_FOUND,
          '文件不存在',
          HttpStatus.NOT_FOUND,
          error
        );
      }

      throw new CosException(
        CosErrorType.DELETE_FAILED,
        `删除文件失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
        error
      );
    }
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传视频', description: '上传视频到腾讯云COS，自动转码为H.264格式' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的视频文件',
        },
        type: {
          type: 'string',
          enum: ['selfIntroductionVideo'],
          description: '视频类型',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: '视频上传成功' })
  @ApiResponse({ status: 400, description: '视频验证失败或上传失败' })
  async uploadVideo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB for video before transcoding
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    // 验证文件类型
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm', 'video/mpeg', 'video/3gpp'];
    if (!allowedVideoTypes.includes(file.mimetype)) {
      throw new BadRequestException(`不支持的视频格式: ${file.mimetype}`);
    }

    if (!['selfIntroductionVideo'].includes(type)) {
      throw new BadRequestException('无效的视频类型');
    }

    try {
      this.logger.log(`开始处理视频上传: ${file.originalname}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

      // 转码视频为H.264格式
      const { buffer: transcodedBuffer, filename: transcodedFilename } =
        await this.videoTranscoderService.transcodeToH264(file.buffer, file.originalname);

      this.logger.log(`视频转码完成，新文件名: ${transcodedFilename}, 大小: ${(transcodedBuffer.length / 1024 / 1024).toFixed(2)}MB`);

      // 创建新的文件对象用于上传
      const transcodedFile: Express.Multer.File = {
        ...file,
        buffer: transcodedBuffer,
        originalname: transcodedFilename,
        mimetype: 'video/mp4',
        size: transcodedBuffer.length,
      };

      // 上传转码后的视频
      const fileUrl = await this.uploadService.uploadFile(transcodedFile, { type });

      this.logger.log(`视频上传成功: ${fileUrl}`);

      return {
        success: true,
        data: {
          fileUrl,
          filename: transcodedFilename,
          originalFilename: file.originalname,
          mimeType: 'video/mp4',
          size: transcodedBuffer.length,
          originalSize: file.size,
        }
      };
    } catch (error) {
      this.logger.error(`视频上传失败: ${error.message}`, error.stack);
      if (error instanceof CosException) {
        throw error;
      }
      throw new CosException(
        CosErrorType.UPLOAD_FAILED,
        `视频上传失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
        error
      );
    }
  }
}