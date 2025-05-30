import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: '角色名称', example: '经理' })
  @IsString()
  name: string;

  @ApiProperty({ description: '角色描述', example: '可以管理团队和阿姨资源' })
  @IsString()
  description: string;

  @ApiProperty({ 
    description: '权限列表', 
    type: [String], 
    example: ['resume:all', 'user:view'] 
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({ description: '是否激活', example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
} 