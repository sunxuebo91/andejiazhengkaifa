import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { CosService } from './cos.service';

@Module({
  imports: [
    ConfigModule,
  ],
  controllers: [UploadController],
  providers: [UploadService, CosService],
  exports: [UploadService, CosService],
})
export class UploadModule {}