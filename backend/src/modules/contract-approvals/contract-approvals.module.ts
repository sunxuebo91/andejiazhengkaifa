import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractApprovalsController } from './contract-approvals.controller';
import { ContractApprovalsService } from './contract-approvals.service';
import { ContractDeletionApproval, ContractDeletionApprovalSchema } from './models/contract-deletion-approval.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContractDeletionApproval.name, schema: ContractDeletionApprovalSchema },
    ]),
  ],
  controllers: [ContractApprovalsController],
  providers: [ContractApprovalsService],
  exports: [ContractApprovalsService],
})
export class ContractApprovalsModule {}

