import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WeChatService } from './wechat.service';
import { WeChatController } from './wechat.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
  ],
  providers: [WeChatService],
  controllers: [WeChatController],
  exports: [WeChatService],
})
export class WeChatModule {}
