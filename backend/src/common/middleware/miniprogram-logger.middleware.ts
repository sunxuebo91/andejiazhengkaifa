import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * 小程序 H5 页面访问日志中间件
 * 记录所有访问 /miniprogram/ 路径的请求
 */
@Injectable()
export class MiniprogramLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('MiniprogramAccess');

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

    // 🔥 重点日志：用不同颜色和标记区分
    if (isMiniProgram) {
      this.logger.log(`
╔════════════════════════════════════════════════════════════════
║ 🎯 小程序 WebView 访问
╠════════════════════════════════════════════════════════════════
║ 📄 访问文件: ${fileName}
║ 🔗 完整URL: ${originalUrl}
║ 📱 IP地址: ${realIp}
║ 🌐 环境: 小程序 WebView
║ 📋 Query参数: ${JSON.stringify(query)}
║ 🕐 时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
╚════════════════════════════════════════════════════════════════
      `);
    } else if (isWechat) {
      this.logger.log(`
╔════════════════════════════════════════════════════════════════
║ 📱 微信浏览器访问
╠════════════════════════════════════════════════════════════════
║ 📄 访问文件: ${fileName}
║ 🔗 完整URL: ${originalUrl}
║ 📱 IP地址: ${realIp}
║ 🌐 环境: 微信浏览器
║ 📋 Query参数: ${JSON.stringify(query)}
║ 🕐 时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
╚════════════════════════════════════════════════════════════════
      `);
    } else {
      this.logger.log(`
╔════════════════════════════════════════════════════════════════
║ 🌐 普通浏览器访问
╠════════════════════════════════════════════════════════════════
║ 📄 访问文件: ${fileName}
║ 🔗 完整URL: ${originalUrl}
║ 📱 IP地址: ${realIp}
║ 🌐 环境: 普通浏览器
║ 📋 Query参数: ${JSON.stringify(query)}
║ 🕐 时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
╚════════════════════════════════════════════════════════════════
      `);
    }

    // 记录详细的 JSON 格式日志（便于后续分析）
    this.logger.debug(JSON.stringify(logInfo, null, 2));

    // 继续处理请求
    next();
  }
}

