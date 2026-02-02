import { IsString, IsOptional, IsPhoneNumber, IsNumber, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterMiniProgramUserDto {
  @ApiProperty({ description: '微信openid（必填）', example: 'oXXXX-xxxxxxxxxxxxx' })
  @IsString()
  openid: string;

  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @IsPhoneNumber('CN', { message: '请输入有效的中国大陆手机号' })
  phone: string;

  @ApiPropertyOptional({ description: '账号（用户自定义账号）', example: 'user123' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: '密码（明文，后端会自动加密）', example: 'password123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: '昵称', example: '微信用户' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: '头像URL（微信头像或图片URL）' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: '头像文件路径（用户上传的图片文件）' })
  @IsOptional()
  @IsString()
  avatarFile?: string;

  @ApiPropertyOptional({ description: '微信unionid' })
  @IsOptional()
  @IsString()
  unionid?: string;

  @ApiPropertyOptional({ description: '性别：0-未知, 1-男, 2-女', example: 0 })
  @IsOptional()
  @IsNumber()
  @IsIn([0, 1, 2])
  gender?: number;

  @ApiPropertyOptional({ description: '城市', example: '北京' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '省份', example: '北京' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: '国家', example: '中国' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: '语言', example: 'zh_CN' })
  @IsOptional()
  @IsString()
  language?: string;
}

