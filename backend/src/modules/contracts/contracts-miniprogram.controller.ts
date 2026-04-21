import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ESignService } from '../esign/esign.service';
import { ContractStatus } from './models/contract.model';
import { MiniProgramNotificationService } from '../miniprogram-notification/miniprogram-notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('小程序-合同管理')
@Controller('contracts/miniprogram')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractsMiniProgramController {
  private readonly logger = new Logger(ContractsMiniProgramController.name);

  constructor(
    private readonly contractsService: ContractsService,
    private readonly esignService: ESignService,
    private readonly mpNotificationService: MiniProgramNotificationService,
  ) {}

  // 辅助方法：角色映射
  private mapRoleToChineseRole(role: string): string {
    const roleMap = {
      'admin': '系统管理员',
      'manager': '经理',
      'employee': '普通员工',
      'operator': '运营',
      'dispatch': '派单老师',
      'admissions': '招生老师',
    };
    return roleMap[role] || role;
  }

  // ==================== 合同查询接口 ====================

  /**
   * 获取合同列表（分页）
   */
  @Get('list')
  @Permissions('contract:view')
  @ApiOperation({ summary: '【小程序】获取合同列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认1' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量，默认10' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'syncStatus', required: false, description: '是否同步爱签状态（true/false），默认true' })
  async getContractList(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('syncStatus') syncStatus: string = 'true',
    @Request() req?,
  ) {
    try {
      const userRole = this.mapRoleToChineseRole(req.user.role);
      const userId = req.user.userId;

      // 普通员工、派单老师、招生老师只能看自己创建的合同
      const restrictedRoles = ['普通员工', '派单老师', '招生老师'];
      const createdByFilter = restrictedRoles.includes(userRole) ? userId : undefined;

      const result = await this.contractsService.findAll(
        parseInt(page),
        parseInt(limit),
        search,
        true,
        createdByFilter,
      );

      // 🔥 处理合同数据，添加 creatorName 字段
      const processedContracts = await Promise.all(
        result.contracts.map(async (contract: any) => {
          // 将 Mongoose 文档转换为普通对象，以便添加新字段
          const contractObj = contract.toObject ? contract.toObject() : { ...contract };

          // 🔥 添加创建人姓名字段（从 populate 的 createdBy 对象中提取）
          if (contractObj.createdBy && typeof contractObj.createdBy === 'object' && contractObj.createdBy.name) {
            contractObj.creatorName = contractObj.createdBy.name;
          } else {
            contractObj.creatorName = null;
          }

          // 如果需要同步状态且有爱签合同编号，查询最新状态
          if (syncStatus === 'true' && contractObj.esignContractNo) {
            try {
              const statusResponse = await this.esignService.getContractStatus(contractObj.esignContractNo);

              if (statusResponse && statusResponse.data) {
                const latestEsignStatus = statusResponse.data.status?.toString();

                // 更新合同对象中的状态（不写入数据库，只返回给前端）
                contractObj.esignStatus = latestEsignStatus;
                contractObj.esignStatusText = this.getStatusText(latestEsignStatus);

                // 🔥 统一映射：爱签状态 → 本地 contractStatus
                contractObj.contractStatus = this.mapEsignStatusToContractStatus(latestEsignStatus);

                this.logger.log(`✅ 合同 ${contractObj.contractNumber} 状态已同步: ${latestEsignStatus} (${contractObj.esignStatusText})`);
              }
            } catch (error) {
              this.logger.warn(`⚠️  查询合同 ${contractObj.contractNumber} 爱签状态失败: ${error.message}`);
              // 查询失败时保留原有状态
            }
          }

          // 🔥 统一日期显示：优先使用 templateParams 中的日期（与CRM端保持一致）
          const templateParams = contractObj.templateParams || {};
          const templateStartDate = templateParams['合同开始时间'] || templateParams['服务开始时间'];
          const templateEndDate = templateParams['合同结束时间'] || templateParams['服务结束时间'];

          const parseTemplateDate = (dateStr: string): string | null => {
            if (!dateStr) return null;
            const chineseMatch = dateStr.match(/(\d{4})年(\d{2})月(\d{2})日/);
            if (chineseMatch) {
              return `${chineseMatch[1]}-${chineseMatch[2]}-${chineseMatch[3]}`;
            }
            const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
              return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
            }
            return null;
          };

          contractObj.displayStartDate = parseTemplateDate(templateStartDate) ||
            (contractObj.startDate ? new Date(contractObj.startDate).toISOString().split('T')[0] : null);
          contractObj.displayEndDate = parseTemplateDate(templateEndDate) ||
            (contractObj.endDate ? new Date(contractObj.endDate).toISOString().split('T')[0] : null);

          return contractObj;
        })
      );

      result.contracts = processedContracts;
      if (syncStatus === 'true') {
        this.logger.log(`✅ 合同状态同步完成`);
      }

      return { success: true, data: result, message: '获取合同列表成功' };
    } catch (error) {
      return { success: false, message: error.message || '获取合同列表失败' };
    }
  }

  /**
   * 根据合同ID获取详情
   */
  @Get('detail/:id')
  @Permissions('contract:view')
  @ApiOperation({ summary: '【小程序】根据ID获取合同详情' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async getContractDetail(@Param('id') id: string) {
    try {
      const contract = await this.contractsService.findOne(id);
      // 🔥 添加 creatorName 字段
      const contractData = contract.toObject ? contract.toObject() : { ...contract };
      if (contractData.createdBy && typeof contractData.createdBy === 'object' && contractData.createdBy.name) {
        contractData.creatorName = contractData.createdBy.name;
      } else {
        contractData.creatorName = null;
      }

      // 🔥 统一日期显示：优先使用 templateParams 中的日期（与CRM端保持一致）
      // 解决小程序端显示的日期与CRM端不一致的问题
      const templateParams = contractData.templateParams || {};

      // 获取 templateParams 中的日期（格式可能是 "2026年03月10日" 或 "2026-03-10"）
      const templateStartDate = templateParams['合同开始时间'] || templateParams['服务开始时间'];
      const templateEndDate = templateParams['合同结束时间'] || templateParams['服务结束时间'];

      // 解析日期的辅助函数
      const parseTemplateDate = (dateStr: string): string | null => {
        if (!dateStr) return null;
        // 处理 "2026年03月10日" 格式
        const chineseMatch = dateStr.match(/(\d{4})年(\d{2})月(\d{2})日/);
        if (chineseMatch) {
          return `${chineseMatch[1]}-${chineseMatch[2]}-${chineseMatch[3]}`;
        }
        // 处理 "2026-03-10" 格式
        const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        }
        return null;
      };

      // 添加统一的显示日期字段
      contractData.displayStartDate = parseTemplateDate(templateStartDate) ||
        (contractData.startDate ? new Date(contractData.startDate).toISOString().split('T')[0] : null);
      contractData.displayEndDate = parseTemplateDate(templateEndDate) ||
        (contractData.endDate ? new Date(contractData.endDate).toISOString().split('T')[0] : null);

      // 🔥 添加 templateNo 字段（从 esignTemplateNo 映射，方便小程序使用）
      if (contractData.esignTemplateNo) {
        contractData.templateNo = contractData.esignTemplateNo;
      }

      return { success: true, data: contractData, message: '获取合同详情成功' };
    } catch (error) {
      return { success: false, message: error.message || '获取合同详情失败' };
    }
  }

  /**
   * 根据合同编号获取合同
   */
  @Get('by-number/:contractNumber')
  @Permissions('contract:view')
  @ApiOperation({ summary: '【小程序】根据合同编号获取合同' })
  @ApiParam({ name: 'contractNumber', description: '合同编号' })
  async getByContractNumber(@Param('contractNumber') contractNumber: string) {
    try {
      const contract = await this.contractsService.findByContractNumber(contractNumber);
      // 🔥 添加 creatorName 字段
      const contractData: any = (contract as any).toObject ? (contract as any).toObject() : { ...contract };
      if (contractData.createdBy && typeof contractData.createdBy === 'object' && contractData.createdBy.name) {
        contractData.creatorName = contractData.createdBy.name;
      } else {
        contractData.creatorName = null;
      }
      return { success: true, data: contractData, message: '获取合同详情成功' };
    } catch (error) {
      return { success: false, message: error.message || '获取合同详情失败' };
    }
  }

  /**
   * 根据客户ID获取合同列表
   */
  @Get('by-customer/:customerId')
  @Permissions('contract:view')
  @ApiOperation({ summary: '【小程序】根据客户ID获取合同列表' })
  @ApiParam({ name: 'customerId', description: '客户ID' })
  async getByCustomerId(@Param('customerId') customerId: string) {
    try {
      const contracts = await this.contractsService.findByCustomerId(customerId);
      return { success: true, data: contracts, message: '获取客户合同列表成功' };
    } catch (error) {
      return { success: false, message: error.message || '获取客户合同列表失败' };
    }
  }

  /**
   * 根据服务人员ID获取合同列表
   */
  @Get('by-worker-id/:workerId')
  @Permissions('contract:view')
  @ApiOperation({ summary: '【小程序】根据服务人员ID获取合同列表' })
  @ApiParam({ name: 'workerId', description: '服务人员ID（简历ID）' })
  async getByWorkerId(@Param('workerId') workerId: string) {
    try {
      const contracts = await this.contractsService.findByWorkerId(workerId);
      return { success: true, data: contracts, message: '获取服务人员合同列表成功' };
    } catch (error) {
      return { success: false, message: error.message || '获取服务人员合同列表失败' };
    }
  }

  /**
   * 根据服务人员信息搜索合同（姓名/身份证/手机号）
   */
  @Get('search-worker')
  @Permissions('contract:view')
  @ApiOperation({ summary: '【小程序】根据服务人员信息搜索合同' })
  @ApiQuery({ name: 'name', required: false, description: '服务人员姓名' })
  @ApiQuery({ name: 'idCard', required: false, description: '服务人员身份证号' })
  @ApiQuery({ name: 'phone', required: false, description: '服务人员手机号' })
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
      return { success: false, message: error.message || '查询合同失败' };
    }
  }

  /**
   * 检查客户现有合同
   */
  @Get('check-customer/:customerPhone')
  @Permissions('contract:view')
  @ApiOperation({ summary: '【小程序】检查客户现有合同' })
  @ApiParam({ name: 'customerPhone', description: '客户手机号' })
  async checkCustomerContract(@Param('customerPhone') customerPhone: string) {
    try {
      const result = await this.contractsService.checkCustomerExistingContract(customerPhone);
      return {
        success: true,
        data: result,
        message: result.hasContract ? '客户已有合同' : '客户暂无合同',
      };
    } catch (error) {
      return { success: false, message: error.message || '检查客户合同失败' };
    }
  }

  /**
   * 获取客户合同历史
   */
  @Get('history/:customerPhone')
  @Permissions('contract:view')
  @ApiOperation({ summary: '【小程序】获取客户合同历史' })
  @ApiParam({ name: 'customerPhone', description: '客户手机号' })
  async getCustomerHistory(@Param('customerPhone') customerPhone: string) {
    try {
      const history = await this.contractsService.getCustomerContractHistory(customerPhone);
      return {
        success: true,
        data: history,
        message: history ? '获取客户合同历史成功' : '该客户暂无合同历史记录',
      };
    } catch (error) {
      return { success: false, message: error.message || '获取客户合同历史失败' };
    }
  }

  /**
   * 获取合同统计信息
   */
  @Get('statistics')
  @Permissions('contract:view')
  @ApiOperation({ summary: '【小程序】获取合同统计信息' })
  async getStatistics() {
    try {
      const statistics = await this.contractsService.getStatistics();
      return { success: true, data: statistics, message: '获取统计信息成功' };
    } catch (error) {
      return { success: false, message: error.message || '获取统计信息失败' };
    }
  }

  // ==================== 合同操作接口 ====================

  /**
   * 验证合同数据（提交前验证）
   */
  @Post('validate')
  @Permissions('contract:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】验证合同数据' })
  async validateContract(@Body() createContractDto: CreateContractDto) {
    try {
      const validation = this.contractsService.validateEsignFields(createContractDto);

      if (validation.valid) {
        return {
          success: true,
          valid: true,
          message: '✅ 数据验证通过，可以提交创建合同'
        };
      } else {
        return {
          success: true,
          valid: false,
          message: validation.message,
          missingFields: validation.missingFields,
          details: {
            templateNo: createContractDto.templateNo ? '✅ 已提供' : '❌ 缺失',
            customerName: createContractDto.customerName ? '✅ 已提供' : '❌ 缺失',
            customerIdCard: createContractDto.customerIdCard ? '✅ 已提供' : '❌ 缺失',
            workerName: createContractDto.workerName ? '✅ 已提供' : '❌ 缺失',
            workerIdCard: createContractDto.workerIdCard ? '✅ 已提供' : '❌ 缺失',
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || '验证失败'
      };
    }
  }

  /**
   * 创建合同
   * 🔥 使用 any 类型接收请求体，以保留小程序传递的中文字段（如"客户姓名"、"阿姨工资"等）
   * 这些字段会被保存到 templateParams 中，用于后续发起爱签签署
   */
  @Post('create')
  @Permissions('contract:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】创建合同' })
  async createContract(@Body() body: any, @Request() req?) {
    try {
      // 🔥 打印接收到的原始数据，用于调试
      this.logger.log(`📥 收到创建合同请求，字段数量: ${Object.keys(body || {}).length}`);

      // 🔍 数据验证：检查爱签必填字段
      const validation = this.contractsService.validateEsignFields(body);

      if (!validation.valid) {
        this.logger.warn(`❌ 合同创建失败：数据验证不通过`, {
          missingFields: validation.missingFields,
          receivedData: {
            templateNo: body.templateNo,
            customerName: body.customerName,
            customerPhone: body.customerPhone,
            customerIdCard: body.customerIdCard ? '已提供' : '未提供',
            workerName: body.workerName,
            workerPhone: body.workerPhone,
            workerIdCard: body.workerIdCard ? '已提供' : '未提供',
          }
        });

        return {
          success: false,
          message: `数据验证失败：${validation.message}`,
          error: {
            code: 'VALIDATION_ERROR',
            missingFields: validation.missingFields,
            details: validation.message
          }
        };
      }

      // ✅ 数据验证通过，创建合同（不自动触发爱签流程）
      this.logger.log(`✅ 数据验证通过，开始创建合同（不自动触发爱签）`);

      // 使用当前登录用户作为创建人，避免使用固定占位ID导致无法关联创建人
      const currentUserId = (body && body.createdBy) || (req?.user?.userId as string) || undefined;

      const contract = await this.contractsService.create(
        body as CreateContractDto,  // 🔥 使用 body（包含所有字段，包括中文字段）
        currentUserId,
        { autoInitiateEsign: false }  // 🔥 不自动触发爱签流程
      );

      const contractId = (contract as any)._id?.toString() || (contract as any).id;

      this.logger.log(`✅ 合同创建成功`, {
        contractNumber: contract.contractNumber,
        contractStatus: contract.contractStatus,
        _id: contractId
      });

      return {
        success: true,
        data: {
          _id: contractId,
          contractNumber: contract.contractNumber,
          contractStatus: contract.contractStatus || 'draft',
          customerName: contract.customerName,
          customerPhone: contract.customerPhone,
          workerName: contract.workerName,
          workerPhone: contract.workerPhone,
          createdAt: contract.createdAt
        },
        message: `✅ 合同创建成功！合同编号：${contract.contractNumber}`,
        nextStep: {
          action: 'initiate_signing',
          description: '请点击「发起签署」按钮获取签署链接',
          endpoint: `/api/contracts/miniprogram/initiate-signing/${contractId}`
        }
      }
    } catch (error) {
      this.logger.error(`❌ 合同创建失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || '合同创建失败',
        error: {
          code: 'CREATE_ERROR',
          details: error.message
        }
      };
    }
  }

  /**
   * 发起签署（手动触发爱签流程）
   */
  @Post('initiate-signing/:id')
  @Permissions('contract:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】发起签署' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async initiateSigning(@Param('id') contractId: string) {
    try {
      this.logger.log(`📝 收到发起签署请求，合同ID: ${contractId}`);

      // 1. 获取合同信息
      const contract = await this.contractsService.findOne(contractId);
      if (!contract) {
        return {
          success: false,
          message: '合同不存在',
          error: {
            code: 'CONTRACT_NOT_FOUND',
            details: '未找到指定的合同'
          }
        };
      }

      // 2. 检查合同是否已经发起过签署
      if (contract.esignContractNo && contract.esignSignUrls) {
        this.logger.log(`⚠️ 合同已发起过签署，返回现有签署链接`);

        const signUrls = JSON.parse(contract.esignSignUrls);
        return {
          success: true,
          data: {
            contractId: contract._id,
            contractNumber: contract.contractNumber,
            esignContractNo: contract.esignContractNo,
            contractStatus: contract.contractStatus,
            signUrls: signUrls
          },
          message: '✅ 签署链接已存在（之前已生成）'
        };
      }

      // 3. 数据验证
      const validation = this.contractsService.validateEsignFields(contract as any);
      if (!validation.valid) {
        return {
          success: false,
          message: `数据验证失败：${validation.message}`,
          error: {
            code: 'VALIDATION_ERROR',
            missingFields: validation.missingFields,
            details: validation.message
          }
        };
      }

      // 4. 提取模板参数
      const templateParams = this.contractsService.extractTemplateParamsPublic(contract as any);
      this.logger.log(`📋 提取的模板参数:`, JSON.stringify(templateParams, null, 2));

      // 5. 调用爱签API创建合同并生成签署链接
      this.logger.log(`🚀 开始为合同 ${contract.contractNumber} 创建爱签电子合同...`);

      // 获取模板编号（支持 templateNo 或 esignTemplateNo）
      const templateNo = contract.templateNo || contract.esignTemplateNo || 'TN84E8C106BFE74FD3AE36AC2CA33A44DE';
      this.logger.log(`📋 使用模板编号: ${templateNo}`);

      const esignResult = await this.esignService.createCompleteContractFlow({
        contractNo: contract.contractNumber,
        contractName: `${contract.contractType || '服务'}合同`,
        templateNo: templateNo,
        templateParams: templateParams,
        signers: [
          {
            name: contract.customerName,
            mobile: contract.customerPhone,
            idCard: contract.customerIdCard,
            signType: 'manual', // 有感知签署（用户需要在签署时进行实名认证）
            validateType: 'sms'
          },
          {
            name: contract.workerName,
            mobile: contract.workerPhone,
            idCard: contract.workerIdCard,
            signType: 'manual', // 有感知签署
            validateType: 'sms'
          },
          {
            // 🔥 丙方（企业）签署人 - 与CRM端保持一致
            name: '北京安得家政有限公司',
            mobile: '400-000-0000', // 企业客服电话
            idCard: '91110111MACJMD2R5J', // 企业统一社会信用代码作为标识
            signType: 'auto', // 无感知签约（自动签章）
            validateType: 'sms'
          }
        ],
        validityTime: 30,
        signOrder: 2 // 🔥 顺序签约：客户先签→阿姨后签→企业自动签
      });

      if (esignResult.success) {
        // 6. 获取正确的签署链接（短链接格式）- 带重试机制
        this.logger.log(`🔄 获取签署短链接...`);
        let finalSignUrls = esignResult.signUrls || [];

        // 重试获取签署链接，最多3次，每次间隔递增
        const maxRetries = 3;
        const retryDelays = [2000, 3000, 5000]; // 2秒、3秒、5秒

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            // 等待一段时间，确保爱签系统已处理完成
            const delay = retryDelays[attempt];
            this.logger.log(`⏳ 等待 ${delay}ms 后获取签署链接 (尝试 ${attempt + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));

            const signUrlsResult = await this.esignService.getContractSignUrls(esignResult.contractNo);
            if (signUrlsResult.success && signUrlsResult.data?.signUrls && signUrlsResult.data.signUrls.length > 0) {
              // 检查是否获取到了短链接格式
              const firstUrl = signUrlsResult.data.signUrls[0]?.signUrl || '';
              // 🔥 修复：正确的短链接格式是 hxcx.asign.cn
              if (firstUrl.includes('hxcx.asign.cn') || firstUrl.includes('/web/short/') || firstUrl.includes('hzuul.asign.cn')) {
                finalSignUrls = signUrlsResult.data.signUrls;
                this.logger.log(`✅ 获取签署短链接成功 (尝试 ${attempt + 1}): ${JSON.stringify(finalSignUrls)}`);
                break; // 成功获取，跳出循环
              } else {
                this.logger.warn(`⚠️ 获取到的不是短链接格式 (尝试 ${attempt + 1}): ${firstUrl}`);
              }
            } else {
              this.logger.warn(`⚠️ 获取签署短链接失败 (尝试 ${attempt + 1}): ${signUrlsResult.message}`);
            }
          } catch (signUrlError) {
            this.logger.warn(`⚠️ 获取签署短链接异常 (尝试 ${attempt + 1}): ${signUrlError.message}`);
          }

          // 如果是最后一次尝试仍然失败，记录警告
          if (attempt === maxRetries - 1) {
            this.logger.warn(`⚠️ 多次尝试后仍无法获取短链接，使用原始链接`);
          }
        }

        // 7. 更新合同的爱签信息
        await this.contractsService.update(
          contractId,
          {
            esignContractNo: esignResult.contractNo,
            esignSignUrls: JSON.stringify(finalSignUrls),
            esignCreatedAt: new Date(),
            contractStatus: 'signing'
          } as any,
          'miniprogram-user'
        );

        this.logger.log(`✅ 爱签电子合同创建成功: ${esignResult.contractNo}`);

        // 📬 触发小程序通知：合同签约邀请
        if (contract.customerPhone) {
          this.mpNotificationService.notifyContractInvite(
            contract.customerPhone,
            contract._id.toString(),
          ).catch(err => this.logger.error(`发送签约邀请通知失败: ${err.message}`));
        }

        return {
          success: true,
          data: {
            contractId: contract._id,
            contractNumber: contract.contractNumber,
            esignContractNo: esignResult.contractNo,
            contractStatus: 'signing',
            signUrls: finalSignUrls
          },
          message: '✅ 签署链接生成成功！'
        };
      } else {
        // 7. 爱签API调用失败
        this.logger.error(`❌ 爱签API调用失败:`, esignResult);

        return {
          success: false,
          message: `❌ 签署链接生成失败：${esignResult.message || '未知错误'}`,
          error: {
            code: 'ESIGN_ERROR',
            esignCode: (esignResult as any).code,
            esignMessage: esignResult.message,
            details: esignResult.message || '请检查合同数据是否完整'
          }
        };
      }
    } catch (error) {
      this.logger.error(`❌ 发起签署失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || '发起签署失败',
        error: {
          code: 'INITIATE_SIGNING_ERROR',
          details: error.message
        }
      };
    }
  }

  /**
   * 更新合同
   */
  @Put('update/:id')
  @Permissions('contract:edit')
  @ApiOperation({ summary: '【小程序】更新合同' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async updateContract(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
  ) {
    try {
      const contract = await this.contractsService.update(id, updateContractDto, 'miniprogram-user');
      return { success: true, data: contract, message: '合同更新成功' };
    } catch (error) {
      return { success: false, message: error.message || '合同更新失败' };
    }
  }

  /**
   * 创建换人合同
   * 🔥 使用 any 类型接收请求体，以保留小程序传递的中文字段（如"休息方式"、"服务时间"、"多选6"、"多选7"等）
   * 这些字段会被保存到 templateParams 中，用于后续发起爱签签署
   */
  @Post('change-worker/:originalContractId')
  @Permissions('contract:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】创建换人合同' })
  @ApiParam({ name: 'originalContractId', description: '原合同ID' })
  async createChangeWorkerContract(
    @Param('originalContractId') originalContractId: string,
    @Body() body: any,  // 🔥 修复：使用 any 类型保留所有字段（包括中文字段）
  ) {
    try {
      // 🔥 打印接收到的原始数据，用于调试
      this.logger.log(`📥 收到换人合同请求，字段数量: ${Object.keys(body || {}).length}`);
      this.logger.log(`📥 换人合同关键字段: 服务时间=${body['服务时间']}, 休息方式=${body['休息方式']}, 多选6=${body['多选6'] ? '有' : '无'}, 多选7=${body['多选7'] ? '有' : '无'}`);

      const newContract = await this.contractsService.createChangeWorkerContract(
        body as CreateContractDto,  // 🔥 使用 body（包含所有字段，包括中文字段）
        originalContractId,
        'miniprogram-user',
      );
      return { success: true, data: newContract, message: '换人合同创建成功' };
    } catch (error) {
      return { success: false, message: error.message || '换人合同创建失败' };
    }
  }

  /**
   * 手动触发保险同步
   */
  @Post('sync-insurance/:id')
  @Permissions('contract:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】手动触发保险同步' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async syncInsurance(@Param('id') contractId: string) {
    try {
      const result = await this.contractsService.manualSyncInsurance(contractId);
      return { success: true, data: result, message: result.message || '保险同步已完成' };
    } catch (error) {
      return { success: false, message: error.message || '保险同步失败' };
    }
  }

  /**
   * 同步爱签合同状态到本地
   */
  @Post('sync-esign-status/:id')
  @Permissions('contract:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】同步爱签合同状态' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async syncEsignStatus(@Param('id') contractId: string) {
    try {
      // 1. 查询合同
      const contract = await this.contractsService.findOne(contractId);

      if (!contract.esignContractNo) {
        return { success: false, message: '该合同未关联爱签合同' };
      }

      // 2. 查询爱签API获取最新状态
      const esignResponse = await this.esignService.getContractStatus(contract.esignContractNo);

      if (!esignResponse || !esignResponse.data) {
        return { success: false, message: '查询爱签状态失败' };
      }

      const esignStatus = esignResponse.data.status?.toString();

      // 3. 更新本地合同状态
      const updateData: any = {
        esignStatus: esignStatus
      };

      // 🔥 统一映射：爱签状态 → 本地 contractStatus
      updateData.contractStatus = this.mapEsignStatusToContractStatus(esignStatus);
      if (esignStatus === '2') {
        updateData.esignSignedAt = new Date();
      }

      await this.contractsService.updateContractStatusDirectly(contractId, updateData);

      // 如果状态变为 active，手动触发保险同步及客户状态同步
      if (updateData.contractStatus === ContractStatus.ACTIVE) {
        await this.contractsService.syncInsuranceOnContractActive(contractId).catch(error => {
          this.logger.error('保险同步失败:', error.message);
        });
        await this.contractsService.syncCustomerOnContractActive(contractId).catch(error => {
          this.logger.error('客户状态同步失败:', error.message);
        });
      }

      // 如果状态变为 signing，同步客户为签约中
      if (updateData.contractStatus === ContractStatus.SIGNING) {
        await this.contractsService.syncCustomerOnContractSigning(contractId).catch(error => {
          this.logger.error('客户签约中同步失败:', error.message);
        });
      }

      return {
        success: true,
        data: {
          esignStatus: esignStatus,
          contractStatus: updateData.contractStatus,
          message: this.getStatusText(esignStatus)
        },
        message: '状态同步成功'
      };
    } catch (error) {
      return { success: false, message: error.message || '同步状态失败' };
    }
  }

  /**
   * 批量同步所有合同的爱签状态
   */
  @Post('sync-all-esign-status')
  @Permissions('contract:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】批量同步所有合同的爱签状态' })
  async syncAllEsignStatus() {
    try {
      // 查询所有有爱签合同编号的合同
      const contracts = await this.contractsService.findContractsPendingEsignSync(50);

      const results = {
        total: contracts.length,
        success: 0,
        failed: 0,
        updated: 0,
        details: []
      };

      for (const contract of contracts) {
        try {
          // 查询爱签状态
          const esignResponse = await this.esignService.getContractStatus(contract.esignContractNo);

          if (esignResponse && esignResponse.data) {
            const esignStatus = esignResponse.data.status?.toString();
            const oldStatus = contract.contractStatus;

            // 🔥 统一映射：爱签状态 → 本地 contractStatus
            const newContractStatus = this.mapEsignStatusToContractStatus(esignStatus) as any;

            // 如果状态有变化，更新数据库
            if (oldStatus !== newContractStatus || contract.esignStatus !== esignStatus) {
              const updateData: any = {
                esignStatus: esignStatus,
                contractStatus: newContractStatus
              };

              if (esignStatus === '2' && !contract.esignSignedAt) {
                updateData.esignSignedAt = new Date();
              }

              await this.contractsService.updateContractStatusDirectly(
                contract._id.toString(),
                updateData,
              );

              // 如果状态变为 active，触发保险同步及客户状态同步
              if (newContractStatus === ContractStatus.ACTIVE) {
                await this.contractsService.syncInsuranceOnContractActive(
                  contract._id.toString()
                ).catch(error => {
                  this.logger.error(`保险同步失败 (${contract.contractNumber}):`, error.message);
                });
                await this.contractsService.syncCustomerOnContractActive(
                  contract._id.toString()
                ).catch(error => {
                  this.logger.error(`客户状态同步失败 (${contract.contractNumber}):`, error.message);
                });
              }

              // 如果状态变为 signing，同步客户为签约中
              if (newContractStatus === ContractStatus.SIGNING) {
                await this.contractsService.syncCustomerOnContractSigning(
                  contract._id.toString()
                ).catch(error => {
                  this.logger.error(`客户签约中同步失败 (${contract.contractNumber}):`, error.message);
                });
              }

              results.updated++;
              results.details.push({
                contractNumber: contract.contractNumber,
                oldStatus: oldStatus,
                newStatus: newContractStatus,
                esignStatus: esignStatus
              });
            }

            results.success++;
          } else {
            results.failed++;
          }
        } catch (error) {
          results.failed++;
          this.logger.error(`同步合同 ${contract.contractNumber} 失败:`, error.message);
        }

        // 避免请求过快，延迟100ms
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return {
        success: true,
        data: results,
        message: `批量同步完成：成功${results.success}个，失败${results.failed}个，更新${results.updated}个`
      };
    } catch (error) {
      return { success: false, message: error.message || '批量同步失败' };
    }
  }

  // ==================== 统一状态映射方法 ====================

  /**
   * 🔥 统一：爱签合同状态码 → 中文文本
   * 爱签 /contract/status 接口返回的 data.status 值
   */
  private getStatusText(status: string): string {
    const statusMap = {
      '0': '等待签约',
      '1': '签约中',
      '2': '已签约',
      '3': '已过期',
      '4': '已拒签',
      '6': '已作废',
      '7': '已撤销',
    };
    return statusMap[status] || '未知状态';
  }

  /**
   * 🔥 统一：爱签合同状态码 → 本地 contractStatus
   * 所有接口必须使用此方法做映射，确保一致
   */
  private mapEsignStatusToContractStatus(esignStatus: string): string {
    const map: Record<string, string> = {
      '0': 'signing',    // 待签署 → 签约中（已发起，不是 draft）
      '1': 'signing',    // 签约中 → 签约中
      '2': 'active',     // 已签约 → 生效中
      '3': 'cancelled',  // 过期 → 已作废
      '4': 'cancelled',  // 拒签 → 已作废
      '6': 'cancelled',  // 作废 → 已作废
      '7': 'cancelled',  // 撤销 → 已作废
    };
    return map[esignStatus] || 'draft';
  }

  /**
   * 🔥 统一：爱签合同状态是否为终态（不可恢复的结束状态）
   */
  private isTerminalEsignStatus(esignStatus: string): boolean {
    return ['3', '4', '6', '7'].includes(esignStatus);
  }

  /**
   * 🔥 统一：签署方个人签署状态码 → 中文文本
   * 需要结合合同整体状态判断
   */
  private getSignerStatusText(signStatus: number, contractOverallStatus?: number): string {
    // 如果合同整体已终止，未签约方应该显示终止原因
    if (contractOverallStatus !== undefined && [3, 4, 6, 7].includes(contractOverallStatus) && signStatus !== 2) {
      const termMap: Record<number, string> = { 3: '已过期', 4: '已拒签', 6: '已作废', 7: '已撤销' };
      return termMap[contractOverallStatus] || '已终止';
    }

    const statusMap: Record<number, string> = {
      0: '待签约',
      1: '签约中',
      2: '已签约',
      3: '已拒签',
      4: '已撤销',
      5: '已过期'
    };
    return statusMap[signStatus] || '未知状态';
  }

  // ==================== 爱签相关接口 ====================

  /**
   * 获取合同爱签信息（含签署方详情）
   */
  @Get('esign-info/:id')
  @Permissions('contract:view')
  @ApiOperation({ summary: '【小程序】获取合同爱签信息' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async getEsignInfo(@Param('id') contractId: string) {
    try {
      const contract = await this.contractsService.findOne(contractId);

      if (!contract.esignContractNo) {
        return { success: false, message: '该合同未关联爱签合同' };
      }

      const [statusResult, previewResult] = await Promise.allSettled([
        this.esignService.getContractStatus(contract.esignContractNo),
        this.esignService.previewContractWithSignUrls(contract.esignContractNo),
      ]);

      const result: any = {
        contractNo: contract.esignContractNo,
        templateNo: contract.esignTemplateNo,
      };

      if (statusResult.status === 'fulfilled' && statusResult.value.success) {
        result.status = statusResult.value.data;
        // 🔥 添加签署方详情信息
        if (statusResult.value.data?.signUsers) {
          result.signUsers = statusResult.value.data.signUsers;
        }
      } else {
        result.statusError = statusResult.status === 'rejected'
          ? statusResult.reason.message
          : statusResult.value?.message || '获取状态失败';
      }

      if (previewResult.status === 'fulfilled' && previewResult.value.success) {
        result.preview = previewResult.value.data;
      } else {
        result.previewError = previewResult.status === 'rejected'
          ? previewResult.reason.message
          : previewResult.value?.message || '获取预览失败';
      }

      return { success: true, data: result, message: '获取爱签信息成功' };
    } catch (error) {
      return { success: false, message: error.message || '获取爱签信息失败' };
    }
  }

  /**
   * 🔥 获取合同签署方详细状态（小程序专用）
   * 返回每个签署方的签署状态、角色、签署时间等信息
   */
  @Get('signers-status/:id')
  @Permissions('contract:view')
  @ApiOperation({ summary: '【小程序】获取合同签署方详细状态' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async getSignersStatus(@Param('id') contractId: string) {
    try {
      const contract = await this.contractsService.findOne(contractId);

      if (!contract.esignContractNo) {
        return { success: false, message: '该合同未关联爱签合同' };
      }

      // 调用 getContractStatus 获取签署方信息
      const statusResult = await this.esignService.getContractStatus(contract.esignContractNo);

      if (!statusResult || !statusResult.data) {
        return { success: false, message: '查询合同状态失败' };
      }

      const contractStatus = Number(statusResult.data.status);
      const signUsers = statusResult.data.signUsers || [];
      const isTerminated = this.isTerminalEsignStatus(contractStatus.toString());

      // 🔥 处理签署方状态：合同终态时，未签约方应显示终止原因
      const processedSigners = signUsers.map((user: any, index: number) => {
        const signStatus = user.signStatus ?? 0;
        const isSigned = signStatus === 2;

        // 合同已终止且该方未签约 → 标记为终止
        const isTerminatedUnsigned = isTerminated && !isSigned;

        return {
          account: user.account,
          name: user.name,
          role: user.role,
          phone: user.phone,
          signStatus: signStatus,
          signStatusText: this.getSignerStatusText(signStatus, contractStatus),
          signTime: user.signTime,
          signOrder: user.signOrder,
          userType: user.userType,
          // 🔥 便于小程序判断的字段
          isSigned: isSigned,
          isPending: !isSigned && !isTerminatedUnsigned && (signStatus === 0 || signStatus === 1),
          isRejected: signStatus === 3 || (isTerminated && contractStatus === 4),
          isTerminated: isTerminatedUnsigned,
        };
      });

      return {
        success: true,
        data: {
          contractNo: contract.esignContractNo,
          contractStatus: contractStatus,
          contractStatusText: this.getStatusText(contractStatus?.toString()),
          signers: processedSigners,
          // 统计信息
          totalSigners: processedSigners.length,
          signedCount: processedSigners.filter((s: any) => s.isSigned).length,
          pendingCount: processedSigners.filter((s: any) => s.isPending).length,
          rejectedCount: processedSigners.filter((s: any) => s.isRejected).length,
          // 是否全部签署完成
          allSigned: processedSigners.every((s: any) => s.isSigned),
        },
        message: '获取签署方状态成功'
      };
    } catch (error) {
      return { success: false, message: error.message || '获取签署方状态失败' };
    }
  }

  /**
   * 重新获取签署链接
   */
  @Post('resend-sign-urls/:id')
  @Permissions('contract:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】重新获取签署链接' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async resendSignUrls(@Param('id') contractId: string) {
    try {
      const contract = await this.contractsService.findOne(contractId);

      if (!contract.esignContractNo) {
        return { success: false, message: '该合同未关联爱签合同' };
      }

      const result = await this.esignService.getContractSignUrls(contract.esignContractNo);

      if (result.success) {
        return { success: true, data: result.data, message: '获取签署链接成功' };
      } else {
        return { success: false, message: result.message || '获取签署链接失败' };
      }
    } catch (error) {
      return { success: false, message: error.message || '获取签署链接失败' };
    }
  }

  /**
   * 下载已签署的合同文件
   */
  @Post('download-contract/:id')
  @Permissions('contract:view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】下载已签署合同' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async downloadContract(
    @Param('id') contractId: string,
    @Body() options: { force?: number; downloadFileType?: number },
  ) {
    try {
      const contract = await this.contractsService.findOne(contractId);

      if (!contract.esignContractNo) {
        return { success: false, message: '该合同未关联爱签合同' };
      }

      const result = await this.esignService.downloadSignedContract(
        contract.esignContractNo,
        options || {},
      );

      return { success: true, data: result, message: '合同下载成功' };
    } catch (error) {
      return { success: false, message: error.message || '合同下载失败' };
    }
  }

  // ==================== 合同撤销/作废接口 ====================

  /**
   * 撤销合同（针对未签署完成的合同）
   */
  @Post('withdraw/:id')
  @Permissions('contract:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】撤销合同' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async withdrawContract(
    @Param('id') contractId: string,
    @Body() body: { withdrawReason?: string; isNoticeSignUser?: boolean },
  ) {
    try {
      this.logger.log(`📝 收到撤销合同请求，合同ID: ${contractId}`);

      // 1. 获取合同信息
      const contract = await this.contractsService.findOne(contractId);
      if (!contract) {
        return { success: false, message: '合同不存在' };
      }

      if (!contract.esignContractNo) {
        return { success: false, message: '该合同未关联爱签合同，无法撤销' };
      }

      // 2. 调用爱签撤销接口
      const result = await this.esignService.withdrawContract(
        contract.esignContractNo,
        body.withdrawReason,
        body.isNoticeSignUser || false,
      );

      // 3. 更新本地合同状态
      if (result.success) {
        await this.contractsService.updateContractStatusDirectly(contractId, {
          esignStatus: '7',
          contractStatus: ContractStatus.CANCELLED,
        });

        this.logger.log(`✅ 合同撤销成功: ${contract.contractNumber}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`❌ 撤销合同失败: ${error.message}`);
      return { success: false, message: error.message || '撤销合同失败' };
    }
  }

  /**
   * 作废合同（针对已签署完成的合同）
   */
  @Post('invalidate/:id')
  @Permissions('contract:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】作废合同' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async invalidateContract(
    @Param('id') contractId: string,
    @Body() body: { validityTime?: number; notifyUrl?: string; redirectUrl?: string },
  ) {
    try {
      this.logger.log(`📝 收到作废合同请求，合同ID: ${contractId}`);

      // 1. 获取合同信息
      const contract = await this.contractsService.findOne(contractId);
      if (!contract) {
        return { success: false, message: '合同不存在' };
      }

      if (!contract.esignContractNo) {
        return { success: false, message: '该合同未关联爱签合同，无法作废' };
      }

      // 2. 调用爱签作废接口
      const result = await this.esignService.invalidateContract(
        contract.esignContractNo,
        body.validityTime || 15, // 默认15天
        body.notifyUrl,
        body.redirectUrl,
      );

      // 3. 更新本地合同状态
      if (result.success) {
        await this.contractsService.updateContractStatusDirectly(contractId, {
          esignStatus: '6',
          contractStatus: ContractStatus.CANCELLED,
        });

        this.logger.log(`✅ 合同作废成功: ${contract.contractNumber}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`❌ 作废合同失败: ${error.message}`);
      return { success: false, message: error.message || '作废合同失败' };
    }
  }

  /**
   * 智能撤销/作废合同（自动根据合同状态选择操作）
   */
  @Post('cancel/:id')
  @Permissions('contract:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】智能撤销/作废合同' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async cancelContract(
    @Param('id') contractId: string,
    @Body() body: { reason?: string; isNoticeSignUser?: boolean },
  ) {
    try {
      this.logger.log(`📝 收到智能撤销/作废合同请求，合同ID: ${contractId}`);

      // 1. 获取合同信息
      const contract = await this.contractsService.findOne(contractId);
      if (!contract) {
        return { success: false, message: '合同不存在' };
      }

      if (!contract.esignContractNo) {
        return { success: false, message: '该合同未关联爱签合同，无法操作' };
      }

      // 2. 调用爱签智能撤销/作废接口
      const result = await this.esignService.cancelContract(
        contract.esignContractNo,
        body.reason,
        body.isNoticeSignUser || false,
      );

      // 3. 更新本地合同状态
      if (result.success) {
        const esignStatus = result.action === 'withdraw' ? '7' : '6';
        await this.contractsService.updateContractStatusDirectly(contractId, {
          esignStatus,
          contractStatus: ContractStatus.CANCELLED,
        });

        this.logger.log(`✅ 合同${result.action === 'withdraw' ? '撤销' : '作废'}成功: ${contract.contractNumber}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`❌ 智能撤销/作废合同失败: ${error.message}`);
      return { success: false, message: error.message || '操作失败' };
    }
  }
}
