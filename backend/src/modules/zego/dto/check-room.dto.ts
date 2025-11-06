import { IsString, IsNotEmpty } from 'class-validator';

export class CheckRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

