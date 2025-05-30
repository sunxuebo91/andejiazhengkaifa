import { IsString, IsEmail, IsOptional, IsEnum, IsArray, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'john_doe' })
  @IsString()
  @MinLength(3, { message: '用户名长度不能小于3个字符' })
  username: string;

  @ApiProperty({ description: '密码', example: 'password123' })
  @IsString()
  @MinLength(6, { message: '密码长度不能小于6个字符' })
  password: string;

  @ApiProperty({ description: '姓名', example: '张三' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '邮箱', example: 'john@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsString()
  @IsOptional()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiProperty({ description: '角色', enum: ['admin', 'manager', 'employee'], example: 'employee' })
  @IsEnum(['admin', 'manager', 'employee'], { message: '角色必须是admin、manager或employee' })
  role: string;

  @ApiPropertyOptional({ description: '权限列表', type: [String], example: ['resume:view', 'resume:create'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({ description: '是否激活', example: true })
  @IsOptional()
  active?: boolean;
} 