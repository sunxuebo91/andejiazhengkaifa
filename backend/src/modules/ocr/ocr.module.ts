import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OcrController } from './ocr.controller';
import { TencentOcrService } from './tencent-ocr.service';
import { OcrMetricsService } from './ocr.metrics.service';

@Module({
  imports: [ConfigModule],
  controllers: [OcrController],
  providers: [TencentOcrService, OcrMetricsService],
  exports: [TencentOcrService]
})
export class OcrModule {}