import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ZmdbController } from './zmdb.controller';
import { ZmdbMiniprogramController } from './zmdb-miniprogram.controller';
import { ZmdbService } from './zmdb.service';
import { BackgroundCheck, BackgroundCheckSchema } from './models/background-check.model';
import { ESignModule } from '../esign/esign.module';
import { UploadModule } from '../upload/upload.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: BackgroundCheck.name, schema: BackgroundCheckSchema },
    ]),
    // 用于验证URL参数中的token
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'andejiazheng-secret-key',
      signOptions: { algorithm: 'HS256' },
    }),
    forwardRef(() => ESignModule),
    forwardRef(() => ContractsModule),
    UploadModule,
  ],
  controllers: [ZmdbController, ZmdbMiniprogramController],
  providers: [ZmdbService],
  exports: [ZmdbService],
})
export class ZmdbModule {}
