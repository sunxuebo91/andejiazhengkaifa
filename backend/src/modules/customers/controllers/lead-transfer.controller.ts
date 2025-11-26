import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { LeadTransferRuleService } from '../services/lead-transfer-rule.service';
import { LeadTransferRecordService } from '../services/lead-transfer-record.service';
import { LeadAutoTransferService } from '../services/lead-auto-transfer.service';
import { CreateLeadTransferRuleDto } from '../dto/create-lead-transfer-rule.dto';
import { UpdateLeadTransferRuleDto } from '../dto/update-lead-transfer-rule.dto';
import { LeadTransferQueryDto } from '../dto/lead-transfer-query.dto';

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

@ApiTags('线索流转')
@Controller('lead-transfer')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LeadTransferController {
  constructor(
    private readonly ruleService: LeadTransferRuleService,
    private readonly recordService: LeadTransferRecordService,
    private readonly autoTransferService: LeadAutoTransferService,
  ) {}

  private createResponse(success: boolean, message: string, data?: any, error?: string): ApiResponse {
    return { success, message, data, error };
  }

  // ==================== 规则管理 ====================

  @Post('rules')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '创建流转规则' })
  async createRule(@Body() dto: CreateLeadTransferRuleDto, @Request() req: any): Promise<ApiResponse> {
    try {
      const rule = await this.ruleService.create(dto, req.user.userId);
      return this.createResponse(true, '规则创建成功', rule);
    } catch (error) {
      return this.createResponse(false, '规则创建失败', null, error.message);
    }
  }

  @Get('rules')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取规则列表' })
  async getRules(): Promise<ApiResponse> {
    try {
      const rules = await this.ruleService.findAll();
      return this.createResponse(true, '获取成功', rules);
    } catch (error) {
      return this.createResponse(false, '获取失败', null, error.message);
    }
  }

  @Get('rules/:id/predict')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '预测下次流转情况' })
  async predictNextTransfer(@Param('id') id: string): Promise<ApiResponse> {
    try {
      const prediction = await this.autoTransferService.predictNextTransfer(id);
      return this.createResponse(true, '预测成功', prediction);
    } catch (error) {
      return this.createResponse(false, '预测失败', null, error.message);
    }
  }

  @Get('rules/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取规则详情' })
  async getRule(@Param('id') id: string): Promise<ApiResponse> {
    try {
      const rule = await this.ruleService.findOne(id);
      return this.createResponse(true, '获取成功', rule);
    } catch (error) {
      return this.createResponse(false, '获取失败', null, error.message);
    }
  }

  @Patch('rules/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '更新规则' })
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateLeadTransferRuleDto,
    @Request() req: any
  ): Promise<ApiResponse> {
    try {
      const rule = await this.ruleService.update(id, dto, req.user.userId);
      return this.createResponse(true, '规则更新成功', rule);
    } catch (error) {
      return this.createResponse(false, '规则更新失败', null, error.message);
    }
  }

  @Patch('rules/:id/toggle')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '切换规则启用状态' })
  async toggleRule(
    @Param('id') id: string,
    @Body('enabled') enabled: boolean,
    @Request() req: any
  ): Promise<ApiResponse> {
    try {
      const rule = await this.ruleService.toggleEnabled(id, enabled, req.user.userId);
      return this.createResponse(true, `规则已${enabled ? '启用' : '禁用'}`, rule);
    } catch (error) {
      return this.createResponse(false, '操作失败', null, error.message);
    }
  }

  @Delete('rules/:id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除规则' })
  async deleteRule(@Param('id') id: string, @Request() req: any): Promise<ApiResponse> {
    try {
      await this.ruleService.remove(id, req.user.userId);
      return this.createResponse(true, '规则删除成功');
    } catch (error) {
      return this.createResponse(false, '规则删除失败', null, error.message);
    }
  }

  // ==================== 流转记录 ====================

  @Get('records')
  @Roles('admin', 'manager', 'employee')
  @ApiOperation({ summary: '获取流转记录' })
  async getRecords(@Query() query: LeadTransferQueryDto): Promise<ApiResponse> {
    try {
      const result = await this.recordService.findAll(query);
      return this.createResponse(true, '获取成功', result);
    } catch (error) {
      return this.createResponse(false, '获取失败', null, error.message);
    }
  }

  @Get('statistics')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取流转统计' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<ApiResponse> {
    try {
      const stats = await this.recordService.getStatistics(startDate, endDate);
      return this.createResponse(true, '获取成功', stats);
    } catch (error) {
      return this.createResponse(false, '获取失败', null, error.message);
    }
  }

  @Get('user-statistics/:userId')
  @Roles('admin', 'manager', 'employee')
  @ApiOperation({ summary: '获取用户流转统计' })
  async getUserStatistics(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<ApiResponse> {
    try {
      const stats = await this.recordService.getUserStatistics(userId, startDate, endDate);
      return this.createResponse(true, '获取成功', stats);
    } catch (error) {
      return this.createResponse(false, '获取失败', null, error.message);
    }
  }

  @Post('execute-now')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '手动执行指定规则' })
  async executeNow(@Body() body: { ruleId?: string }): Promise<ApiResponse> {
    try {
      if (body.ruleId) {
        // 执行指定规则
        const result = await this.autoTransferService.executeRuleById(body.ruleId);
        return this.createResponse(true, '执行成功', {
          transferredCount: result.transferredCount,
          userStats: result.userStats,
          message: result.transferredCount > 0
            ? `已流转 ${result.transferredCount} 条线索`
            : '没有符合条件的线索需要流转'
        });
      } else {
        // 执行所有规则
        await this.autoTransferService.executeAutoTransfer();
        return this.createResponse(true, '流转任务已执行');
      }
    } catch (error) {
      return this.createResponse(false, '执行失败', null, error.message);
    }
  }
}

