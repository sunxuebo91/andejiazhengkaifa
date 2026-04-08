import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MiniProgramNotificationController } from './miniprogram-notification.controller';
import { MiniProgramNotificationService } from './miniprogram-notification.service';
import {
  MiniProgramNotification,
  MiniProgramNotificationSchema,
} from './models/miniprogram-notification.model';
import { Contract, ContractSchema } from '../contracts/models/contract.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MiniProgramNotification.name, schema: MiniProgramNotificationSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
  ],
  controllers: [MiniProgramNotificationController],
  providers: [MiniProgramNotificationService],
  exports: [MiniProgramNotificationService],
})
export class MiniProgramNotificationModule {}
