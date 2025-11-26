import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer, CustomerSchema } from './models/customer.model';
import { CustomerFollowUp, CustomerFollowUpSchema } from './models/customer-follow-up.entity';
import { User, UserSchema } from '../users/models/user.entity';
import { CustomerAssignmentLog, CustomerAssignmentLogSchema } from './models/customer-assignment-log.model';
import { PublicPoolLog, PublicPoolLogSchema } from './models/public-pool-log.model';
import { LeadTransferRule, LeadTransferRuleSchema } from './models/lead-transfer-rule.model';
import { LeadTransferRecord, LeadTransferRecordSchema } from './models/lead-transfer-record.model';
import { WeChatModule } from '../wechat/wechat.module';
import { WeixinModule } from '../weixin/weixin.module';
import { UsersModule } from '../users/users.module';
import { NotificationModule } from '../notification/notification.module';
import { LeadTransferController } from './controllers/lead-transfer.controller';
import { LeadTransferRuleService } from './services/lead-transfer-rule.service';
import { LeadAutoTransferService } from './services/lead-auto-transfer.service';
import { LeadTransferRecordService } from './services/lead-transfer-record.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerAssignmentLog.name, schema: CustomerAssignmentLogSchema },
      { name: PublicPoolLog.name, schema: PublicPoolLogSchema },
      { name: CustomerFollowUp.name, schema: CustomerFollowUpSchema },
      { name: User.name, schema: UserSchema },
      { name: LeadTransferRule.name, schema: LeadTransferRuleSchema },
      { name: LeadTransferRecord.name, schema: LeadTransferRecordSchema },
    ]),
    WeChatModule,
    WeixinModule,
    UsersModule,
    NotificationModule,
  ],
  controllers: [CustomersController, LeadTransferController],
  providers: [
    CustomersService,
    LeadTransferRuleService,
    LeadAutoTransferService,
    LeadTransferRecordService,
  ],
  exports: [CustomersService],
})
export class CustomersModule {}