import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Put,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  async create(@Body() createContractDto: CreateContractDto, @Request() req) {
    try {
      const contract = await this.contractsService.create(createContractDto, req.user.userId);
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
} 