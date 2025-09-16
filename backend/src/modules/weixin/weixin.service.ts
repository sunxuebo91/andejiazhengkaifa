import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import axios from 'axios';
import { AdvisorSubscribe } from './models/advisor-subscribe.entity';
import { CustomerAction } from './models/customer-action.entity';
import { AdvisorSubscribeDto } from './dto/advisor-subscribe.dto';
import { CustomerActionDto } from './dto/customer-action.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CustomerLeadService } from './services/customer-lead.service';

@Injectable()
export class WeixinService {
  private readonly logger = new Logger(WeixinService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private accessTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    @InjectModel(AdvisorSubscribe.name)
    private readonly advisorSubscribeModel: Model<AdvisorSubscribe>,
    @InjectModel(CustomerAction.name)
    private readonly customerActionModel: Model<CustomerAction>,
    private readonly configService: ConfigService,
    private readonly customerLeadService: CustomerLeadService,
  ) {
    this.appId = this.configService.get<string>('WECHAT_APP_ID');
    this.appSecret = this.configService.get<string>('WECHAT_APP_SECRET');
    
    if (!this.appId || !this.appSecret) {
      this.logger.error('微信配置缺失：WECHAT_APP_ID 或 WECHAT_APP_SECRET');
    }
  }

  /**
   * 通过code获取用户openid
   */
  async getOpenid(code: string): Promise<{ openid: string; session_key?: string }> {
    try {
      const url = `https://api.weixin.qq.com/sns/jscode2session`;
      const params = {
        appid: this.appId,
        secret: this.appSecret,
        js_code: code,
        grant_type: 'authorization_code',
      };

      this.logger.log(`获取openid，code: ${code}`);
      
      const response = await axios.get(url, { params });
      const data = response.data;

      if (data.errcode) {
        this.logger.error(`获取openid失败: ${data.errcode} - ${data.errmsg}`);
        throw new HttpException(
          `获取用户信息失败: ${data.errmsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`成功获取openid: ${data.openid}`);
      return {
        openid: data.openid,
        session_key: data.session_key,
      };
    } catch (error) {
      this.logger.error('获取openid异常:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取用户信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取微信access_token
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

      this.logger.log('获取微信access_token');
      
      const response = await axios.get(url, { params });
      const data = response.data;

      if (data.errcode) {
        this.logger.error(`获取access_token失败: ${data.errcode} - ${data.errmsg}`);
        throw new HttpException(
          `获取访问令牌失败: ${data.errmsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 缓存token，提前5分钟过期
      this.accessTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000,
      };

      this.logger.log('成功获取access_token');
      return data.access_token;
    } catch (error) {
      this.logger.error('获取access_token异常:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取访问令牌失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 保存顾问订阅状态
   */
  async saveAdvisorSubscribe(dto: AdvisorSubscribeDto): Promise<AdvisorSubscribe> {
    try {
      this.logger.log(`保存顾问订阅状态: ${dto.advisorId} - ${dto.openid}`);

      // 查找现有记录
      const existing = await this.advisorSubscribeModel.findOne({
        advisorId: dto.advisorId,
        openid: dto.openid,
        templateId: dto.templateId,
      });

      if (existing) {
        // 更新现有记录
        existing.subscribed = dto.subscribed;
        existing.subscribeTime = dto.subscribed ? new Date() : existing.subscribeTime;
        existing.unsubscribeTime = !dto.subscribed ? new Date() : existing.unsubscribeTime;
        existing.subscribeData = dto.subscribeData || existing.subscribeData;
        existing.active = true;
        
        return await existing.save();
      } else {
        // 创建新记录
        const newSubscribe = new this.advisorSubscribeModel({
          ...dto,
          subscribeTime: dto.subscribed ? new Date() : undefined,
          unsubscribeTime: !dto.subscribed ? new Date() : undefined,
          active: true,
        });
        
        return await newSubscribe.save();
      }
    } catch (error) {
      this.logger.error('保存顾问订阅状态失败:', error);
      throw new HttpException(
        '保存订阅状态失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 记录客户行为（增强版：支持自动创建客户）
   */
  async recordCustomerAction(dto: CustomerActionDto): Promise<{
    action: CustomerAction;
    customerCreated: boolean;
    customerId?: string;
    customer?: any;
  }> {
    try {
      this.logger.log(`记录客户行为: ${dto.customerId} - ${dto.actionType}`);

      let customerCreationResult = null;
      let customerCreated = false;

      // 🆕 如果有手机号，尝试创建客户线索
      if (this.customerLeadService.shouldCreateCustomer(dto.customerPhone)) {
        this.logger.log(`尝试创建客户线索: ${dto.customerPhone}`);

        customerCreationResult = await this.customerLeadService.createCustomerFromWechatAction({
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          advisorId: dto.advisorId,
          actionType: dto.actionType,
          actionData: dto.actionData,
          openid: dto.customerId, // 使用openid作为客户标识
        });

        customerCreated = customerCreationResult.created;
        this.logger.log(`客户创建结果: created=${customerCreated}, existing=${customerCreationResult.isExisting}`);
      }

      // 创建行为记录
      const actionData = {
        ...dto,
        notified: false,
        customerRecordId: customerCreationResult?.customerId, // 关联客户记录ID
      };

      const action = new this.customerActionModel(actionData);
      const savedAction = await action.save();

      // 异步发送通知给顾问（如果顾问已订阅）
      this.notifyAdvisorAsync(dto.advisorId, dto, customerCreated);

      return {
        action: savedAction,
        customerCreated,
        customerId: customerCreationResult?.customerId,
        customer: customerCreationResult?.customer,
      };
    } catch (error) {
      this.logger.error('记录客户行为失败:', error);
      throw new HttpException(
        '记录客户行为失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 异步通知顾问（增强版：支持新客户标识）
   */
  private async notifyAdvisorAsync(advisorId: string, actionDto: CustomerActionDto, customerCreated: boolean = false) {
    try {
      // 查找顾问的订阅信息
      const subscription = await this.advisorSubscribeModel.findOne({
        advisorId,
        subscribed: true,
        active: true,
      });

      if (!subscription) {
        this.logger.log(`顾问 ${advisorId} 未订阅通知`);
        return;
      }

      // 构建消息数据（支持新客户标识）
      const messageData = this.buildMessageData(actionDto, customerCreated);

      // 发送订阅消息
      await this.sendSubscribeMessage({
        touser: subscription.openid,
        template_id: subscription.templateId,
        data: messageData,
        page: 'pages/customer/detail?id=' + actionDto.customerId,
      });

      this.logger.log(`成功通知顾问 ${advisorId}`);
    } catch (error) {
      this.logger.error(`通知顾问失败 ${advisorId}:`, error);
    }
  }

  /**
   * 构建消息数据（增强版：支持新客户标识）
   */
  private buildMessageData(actionDto: CustomerActionDto, customerCreated: boolean = false): any {
    const actionTypeMap = {
      'view_resume': customerCreated ? '新客户查看了您的简历' : '客户查看了您的简历',
      'contact_advisor': customerCreated ? '新客户想要联系您' : '客户想要联系您',
      'book_service': customerCreated ? '新客户预约了您的服务' : '客户预约了您的服务',
    };

    const actionText = actionTypeMap[actionDto.actionType] || (customerCreated ? '新客户进行了操作' : '客户进行了操作');
    const customerName = actionDto.customerName || (customerCreated ? '新客户' : '客户');

    return {
      thing1: { value: actionText },
      time2: { value: new Date().toLocaleString('zh-CN') },
      thing3: { value: actionDto.customerPhone || '未提供' },
      thing7: { value: customerName },
    };
  }

  /**
   * 发送订阅消息
   */
  async sendSubscribeMessage(dto: SendMessageDto): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;

      this.logger.log(`发送订阅消息给: ${dto.touser}`);

      const response = await axios.post(url, {
        touser: dto.touser,
        template_id: dto.template_id,
        data: dto.data,
        page: dto.page,
        miniprogram_state: dto.miniprogram_state || 'formal',
      });

      const result = response.data;

      if (result.errcode !== 0) {
        this.logger.error(`发送订阅消息失败: ${result.errcode} - ${result.errmsg}`);
        throw new HttpException(
          `发送消息失败: ${result.errmsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log('订阅消息发送成功');
      return result;
    } catch (error) {
      this.logger.error('发送订阅消息异常:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '发送消息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
