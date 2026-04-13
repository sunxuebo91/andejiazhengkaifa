import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { TrainingLeadsController } from './training-leads.controller';
import { TrainingLeadsMiniProgramController } from './training-leads-miniprogram.controller';
import { TrainingLeadsService } from './training-leads.service';
import { TrainingLead, TrainingLeadSchema } from './models/training-lead.model';
import { TrainingLeadFollowUp, TrainingLeadFollowUpSchema } from './models/training-lead-follow-up.model';
import { User, UserSchema } from '../users/models/user.entity';
import { AIModule } from '../ai/ai.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TrainingLead.name, schema: TrainingLeadSchema },
      { name: TrainingLeadFollowUp.name, schema: TrainingLeadFollowUpSchema },
      { name: User.name, schema: UserSchema },
    ]),
    // 为分享令牌签发/验证提供 JwtService
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET environment variable is required');
        return { secret, signOptions: { algorithm: 'HS256' } };
      },
    }),
    AIModule,
    NotificationModule,
  ],
  controllers: [TrainingLeadsController, TrainingLeadsMiniProgramController],
  providers: [TrainingLeadsService],
  exports: [TrainingLeadsService],
})
export class TrainingLeadsModule {}

