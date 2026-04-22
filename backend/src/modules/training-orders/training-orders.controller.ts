import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TrainingOrdersService } from './training-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

/**
 * 职培订单 CRM 管理端控制器
 * 路由前缀：/api/training-orders
 * 鉴权：JWT + 权限守卫（沿用家政合同权限位 contract:view）
 */
@ApiTags('职培订单')
@Controller('training-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TrainingOrdersController {
  private readonly logger = new Logger(TrainingOrdersController.name);

  constructor(private readonly trainingOrdersService: TrainingOrdersService) {}

  @Get()
  @ApiOperation({ summary: '获取职培订单列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认1' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量，默认10' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词（订单号/学员姓名/手机号）' })
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const result = await this.trainingOrdersService.findAll(pageNum, limitNum, search);
    // 保持与 /api/contracts 列表返回结构一致（前端 contracts 字段）
    return {
      contracts: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取职培订单详情（含关联学员信息）' })
  @ApiParam({ name: 'id', description: '订单 ID' })
  async detail(@Param('id') id: string) {
    if (!id) throw new BadRequestException('id 参数不能为空');
    this.logger.log(`[职培订单] 查询详情 id=${id}`);
    return this.trainingOrdersService.findOneWithLead(id);
  }

  /**
   * 标记职培订单已毕业（证书申报）
   * - 人工触发的终态，仅 CRM 管理后台调用
   * - 将 contractStatus 置为 graduated，写入 graduatedAt
   */
  @Post(':id/graduate')
  @ApiOperation({ summary: '【CRM】标记职培订单已毕业（证书申报）' })
  @ApiParam({ name: 'id', description: '订单 ID' })
  async graduate(@Param('id') id: string) {
    if (!id) throw new BadRequestException('id 参数不能为空');
    this.logger.log(`[职培订单] 标记已毕业 id=${id}`);
    return this.trainingOrdersService.markGraduated(id);
  }

  /**
   * 标记职培订单已退款
   * - 人工触发的终态，仅 CRM 管理后台调用
   * - 将 contractStatus 置为 refunded，写入 refundedAt
   * - 退款金额从 courseAmount（报课金额）中扣除，保持数据持久化
   */
  @Post(':id/refund')
  @ApiOperation({ summary: '【CRM】标记职培订单已退款并扣减报课金额' })
  @ApiParam({ name: 'id', description: '订单 ID' })
  @ApiBody({ schema: { type: 'object', properties: { refundAmount: { type: 'number', description: '退款金额（元）' } }, required: ['refundAmount'] } })
  async refund(
    @Param('id') id: string,
    @Body('refundAmount') refundAmount: number,
  ) {
    if (!id) throw new BadRequestException('id 参数不能为空');
    if (refundAmount === undefined || refundAmount === null) {
      throw new BadRequestException('refundAmount 参数不能为空');
    }
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('退款金额必须大于 0');
    }
    this.logger.log(`[职培订单] 标记已退款 id=${id} refundAmount=${amount}`);
    return this.trainingOrdersService.markRefunded(id, amount);
  }
}
