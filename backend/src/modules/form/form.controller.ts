import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { FormService } from './form.service';
import { FormExportService } from './form-export.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { QueryFormDto } from './dto/query-form.dto';
import { SubmitFormDto } from './dto/submit-form.dto';
import { QuerySubmissionDto } from './dto/query-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('表单管理')
@Controller('forms')
export class FormController {
  constructor(
    private readonly formService: FormService,
    private readonly formExportService: FormExportService,
  ) {}

  // ==================== 管理端接口（需要登录） ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建表单' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() dto: CreateFormDto, @Request() req) {
    return this.formService.create(dto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取表单列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: QueryFormDto) {
    return this.formService.findAll(query);
  }

  @Get('all-submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有表单的提交列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAllSubmissions(@Query() query: QuerySubmissionDto) {
    return this.formService.getAllSubmissions(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取表单详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    return this.formService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新表单' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(@Param('id') id: string, @Body() dto: UpdateFormDto, @Request() req) {
    return this.formService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除表单' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string) {
    return this.formService.remove(id);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取表单统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStats(@Param('id') id: string) {
    return this.formService.getFormStats(id);
  }

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取表单提交列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSubmissions(@Param('id') id: string, @Query() query: QuerySubmissionDto) {
    return this.formService.getSubmissions(id, query);
  }

  @Post(':id/generate-share-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成表单分享令牌' })
  @ApiResponse({ status: 200, description: '生成成功' })
  async generateShareToken(@Param('id') id: string, @Request() req) {
    return this.formService.generateShareToken(id, req.user.userId);
  }

  @Put('submissions/:submissionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新提交记录（跟进）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateSubmission(
    @Param('submissionId') submissionId: string,
    @Body() dto: UpdateSubmissionDto,
    @Request() req,
  ) {
    return this.formService.updateSubmission(submissionId, dto, req.user.userId);
  }

  @Delete('submissions/:submissionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', '系统管理员')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除提交记录（仅管理员）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteSubmission(@Param('submissionId') submissionId: string) {
    return this.formService.deleteSubmission(submissionId);
  }

  @Get(':id/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '导出表单提交数据为Excel' })
  @ApiResponse({ status: 200, description: '导出成功' })
  async exportToExcel(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.formExportService.exportToExcel(id);
    const form = await this.formService.findOne(id);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(form.title)}_${Date.now()}.xlsx"`);
    res.send(buffer);
  }

  // ==================== 公开接口（无需登录） ====================

  @Get('public/:id')
  @Public()
  @ApiOperation({ summary: '获取公开表单（H5页面使用）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPublicForm(@Param('id') id: string) {
    return this.formService.getPublicForm(id);
  }

  @Post('public/:id/submit')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '提交表单（公开接口）' })
  @ApiResponse({ status: 200, description: '提交成功' })
  async submitForm(
    @Param('id') id: string,
    @Body() dto: SubmitFormDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.formService.submitForm(id, dto, ip, userAgent);
  }

  @Get('public/:id/check-phone')
  @Public()
  @ApiOperation({ summary: '检查手机号是否已提交（公开接口）' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async checkPhoneDuplicate(
    @Param('id') id: string,
    @Query('phone') phone: string,
  ) {
    const isDuplicate = await this.formService.checkPhoneDuplicate(id, phone);
    return {
      isDuplicate,
      message: isDuplicate ? '该手机号已提交过此表单' : '手机号可用',
    };
  }
}

