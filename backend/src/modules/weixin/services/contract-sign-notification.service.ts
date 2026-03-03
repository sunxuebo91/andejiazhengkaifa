import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import axios from 'axios';
import { User } from '../../users/models/user.entity';
import { MiniProgramUser } from '../../miniprogram-user/models/miniprogram-user.entity';

/**
 * 合同签署通知服务
 * 当合同签署状态变化时，通知合同发起人和管理员
 */
@Injectable()
export class ContractSignNotificationService {
  private readonly logger = new Logger(ContractSignNotificationService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private accessTokenCache: { token: string; expiresAt: number } | null = null;

  // 合同签署通知模板ID（需要在小程序后台配置）
  private readonly CONTRACT_SIGN_TEMPLATE_ID = '65Od_zcUMxFzKehPczmBbo1Aa60ctTe6nz7Iz_tJK48';

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('MiniProgramUser') private readonly miniProgramUserModel: Model<MiniProgramUser>,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.get<string>('MINIPROGRAM_APPID') || 'wxb2c4e35d16d99fd3';
    this.appSecret = this.configService.get<string>('MINIPROGRAM_APPSECRET') || '';

    if (!this.appSecret) {
      this.logger.warn('⚠️ 小程序AppSecret未配置，合同签署通知将无法发送');
    }

    this.logger.log(`✅ 合同签署通知服务初始化完成 - AppID: ${this.appId}`);
  }

  /**
   * 获取小程序access_token
   */
  private async getAccessToken(): Promise<string> {
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
   * 发送合同签署通知
   * @param contract 合同信息
   * @param signerRole 签署方角色 ('customer' = 雇主/甲方, 'worker' = 家政员/乙方)
   */
  async sendContractSignedNotification(contract: {
    _id: string;
    contractNumber?: string;
    customerName?: string;
    workerName?: string;
    customerServiceFee?: number;
    createdBy?: any; // 合同创建人ID
  }, signerRole: 'customer' | 'worker' | 'both'): Promise<void> {
    try {
      if (!this.appSecret) {
        this.logger.warn('⚠️ 小程序AppSecret未配置，跳过通知发送');
        return;
      }

      this.logger.log(`📱 开始发送合同签署通知 - 合同ID: ${contract._id}, 签署方: ${signerRole}`);

      // 1. 获取需要通知的用户（合同创建人 + 管理员）
      // 直接传入 createdBy 对象，由 getUsersToNotify 内部处理提取ID
      const usersToNotify = await this.getUsersToNotify(contract.createdBy);
      
      if (usersToNotify.length === 0) {
        this.logger.warn('⚠️ 没有找到需要通知的用户（无绑定微信的员工/管理员）');
        return;
      }

      // 2. 构建消息内容
      const statusText = this.getStatusText(signerRole);
      const messageData = {
        thing2: { value: this.truncate(contract.contractNumber || '家政服务合同', 20) },
        thing6: { value: this.truncate(contract.customerName || '未知', 20) },
        thing7: { value: this.truncate(contract.workerName || '未知', 20) },
        thing4: { value: statusText },
        amount9: { value: `${contract.customerServiceFee || 0}.00` },
      };

      // 3. 获取access_token
      const accessToken = await this.getAccessToken();

      // 4. 逐个发送通知
      for (const user of usersToNotify) {
        await this.sendSubscribeMessage(accessToken, {
          touser: user.wechatOpenId,
          template_id: this.CONTRACT_SIGN_TEMPLATE_ID,
          page: `pages/contract-detail/index?id=${contract._id}`,
          data: messageData,
        }, user.name);
      }

      this.logger.log(`✅ 合同签署通知发送完成，共通知 ${usersToNotify.length} 人`);
    } catch (error) {
      this.logger.error('❌ 发送合同签署通知失败:', error.message);
    }
  }

  /**
   * 获取需要通知的用户列表（合同创建人 + 管理员）
   * 优先使用 user.wechatOpenId，如果没有则通过手机号关联 miniprogram_users 获取
   */
  private async getUsersToNotify(createdBy?: any): Promise<Array<{ wechatOpenId: string; name: string; role: string }>> {
    const users: Array<{ wechatOpenId: string; name: string; role: string }> = [];

    // 提取创建人ID（兼容字符串、ObjectId或对象）
    let createdById: string | undefined;
    if (createdBy) {
      if (typeof createdBy === 'string') {
        createdById = createdBy;
      } else if (createdBy._id) {
        // _id 可能是 ObjectId 或嵌套对象
        const idValue = createdBy._id;
        if (typeof idValue === 'string') {
          createdById = idValue;
        } else if (typeof idValue.toString === 'function') {
          createdById = idValue.toString();
        } else if (typeof idValue === 'object' && idValue !== null) {
          // 如果是对象，尝试获取其字符串值
          createdById = String(idValue);
        }
      } else if (typeof createdBy.toString === 'function' && createdBy.toString() !== '[object Object]') {
        // 可能是直接传入的 ObjectId
        createdById = createdBy.toString();
      }
    }
    this.logger.log(`📋 创建人ID: ${createdById || '无'}, 原始值类型: ${typeof createdBy}, _id类型: ${createdBy?._id ? typeof createdBy._id : 'N/A'}`);

    // 查找所有管理员和合同创建人
    const query: any = {
      active: true,
      $or: [
        { role: 'admin' },
        { role: '管理员' },
        ...(createdById ? [{ _id: createdById }] : []),
      ],
    };

    const allUsers = await this.userModel.find(query).select('_id name role phone wechatOpenId').lean().exec();
    this.logger.log(`📋 查询到 ${allUsers.length} 个管理员/创建人`);

    for (const user of allUsers) {
      const isCreator = createdById && user._id.toString() === createdById;
      const isAdmin = user.role === 'admin' || user.role === '管理员';

      if (!isCreator && !isAdmin) continue;

      let openId = user.wechatOpenId;

      // 如果 user 表没有 wechatOpenId，通过手机号查找 miniprogram_users 表
      if (!openId && user.phone) {
        const miniUser = await this.miniProgramUserModel.findOne({ phone: user.phone }).select('openid').lean().exec();
        if (miniUser?.openid) {
          openId = miniUser.openid;
          this.logger.log(`📱 通过手机号 ${user.phone} 找到 openId: ${openId}`);
        }
      }

      if (openId) {
        users.push({
          wechatOpenId: openId,
          name: user.name,
          role: isCreator ? '创建人' : '管理员',
        });
      } else {
        this.logger.warn(`⚠️ 用户 ${user.name} 没有绑定微信（无wechatOpenId且无手机号关联）`);
      }
    }

    this.logger.log(`📋 找到 ${users.length} 个需要通知的用户: ${users.map(u => `${u.name}(${u.role})`).join(', ')}`);
    return users;
  }

  /**
   * 发送订阅消息
   */
  private async sendSubscribeMessage(
    accessToken: string,
    messageData: {
      touser: string;
      template_id: string;
      page?: string;
      data: any;
    },
    userName?: string,
  ): Promise<boolean> {
    try {
      const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;

      const response = await axios.post(url, {
        touser: messageData.touser,
        template_id: messageData.template_id,
        page: messageData.page,
        data: messageData.data,
        miniprogram_state: 'formal', // formal=正式版, developer=开发版, trial=体验版
      });

      const result = response.data;

      if (result.errcode === 0) {
        this.logger.log(`✅ 订阅消息发送成功 - 用户: ${userName || messageData.touser}`);
        return true;
      } else if (result.errcode === 43101) {
        // 用户拒绝接受消息
        this.logger.warn(`⚠️ 用户 ${userName} 未订阅该消息模板 (errcode: 43101)`);
        return false;
      } else {
        this.logger.error(`❌ 订阅消息发送失败 - 用户: ${userName}, errcode: ${result.errcode}, errmsg: ${result.errmsg}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ 发送订阅消息异常 - 用户: ${userName}:`, error.message);
      return false;
    }
  }

  /**
   * 获取签署状态文本
   */
  private getStatusText(signerRole: 'customer' | 'worker' | 'both'): string {
    switch (signerRole) {
      case 'customer':
        return '雇主已签署，等待家政员签署';
      case 'worker':
        return '家政员已签署，等待雇主签署';
      case 'both':
        return '合同已签署完成';
      default:
        return '合同签署状态更新';
    }
  }

  /**
   * 截断字符串（微信订阅消息字段有长度限制）
   */
  private truncate(str: string, maxLength: number): string {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 1) + '…';
  }
}
