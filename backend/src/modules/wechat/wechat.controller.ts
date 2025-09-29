import { Controller, Get, Post, Body, Param, Query, Logger, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { WeChatService } from './wechat.service';
import { UsersService } from '../users/users.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('微信服务')
@Controller('wechat')
export class WeChatController {
  private readonly logger = new Logger(WeChatController.name);

  constructor(
    private readonly wechatService: WeChatService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * 生成员工绑定二维码
   */
  @Get('bind-qrcode/:userId')
  @ApiOperation({ summary: '生成员工绑定二维码' })
  @ApiResponse({ status: 200, description: '二维码生成成功' })
  async generateBindQRCode(@Param('userId') userId: string) {
    try {
      // 使用用户ID作为场景值
      const sceneStr = `bind_${userId}`;
      const qrCodeUrl = await this.wechatService.generateQRCode(sceneStr);
      
      return {
        success: true,
        data: {
          qrCodeUrl,
          sceneStr,
          expireTime: 7 * 24 * 3600, // 7天过期
        },
        message: '二维码生成成功'
      };
    } catch (error) {
      this.logger.error(`生成绑定二维码失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: '二维码生成失败',
        error: error.message
      };
    }
  }

  /**
   * 微信服务器验证
   */
  @Get('event')
  @Public()
  @ApiOperation({ summary: '微信服务器验证' })
  async verifyWeChatServer(@Query() query: any, @Res() res: Response) {
    const { signature, timestamp, nonce, echostr } = query;

    this.logger.log(`微信验证请求参数: signature=${signature}, timestamp=${timestamp}, nonce=${nonce}, echostr=${echostr}`);

    try {
      // 验证签名
      const isValid = this.wechatService.verifySignature(signature, timestamp, nonce);

      if (isValid) {
        this.logger.log('微信服务器验证成功');
        // 直接返回纯文本响应
        res.send(echostr);
      } else {
        this.logger.error(`微信服务器验证失败 - signature: ${signature}, timestamp: ${timestamp}, nonce: ${nonce}`);
        res.send('fail');
      }
    } catch (error) {
      this.logger.error('微信服务器验证异常:', error);
      res.send('fail');
    }
  }

  /**
   * 微信事件处理（关注、扫码等）
   */
  @Post('event')
  @Public()
  @ApiOperation({ summary: '微信事件处理' })
  async handleWeChatEvent(@Body() eventData: any) {
    try {
      this.logger.log(`收到微信事件: ${JSON.stringify(eventData)}`);

      const { Event, EventKey, FromUserName } = eventData;

      // 处理扫码关注事件
      if (Event === 'subscribe' && EventKey && EventKey.startsWith('qrscene_bind_')) {
        const userId = EventKey.replace('qrscene_bind_', '');
        await this.bindUserWechat(userId, FromUserName);
        return 'success';
      }

      // 处理已关注用户扫码事件
      if (Event === 'SCAN' && EventKey && EventKey.startsWith('bind_')) {
        const userId = EventKey.replace('bind_', '');
        await this.bindUserWechat(userId, FromUserName);
        return 'success';
      }

      return 'success';
    } catch (error) {
      this.logger.error(`处理微信事件失败: ${error.message}`, error.stack);
      return 'success'; // 微信要求返回success
    }
  }

  /**
   * 绑定用户微信
   */
  private async bindUserWechat(userId: string, openId: string) {
    try {
      // 获取微信用户信息
      const wechatUserInfo = await this.wechatService.getUserInfo(openId);
      
      // 更新用户微信信息
      await this.usersService.updateWeChatInfo(userId, {
        openId,
        nickname: wechatUserInfo.nickname,
        avatar: wechatUserInfo.headimgurl,
      });

      // 发送绑定成功消息
      await this.wechatService.sendTemplateMessage(
        openId,
        'BIND_SUCCESS_TEMPLATE_ID', // 需要配置绑定成功模板
        {
          first: { value: '微信绑定成功！', color: '#173177' },
          keyword1: { value: wechatUserInfo.nickname, color: '#173177' },
          keyword2: { value: new Date().toLocaleString(), color: '#173177' },
          remark: { value: '您将收到线索分配等重要通知。', color: '#FF6600' }
        }
      );

      this.logger.log(`用户 ${userId} 微信绑定成功，OpenID: ${openId}`);
    } catch (error) {
      this.logger.error(`绑定用户微信失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 测试发送消息
   */
  @Post('test-message')
  @ApiOperation({ summary: '测试发送消息' })
  async testSendMessage(@Body() body: { userId: string; message: string }) {
    try {
      const user = await this.usersService.findById(body.userId);
      if (!user || !user.wechatOpenId) {
        return {
          success: false,
          message: '用户未绑定微信'
        };
      }

      const result = await this.wechatService.sendTemplateMessage(
        user.wechatOpenId,
        'TEST_TEMPLATE_ID',
        {
          first: { value: '测试消息', color: '#173177' },
          keyword1: { value: body.message, color: '#173177' },
          remark: { value: '这是一条测试消息', color: '#FF6600' }
        }
      );

      return {
        success: result,
        message: result ? '消息发送成功' : '消息发送失败'
      };
    } catch (error) {
      this.logger.error(`测试发送消息失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: '消息发送失败',
        error: error.message
      };
    }
  }
}
