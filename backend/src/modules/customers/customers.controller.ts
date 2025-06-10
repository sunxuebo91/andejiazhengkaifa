import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CreateCustomerFollowUpDto } from './dto/create-customer-follow-up.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // 辅助方法：生成统一格式的API响应
  private createResponse(success: boolean, message: string, data?: any, error?: any): ApiResponse {
    return {
      success,
      message,
      data,
      error,
      timestamp: Date.now(),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.create(
        createCustomerDto,
        req.user.userId,
      );
      return this.createResponse(true, '客户创建成功', customer);
    } catch (error) {
      return this.createResponse(false, error.message || '客户创建失败', null, error.message);
    }
  }

  @Get()
  async findAll(@Query() query: CustomerQueryDto): Promise<ApiResponse> {
    try {
      const result = await this.customersService.findAll(query);
      return this.createResponse(true, '客户列表获取成功', result);
    } catch (error) {
      return this.createResponse(false, '客户列表获取失败', null, error.message);
    }
  }

  @Get('statistics')
  async getStatistics(): Promise<ApiResponse> {
    try {
      const stats = await this.customersService.getStatistics();
      return this.createResponse(true, '客户统计信息获取成功', stats);
    } catch (error) {
      return this.createResponse(false, '客户统计信息获取失败', null, error.message);
    }
  }

  @Get('customer-id/:customerId')
  async findByCustomerId(@Param('customerId') customerId: string): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.findByCustomerId(customerId);
      return this.createResponse(true, '客户详情获取成功', customer);
    } catch (error) {
      return this.createResponse(false, '客户详情获取失败', null, error.message);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.findOne(id);
      return this.createResponse(true, '客户详情获取成功', customer);
    } catch (error) {
      return this.createResponse(false, '客户详情获取失败', null, error.message);
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.update(id, updateCustomerDto);
      return this.createResponse(true, '客户信息更新成功', customer);
    } catch (error) {
      return this.createResponse(false, '客户信息更新失败', null, error.message);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<ApiResponse> {
    try {
      await this.customersService.remove(id);
      return this.createResponse(true, '客户删除成功');
    } catch (error) {
      return this.createResponse(false, '客户删除失败', null, error.message);
    }
  }

  // 创建客户跟进记录
  @Post(':id/follow-ups')
  async createFollowUp(
    @Param('id') id: string,
    @Body() createFollowUpDto: CreateCustomerFollowUpDto,
    @Request() req: any,
  ): Promise<ApiResponse> {
    try {
      const followUp = await this.customersService.createFollowUp(id, createFollowUpDto, req.user.userId);
      return this.createResponse(true, '跟进记录创建成功', followUp);
    } catch (error) {
      return this.createResponse(false, '跟进记录创建失败', null, error.message);
    }
  }

  // 获取客户跟进记录
  @Get(':id/follow-ups')
  async getFollowUps(@Param('id') id: string): Promise<ApiResponse> {
    try {
      const followUps = await this.customersService.getFollowUps(id);
      return this.createResponse(true, '跟进记录获取成功', followUps);
    } catch (error) {
      return this.createResponse(false, '跟进记录获取失败', null, error.message);
    }
  }
} 