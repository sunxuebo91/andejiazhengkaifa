import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  Patch,
  UseGuards,
  Request,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { ESignService } from '../esign/esign.service';
import { ContractApprovalsService } from '../contract-approvals/contract-approvals.service';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  private readonly logger = new Logger(ContractsController.name);

  constructor(
    private readonly contractsService: ContractsService,
    private readonly esignService: ESignService,
    private readonly approvalsService: ContractApprovalsService,
  ) {}

  // 检查是否是管理员
  private isAdmin(user: any): boolean {
    return user.role === '系统管理员' || user.role === 'admin';
  }

  // 检查是否是管理员或经理
  private isManagerOrAdmin(user: any): boolean {
    return this.isAdmin(user) || user.role === '经理' || user.role === 'manager';
  }

  @Post()
  async create(@Body() createContractDto: CreateContractDto, @Request() req) {
    try {
      // ✅ CRM端保持原样：自动触发爱签流程
      const contract = await this.contractsService.create(
        createContractDto,
        req.user.userId,
        // 不传递 options 参数，使用默认值 autoInitiateEsign: true
      );
      return {
        success: true,
        data: contract,
        message: '合同创建成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '合同创建失败',
      };
    }
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('showAll') showAll?: string,
    @Request() req?,
  ) {
    try {
      const user = req?.user;
      // 管理员和经理可以看到所有合同，普通员工只能看自己创建的
      const createdBy = this.isManagerOrAdmin(user) ? undefined : user?.userId;

      const result = await this.contractsService.findAll(
        parseInt(page),
        parseInt(limit),
        search,
        showAll === 'true',
        createdBy,
      );
      return {
        success: true,
        data: result,
        message: '获取合同列表成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取合同列表失败',
      };
    }
  }

  @Get('statistics')
  async getStatistics() {
    try {
      const statistics = await this.contractsService.getStatistics();
      return {
        success: true,
        data: statistics,
        message: '获取统计信息成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取统计信息失败',
      };
    }
  }

  @Get('customer/:customerId')
  async findByCustomerId(@Param('customerId') customerId: string) {
    try {
      // ✅ 验证 customerId 是否是有效的 MongoDB ObjectId（24位十六进制字符串）
      const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(customerId);
      if (!isValidObjectId) {
        return {
          success: false,
          message: `无效的客户ID格式: ${customerId}。请使用客户的 _id (MongoDB ObjectId) 而不是 customerId 字段`,
          error: 'INVALID_CUSTOMER_ID_FORMAT'
        };
      }

      const contracts = await this.contractsService.findByCustomerId(customerId);
      return {
        success: true,
        data: contracts,
        message: '获取客户合同列表成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取客户合同列表失败',
      };
    }
  }

  @Get('worker/:workerId')
  async findByWorkerId(@Param('workerId') workerId: string) {
    try {
      const contracts = await this.contractsService.findByWorkerId(workerId);
      return {
        success: true,
        data: contracts,
        message: '获取服务人员合同列表成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取服务人员合同列表失败',
      };
    }
  }

  @Get('number/:contractNumber')
  async findByContractNumber(@Param('contractNumber') contractNumber: string) {
    try {
      const contract = await this.contractsService.findByContractNumber(contractNumber);
      return {
        success: true,
        data: contract,
        message: '获取合同详情成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取合同详情失败',
      };
    }
  }

  /**
   * 根据服务人员信息查询合同（用于保险投保页面自动填充）
   * 注意：此路由必须放在 @Get(':id') 之前，否则会被当作 ID 参数处理
   */
  @Public()
  @Get('search-by-worker')
  async searchByWorkerInfo(
    @Query('name') name?: string,
    @Query('idCard') idCard?: string,
    @Query('phone') phone?: string,
  ) {
    try {
      const contracts = await this.contractsService.searchByWorkerInfo(name, idCard, phone);
      return {
        success: true,
        data: contracts,
        message: contracts.length > 0 ? '查询成功' : '未找到匹配的合同',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '查询合同失败',
      };
    }
  }

  /**
   * 重新获取签署链接
   * 注意：此路由必须放在 @Get(':id') 之前，否则会被当作 ID 参数处理
   */
  @Post(':id/resend-sign-urls')
  async resendSignUrls(@Param('id') contractId: string) {
    try {
      console.log('🔄 开始重新获取签署链接, 合同ID:', contractId);
      const contract = await this.contractsService.findOne(contractId);

      if (!contract.esignContractNo) {
        console.log('❌ 合同未关联爱签合同');
        return {
          success: false,
          message: '该合同未关联爱签合同',
        };
      }

      console.log('📝 爱签合同编号:', contract.esignContractNo);
      // 使用新的获取签署链接方法
      const result = await this.esignService.getContractSignUrls(contract.esignContractNo);

      console.log('📊 获取签署链接结果:', {
        success: result.success,
        message: result.message,
        signUrlsCount: result.data?.signUrls?.length || 0,
      });

      if (!result.success) {
        console.log('❌ 获取签署链接失败:', result.message);
        return {
          success: false,
          message: result.message || '获取签署链接失败',
        };
      }

      // 更新到数据库
      await this.contractsService.update(contractId, {
        esignSignUrls: JSON.stringify(result.data.signUrls),
      });

      console.log('✅ 签署链接已保存到数据库');
      console.log('🎉 返回结果给前端:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('❌ 重新获取签署链接失败:', error);
      return {
        success: false,
        message: error.message || '获取签署链接失败',
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    console.log('🚨🚨🚨 [CONTRACTS API CALLED] 收到合同详情请求, ID:', id);
    console.log('🚨🚨🚨 [CONTRACTS API CALLED] 当前时间:', new Date().toISOString());
    try {
      const contract = await this.contractsService.findOne(id);
      console.log('🚨🚨🚨 [CONTRACTS API CALLED] 合同详情查询完成:', {
        contractNumber: contract.contractNumber,
        hasLastUpdatedBy: !!contract.lastUpdatedBy,
        lastUpdatedBy: contract.lastUpdatedBy
      });
      return {
        success: true,
        data: contract,
        message: '获取合同详情成功',
      };
    } catch (error) {
      console.error('🚨🚨🚨 [CONTRACTS API CALLED] 合同详情查询失败:', error);
      return {
        success: false,
        message: error.message || '获取合同详情失败',
      };
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateContractDto: UpdateContractDto, @Request() req) {
    try {
      const contract = await this.contractsService.update(id, updateContractDto, req.user.userId);
      return {
        success: true,
        data: contract,
        message: '合同更新成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '合同更新失败',
      };
    }
  }

  // 删除请求端点（管理员直接删除，员工创建审批请求）
  @Post(':id/request-deletion')
  async requestDeletion(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req,
  ) {
    try {
      this.logger.log(`用户 ${req.user.username} (${req.user.name}) 请求删除合同 ${id}`);

      // 获取合同信息
      const contract = await this.contractsService.findOne(id);

      // 如果是管理员，直接删除
      if (this.isAdmin(req.user)) {
        this.logger.log(`管理员直接删除合同 ${id}`);
        await this.contractsService.remove(id);
        return {
          success: true,
          message: '合同删除成功',
        };
      }

      // 非管理员，创建审批请求
      this.logger.log(`创建删除审批请求，合同 ${id}`);
      const approval = await this.approvalsService.createDeletionApproval(
        id,
        contract.contractNumber,
        req.user.userId,
        req.user.name,
        body.reason || '申请删除合同',
      );

      return {
        success: true,
        message: '删除申请已提交，等待审批',
        data: approval,
      };
    } catch (error) {
      this.logger.error(`删除请求失败: ${error.message}`);
      return {
        success: false,
        message: error.message || '操作失败',
      };
    }
  }

  // 保留原有的删除端点（仅供内部使用）
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    try {
      // 只有管理员可以直接删除
      if (!this.isAdmin(req.user)) {
        throw new ForbiddenException('只有管理员可以直接删除合同');
      }

      await this.contractsService.remove(id);
      return {
        success: true,
        message: '合同删除成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '合同删除失败',
      };
    }
  }

  // 分配合同给指定用户（仅管理员和经理）
  @Patch(':id/assign')
  async assignContract(
    @Param('id') id: string,
    @Body() body: { assignedTo: string; reason?: string },
    @Request() req,
  ) {
    try {
      if (!this.isManagerOrAdmin(req.user)) {
        throw new ForbiddenException('只有管理员或经理可以分配合同');
      }

      this.logger.log(`👥 管理员 ${req.user.name} 分配合同 ${id} 给 ${body.assignedTo}`);

      const contract = await this.contractsService.assignContract(
        id,
        body.assignedTo,
        req.user.userId,
        body.reason,
      );

      return {
        success: true,
        data: contract,
        message: '合同分配成功',
      };
    } catch (error) {
      this.logger.error(`分配合同失败: ${error.message}`);
      return {
        success: false,
        message: error.message || '合同分配失败',
      };
    }
  }

  // 获取可分配的员工列表
  @Get('assignable-users')
  async getAssignableUsers(@Request() req) {
    try {
      if (!this.isManagerOrAdmin(req.user)) {
        throw new ForbiddenException('只有管理员或经理可以查看员工列表');
      }

      const users = await this.contractsService.getAssignableUsers();
      return {
        success: true,
        data: users,
        message: '获取成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取员工列表失败',
      };
    }
  }

  @Get('test-no-auth')
  @Public()
  async testNoAuth() {
    return {
      success: true,
      message: '无认证测试端点正常',
      timestamp: new Date().toISOString()
    };
  }

  @Get(':id/esign-info')
  async getEsignInfo(@Param('id') contractId: string) {
    try {
      // 获取本地合同信息
      const contract = await this.contractsService.findOne(contractId);
      
      if (!contract.esignContractNo) {
        return {
          success: false,
          message: '该合同未关联爱签合同',
        };
      }

      // 获取爱签实时状态
      const [statusResult, previewResult] = await Promise.allSettled([
        this.esignService.getContractStatus(contract.esignContractNo),
        this.esignService.previewContractWithSignUrls(contract.esignContractNo),
      ]);

      const result: any = {
        contractNo: contract.esignContractNo,
        templateNo: contract.esignTemplateNo,
      };

      // 处理状态查询结果
      if (statusResult.status === 'fulfilled' && statusResult.value.success) {
        result.status = statusResult.value.data;
      } else {
        result.statusError = statusResult.status === 'rejected' 
          ? statusResult.reason.message 
          : statusResult.value.message;
      }

      // 处理预览结果
      if (previewResult.status === 'fulfilled' && previewResult.value.success) {
        result.preview = previewResult.value.data;
      } else {
        result.previewError = previewResult.status === 'rejected'
          ? previewResult.reason.message
          : previewResult.value.message;
      }

      return {
        success: true,
        data: result,
        message: '获取爱签信息成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取爱签信息失败',
      };
    }
  }

  @Post(':id/download-contract')
  async downloadContract(
    @Param('id') contractId: string,
    @Body() options: { force?: number; downloadFileType?: number } = {}
  ) {
    try {
      const contract = await this.contractsService.findOne(contractId);

      if (!contract.esignContractNo) {
        return {
          success: false,
          message: '该合同未关联爱签合同',
        };
      }

      const result = await this.esignService.downloadSignedContract(
        contract.esignContractNo,
        options
      );

      return {
        success: true,
        data: result,
        message: '合同下载成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '合同下载失败',
      };
    }
  }

  @Post('esign/test-get-contract')
  async testGetContract(@Body() body: { contractNo: string }) {
    try {
      const result = await this.esignService.getContractInfo(body.contractNo);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message || '测试getContract失败',
        error: error.toString()
      };
    }
  }

  // ==================== 换人功能 API ====================

  /**
   * 检查客户现有合同
   */
  @Get('check-customer/:customerPhone')
  @Public()
  async checkCustomerContract(@Param('customerPhone') customerPhone: string) {
    try {
      const result = await this.contractsService.checkCustomerExistingContract(customerPhone);
      return {
        success: true,
        data: result,
        message: result.hasContract ? '客户已有合同' : '客户暂无合同',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '检查客户合同失败',
      };
    }
  }

  /**
   * 创建换人合同
   */
  @Post('change-worker/:originalContractId')
  async createChangeWorkerContract(
    @Param('originalContractId') originalContractId: string,
    @Body() createContractDto: CreateContractDto,
    @Request() req
  ) {
    try {
      const userId = req.user?.userId || req.user?.sub || 'system-user';
      const newContract = await this.contractsService.createChangeWorkerContract(
        createContractDto,
        originalContractId,
        userId
      );
      return {
        success: true,
        data: newContract,
        message: '换人合同创建成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '换人合同创建失败',
      };
    }
  }

  /**
   * 获取客户合同历史
   */
  @Get('history/:customerPhone')
  @Public()
  async getCustomerHistory(@Param('customerPhone') customerPhone: string) {
    try {
      const history = await this.contractsService.getCustomerContractHistory(customerPhone);
      return {
        success: true,
        data: history,
        message: history ? '获取客户合同历史成功' : '该客户暂无合同历史记录',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取客户合同历史失败',
      };
    }
  }

  /**
   * 获取最新合同列表（只显示每个客户的最新合同）- 临时禁用
   */
  @Get('latest/list')
  async getLatestContracts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    try {
      // const result = await this.contractsService.findLatestContracts(
      //   parseInt(page),
      //   parseInt(limit),
      //   search,
      // );
      return {
        success: false,
        message: '最新合同列表功能开发中',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取最新合同列表失败',
      };
    }
  }

  /**
   * 合同签约成功回调 - 临时禁用
   */
  @Post('signed-callback/:contractId')
  async handleContractSigned(
    @Param('contractId') contractId: string,
    @Body() esignData: any
  ) {
    try {
      // await this.contractsService.handleContractSigned(contractId, esignData);
      return {
        success: false,
        message: '合同签约回调功能开发中',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '合同签约成功处理失败',
      };
    }
  }

  /**
   * 手动触发保险同步（用于重试失败的同步）
   * 增强功能：先查询爱签API确认合同状态，再触发保险同步
   */
  @Post(':id/sync-insurance')
  async syncInsurance(@Param('id') contractId: string) {
    try {
      this.logger.log(`🔄 手动触发保险同步: ${contractId}`);

      // 调用增强的同步方法（会先查询爱签状态）
      const result = await this.contractsService.manualSyncInsurance(contractId);

      return {
        success: true,
        message: result.message || '保险同步已完成',
        data: result,
      };
    } catch (error) {
      this.logger.error(`保险同步失败:`, error);
      return {
        success: false,
        message: error.message || '保险同步失败',
      };
    }
  }
}

// 创建一个独立的测试控制器，不使用认证
@Controller('contracts-test')
export class ContractsTestController {
  constructor(private readonly contractsService: ContractsService) {}

  /**
   * 检查客户现有合同 - 测试版本
   */
  @Get('check-customer/:customerPhone')
  async checkCustomerContract(@Param('customerPhone') customerPhone: string) {
    try {
      const result = await this.contractsService.checkCustomerExistingContract(customerPhone);
      return {
        success: true,
        data: result,
        message: result.hasContract ? '客户已有合同' : '客户暂无合同',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '检查客户合同失败',
      };
    }
  }

  /**
   * 创建换人合同 - 测试版本
   */
  @Post('change-worker/:originalContractId')
  async createChangeWorkerContract(
    @Param('originalContractId') originalContractId: string,
    @Body() createContractDto: CreateContractDto
  ) {
    try {
      const newContract = await this.contractsService.createChangeWorkerContract(
        createContractDto,
        originalContractId,
        'test-user-id' // 临时用户ID
      );
      return {
        success: true,
        data: newContract,
        message: '换人合同创建成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '换人合同创建失败',
      };
    }
  }

  /**
   * 获取客户合同历史 - 测试版本
   */
  @Get('history/:customerPhone')
  async getCustomerHistory(@Param('customerPhone') customerPhone: string) {
    try {
      const history = await this.contractsService.getCustomerContractHistory(customerPhone);
      return {
        success: true,
        data: history,
        message: history ? '获取客户合同历史成功' : '该客户暂无合同历史记录',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取客户合同历史失败',
      };
    }
  }
}