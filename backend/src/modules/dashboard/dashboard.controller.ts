import { Controller, Get, Logger, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto, CustomerBusinessMetrics } from './dto/dashboard-stats.dto';

@ApiTags('驾驶舱')
@Controller('dashboard')
// @UseGuards(JwtAuthGuard) // 暂时禁用认证进行测试
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * 获取驾驶舱统计数据
   */
  @Get('stats')
  @ApiOperation({ summary: '获取完整驾驶舱统计数据' })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取驾驶舱统计数据'
  })
  async getDashboardStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      this.logger.log('收到获取驾驶舱统计数据请求', { startDate, endDate });
      const stats = await this.dashboardService.getDashboardStats(startDate, endDate);
      
      return {
        success: true,
        data: stats,
        message: '获取驾驶舱统计数据成功'
      };
    } catch (error) {
      this.logger.error('获取驾驶舱统计数据失败:', error);
      return {
        success: false,
        message: `获取驾驶舱统计数据失败: ${error.message}`,
        data: null
      };
    }
  }

  @Get('customer-business')
  @ApiOperation({ summary: '获取客户业务指标' })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取客户业务指标'
  })
  async getCustomerBusinessMetrics() {
    try {
      this.logger.log('收到获取客户业务指标请求');
      const metrics = await this.dashboardService.getCustomerBusinessMetricsOnly();
      
      return {
        success: true,
        data: metrics,
        message: '获取客户业务指标成功'
      };
    } catch (error) {
      this.logger.error('获取客户业务指标失败:', error);
      return {
        success: false,
        message: `获取客户业务指标失败: ${error.message}`,
        data: null
      };
    }
  }

  @Get('financial')
  @ApiOperation({ summary: '获取财务营收指标' })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取财务营收指标'
  })
  async getFinancialMetrics() {
    try {
      this.logger.log('收到获取财务营收指标请求');
      const metrics = await this.dashboardService['getFinancialMetrics']();
      
      return {
        success: true,
        data: metrics,
        message: '获取财务营收指标成功'
      };
    } catch (error) {
      this.logger.error('获取财务营收指标失败:', error);
      return {
        success: false,
        message: `获取财务营收指标失败: ${error.message}`,
        data: null
      };
    }
  }

  @Get('efficiency')
  @ApiOperation({ summary: '获取运营效率指标' })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取运营效率指标'
  })
  async getEfficiencyMetrics() {
    try {
      this.logger.log('收到获取运营效率指标请求');
      const metrics = await this.dashboardService['getEfficiencyMetrics']();
      
      return {
        success: true,
        data: metrics,
        message: '获取运营效率指标成功'
      };
    } catch (error) {
      this.logger.error('获取运营效率指标失败:', error);
      return {
        success: false,
        message: `获取运营效率指标失败: ${error.message}`,
        data: null
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  async healthCheck() {
    return {
      success: true,
      message: 'Dashboard模块运行正常',
      timestamp: new Date().toISOString()
    };
  }
} 