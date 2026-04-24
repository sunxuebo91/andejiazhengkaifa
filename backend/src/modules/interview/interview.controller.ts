import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InterviewService } from './interview.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryRoomsDto } from './dto/query-rooms.dto';
import { EndRoomDto } from './dto/end-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 视频面试控制器
 * 归属：安得家政小程序（B 端员工/管理员）+ CRM Web 端，共用同一套 JWT 鉴权
 * 路由前缀：/api/interview
 * 安得褓贝小程序不调用此控制器。
 */
@Controller('interview')
@UseGuards(JwtAuthGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  /**
   * 创建面试间
   */
  @Post('rooms')
  async createRoom(@Body() dto: CreateRoomDto, @Request() req) {
    try {
      const userId = req.user.userId;
      const room = await this.interviewService.createRoom(userId, dto);
      return {
        success: true,
        data: room,
        message: '面试间创建成功',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '创建面试间失败',
          error: error.name,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 获取用户当前活跃的面试间
   */
  @Get('active-room')
  async getActiveRoom(@Request() req) {
    try {
      const userId = req.user.userId;
      const room = await this.interviewService.getUserActiveRoom(userId);
      return {
        success: true,
        data: room,
        message: room ? '找到活跃面试间' : '没有活跃的面试间',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '查询活跃面试间失败',
          error: error.name,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 获取面试间列表
   */
  @Get('rooms')
  async getRooms(@Query() query: QueryRoomsDto, @Request() req) {
    try {
      const userId = req.user.userId;
      const result = await this.interviewService.findByHostUserId(userId, query);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取面试间列表失败',
          error: error.name,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 获取面试间详情
   */
  @Get('rooms/:roomId')
  async getRoomDetail(@Param('roomId') roomId: string, @Request() req) {
    try {
      const userId = req.user.userId;
      const room = await this.interviewService.findOne(roomId, userId);
      return {
        success: true,
        data: room,
      };
    } catch (error) {
      const status =
        error.name === 'NotFoundException'
          ? HttpStatus.NOT_FOUND
          : error.name === 'ForbiddenException'
          ? HttpStatus.FORBIDDEN
          : HttpStatus.BAD_REQUEST;

      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: error.name,
        },
        status,
      );
    }
  }

  /**
   * 结束面试间
   */
  @Post('rooms/:roomId/end')
  async endRoom(@Param('roomId') roomId: string, @Request() req) {
    try {
      const userId = req.user.userId;
      const room = await this.interviewService.endRoom(roomId, userId);
      return {
        success: true,
        data: room,
        message: '面试间已结束',
      };
    } catch (error) {
      const status =
        error.name === 'NotFoundException'
          ? HttpStatus.NOT_FOUND
          : error.name === 'ForbiddenException'
          ? HttpStatus.FORBIDDEN
          : HttpStatus.BAD_REQUEST;

      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: error.name,
        },
        status,
      );
    }
  }

  /**
   * 检查面试间状态
   */
  @Get('rooms/:roomId/status')
  async checkRoomStatus(@Param('roomId') roomId: string, @Request() req) {
    try {
      const userId = req.user.userId;
      const status = await this.interviewService.checkRoomStatus(roomId, userId);
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      const statusCode =
        error.name === 'NotFoundException'
          ? HttpStatus.NOT_FOUND
          : error.name === 'ForbiddenException'
          ? HttpStatus.FORBIDDEN
          : HttpStatus.BAD_REQUEST;

      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: error.name,
        },
        statusCode,
      );
    }
  }

  /**
   * 🔥 简化版：创建面试间（仅需 roomId 和 inviteLink）
   * 用于小程序 H5 页面快速创建
   */
  @Post('create-room')
  async createRoomSimple(@Body() body: { roomId: string; inviteLink: string }, @Request() req) {
    try {
      const userId = req.user.userId;
      const userName = req.user.username || req.user.name || '主持人';

      // 从 roomId 生成 ZEGO 用户ID
      const zegoUserId = `user_${Date.now()}`;

      // 调用标准创建接口
      const room = await this.interviewService.createRoom(userId, {
        roomId: body.roomId,
        roomName: `${userName}的面试间`,
        hostName: userName,
        hostZegoUserId: zegoUserId,
        source: 'miniprogram',
        hostUrl: body.inviteLink,
      });

      return {
        success: true,
        message: '保存成功',
        data: {
          roomId: room.roomId,
          inviteLink: body.inviteLink,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '保存失败',
          error: error.name,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 🔥 获取最新的活跃面试间
   */
  @Get('latest-room')
  async getLatestRoom(@Request() req) {
    try {
      const userId = req.user.userId;

      // 查询最新的活跃面试间
      const result = await this.interviewService.findByHostUserId(userId, {
        status: 'active',
        page: 1,
        pageSize: 1,
      });

      if (result.list.length === 0) {
        return {
          success: false,
          message: '没有活跃的面试间',
          data: null,
        };
      }

      const room = result.list[0];
      return {
        success: true,
        data: {
          roomId: room.roomId,
          inviteLink: room.hostUrl || `${process.env.FRONTEND_URL}/miniprogram/video-interview-guest.html?roomId=${room.roomId}`,
          roomName: room.roomName,
          createdAt: room.createdAt,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取失败',
          error: error.name,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

