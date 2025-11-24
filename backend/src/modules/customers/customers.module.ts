import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer, CustomerSchema } from './models/customer.model';
import { CustomerFollowUp, CustomerFollowUpSchema } from './models/customer-follow-up.entity';
import { User, UserSchema } from '../users/models/user.entity';
import { CustomerAssignmentLog, CustomerAssignmentLogSchema } from './models/customer-assignment-log.model';
import { PublicPoolLog, PublicPoolLogSchema } from './models/public-pool-log.model';
import { WeChatModule } from '../wechat/wechat.module';
import { WeixinModule } from '../weixin/weixin.module';
import { UsersModule } from '../users/users.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerAssignmentLog.name, schema: CustomerAssignmentLogSchema },
      { name: PublicPoolLog.name, schema: PublicPoolLogSchema },
      { name: CustomerFollowUp.name, schema: CustomerFollowUpSchema },
      { name: User.name, schema: UserSchema }
    ]),
    WeChatModule,
    WeixinModule,
    UsersModule,
    NotificationModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}