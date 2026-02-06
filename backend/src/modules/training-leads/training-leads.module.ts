import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { TrainingLeadsController } from './training-leads.controller';
import { TrainingLeadsService } from './training-leads.service';
import { TrainingLead, TrainingLeadSchema } from './models/training-lead.model';
import { TrainingLeadFollowUp, TrainingLeadFollowUpSchema } from './models/training-lead-follow-up.model';
import { User, UserSchema } from '../users/models/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TrainingLead.name, schema: TrainingLeadSchema },
      { name: TrainingLeadFollowUp.name, schema: TrainingLeadFollowUpSchema },
      { name: User.name, schema: UserSchema },
    ]),
    // 为分享令牌签发/验证提供 JwtService
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'andejiazheng-secret-key',
      signOptions: { algorithm: 'HS256' }
    }),
  ],
  controllers: [TrainingLeadsController],
  providers: [TrainingLeadsService],
  exports: [TrainingLeadsService],
})
export class TrainingLeadsModule {}

