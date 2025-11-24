import api from './api';
import {
  NotificationQueryDto,
  NotificationListResponse,
  MarkReadDto,
} from '../types/notification.types';

/**
 * 通知服务
 */
class NotificationService {
  /**
   * 获取通知列表
   */
  async getNotifications(params: NotificationQueryDto = {}): Promise<NotificationListResponse> {
    const response = await api.get('/notifications', { params });
    return response.data.data;
  }

  /**
   * 获取未读数量
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count');
    return response.data.data.count;
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationIds: string[]): Promise<number> {
    const response = await api.put('/notifications/mark-read', {
      notificationIds,
    } as MarkReadDto);
    return response.data.data.count;
  }

  /**
   * 标记全部为已读
   */
  async markAllAsRead(): Promise<number> {
    const response = await api.put('/notifications/mark-all-read');
    return response.data.data.count;
  }
}

export default new NotificationService();

