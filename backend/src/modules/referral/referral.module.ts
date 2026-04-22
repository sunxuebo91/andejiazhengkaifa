import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { Referrer, ReferrerSchema } from './models/referrer.model';
import { ReferralResume, ReferralResumeSchema } from './models/referral-resume.model';
import { ReferralBindingLog, ReferralBindingLogSchema } from './models/referral-binding-log.model';
import { ReferralReward, ReferralRewardSchema } from './models/referral-reward.model';
import { MiniProgramUser, MiniProgramUserSchema } from '../miniprogram-user/models/miniprogram-user.entity';
import { Contract, ContractSchema } from '../contracts/models/contract.model';
import { ResumeModule } from '../resume/resume.module';
import { UsersModule } from '../users/users.module';
import { MiniProgramUserModule } from '../miniprogram-user/miniprogram-user.module';
import { MiniProgramNotificationModule } from '../miniprogram-notification/miniprogram-notification.module';
import { NotificationModule } from '../notification/notification.module';
import { WeixinModule } from '../weixin/weixin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Referrer.name, schema: ReferrerSchema },
      { name: ReferralResume.name, schema: ReferralResumeSchema },
      { name: ReferralBindingLog.name, schema: ReferralBindingLogSchema },
      { name: ReferralReward.name, schema: ReferralRewardSchema },
      { name: MiniProgramUser.name, schema: MiniProgramUserSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
    ResumeModule,
    UsersModule,
    MiniProgramUserModule,
    MiniProgramNotificationModule,
    NotificationModule,
    WeixinModule,
    // 用于从 Authorization: Bearer JWT 中解析 openid
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET environment variable is required');
        return { secret, signOptions: { algorithm: 'HS256' } };
      },
    }),
  ],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
