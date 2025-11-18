import { Module, forwardRef } from '@nestjs/common';
import { ZegoController } from './zego.controller';
import { ZegoService } from './zego.service';

@Module({
  imports: [],
  controllers: [ZegoController],
  providers: [ZegoService],
  exports: [ZegoService],
})
export class ZegoModule {}

