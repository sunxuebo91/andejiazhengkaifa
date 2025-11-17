import { IsString, IsNotEmpty } from 'class-validator';

export class KickUserDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  hostUserId: string; // 主持人在 ZEGO 中的 userId（user_xxx 格式）
}

