import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Request,
  Req,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashubaoService } from './dashubao.service';
import {
  CreatePolicyDto,
  QueryPolicyDto,
  CancelPolicyDto,
  PrintPolicyDto,
  InvoiceDto,
  SurrenderPolicyDto,
  AmendPolicyDto,
  AddInsuredDto,
} from './dto/create-policy.dto';
import { PolicyStatus } from './models/insurance-policy.model';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('大树保保险')
@Controller('dashubao')
export class DashubaoController {
  constructor(private readonly dashubaoService: DashubaoService) {}

  private isAdmin(user: any): boolean {
    return user?.role === '系统管理员' || user?.role === 'admin' || user?.role === '管理员';
  }

  private canDeletePolicy(user: any): boolean {
    const isSpecialUser = user?.name === '孙学博' || user?.username === '孙学博';
    return this.isAdmin(user) && isSpecialUser;
  }

  @Post('policy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '投保确认 - 创建保单' })
  @ApiResponse({ status: 201, description: '保单创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async createPolicy(@Body() dto: CreatePolicyDto, @Request() req) {
    const userId = req.user?.userId;
    return this.dashubaoService.createPolicy(dto, userId);
  }

  @Post('policy/query')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '保单查询 - 从大树保查询保单状态' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryPolicy(@Body() dto: QueryPolicyDto) {
    return this.dashubaoService.queryPolicy(dto);
  }

  @Post('policy/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '保单注销 - 注销未生效保单' })
  @ApiResponse({ status: 200, description: '注销成功' })
  async cancelPolicy(@Body() dto: CancelPolicyDto) {
    return this.dashubaoService.cancelPolicy(dto);
  }

  @Post('policy/print')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '保单打印 - 获取电子保单PDF' })
  @ApiResponse({ status: 200, description: '获取成功', content: { 'application/pdf': {} } })
  async printPolicy(@Body() dto: PrintPolicyDto, @Res() res: Response) {
    const pdfBuffer = await this.dashubaoService.printPolicy(dto);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="policy-${dto.policyNo}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Post('policy/invoice')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '电子发票 - 申请电子发票' })
  @ApiResponse({ status: 200, description: '申请成功' })
  async requestInvoice(@Body() dto: InvoiceDto) {
    return this.dashubaoService.requestInvoice(dto);
  }

  @Post('policy/payment/:policyRef')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '支付订单 - 获取微信支付信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async createPaymentOrder(
    @Param('policyRef') policyRef: string,
    @Query('tradeType') tradeType: string = 'MWEB',
  ) {
    return this.dashubaoService.createPaymentOrder(policyRef, tradeType);
  }

  @Post('payment/callback')
  @Public() // 支付回调接口必须公开，不需要JWT认证
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '支付回调 - 接收大树保支付成功通知' })
  @ApiResponse({ status: 200, description: '回调处理成功' })
  async paymentCallback(@Req() req: any) {
    // 获取原始请求体（XML字符串）
    const xmlBody = req.body;
    return this.dashubaoService.handlePaymentCallback(xmlBody);
  }

  @Post('policy/amend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批改 - 替换被保险人' })
  @ApiResponse({ status: 200, description: '批改成功' })
  async amendPolicy(@Body() dto: AmendPolicyDto) {
    return this.dashubaoService.amendPolicy(dto);
  }

  @Post('policy/add-insured')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批增 - 增加被保险人' })
  @ApiResponse({ status: 200, description: '批增成功' })
  async addInsured(@Body() dto: AddInsuredDto) {
    return this.dashubaoService.addInsured(dto);
  }

  @Post('policy/surrender')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '退保 - 已生效保单退保' })
  @ApiResponse({ status: 200, description: '退保成功' })
  async surrenderPolicy(@Body() dto: SurrenderPolicyDto) {
    return this.dashubaoService.surrenderPolicy(dto);
  }

  @Get('policy/rebate/:policyNo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '返佣查询 - 查询返佣信息' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryRebate(@Param('policyNo') policyNo: string) {
    return this.dashubaoService.queryRebate(policyNo);
  }

  @Delete('policy/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除本地保单（仅管理员且指定用户）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deletePolicy(@Param('id') id: string, @Request() req) {
    try {
      if (!this.canDeletePolicy(req.user)) {
        throw new ForbiddenException('仅管理员且用户孙学博可删除保单');
      }

      await this.dashubaoService.deletePolicy(id);
      return {
        success: true,
        message: '保单删除成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '保单删除失败',
      };
    }
  }

  @Get('policies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取本地保单列表' })
  @ApiQuery({ name: 'status', required: false, enum: PolicyStatus })
  @ApiQuery({ name: 'resumeId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPolicies(
    @Query('status') status?: PolicyStatus,
    @Query('resumeId') resumeId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.dashubaoService.getPolicies({ status, resumeId, page, limit });
  }

  @Get('policy/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '根据ID获取保单详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPolicyById(@Param('id') id: string) {
    return this.dashubaoService.getPolicyById(id);
  }

  @Get('policy/by-policy-no/:policyNo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '根据保单号获取保单详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPolicyByPolicyNo(@Param('policyNo') policyNo: string) {
    return this.dashubaoService.getPolicyByPolicyNo(policyNo);
  }

  @Get('policy/by-policy-ref/:policyRef')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '根据商户单号获取保单详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPolicyByPolicyRef(@Param('policyRef') policyRef: string) {
    return this.dashubaoService.getPolicyByPolicyRef(policyRef);
  }

  @Post('policy/sync/:policyNo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '同步保单状态 - 从大树保同步最新状态' })
  @ApiResponse({ status: 200, description: '同步成功' })
  async syncPolicyStatus(@Param('policyNo') policyNo: string) {
    return this.dashubaoService.syncPolicyStatus(policyNo);
  }

  @Get('policies/by-id-card/:idCard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '根据被保险人身份证号查询保单列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getPoliciesByIdCard(@Param('idCard') idCard: string) {
    return this.dashubaoService.getPoliciesByIdCard(idCard);
  }
}

