import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainingOrdersController } from './training-orders.controller';
import { TrainingOrdersBaobeiController } from './training-orders-baobei.controller';
import { TrainingOrdersMiniProgramController } from './training-orders-miniprogram.controller';
import { TrainingOrdersService } from './training-orders.service';
import { Contract, ContractSchema } from '../contracts/models/contract.model';
import { TrainingLead, TrainingLeadSchema } from '../training-leads/models/training-lead.model';
import { ContractsModule } from '../contracts/contracts.module';
import { ESignModule } from '../esign/esign.module';
import { MiniProgramNotificationModule } from '../miniprogram-notification/miniprogram-notification.module';

/**
 * 职培订单模块
 * - 数据层复用 Contract / TrainingLead 集合
 * - 业务层独立：TrainingOrdersService 内部强制 orderCategory='training' 过滤
 * - 控制器：
 *   · CRM 端：/api/training-orders（TrainingOrdersController）
 *   · 褓贝小程序（学员端）：/api/miniprogram/training-orders/baobei（TrainingOrdersBaobeiController）
 *   · 安得家政小程序（招生老师/运营/管理员端）：/api/training-orders/miniprogram（TrainingOrdersMiniProgramController）
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: TrainingLead.name, schema: TrainingLeadSchema },
    ]),
    ContractsModule,
    ESignModule,
    MiniProgramNotificationModule,
  ],
  controllers: [
    TrainingOrdersController,
    TrainingOrdersBaobeiController,
    TrainingOrdersMiniProgramController,
  ],
  providers: [TrainingOrdersService],
  exports: [TrainingOrdersService],
})
export class TrainingOrdersModule {}
