import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { ESignService } from '../esign/esign.service';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly esignService: ESignService,
  ) {}


  @Post()
  async create(@Body() createContractDto: CreateContractDto, @Request() req) {
    try {
      const contract = await this.contractsService.create(
        createContractDto,
        req.user.userId,
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
  ) {
    try {
      const result = await this.contractsService.findAll(
        parseInt(page),
        parseInt(limit),
        search,
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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const contract = await this.contractsService.findOne(id);
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

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateContractDto: UpdateContractDto) {
    try {
      const contract = await this.contractsService.update(id, updateContractDto);
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

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
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
        this.esignService.previewContract(contract.esignContractNo),
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
  async checkCustomerContract(@Param('customerPhone') customerPhone: string) {
    try {
      // const result = await this.contractsService.checkCustomerExistingContract(customerPhone);
      const result = { hasContract: false, contractCount: 0 }; // 临时实现
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
   * 创建换人合同 - 临时禁用
   */
  @Post('change-worker/:originalContractId')
  async createChangeWorkerContract(
    @Param('originalContractId') originalContractId: string,
    @Body() createContractDto: CreateContractDto,
    @Request() req
  ) {
    try {
      // 临时实现，等待换人功能完成
      // const newContract = await this.contractsService.createChangeWorkerContract(
      //   createContractDto,
      //   originalContractId,
      //   req.user.userId
      // );
      return {
        success: false,
        message: '换人功能开发中，敬请期待',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '换人合同创建失败',
      };
    }
  }

  /**
   * 获取客户合同历史 - 临时禁用
   */
  @Get('history/:customerPhone')
  async getCustomerHistory(@Param('customerPhone') customerPhone: string) {
    try {
      // const history = await this.contractsService.getCustomerContractHistory(customerPhone);
      return {
        success: false,
        message: '客户合同历史功能开发中',
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
} 