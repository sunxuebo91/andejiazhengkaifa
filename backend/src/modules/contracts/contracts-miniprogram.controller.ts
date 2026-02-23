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
  async getContractList(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.contractsService.findAll(
        parseInt(page),
        parseInt(limit),
        search,
        true,
      );
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
   * 创建合同
   */
  @Post('create')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】创建合同' })
  async createContract(@Body() createContractDto: CreateContractDto) {
    try {
      const contract = await this.contractsService.create(createContractDto, 'miniprogram-user');
      return { success: true, data: contract, message: '合同创建成功' };
    } catch (error) {
      return { success: false, message: error.message || '合同创建失败' };
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
   */
  @Post('change-worker/:originalContractId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '【小程序】创建换人合同' })
  @ApiParam({ name: 'originalContractId', description: '原合同ID' })
  async createChangeWorkerContract(
    @Param('originalContractId') originalContractId: string,
    @Body() createContractDto: CreateContractDto,
  ) {
    try {
      const newContract = await this.contractsService.createChangeWorkerContract(
        createContractDto,
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
}

