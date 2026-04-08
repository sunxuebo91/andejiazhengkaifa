import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 查询小程序通知列表 DTO
 */
export class QueryMiniProgramNotificationDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number = 20;
}

/**
 * 标记已读 DTO（单条 / 全部已读共用 phone 校验）
 */
export class MarkReadDto {
  @IsString()
  phone: string;
}
