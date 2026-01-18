import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmployeeEvaluationService } from './employee-evaluation.service';
import { QueryEvaluationDto } from './dto/query-evaluation.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('员工评价')
@Controller('employee-evaluations')
export class EmployeeEvaluationController {
  private readonly logger = new Logger(EmployeeEvaluationController.name);

  constructor(
    private readonly evaluationService: EmployeeEvaluationService,
  ) {}

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
}

