import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ESignController } from './esign.controller';
import { ESignService } from './esign.service';
import { Contract, ContractSchema } from '../contracts/models/contract.model';
import { ContractsModule } from '../contracts/contracts.module';
import { WeixinModule } from '../weixin/weixin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema }
    ]),
    forwardRef(() => ContractsModule), // 使用 forwardRef 避免循环依赖
    WeixinModule, // 用于发送合同签署通知
  ],
  controllers: [ESignController],
  providers: [ESignService],
  exports: [ESignService],
})
export class ESignModule {}