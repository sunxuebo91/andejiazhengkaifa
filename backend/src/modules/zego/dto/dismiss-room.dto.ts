import { IsString, IsNotEmpty } from 'class-validator';

export class DismissRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

