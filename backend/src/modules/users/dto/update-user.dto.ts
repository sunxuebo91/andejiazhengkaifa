import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: '新密码', example: 'newpassword123' })
  @IsString()
  @MinLength(6, { message: '密码长度不能小于6个字符' })
  @IsOptional()
  password?: string;
} 