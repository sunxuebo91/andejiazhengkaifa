import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuntBlacklistController } from './aunt-blacklist.controller';
import { AuntBlacklistService } from './aunt-blacklist.service';
import { AuntBlacklist, AuntBlacklistSchema } from './models/aunt-blacklist.model';
import { Contract, ContractSchema } from '../contracts/models/contract.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuntBlacklist.name, schema: AuntBlacklistSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
  ],
  controllers: [AuntBlacklistController],
  providers: [AuntBlacklistService],
  exports: [AuntBlacklistService],
})
export class AuntBlacklistModule {}
