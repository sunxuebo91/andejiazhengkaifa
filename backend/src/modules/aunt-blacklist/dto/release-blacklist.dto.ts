import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ReleaseBlacklistDto {
  @ApiProperty({ description: '释放原因（必填）' })
  @IsString()
  @MinLength(2)
  releaseReason: string;
}
