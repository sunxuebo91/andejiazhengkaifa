import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TrainingOrdersService } from './training-orders.service';
import { ContractsService } from '../contracts/contracts.service';
import { ESignService } from '../esign/esign.service';
import { CreateContractDto } from '../contracts/dto/create-contract.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

/**
 * 安得家政小程序 - 职培订单控制器
 * 路由前缀：/api/training-orders/miniprogram
 * 鉴权：JWT + 权限守卫
 * 权限位：training-order:view / training-order:create（admin/admissions/operator 持有）
 * 仅处理 orderCategory='training' 的合同，强制过滤，防越界。
 */
@ApiTags('小程序-职培订单')
@Controller('training-orders/miniprogram')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TrainingOrdersMiniProgramController {
  private readonly logger = new Logger(TrainingOrdersMiniProgramController.name);

  constructor(
    private readonly trainingOrdersService: TrainingOrdersService,
    private readonly contractsService: ContractsService,
    private readonly esignService: ESignService,
  ) {}

  /** 仅 admin/manager/operator 拥有全局查看权；其他角色（admissions 等）只看自己创建 */
  private isGlobalRole(role: string): boolean {
    return ['admin', '系统管理员', 'manager', '经理', 'operator', '运营'].includes(role);
  }

  @Get('templates')
  @Permissions('training-order:create')
  @ApiOperation({ summary: '【小程序】获取爱签模板列表（全部在用模板）' })
  async getTemplates() {
    try {
      const templates = await this.esignService.getRealTemplateList();
      return { success: true, data: templates, message: '获取模板列表成功' };
    } catch (error: any) {
      this.logger.error(`获取模板列表失败: ${error.message}`, error.stack);
      return { success: false, message: error.message || '获取模板列表失败' };
    }
  }

  @Get('list')
  @Permissions('training-order:view')
  @ApiOperation({ summary: '【小程序】获取职培订单列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Request() req?,
  ) {
    try {
      const createdByFilter = this.isGlobalRole(req.user.role) ? undefined : req.user.userId;
      const result = await this.trainingOrdersService.findForMiniProgram(
        parseInt(page, 10) || 1,
        parseInt(limit, 10) || 10,
        search,
        createdByFilter,
      );
      return { success: true, data: result, message: '获取职培订单列表成功' };
    } catch (error: any) {
      this.logger.error(`获取职培订单列表失败: ${error.message}`, error.stack);
      return { success: false, message: error.message || '获取职培订单列表失败' };
    }
  }

  @Get('detail/:id')
  @Permissions('training-order:view')
  @ApiOperation({ summary: '【小程序】获取职培订单详情（含学员信息）' })
  @ApiParam({ name: 'id', description: '订单 ID' })
  async detail(@Param('id') id: string) {
    try {
      const data = await this.trainingOrdersService.findOneWithLead(id);
      return { success: true, data, message: '获取职培订单详情成功' };
    } catch (error: any) {
      this.logger.error(`获取职培订单详情失败: ${error.message}`, error.stack);
      return { success: false, message: error.message || '获取职培订单详情失败' };
    }
  }

  @Post('validate-student')
  @Permissions('training-order:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】按手机号预查学员线索（用于表单预填，查不到放行）' })
  async validateStudent(@Body() body: { phone?: string }) {
    if (!body?.phone) throw new BadRequestException('phone 不能为空');
    const lead = await this.trainingOrdersService.findStudentByPhone(body.phone);
    return {
      success: true,
      data: { exists: !!lead, lead: lead || null },
      message: lead ? '学员已存在' : '未查到学员，可作为新学员继续创建',
    };
  }

  @Post('create')
  @Permissions('training-order:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】创建职培订单（仅落库，不触发爱签；复购不拒绝）' })
  async create(@Body() body: any, @Request() req?) {
    try {
      const prepared = await this.trainingOrdersService.prepareCreateDtoForMiniProgram(body as CreateContractDto);

      const validation = this.contractsService.validateEsignFields(prepared);
      if (!validation.valid) {
        return {
          success: false,
          message: `数据验证失败：${validation.message}`,
          error: { code: 'VALIDATION_ERROR', missingFields: validation.missingFields, details: validation.message },
        };
      }

      const userId = (req?.user?.userId as string) || undefined;
      const contract = await this.contractsService.create(prepared, userId, { autoInitiateEsign: false });
      const contractId = (contract as any)._id?.toString() || (contract as any).id;

      this.logger.log(`[职培订单-小程序] 创建成功 contractNumber=${contract.contractNumber} _id=${contractId}`);
      return {
        success: true,
        data: {
          _id: contractId,
          contractNumber: contract.contractNumber,
          contractStatus: contract.contractStatus || 'draft',
          customerName: contract.customerName,
          customerPhone: contract.customerPhone,
          createdAt: contract.createdAt,
        },
        message: `✅ 职培订单创建成功！订单号：${contract.contractNumber}`,
        nextStep: {
          action: 'initiate_signing',
          endpoint: `/api/training-orders/miniprogram/initiate-signing/${contractId}`,
        },
      };
    } catch (error: any) {
      this.logger.error(`[职培订单-小程序] 创建失败: ${error.message}`, error.stack);
      return { success: false, message: error.message || '创建职培订单失败', error: { code: 'CREATE_ERROR', details: error.message } };
    }
  }

  @Post('initiate-signing/:id')
  @Permissions('training-order:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】发起职培订单签署（甲方企业自动签 + 乙方学员有感知签）' })
  @ApiParam({ name: 'id', description: '订单 ID' })
  async initiateSigning(@Param('id') id: string, @Request() req?) {
    try {
      const userId = (req?.user?.userId as string) || 'miniprogram-user';
      const result = await this.trainingOrdersService.initiateSigningForMiniProgram(id, userId);
      return {
        success: true,
        data: result,
        message: result.alreadyInitiated ? '✅ 签署链接已存在（之前已生成）' : '✅ 签署链接生成成功！',
      };
    } catch (error: any) {
      this.logger.error(`[职培订单-小程序] 发起签署失败: ${error.message}`, error.stack);
      return { success: false, message: error.message || '发起签署失败', error: { code: 'INITIATE_SIGNING_ERROR', details: error.message } };
    }
  }
}
