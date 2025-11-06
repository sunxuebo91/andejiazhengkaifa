import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class GenerateTokenDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsOptional()
  @IsNumber()
  @Min(60)
  expireTime?: number;
}

