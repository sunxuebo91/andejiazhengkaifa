import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';

interface JsApiTicketCache {
  ticket: string;
  expiresAt: number;
}

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

/**
 * 服务号网页授权 + JS-SDK 签名
 * - OAuth snsapi_base 静默授权获取 openid（员工绑定服务号 openid）
 * - JS-SDK 签名（前端调起 wx.openSubscribeNotify）
 * - state token：HMAC-SHA256 防止他人冒用 userId
 */
@Injectable()
export class WechatOAuthService {
  private readonly logger = new Logger(WechatOAuthService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly stateSecret: string;
  private accessTokenCache: AccessTokenCache | null = null;
  private jsApiTicketCache: JsApiTicketCache | null = null;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('WECHAT_APPID') || '';
    this.appSecret = this.configService.get<string>('WECHAT_APPSECRET') || '';
    this.stateSecret =
      this.configService.get<string>('WECHAT_OAUTH_STATE_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'andejiazheng-wechat-oauth-default-secret';
  }

  /**
   * 签发 OAuth state token（5 分钟过期）
   * 格式: base64url(`${userId}.${exp}`) + '.' + hmac(16字节)
   */
  signState(userId: string, ttlSeconds = 300): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = `${userId}.${exp}`;
    const payloadB64 = Buffer.from(payload).toString('base64url');
    const sig = crypto
      .createHmac('sha256', this.stateSecret)
      .update(payloadB64)
      .digest('hex')
      .slice(0, 16);
    return `${payloadB64}.${sig}`;
  }

  verifyState(state: string): { userId: string } | null {
    if (!state || typeof state !== 'string') return null;
    const parts = state.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    const expected = crypto
      .createHmac('sha256', this.stateSecret)
      .update(payloadB64)
      .digest('hex')
      .slice(0, 16);
    if (sig !== expected) return null;
    try {
      const payload = Buffer.from(payloadB64, 'base64url').toString();
      const [userId, expStr] = payload.split('.');
      const exp = parseInt(expStr, 10);
      if (!userId || !exp || exp < Math.floor(Date.now() / 1000)) return null;
      return { userId };
    } catch {
      return null;
    }
  }

  buildAuthorizeUrl(state: string, redirectUri: string, scope: 'snsapi_base' | 'snsapi_userinfo' = 'snsapi_base'): string {
    const params = new URLSearchParams({
      appid: this.appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
    });
    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
  }

  /**
   * 构建服务号订阅通知（一次性）授权 URL
   * 文档：https://developers.weixin.qq.com/doc/offiaccount/Subscription_Messages/api.html
   * 用户允许后微信会 302 回 redirectUrl，并附带 ?action=confirm&template_id=&scene=&openid=&reserved=
   */
  buildSubscribeNotifyUrl(params: {
    templateId: string;
    redirectUrl: string;
    scene?: number;
    reserved?: string;
  }): string {
    const scene = params.scene ?? 1000;
    const reserved = params.reserved || this.signState('subscribe', 1800);
    const qs = new URLSearchParams({
      action: 'get_confirm',
      appid: this.appId,
      scene: String(scene),
      template_id: params.templateId,
      redirect_url: params.redirectUrl,
      reserved,
    });
    return `https://mp.weixin.qq.com/mp/subscribemsg?${qs.toString()}#wechat_redirect`;
  }

  /**
   * 用 OAuth code 换取 openid（snsapi_base scope）
   */
  async exchangeCodeForOpenid(code: string): Promise<{ openid: string; unionid?: string } | null> {
    try {
      const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.appId}&secret=${this.appSecret}&code=${code}&grant_type=authorization_code`;
      const { data } = await axios.get(url, { timeout: 10000 });
      if (data.errcode) {
        this.logger.error(`OAuth code 换 openid 失败: ${data.errcode} ${data.errmsg}`);
        return null;
      }
      return { openid: data.openid, unionid: data.unionid };
    } catch (error) {
      this.logger.error(`OAuth code 换 openid 异常: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取服务号 access_token（缓存 7000 秒）
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > Date.now()) {
      return this.accessTokenCache.token;
    }
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    if (data.errcode) {
      throw new Error(`获取 access_token 失败: ${data.errcode} ${data.errmsg}`);
    }
    this.accessTokenCache = { token: data.access_token, expiresAt: Date.now() + 7000 * 1000 };
    return data.access_token;
  }

  /**
   * 获取 jsapi_ticket（缓存 7000 秒）
   */
  private async getJsApiTicket(): Promise<string> {
    if (this.jsApiTicketCache && this.jsApiTicketCache.expiresAt > Date.now()) {
      return this.jsApiTicketCache.ticket;
    }
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`;
    const { data } = await axios.get(url, { timeout: 10000 });
    if (data.errcode !== 0) {
      throw new Error(`获取 jsapi_ticket 失败: ${data.errcode} ${data.errmsg}`);
    }
    this.jsApiTicketCache = { ticket: data.ticket, expiresAt: Date.now() + 7000 * 1000 };
    return data.ticket;
  }

  /**
   * JS-SDK 签名（用于前端 wx.config）
   */
  async signJsApi(url: string): Promise<{ appId: string; timestamp: number; nonceStr: string; signature: string }> {
    const ticket = await this.getJsApiTicket();
    const nonceStr = Math.random().toString(36).slice(2, 18);
    const timestamp = Math.floor(Date.now() / 1000);
    const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = crypto.createHash('sha1').update(raw).digest('hex');
    return { appId: this.appId, timestamp, nonceStr, signature };
  }
}
