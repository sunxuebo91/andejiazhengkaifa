import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ZegoService } from './zego.service';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { GenerateGuestTokenDto } from './dto/generate-guest-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('zego')
export class ZegoController {
  constructor(private readonly zegoService: ZegoService) {}

  /**
   * 生成 ZEGO Kit Token（需要登录）
   */
  @Post('generate-token')
  @UseGuards(JwtAuthGuard)
  generateToken(@Body() dto: GenerateTokenDto) {
    const token = this.zegoService.generateKitToken(
      dto.userId,
      dto.roomId,
      dto.userName,
      dto.expireTime,
    );

    return {
      success: true,
      data: {
        token,
        appId: this.zegoService.getConfig().appId,
      },
    };
  }

  /**
   * 获取 ZEGO 配置（需要登录）
   */
  @Get('config')
  @UseGuards(JwtAuthGuard)
  getConfig() {
    return {
      success: true,
      data: this.zegoService.getConfig(),
    };
  }

  /**
   * 生成访客 Token（公开接口，无需认证）
   * 用于访客（客户/阿姨）通过邀请链接加入视频面试
   */
  @Post('generate-guest-token')
  generateGuestToken(@Body() dto: GenerateGuestTokenDto) {
    // 使用前端传来的 userId（访客 ID）
    const token = this.zegoService.generateKitToken(
      dto.userId,
      dto.roomId,
      dto.userName,
      dto.expireTime,
    );

    return {
      success: true,
      data: {
        token,
        appId: this.zegoService.getConfig().appId,
      },
    };
  }
}

