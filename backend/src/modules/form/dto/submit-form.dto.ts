import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsEnum } from 'class-validator';

/**
 * 提交表单DTO
 */
export class SubmitFormDto {
  @ApiProperty({ description: '表单数据（JSON格式）', example: { name: '张三', phone: '13800138000' } })
  @IsObject()
  data: Record<string, any>;

  @ApiProperty({ description: '设备指纹', required: false })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiProperty({ description: '微信OpenID', required: false })
  @IsOptional()
  @IsString()
  wechatOpenId?: string;

  @ApiProperty({ description: '微信UnionID', required: false })
  @IsOptional()
  @IsString()
  wechatUnionId?: string;

  @ApiProperty({ description: '提交来源', enum: ['h5', 'miniprogram', 'web'], default: 'h5' })
  @IsOptional()
  @IsEnum(['h5', 'miniprogram', 'web'])
  source?: string;

  @ApiProperty({ description: '分享令牌（用于追踪用户归属）', required: false })
  @IsOptional()
  @IsString()
  token?: string;
}

