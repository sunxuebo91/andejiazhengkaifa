import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
const { generateToken04 } = require('./server/zegoServerAssistant');

// 房间状态接口
interface RoomState {
  roomId: string;
  hostUserId: string;
  createdAt: number;
  lastActivityAt: number;
  isDismissed: boolean;
  participants: Set<string>;
}

// 提词器消息接口
interface TeleprompterMessage {
  type: 'CONTENT' | 'CONTROL';
  content?: string;
  scrollSpeed?: number;
  displayHeight?: string;
  action?: 'PLAY' | 'PAUSE' | 'STOP';
  targetUserIds: string[];
  timestamp: number;
}

@Injectable()
export class ZegoService {
  private readonly logger = new Logger(ZegoService.name);
  private readonly appId: number;
  private readonly serverSecret: string;

  // 房间状态管理
  private rooms: Map<string, RoomState> = new Map();
  private readonly ROOM_TIMEOUT = 10 * 60 * 1000; // 10分钟无人自动关闭
  private cleanupInterval: NodeJS.Timeout;

  // 提词器消息队列 (roomId -> messages[])
  private teleprompterMessages: Map<string, TeleprompterMessage[]> = new Map();

  constructor(private configService: ConfigService) {
    this.appId = parseInt(this.configService.get<string>('ZEGO_APP_ID') || '0');
    this.serverSecret = this.configService.get<string>('ZEGO_SERVER_SECRET') || '';

    // 启动定时清理任务
    this.startCleanupTask();
  }

  /**
   * 生成 ZEGO Base Token (Token04)
   * 使用官方 ZEGO Token 生成代码
   * 注意：对于 UIKit，payload 应该为空字符串
   * @param userId 用户ID
   * @param roomId 房间ID (可选，但不用于 payload)
   * @param userName 用户名称 (可选)
   * @param expireTime 过期时间（秒），默认7200秒（2小时）
   */
  generateKitToken(
    userId: string,
    roomId?: string,
    userName?: string,
    expireTime: number = 7200,
  ): string {
    if (!this.appId || !this.serverSecret) {
      throw new Error('ZEGO configuration is missing');
    }

    // 对于 UIKit，payload 必须为空字符串
    // 房间权限控制由前端的 generateKitTokenForProduction 处理
    const payload = '';

    // 使用官方代码生成 Token
    const token = generateToken04(
      this.appId,
      userId,
      this.serverSecret,
      expireTime,
      payload,
    );

    return token;
  }

  /**
   * 获取 ZEGO 配置信息
   */
  getConfig() {
    return {
      appId: this.appId,
      // 注意：不要返回 serverSecret 到前端
    };
  }

  /**
   * 创建房间
   */
  createRoom(roomId: string, hostUserId: string): void {
    const now = Date.now();
    const roomState = {
      roomId,
      hostUserId,
      createdAt: now,
      lastActivityAt: now,
      isDismissed: false,
      participants: new Set([hostUserId]),
    };
    this.rooms.set(roomId, roomState);
    this.logger.log(`✅ 房间已创建: ${roomId}, 主持人: ${hostUserId}, 当前房间总数: ${this.rooms.size}`);
    this.logger.debug(`房间详情: ${JSON.stringify({ roomId, hostUserId, participantsCount: roomState.participants.size })}`);
  }

  /**
   * 用户加入房间
   */
  joinRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);

    // 如果房间不存在，不允许加入（只有主持人可以创建房间）
    if (!room) {
      this.logger.warn(`❌ 用户 ${userId} 尝试加入不存在的房间: ${roomId}`);
      return false;
    }

    // 检查房间是否已解散
    if (room.isDismissed) {
      this.logger.warn(`❌ 用户 ${userId} 尝试加入已解散的房间: ${roomId}`);
      return false;
    }

    // 添加参与者并更新活动时间
    room.participants.add(userId);
    room.lastActivityAt = Date.now();
    this.logger.log(`✅ 用户 ${userId} 加入房间: ${roomId}, 当前人数: ${room.participants.size}`);
    return true;
  }

  /**
   * 用户离开房间
   */
  leaveRoom(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.delete(userId);
    room.lastActivityAt = Date.now();
    this.logger.log(`用户 ${userId} 离开房间: ${roomId}, 剩余人数: ${room.participants.size}`);

    // 如果房间没人了，标记最后活动时间（10分钟后自动清理）
    if (room.participants.size === 0) {
      this.logger.log(`房间 ${roomId} 已无人，将在10分钟后自动关闭`);
    }
  }

  /**
   * 调用 ZEGO 服务端 API CloseRoom 强制关闭房间
   */
  async callZegoCloseRoom(roomId: string): Promise<boolean> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = Math.floor(Math.random() * 1000000);

      // 构建签名参数
      const params = {
        AppId: this.appId.toString(),
        RoomId: roomId,
        SignatureNonce: nonce.toString(),
        SignatureVersion: '2.0',
        Timestamp: timestamp.toString(),
      };

      // 按字母顺序排序参数
      const sortedKeys = Object.keys(params).sort();
      const signString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');

      // 生成签名
      const signature = crypto
        .createHmac('sha256', this.serverSecret)
        .update(signString)
        .digest('hex');

      // 调用 ZEGO API
      const url = `https://rtc-api.zego.im/?Action=CloseRoom&${signString}&Signature=${signature}`;

      this.logger.log(`📞 调用 ZEGO CloseRoom API: ${roomId}`);

      const response = await axios.get(url, {
        timeout: 10000,
      });

      this.logger.log(`📞 ZEGO API 响应:`, response.data);

      if (response.data.Code === 0) {
        this.logger.log(`✅ ZEGO 服务端已关闭房间: ${roomId}`);
        return true;
      } else {
        this.logger.error(`❌ ZEGO API 返回错误: ${response.data.Message}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ 调用 ZEGO CloseRoom API 失败:`, error.message);
      return false;
    }
  }

  /**
   * 解散房间（主持人权限）- 强制踢出所有用户
   */
  async dismissRoom(roomId: string, userId: string): Promise<boolean> {
    this.logger.log(`🔴 尝试解散房间: ${roomId}, 请求用户: ${userId}`);
    this.logger.log(`📊 当前所有房间: ${Array.from(this.rooms.keys()).join(', ')}`);

    const room = this.rooms.get(roomId);

    if (!room) {
      this.logger.warn(`❌ 房间不存在: ${roomId}, 当前房间总数: ${this.rooms.size}`);
      return false;
    }

    this.logger.log(`🔍 房间信息: 主持人=${room.hostUserId}, 请求用户=${userId}, 参与者数=${room.participants.size}`);

    // 检查是否是主持人
    if (room.hostUserId !== userId) {
      this.logger.warn(`❌ 用户 ${userId} 无权解散房间 ${roomId}，只有主持人 ${room.hostUserId} 可以解散`);
      return false;
    }

    // 调用 ZEGO 服务端 API 强制关闭房间（踢出所有用户）
    const zegoSuccess = await this.callZegoCloseRoom(roomId);
    if (!zegoSuccess) {
      this.logger.warn(`⚠️ ZEGO API 调用失败，但继续标记房间为已解散`);
    }

    // 标记房间为已解散
    room.isDismissed = true;
    room.participants.clear();
    this.logger.log(`✅ 房间 ${roomId} 已被主持人 ${userId} 解散`);

    // 清理提词器消息
    this.clearTeleprompterMessages(roomId);

    // 延迟删除房间记录（给前端时间接收消息）
    setTimeout(() => {
      this.rooms.delete(roomId);
      this.logger.log(`房间 ${roomId} 记录已删除`);
    }, 5000);

    return true;
  }

  /**
   * 检查房间状态
   */
  checkRoom(roomId: string): { exists: boolean; isDismissed: boolean; canJoin: boolean } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { exists: false, isDismissed: false, canJoin: true };
    }

    return {
      exists: true,
      isDismissed: room.isDismissed,
      canJoin: !room.isDismissed,
    };
  }

  /**
   * 启动定时清理任务
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const roomsToDelete: string[] = [];

      this.rooms.forEach((room, roomId) => {
        // 如果房间无人且超过10分钟，自动关闭
        if (room.participants.size === 0 && now - room.lastActivityAt > this.ROOM_TIMEOUT) {
          roomsToDelete.push(roomId);
          this.logger.log(`房间 ${roomId} 超过10分钟无人，自动关闭`);
        }
      });

      // 删除超时的房间
      roomsToDelete.forEach(roomId => {
        this.rooms.delete(roomId);
      });

      if (roomsToDelete.length > 0) {
        this.logger.log(`清理了 ${roomsToDelete.length} 个超时房间`);
      }
    }, 60 * 1000); // 每分钟检查一次
  }

  /**
   * 停止清理任务（用于模块销毁时）
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * 推送提词器内容
   */
  pushTeleprompterContent(
    roomId: string,
    content: string,
    targetUserIds: string[],
    scrollSpeed: number,
    displayHeight: string,
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.isDismissed) {
      this.logger.warn(`无法推送提词内容，房间不存在或已解散: ${roomId}`);
      return false;
    }

    const message: TeleprompterMessage = {
      type: 'CONTENT',
      content,
      scrollSpeed,
      displayHeight,
      targetUserIds,
      timestamp: Date.now(),
    };

    // 获取或创建消息队列
    if (!this.teleprompterMessages.has(roomId)) {
      this.teleprompterMessages.set(roomId, []);
    }

    this.teleprompterMessages.get(roomId)!.push(message);
    this.logger.log(`推送提词内容到房间 ${roomId}, 目标用户: ${targetUserIds.join(', ')}`);

    // 清理旧消息（保留最近10条）
    const messages = this.teleprompterMessages.get(roomId)!;
    if (messages.length > 10) {
      this.teleprompterMessages.set(roomId, messages.slice(-10));
    }

    return true;
  }

  /**
   * 控制提词器播放状态
   */
  controlTeleprompter(
    roomId: string,
    targetUserIds: string[],
    action: 'PLAY' | 'PAUSE' | 'STOP',
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.isDismissed) {
      this.logger.warn(`无法控制提词器，房间不存在或已解散: ${roomId}`);
      return false;
    }

    const message: TeleprompterMessage = {
      type: 'CONTROL',
      action,
      targetUserIds,
      timestamp: Date.now(),
    };

    // 获取或创建消息队列
    if (!this.teleprompterMessages.has(roomId)) {
      this.teleprompterMessages.set(roomId, []);
    }

    this.teleprompterMessages.get(roomId)!.push(message);
    this.logger.log(`控制提词器 ${action} 在房间 ${roomId}, 目标用户: ${targetUserIds.join(', ')}`);

    return true;
  }

  /**
   * 获取提词器消息（轮询接口）
   */
  getTeleprompterMessages(
    roomId: string,
    userId: string,
    lastTimestamp?: number,
  ): TeleprompterMessage[] {
    const messages = this.teleprompterMessages.get(roomId) || [];

    // 过滤出目标用户的消息
    const userMessages = messages.filter(msg => {
      // 检查是否是目标用户
      const isTarget = msg.targetUserIds.includes('ALL') || msg.targetUserIds.includes(userId);
      // 检查是否是新消息
      const isNew = !lastTimestamp || msg.timestamp > lastTimestamp;
      return isTarget && isNew;
    });

    return userMessages;
  }

  /**
   * 清理房间的提词器消息
   */
  clearTeleprompterMessages(roomId: string): void {
    this.teleprompterMessages.delete(roomId);
    this.logger.log(`清理房间 ${roomId} 的提词器消息`);
  }
}

