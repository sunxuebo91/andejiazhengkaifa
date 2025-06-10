import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer, CustomerSchema } from './models/customer.model';
import { CustomerFollowUp, CustomerFollowUpSchema } from './models/customer-follow-up.entity';
import { User, UserSchema } from '../users/models/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerFollowUp.name, schema: CustomerFollowUpSchema },
      { name: 'User', schema: UserSchema }
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {} 