import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainingOrdersController } from './training-orders.controller';
import { TrainingOrdersBaobeiController } from './training-orders-baobei.controller';
import { TrainingOrdersService } from './training-orders.service';
import { Contract, ContractSchema } from '../contracts/models/contract.model';
import { TrainingLead, TrainingLeadSchema } from '../training-leads/models/training-lead.model';
import { ContractsModule } from '../contracts/contracts.module';
import { MiniProgramNotificationModule } from '../miniprogram-notification/miniprogram-notification.module';

/**
 * 职培订单模块
 * - 数据层复用 Contract / TrainingLead 集合
 * - 业务层独立：TrainingOrdersService 内部强制 orderCategory='training' 过滤
 * - 提供 CRM 端（/api/training-orders）与褓贝小程序端（/api/miniprogram/training-orders/baobei）两套控制器
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: TrainingLead.name, schema: TrainingLeadSchema },
    ]),
    ContractsModule,
    MiniProgramNotificationModule,
  ],
  controllers: [TrainingOrdersController, TrainingOrdersBaobeiController],
  providers: [TrainingOrdersService],
  exports: [TrainingOrdersService],
})
export class TrainingOrdersModule {}
