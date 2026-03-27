import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { ImageCacheModule } from '../image-cache/image-cache.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ImageCacheModule,
    ContractsModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}