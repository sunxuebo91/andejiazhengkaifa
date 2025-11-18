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
}

