import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class RemoteControlDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  hostUserId: string;

  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @IsString()
  @IsNotEmpty()
  controlType: 'camera' | 'microphone';

  @IsBoolean()
  enabled: boolean;
}

