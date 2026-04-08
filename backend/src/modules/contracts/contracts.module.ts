import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractsController } from './contracts.controller';
import { ContractsMiniProgramController } from './contracts-miniprogram.controller';
import { ContractsCustomerController } from './contracts-customer.controller';
import { ContractsQueryService } from './contracts-query.service';
import { ContractsService } from './contracts.service';
import { Contract, ContractSchema } from './models/contract.model';
import { CustomerContractHistory, CustomerContractHistorySchema } from './models/customer-contract-history.model';
import { CustomerOperationLog, CustomerOperationLogSchema } from '../customers/models/customer-operation-log.model';
import { Customer, CustomerSchema } from '../customers/models/customer.model';
import { Resume, ResumeSchema } from '../resume/models/resume.entity';
import { User, UserSchema } from '../users/models/user.entity';
import { ESignModule } from '../esign/esign.module';
import { ResumeModule } from '../resume/resume.module';
import { ContractApprovalsModule } from '../contract-approvals/contract-approvals.module';
import { DashubaoModule } from '../dashubao/dashubao.module';
import { BackgroundCheck, BackgroundCheckSchema } from '../zmdb/models/background-check.model';
import { InsurancePolicy, InsurancePolicySchema } from '../dashubao/models/insurance-policy.model';
import { MiniProgramNotificationModule } from '../miniprogram-notification/miniprogram-notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: CustomerContractHistory.name, schema: CustomerContractHistorySchema },
      { name: CustomerOperationLog.name, schema: CustomerOperationLogSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: User.name, schema: UserSchema },
      { name: BackgroundCheck.name, schema: BackgroundCheckSchema },
      { name: InsurancePolicy.name, schema: InsurancePolicySchema },
    ]),
    ESignModule,
    forwardRef(() => ResumeModule),
    ContractApprovalsModule,
    DashubaoModule,
    MiniProgramNotificationModule,
  ],
  controllers: [ContractsController, ContractsMiniProgramController, ContractsCustomerController],
  providers: [ContractsService, ContractsQueryService],
  exports: [ContractsService],
})
export class ContractsModule {}
