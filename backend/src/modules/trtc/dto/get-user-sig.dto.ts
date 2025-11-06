import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetUserSigDto {
  @ApiProperty({ description: '用户ID', example: 'user_123' })
  @IsString()
  userId: string;

  @ApiProperty({ description: '过期时间（秒），默认7天', example: 604800, required: false })
  @IsOptional()
  @IsNumber()
  @Min(60)
  expire?: number;
}

