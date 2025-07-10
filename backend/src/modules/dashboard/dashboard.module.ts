import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Customer, CustomerSchema } from '../customers/models/customer.model';
import { Contract, ContractSchema } from '../contracts/models/contract.model';
import { Resume, ResumeSchema } from '../resume/models/resume.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Resume.name, schema: ResumeSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {} 