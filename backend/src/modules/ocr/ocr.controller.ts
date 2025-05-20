import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from './ocr.service';

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('idcard')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB限制
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
        cb(null, true);
      } else {
        cb(new Error('只支持JPG/PNG格式'), false);
      }
    }
  }))
  async idCard(@UploadedFile() file: Express.Multer.File) {
    try {
      const result = await this.ocrService.idCardFront(file.buffer);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}
