import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MiniProgramUserController } from './miniprogram-user.controller';
import { MiniProgramUserService } from './miniprogram-user.service';
import { MiniProgramUser, MiniProgramUserSchema } from './models/miniprogram-user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MiniProgramUser.name, schema: MiniProgramUserSchema },
    ]),
  ],
  controllers: [MiniProgramUserController],
  providers: [MiniProgramUserService],
  exports: [MiniProgramUserService],
})
export class MiniProgramUserModule {}

