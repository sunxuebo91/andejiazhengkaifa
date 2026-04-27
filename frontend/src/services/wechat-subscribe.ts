import { apiService } from './api';

export interface CreditInfo {
  bound: boolean;
  openid: string | null;
  remaining: number;
  templateId: string;
  appid: string;
}

export interface JsSdkSignature {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
}

/**
 * 获取服务号 OAuth 授权 URL（前端引导跳转）
 */
export const getOAuthAuthorizeUrl = async () => {
  return apiService.post<{ url: string }>('/api/wechat/oauth/authorize-url');
};

/**
 * 签发 PC 扫码用 handoff 短期 JWT（10 分钟）
 */
export const issueHandoffToken = async () => {
  return apiService.post<{ token: string; expiresIn: number }>('/api/wechat/subscribe/issue-handoff');
};

/**
 * 构建服务号订阅通知授权 URL（一次性订阅，URL 跳转方式）
 * 用户在微信内点击订阅按钮后，前端整页跳转到此 URL；用户允许后微信 302 回 redirectUrl 并附带 ?action=confirm&...
 */
export const buildSubscribeUrl = async (redirectUrl?: string) => {
  return apiService.post<{ url: string }>('/api/wechat/subscribe/build-url', { redirectUrl });
};

/**
 * 查询当前用户订阅通知额度
 */
export const getSubscribeCredit = async () => {
  return apiService.get<CreditInfo>('/api/wechat/subscribe/credit');
};

/**
 * 订阅授权回调（前端 wx.openSubscribeNotify accept 后调用）
 */
export const confirmSubscribe = async (
  action: 'accept' | 'reject',
  templateId?: string,
  count = 1,
) => {
  return apiService.post<{ remaining: number; totalSubscribed?: number }>(
    '/api/wechat/subscribe/confirm',
    { action, templateId, count },
  );
};

/**
 * 获取 JS-SDK 签名
 */
export const getJsSdkSignature = async (url: string) => {
  return apiService.get<JsSdkSignature>('/api/wechat/jssdk/signature', { url });
};

export interface SubscriberRow {
  userId: string;
  username: string;
  name: string;
  role: string;
  department?: string;
  active: boolean;
  wechatOpenId: string;
  wechatNickname?: string;
  remaining: number;
  totalSubscribed: number;
  totalSent: number;
  lastSubscribedAt: string | null;
  lastSentAt: string | null;
}

/**
 * 管理后台：获取已绑定服务号员工的订阅列表
 */
export const listSubscribers = async () => {
  return apiService.get<{
    list: SubscriberRow[];
    total: number;
    templateId: string;
    appid: string;
  }>('/api/wechat/subscribe/subscribers');
};

/**
 * 检测是否在微信内置浏览器
 */
export const isInWechat = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /micromessenger/i.test(navigator.userAgent);
};

/**
 * 动态加载微信 JS-SDK
 */
let jssdkLoaded: Promise<void> | null = null;
export const loadWechatJsSdk = (): Promise<void> => {
  if (jssdkLoaded) return jssdkLoaded;
  jssdkLoaded = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if ((window as any).wx) return resolve();
    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('JS-SDK 加载失败'));
    document.head.appendChild(script);
  });
  return jssdkLoaded;
};

/**
 * 初始化 JS-SDK（wx.config）
 */
export const setupWechatJsSdk = async (currentUrl: string): Promise<void> => {
  await loadWechatJsSdk();
  const resp = await getJsSdkSignature(currentUrl);
  if (!resp.success || !resp.data) {
    throw new Error('获取签名失败');
  }
  const { appId, timestamp, nonceStr, signature } = resp.data;
  return new Promise((resolve, reject) => {
    const wx = (window as any).wx;
    wx.config({
      debug: false,
      appId,
      timestamp,
      nonceStr,
      signature,
      jsApiList: [],
      openTagList: ['wx-open-subscribe'],
    });
    wx.ready(() => resolve());
    wx.error((err: any) => reject(new Error(err?.errMsg || 'wx.config 失败')));
  });
};

/**
 * 调起服务号订阅通知授权弹窗（wx.openSubscribeMsg 新签名，专用于"订阅通知"模板）
 * 返回 'accept' | 'reject' | 'fail'
 */
export const openSubscribeMsg = (params: {
  appid: string;
  templateId: string;
  scene?: string;
  reserved?: string;
}): Promise<'accept' | 'reject' | 'fail'> => {
  return new Promise((resolve) => {
    const wx = (window as any).wx;
    if (!wx?.openSubscribeMsg) {
      resolve('fail');
      return;
    }
    wx.openSubscribeMsg(
      {
        appid: params.appid,
        scene: params.scene || '1000',
        templateId: params.templateId,
        reserved: params.reserved || '',
      },
      (res: any) => {
        const errMsg: string = res?.errMsg || '';
        if (/:ok$/.test(errMsg) || /:confirm$/.test(errMsg) || res?.action === 'confirm') {
          resolve('accept');
        } else if (/:cancel$/.test(errMsg) || /:reject$/.test(errMsg) || res?.action === 'cancel') {
          resolve('reject');
        } else {
          resolve('fail');
        }
      },
    );
  });
};
