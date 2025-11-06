import { Controller, Post, Get, Body, Logger, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TrtcService } from './trtc.service';
import { GetUserSigDto } from './dto/get-user-sig.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('TRTC视频服务')
@Controller('trtc')
@UseGuards(JwtAuthGuard)
export class TrtcController {
  private readonly logger = new Logger(TrtcController.name);

  constructor(private readonly trtcService: TrtcService) {}

  @Post('getUserSig')
  @ApiOperation({ summary: '获取 TRTC UserSig' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async getUserSig(@Body() dto: GetUserSigDto, @Request() req) {
    try {
      this.logger.log(`用户 ${req.user.userId} 请求获取 UserSig，目标用户: ${dto.userId}`);
      
      const userSig = this.trtcService.generateUserSig(
        dto.userId,
        dto.expire || 604800
      );

      const config = this.trtcService.getSdkConfig();

      return {
        success: true,
        data: {
          sdkAppId: config.sdkAppId,
          userId: dto.userId,
          userSig: userSig,
          expire: dto.expire || 604800,
        },
        message: '获取 UserSig 成功',
      };
    } catch (error) {
      this.logger.error(`获取 UserSig 失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || '获取 UserSig 失败',
      };
    }
  }

  @Get('config')
  @ApiOperation({ summary: '获取 TRTC SDK 配置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getConfig() {
    try {
      const config = this.trtcService.getSdkConfig();
      
      return {
        success: true,
        data: config,
        message: '获取配置成功',
      };
    } catch (error) {
      this.logger.error(`获取配置失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || '获取配置失败',
      };
    }
  }
}

