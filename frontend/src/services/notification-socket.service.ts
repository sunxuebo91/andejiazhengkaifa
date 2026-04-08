import { io, Socket } from 'socket.io-client';
import { Notification } from '../types/notification.types';

/**
 * WebSocket 通知服务
 */
class NotificationSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * 连接到通知服务器
   */
  connect(token: string) {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    // 生产环境使用当前域名，开发环境使用 localhost:3000
    const socketURL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `${window.location.protocol}//${window.location.host}`
      : 'http://localhost:3000';

    this.socket = io(`${socketURL}/notifications`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // 监听通知事件
    this.socket.on('notification', (notification: Notification) => {
      console.log('📬 New notification:', notification);
      this.emit('notification', notification);
    });

    // 监听未读数量更新
    this.socket.on('unreadCount', (count: number) => {
      console.log('🔔 Unread count updated:', count);
      this.emit('unreadCount', count);
    });

    // 监听刷新事件
    this.socket.on('refresh', (data: { eventType: string; data?: any; timestamp: number }) => {
      console.log('🔄 Refresh event received:', data);
      this.emit('refresh', data);
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('WebSocket disconnected');
    }
  }

  /**
   * 请求未读数量
   */
  requestUnreadCount() {
    if (this.socket?.connected) {
      this.socket.emit('getUnreadCount');
    }
  }

  /**
   * 订阅事件
   */
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * 取消订阅
   */
  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default new NotificationSocketService();

