import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * 小程序 H5 页面访问日志控制器
 */
@ApiTags('小程序日志')
@Controller('miniprogram-access-log')
export class MiniprogramLogController {
  private readonly logger = new Logger('MiniprogramAccessLog');

  @Post()
  @ApiOperation({ summary: '记录小程序 H5 页面访问日志' })
  @ApiResponse({ status: 200, description: '日志记录成功' })
  async logAccess(@Body() logData: any) {
    try {
      const {
        url,
        pathname,
        fileName,
        environment,
        queryParams,
        userAgent,
        isWechat,
        isMiniProgram,
        referrer,
        timestamp,
        event,
        stayDuration,
        stayDurationSeconds,
      } = logData;

      // 🔥 根据环境类型使用不同的日志样式
      if (isMiniProgram) {
        this.logger.log(`
╔════════════════════════════════════════════════════════════════
║ 🎯 小程序 WebView 访问
╠════════════════════════════════════════════════════════════════
║ 📄 访问文件: ${fileName}
║ 🔗 完整URL: ${url}
║ 🌐 环境: ${environment}
║ 📋 Query参数: ${JSON.stringify(queryParams)}
║ 🕐 时间: ${new Date(timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
║ 📱 来源: ${referrer}
${event === 'page_unload' ? `║ ⏱️  停留时间: ${stayDurationSeconds}秒` : ''}
╚════════════════════════════════════════════════════════════════
        `);
      } else if (isWechat) {
        this.logger.log(`
╔════════════════════════════════════════════════════════════════
║ 📱 微信浏览器访问
╠════════════════════════════════════════════════════════════════
║ 📄 访问文件: ${fileName}
║ 🔗 完整URL: ${url}
║ 🌐 环境: ${environment}
║ 📋 Query参数: ${JSON.stringify(queryParams)}
║ 🕐 时间: ${new Date(timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
║ 📱 来源: ${referrer}
${event === 'page_unload' ? `║ ⏱️  停留时间: ${stayDurationSeconds}秒` : ''}
╚════════════════════════════════════════════════════════════════
        `);
      } else {
        this.logger.log(`
╔════════════════════════════════════════════════════════════════
║ 🌐 普通浏览器访问
╠════════════════════════════════════════════════════════════════
║ 📄 访问文件: ${fileName}
║ 🔗 完整URL: ${url}
║ 🌐 环境: ${environment}
║ 📋 Query参数: ${JSON.stringify(queryParams)}
║ 🕐 时间: ${new Date(timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
║ 📱 来源: ${referrer}
${event === 'page_unload' ? `║ ⏱️  停留时间: ${stayDurationSeconds}秒` : ''}
╚════════════════════════════════════════════════════════════════
        `);
      }

      // 记录详细的 JSON 格式日志（便于后续分析）
      this.logger.debug(JSON.stringify(logData, null, 2));

      return {
        success: true,
        message: '日志记录成功',
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('记录访问日志失败:', error);
      return {
        success: false,
        message: '日志记录失败',
        error: error.message,
      };
    }
  }
}

