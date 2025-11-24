import { IsString, IsEnum, IsOptional, IsObject, IsArray } from 'class-validator';
import { NotificationType, NotificationPriority } from '../models/notification-template.model';

/**
 * 创建通知DTO
 */
export class CreateNotificationDto {
  @IsString({ each: true })
  @IsArray()
  userIds: string[]; // 接收用户ID列表

  @IsEnum(NotificationType)
  type: NotificationType; // 通知类型

  @IsObject()
  data: Record<string, any>; // 模板变量数据

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority; // 优先级

  @IsString()
  @IsOptional()
  createdBy?: string; // 创建人ID（系统通知时使用）
}

/**
 * 发送通知DTO（简化版，用于业务代码调用）
 */
export class SendNotificationDto {
  @IsString({ each: true })
  @IsArray()
  userIds: string[]; // 接收用户ID列表

  @IsEnum(NotificationType)
  type: NotificationType; // 通知类型

  @IsObject()
  data: Record<string, any>; // 数据

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;
}

