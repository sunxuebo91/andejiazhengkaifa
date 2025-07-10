import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowUp, FollowUpSchema } from './models/follow-up.entity';
import { FollowUpController } from './follow-up.controller';
import { FollowUpService } from './follow-up.service';
import { User, UserSchema } from '../users/models/user.entity';
import { Resume, ResumeSchema } from '../resume/models/resume.entity';
import mongooseAutopopulate from 'mongoose-autopopulate';
// import { ResumeModule } from '../resume/resume.module';
// import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { 
        name: FollowUp.name, 
        schema: FollowUpSchema.plugin(mongooseAutopopulate as any)
      },
      { name: 'User', schema: UserSchema },
      { name: Resume.name, schema: ResumeSchema }
    ]),
    // ResumeModule,
    // UsersModule,
  ],
  controllers: [FollowUpController],
  providers: [FollowUpService],
  exports: [FollowUpService],
})
export class FollowUpModule {} 