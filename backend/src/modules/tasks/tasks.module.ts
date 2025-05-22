import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { OcrModule } from '../ocr/ocr.module';
import { ImageCacheModule } from '../image-cache/image-cache.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    OcrModule,
    ImageCacheModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}