
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
  FileTypeValidator
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UploadService } from './upload.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CosException, CosErrorType } from './exceptions/cos.exception';

@ApiTags('文件上传')
@Controller('upload')
// @UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

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
          enum: ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'report'],
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
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    if (!['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'report'].includes(type)) {
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
}