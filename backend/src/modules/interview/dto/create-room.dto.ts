import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  roomName: string;

  @IsString()
  @IsNotEmpty()
  hostName: string;

  @IsString()
  @IsNotEmpty()
  hostZegoUserId: string;

  @IsOptional()
  @IsEnum(['pc', 'miniprogram'])
  source?: 'pc' | 'miniprogram';

  @IsOptional()
  @IsString()
  hostUrl?: string; // 主持人重新进入的URL（带token）
}

