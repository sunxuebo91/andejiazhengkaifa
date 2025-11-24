import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from './notification.service';

/**
 * WebSocket 网关 - 实时通知推送
 */
@WebSocketGateway({
  cors: {
    origin: '*', // 生产环境需要配置具体域名
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSocketMap = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 客户端连接
   */
  async handleConnection(client: Socket) {
    try {
      // 从握手中获取token
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`客户端连接失败: 缺少token, socketId: ${client.id}`);
        client.disconnect();
        return;
      }

      // 验证token
      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.userId; // sub是JWT标准字段

      if (!userId) {
        this.logger.warn(`客户端连接失败: token无效, socketId: ${client.id}`);
        client.disconnect();
        return;
      }

      // 保存用户socket映射
      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }
      this.userSocketMap.get(userId)!.add(client.id);

      // 将socket加入用户房间
      client.join(`user:${userId}`);
      
      // 保存userId到socket数据中
      (client as any).userId = userId;

      this.logger.log(`用户 ${userId} 连接成功, socketId: ${client.id}`);

      // 发送未读数量
      const unreadCount = await this.notificationService.getUnreadCount(userId);
      client.emit('unreadCount', unreadCount);

    } catch (error) {
      this.logger.error(`客户端连接失败: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  /**
   * 客户端断开连接
   */
  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    
    if (userId) {
      const sockets = this.userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSocketMap.delete(userId);
        }
      }
      this.logger.log(`用户 ${userId} 断开连接, socketId: ${client.id}`);
    }
  }

  /**
   * 推送通知给指定用户
   */
  async sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`推送通知给用户 ${userId}: ${notification.title}`);
  }

  /**
   * 推送未读数量给指定用户
   */
  async sendUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('unreadCount', count);
  }

  /**
   * 批量推送通知
   */
  async sendToUsers(userIds: string[], notification: any) {
    for (const userId of userIds) {
      await this.sendToUser(userId, notification);
    }
  }

  /**
   * 广播通知给所有在线用户
   */
  async broadcast(notification: any) {
    this.server.emit('notification', notification);
    this.logger.log(`广播通知: ${notification.title}`);
  }

  /**
   * 客户端订阅消息 - 请求未读数量
   */
  @SubscribeMessage('getUnreadCount')
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    const userId = (client as any).userId;
    if (userId) {
      const count = await this.notificationService.getUnreadCount(userId);
      client.emit('unreadCount', count);
    }
  }

  /**
   * 获取在线用户数量
   */
  getOnlineUserCount(): number {
    return this.userSocketMap.size;
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }
}

