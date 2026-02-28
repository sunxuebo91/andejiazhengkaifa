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
  UseGuards,
  Request,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('小程序-保险保单')
@Controller('dashubao/miniprogram')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
export class DashubaoMiniprogramController {
  constructor(private readonly dashubaoService: DashubaoService) {}

  // 辅助方法：角色映射
  private mapRoleToChineseRole(role: string): string {
    const roleMap = {
      'admin': '系统管理员',
      'manager': '经理',
      'employee': '普通员工',
    };
    return roleMap[role] || role;
  }

  // ==================== 保单查询接口 ====================

  @Get('policies')
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
    @Request() req?,
  ) {
    const userRole = this.mapRoleToChineseRole(req.user.role);
    const userId = req.user.userId;

    const queryParams: any = { status, resumeId, page, limit };
    // 普通员工只能看自己创建的保单
    if (userRole === '普通员工') {
      queryParams.createdBy = userId;
    }

    const result = await this.dashubaoService.getPolicies(queryParams);
    return { success: true, data: result, message: '获取成功' };
  }

  @Get('policy/by-id-card/:idCard')
  @ApiOperation({ summary: '【小程序】根据身份证号查询保单列表' })
  @ApiParam({ name: 'idCard', description: '被保险人身份证号' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getPoliciesByIdCard(@Param('idCard') idCard: string, @Request() req) {
    const policies = await this.dashubaoService.getPoliciesByIdCard(idCard);
    // 普通员工只能看自己创建的保单
    const userRole = this.mapRoleToChineseRole(req.user.role);
    const filtered = userRole === '普通员工'
      ? policies.filter(p => p.createdBy?.toString() === req.user.userId)
      : policies;
    return { success: true, data: filtered, message: '获取成功' };
  }

  @Get('policy/by-policy-no/:policyNo')
  @ApiOperation({ summary: '【小程序】根据保单号查询保单' })
  @ApiParam({ name: 'policyNo', description: '大树保保单号' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getPolicyByPolicyNo(@Param('policyNo') policyNo: string, @Request() req) {
    const policy = await this.dashubaoService.getPolicyByPolicyNo(policyNo);
    if (policy && this.mapRoleToChineseRole(req.user.role) === '普通员工' && policy.createdBy?.toString() !== req.user.userId) {
      return { success: true, data: null, message: '保单不存在' };
    }
    return { success: true, data: policy, message: policy ? '获取成功' : '保单不存在' };
  }

  @Get('policy/by-policy-ref/:policyRef')
  @ApiOperation({ summary: '【小程序】根据商户单号查询保单' })
  @ApiParam({ name: 'policyRef', description: '渠道流水号（商户单号）' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getPolicyByPolicyRef(@Param('policyRef') policyRef: string, @Request() req) {
    const policy = await this.dashubaoService.getPolicyByPolicyRef(policyRef);
    if (policy && this.mapRoleToChineseRole(req.user.role) === '普通员工' && policy.createdBy?.toString() !== req.user.userId) {
      return { success: true, data: null, message: '保单不存在' };
    }
    return { success: true, data: policy, message: policy ? '获取成功' : '保单不存在' };
  }

  @Get('policy/:id')
  @ApiOperation({ summary: '【小程序】根据ID获取保单详情' })
  @ApiParam({ name: 'id', description: '保单记录ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPolicyById(@Param('id') id: string, @Request() req) {
    const policy = await this.dashubaoService.getPolicyById(id);
    if (policy && this.mapRoleToChineseRole(req.user.role) === '普通员工' && policy.createdBy?.toString() !== req.user.userId) {
      return { success: true, data: null, message: '保单不存在' };
    }
    return { success: true, data: policy, message: policy ? '获取成功' : '保单不存在' };
  }

  // ==================== 保单操作接口 ====================

  @Post('policy')
  @ApiOperation({ summary: '【小程序】创建保单（投保确认）' })
  @ApiResponse({ status: 201, description: '保单创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async createPolicy(@Body() dto: CreatePolicyDto, @Request() req) {
    try {
      const result = await this.dashubaoService.createPolicy(dto, req.user.userId);
      return { success: true, data: result, message: '保单创建成功' };
    } catch (error) {
      return { success: false, data: null, message: error.message || '保单创建失败' };
    }
  }

  @Post('policy/query')
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
