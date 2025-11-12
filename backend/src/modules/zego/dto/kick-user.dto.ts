import { IsString, IsNotEmpty } from 'class-validator';

export class KickUserDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

