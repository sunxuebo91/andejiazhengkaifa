import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: '接收者openid', example: 'wx_openid_123456' })
  @IsString()
  @IsNotEmpty()
  touser: string;

  @ApiProperty({ description: '订阅消息模板ID', example: 'template_123' })
  @IsString()
  @IsNotEmpty()
  template_id: string;

  @ApiProperty({ description: '模板数据', example: { 
    thing1: { value: '客户张三查看了您的简历' },
    time2: { value: '2024-01-01 12:00:00' }
  }})
  @IsObject()
  @IsNotEmpty()
  data: any;

  @ApiProperty({ description: '跳转页面路径', required: false })
  @IsString()
  page?: string;

  @ApiProperty({ description: '跳转小程序类型', required: false })
  @IsString()
  miniprogram_state?: string;
}
