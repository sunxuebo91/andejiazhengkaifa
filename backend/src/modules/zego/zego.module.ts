import { Module, forwardRef } from '@nestjs/common';
import { ZegoController } from './zego.controller';
import { ZegoService } from './zego.service';
import { InterviewModule } from '../interview/interview.module';

@Module({
  imports: [forwardRef(() => InterviewModule)],
  controllers: [ZegoController],
  providers: [ZegoService],
  exports: [ZegoService],
})
export class ZegoModule {}

