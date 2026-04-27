import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WechatSubscribeService } from './wechat-subscribe.service';
const WeChatAPI = require('wechat-api');

@Injectable()
export class WeChatService {
  private readonly logger = new Logger(WeChatService.name);
  private wechatApi: any;

  constructor(
    private configService: ConfigService,
    private readonly subscribeService: WechatSubscribeService,
  ) {
    const appId = this.configService.get<string>('WECHAT_APPID') || 'wx986d99b2dab1b026';
    const appSecret = this.configService.get<string>('WECHAT_APPSECRET') || '93a50c000e7c708fdd33bc569f375387';

    this.wechatApi = new WeChatAPI(appId, appSecret);
    this.logger.log('微信服务初始化完成');
  }

  /**
   * 验证微信服务器签名
   */
  verifySignature(signature: string, timestamp: string, nonce: string): boolean {
    const token = this.configService.get<string>('WECHAT_TOKEN') || 'andejiazheng2025';

    this.logger.log(`验证签名 - Token: ${token}, Timestamp: ${timestamp}, Nonce: ${nonce}`);

    // 将token、timestamp、nonce三个参数进行字典序排序
    const arr = [token, timestamp, nonce].sort();

    // 将三个参数字符串拼接成一个字符串进行sha1加密
    const str = arr.join('');
    const sha1 = crypto.createHash('sha1').update(str).digest('hex');

    this.logger.log(`计算的签名: ${sha1}, 接收的签名: ${signature}`);

    // 开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
    return sha1 === signature;
  }

  /**
   * 发送模板消息
   */
  async sendTemplateMessage(openId: string, templateId: string, data: any, url?: string): Promise<boolean> {
    try {
      const result = await new Promise((resolve, reject) => {
        this.wechatApi.sendTemplate(openId, templateId, url || '', data, (err: any, result: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      this.logger.log(`模板消息发送成功: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      this.logger.error(`模板消息发送失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 发送线索分配通知（服务号订阅通知）
   * 历史签名保留兼容：phone / leadSource / serviceCategory / detailUrl 字段已不再使用
   * 真正下发的字段为：客户姓名、分配时间、分配人
   */
  async sendLeadAssignmentNotification(
    openId: string,
    customerData: {
      name: string;
      phone?: string;
      leadSource?: string;
      serviceCategory?: string;
      assignedAt: string;
      assignmentReason?: string;
      assignerName?: string;
    },
    detailUrl?: string,
  ): Promise<boolean> {
    if (!openId) {
      this.logger.warn('sendLeadAssignmentNotification 跳过：openId 为空');
      return false;
    }

    const result = await this.subscribeService.sendLeadAssignNotify(openId, {
      customerName: customerData.name,
      assignedAt: customerData.assignedAt,
      assignerName: customerData.assignerName || customerData.assignmentReason,
      page: detailUrl,
    });

    return result.success;
  }

  /**
   * 生成二维码（用于员工绑定）
   */
  async generateQRCode(sceneStr: string): Promise<string> {
    try {
      const result = await new Promise((resolve, reject) => {
        this.wechatApi.createTmpQRCode(sceneStr, 7 * 24 * 3600, (err: any, result: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      return (result as any).url;
    } catch (error) {
      this.logger.error(`生成二维码失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(openId: string): Promise<any> {
    try {
      const result = await new Promise((resolve, reject) => {
        this.wechatApi.getUser(openId, (err: any, result: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      return result;
    } catch (error) {
      this.logger.error(`获取用户信息失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
