import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { Contract, ContractSchema } from './models/contract.model';
import { CustomerContractHistory, CustomerContractHistorySchema } from './models/customer-contract-history.model';
import { CustomerOperationLog, CustomerOperationLogSchema } from '../customers/models/customer-operation-log.model';
import { ESignModule } from '../esign/esign.module';
import { TestController } from './test.controller';
import { ResumeModule } from '../resume/resume.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: CustomerContractHistory.name, schema: CustomerContractHistorySchema },
      { name: CustomerOperationLog.name, schema: CustomerOperationLogSchema },
    ]),
    ESignModule,
    forwardRef(() => ResumeModule),
  ],
  controllers: [ContractsController, TestController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}