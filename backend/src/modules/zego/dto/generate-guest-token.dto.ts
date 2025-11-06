import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';

export class GenerateGuestTokenDto {
  @IsString()
  @IsNotEmpty()
  userId: string; // 前端生成的访客 ID

  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsIn(['customer', 'helper'])
  role: 'customer' | 'helper';

  @IsNumber()
  @IsOptional()
  expireTime?: number;
}

