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
import { AssignCustomerDto } from './dto/assign-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponse } from '../../common/interfaces/api-response.interface';
import { Public } from '../auth/decorators/public.decorator';

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
  async findAll(@Query() query: CustomerQueryDto, @Request() req): Promise<ApiResponse> {
    try {
      const result = await this.customersService.findAll(query, req.user.userId);
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

  // 可分配的用户列表 - 必须在 :id 路由之前
  @Get('assignable-users')
  async getAssignableUsers(): Promise<ApiResponse> {
    try {
      const users = await this.customersService.getAssignableUsers();
      return this.createResponse(true, '可分配用户获取成功', users);
    } catch (error) {
      return this.createResponse(false, '可分配用户获取失败', null, error.message);
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
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.update(id, updateCustomerDto, req.user.userId);
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

  // 分配客户归属人
  @Patch(':id/assign')
  async assignCustomer(
    @Param('id') id: string,
    @Body() dto: AssignCustomerDto,
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      const updated = await this.customersService.assignCustomer(id, dto.assignedTo, dto.assignmentReason, req.user.userId);
      return this.createResponse(true, '客户分配成功', updated);
    } catch (error) {
      return this.createResponse(false, error.message || '客户分配失败', null, error.message);
    }
  }



  // 客户分配历史
  @Get(':id/assignment-logs')
  async getAssignmentLogs(@Param('id') id: string): Promise<ApiResponse> {
    try {
      const logs = await this.customersService.getAssignmentLogs(id);
      return this.createResponse(true, '分配历史获取成功', logs);
    } catch (error) {
      return this.createResponse(false, '分配历史获取失败', null, error.message);
    }
  }


}