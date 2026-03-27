import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIController } from './ai.controller';
import { QwenAIService } from './qwen-ai.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [ConfigModule, UploadModule],
  controllers: [AIController],
  providers: [QwenAIService],
  exports: [QwenAIService],
})
export class AIModule {}

