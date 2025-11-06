import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TrtcService {
  private readonly logger = new Logger(TrtcService.name);
  private readonly sdkAppId: number;
  private readonly sdkSecretKey: string;

  constructor(private configService: ConfigService) {
    this.sdkAppId = parseInt(this.configService.get('TRTC_SDK_APP_ID', '0'));
    this.sdkSecretKey = this.configService.get('TRTC_SDK_SECRET_KEY', '');

    if (!this.sdkAppId || !this.sdkSecretKey) {
      this.logger.warn('TRTC 配置未完整设置，请检查环境变量 TRTC_SDK_APP_ID 和 TRTC_SDK_SECRET_KEY');
    } else {
      this.logger.log(`TRTC 服务初始化成功，SDKAppID: ${this.sdkAppId}`);
    }
  }

  /**
   * 生成 UserSig
   * @param userId 用户ID
   * @param expire 过期时间（秒），默认7天
   * @returns UserSig 字符串
   */
  generateUserSig(userId: string, expire: number = 604800): string {
    if (!this.sdkAppId || !this.sdkSecretKey) {
      throw new Error('TRTC 配置未设置');
    }

    const current = Math.floor(Date.now() / 1000);
    const sig = {
      'TLS.ver': '2.0',
      'TLS.identifier': userId,
      'TLS.sdkappid': this.sdkAppId,
      'TLS.expire': expire,
      'TLS.time': current,
    };

    // 生成签名
    const sigStr = JSON.stringify(sig);
    const sigBuf = Buffer.from(sigStr, 'utf8');
    const sigBase64 = sigBuf.toString('base64');

    // 使用 HMAC-SHA256 生成签名
    const hmac = crypto.createHmac('sha256', this.sdkSecretKey);
    hmac.update(sigBase64);
    const signature = hmac.digest('base64');

    // 组装最终的 UserSig
    const userSig = {
      'TLS.sig': signature,
      'TLS.ver': '2.0',
      'TLS.identifier': userId,
      'TLS.sdkappid': this.sdkAppId,
      'TLS.expire': expire,
      'TLS.time': current,
    };

    const userSigStr = JSON.stringify(userSig);
    const userSigBuf = Buffer.from(userSigStr, 'utf8');
    const userSigBase64 = userSigBuf.toString('base64');

    // URL 安全的 Base64 编码
    return userSigBase64
      .replace(/\+/g, '*')
      .replace(/\//g, '-')
      .replace(/=/g, '_');
  }

  /**
   * 获取 SDK 配置信息
   */
  getSdkConfig() {
    return {
      sdkAppId: this.sdkAppId,
      configured: !!(this.sdkAppId && this.sdkSecretKey),
    };
  }
}

