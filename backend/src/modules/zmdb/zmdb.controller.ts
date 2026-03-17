import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { ZmdbService } from './zmdb.service';
import { CreateBackgroundCheckDto } from './dto/create-background-check.dto';

@Controller('zmdb')
@UseGuards(JwtAuthGuard)
export class ZmdbController {
  private readonly logger = new Logger(ZmdbController.name);

  constructor(private readonly zmdbService: ZmdbService) {}

  /** 使用本地隐私协议准备授权书，上传到 ZMDB，返回 stuffId + imageUrl */
  @Post('prepare-auth')
  async prepareAuth(@Body() body: { workerName: string; esignContractNo?: string }) {
    // 改用本地隐私协议文件，不再使用爱签合同
    const result = await this.zmdbService.prepareAuthFromLocalDoc(body.workerName);
    return {
      success: true,
      data: {
        ...result,
        esignContractNo: body.esignContractNo || 'LOCAL_PRIVACY_DOC'
      }
    };
  }

  /** 发起背调 */
  @Post('reports')
  async createReport(@Body() dto: CreateBackgroundCheckDto, @Request() req) {
    this.logger.log(`收到背调请求，原始Body: ${JSON.stringify(dto)}`);
    const record = await this.zmdbService.createReport(dto, req.user.userId || req.user._id);
    return { success: true, data: record };
  }

  /** 背调列表（分页+搜索） */
  @Get('reports')
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('keyword') keyword?: string,
    @Query('name') name?: string,
    @Query('mobile') mobile?: string,
    @Query('idNo') idNo?: string,
  ) {
    const result = await this.zmdbService.findAll(
      parseInt(page),
      parseInt(limit),
      { keyword, name, mobile, idNo }
    );
    return { success: true, ...result };
  }

  /** 根据身份证号查询背调记录 */
  @Get('reports/by-idno/:idNo')
  async findByIdNo(@Param('idNo') idNo: string) {
    const record = await this.zmdbService.findByIdNo(idNo);
    return {
      success: true,
      data: record,
      message: record ? '查询成功' : '未找到背调记录'
    };
  }

  /** 手动拉取报告结构化数据（仅 status=4/16 时有效） */
  @Post('reports/:reportId/fetch-result')
  async fetchReportResult(@Param('reportId') reportId: string) {
    await this.zmdbService.fetchAndSaveReportResult(reportId);
    return { success: true, message: '报告数据拉取完成' };
  }

  /** 根据记录 ID 查询单条背调（含 reportResult） */
  @Get('reports/:id/detail')
  async findOne(@Param('id') id: string) {
    const record = await this.zmdbService.findOne(id);
    return { success: true, data: record };
  }

  /** 取消背调 */
  @Delete('reports/:id/cancel')
  async cancelReport(@Param('id') id: string) {
    await this.zmdbService.cancelReport(id);
    return { success: true };
  }

  /** 下载报告 PDF */
  @Get('reports/:reportId/download')
  async downloadReport(@Param('reportId') reportId: string, @Res() res: Response) {
    const buffer = await this.zmdbService.downloadReport(reportId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report_${reportId}.pdf"`);
    res.send(buffer);
  }

  /** 下载授权书图片（代理下载芝麻背调的文件，公开访问） */
  @Public()
  @Get('auth-doc/:stuffId/download')
  async downloadAuthDoc(@Param('stuffId') stuffId: string, @Res() res: Response) {
    const buffer = await this.zmdbService.downloadAuthDoc(stuffId);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="authorization_${stuffId}.jpg"`);
    res.send(buffer);
  }

  /** ZMDB 异步回调（无需鉴权） */
  @Public()
  @Post('callback')
  async callback(@Body() body: { reportId: string; notifyType: number; status?: number }) {
    await this.zmdbService.handleCallback(body);
    return { code: 200 };
  }
}
