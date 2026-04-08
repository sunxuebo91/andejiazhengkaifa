import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ServiceSecretGuard } from '../auth/guards/service-secret.guard';
import { Public } from '../auth/decorators/public.decorator';
import { MiniProgramNotificationService } from './miniprogram-notification.service';
import { QueryMiniProgramNotificationDto, MarkReadDto } from './dto/query-miniprogram-notification.dto';

/**
 * 小程序通知控制器（专供褓贝小程序云函数调用）
 *
 * 鉴权方式：X-Service-Secret 共享密钥（机器间鉴权），不使用 JWT。
 * 安全保障：每个接口均校验 phone，防止越权访问。
 * 路由前缀：/api/miniprogram/notifications
 */
@ApiTags('小程序通知中心')
@Controller('miniprogram/notifications')
@Public()
@UseGuards(ServiceSecretGuard)
export class MiniProgramNotificationController {
  private readonly logger = new Logger(MiniProgramNotificationController.name);

  constructor(
    private readonly notificationService: MiniProgramNotificationService,
  ) {}

  /**
   * ① 获取通知列表
   * GET /api/miniprogram/notifications?phone=xxx&page=1&pageSize=20
   */
  @Get()
  @ApiOperation({ summary: '【小程序】获取通知列表' })
  @ApiQuery({ name: 'phone', required: true, description: '用户手机号' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数，默认20' })
  async getNotifications(@Query() query: QueryMiniProgramNotificationDto) {
    if (!query.phone) {
      throw new BadRequestException('phone 不能为空');
    }
    this.logger.log(`[通知列表] phone=${query.phone}, page=${query.page}`);
    const result = await this.notificationService.findByPhone(query);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * ② 标记单条已读
   * POST /api/miniprogram/notifications/:id/read
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】标记单条通知已读' })
  @ApiParam({ name: 'id', description: '通知 ID' })
  async markAsRead(
    @Param('id') id: string,
    @Body() body: MarkReadDto,
  ) {
    if (!body.phone) {
      throw new BadRequestException('phone 不能为空');
    }
    const success = await this.notificationService.markAsRead(id, body.phone);
    if (!success) {
      throw new NotFoundException('通知不存在或无权操作');
    }
    return { success: true };
  }

  /**
   * ③ 全部已读
   * POST /api/miniprogram/notifications/read-all
   */
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】标记全部通知已读' })
  async markAllAsRead(@Body() body: MarkReadDto) {
    if (!body.phone) {
      throw new BadRequestException('phone 不能为空');
    }
    const count = await this.notificationService.markAllAsRead(body.phone);
    return { success: true, data: { count } };
  }
}
