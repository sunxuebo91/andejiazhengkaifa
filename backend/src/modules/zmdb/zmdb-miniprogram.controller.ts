import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  Res,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ZmdbService } from './zmdb.service';
import { CreateBackgroundCheckDto } from './dto/create-background-check.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('小程序-背调管理')
@Controller('zmdb/miniprogram')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
export class ZmdbMiniprogramController {
  private readonly logger = new Logger(ZmdbMiniprogramController.name);

  constructor(
    private readonly zmdbService: ZmdbService,
    private readonly jwtService: JwtService,
  ) {}

  // 辅助方法：角色映射
  private mapRoleToChineseRole(role: string): string {
    const roleMap = {
      'admin': '系统管理员',
      'manager': '经理',
      'employee': '普通员工',
    };
    return roleMap[role] || role;
  }

  // ==================== 背调查询接口 ====================

  /**
   * 获取背调列表（分页）
   */
  @Get('reports')
  @ApiOperation({ summary: '【小程序】获取背调列表（分页）' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认1' })
  @ApiQuery({ name: 'limit', required: false, description: '每页条数，默认10' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Request() req,
  ) {
    const result = await this.zmdbService.findAll(parseInt(page), parseInt(limit));
    // 注意：背调记录目前不支持createdBy过滤，返回全部数据
    return { success: true, ...result, message: '获取成功' };
  }

  /**
   * 根据身份证号查询背调记录
   */
  @Get('reports/by-idno/:idNo')
  @ApiOperation({ summary: '【小程序】根据身份证号查询背调记录' })
  @ApiParam({ name: 'idNo', description: '身份证号' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findByIdNo(@Param('idNo') idNo: string) {
    const record = await this.zmdbService.findByIdNo(idNo);
    return {
      success: true,
      data: record,
      message: record ? '查询成功' : '未找到背调记录',
    };
  }

  /**
   * 获取背调详情（包含风险评估结果）
   */
  @Get('reports/:id')
  @ApiOperation({ summary: '【小程序】获取背调详情' })
  @ApiParam({ name: 'id', description: '背调记录ID（MongoDB ObjectId）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getDetail(@Param('id') id: string) {
    const record = await this.zmdbService.findOne(id);
    if (!record) {
      return { success: false, data: null, message: '背调记录不存在' };
    }
    return { success: true, data: record, message: '获取成功' };
  }

  /**
   * 主动拉取报告风险数据（报告完成后调用）
   */
  @Post('reports/:reportId/fetch-result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】拉取报告风险数据' })
  @ApiParam({ name: 'reportId', description: '芝麻报告ID' })
  @ApiResponse({ status: 200, description: '拉取成功' })
  async fetchReportResult(@Param('reportId') reportId: string) {
    this.logger.log(`【小程序】主动拉取报告风险数据: reportId=${reportId}`);
    await this.zmdbService.fetchAndSaveReportResult(reportId);
    return { success: true, message: '风险数据拉取成功' };
  }

  // ==================== 背调操作接口 ====================

  /**
   * 准备授权书（使用本地隐私协议）
   */
  @Post('prepare-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】准备授权书（上传到芝麻背调）' })
  @ApiResponse({ status: 200, description: '准备成功' })
  async prepareAuth(@Body() body: { workerName: string; esignContractNo?: string }) {
    const result = await this.zmdbService.prepareAuthFromLocalDoc(body.workerName);
    return {
      success: true,
      data: {
        ...result,
        esignContractNo: body.esignContractNo || 'LOCAL_PRIVACY_DOC',
      },
      message: '授权书准备成功',
    };
  }

  /**
   * 发起背调
   */
  @Post('reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】发起背调' })
  @ApiResponse({ status: 200, description: '发起成功' })
  async createReport(@Body() dto: CreateBackgroundCheckDto, @Request() req) {
    this.logger.log(`【小程序】收到背调请求: ${JSON.stringify(dto)}`);
    const record = await this.zmdbService.createReport(dto, req.user.userId || req.user._id);
    return { success: true, data: record, message: '背调发起成功' };
  }

  /**
   * 取消背调
   */
  @Post('reports/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】取消背调' })
  @ApiParam({ name: 'id', description: '背调记录ID' })
  @ApiResponse({ status: 200, description: '取消成功' })
  async cancelReport(@Param('id') id: string) {
    await this.zmdbService.cancelReport(id);
    return { success: true, message: '背调已取消' };
  }

  /**
   * 下载背调报告PDF
   * 支持两种认证方式：
   * 1. Header中的Authorization: Bearer {token}
   * 2. URL参数 ?token=xxx（用于小程序web-view直接打开）
   */
  @Get('reports/:reportId/download')
  @Public() // 标记为公开，手动验证token
  @ApiOperation({ summary: '【小程序】下载/查看背调报告PDF' })
  @ApiParam({ name: 'reportId', description: '芝麻报告ID' })
  @ApiQuery({ name: 'token', required: false, description: 'JWT Token（URL参数方式认证，用于web-view）' })
  @ApiResponse({ status: 200, description: '下载成功' })
  async downloadReport(
    @Param('reportId') reportId: string,
    @Query('token') urlToken: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    // 验证token：优先使用URL参数中的token，其次使用Header中的Authorization
    let token = urlToken;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedException('缺少认证信息，请提供token参数或Authorization头');
    }

    // 验证JWT token
    try {
      this.jwtService.verify(token);
    } catch (error) {
      this.logger.warn(`Token验证失败: ${error.message}`);
      throw new UnauthorizedException('Token无效或已过期');
    }

    const buffer = await this.zmdbService.downloadReport(reportId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bgcheck_report_${reportId}.pdf"`);
    res.send(buffer);
  }
}

