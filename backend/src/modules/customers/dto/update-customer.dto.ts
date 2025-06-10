import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsOptional()
  @IsEnum(['已签约', '匹配中', '流失客户', '已退款', '退款中', '待定'], {
    message: '签约状态必须是：已签约、匹配中、流失客户、已退款、退款中、待定之一'
  })
  contractStatus?: string;
} 