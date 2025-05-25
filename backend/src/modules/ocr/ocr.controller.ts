import { Controller, Post, Get, UseInterceptors, UploadedFile, BadRequestException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TencentOcrService } from './tencent-ocr.service';
import { ImageProcessor } from '../../utils/image-processor';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
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
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({ summary: '身份证识别' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '身份证图片文件',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: '识别成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 413, description: '文件大小超过限制' })
  @ApiResponse({ status: 415, description: '不支持的图片格式' })
  @ApiResponse({ status: 502, description: 'OCR服务错误' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  async idCard(@UploadedFile() file: Express.Multer.File) {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.logger.log(`[${requestId}] 收到身份证OCR请求`);

    try {
      if (!file) {
        this.logger.warn(`[${requestId}] 没有上传文件`);
        throw new BadRequestException('没有上传文件');
      }

      this.logger.log(`[${requestId}] 处理文件: ${file.originalname} (${file.size} bytes)`);

      // 验证和处理图片
      try {
        await ImageProcessor.validateImage(file.buffer);
      } catch (error) {
        this.logger.warn(`[${requestId}] 图片验证失败:`, error);
        throw new BadRequestException(error.message || '图片验证失败');
      }

      let processedImage: Buffer;
      try {
        processedImage = await ImageProcessor.processIdCardImage(file.buffer);
        this.logger.log(`[${requestId}] 图片处理成功: ${processedImage.length} bytes`);
      } catch (error) {
        this.logger.error(`[${requestId}] 图片处理失败:`, error);
        throw new HttpException({
          success: false,
          message: error.message || '图片处理失败',
          error: 'IMAGE_PROCESSING_ERROR'
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // 验证身份证面类型参数
      const idCardSide = file.originalname.toLowerCase().includes('back') ? 'back' : 'front';
      this.logger.log(`[${requestId}] 处理${idCardSide === 'front' ? '正面' : '背面'}身份证识别请求`);

      // 调用对应的识别方法
      let result;
      try {
        result = idCardSide === 'front'
          ? await this.ocrService.idCardFront(processedImage)
          : await this.ocrService.idCardBack(processedImage);
        this.logger.log(`[${requestId}] OCR识别成功`);
      } catch (error) {
        this.logger.error(`[${requestId}] OCR识别失败:`, error);
        
        if (error.message?.includes('腾讯云OCR API错误')) {
          throw new HttpException({
            success: false,
            message: error.message,
            error: 'TENCENT_OCR_ERROR',
            requestId
          }, HttpStatus.BAD_GATEWAY);
        }

        if (error.message?.includes('身份证识别结果缺少必要字段')) {
          throw new HttpException({
            success: false,
            message: error.message,
            error: 'INVALID_OCR_RESULT',
            requestId
          }, HttpStatus.BAD_REQUEST);
        }

        throw new HttpException({
          success: false,
          message: error.message || '身份证识别失败',
          error: error.response?.data?.Error?.Message || error.message,
          requestId
        }, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return {
        success: true,
        data: result,
        message: '识别成功',
        requestId
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`[${requestId}] 未预期的错误:`, error);
      throw new HttpException({
        success: false,
        message: '服务器内部错误',
        error: error.message,
        requestId
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务正常' })
  @ApiResponse({ status: 503, description: '服务异常' })
  async checkHealth() {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.logger.log(`[${requestId}] 收到健康检查请求`);

    try {
      const report = await this.ocrService.getPerformanceReport();
      this.logger.log(`[${requestId}] 健康检查成功`);
      
      return {
        status: 'healthy',
        message: '服务运行正常',
        metrics: report,
        requestId
      };
    } catch (error) {
      this.logger.error(`[${requestId}] 健康检查失败:`, error);
      throw new HttpException({
        status: 'unhealthy',
        message: '服务异常',
        error: error.message,
        requestId
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: '获取服务指标' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 500, description: '获取失败' })
  async getMetrics() {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.logger.log(`[${requestId}] 收到获取指标请求`);

    try {
      const report = await this.ocrService.getPerformanceReport();
      this.logger.log(`[${requestId}] 获取指标成功`);
      
      return {
        success: true,
        data: report,
        requestId
      };
    } catch (error) {
      this.logger.error(`[${requestId}] 获取指标失败:`, error);
      throw new HttpException({
        success: false,
        message: '获取服务指标失败',
        error: error.message,
        requestId
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}