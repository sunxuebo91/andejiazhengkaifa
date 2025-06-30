import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { Contract, ContractSchema } from './models/contract.model';
import { CustomerContractHistory, CustomerContractHistorySchema } from './models/customer-contract-history.model';
import { ESignModule } from '../esign/esign.module';
import { TestController } from './test.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: CustomerContractHistory.name, schema: CustomerContractHistorySchema },
    ]),
    ESignModule,
  ],
  controllers: [ContractsController, TestController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {} 