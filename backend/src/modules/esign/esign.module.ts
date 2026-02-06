import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ESignController } from './esign.controller';
import { ESignService } from './esign.service';
import { Contract, ContractSchema } from '../contracts/models/contract.model';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema }
    ]),
    forwardRef(() => ContractsModule), // 使用 forwardRef 避免循环依赖
  ],
  controllers: [ESignController],
  providers: [ESignService],
  exports: [ESignService],
})
export class ESignModule {}