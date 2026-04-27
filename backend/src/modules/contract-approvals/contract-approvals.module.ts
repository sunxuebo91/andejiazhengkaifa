import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractApprovalsController } from './contract-approvals.controller';
import { ContractApprovalsService } from './contract-approvals.service';
import { ContractDeletionApproval, ContractDeletionApprovalSchema } from './models/contract-deletion-approval.model';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContractDeletionApproval.name, schema: ContractDeletionApprovalSchema },
    ]),
    NotificationModule,
  ],
  controllers: [ContractApprovalsController],
  providers: [ContractApprovalsService],
  exports: [ContractApprovalsService],
})
export class ContractApprovalsModule {}

