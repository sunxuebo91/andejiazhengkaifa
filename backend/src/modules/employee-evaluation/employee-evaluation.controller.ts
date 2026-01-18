import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { EmployeeEvaluationService } from './employee-evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { QueryEvaluationDto } from './dto/query-evaluation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('员工评价')
@Controller('employee-evaluations')
export class EmployeeEvaluationController {
  private readonly logger = new Logger(EmployeeEvaluationController.name);

  constructor(
    private readonly evaluationService: EmployeeEvaluationService,
  ) {}

  /**
   * 小程序创建员工评价（需要登录）
   */
  @Post('miniprogram/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序创建员工评价' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createForMiniprogram(
    @Body() dto: CreateEvaluationDto,
    @Request() req,
  ) {
    try {
      this.logger.log(`小程序创建员工评价: 评价人=${req.user.username}, 员工=${dto.employeeName}`);

      const evaluation = await this.evaluationService.create(
        dto,
        req.user.userId,
        req.user.username || req.user.name,
      );

      return {
        success: true,
        data: evaluation,
        message: '员工评价创建成功',
      };
    } catch (error) {
      this.logger.error(`小程序创建员工评价失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `创建员工评价失败: ${error.message}`,
      };
    }
  }

  /**
   * 小程序获取员工评价列表（公开接口）
   */
  @Get('miniprogram/list')
  @Public()
  @ApiOperation({ summary: '小程序获取员工评价列表（公开）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getListForMiniprogram(@Query() query: QueryEvaluationDto) {
    try {
      this.logger.log(`小程序获取员工评价列表: ${JSON.stringify(query)}`);

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
  @Public()
  @ApiOperation({ summary: '小程序获取员工评价详情（公开）' })
  @ApiParam({ name: 'id', description: '评价ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getDetailForMiniprogram(@Param('id') id: string) {
    try {
      this.logger.log(`小程序获取员工评价详情: ${id}`);

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
  @Public()
  @ApiOperation({ summary: '小程序获取员工评价统计（公开）' })
  @ApiParam({ name: 'employeeId', description: '员工ID（简历ID）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStatisticsForMiniprogram(@Param('employeeId') employeeId: string) {
    try {
      this.logger.log(`小程序获取员工评价统计: ${employeeId}`);

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

  /**
   * PC端获取员工评价列表（需要登录）
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取员工评价列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: QueryEvaluationDto) {
    try {
      const result = await this.evaluationService.findAll(query);
      return {
        success: true,
        data: result,
        message: '获取员工评价列表成功',
      };
    } catch (error) {
      this.logger.error(`获取员工评价列表失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
        message: `获取员工评价列表失败: ${error.message}`,
      };
    }
  }
}

