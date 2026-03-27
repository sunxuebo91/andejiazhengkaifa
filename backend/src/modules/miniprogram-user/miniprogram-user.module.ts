import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MiniProgramUserController } from './miniprogram-user.controller';
import { MiniProgramUserService } from './miniprogram-user.service';
import { MiniProgramUser, MiniProgramUserSchema } from './models/miniprogram-user.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MiniProgramUser.name, schema: MiniProgramUserSchema },
    ]),
    UsersModule,
  ],
  controllers: [MiniProgramUserController],
  providers: [MiniProgramUserService],
  exports: [MiniProgramUserService],
})
export class MiniProgramUserModule {}

