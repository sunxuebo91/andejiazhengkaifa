import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../logging/app-logger';

/**
 * 小程序 H5 页面访问日志中间件
 * 记录所有访问 /miniprogram/ 路径的请求
 */
@Injectable()
export class MiniprogramLoggerMiddleware implements NestMiddleware {
  private readonly logger = new AppLogger('MiniprogramAccess');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, headers, ip, query } = req;
    
    // 获取真实 IP（考虑代理）
    const realIp = 
      (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (headers['x-real-ip'] as string) ||
      ip ||
      req.connection?.remoteAddress ||
      'unknown';

    // 获取 User-Agent
    const userAgent = headers['user-agent'] || 'unknown';

    // 判断是否在微信中
    const isWechat = /MicroMessenger/i.test(userAgent);
    const isMiniProgram = /miniProgram/i.test(userAgent);

    // 提取访问的 HTML 文件名
    const urlPath = originalUrl.split('?')[0];
    const fileName = urlPath.split('/').pop() || 'unknown';

    // 构建日志信息
    const logInfo = {
      timestamp: new Date().toISOString(),
      method,
      url: originalUrl,
      urlPath,
      fileName,
      query,
      ip: realIp,
      userAgent,
      isWechat,
      isMiniProgram,
      referer: headers['referer'] || 'direct',
      environment: isMiniProgram ? '小程序WebView' : isWechat ? '微信浏览器' : '普通浏览器',
    };

    this.logger.log('miniprogram.access', logInfo);

    // 继续处理请求
    next();
  }
}
