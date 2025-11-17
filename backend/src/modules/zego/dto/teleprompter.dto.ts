import { IsString, IsArray, IsNumber, IsEnum, IsOptional, IsBoolean } from 'class-validator';
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
}

export class ControlTeleprompterDto {
  @ApiProperty({ description: '房间ID' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: '目标用户ID列表', type: [String] })
  @IsArray()
  targetUserIds: string[];

  @ApiProperty({ description: '控制动作', enum: ['PLAY', 'PAUSE', 'STOP', 'SHOW', 'HIDE'] })
  @IsEnum(['PLAY', 'PAUSE', 'STOP', 'SHOW', 'HIDE'])
  action: 'PLAY' | 'PAUSE' | 'STOP' | 'SHOW' | 'HIDE';
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

// 新增：一键推送并开启提词器DTO
export class QuickStartTeleprompterDto {
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

  @ApiProperty({ description: '是否自动播放', default: true })
  @IsBoolean()
  @IsOptional()
  autoPlay?: boolean;
}

