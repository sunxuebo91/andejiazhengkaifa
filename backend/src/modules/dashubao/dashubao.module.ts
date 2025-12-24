import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { DashubaoController } from './dashubao.controller';
import { DashubaoService } from './dashubao.service';
import { InsurancePolicy, InsurancePolicySchema } from './models/insurance-policy.model';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: InsurancePolicy.name, schema: InsurancePolicySchema },
    ]),
  ],
  controllers: [DashubaoController],
  providers: [DashubaoService],
  exports: [DashubaoService],
})
export class DashubaoModule {}

