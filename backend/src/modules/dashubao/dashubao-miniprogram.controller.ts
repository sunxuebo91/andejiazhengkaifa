import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DashubaoService } from './dashubao.service';
import {
  CreatePolicyDto,
  QueryPolicyDto,
  CancelPolicyDto,
  PrintPolicyDto,
  SurrenderPolicyDto,
  AmendPolicyDto,
  AddInsuredDto,
} from './dto/create-policy.dto';
import { PolicyStatus } from './models/insurance-policy.model';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('小程序-保险保单')
@Controller('dashubao/miniprogram')
export class DashubaoMiniprogramController {
  constructor(private readonly dashubaoService: DashubaoService) {}

  // ==================== 保单查询接口 ====================

  @Get('policies')
  @Public()
  @ApiOperation({ summary: '【小程序】获取保单列表' })
  @ApiQuery({ name: 'status', required: false, enum: PolicyStatus, description: '保单状态筛选' })
  @ApiQuery({ name: 'resumeId', required: false, description: '关联简历ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码，默认1' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页条数，默认10' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPolicies(
    @Query('status') status?: PolicyStatus,
    @Query('resumeId') resumeId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.dashubaoService.getPolicies({ status, resumeId, page, limit });
    return { success: true, data: result, message: '获取成功' };
  }

  @Get('policy/by-id-card/:idCard')
  @Public()
  @ApiOperation({ summary: '【小程序】根据身份证号查询保单列表' })
  @ApiParam({ name: 'idCard', description: '被保险人身份证号' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getPoliciesByIdCard(@Param('idCard') idCard: string) {
    const policies = await this.dashubaoService.getPoliciesByIdCard(idCard);
    return { success: true, data: policies, message: '获取成功' };
  }

  @Get('policy/by-policy-no/:policyNo')
  @Public()
  @ApiOperation({ summary: '【小程序】根据保单号查询保单' })
  @ApiParam({ name: 'policyNo', description: '大树保保单号' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getPolicyByPolicyNo(@Param('policyNo') policyNo: string) {
    const policy = await this.dashubaoService.getPolicyByPolicyNo(policyNo);
    return { success: true, data: policy, message: policy ? '获取成功' : '保单不存在' };
  }

  @Get('policy/by-policy-ref/:policyRef')
  @Public()
  @ApiOperation({ summary: '【小程序】根据商户单号查询保单' })
  @ApiParam({ name: 'policyRef', description: '渠道流水号（商户单号）' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getPolicyByPolicyRef(@Param('policyRef') policyRef: string) {
    const policy = await this.dashubaoService.getPolicyByPolicyRef(policyRef);
    return { success: true, data: policy, message: policy ? '获取成功' : '保单不存在' };
  }

  @Get('policy/:id')
  @Public()
  @ApiOperation({ summary: '【小程序】根据ID获取保单详情' })
  @ApiParam({ name: 'id', description: '保单记录ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPolicyById(@Param('id') id: string) {
    const policy = await this.dashubaoService.getPolicyById(id);
    return { success: true, data: policy, message: policy ? '获取成功' : '保单不存在' };
  }

  // ==================== 保单操作接口 ====================

  @Post('policy')
  @Public()
  @ApiOperation({ summary: '【小程序】创建保单（投保确认）' })
  @ApiResponse({ status: 201, description: '保单创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async createPolicy(@Body() dto: CreatePolicyDto) {
    try {
      const result = await this.dashubaoService.createPolicy(dto);
      return { success: true, data: result, message: '保单创建成功' };
    } catch (error) {
      return { success: false, data: null, message: error.message || '保单创建失败' };
    }
  }

  @Post('policy/query')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】查询保单状态（从大树保查询）' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryPolicy(@Body() dto: QueryPolicyDto) {
    try {
      const result = await this.dashubaoService.queryPolicy(dto);
      return { success: true, data: result, message: '查询成功' };
    } catch (error) {
      return { success: false, data: null, message: error.message || '查询失败' };
    }
  }

  @Post('policy/payment/:policyRef')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】创建支付订单（微信小程序支付）' })
  @ApiParam({ name: 'policyRef', description: '保单号或商户单号' })
  @ApiResponse({ status: 200, description: '获取支付信息成功' })
  async createPaymentOrder(@Param('policyRef') policyRef: string) {
    try {
      // 小程序固定使用 MINI 支付方式
      const result = await this.dashubaoService.createPaymentOrder(policyRef, 'MINI');
      return { success: true, data: result, message: '获取支付信息成功' };
    } catch (error) {
      return { success: false, data: null, message: error.message || '获取支付信息失败' };
    }
  }

  @Post('policy/cancel')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】注销保单（未生效保单）' })
  @ApiResponse({ status: 200, description: '注销成功' })
  async cancelPolicy(@Body() dto: CancelPolicyDto) {
    try {
      const result = await this.dashubaoService.cancelPolicy(dto);
      return { success: true, data: result, message: '注销成功' };
    } catch (error) {
      return { success: false, data: null, message: error.message || '注销失败' };
    }
  }

  @Post('policy/surrender')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】退保（已生效保单）' })
  @ApiResponse({ status: 200, description: '退保成功' })
  async surrenderPolicy(@Body() dto: SurrenderPolicyDto) {
    try {
      const result = await this.dashubaoService.surrenderPolicy(dto);
      return { success: true, data: result, message: '退保成功' };
    } catch (error) {
      return { success: false, data: null, message: error.message || '退保失败' };
    }
  }

  @Post('policy/print')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】获取电子保单PDF' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async printPolicy(@Body() dto: PrintPolicyDto, @Res() res: Response) {
    try {
      const pdfBuffer = await this.dashubaoService.printPolicy(dto);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="policy-${dto.policyNo}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.send(pdfBuffer);
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        data: null,
        message: error.message || '获取电子保单失败',
      });
    }
  }

  @Post('policy/amend')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】批改保单（替换被保险人）' })
  @ApiResponse({ status: 200, description: '批改成功' })
  async amendPolicy(@Body() dto: AmendPolicyDto) {
    try {
      const result = await this.dashubaoService.amendPolicy(dto);
      return { success: true, data: result, message: '批改成功' };
    } catch (error) {
      return { success: false, data: null, message: error.message || '批改失败' };
    }
  }

  @Post('policy/add-insured')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】批增（增加被保险人）' })
  @ApiResponse({ status: 200, description: '批增成功' })
  async addInsured(@Body() dto: AddInsuredDto) {
    try {
      const result = await this.dashubaoService.addInsured(dto);
      return { success: true, data: result, message: '批增成功' };
    } catch (error) {
      return { success: false, data: null, message: error.message || '批增失败' };
    }
  }

  @Post('policy/sync/:identifier')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】同步保单状态（从大树保同步最新状态）' })
  @ApiParam({ name: 'identifier', description: '保单号或商户单号' })
  @ApiResponse({ status: 200, description: '同步成功' })
  async syncPolicyStatus(@Param('identifier') identifier: string) {
    try {
      const result = await this.dashubaoService.syncPolicyStatus(identifier);
      return { success: true, data: result, message: result ? '同步成功' : '保单不存在' };
    } catch (error) {
      return { success: false, data: null, message: error.message || '同步失败' };
    }
  }
}
