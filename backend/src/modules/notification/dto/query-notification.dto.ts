import { IsOptional, IsEnum, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../models/notification-template.model';
import { NotificationStatus } from '../models/notification.model';

/**
 * 查询通知DTO
 */
export class QueryNotificationDto {
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

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsString()
  startDate?: string; // 开始日期

  @IsOptional()
  @IsString()
  endDate?: string; // 结束日期
}

/**
 * 标记已读DTO
 */
export class MarkReadDto {
  @IsString({ each: true })
  notificationIds: string[]; // 通知ID列表
}

