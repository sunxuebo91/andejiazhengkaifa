import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { CosService } from './cos.service';
import { VideoTranscoderService } from './video-transcoder.service';

@Module({
  imports: [
    ConfigModule,
  ],
  controllers: [UploadController],
  providers: [UploadService, CosService, VideoTranscoderService],
  exports: [UploadService, CosService, VideoTranscoderService],
})
export class UploadModule {}