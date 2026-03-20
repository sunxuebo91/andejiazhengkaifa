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
  kickedUsers: Set<string>; // ✅ 被踢出的用户黑名单
  hostLeftAt: number | null; // 🔥 主持人离开的时间戳（null表示主持人还在）
  hasAnyActivity: boolean; // 🔥 是否有过任何活动（推流、参与者加入等）
}

// 提词器消息接口
interface TeleprompterMessage {
  type: 'CONTENT' | 'CONTROL';
  content?: string;
  scrollSpeed?: number;
  action?: 'PLAY' | 'PAUSE' | 'STOP' | 'SHOW' | 'HIDE';
  targetUserIds: string[];
  timestamp: number;
}

// 远程控制消息接口
interface RemoteControlMessage {
  type: 'REMOTE_CONTROL';
  controlType: 'camera' | 'microphone';
  enabled: boolean;
  targetUserId: string;
  timestamp: number;
}

@Injectable()
export class ZegoService {
  private readonly logger = new Logger(ZegoService.name);
  private readonly appId: number;
  private readonly serverSecret: string;

  // 房间状态管理
  private rooms: Map<string, RoomState> = new Map();
  private dismissedRooms: Map<string, number> = new Map(); // 记录已解散的房间，value是解散时间戳
  private readonly ROOM_TIMEOUT = 10 * 60 * 1000; // 🔥 10分钟无人自动关闭（主持人可在此期间重新进入）
  private cleanupInterval: NodeJS.Timeout;

  // 提词器消息队列 (roomId -> messages[])
  private teleprompterMessages: Map<string, TeleprompterMessage[]> = new Map();

  // 远程控制消息队列 (roomId -> userId -> messages[])
  private remoteControlMessages: Map<string, Map<string, RemoteControlMessage[]>> = new Map();

  // 延迟注入 InterviewService 避免循环依赖
  private interviewService: any;

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
   * 设置 InterviewService（用于避免循环依赖）
   */
  setInterviewService(interviewService: any): void {
    this.interviewService = interviewService;
    this.logger.log('✅ InterviewService 已注入到 ZegoService');
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
    const roomState: RoomState = {
      roomId,
      hostUserId,
      createdAt: now,
      lastActivityAt: now,
      isDismissed: false,
      participants: new Set([hostUserId]),
      kickedUsers: new Set<string>(), // ✅ 初始化黑名单
      hostLeftAt: null, // 🔥 主持人还在房间
      hasAnyActivity: false, // 🔥 初始状态：没有活动
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

    // ✅ 检查用户是否在黑名单中
    if (room.kickedUsers.has(userId)) {
      this.logger.warn(`❌ 用户 ${userId} 在黑名单中，无法加入房间: ${roomId}`);
      return false;
    }

    // 添加参与者并更新活动时间
    room.participants.add(userId);
    room.lastActivityAt = Date.now();
    room.hasAnyActivity = true; // 🔥 标记有活动

    // 🔥 如果是主持人重新加入，取消关闭倒计时
    if (userId === room.hostUserId && room.hostLeftAt !== null) {
      this.logger.log(`🎉 主持人 ${userId} 重新加入房间: ${roomId}，取消关闭倒计时`);
      room.hostLeftAt = null;
    }
    // 🔥 如果主持人已离开，但有其他用户加入，也取消关闭倒计时
    else if (room.hostLeftAt !== null) {
      this.logger.log(`🔄 主持人已离开，但有新用户 ${userId} 加入，取消关闭倒计时`);
      room.hostLeftAt = null;
    }

    this.logger.log(`✅ 用户 ${userId} 加入房间: ${roomId}, 当前人数: ${room.participants.size}`);
    return true;
  }

  /**
   * 检查用户是否是房间主持人
   */
  isHostUser(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    return userId === room.hostUserId;
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

    // 🔥 场景1：检测主持人离开
    if (userId === room.hostUserId) {
      room.hostLeftAt = Date.now();
      this.logger.log(`🔔 主持人 ${userId} 离开房间: ${roomId}`);

      // 如果房间内没有其他人，开始10分钟倒计时
      if (room.participants.size === 0) {
        this.logger.log(`⏰ 房间 ${roomId} 无人，将在10分钟后自动关闭（主持人可在此期间重新进入）`);
      } else {
        this.logger.log(`⏰ 房间 ${roomId} 还有 ${room.participants.size} 人，将在主持人离开后10分钟自动关闭`);
      }
    } else {
      // 普通参与者离开
      if (room.participants.size === 0) {
        this.logger.log(`⏰ 房间 ${roomId} 已无人，将在10分钟后自动关闭`);
      }
    }
  }

  /**
   * 调用 ZEGO 服务端 API CloseRoom 强制关闭房间
   * 官方文档: https://doc-zh.zego.im/real-time-video-server/api-reference/room/close
   */
  async callZegoCloseRoom(roomId: string): Promise<boolean> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = Math.floor(Math.random() * 100000000).toString(16).padStart(16, '0');

      // ✅ 正确的签名算法：Signature = md5(AppId + SignatureNonce + ServerSecret + Timestamp)
      // 只包含 4 个参数，不包含业务参数
      const signString = `${this.appId}${nonce}${this.serverSecret}${timestamp}`;
      const signature = crypto.createHash('md5').update(signString).digest('hex');

      this.logger.log(`🔐 CloseRoom 签名字符串: ${this.appId} + ${nonce} + [ServerSecret] + ${timestamp}`);
      this.logger.log(`🔐 CloseRoom 签名结果: ${signature}`);

      // 构建 URL 参数（业务参数不参与签名）
      const urlParams = [
        `Action=CloseRoom`,
        `AppId=${this.appId}`,
        `SignatureNonce=${nonce}`,
        `Timestamp=${timestamp}`,
        `Signature=${signature}`,
        `SignatureVersion=2.0`,
        `RoomId=${encodeURIComponent(roomId)}`,
      ];

      const url = `https://rtc-api.zego.im/?${urlParams.join('&')}`;

      this.logger.log(`📞 调用 ZEGO CloseRoom API: 房间=${roomId}`);

      const response = await axios.get(url, {
        timeout: 10000,
      });

      this.logger.log(`📞 ZEGO CloseRoom API 响应:`, response.data);

      if (response.data.Code === 0) {
        this.logger.log(`✅ ZEGO 服务端已关闭房间: ${roomId}`);
        return true;
      } else {
        this.logger.error(`❌ ZEGO CloseRoom API 返回错误 Code=${response.data.Code}, Message=${response.data.Message}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ 调用 ZEGO CloseRoom API 失败:`, error.message);
      if (error.response) {
        this.logger.error(`❌ 响应数据:`, error.response.data);
      }
      return false;
    }
  }

  /**
   * 调用 ZEGO KickoutUser API 踢出单个用户
   *
   * 官方文档：https://doc-zh.zego.im/real-time-video-server/api-reference/room/kick-out-user
   * 签名机制：https://doc-zh.zego.im/real-time-video-server/api-reference/accessing-server-apis#signature-mechanism
   *
   * 关键点：
   * 1. 签名算法：Signature = md5(AppId + SignatureNonce + ServerSecret + Timestamp)
   * 2. 签名只包含这4个参数，不包含 Action、RoomId、UserId 等业务参数
   * 3. URL 中数组参数使用 UserId[]=xxx 格式
   */
  async callZegoKickoutUser(roomId: string, userId: string): Promise<boolean> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // 生成16位16进制随机字符串（8字节随机数的hex编码）
      const nonce = crypto.randomBytes(8).toString('hex');

      // 签名算法：Signature = md5(AppId + SignatureNonce + ServerSecret + Timestamp)
      // 注意：签名只包含这4个参数，不包含其他业务参数
      const signString = `${this.appId}${nonce}${this.serverSecret}${timestamp}`;

      this.logger.log(`🔐 签名字符串: ${signString}`);

      // 使用 MD5 生成签名
      const signature = crypto
        .createHash('md5')
        .update(signString)
        .digest('hex');

      this.logger.log(`🔐 签名结果: ${signature}`);

      // 构建 URL 参数
      const urlParams = [
        `Action=KickoutUser`,
        `AppId=${this.appId}`,
        `SignatureNonce=${nonce}`,
        `Timestamp=${timestamp}`,
        `Signature=${signature}`,
        `SignatureVersion=2.0`,
        `RoomId=${encodeURIComponent(roomId)}`,
        `UserId[]=${encodeURIComponent(userId)}`,  // 数组参数使用 [] 格式
      ];

      const url = `https://rtc-api.zego.im/?${urlParams.join('&')}`;

      this.logger.log(`🚫 调用 ZEGO KickoutUser API: 房间=${roomId}, 用户=${userId}`);
      this.logger.log(`🚫 请求 URL: ${url}`);

      const response = await axios.get(url, {
        timeout: 10000,
      });

      this.logger.log(`🚫 ZEGO KickoutUser API 响应:`, response.data);

      if (response.data.Code === 0) {
        this.logger.log(`✅ ZEGO 服务端已踢出用户: ${userId} from ${roomId}`);
        return true;
      } else {
        this.logger.error(`❌ ZEGO KickoutUser API 返回错误: Code=${response.data.Code}, Message=${response.data.Message}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ 调用 ZEGO KickoutUser API 失败:`, error.message);
      if (error.response) {
        this.logger.error(`❌ ZEGO API 响应状态: ${error.response.status}`);
        this.logger.error(`❌ ZEGO API 响应数据:`, error.response.data);
      }
      return false;
    }
  }

  /**
   * 踢出用户（主持人权限）
   */
  async kickUser(roomId: string, hostUserId: string, targetUserId: string): Promise<boolean> {
    this.logger.log(`🚫 尝试踢出用户: 房间=${roomId}, 主持人=${hostUserId}, 目标用户=${targetUserId}`);

    const room = this.rooms.get(roomId);

    if (!room) {
      this.logger.warn(`❌ 房间不存在: ${roomId}`);
      return false;
    }

    // 检查是否是主持人
    if (room.hostUserId !== hostUserId) {
      this.logger.warn(`❌ 用户 ${hostUserId} 无权踢人，只有主持人 ${room.hostUserId} 可以踢人`);
      return false;
    }

    // 不能踢出自己
    if (targetUserId === hostUserId) {
      this.logger.warn(`❌ 主持人不能踢出自己`);
      return false;
    }

    // ✅ 调用 ZEGO API 强制踢出用户
    const success = await this.callZegoKickoutUser(roomId, targetUserId);

    if (success) {
      // 从参与者列表中移除
      room.participants.delete(targetUserId);
      // ✅ 添加到黑名单
      room.kickedUsers.add(targetUserId);
      this.logger.log(`✅ 用户 ${targetUserId} 已被踢出房间 ${roomId} 并加入黑名单`);
      return true;
    } else {
      this.logger.error(`❌ 调用 ZEGO API 踢出用户失败`);
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

    // ✅ 立即标记房间为已解散（在调用 ZEGO API 之前）
    room.isDismissed = true;
    room.participants.clear();
    this.logger.log(`✅ 房间 ${roomId} 已被主持人 ${userId} 标记为已解散`);

    // 记录到已解散房间列表（保留30秒，用于前端查询）
    this.dismissedRooms.set(roomId, Date.now());
    this.logger.log(`✅ 已将房间 ${roomId} 加入已解散列表，当前已解散房间数: ${this.dismissedRooms.size}`);

    // 调用 ZEGO 服务端 API 强制关闭房间（踢出所有用户）
    const zegoSuccess = await this.callZegoCloseRoom(roomId);
    if (!zegoSuccess) {
      this.logger.warn(`⚠️ ZEGO API 调用失败，但房间已标记为已解散`);
    } else {
      this.logger.log(`✅ ZEGO 房间已关闭`);
    }

    // 清理提词器消息和远程控制消息
    this.clearTeleprompterMessages(roomId);
    this.clearRemoteControlMessages(roomId);

    // 延迟删除房间记录（给前端时间接收消息）
    setTimeout(() => {
      this.rooms.delete(roomId);
      this.logger.log(`房间 ${roomId} 记录已删除`);
    }, 5000);

    // 30秒后清理已解散房间记录
    setTimeout(() => {
      this.dismissedRooms.delete(roomId);
      this.logger.log(`已解散房间记录已清理: ${roomId}`);
    }, 30000);

    return true;
  }

  /**
   * 检查房间状态
   */
  checkRoom(roomId: string): { exists: boolean; isDismissed: boolean; canJoin: boolean; isActive: boolean } {
    const room = this.rooms.get(roomId);

    // 检查是否在已解散房间列表中
    const wasDismissed = this.dismissedRooms.has(roomId);

    this.logger.log(`🔍 检查房间状态: ${roomId}`);
    this.logger.log(`  - 房间存在: ${!!room}`);
    this.logger.log(`  - 在已解散列表中: ${wasDismissed}`);
    this.logger.log(`  - 当前已解散房间数: ${this.dismissedRooms.size}`);
    if (room) {
      this.logger.log(`  - 房间isDismissed: ${room.isDismissed}`);
    }

    if (!room) {
      // 房间不存在，但如果在已解散列表中，说明是被解散的
      if (wasDismissed) {
        this.logger.log(`✅ 返回: 房间已解散（从已解散列表）`);
        return { exists: false, isDismissed: true, canJoin: false, isActive: false };
      }
      // 房间从未创建或已过期
      this.logger.log(`✅ 返回: 房间不存在`);
      return { exists: false, isDismissed: false, canJoin: true, isActive: false };
    }

    this.logger.log(`✅ 返回: 房间存在，isDismissed=${room.isDismissed}`);
    return {
      exists: true,
      isDismissed: room.isDismissed,
      canJoin: !room.isDismissed,
      isActive: !room.isDismissed, // 房间活跃 = 房间存在且未解散
    };
  }

  /**
   * 启动定时清理任务
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();
      const roomsToDelete: string[] = [];

      // 🔍 打印当前所有房间状态（调试用）
      this.logger.debug(`🔍 定时检查: 当前共有 ${this.rooms.size} 个房间`);

      this.rooms.forEach((room, roomId) => {
        const idleTime = Math.floor((now - room.lastActivityAt) / 1000);
        const roomAge = Math.floor((now - room.createdAt) / 1000);
        const timeoutSeconds = Math.floor(this.ROOM_TIMEOUT / 1000); // 🔥 转换为秒

        this.logger.debug(`  - 房间 ${roomId}: 参与者数=${room.participants.size}, 空闲时间=${idleTime}秒, 房间年龄=${roomAge}秒, 主持人离开=${room.hostLeftAt !== null}, 有活动=${room.hasAnyActivity}`);

        let shouldClose = false;
        let closeReason = '';

        // 🔥 场景1（优先级最高）：主持人离开且房间无人，超过10分钟
        if (room.hostLeftAt !== null && room.participants.size === 0) {
          const timeSinceHostLeft = now - room.hostLeftAt;
          const timeSinceHostLeftSeconds = Math.floor(timeSinceHostLeft / 1000);
          this.logger.debug(`  🔍 场景1检查: 主持人离开=${room.hostLeftAt !== null}, 房间无人=${room.participants.size === 0}, 时长=${timeSinceHostLeftSeconds}秒, 超时=${timeoutSeconds}秒`);
          if (timeSinceHostLeft > this.ROOM_TIMEOUT) {
            shouldClose = true;
            closeReason = `主持人离开${timeSinceHostLeftSeconds}秒，房间无人`;
            this.logger.debug(`  ✅ 场景1触发`);
          }
        }
        // 🔥 场景2（兜底方案1）：房间创建后一直没有活动，超过10分钟
        // 这种情况通常是主持人创建房间后没有授权摄像头/麦克风，或者网络断开，或者关闭浏览器时 leaveRoom 没有被调用
        else if (!room.hasAnyActivity && roomAge > timeoutSeconds) {
          this.logger.debug(`  🔍 场景2检查: hasAnyActivity=${room.hasAnyActivity}, roomAge=${roomAge}秒, 超时=${timeoutSeconds}秒`);
          shouldClose = true;
          closeReason = `房间创建${roomAge}秒，一直无活动（可能未授权设备或网络断开）`;
          this.logger.debug(`  ✅ 场景2触发`);
        }
        // 🔥 场景3（兜底方案2）：房间无人且超过10分钟无活动
        else if (room.participants.size === 0 && idleTime > timeoutSeconds) {
          this.logger.debug(`  🔍 场景3检查: 参与者数=${room.participants.size}, 空闲时间=${idleTime}秒, 超时=${timeoutSeconds}秒`);
          shouldClose = true;
          closeReason = `房间无人且${idleTime}秒无活动`;
          this.logger.debug(`  ✅ 场景3触发`);
        }
        // 🔥 场景4（兜底方案3）：房间有人但长时间无活动（15分钟），可能是主持人关闭页面但leaveRoom没有被调用
        else if (room.participants.size > 0 && idleTime > timeoutSeconds * 1.5) {
          this.logger.debug(`  🔍 场景4检查: 参与者数=${room.participants.size}, 空闲时间=${idleTime}秒, 超时=${timeoutSeconds * 1.5}秒`);
          shouldClose = true;
          closeReason = `房间有${room.participants.size}人但${idleTime}秒无活动（可能主持人已离开但未通知后端）`;
          this.logger.debug(`  ✅ 场景4触发`);
        }

        if (shouldClose) {
          roomsToDelete.push(roomId);
          this.logger.log(`🔔 房间 ${roomId} 将被关闭: ${closeReason}`);
        } else {
          this.logger.debug(`  ⏸️ 房间 ${roomId} 不满足关闭条件`);
        }
      });

      // 删除超时的房间并更新数据库状态
      for (const roomId of roomsToDelete) {
        // 1. 删除内存中的房间数据
        this.rooms.delete(roomId);
        this.logger.log(`✅ 已从内存中删除房间: ${roomId}`);

        // 2. 🔥 更新数据库中的面试间状态为 ended
        if (this.interviewService) {
          try {
            await this.interviewService.autoEndRoom(roomId);
            this.logger.log(`✅ 房间 ${roomId} 数据库状态已更新为 ended`);
          } catch (error) {
            this.logger.error(`❌ 更新房间 ${roomId} 数据库状态失败:`, error.message);
          }
        } else {
          this.logger.warn(`⚠️ InterviewService 未注入，无法更新数据库状态`);
        }
      }

      if (roomsToDelete.length > 0) {
        this.logger.log(`🧹 清理了 ${roomsToDelete.length} 个超时房间`);
      }
    }, 30 * 1000); // 每30秒检查一次（测试用）
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
    action: 'PLAY' | 'PAUSE' | 'STOP' | 'SHOW' | 'HIDE',
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
   * 一键推送并开启提词器
   */
  quickStartTeleprompter(
    roomId: string,
    content: string,
    targetUserIds: string[],
    scrollSpeed: number,
    autoPlay: boolean = true,
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.isDismissed) {
      this.logger.warn(`无法快速启动提词器，房间不存在或已解散: ${roomId}`);
      return false;
    }

    // 1. 推送内容
    const success = this.pushTeleprompterContent(
      roomId,
      content,
      targetUserIds,
      scrollSpeed,
    );

    if (!success) {
      return false;
    }

    // 2. 显示提词器
    this.controlTeleprompter(roomId, targetUserIds, 'SHOW');

    // 3. 自动播放（可选）
    if (autoPlay) {
      // 延迟500ms确保内容加载完成
      setTimeout(() => {
        this.controlTeleprompter(roomId, targetUserIds, 'PLAY');
      }, 500);
    }

    this.logger.log(`快速启动提词器成功，房间 ${roomId}, 目标用户: ${targetUserIds.join(', ')}, 自动播放: ${autoPlay}`);
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

    // 🔥 调试日志 - 始终输出
    this.logger.log(`📝 获取提词器消息 - 房间: ${roomId}, 用户: ${userId}, lastTimestamp: ${lastTimestamp}, 队列中消息数: ${messages.length}`);

    // 过滤出目标用户的消息
    const userMessages = messages.filter(msg => {
      // 检查是否是目标用户
      const isTarget = msg.targetUserIds.includes('ALL') || msg.targetUserIds.includes(userId);
      // 检查是否是新消息
      const isNew = !lastTimestamp || msg.timestamp > lastTimestamp;

      // 🔥 调试日志 - 显示过滤逻辑
      this.logger.log(`📝 消息过滤 - type: ${msg.type}, targetUserIds: [${msg.targetUserIds.join(',')}], 当前用户: ${userId}, isTarget: ${isTarget}, isNew: ${isNew}`);

      return isTarget && isNew;
    });

    // 🔥 返回结果日志
    this.logger.log(`📝 返回 ${userMessages.length} 条消息给用户 ${userId}`);

    return userMessages;
  }

  /**
   * 清理房间的提词器消息
   */
  clearTeleprompterMessages(roomId: string): void {
    this.teleprompterMessages.delete(roomId);
    this.logger.log(`清理房间 ${roomId} 的提词器消息`);
  }

  /**
   * 远程控制用户设备（摄像头/麦克风）
   */
  remoteControl(
    roomId: string,
    hostUserId: string,
    targetUserId: string,
    controlType: 'camera' | 'microphone',
    enabled: boolean,
  ): boolean {
    const room = this.rooms.get(roomId);

    if (!room || room.isDismissed) {
      this.logger.warn(`远程控制失败: 房间 ${roomId} 不存在或已解散`);
      return false;
    }

    // 验证是否是主持人
    if (room.hostUserId !== hostUserId) {
      this.logger.warn(`远程控制失败: 用户 ${hostUserId} 不是主持人，房间主持人是 ${room.hostUserId}`);
      return false;
    }

    // 验证目标用户是否在房间中
    if (!room.participants.has(targetUserId)) {
      this.logger.warn(`远程控制失败: 目标用户 ${targetUserId} 不在房间中`);
      this.logger.warn(`当前房间参与者列表: ${Array.from(room.participants).join(', ')}`);
      return false;
    }

    // 创建控制消息
    const message: RemoteControlMessage = {
      type: 'REMOTE_CONTROL',
      controlType,
      enabled,
      targetUserId,
      timestamp: Date.now(),
    };

    // 存储消息到队列
    if (!this.remoteControlMessages.has(roomId)) {
      this.remoteControlMessages.set(roomId, new Map());
    }

    const roomMessages = this.remoteControlMessages.get(roomId);
    if (!roomMessages.has(targetUserId)) {
      roomMessages.set(targetUserId, []);
    }

    roomMessages.get(targetUserId).push(message);

    // 限制消息队列长度（最多保留最近10条）
    const userMessages = roomMessages.get(targetUserId);
    if (userMessages.length > 10) {
      userMessages.shift();
    }

    this.logger.log(`远程控制: 房间 ${roomId}, 目标用户 ${targetUserId}, 控制类型 ${controlType}, 状态 ${enabled}`);
    return true;
  }

  /**
   * 获取远程控制消息
   */
  getRemoteControlMessages(
    roomId: string,
    userId: string,
    lastTimestamp?: number,
  ): RemoteControlMessage[] {
    const roomMessages = this.remoteControlMessages.get(roomId);
    if (!roomMessages) {
      return [];
    }

    const userMessages = roomMessages.get(userId) || [];

    // 过滤出新消息
    return userMessages.filter(msg => {
      return !lastTimestamp || msg.timestamp > lastTimestamp;
    });
  }

  /**
   * 清理房间的远程控制消息
   */
  clearRemoteControlMessages(roomId: string): void {
    this.remoteControlMessages.delete(roomId);
    this.logger.log(`清理房间 ${roomId} 的远程控制消息`);
  }
}

