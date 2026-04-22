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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TrainingOrdersService } from './training-orders.service';
import { ServiceSecretGuard } from '../auth/guards/service-secret.guard';
import { Public } from '../auth/decorators/public.decorator';
import { MiniProgramNotificationService } from '../miniprogram-notification/miniprogram-notification.service';

/**
 * 安得褓贝小程序：职培订单对外接口（专供小程序云函数调用）
 *
 * 鉴权：X-Service-Secret 共享密钥（机器间鉴权），不使用 JWT
 * 业务隔离：所有接口在 service 层强制 orderCategory='training' 过滤，
 *           并按 customerPhone === 传入 phone 做越权校验（IDOR 防护）
 * 路由前缀：/api/miniprogram/training-orders/baobei
 */
@ApiTags('安得褓贝-职培订单')
@Controller('miniprogram/training-orders/baobei')
@Public()
@UseGuards(ServiceSecretGuard)
export class TrainingOrdersBaobeiController {
  private readonly logger = new Logger(TrainingOrdersBaobeiController.name);

  constructor(
    private readonly trainingOrdersService: TrainingOrdersService,
    private readonly mpNotificationService: MiniProgramNotificationService,
  ) {}

  /**
   * 聚合详情：按学员手机号一次性返回学员信息 + 报课信息 + 金额 + 全部职培合同
   * GET /api/miniprogram/training-orders/baobei/my-order?phone=xxx
   */
  @Get('my-order')
  @ApiOperation({ summary: '【学员】获取我的职培订单聚合详情' })
  @ApiQuery({ name: 'phone', required: true, description: '学员手机号' })
  async getMyOrder(@Query('phone') phone: string) {
    if (!phone) throw new BadRequestException('phone 参数不能为空');
    this.logger.log(`[褓贝-职培订单] 查询我的订单 phone=${phone}`);
    const data = await this.trainingOrdersService.getBaobeiDetailByPhone(phone);
    return {
      success: true,
      data,
      message: '获取职培订单成功',
    };
  }

  /**
   * 实时获取职培合同签约链接
   * GET /api/miniprogram/training-orders/baobei/:id/signing-url?phone=xxx
   */
  @Get(':id/signing-url')
  @ApiOperation({ summary: '【学员】实时获取职培合同签约链接' })
  @ApiParam({ name: 'id', description: '订单 ID' })
  @ApiQuery({ name: 'phone', required: true, description: '学员手机号（用于归属校验）' })
  async getSigningUrl(@Param('id') id: string, @Query('phone') phone: string) {
    if (!phone) throw new BadRequestException('phone 参数不能为空');
    this.logger.log(`[褓贝-职培订单] 获取签约链接 id=${id} phone=${phone}`);
    const result = await this.trainingOrdersService.getSigningUrlForBaobei(id, phone);
    return {
      success: true,
      data: result,
      message: result.alreadySigned ? '您已完成签署，无需再次操作' : '签约链接获取成功',
    };
  }

  /**
   * 支付确认（由云函数在收钱吧支付成功后回调）
   * POST /api/miniprogram/training-orders/baobei/:id/payment-confirm
   * Body: { phone, amount, sqb_sn, paidAt }
   */
  @Post(':id/payment-confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【云函数】职培订单支付确认' })
  @ApiParam({ name: 'id', description: '订单 ID' })
  async confirmPayment(
    @Param('id') id: string,
    @Body() body: { phone: string; amount: number; sqb_sn: string; paidAt: string },
  ) {
    const { phone, amount, sqb_sn, paidAt } = body || ({} as any);
    if (!phone) throw new BadRequestException('phone 不能为空');
    if (amount === undefined || amount === null) throw new BadRequestException('amount 不能为空');
    if (!sqb_sn) throw new BadRequestException('sqb_sn 不能为空');
    if (!paidAt) throw new BadRequestException('paidAt 不能为空');

    this.logger.log(`[褓贝-职培订单] 支付确认 id=${id} phone=${phone} amount=${amount} sqb_sn=${sqb_sn}`);
    const contract = await this.trainingOrdersService.confirmPaymentForBaobei(
      id,
      phone,
      amount,
      sqb_sn,
      new Date(paidAt),
    );

    // 复用家政那套"付款完成"小程序订阅消息通道
    this.mpNotificationService
      .notifyPaymentDone(phone, id, amount)
      .catch((err) => this.logger.error(`发送付款完成通知失败: ${err.message}`));

    return {
      success: true,
      data: contract,
      message: '支付确认成功',
    };
  }

  /**
   * 合同状态查询（轻量端点，仅返回状态相关字段）
   * GET /api/miniprogram/training-orders/baobei/:id/status?phone=xxx
   */
  @Get(':id/status')
  @ApiOperation({ summary: '【学员】查询职培合同状态' })
  @ApiParam({ name: 'id', description: '订单 ID' })
  @ApiQuery({ name: 'phone', required: true, description: '学员手机号（用于归属校验）' })
  async getContractStatus(@Param('id') id: string, @Query('phone') phone: string) {
    if (!phone) throw new BadRequestException('phone 参数不能为空');
    const data = await this.trainingOrdersService.getContractStatusForBaobei(id, phone);
    return {
      success: true,
      data,
      message: '获取合同状态成功',
    };
  }

}
