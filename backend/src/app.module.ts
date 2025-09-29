import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResumeModule } from './modules/resume/resume.module';
import { UploadModule } from './modules/upload/upload.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { HealthModule } from './modules/health/health.module';
import { BaiduModule } from './modules/baidu/baidu.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FollowUpModule } from './modules/follow-up/follow-up.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { ESignModule } from './modules/esign/esign.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WeixinModule } from './modules/weixin/weixin.module';
import { WeChatModule } from './modules/wechat/wechat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'development' ? ['.env.dev', '.env'] : ['.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI', 'mongodb://127.0.0.1:27017/housekeeping'),
        retryWrites: true,
        w: 'majority',
        socketTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 10000,
      }),
      inject: [ConfigService],
    }),
    ResumeModule,
    UploadModule,
    OcrModule,
    HealthModule,
    BaiduModule,
    TasksModule,
    UsersModule,
    AuthModule,
    FollowUpModule,
    CustomersModule,
    ContractsModule,
    ESignModule,
    DashboardModule,
    WeixinModule,
    WeChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}