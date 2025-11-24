import { Controller, Post, Get, Body, UseGuards, Request, HttpException, HttpStatus, Req } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ZegoService } from './zego.service';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { GenerateGuestTokenDto } from './dto/generate-guest-token.dto';
import { DismissRoomDto } from './dto/dismiss-room.dto';
import { CheckRoomDto } from './dto/check-room.dto';
import { PushTeleprompterDto, ControlTeleprompterDto, GetTeleprompterDto, QuickStartTeleprompterDto } from './dto/teleprompter.dto';
import { KickUserDto } from './dto/kick-user.dto';
import { RemoteControlDto } from './dto/remote-control.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewService } from '../interview/interview.service';

@Controller('zego')
export class ZegoController {
  constructor(
    private readonly zegoService: ZegoService,
    private readonly interviewService: InterviewService,
  ) {}

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

    // 创建房间（主持人）- 使用前端传递的 userId（user_xxx 格式）作为主持人ID
    this.zegoService.createRoom(dto.roomId, dto.userId);

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
  async generateGuestToken(@Body() dto: GenerateGuestTokenDto) {
    console.log('🔍 生成访客Token请求:', {
      userId: dto.userId,
      userIdLength: dto.userId?.length,
      userIdType: typeof dto.userId,
      roomId: dto.roomId,
      userName: dto.userName,
      role: dto.role,
    });

    // 🔥 先检查数据库中的房间状态
    try {
      // TODO: 修复 getRoomByRoomId 方法
      // const dbRoom = await this.interviewService.getRoomByRoomId(dto.roomId);

      // if (!dbRoom) {
      //   throw new HttpException({
      //     success: false,
      //     message: '房间不存在',
      //     error: 'ROOM_NOT_FOUND',
      //   }, HttpStatus.NOT_FOUND);
      // }

      // if (dbRoom.status === 'ended') {
      //   throw new HttpException({
      //     success: false,
      //     message: '该房间已结束，无法加入',
      //     error: 'ROOM_ENDED',
      //   }, HttpStatus.FORBIDDEN);
      // }

      // // 检查 ZEGO 内存中的房间状态
      // const roomStatus = this.zegoService.checkRoom(dto.roomId);

      // if (roomStatus.isDismissed) {
      //   throw new HttpException({
      //     success: false,
      //     message: '该房间已被解散，无法加入',
      //     error: 'ROOM_DISMISSED',
      //   }, HttpStatus.FORBIDDEN);
      // }

      // // 🔥 如果房间在数据库中是 active，但 ZEGO 内存中不存在，自动重新创建
      // if (!roomStatus.exists && dbRoom.status === 'active') {
      //   console.log('🔄 房间在数据库中存在但 ZEGO 内存中不存在，自动重新创建房间');
      //   // 从数据库中获取主持人的 ZEGO userId
      //   const hostZegoUserId = dbRoom.hostZegoUserId || `user_${Date.now()}`;
      //   this.zegoService.createRoom(dto.roomId, hostZegoUserId);
      //   console.log('✅ 房间已重新创建:', dto.roomId);
      // }

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('❌ 检查房间状态失败:', error);
      throw new HttpException({
        success: false,
        message: '检查房间状态失败',
        error: 'CHECK_ROOM_FAILED',
      }, HttpStatus.INTERNAL_SERVER_ERROR);
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

    // 🎯 更新面试间参与者信息
    try {
      const result = await this.interviewService.addParticipant(
        dto.roomId,
        dto.userId,
        dto.userName,
        dto.role,
      );
      if (result) {
        console.log('✅ 面试间参与者信息已更新:', {
          roomId: dto.roomId,
          userId: dto.userId,
          userName: dto.userName,
          role: dto.role,
        });
      } else {
        console.error('❌ 面试间参与者信息更新失败: addParticipant返回null');
      }
    } catch (error) {
      console.error('❌ 更新面试间参与者信息异常:', error);
      console.error('❌ 错误详情:', {
        roomId: dto.roomId,
        userId: dto.userId,
        userName: dto.userName,
        role: dto.role,
        errorMessage: error.message,
        errorStack: error.stack,
      });
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
   * 踢出用户（需要登录，仅主持人）
   */
  @Post('kick-user')
  @UseGuards(JwtAuthGuard)
  async kickUser(@Body() dto: KickUserDto, @Request() req) {
    // 使用前端传递的 ZEGO userId（user_xxx 格式）
    const hostUserId = dto.hostUserId;
    console.log('踢出用户请求:', {
      roomId: dto.roomId,
      hostUserId: hostUserId,
      targetUserId: dto.userId,
      jwtUserId: req.user.userId,
    });

    const success = await this.zegoService.kickUser(dto.roomId, hostUserId, dto.userId);

    if (!success) {
      throw new HttpException({
        success: false,
        message: '踢出用户失败，您可能不是房间主持人或房间不存在',
        error: 'KICK_FAILED',
      }, HttpStatus.FORBIDDEN);
    }

    return {
      success: true,
      message: '用户已被踢出房间',
    };
  }

  /**
   * 解散房间（需要登录，仅主持人）- 强制踢出所有用户
   */
  @Post('dismiss-room')
  @UseGuards(JwtAuthGuard)
  async dismissRoom(@Body() dto: DismissRoomDto, @Request() req) {
    console.log('解散房间请求:', {
      roomId: dto.roomId,
      hostUserId: dto.hostUserId,
      jwtUserId: req.user.userId,
      userInfo: req.user,
    });

    const success = await this.zegoService.dismissRoom(dto.roomId, dto.hostUserId);  // ✅ 使用 ZEGO userId

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
   * 支持 sendBeacon 发送的请求（Content-Type: text/plain）
   */
  @Post('leave-room')
  async leaveRoom(@Body() body: any, @Req() req: ExpressRequest) {
    try {
      let roomId: string;
      let userId: string;

      // 处理 sendBeacon 发送的 text/plain 请求
      if (typeof body === 'string') {
        const parsed = JSON.parse(body);
        roomId = parsed.roomId;
        userId = parsed.userId;
      } else {
        roomId = body.roomId;
        userId = body.userId;
      }

      console.log('🔧 用户离开房间:', { roomId, userId });
      this.zegoService.leaveRoom(roomId, userId);

      // 🎯 更新面试间参与者信息（移除参与者）
      try {
        await this.interviewService.removeParticipant(roomId, userId);
        console.log('✅ 面试间参与者已移除');
      } catch (error) {
        console.warn('⚠️ 移除面试间参与者失败:', error);
      }

      return {
        success: true,
        message: '已离开房间',
      };
    } catch (error) {
      console.error('处理离开房间请求失败:', error);
      return {
        success: false,
        message: '处理失败',
      };
    }
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

  /**
   * 一键推送并开启提词器（需要登录，仅主持人）
   */
  @Post('quick-start-teleprompter')
  @UseGuards(JwtAuthGuard)
  quickStartTeleprompter(@Body() dto: QuickStartTeleprompterDto, @Request() req) {
    const success = this.zegoService.quickStartTeleprompter(
      dto.roomId,
      dto.content,
      dto.targetUserIds,
      dto.scrollSpeed,
      dto.autoPlay ?? true,
    );

    if (!success) {
      throw new HttpException({
        success: false,
        message: '快速启动提词器失败，房间不存在或已解散',
        error: 'QUICK_START_FAILED',
      }, HttpStatus.BAD_REQUEST);
    }

    return {
      success: true,
      message: '提词器已启动',
    };
  }

  /**
   * 远程控制用户设备（需要登录，仅主持人）
   */
  @Post('remote-control')
  @UseGuards(JwtAuthGuard)
  remoteControl(@Body() dto: RemoteControlDto, @Request() req) {
    const success = this.zegoService.remoteControl(
      dto.roomId,
      dto.hostUserId,  // ✅ 使用前端传来的 ZEGO userId
      dto.targetUserId,
      dto.controlType,
      dto.enabled,
    );

    if (!success) {
      throw new HttpException({
        success: false,
        message: '远程控制失败，房间不存在、已解散或无权限',
        error: 'CONTROL_FAILED',
      }, HttpStatus.BAD_REQUEST);
    }

    return {
      success: true,
      message: `已${dto.enabled ? '开启' : '关闭'}${dto.controlType === 'camera' ? '摄像头' : '麦克风'}`,
    };
  }

  /**
   * 获取远程控制消息（公开接口，用于轮询）
   */
  @Post('get-remote-control')
  getRemoteControl(@Body() body: { roomId: string; userId: string; lastTimestamp?: number }) {
    const messages = this.zegoService.getRemoteControlMessages(
      body.roomId,
      body.userId,
      body.lastTimestamp,
    );

    return {
      success: true,
      data: messages,
    };
  }
}

