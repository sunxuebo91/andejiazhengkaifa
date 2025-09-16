import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetOpenidDto {
  @ApiProperty({ description: '微信登录code', example: 'wx_code_123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
