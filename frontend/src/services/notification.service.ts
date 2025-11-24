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
    try {
      const response = await api.get('/api/notifications', { params });
      console.log('API响应 (getNotifications):', response);
      // api拦截器已经返回了response.data，所以这里直接访问data
      if (response && response.data) {
        return response.data;
      }
      console.error('响应格式异常:', response);
      return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
    } catch (error) {
      console.error('获取通知列表失败:', error);
      return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
    }
  }

  /**
   * 获取未读数量
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get('/api/notifications/unread-count');
    // api拦截器已经返回了response.data，所以这里直接访问data
    return response.data?.count || 0;
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationIds: string[]): Promise<number> {
    const response = await api.put('/api/notifications/mark-read', {
      notificationIds,
    } as MarkReadDto);
    // api拦截器已经返回了response.data，所以这里直接访问data
    return response.data?.count || 0;
  }

  /**
   * 标记全部为已读
   */
  async markAllAsRead(): Promise<number> {
    const response = await api.put('/api/notifications/mark-all-read');
    // api拦截器已经返回了response.data，所以这里直接访问data
    return response.data?.count || 0;
  }
}

export default new NotificationService();

