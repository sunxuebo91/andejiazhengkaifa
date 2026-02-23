import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { DashubaoController } from './dashubao.controller';
import { DashubaoMiniprogramController } from './dashubao-miniprogram.controller';
import { DashubaoService } from './dashubao.service';
import { InsurancePolicy, InsurancePolicySchema } from './models/insurance-policy.model';
import { InsuranceSyncLog, InsuranceSyncLogSchema } from './models/insurance-sync-log.model';
import { Contract, ContractSchema } from '../contracts/models/contract.model';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: InsurancePolicy.name, schema: InsurancePolicySchema },
      { name: InsuranceSyncLog.name, schema: InsuranceSyncLogSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
  ],
  controllers: [DashubaoController, DashubaoMiniprogramController],
  providers: [DashubaoService],
  exports: [DashubaoService],
})
export class DashubaoModule {}

