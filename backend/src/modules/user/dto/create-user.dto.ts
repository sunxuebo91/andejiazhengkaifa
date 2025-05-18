import { IsNotEmpty, IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../models/user.entity';

export class CreateUserDto {
  @ApiProperty({
    example: 'johndoe',
    description: '用户名，必须唯一',
  })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString({ message: '用户名必须是字符串' })
  username: string;

  @ApiProperty({
    example: 'P@ssw0rd',
    description: '密码，至少8个字符',
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码长度不能少于8个字符' })
  password: string;

  @ApiProperty({
    example: '张三',
    description: '用户姓名',
  })
  @IsNotEmpty({ message: '姓名不能为空' })
  @IsString({ message: '姓名必须是字符串' })
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: '电子邮箱',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: '无效的电子邮箱格式' })
  email?: string;

  @ApiProperty({
    example: '13800138000',
    description: '手机号码',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  phone?: string;

  @ApiProperty({
    enum: UserRole,
    description: '用户角色',
    default: UserRole.OPERATOR,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: '无效的用户角色' })
  role?: UserRole;
} 