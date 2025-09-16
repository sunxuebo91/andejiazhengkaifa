import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdvisorSubscribeDto {
  @ApiProperty({ description: '顾问ID', example: 'advisor_123' })
  @IsString()
  @IsNotEmpty()
  advisorId: string;

  @ApiProperty({ description: '微信用户openid', example: 'wx_openid_123456' })
  @IsString()
  @IsNotEmpty()
  openid: string;

  @ApiProperty({ description: '订阅消息模板ID', example: 'template_123' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: '是否订阅', example: true })
  @IsBoolean()
  subscribed: boolean;

  @ApiProperty({ description: '订阅时的额外数据', required: false })
  @IsOptional()
  @IsObject()
  subscribeData?: any;
}
