import { IsString, IsNotEmpty } from 'class-validator';

export class EndRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

