import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { WeChatService } from './wechat.service';
import { WeChatController } from './wechat.controller';
import { WechatSubscribeService } from './wechat-subscribe.service';
import { WechatOAuthService } from './wechat-oauth.service';
import {
  WechatSubscribeCredit,
  WechatSubscribeCreditSchema,
} from './models/wechat-subscribe-credit.model';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: WechatSubscribeCredit.name, schema: WechatSubscribeCreditSchema },
    ]),
    UsersModule,
    // 用于签发 PC 扫码 handoff 短期 JWT
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET environment variable is required');
        return { secret, signOptions: { algorithm: 'HS256' } };
      },
    }),
  ],
  providers: [WeChatService, WechatSubscribeService, WechatOAuthService],
  controllers: [WeChatController],
  exports: [WeChatService, WechatSubscribeService, WechatOAuthService],
})
export class WeChatModule {}
