/**
 * 通知类型枚举
 */
export enum NotificationType {
  // 简历相关
  RESUME_CREATED = 'RESUME_CREATED',
  RESUME_ASSIGNED = 'RESUME_ASSIGNED',
  RESUME_STATUS_CHANGED = 'RESUME_STATUS_CHANGED',
  RESUME_ORDER_STATUS_CHANGED = 'RESUME_ORDER_STATUS_CHANGED',
  RESUME_FOLLOW_UP_DUE = 'RESUME_FOLLOW_UP_DUE',

  // 客户相关
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_ASSIGNED = 'CUSTOMER_ASSIGNED',
  CUSTOMER_TRANSFERRED = 'CUSTOMER_TRANSFERRED',
  CUSTOMER_RECLAIMED = 'CUSTOMER_RECLAIMED',
  CUSTOMER_ASSIGNED_FROM_POOL = 'CUSTOMER_ASSIGNED_FROM_POOL',
  CUSTOMER_STATUS_CHANGED = 'CUSTOMER_STATUS_CHANGED',
  CUSTOMER_FOLLOW_UP_DUE = 'CUSTOMER_FOLLOW_UP_DUE',

  // 合同相关
  CONTRACT_CREATED = 'CONTRACT_CREATED',
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',
  CONTRACT_WORKER_CHANGED = 'CONTRACT_WORKER_CHANGED',
  CONTRACT_EXPIRING_SOON = 'CONTRACT_EXPIRING_SOON',
  CONTRACT_STATUS_CHANGED = 'CONTRACT_STATUS_CHANGED',

  // 日报相关
  DAILY_REPORT_PERSONAL = 'DAILY_REPORT_PERSONAL',
  DAILY_REPORT_TEAM = 'DAILY_REPORT_TEAM',
  WEEKLY_REPORT = 'WEEKLY_REPORT',
  MONTHLY_REPORT = 'MONTHLY_REPORT',

  // 系统相关
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  ACCOUNT_SECURITY = 'ACCOUNT_SECURITY',
}

/**
 * 通知优先级
 */
export enum NotificationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * 通知状态
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  READ = 'READ',
  FAILED = 'FAILED',
}

/**
 * 通知对象
 */
export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  data?: Record<string, any>;
  icon?: string;
  color?: string;
  actionUrl?: string;
  actionText?: string;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 通知查询参数
 */
export interface NotificationQueryDto {
  page?: number;
  pageSize?: number;
  type?: NotificationType;
  status?: NotificationStatus;
  startDate?: string;
  endDate?: string;
}

/**
 * 通知列表响应
 */
export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 标记已读DTO
 */
export interface MarkReadDto {
  notificationIds: string[];
}

