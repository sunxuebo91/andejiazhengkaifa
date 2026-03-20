import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ESignController } from './esign.controller';
import { ESignService } from './esign.service';
import { ESignApiService } from './services/esign-api.service';
import { ESignUserSealService } from './services/esign-user-seal.service';
import { ESignCallbackService } from './services/esign-callback.service';
import { Contract, ContractSchema } from '../contracts/models/contract.model';
import { Customer, CustomerSchema } from '../customers/models/customer.model';
import { ContractsModule } from '../contracts/contracts.module';
import { CustomersModule } from '../customers/customers.module';
import { WeixinModule } from '../weixin/weixin.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: Customer.name, schema: CustomerSchema }
    ]),
    forwardRef(() => ContractsModule), // 使用 forwardRef 避免循环依赖
    CustomersModule,
    WeixinModule, // 用于发送合同签署通知
    NotificationModule, // 用于发送实时刷新通知
  ],
  controllers: [ESignController],
  providers: [ESignApiService, ESignUserSealService, ESignCallbackService, ESignService],
  exports: [ESignService],
})
export class ESignModule {}
