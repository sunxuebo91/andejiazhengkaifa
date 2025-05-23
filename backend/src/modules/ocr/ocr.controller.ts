import { Controller, Post, Get, UseInterceptors, UploadedFile, BadRequestException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TencentOcrService } from './tencent-ocr.service';
import { ImageProcessor } from '../../utils/image-processor';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const multerOptions: MulterOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
      cb(new BadRequestException('只支持JPG、JPEG和PNG格式的图片'), false);
      return;
    }
    cb(null, true);
  },
};

@ApiTags('OCR服务')
@Controller('ocr')
export class OcrController {
  private readonly logger = new Logger(OcrController.name);

  constructor(private readonly ocrService: TencentOcrService) {}

  @Post('idcard')
  @UseInterceptors(FileInterceptor('image', multerOptions))
  @ApiOperation({ summary: '身份证识别' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: '身份证图片文件',
        },
      },
    },
  })
  async idCard(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('没有上传文件');
      }

      this.logger.log(`收到身份证OCR请求: ${file.originalname} (${file.size} bytes)`);

      // 验证和处理图片
      await ImageProcessor.validateImage(file.buffer);
      const processedImage = await ImageProcessor.processIdCardImage(file.buffer);

      // 验证身份证面类型参数
      const idCardSide = file.originalname.toLowerCase().includes('back') ? 'back' : 'front';
      this.logger.log(`处理${idCardSide === 'front' ? '正面' : '背面'}身份证识别请求`);

      // 调用对应的识别方法
      const result = idCardSide === 'front'
        ? await this.ocrService.idCardFront(processedImage)
        : await this.ocrService.idCardBack(processedImage);

      this.logger.log('OCR识别成功');

      return {
        success: true,
        data: result,
        message: '识别成功'
      };
    } catch (error) {
      this.logger.error('OCR识别失败:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.message?.includes('腾讯云OCR API错误')) {
        throw new HttpException({
          success: false,
          message: error.message,
          error: 'TENCENT_OCR_ERROR'
        }, HttpStatus.BAD_GATEWAY);
      }

      throw new HttpException({
        success: false,
        message: error.message || '身份证识别失败',
        error: error.response?.data?.Error?.Message || error.message
      }, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  async checkHealth() {
    try {
      const report = await this.ocrService.getPerformanceReport();
      return {
        status: 'healthy',
        message: '服务运行正常',
        metrics: report
      };
    } catch (error) {
      this.logger.error('健康检查失败:', error);
      throw new HttpException({
        status: 'unhealthy',
        message: '服务异常',
        error: error.message
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: '获取服务指标' })
  async getMetrics() {
    try {
      const report = await this.ocrService.getPerformanceReport();
      return {
        success: true,
        data: report
      };
    } catch (error) {
      this.logger.error('获取指标失败:', error);
      throw new HttpException({
        success: false,
        message: '获取服务指标失败',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}