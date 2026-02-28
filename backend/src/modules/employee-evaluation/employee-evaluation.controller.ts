import { Controller, Get, Post, Body, Query, Param, Logger, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmployeeEvaluationService } from './employee-evaluation.service';
import { QueryEvaluationDto } from './dto/query-evaluation.dto';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('员工评价')
@Controller('employee-evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
export class EmployeeEvaluationController {
  private readonly logger = new Logger(EmployeeEvaluationController.name);

  constructor(
    private readonly evaluationService: EmployeeEvaluationService,
  ) {}

  /**
   * CRM端创建员工评价
   */
  @Post()
  @ApiOperation({ summary: 'CRM端创建员工评价' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() createDto: CreateEvaluationDto, @Req() req: any) {
    try {
      // 从请求中获取当前用户信息
      const user = req.user;

      // 调试日志：打印完整的user对象
      this.logger.debug(`完整的user对象: ${JSON.stringify(user)}`);

      const evaluatorId = user?.userId || user?.id || user?._id;
      const evaluatorName = user?.name || user?.username || '未知用户';

      this.logger.log(`CRM端创建员工评价: employeeId=${createDto.employeeId}, evaluatorId=${evaluatorId}, evaluatorName=${evaluatorName}`);

      const evaluation = await this.evaluationService.create(
        createDto,
        evaluatorId,
        evaluatorName
      );

      return {
        success: true,
        data: evaluation,
        message: '创建员工评价成功',
      };
    } catch (error) {
      this.logger.error(`CRM端创建员工评价失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `创建员工评价失败: ${error.message}`,
      };
    }
  }

  /**
   * 小程序端创建员工评价
   */
  @Post('miniprogram/create')
  @ApiOperation({ summary: '小程序端创建员工评价' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createForMiniprogram(@Body() createDto: CreateEvaluationDto, @Req() req: any) {
    try {
      // 从请求中获取当前用户信息
      const user = req.user;

      const evaluatorId = user?.userId || user?.id || user?._id;
      const evaluatorName = user?.name || user?.username || '未知用户';

      this.logger.log(`小程序端创建员工评价: employeeId=${createDto.employeeId}, evaluatorId=${evaluatorId}, evaluatorName=${evaluatorName}`);

      const evaluation = await this.evaluationService.create(
        createDto,
        evaluatorId,
        evaluatorName
      );

      return {
        success: true,
        data: evaluation,
        message: '创建员工评价成功',
      };
    } catch (error) {
      this.logger.error(`小程序端创建员工评价失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `创建员工评价失败: ${error.message}`,
      };
    }
  }

  /**
   * 小程序获取员工评价列表（公开接口，只读展示）
   */
  @Get('miniprogram/list')
  @ApiOperation({ summary: '小程序获取员工评价列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getListForMiniprogram(@Query() query: QueryEvaluationDto) {
    try {
      this.logger.log(`小程序获取员工评价列表: employeeId=${query.employeeId}`);

      const result = await this.evaluationService.findAll(query);

      return {
        success: true,
        data: result,
        message: '获取员工评价列表成功',
      };
    } catch (error) {
      this.logger.error(`小程序获取员工评价列表失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
        message: `获取员工评价列表失败: ${error.message}`,
      };
    }
  }

  /**
   * 小程序获取员工评价详情（公开接口）
   */
  @Get('miniprogram/:id')
  @ApiOperation({ summary: '小程序获取员工评价详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getDetailForMiniprogram(@Param('id') id: string) {
    try {
      this.logger.log(`小程序获取员工评价详情: id=${id}`);

      const evaluation = await this.evaluationService.findOne(id);

      return {
        success: true,
        data: evaluation,
        message: '获取员工评价详情成功',
      };
    } catch (error) {
      this.logger.error(`小程序获取员工评价详情失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `获取员工评价详情失败: ${error.message}`,
      };
    }
  }

  /**
   * 小程序获取员工评价统计（公开接口）
   */
  @Get('miniprogram/statistics/:employeeId')
  @ApiOperation({ summary: '小程序获取员工评价统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStatisticsForMiniprogram(@Param('employeeId') employeeId: string) {
    try {
      this.logger.log(`小程序获取员工评价统计: employeeId=${employeeId}`);

      const statistics = await this.evaluationService.getStatistics(employeeId);

      return {
        success: true,
        data: statistics,
        message: '获取员工评价统计成功',
      };
    } catch (error) {
      this.logger.error(`小程序获取员工评价统计失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `获取员工评价统计失败: ${error.message}`,
      };
    }
  }
}

