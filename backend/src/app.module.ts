import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResumeModule } from './modules/resume/resume.module';
import { UploadModule } from './modules/upload/upload.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { HealthModule } from './modules/health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development', '.env.production'],
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
    TasksModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}