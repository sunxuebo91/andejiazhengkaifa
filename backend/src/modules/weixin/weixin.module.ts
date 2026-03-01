import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { WeixinController } from './weixin.controller';
import { WeixinService } from './weixin.service';
import { CustomerLeadService } from './services/customer-lead.service';
import { WechatCloudService } from './services/wechat-cloud.service';
import { ContractSignNotificationService } from './services/contract-sign-notification.service';
import { AdvisorSubscribe, AdvisorSubscribeSchema } from './models/advisor-subscribe.entity';
import { CustomerAction, CustomerActionSchema } from './models/customer-action.entity';
import { Customer, CustomerSchema } from '../customers/models/customer.model';
import { User, UserSchema } from '../users/models/user.entity';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: AdvisorSubscribe.name, schema: AdvisorSubscribeSchema },
      { name: CustomerAction.name, schema: CustomerActionSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [WeixinController],
  providers: [WeixinService, CustomerLeadService, WechatCloudService, ContractSignNotificationService],
  exports: [WeixinService, CustomerLeadService, WechatCloudService, ContractSignNotificationService],
})
export class WeixinModule {}
