import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * 微信云函数调用服务
 * 用于CRM端主动调用小程序云函数发送订阅消息通知
 */
@Injectable()
export class WechatCloudService {
  private readonly logger = new Logger(WechatCloudService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly cloudEnv: string;
  private accessTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('MINIPROGRAM_APPID') || 'wxb2c4e35d16d99fd3';
    this.appSecret = this.configService.get<string>('MINIPROGRAM_APPSECRET') || '';
    this.cloudEnv = this.configService.get<string>('MINIPROGRAM_CLOUD_ENV') || 'cloud1-4gi0bpoje72fedd1';
    
    if (!this.appSecret) {
      this.logger.warn('⚠️ 小程序AppSecret未配置，云函数调用将失败');
    }
    
    this.logger.log(`✅ 微信云函数服务初始化完成 - AppID: ${this.appId}, CloudEnv: ${this.cloudEnv}`);
  }

  /**
   * 获取小程序access_token
   */
  private async getAccessToken(): Promise<string> {
    // 检查缓存的token是否有效
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > Date.now()) {
      return this.accessTokenCache.token;
    }

    try {
      const url = `https://api.weixin.qq.com/cgi-bin/token`;
      const params = {
        grant_type: 'client_credential',
        appid: this.appId,
        secret: this.appSecret,
      };

      this.logger.log('🔑 获取小程序access_token');
      
      const response = await axios.get(url, { params });
      const data = response.data;

      if (data.errcode) {
        this.logger.error(`❌ 获取access_token失败: ${data.errcode} - ${data.errmsg}`);
        throw new Error(`获取访问令牌失败: ${data.errmsg}`);
      }

      // 缓存token，提前5分钟过期
      this.accessTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000,
      };

      this.logger.log('✅ 成功获取access_token');
      return data.access_token;
    } catch (error) {
      this.logger.error('❌ 获取access_token异常:', error);
      throw error;
    }
  }

  /**
   * 调用云函数发送客户分配通知
   * @param notificationData 通知数据
   */
  async sendCustomerAssignNotification(notificationData: any): Promise<void> {
    try {
      if (!this.appSecret) {
        this.logger.warn('⚠️ 小程序AppSecret未配置，跳过通知发送');
        return;
      }

      const accessToken = await this.getAccessToken();

      // 按照微信云开发API标准格式构建URL
      const url = `https://api.weixin.qq.com/tcb/invokecloudfunction?access_token=${accessToken}&env=${this.cloudEnv}&name=quickstartFunctions`;

      const requestData = {
        type: 'sendCustomerAssignNotify',
        notificationData: {
          assignedToId: notificationData.assignedToId,
          customerName: notificationData.customerName,
          source: notificationData.source || '手动分配',
          assignerName: notificationData.assignerName,
          customerId: notificationData.customerId,
          assignTime: notificationData.assignTime,
        },
      };

      this.logger.log(`📱 调用云函数发送通知 - 被分配人: ${notificationData.assignedToId}`);
      this.logger.log('请求数据:', JSON.stringify(requestData));

      // 按照微信API要求，body必须是JSON字符串
      const response = await axios.post(url, JSON.stringify(requestData), {
        headers: { 'Content-Type': 'application/json' }
      });
      const result = response.data;

      if (result.errcode !== 0) {
        this.logger.error(`❌ 云函数调用失败: ${result.errcode} - ${result.errmsg}`);
        throw new Error(`云函数调用失败: ${result.errmsg}`);
      }

      this.logger.log('✅ 云函数调用成功');
      
      // 解析云函数返回结果
      if (result.resp_data) {
        try {
          const cloudResult = JSON.parse(result.resp_data);
          this.logger.log('云函数返回:', cloudResult);
        } catch (e) {
          this.logger.log('云函数返回（原始）:', result.resp_data);
        }
      }
    } catch (error) {
      // 通知发送失败不应影响主流程，只记录错误
      this.logger.error('❌ 发送通知失败:', error.message);
      this.logger.debug('错误详情:', error);
    }
  }

  /**
   * 批量发送客户分配通知
   * @param notificationData 批量通知数据
   */
  async sendBatchCustomerAssignNotification(notificationData: any): Promise<void> {
    try {
      if (!this.appSecret) {
        this.logger.warn('⚠️ 小程序AppSecret未配置，跳过通知发送');
        return;
      }

      this.logger.log(`📱 批量发送通知 - 被分配人: ${notificationData.assignedToId}, 客户数: ${notificationData.customerCount}`);
      
      // 对于批量分配，可以发送一条汇总通知
      await this.sendCustomerAssignNotification({
        assignedToId: notificationData.assignedToId,
        customerName: `${notificationData.customerCount}个客户`,
        source: notificationData.source || '批量分配',
        assignerName: notificationData.assignerName,
        customerId: notificationData.customerIds?.[0] || '',
        assignTime: notificationData.assignTime,
      });
    } catch (error) {
      this.logger.error('❌ 批量发送通知失败:', error.message);
    }
  }
}

