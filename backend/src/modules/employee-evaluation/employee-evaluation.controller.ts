import { Controller, Get, Post, Patch, Delete, Body, Query, Param, Logger, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmployeeEvaluationService } from './employee-evaluation.service';
import { QueryEvaluationDto } from './dto/query-evaluation.dto';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('员工评价')
@Controller('employee-evaluations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeeEvaluationController {
  private readonly logger = new Logger(EmployeeEvaluationController.name);

  constructor(
    private readonly evaluationService: EmployeeEvaluationService,
  ) {}

  /**
   * CRM端创建员工评价
   */
  @Post()
  @Permissions('resume:edit')
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
  @Permissions('resume:edit')
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
  @Public()
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
  @Public()
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
  @Public()
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

  /**
   * 修改员工评价（需要 evaluation:edit 权限）
   */
  @Patch(':id')
  @Permissions('evaluation:edit')
  @ApiOperation({ summary: '修改员工评价' })
  @ApiResponse({ status: 200, description: '修改成功' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateEvaluationDto, @Req() req: any) {
    try {
      const user = req.user;
      this.logger.log(`修改员工评价: id=${id}, operator=${user?.username || user?.name}`);

      const evaluation = await this.evaluationService.update(id, updateDto);

      return {
        success: true,
        data: evaluation,
        message: '修改员工评价成功',
      };
    } catch (error) {
      this.logger.error(`修改员工评价失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `修改员工评价失败: ${error.message}`,
      };
    }
  }

  /**
   * 删除员工评价（需要 evaluation:delete 权限）
   */
  @Delete(':id')
  @Permissions('evaluation:delete')
  @ApiOperation({ summary: '删除员工评价' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string, @Req() req: any) {
    try {
      const user = req.user;
      this.logger.log(`删除员工评价: id=${id}, operator=${user?.username || user?.name}`);

      await this.evaluationService.remove(id);

      return {
        success: true,
        message: '删除员工评价成功',
      };
    } catch (error) {
      this.logger.error(`删除员工评价失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: `删除员工评价失败: ${error.message}`,
      };
    }
  }
}
