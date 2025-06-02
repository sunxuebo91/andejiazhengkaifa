import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { ImageCacheModule } from '../image-cache/image-cache.module';
import * as nodeCrypto from 'crypto';

// 确保 crypto 模块可用（仅在需要时）
// Node.js环境通常已经有crypto模块，这里只是确保全局可用性
if (!globalThis.crypto) {
  // 使用类型断言来避免类型冲突
  (globalThis as any).crypto = nodeCrypto.webcrypto || nodeCrypto;
}

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ImageCacheModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}