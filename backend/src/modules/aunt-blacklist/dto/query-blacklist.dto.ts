import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BlacklistStatus } from '../models/aunt-blacklist.model';

export class QueryBlacklistDto {
  @ApiPropertyOptional({ description: '关键词：姓名/手机号/身份证号模糊匹配' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '状态过滤', enum: ['active', 'released'] })
  @IsOptional()
  @IsEnum(['active', 'released'])
  status?: BlacklistStatus;

  @ApiPropertyOptional({ description: '页码（从 1 开始）' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: '每页条数' })
  @IsOptional()
  @IsString()
  pageSize?: string;
}

export class CheckBlacklistDto {
  @ApiPropertyOptional({ description: '手机号' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '身份证号' })
  @IsOptional()
  @IsString()
  idCard?: string;
}
