import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { ImageCacheModule } from '../image-cache/image-cache.module';
import { OcrMetricsService } from './ocr.metrics.service';

@Module({
  imports: [ConfigModule, ImageCacheModule],
  controllers: [OcrController],
  providers: [OcrService, OcrMetricsService],
  exports: [OcrService]
})
export class OcrModule {}
