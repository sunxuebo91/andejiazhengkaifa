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
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { Contract, ContractDocument, OrderCategory } from './models/contract.model';
import { ServiceSecretGuard } from '../auth/guards/service-secret.guard';
import { Public } from '../auth/decorators/public.decorator';
import { MiniProgramNotificationService } from '../miniprogram-notification/miniprogram-notification.service';

/**
 * 客户订单中心控制器（专供微信小程序云函数调用）
 *
 * 鉴权方式：X-Service-Secret 共享密钥（机器间鉴权），不使用 JWT。
 * 安全保障：每个接口均校验 customerPhone === 传入 phone，防止越权访问（IDOR）。
 * 路由前缀：/api/miniprogram/contracts
 */
@ApiTags('客户订单中心')
@Controller('miniprogram/contracts')
@Public()             // 跳过全局 JwtAuthGuard
@UseGuards(ServiceSecretGuard)  // 改用共享密钥守卫
export class ContractsCustomerController {
  private readonly logger = new Logger(ContractsCustomerController.name);

  constructor(
    private readonly contractsService: ContractsService,
    private readonly mpNotificationService: MiniProgramNotificationService,
    @InjectModel(Contract.name) private readonly contractModel: Model<ContractDocument>,
  ) {}

  /**
   * 防御：家政客户小程序不可访问职培合同。调用任何按 id 的接口前做一次轻量校验。
   */
  private async assertNotTrainingContract(id: string): Promise<void> {
    const doc = await this.contractModel
      .findById(id)
      .select('orderCategory')
      .lean()
      .exec();
    if (!doc) throw new NotFoundException('合同不存在');
    if (doc.orderCategory === OrderCategory.TRAINING) {
      throw new NotFoundException('合同不存在');
    }
  }

  /**
   * 接口 1：获取客户合同列表
   * GET /api/miniprogram/contracts?phone=xxx
   */
  @Get()
  @ApiOperation({ summary: '【客户】按手机号获取合同列表' })
  @ApiQuery({ name: 'phone', required: true, description: '客户手机号' })
  async getMyContracts(@Query('phone') phone: string) {
    if (!phone) {
      throw new BadRequestException('phone 参数不能为空');
    }
    this.logger.log(`[客户订单中心] 查询合同列表，phone=${phone}`);
    const contracts = await this.contractsService.getContractsByPhone(phone);
    return {
      success: true,
      data: contracts,
      total: contracts.length,
      message: '获取合同列表成功',
    };
  }

  /**
   * 接口 2：实时获取签约链接
   * GET /api/miniprogram/contracts/:id/signing-url?phone=xxx
   *
   * 每次调用都向爱签 API 实时取最新短链接（避免存库链接过期）。
   * 返回字段：
   *   signingUrl   - H5 签约页面地址，用 WebView 打开
   *   alreadySigned - true 表示该客户已完成签署（可提示无需再签）
   */
  @Get(':id/signing-url')
  @ApiOperation({ summary: '【客户】实时获取合同签约链接' })
  @ApiParam({ name: 'id', description: '合同 ID' })
  @ApiQuery({ name: 'phone', required: true, description: '客户手机号（用于归属校验）' })
  async getSigningUrl(
    @Param('id') id: string,
    @Query('phone') phone: string,
  ) {
    if (!phone) {
      throw new BadRequestException('phone 参数不能为空');
    }
    this.logger.log(`[客户订单中心] 获取签约链接，id=${id}，phone=${phone}`);
    await this.assertNotTrainingContract(id);
    const result = await this.contractsService.getCustomerSigningUrl(id, phone);
    return {
      success: true,
      data: result,
      message: result.alreadySigned ? '您已完成签署，无需再次操作' : '签约链接获取成功',
    };
  }

  /**
   * 接口 3：获取单个合同详情（含越权校验）
   * GET /api/miniprogram/contracts/:id?phone=xxx
   */
  @Get(':id')
  @ApiOperation({ summary: '【客户】获取合同详情' })
  @ApiParam({ name: 'id', description: '合同 ID' })
  @ApiQuery({ name: 'phone', required: true, description: '客户手机号（用于归属校验）' })
  async getContractDetail(
    @Param('id') id: string,
    @Query('phone') phone: string,
  ) {
    if (!phone) {
      throw new BadRequestException('phone 参数不能为空');
    }
    this.logger.log(`[客户订单中心] 查询合同详情，id=${id}，phone=${phone}`);
    const contract = await this.contractsService.getContractByIdForCustomer(id, phone);
    return {
      success: true,
      data: contract,
      message: '获取合同详情成功',
    };
  }

  /**
   * 接口 3：客户确认上户（幂等）
   * POST /api/miniprogram/contracts/:id/confirm-onboard
   * Body: { "phone": "13800138000" }
   */
  @Post(':id/confirm-onboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【客户】确认阿姨上户' })
  @ApiParam({ name: 'id', description: '合同 ID' })
  async confirmOnboard(
    @Param('id') id: string,
    @Body('phone') phone: string,
  ) {
    if (!phone) {
      throw new BadRequestException('phone 不能为空');
    }
    this.logger.log(`[客户订单中心] 确认上户，id=${id}，phone=${phone}`);
    const contract = await this.contractsService.confirmOnboard(id, phone);

    // 📬 触发小程序通知：阿姨确认上户
    const nannyName = (contract as any).workerName || '阿姨';
    this.mpNotificationService.notifyNannyConfirmed(
      phone,
      id,
      nannyName,
    ).catch(err => this.logger.error(`发送阿姨上户通知失败: ${err.message}`));

    return {
      success: true,
      data: contract,
      message: '确认上户成功',
    };
  }

  /**
   * 接口 4：支付确认（幂等）
   * POST /api/miniprogram/contracts/:id/payment-confirm
   * Body: { "phone": "13800138000", "amount": 29900, "sqb_sn": "xxx", "paidAt": "2026-04-02T10:00:00Z" }
   *
   * 由云函数在支付成功后自动调用，Header 带 X-Service-Secret 做服务间鉴权。
   * CRM 收到后将合同标记为已支付。
   */
  @Post(':id/payment-confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【云函数】支付确认，标记合同为已支付' })
  @ApiParam({ name: 'id', description: '合同 ID' })
  async confirmPayment(
    @Param('id') id: string,
    @Body() body: { phone: string; amount: number; sqb_sn: string; paidAt: string },
  ) {
    const { phone, amount, sqb_sn, paidAt } = body;
    if (!phone) {
      throw new BadRequestException('phone 不能为空');
    }
    if (!amount && amount !== 0) {
      throw new BadRequestException('amount 不能为空');
    }
    if (!sqb_sn) {
      throw new BadRequestException('sqb_sn 不能为空');
    }
    if (!paidAt) {
      throw new BadRequestException('paidAt 不能为空');
    }
    this.logger.log(`[客户订单中心] 支付确认，id=${id}，phone=${phone}，amount=${amount}，sqb_sn=${sqb_sn}`);
    await this.assertNotTrainingContract(id);
    const contract = await this.contractsService.confirmPayment(
      id,
      phone,
      amount,
      sqb_sn,
      new Date(paidAt),
    );

    // 📬 触发小程序通知：付款完成
    this.mpNotificationService.notifyPaymentDone(
      phone,
      id,
      amount,
    ).catch(err => this.logger.error(`发送付款完成通知失败: ${err.message}`));

    return {
      success: true,
      data: contract,
      message: '支付确认成功',
    };
  }
}

