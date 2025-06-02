import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { ImageCacheModule } from '../image-cache/image-cache.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ImageCacheModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}