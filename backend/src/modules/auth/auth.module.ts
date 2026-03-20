import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { UsersModule } from '../users/users.module';
import { UploadModule } from '../upload/upload.module';
import { LoginLog, LoginLogSchema } from './models/login-log.entity';

@Module({
  imports: [
    UsersModule,
    UploadModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: LoginLog.name, schema: LoginLogSchema }
    ]),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET environment variable is required');
        return { secret, signOptions: { expiresIn: '24h', algorithm: 'HS256' } };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, RolesGuard, PermissionsGuard],
  controllers: [AuthController],
  exports: [AuthService, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
