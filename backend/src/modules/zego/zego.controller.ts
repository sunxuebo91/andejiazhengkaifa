import { Controller, Post, Get, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ZegoService } from './zego.service';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { GenerateGuestTokenDto } from './dto/generate-guest-token.dto';
import { DismissRoomDto } from './dto/dismiss-room.dto';
import { CheckRoomDto } from './dto/check-room.dto';
import { PushTeleprompterDto, ControlTeleprompterDto, GetTeleprompterDto } from './dto/teleprompter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('zego')
export class ZegoController {
  constructor(private readonly zegoService: ZegoService) {}

  /**
   * 生成 ZEGO Kit Token（需要登录）
   */
  @Post('generate-token')
  @UseGuards(JwtAuthGuard)
  generateToken(@Body() dto: GenerateTokenDto, @Request() req) {
    console.log('生成Token请求:', {
      dtoUserId: dto.userId,
      jwtUserId: req.user.userId,
      roomId: dto.roomId,
      userName: dto.userName,
    });

    const token = this.zegoService.generateKitToken(
      dto.userId,
      dto.roomId,
      dto.userName,
      dto.expireTime,
    );

    // 创建房间（主持人）- 使用 JWT 中的 userId 作为主持人ID
    this.zegoService.createRoom(dto.roomId, req.user.userId);

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
    // 检查房间状态
    const roomStatus = this.zegoService.checkRoom(dto.roomId);

    if (roomStatus.isDismissed) {
      throw new HttpException({
        success: false,
        message: '该房间已被解散，无法加入',
        error: 'ROOM_DISMISSED',
      }, HttpStatus.FORBIDDEN);
    }

    // 使用前端传来的 userId（访客 ID）
    const token = this.zegoService.generateKitToken(
      dto.userId,
      dto.roomId,
      dto.userName,
      dto.expireTime,
    );

    // 用户加入房间
    const canJoin = this.zegoService.joinRoom(dto.roomId, dto.userId);

    if (!canJoin) {
      throw new HttpException({
        success: false,
        message: '无法加入房间，房间可能已被解散',
        error: 'CANNOT_JOIN_ROOM',
      }, HttpStatus.FORBIDDEN);
    }

    return {
      success: true,
      data: {
        token,
        appId: this.zegoService.getConfig().appId,
      },
    };
  }

  /**
   * 解散房间（需要登录，仅主持人）- 强制踢出所有用户
   */
  @Post('dismiss-room')
  @UseGuards(JwtAuthGuard)
  async dismissRoom(@Body() dto: DismissRoomDto, @Request() req) {
    const userId = req.user.userId;
    console.log('解散房间请求:', {
      roomId: dto.roomId,
      requestUserId: userId,
      userInfo: req.user,
    });

    const success = await this.zegoService.dismissRoom(dto.roomId, userId);

    if (!success) {
      throw new HttpException({
        success: false,
        message: '解散房间失败，您可能不是房间主持人或房间不存在',
        error: 'DISMISS_FAILED',
      }, HttpStatus.FORBIDDEN);
    }

    return {
      success: true,
      message: '房间已解散，所有用户已被强制踢出',
    };
  }

  /**
   * 检查房间状态（公开接口）
   */
  @Post('check-room')
  checkRoom(@Body() dto: CheckRoomDto) {
    const status = this.zegoService.checkRoom(dto.roomId);

    return {
      success: true,
      data: status,
    };
  }

  /**
   * 用户离开房间（公开接口）
   */
  @Post('leave-room')
  leaveRoom(@Body() body: { roomId: string; userId: string }) {
    this.zegoService.leaveRoom(body.roomId, body.userId);

    return {
      success: true,
      message: '已离开房间',
    };
  }

  /**
   * 推送提词器内容（需要登录，仅主持人）
   */
  @Post('push-teleprompter')
  @UseGuards(JwtAuthGuard)
  pushTeleprompter(@Body() dto: PushTeleprompterDto, @Request() req) {
    const success = this.zegoService.pushTeleprompterContent(
      dto.roomId,
      dto.content,
      dto.targetUserIds,
      dto.scrollSpeed,
      dto.displayHeight,
    );

    if (!success) {
      throw new HttpException({
        success: false,
        message: '推送提词内容失败，房间不存在或已解散',
        error: 'PUSH_FAILED',
      }, HttpStatus.BAD_REQUEST);
    }

    return {
      success: true,
      message: '提词内容已推送',
    };
  }

  /**
   * 控制提词器（需要登录，仅主持人）
   */
  @Post('control-teleprompter')
  @UseGuards(JwtAuthGuard)
  controlTeleprompter(@Body() dto: ControlTeleprompterDto, @Request() req) {
    const success = this.zegoService.controlTeleprompter(
      dto.roomId,
      dto.targetUserIds,
      dto.action,
    );

    if (!success) {
      throw new HttpException({
        success: false,
        message: '控制提词器失败，房间不存在或已解散',
        error: 'CONTROL_FAILED',
      }, HttpStatus.BAD_REQUEST);
    }

    return {
      success: true,
      message: `提词器${dto.action}成功`,
    };
  }

  /**
   * 获取提词器消息（公开接口，用于轮询）
   */
  @Post('get-teleprompter')
  getTeleprompter(@Body() dto: GetTeleprompterDto) {
    const messages = this.zegoService.getTeleprompterMessages(
      dto.roomId,
      dto.userId,
      dto.lastTimestamp,
    );

    return {
      success: true,
      data: messages,
    };
  }
}

