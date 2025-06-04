import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowUp, FollowUpSchema } from './models/follow-up.entity';
import { FollowUpController } from './follow-up.controller';
import { FollowUpService } from './follow-up.service';
import { ResumeModule } from '../resume/resume.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FollowUp.name, schema: FollowUpSchema }
    ]),
    ResumeModule,
    UsersModule,
  ],
  controllers: [FollowUpController],
  providers: [FollowUpService],
  exports: [FollowUpService],
})
export class FollowUpModule {} 