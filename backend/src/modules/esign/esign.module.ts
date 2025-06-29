import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ESignController } from './esign.controller';
import { ESignService } from './esign.service';
import { Contract, ContractSchema } from '../contracts/models/contract.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema }
    ])
  ],
  controllers: [ESignController],
  providers: [ESignService],
  exports: [ESignService],
})
export class ESignModule {} 