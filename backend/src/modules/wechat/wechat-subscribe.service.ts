import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import {
  WechatSubscribeCredit,
  WechatSubscribeCreditDocument,
} from './models/wechat-subscribe-credit.model';

interface SubscribeData {
  [key: string]: { value: string };
}

interface SendOptions {
  page?: string;
  miniprogram?: { appid: string; pagepath: string };
}

interface SendResult {
  success: boolean;
  reason?: string;
  errcode?: number;
}

/**
 * 服务号订阅通知服务
 * - 管理订阅额度（每次员工授权 = 一次额度）
 * - 调用微信 cgi-bin/message/subscribe/bizsend 接口下发通知
 */
@Injectable()
export class WechatSubscribeService {
  private readonly logger = new Logger(WechatSubscribeService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private accessTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    @InjectModel(WechatSubscribeCredit.name)
    private readonly creditModel: Model<WechatSubscribeCreditDocument>,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.get<string>('WECHAT_APPID') || '';
    this.appSecret = this.configService.get<string>('WECHAT_APPSECRET') || '';
    if (!this.appId || !this.appSecret) {
      this.logger.warn('⚠️ 服务号 WECHAT_APPID / WECHAT_APPSECRET 未配置，订阅通知将不可用');
    }
  }

  /**
   * 获取服务号 access_token（自带 7100s 缓存）
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > Date.now()) {
      return this.accessTokenCache.token;
    }
    const { data } = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid: this.appId,
        secret: this.appSecret,
      },
      timeout: 10000,
    });
    if (data.errcode) {
      this.logger.error(`access_token 获取失败: ${data.errcode} ${data.errmsg}`);
      throw new Error(`access_token 获取失败: ${data.errmsg}`);
    }
    this.accessTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    };
    return data.access_token;
  }

  /**
   * 增加订阅额度（前端订阅授权成功后回调）
   */
  async addCredit(
    openid: string,
    templateId: string,
    count = 1,
  ): Promise<WechatSubscribeCreditDocument> {
    const updated = await this.creditModel
      .findOneAndUpdate(
        { openid, templateId },
        {
          $inc: { remaining: count, totalSubscribed: count },
          $set: { lastSubscribedAt: new Date() },
          $setOnInsert: { openid, templateId },
        },
        { new: true, upsert: true },
      )
      .exec();
    this.logger.log(
      `订阅额度+${count}: openid=${openid}, tpl=${templateId}, 剩余=${updated.remaining}`,
    );
    return updated;
  }

  /**
   * 查询剩余额度
   */
  async getCredit(openid: string, templateId: string): Promise<number> {
    const doc = await this.creditModel.findOne({ openid, templateId }).lean().exec();
    return doc?.remaining || 0;
  }

  /**
   * 查询所有订阅额度记录（管理后台用）
   */
  async findAllCredits(): Promise<WechatSubscribeCredit[]> {
    return this.creditModel
      .find({})
      .sort({ lastSubscribedAt: -1, updatedAt: -1 })
      .lean()
      .exec();
  }

  /**
   * 发送订阅通知
   * 流程：原子扣减额度 → 调微信 bizsend → 失败回滚
   */
  async sendSubscribe(
    openid: string,
    templateId: string,
    data: SubscribeData,
    options?: SendOptions,
  ): Promise<SendResult> {
    if (!openid || !templateId) {
      return { success: false, reason: 'openid 或 templateId 为空' };
    }

    // 1. 原子扣减额度
    const consumed = await this.creditModel
      .findOneAndUpdate(
        { openid, templateId, remaining: { $gt: 0 } },
        { $inc: { remaining: -1 } },
        { new: true },
      )
      .exec();
    if (!consumed) {
      this.logger.warn(`订阅额度不足，跳过发送: openid=${openid}, tpl=${templateId}`);
      return { success: false, reason: 'no_credit' };
    }

    // 2. 调微信 bizsend
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/bizsend?access_token=${accessToken}`;
      const payload: any = { touser: openid, template_id: templateId, data };
      if (options?.page) payload.page = options.page;
      if (options?.miniprogram) payload.miniprogram = options.miniprogram;

      const { data: resp } = await axios.post(url, payload, { timeout: 10000 });

      if (resp.errcode === 0) {
        await this.creditModel
          .updateOne(
            { openid, templateId },
            { $inc: { totalSent: 1 }, $set: { lastSentAt: new Date() } },
          )
          .exec();
        this.logger.log(`订阅通知发送成功: openid=${openid}, tpl=${templateId}`);
        return { success: true };
      }

      // 微信返回错误，回滚额度
      await this.creditModel
        .updateOne({ openid, templateId }, { $inc: { remaining: 1 } })
        .exec();
      this.logger.error(`订阅通知发送失败: ${resp.errcode} ${resp.errmsg}`);
      return { success: false, errcode: resp.errcode, reason: resp.errmsg };
    } catch (error) {
      // 网络异常，回滚额度
      await this.creditModel
        .updateOne({ openid, templateId }, { $inc: { remaining: 1 } })
        .exec();
      this.logger.error(`订阅通知发送异常: ${error.message}`, error.stack);
      return { success: false, reason: error.message };
    }
  }

  /**
   * 业务封装：发送线索分配通知
   */
  async sendLeadAssignNotify(
    openid: string,
    payload: {
      customerName: string;
      assignedAt: Date | string;
      assignerName?: string;
      page?: string;
    },
  ): Promise<SendResult> {
    const templateId = this.configService.get<string>('WECHAT_TPL_LEAD_ASSIGN');
    if (!templateId) {
      this.logger.warn('未配置 WECHAT_TPL_LEAD_ASSIGN，跳过发送');
      return { success: false, reason: 'template_not_configured' };
    }

    const assignedAtFormatted =
      typeof payload.assignedAt === 'string'
        ? payload.assignedAt
        : this.formatDateTime(payload.assignedAt);

    return this.sendSubscribe(
      openid,
      templateId,
      {
        thing1: { value: this.truncateThing(payload.customerName || '-') },
        time3: { value: assignedAtFormatted },
        thing4: { value: this.truncateThing(payload.assignerName || '系统分配') },
      },
      payload.page ? { page: payload.page } : undefined,
    );
  }

  /** 微信 thing 类型 ≤ 20 字符 */
  private truncateThing(str: string, max = 20): string {
    if (!str) return '-';
    return str.length > max ? str.substring(0, max - 1) + '…' : str;
  }

  /** 微信 time 类型："YYYY年MM月DD日 HH:mm" */
  private formatDateTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
