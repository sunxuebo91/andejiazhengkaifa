import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const { generateToken04 } = require('./server/zegoServerAssistant');

@Injectable()
export class ZegoService {
  private readonly appId: number;
  private readonly serverSecret: string;

  constructor(private configService: ConfigService) {
    this.appId = parseInt(this.configService.get<string>('ZEGO_APP_ID') || '0');
    this.serverSecret = this.configService.get<string>('ZEGO_SERVER_SECRET') || '';
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
}

