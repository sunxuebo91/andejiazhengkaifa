/**
 * 微信小程序 WebView 相关类型声明
 */

interface WechatMiniProgramPostMessageData {
  type: 'joined' | 'leave' | 'error' | 'message';
  roomId?: string;
  userName?: string;
  message?: string;
  [key: string]: any;
}

interface WechatMiniProgram {
  /**
   * 向小程序发送消息
   * @param options 消息选项
   */
  postMessage(options: { data: WechatMiniProgramPostMessageData }): void;

  /**
   * 跳转到小程序页面
   * @param options 跳转选项
   */
  navigateTo(options: { url: string; success?: () => void; fail?: (error: any) => void }): void;

  /**
   * 返回小程序上一页
   * @param options 返回选项
   */
  navigateBack(options?: { delta?: number; success?: () => void; fail?: (error: any) => void }): void;

  /**
   * 重定向到小程序页面
   * @param options 重定向选项
   */
  redirectTo(options: { url: string; success?: () => void; fail?: (error: any) => void }): void;

  /**
   * 获取小程序环境信息
   * @param callback 回调函数
   */
  getEnv(callback: (res: { miniprogram: boolean }) => void): void;
}

interface WechatSDK {
  /**
   * 小程序相关API
   */
  miniProgram: WechatMiniProgram;

  /**
   * 初始化微信SDK配置
   * @param config 配置选项
   */
  config(config: {
    debug?: boolean;
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
    jsApiList: string[];
  }): void;

  /**
   * 微信SDK准备就绪回调
   * @param callback 回调函数
   */
  ready(callback: () => void): void;

  /**
   * 微信SDK错误回调
   * @param callback 回调函数
   */
  error(callback: (error: any) => void): void;
}

declare global {
  interface Window {
    /**
     * 微信SDK对象
     */
    wx?: WechatSDK;

    /**
     * 微信小程序环境标识
     */
    __wxjs_environment?: 'miniprogram';
  }
}

export {};

