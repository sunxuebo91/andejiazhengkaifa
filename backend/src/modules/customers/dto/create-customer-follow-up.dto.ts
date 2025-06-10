import { IsEnum, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CustomerFollowUpType } from '../models/customer-follow-up.entity';

export class CreateCustomerFollowUpDto {
  @ApiProperty({ 
    description: '跟进方式', 
    enum: CustomerFollowUpType,
    example: CustomerFollowUpType.PHONE 
  })
  @IsEnum(CustomerFollowUpType, { message: '跟进方式必须是有效值' })
  @IsNotEmpty({ message: '跟进方式不能为空' })
  type: CustomerFollowUpType;

  @ApiProperty({ 
    description: '跟进内容', 
    example: '电话联系客户了解需求，客户表示对月嫂服务感兴趣，预算在8000-10000元之间' 
  })
  @IsString({ message: '跟进内容必须是字符串' })
  @IsNotEmpty({ message: '跟进内容不能为空' })
  @MaxLength(1000, { message: '跟进内容不能超过1000个字符' })
  content: string;
} 