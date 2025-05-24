import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { LoginLog, LoginLogSchema } from './models/login-log.entity';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: LoginLog.name, schema: LoginLogSchema }
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'andejiazheng-secret-key',
      signOptions: { 
        expiresIn: '24h',
        algorithm: 'HS256'
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}