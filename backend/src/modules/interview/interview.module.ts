import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { InterviewRoom, InterviewRoomSchema } from './models/interview-room.entity';
import { ZegoModule } from '../zego/zego.module';

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
export class InterviewModule {}

