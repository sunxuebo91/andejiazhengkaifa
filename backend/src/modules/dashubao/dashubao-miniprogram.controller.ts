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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AppLogger } from '../../common/logging/app-logger';

@ApiTags('小程序-保险保单')
@Controller('dashubao/miniprogram')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashubaoMiniprogramController {
  private readonly logger = new AppLogger(DashubaoMiniprogramController.name);

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
  @Permissions('insurance:view')
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
  @Permissions('insurance:view')
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
  @Permissions('insurance:view')
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
  @Permissions('insurance:view')
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
  @Permissions('insurance:view')
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
  @Permissions('insurance:create')
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
  @Permissions('insurance:view')
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
  @Permissions('insurance:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】创建支付订单（小程序支付）' })
  @ApiParam({ name: 'policyRef', description: '保单号或商户单号' })
  @ApiResponse({ status: 200, description: '获取支付信息成功' })
  async createPaymentOrder(
    @Param('policyRef') policyRef: string,
    @Body() body: { openId?: string; openid?: string; code?: string },
    @Query('openId') queryOpenId?: string,
    @Request() req?,
  ) {
    const configuredAppId = process.env.MINIPROGRAM_APPID || 'wx49e364f40a26e5a9';

    try {
      // 获取 openId
      let openId = body?.openId || body?.openid || queryOpenId || req?.user?.openid;
      let openIdSource = 'param';

      // 如果传了 code，用 code 换取 openId
      if (body?.code) {
        try {
          const appId = process.env.MINIPROGRAM_APPID;
          const appSecret = process.env.MINIPROGRAM_APPSECRET;
          const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${body.code}&grant_type=authorization_code`;
          const axios = require('axios');
          const wxRes = await axios.get(url);
          if (wxRes.data?.openid) {
            openId = wxRes.data.openid;
            openIdSource = 'code_exchange';
            this.logger.debug(`[支付] 通过code换取openId成功`);
          }
        } catch (e) {
          this.logger.error(`[支付] 通过code换取openId失败:`, e.message);
        }
      }

      if (!openId) {
        return {
          success: false,
          data: null,
          message: '缺少openId参数，小程序支付必须传递openId或code'
        };
      }

      // 脱敏 openId
      const maskedOpenId = openId.length > 10
        ? `${openId.substring(0, 6)}****${openId.substring(openId.length - 4)}`
        : openId;

      this.logger.debug(`[支付] 使用小程序支付(MINI)`);
      this.logger.debug(`[支付] AppId: ${configuredAppId}`);
      this.logger.debug(`[支付] OpenId: ${maskedOpenId} (来源: ${openIdSource})`);

      // 调用小程序支付
      const result = await this.dashubaoService.createPaymentOrder(policyRef, 'MINI', openId);

      return {
        success: true,
        data: result,
        message: result.Success === 'true' ? '获取支付参数成功' : result.Message,
        paymentType: 'MINI',
        debug: {
          configuredAppId,
          maskedOpenId,
          openIdSource,
          dashubaoSuccess: result.Success,
          dashubaoMessage: result.Message,
          orderId: result.OrderId,
          wechatAppId: result.WeChatAppId || '未返回'
        }
      };

    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.message || '获取支付信息失败'
      };
    }
  }

  @Post('policy/cancel')
  @Permissions('insurance:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】注销保单（未生效保单）' })
  @ApiResponse({ status: 200, description: '注销成功' })
  async cancelPolicy(@Body() dto: CancelPolicyDto) {
    try {
      const result = await this.dashubaoService.cancelPolicy(dto);
      // 根据大树保返回的 Success 字段判断注销是否成功
      if (result.Success === 'true') {
        return { success: true, data: result, message: '注销成功' };
      } else {
        return {
          success: false,
          data: result,
          message: result.Message || '注销失败（保单状态不允许注销或已注销）'
        };
      }
    } catch (error) {
      return { success: false, data: null, message: error.message || '注销失败' };
    }
  }

  @Post('policy/surrender')
  @Permissions('insurance:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】退保（已生效保单）' })
  @ApiResponse({ status: 200, description: '退保成功' })
  async surrenderPolicy(@Body() dto: SurrenderPolicyDto) {
    try {
      const result = await this.dashubaoService.surrenderPolicy(dto);
      // 根据大树保返回的 Success 字段判断退保是否成功
      if (result.Success === 'true') {
        return { success: true, data: result, message: '退保成功' };
      } else {
        // 大树保业务失败，返回失败信息
        return {
          success: false,
          data: result,
          message: result.Message || '退保失败（保单状态不允许退保或已退保）'
        };
      }
    } catch (error) {
      return { success: false, data: null, message: error.message || '退保失败' };
    }
  }

  @Post('policy/print')
  @Permissions('insurance:view')
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
  @Permissions('insurance:edit')
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
  @Permissions('insurance:edit')
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
  @Permissions('insurance:edit')
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
