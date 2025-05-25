import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Get, Param, Res, Delete, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UploadService } from './upload.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('文件上传')
@Controller('upload')
// @UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: {
          type: 'string',
          description: '文件类型（idCardFront/idCardBack/personalPhoto/certificate/report）',
        },
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('不支持的文件类型，仅支持 JPG、PNG 和 PDF');
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过 5MB');
    }

    try {
      const fileId = await this.uploadService.uploadFile(file, { type });
      return {
        success: true,
        data: {
          fileId,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        }
      };
    } catch (error) {
      throw new BadRequestException(`文件上传失败: ${error.message}`);
    }
  }

  @Get('file/:fileId')
  async getFile(
    @Param('fileId') fileId: string,
    @Res() res: Response
  ) {
    try {
      const { stream, metadata } = await this.uploadService.getFile(fileId);
      
      res.setHeader('Content-Type', metadata.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${metadata.filename}"`);
      
      stream.pipe(res);
    } catch (error) {
      throw new BadRequestException(`获取文件失败: ${error.message}`);
    }
  }

  @Delete('file/:fileId')
  async deleteFile(@Param('fileId') fileId: string) {
    try {
      await this.uploadService.deleteFile(fileId);
      return {
        success: true,
        message: '文件删除成功'
      };
    } catch (error) {
      throw new BadRequestException(`删除文件失败: ${error.message}`);
    }
  }
}