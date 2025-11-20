import { Module } from '@nestjs/common';
import { MiniprogramLogController } from './miniprogram-log.controller';

@Module({
  controllers: [MiniprogramLogController],
})
export class MiniprogramLogModule {}

