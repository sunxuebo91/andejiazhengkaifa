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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ESignService } from '../esign/esign.service';
import { Public } from '../auth/decorators/public.decorator';
import { ContractStatus } from './models/contract.model';

@ApiTags('小程序-合同管理')
@Controller('contracts/miniprogram')
export class ContractsMiniProgramController {
  private readonly logger = new Logger(ContractsMiniProgramController.name);

  constructor(
    private readonly contractsService: ContractsService,
    private readonly esignService: ESignService,
  ) {}

  // ==================== 合同查询接口 ====================

  /**
   * 获取合同列表（分页）
   */
  @Get('list')
  @Public()
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
  ) {
    try {
      const result = await this.contractsService.findAll(
        parseInt(page),
        parseInt(limit),
        search,
        true,
      );

      // 🔥 如果需要同步状态，批量查询爱签API获取最新状态
      if (syncStatus === 'true' && result.contracts && result.contracts.length > 0) {
        this.logger.log(`🔄 开始同步 ${result.contracts.length} 个合同的爱签状态...`);

        // 并发查询所有合同的爱签状态
        const contractsWithStatus = await Promise.all(
          result.contracts.map(async (contract: any) => {
            // 🔥 将 Mongoose 文档转换为普通对象，以便添加新字段
            const contractObj = contract.toObject ? contract.toObject() : { ...contract };

            // 如果有爱签合同编号，查询最新状态
            if (contractObj.esignContractNo) {
              try {
                const statusResponse = await this.esignService.getContractStatus(contractObj.esignContractNo);

                if (statusResponse && statusResponse.data) {
                  const latestEsignStatus = statusResponse.data.status?.toString();

                  // 更新合同对象中的状态（不写入数据库，只返回给前端）
                  contractObj.esignStatus = latestEsignStatus;
                  contractObj.esignStatusText = this.getStatusText(latestEsignStatus);

                  // 🔥 根据爱签状态推断本地状态
                  if (latestEsignStatus === '2') {
                    contractObj.contractStatus = 'active'; // 已签约
                  } else if (latestEsignStatus === '0' || latestEsignStatus === '1') {
                    contractObj.contractStatus = 'signing'; // 签约中
                  } else if (latestEsignStatus === '6' || latestEsignStatus === '7') {
                    contractObj.contractStatus = 'cancelled'; // 已作废/撤销
                  }

                  this.logger.log(`✅ 合同 ${contractObj.contractNumber} 状态已同步: ${latestEsignStatus} (${contractObj.esignStatusText})`);
                }
              } catch (error) {
                this.logger.warn(`⚠️  查询合同 ${contractObj.contractNumber} 爱签状态失败: ${error.message}`);
                // 查询失败时保留原有状态
              }
            }

            return contractObj;
          })
        );

        result.contracts = contractsWithStatus;
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
  @Public()
  @ApiOperation({ summary: '【小程序】根据ID获取合同详情' })
  @ApiParam({ name: 'id', description: '合同ID' })
  async getContractDetail(@Param('id') id: string) {
    try {
      const contract = await this.contractsService.findOne(id);
      return { success: true, data: contract, message: '获取合同详情成功' };
    } catch (error) {
      return { success: false, message: error.message || '获取合同详情失败' };
    }
  }

  /**
   * 根据合同编号获取合同
   */
  @Get('by-number/:contractNumber')
  @Public()
  @ApiOperation({ summary: '【小程序】根据合同编号获取合同' })
  @ApiParam({ name: 'contractNumber', description: '合同编号' })
  async getByContractNumber(@Param('contractNumber') contractNumber: string) {
    try {
      const contract = await this.contractsService.findByContractNumber(contractNumber);
      return { success: true, data: contract, message: '获取合同详情成功' };
    } catch (error) {
      return { success: false, message: error.message || '获取合同详情失败' };
    }
  }

  /**
   * 根据客户ID获取合同列表
   */
  @Get('by-customer/:customerId')
  @Public()
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
  @Public()
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
  @Public()
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
  @Public()
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
  @Public()
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
  @Public()
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
  @Public()
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
            customerPhone: createContractDto.customerPhone ? '✅ 已提供' : '❌ 缺失',
            customerIdCard: createContractDto.customerIdCard ? '✅ 已提供' : '❌ 缺失',
            workerName: createContractDto.workerName ? '✅ 已提供' : '❌ 缺失',
            workerPhone: createContractDto.workerPhone ? '✅ 已提供' : '❌ 缺失',
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
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】创建合同' })
  async createContract(@Body() body: any) {
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
      const contract = await this.contractsService.create(
        body as CreateContractDto,  // 🔥 使用 body（包含所有字段，包括中文字段）
        'miniprogram-user',
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
  @Public()
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
        signOrder: 1
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
  @Public()
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
  @Public()
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
  @Public()
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
  @Public()
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

      // 根据爱签状态更新 contractStatus
      if (esignStatus === '2') {
        // 已签约
        updateData.contractStatus = ContractStatus.ACTIVE;
        updateData.esignSignedAt = new Date();
      } else if (esignStatus === '1') {
        // 签约中
        updateData.contractStatus = ContractStatus.SIGNING;
      } else if (esignStatus === '0') {
        // 等待签约
        updateData.contractStatus = ContractStatus.DRAFT;
      } else if (esignStatus === '6' || esignStatus === '7') {
        // 作废或撤销
        updateData.contractStatus = ContractStatus.CANCELLED;
      }

      // 直接更新数据库，不通过 update 方法（避免 userId 验证问题）
      await this.contractsService['contractModel'].findByIdAndUpdate(
        contractId,
        updateData,
        { new: true }
      ).exec();

      // 如果状态变为 active，手动触发保险同步
      if (updateData.contractStatus === ContractStatus.ACTIVE) {
        await this.contractsService.syncInsuranceOnContractActive(contractId).catch(error => {
          console.error('保险同步失败:', error.message);
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
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】批量同步所有合同的爱签状态' })
  async syncAllEsignStatus() {
    try {
      // 查询所有有爱签合同编号的合同
      const contracts = await this.contractsService['contractModel']
        .find({
          esignContractNo: { $exists: true, $ne: null },
          contractStatus: { $in: ['draft', 'signing'] } // 只同步草稿和签约中的合同
        })
        .limit(50) // 限制一次最多同步50个
        .exec();

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

            // 确定新的 contractStatus
            let newContractStatus = contract.contractStatus;
            if (esignStatus === '2') {
              newContractStatus = ContractStatus.ACTIVE;
            } else if (esignStatus === '1') {
              newContractStatus = ContractStatus.SIGNING;
            } else if (esignStatus === '0') {
              newContractStatus = ContractStatus.DRAFT;
            } else if (esignStatus === '6' || esignStatus === '7') {
              newContractStatus = ContractStatus.CANCELLED;
            }

            // 如果状态有变化，更新数据库
            if (oldStatus !== newContractStatus || contract.esignStatus !== esignStatus) {
              const updateData: any = {
                esignStatus: esignStatus,
                contractStatus: newContractStatus
              };

              if (esignStatus === '2' && !contract.esignSignedAt) {
                updateData.esignSignedAt = new Date();
              }

              await this.contractsService['contractModel'].findByIdAndUpdate(
                contract._id,
                updateData,
                { new: true }
              ).exec();

              // 如果状态变为 active，触发保险同步
              if (newContractStatus === ContractStatus.ACTIVE) {
                await this.contractsService.syncInsuranceOnContractActive(
                  contract._id.toString()
                ).catch(error => {
                  console.error(`保险同步失败 (${contract.contractNumber}):`, error.message);
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
          console.error(`同步合同 ${contract.contractNumber} 失败:`, error.message);
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

  // 辅助方法：获取合同整体状态文本
  private getStatusText(status: string): string {
    const statusMap = {
      '0': '等待签约',
      '1': '签约中',
      '2': '已签约',
      '3': '过期',
      '4': '拒签',
      '6': '作废',
      '7': '撤销',
    };
    return statusMap[status] || '未知状态';
  }

  /**
   * 🔥 辅助方法：获取签署方个人签署状态文本
   * 根据爱签API实际返回的状态码：
   * - 0: 待签约（未开始签署）
   * - 1: 签约中（正在签署）
   * - 2: 已签约（签署完成）
   * - 3: 拒签
   * - 4: 已撤销
   * - 5: 已过期
   */
  private getSignerStatusText(signStatus: number): string {
    const statusMap = {
      0: '待签约',
      1: '签约中',
      2: '已签约',  // 🔥 修复：2 表示已签约
      3: '拒签',    // 🔥 修复：3 表示拒签
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
  @Public()
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
  @Public()
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

      const contractStatus = statusResult.data.status;
      const signUsers = statusResult.data.signUsers || [];

      // 🔥 处理签署方状态，确保状态码映射正确
      const processedSigners = signUsers.map((user: any, index: number) => ({
        account: user.account,
        name: user.name,
        role: user.role,
        phone: user.phone,
        signStatus: user.signStatus,
        signStatusText: this.getSignerStatusText(user.signStatus ?? 0),
        signTime: user.signTime,
        signOrder: user.signOrder,
        userType: user.userType,
        // 🔥 添加便于小程序判断的字段
        isSigned: user.signStatus === 2,
        isPending: user.signStatus === 0 || user.signStatus === 1,
        isRejected: user.signStatus === 3,
      }));

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
  @Public()
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
  @Public()
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
  @Public()
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
        await this.contractsService['contractModel'].findByIdAndUpdate(
          contractId,
          {
            esignStatus: '7', // 已撤销
            contractStatus: ContractStatus.CANCELLED,
          },
          { new: true },
        ).exec();

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
  @Public()
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
        await this.contractsService['contractModel'].findByIdAndUpdate(
          contractId,
          {
            esignStatus: '6', // 已作废
            contractStatus: ContractStatus.CANCELLED,
          },
          { new: true },
        ).exec();

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
  @Public()
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
        await this.contractsService['contractModel'].findByIdAndUpdate(
          contractId,
          {
            esignStatus: esignStatus,
            contractStatus: ContractStatus.CANCELLED,
          },
          { new: true },
        ).exec();

        this.logger.log(`✅ 合同${result.action === 'withdraw' ? '撤销' : '作废'}成功: ${contract.contractNumber}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`❌ 智能撤销/作废合同失败: ${error.message}`);
      return { success: false, message: error.message || '操作失败' };
    }
  }
}

