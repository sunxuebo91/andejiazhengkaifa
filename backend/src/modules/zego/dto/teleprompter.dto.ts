import { IsString, IsArray, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PushTeleprompterDto {
  @ApiProperty({ description: '房间ID' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: '提词内容' })
  @IsString()
  content: string;

  @ApiProperty({ description: '目标用户ID列表', type: [String] })
  @IsArray()
  targetUserIds: string[];

  @ApiProperty({ description: '滚动速度(像素/秒)', example: 50 })
  @IsNumber()
  scrollSpeed: number;

  @ApiProperty({ description: '显示高度', example: '50vh' })
  @IsString()
  displayHeight: string;
}

export class ControlTeleprompterDto {
  @ApiProperty({ description: '房间ID' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: '目标用户ID列表', type: [String] })
  @IsArray()
  targetUserIds: string[];

  @ApiProperty({ description: '控制动作', enum: ['PLAY', 'PAUSE', 'STOP'] })
  @IsEnum(['PLAY', 'PAUSE', 'STOP'])
  action: 'PLAY' | 'PAUSE' | 'STOP';
}

export class GetTeleprompterDto {
  @ApiProperty({ description: '房间ID' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: '用户ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: '最后接收的消息时间戳', required: false })
  @IsOptional()
  @IsNumber()
  lastTimestamp?: number;
}

