import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModuleRef } from '@nestjs/core';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { InterviewRoom, InterviewRoomSchema } from './models/interview-room.entity';
import { ZegoModule } from '../zego/zego.module';
import { ZegoService } from '../zego/zego.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InterviewRoom.name, schema: InterviewRoomSchema },
    ]),
    forwardRef(() => ZegoModule),
  ],
  controllers: [InterviewController],
  providers: [InterviewService],
  exports: [InterviewService],
})
export class InterviewModule implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly interviewService: InterviewService,
  ) {}

  /**
   * 模块初始化时，将 InterviewService 注入到 ZegoService
   * 用于避免循环依赖
   */
  async onModuleInit() {
    const zegoService = this.moduleRef.get(ZegoService, { strict: false });
    if (zegoService) {
      zegoService.setInterviewService(this.interviewService);
    }
  }
}

