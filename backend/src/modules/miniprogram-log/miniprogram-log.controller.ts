import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppLogger } from '../../common/logging/app-logger';

/**
 * 小程序 H5 页面访问日志控制器
 */
@ApiTags('小程序日志')
@Controller('miniprogram-access-log')
export class MiniprogramLogController {
  private readonly logger = new AppLogger('MiniprogramAccessLog');

  @Post()
  @ApiOperation({ summary: '记录小程序 H5 页面访问日志' })
  @ApiResponse({ status: 200, description: '日志记录成功' })
  async logAccess(@Body() logData: any) {
    try {
      const {
        url,
        fileName,
        environment,
        queryParams,
        userAgent,
        isWechat,
        isMiniProgram,
        referrer,
        timestamp,
        event,
        stayDurationSeconds,
      } = logData;

      const source = isMiniProgram ? 'miniprogram_webview' : isWechat ? 'wechat_browser' : 'normal_browser';

      this.logger.info('miniprogram.page.access', {
        source,
        fileName,
        url,
        environment,
        queryParams,
        referrer,
        userAgent,
        clientTimestamp: timestamp,
        ...(event === 'page_unload' ? { event, stayDurationSeconds } : { event }),
      });

      return {
        success: true,
        message: '日志记录成功',
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('miniprogram.page.access.failed', error);
      return {
        success: false,
        message: '日志记录失败',
        error: error.message,
      };
    }
  }
}

