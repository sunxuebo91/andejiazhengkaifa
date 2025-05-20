import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';

@Module({
  imports: [ConfigModule],
  controllers: [OcrController],
  providers: [OcrService]
})
export class OcrModule {}
