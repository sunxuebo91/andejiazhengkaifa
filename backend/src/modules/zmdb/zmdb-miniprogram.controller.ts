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
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ZmdbService } from './zmdb.service';
import { CreateBackgroundCheckDto } from './dto/create-background-check.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('小程序-背调管理')
@Controller('zmdb/miniprogram')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
export class ZmdbMiniprogramController {
  private readonly logger = new Logger(ZmdbMiniprogramController.name);

  constructor(private readonly zmdbService: ZmdbService) {}

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
   */
  @Get('reports/:reportId/download')
  @ApiOperation({ summary: '【小程序】下载背调报告PDF' })
  @ApiParam({ name: 'reportId', description: '芝麻报告ID' })
  @ApiResponse({ status: 200, description: '下载成功' })
  async downloadReport(@Param('reportId') reportId: string, @Res() res: Response) {
    const buffer = await this.zmdbService.downloadReport(reportId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bgcheck_report_${reportId}.pdf"`);
    res.send(buffer);
  }
}

