import { 
  Controller, 
  Get, 
  Post, 
  Put,
  Body, 
  Query, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { QueryNotificationDto, MarkReadDto } from './dto/query-notification.dto';

@ApiTags('通知管理')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * 获取当前用户的通知列表
   */
  @Get()
  @ApiOperation({ summary: '获取通知列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getNotifications(
    @Request() req,
    @Query() query: QueryNotificationDto,
  ) {
    const userId = req.user.userId;
    const result = await this.notificationService.findByUser(userId, query);
    
    return {
      success: true,
      data: result,
      message: '获取通知列表成功',
    };
  }

  /**
   * 获取未读数量
   */
  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUnreadCount(@Request() req) {
    const userId = req.user.userId;
    const count = await this.notificationService.getUnreadCount(userId);
    
    return {
      success: true,
      data: { count },
      message: '获取未读数量成功',
    };
  }

  /**
   * 标记通知为已读
   */
  @Put('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '标记通知为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAsRead(
    @Request() req,
    @Body() dto: MarkReadDto,
  ) {
    const userId = req.user.userId;
    const count = await this.notificationService.markAsRead(userId, dto);
    
    return {
      success: true,
      data: { count },
      message: `成功标记 ${count} 条通知为已读`,
    };
  }

  /**
   * 标记全部为已读
   */
  @Put('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '标记全部通知为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAllAsRead(@Request() req) {
    const userId = req.user.userId;
    const count = await this.notificationService.markAllAsRead(userId);
    
    return {
      success: true,
      data: { count },
      message: `成功标记 ${count} 条通知为已读`,
    };
  }
}

