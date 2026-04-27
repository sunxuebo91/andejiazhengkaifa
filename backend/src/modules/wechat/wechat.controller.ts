import { Controller, Get, Post, Body, Param, Query, Logger, Res, Req, UseGuards, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';
import { WeChatService } from './wechat.service';
import { WechatOAuthService } from './wechat-oauth.service';
import { WechatSubscribeService } from './wechat-subscribe.service';
import { UsersService } from '../users/users.service';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('微信服务')
@Controller('wechat')
export class WeChatController {
  private readonly logger = new Logger(WeChatController.name);

  constructor(
    private readonly wechatService: WeChatService,
    private readonly oauthService: WechatOAuthService,
    private readonly subscribeService: WechatSubscribeService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // ==================== 服务号 OAuth 网页授权 ====================

  /**
   * 生成 OAuth 授权 URL（前端引导用户跳转微信完成授权）
   */
  @Post('oauth/authorize-url')
  @ApiOperation({ summary: '生成服务号网页授权 URL' })
  async getAuthorizeUrl(@Req() req: Request) {
    const userId = (req as any).user?.userId || (req as any).user?._id || (req as any).user?.id;
    if (!userId) {
      throw new UnauthorizedException('未登录');
    }
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://crm.andejiazheng.com';
    const state = this.oauthService.signState(String(userId));
    const redirectUri = `${frontendUrl}/api/wechat/oauth/callback`;
    const url = this.oauthService.buildAuthorizeUrl(state, redirectUri, 'snsapi_base');
    return { success: true, data: { url } };
  }

  /**
   * 微信回调：用 code 换 openid，绑定到 state 中的 userId，302 跳回订阅页
   */
  @Get('oauth/callback')
  @Public()
  @ApiOperation({ summary: '服务号 OAuth 回调' })
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://crm.andejiazheng.com';
    const subscribePage = `${frontendUrl}/wechat/subscribe`;

    if (!code || !state) {
      return res.redirect(`${subscribePage}?bind_error=missing_params`);
    }
    const verified = this.oauthService.verifyState(state);
    if (!verified) {
      this.logger.warn('OAuth state 验证失败');
      return res.redirect(`${subscribePage}?bind_error=invalid_state`);
    }
    const result = await this.oauthService.exchangeCodeForOpenid(code);
    if (!result?.openid) {
      return res.redirect(`${subscribePage}?bind_error=exchange_failed`);
    }
    try {
      await this.usersService.updateWeChatInfo(verified.userId, { openId: result.openid });
      this.logger.log(`员工绑定服务号 openid 成功: userId=${verified.userId}, openid=${result.openid}`);
      return res.redirect(`${subscribePage}?bound=1`);
    } catch (error) {
      this.logger.error(`绑定 openid 失败: ${error.message}`);
      return res.redirect(`${subscribePage}?bind_error=update_failed`);
    }
  }

  // ==================== JS-SDK 签名 ====================

  /**
   * JS-SDK 签名（前端 wx.config 用）
   */
  @Get('jssdk/signature')
  @ApiOperation({ summary: '获取 JS-SDK 签名' })
  async getJsSdkSignature(@Query('url') url: string) {
    if (!url) throw new BadRequestException('缺少 url 参数');
    const sig = await this.oauthService.signJsApi(url);
    return { success: true, data: sig };
  }

  // ==================== 订阅通知额度 ====================

  /**
   * 查询当前用户订阅通知额度
   */
  @Get('subscribe/credit')
  @ApiOperation({ summary: '查询订阅通知额度' })
  async getCredit(@Req() req: Request) {
    const userId = (req as any).user?.userId || (req as any).user?._id || (req as any).user?.id;
    if (!userId) throw new UnauthorizedException('未登录');
    const user = await this.usersService.findById(String(userId));
    if (!user) throw new UnauthorizedException('用户不存在');
    const templateId = this.configService.get<string>('WECHAT_TPL_LEAD_ASSIGN') || '';
    const appid = this.configService.get<string>('WECHAT_APPID') || '';
    if (!user.wechatOpenId) {
      return { success: true, data: { bound: false, openid: null, remaining: 0, templateId, appid } };
    }
    const remaining = templateId ? await this.subscribeService.getCredit(user.wechatOpenId, templateId) : 0;
    return {
      success: true,
      data: { bound: true, openid: user.wechatOpenId, remaining, templateId, appid },
    };
  }

  /**
   * 管理后台：列出所有已绑定服务号的员工，附带订阅额度信息
   */
  @Get('subscribe/subscribers')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '管理后台 - 订阅消息列表' })
  async listSubscribers() {
    const templateId = this.configService.get<string>('WECHAT_TPL_LEAD_ASSIGN') || '';
    const appid = this.configService.get<string>('WECHAT_APPID') || '';
    const [users, credits] = await Promise.all([
      this.usersService.findUsersWithWeChat(),
      this.subscribeService.findAllCredits(),
    ]);
    const creditByKey = new Map<string, any>();
    for (const c of credits) {
      creditByKey.set(`${c.openid}::${c.templateId}`, c);
    }
    const list = users.map((u) => {
      const openid = u.wechatOpenId || '';
      const c = templateId ? creditByKey.get(`${openid}::${templateId}`) : undefined;
      return {
        userId: String(u._id),
        username: u.username,
        name: u.name,
        role: u.role,
        department: u.department,
        active: u.active,
        wechatOpenId: openid,
        wechatNickname: u.wechatNickname,
        remaining: c?.remaining || 0,
        totalSubscribed: c?.totalSubscribed || 0,
        totalSent: c?.totalSent || 0,
        lastSubscribedAt: c?.lastSubscribedAt || null,
        lastSentAt: c?.lastSentAt || null,
      };
    });
    return { success: true, data: { list, total: list.length, templateId, appid } };
  }

  /**
   * 签发 PC 扫码 handoff 短期 JWT（10 分钟），用于二维码授权场景
   * 员工在 PC 上点"显示二维码" → 后端签发 token → 前端把 token 编入二维码 URL →
   * 员工微信扫码打开 H5 → H5 把 token 写到 localStorage 充当登录态
   */
  @Post('subscribe/issue-handoff')
  @ApiOperation({ summary: '签发扫码 handoff 短期 JWT（10 分钟）' })
  async issueHandoff(@Req() req: Request) {
    const u = (req as any).user;
    const userId = u?.userId || u?._id || u?.id;
    if (!userId) throw new UnauthorizedException('未登录');
    const user = await this.usersService.findById(String(userId));
    if (!user) throw new UnauthorizedException('用户不存在');
    const token = this.jwtService.sign(
      {
        sub: String(userId),
        username: user.username,
        role: user.role,
        permissions: user.permissions || [],
        scope: 'wechat-handoff',
      },
      { expiresIn: '10m' },
    );
    return { success: true, data: { token, expiresIn: 600 } };
  }

  /**
   * 构建服务号订阅通知 URL（员工点击「订阅通知」按钮时由前端调用，然后整个页面跳转到该 URL）
   * 用户允许后微信会 302 回到 redirect_url，并附带 ?action=confirm&template_id=&scene=&openid=&reserved=
   */
  @Post('subscribe/build-url')
  @ApiOperation({ summary: '构建服务号订阅通知授权 URL' })
  async buildSubscribeUrl(
    @Req() req: Request,
    @Body() body: { redirectUrl?: string },
  ) {
    const userId = (req as any).user?.userId || (req as any).user?._id || (req as any).user?.id;
    if (!userId) throw new UnauthorizedException('未登录');
    const templateId = this.configService.get<string>('WECHAT_TPL_LEAD_ASSIGN') || '';
    if (!templateId) throw new BadRequestException('未配置模板 ID');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://crm.andejiazheng.com';
    const redirectUrl = body.redirectUrl || `${frontendUrl}/wechat/subscribe`;
    const url = this.oauthService.buildSubscribeNotifyUrl({
      templateId,
      redirectUrl,
      scene: 1000,
      reserved: this.oauthService.signState(String(userId), 1800),
    });
    return { success: true, data: { url } };
  }

  /**
   * 订阅授权回调：前端在 ?action=confirm 回跳后调用，+1 额度
   */
  @Post('subscribe/confirm')
  @ApiOperation({ summary: '订阅授权回调（accept 时 +1 额度）' })
  async confirmSubscribe(
    @Req() req: Request,
    @Body() body: { templateId?: string; action: 'accept' | 'reject'; count?: number },
  ) {
    const userId = (req as any).user?.userId || (req as any).user?._id || (req as any).user?.id;
    if (!userId) throw new UnauthorizedException('未登录');
    const user = await this.usersService.findById(String(userId));
    if (!user?.wechatOpenId) {
      throw new BadRequestException('未绑定服务号 openid');
    }
    if (body.action !== 'accept') {
      return { success: true, data: { remaining: 0, skipped: true } };
    }
    const templateId = body.templateId || this.configService.get<string>('WECHAT_TPL_LEAD_ASSIGN') || '';
    if (!templateId) throw new BadRequestException('未配置模板 ID');
    const count = Math.max(1, Math.min(body.count || 1, 10));
    const updated = await this.subscribeService.addCredit(user.wechatOpenId, templateId, count);
    return { success: true, data: { remaining: updated.remaining, totalSubscribed: updated.totalSubscribed } };
  }

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
