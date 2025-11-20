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
  Headers,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiParam, ApiHeader, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CreateCustomerFollowUpDto } from './dto/create-customer-follow-up.dto';
import { AssignCustomerDto } from './dto/assign-customer.dto';
import { BatchAssignCustomerDto } from './dto/batch-assign-customer.dto';
import { ClaimCustomersDto, AssignFromPoolDto, ReleaseToPoolDto, BatchReleaseToPoolDto, PublicPoolQueryDto } from './dto/public-pool.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiResponse } from '../../common/interfaces/api-response.interface';
import { Public } from '../auth/decorators/public.decorator';
import { WeixinService } from '../weixin/weixin.service';
import { UsersService } from '../users/users.service';

@ApiTags('客户管理')
@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(
    private readonly customersService: CustomersService,
    private readonly weixinService: WeixinService,
    private readonly usersService: UsersService,
  ) {}

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

  // 辅助方法：检查用户是否有权限访问客户
  private canAccessCustomer(customer: any, user: any): boolean {
    const userRole = this.mapRoleToChineseRole(user.role);

    if (userRole === '系统管理员') {
      return true; // 管理员可以访问所有客户
    } else if (userRole === '经理') {
      // 经理可以访问部门内的客户（这里简化为所有客户，实际应该根据部门过滤）
      return true;
    } else if (userRole === '普通员工') {
      // 普通员工只能访问自己负责的客户
      return customer.assignedTo?.toString() === user.userId;
    }
    return false;
  }

  // 辅助方法：根据角色脱敏客户数据
  private sanitizeCustomerData(customer: any, user: any): any {
    const userRole = this.mapRoleToChineseRole(user.role);
    const userId = user.userId;

    // 基础数据（所有角色都能看到）
    const baseData = {
      _id: customer._id,
      customerId: customer.customerId,
      name: customer.name,
      contractStatus: customer.contractStatus,
      serviceCategory: customer.serviceCategory,
      leadSource: customer.leadSource,
      leadLevel: customer.leadLevel,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      assignedTo: customer.assignedTo,
      assignedToUser: customer.assignedToUser,
    };

    // 判断是否是自己负责的客户
    const isOwnCustomer = customer.assignedTo?.toString() === userId;

    if (userRole === '普通员工') {
      // 普通员工：自己的客户显示完整信息，其他客户脱敏
      return {
        ...baseData,
        phone: isOwnCustomer ? customer.phone : this.maskPhoneNumber(customer.phone),
        wechatId: isOwnCustomer ? customer.wechatId : undefined,
        address: isOwnCustomer ? customer.address : undefined,
        salaryBudget: isOwnCustomer ? customer.salaryBudget : undefined,
        expectedStartDate: isOwnCustomer ? customer.expectedStartDate : undefined,
        homeArea: isOwnCustomer ? customer.homeArea : undefined,
        familySize: isOwnCustomer ? customer.familySize : undefined,
        restSchedule: isOwnCustomer ? customer.restSchedule : undefined,
        remarks: isOwnCustomer ? customer.remarks : undefined,
      };
    } else if (userRole === '经理') {
      // 经理可以看到部门内所有客户的完整信息
      return {
        ...baseData,
        phone: customer.phone,
        wechatId: customer.wechatId,
        address: customer.address,
        salaryBudget: customer.salaryBudget,
        expectedStartDate: customer.expectedStartDate,
        homeArea: customer.homeArea,
        familySize: customer.familySize,
        restSchedule: customer.restSchedule,
        ageRequirement: customer.ageRequirement,
        genderRequirement: customer.genderRequirement,
        originRequirement: customer.originRequirement,
        educationRequirement: customer.educationRequirement,
        expectedDeliveryDate: customer.expectedDeliveryDate,
        remarks: customer.remarks,
      };
    } else {
      // 系统管理员可以看到所有信息
      return customer;
    }
  }

  // 辅助方法：手机号脱敏
  private maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 7) return phone || '';
    if (phone.length === 11) {
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    } else if (phone.length === 10) {
      return phone.replace(/(\d{3})\d{3}(\d{4})/, '$1****$2');
    }
    return phone; // 其他长度不处理
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

  // 批量分配客户 - 必须在 :id 路由之前
  @Post('batch-assign')
  @ApiOperation({ summary: '批量分配客户（仅管理员和经理）' })
  @ApiBody({ type: BatchAssignCustomerDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  async batchAssignCustomers(
    @Body() dto: BatchAssignCustomerDto,
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      const result = await this.customersService.batchAssignCustomers(
        dto.customerIds,
        dto.assignedTo,
        dto.assignmentReason,
        req.user.userId
      );

      const message = `批量分配完成：成功 ${result.success} 个，失败 ${result.failed} 个`;
      return this.createResponse(true, message, result);
    } catch (error) {
      return this.createResponse(false, error.message || '批量分配失败', null, error.message);
    }
  }

  // 获取用户当前持有的客户数量 - 必须在 :id 路由之前
  @Get('my-customer-count')
  @ApiOperation({ summary: '获取当前用户持有的客户数量' })
  async getMyCustomerCount(@Request() req): Promise<ApiResponse> {
    try {
      const count = await this.customersService.getUserCustomerCount(req.user.userId);
      return this.createResponse(true, '客户数量获取成功', { count, limit: 50 });
    } catch (error) {
      return this.createResponse(false, '客户数量获取失败', null, error.message);
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

  // ==================== 小程序专用接口 ====================

  /**
   * 角色映射辅助函数：将英文角色映射为中文角色
   */
  private mapRoleToChineseRole(role: string): string {
    const roleMap = {
      'admin': '系统管理员',
      'manager': '经理',
      'employee': '普通员工'
    };
    return roleMap[role] || role;
  }

  @Get('miniprogram/statistics')
  @ApiOperation({ summary: '小程序获取客户统计信息（基于角色权限）' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
  async getStatisticsForMiniprogram(@Request() req): Promise<ApiResponse> {
    try {
      const userRole = this.mapRoleToChineseRole(req.user.role);
      const userId = req.user.userId;

      let stats;
      if (userRole === '普通员工') {
        // 普通员工只能看自己负责的客户统计
        const query = { assignedTo: userId };
        const result = await this.customersService.findAll(query, userId);

        // 简化的统计信息
        stats = {
          total: result.total,
          myCustomers: result.total,
          byContractStatus: this.calculateStatusStats(result.customers),
        };
      } else {
        // 管理员和经理可以看全局统计
        stats = await this.customersService.getStatistics();

        // 为经理和管理员添加更详细的统计信息
        if (userRole === '经理' || userRole === '系统管理员') {
          const allCustomers = await this.customersService.findAll({}, userId);
          stats = {
            ...stats,
            byLeadSource: this.calculateLeadSourceStats(allCustomers.customers),
            byServiceCategory: this.calculateServiceCategoryStats(allCustomers.customers),
          };
        }
      }

      return this.createResponse(true, '统计信息获取成功', stats);
    } catch (error) {
      return this.createResponse(false, '统计信息获取失败', null, error.message);
    }
  }

  @Get('miniprogram/list')
  @ApiOperation({ summary: '小程序获取客户列表（支持权限控制和数据脱敏）' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
  async getListForMiniprogram(@Query() query: CustomerQueryDto, @Request() req): Promise<ApiResponse> {
    try {
      const userRole = this.mapRoleToChineseRole(req.user.role);
      const userId = req.user.userId;

      // 根据用户角色过滤数据可见性
      const filteredQuery = { ...query };
      if (userRole === '普通员工') {
        filteredQuery.assignedTo = userId; // 只能看自己的客户
      }
      // 经理和管理员可以看到更多数据，这里可以根据需要添加部门过滤逻辑

      const result = await this.customersService.findAll(filteredQuery, userId);

      // 根据角色脱敏数据
      const sanitizedCustomers = result.customers.map(customer =>
        this.sanitizeCustomerData(customer, req.user)
      );

      const responseData = {
        ...result,
        customers: sanitizedCustomers,
        hasMore: result.page * result.limit < result.total, // 小程序需要的分页信息
      };

      return this.createResponse(true, '客户列表获取成功', responseData);
    } catch (error) {
      return this.createResponse(false, '获取客户列表失败', null, error.message);
    }
  }

  @Post('miniprogram/create')
  @ApiOperation({ summary: '小程序创建客户（支持幂等性）' })
  @ApiHeader({ name: 'Idempotency-Key', description: '幂等性键，防止重复提交', required: false })
  @ApiHeader({ name: 'api-version', description: 'API版本', required: false })
  @ApiHeader({ name: 'x-request-id', description: '请求追踪ID', required: false })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
  @HttpCode(HttpStatus.CREATED)
  async createForMiniprogram(
    @Body() createCustomerDto: CreateCustomerDto,
    @Headers('Idempotency-Key') idempotencyKey?: string,
    @Headers('api-version') apiVersion?: string,
    @Headers('x-request-id') requestId?: string,
    @Request() req?,
  ): Promise<ApiResponse> {
    try {
      // 记录请求信息（类似简历创建接口的日志记录）
      console.log(`🆕 小程序创建客户:`);
      console.log(`📝 创建数据: ${JSON.stringify(createCustomerDto, null, 2)}`);
      console.log(`🔑 请求头: idempotencyKey=${idempotencyKey}, apiVersion=${apiVersion}, requestId=${requestId}`);

      // 幂等性处理：如果提供了幂等性键，检查是否已存在相同的请求
      if (idempotencyKey) {
        // 这里可以实现幂等性逻辑，检查Redis或数据库中是否已有相同的请求
        // 暂时简化处理，直接创建
      }

      const customer = await this.customersService.create(createCustomerDto, req.user.userId);

      console.log(`✅ 小程序创建客户成功: ${(customer as any)._id}`);

      // 根据用户角色返回脱敏数据
      const sanitizedCustomer = this.sanitizeCustomerData(customer, req.user);

      return this.createResponse(true, '客户创建成功', {
        id: (customer as any)._id,
        customerId: customer.customerId,
        createdAt: (customer as any).createdAt,
        customer: sanitizedCustomer,
        action: 'CREATED'
      });
    } catch (error) {
      console.error(`小程序创建客户失败: ${error.message}`);

      // 处理特定错误类型（参考简历创建接口）
      if (error.message?.includes('该手机号已存在')) {
        return this.createResponse(false, '该手机号已存在客户记录', null, 'DUPLICATE_PHONE');
      }

      return this.createResponse(false, error.message || '客户创建失败', { requestId }, 'DUPLICATE_PHONE');
    }
  }

  @Get('miniprogram/:id')
  @ApiOperation({ summary: '小程序获取客户详情（权限控制）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
  async getOneForMiniprogram(@Param('id') id: string, @Request() req): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.findOne(id);

      // 权限检查
      if (!this.canAccessCustomer(customer, req.user)) {
        throw new ForbiddenException('无权限访问此客户信息');
      }

      // 根据角色脱敏数据
      const sanitizedCustomer = this.sanitizeCustomerData(customer, req.user);

      // 添加小程序需要的Name字段
      const customerWithNames = {
        ...sanitizedCustomer,
        createdByName: customer.createdByUser?.name || customer.createdByUser?.username || '未知',
        assignedToName: customer.assignedToUser?.name || customer.assignedToUser?.username || '未分配',
        assignedByName: customer.assignedByUser?.name || customer.assignedByUser?.username || '未知'
      };

      return this.createResponse(true, '客户详情获取成功', customerWithNames);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return this.createResponse(false, error.message, null, 'FORBIDDEN');
      }
      return this.createResponse(false, '客户详情获取失败', null, error.message);
    }
  }

  @Patch('miniprogram/:id')
  @ApiOperation({ summary: '小程序更新客户信息（权限控制）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
  async updateForMiniprogram(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      console.log(`🔄 小程序更新客户 ${id}:`);
      console.log(`📝 更新数据: ${JSON.stringify(updateCustomerDto, null, 2)}`);

      // 先获取客户信息进行权限检查
      const existingCustomer = await this.customersService.findOne(id);
      if (!this.canAccessCustomer(existingCustomer, req.user)) {
        throw new ForbiddenException('无权限修改此客户信息');
      }

      // 记录状态变更（用于微信通知）
      const oldStatus = existingCustomer.contractStatus;

      const updatedCustomer = await this.customersService.update(id, updateCustomerDto, req.user.userId);

      // 如果状态发生变化，发送微信通知
      if (oldStatus !== updatedCustomer.contractStatus) {
        try {
          // 这里可以集成微信通知功能
          console.log(`📱 客户状态变更: ${oldStatus} -> ${updatedCustomer.contractStatus}`);
          // await this.weixinService.sendCustomerStatusChangeNotification({...});
        } catch (notificationError) {
          console.error('发送微信通知失败:', notificationError);
          // 通知失败不影响主业务
        }
      }

      console.log(`✅ 小程序更新客户成功: ${id}`);

      // 根据角色脱敏数据
      const sanitizedCustomer = this.sanitizeCustomerData(updatedCustomer, req.user);

      return this.createResponse(true, '客户信息更新成功', sanitizedCustomer);
    } catch (error) {
      console.error(`小程序更新客户失败: ${error.message}`);

      if (error instanceof ForbiddenException) {
        return this.createResponse(false, error.message, null, 'FORBIDDEN');
      }
      return this.createResponse(false, '客户信息更新失败', null, error.message);
    }
  }

  @Patch('miniprogram/:id/assign')
  @ApiOperation({ summary: '小程序分配客户（仅管理员和经理）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  async assignCustomerForMiniprogram(
    @Param('id') id: string,
    @Body() dto: AssignCustomerDto,
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      console.log(`👥 小程序分配客户 ${id} 给 ${dto.assignedTo}`);

      const updatedCustomer = await this.customersService.assignCustomer(
        id,
        dto.assignedTo,
        dto.assignmentReason,
        req.user.userId
      );

      // 发送微信通知给新负责人
      try {
        // 这里可以集成微信通知功能
        console.log(`📱 发送客户分配通知给: ${dto.assignedTo}`);
        // await this.weixinService.sendCustomerAssignmentNotification({...});
      } catch (notificationError) {
        console.error('发送分配通知失败:', notificationError);
        // 通知失败不影响主业务
      }

      console.log(`✅ 小程序分配客户成功: ${id}`);

      // 根据角色脱敏数据
      const sanitizedCustomer = this.sanitizeCustomerData(updatedCustomer, req.user);

      return this.createResponse(true, '客户分配成功', sanitizedCustomer);
    } catch (error) {
      console.error(`小程序分配客户失败: ${error.message}`);
      return this.createResponse(false, error.message || '客户分配失败', null, error.message);
    }
  }

  @Post('miniprogram/:id/follow-ups')
  @ApiOperation({ summary: '小程序创建客户跟进记录（权限控制）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
  async createFollowUpForMiniprogram(
    @Param('id') id: string,
    @Body() createFollowUpDto: CreateCustomerFollowUpDto,
    @Request() req: any,
  ): Promise<ApiResponse> {
    try {
      // 权限检查：验证用户是否有权限跟进此客户
      const customer = await this.customersService.findOne(id);
      if (!this.canAccessCustomer(customer, req.user)) {
        throw new ForbiddenException('无权限跟进此客户');
      }

      const followUp = await this.customersService.createFollowUp(id, createFollowUpDto, req.user.userId);

      console.log(`📝 小程序创建跟进记录成功: 客户${id}, 跟进人${req.user.userId}`);

      return this.createResponse(true, '跟进记录创建成功', followUp);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return this.createResponse(false, error.message, null, 'FORBIDDEN');
      }
      return this.createResponse(false, '跟进记录创建失败', null, error.message);
    }
  }

  @Get('miniprogram/:id/follow-ups')
  @ApiOperation({ summary: '小程序获取客户跟进记录（权限控制）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
  async getFollowUpsForMiniprogram(@Param('id') id: string, @Request() req): Promise<ApiResponse> {
    try {
      // 权限检查
      const customer = await this.customersService.findOne(id);
      if (!this.canAccessCustomer(customer, req.user)) {
        throw new ForbiddenException('无权限查看此客户的跟进记录');
      }

      const followUps = await this.customersService.getFollowUps(id);
      return this.createResponse(true, '跟进记录获取成功', followUps);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return this.createResponse(false, error.message, null, 'FORBIDDEN');
      }
      return this.createResponse(false, '跟进记录获取失败', null, error.message);
    }
  }

  @Get('miniprogram/:id/assignment-logs')
  @ApiOperation({ summary: '小程序获取客户分配历史（仅管理员和经理）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', '系统管理员', '经理')
  async getAssignmentLogsForMiniprogram(@Param('id') id: string): Promise<ApiResponse> {
    try {
      const logs = await this.customersService.getAssignmentLogs(id);
      return this.createResponse(true, '分配历史获取成功', logs);
    } catch (error) {
      return this.createResponse(false, '分配历史获取失败', null, error.message);
    }
  }

  @Get('miniprogram/employees/list')
  @ApiOperation({ summary: '小程序获取员工列表（用于分配客户）' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'employee', '系统管理员', '经理', '普通员工')
  async getEmployeesForMiniprogram(@Request() req): Promise<ApiResponse> {
    try {
      const userRole = this.mapRoleToChineseRole(req.user.role);
      const userId = req.user.userId;
      const userDepartment = req.user.department;

      // 根据角色返回不同的员工列表
      let employees: any[] = [];

      if (userRole === '系统管理员') {
        // 管理员：返回所有活跃员工
        const result = await this.usersService.findAll(1, 1000); // 获取所有用户
        employees = result.items.filter(user => user.active);
      } else if (userRole === '经理') {
        // 经理：返回本部门员工
        const result = await this.usersService.findAll(1, 1000);
        employees = result.items.filter(user =>
          user.active && user.department === userDepartment
        );
      } else {
        // 普通员工：只返回自己
        const currentUser = await this.usersService.findById(userId);
        if (currentUser) {
          employees = [currentUser];
        }
      }

      // 格式化返回数据
      const formattedEmployees = employees.map(emp => ({
        _id: emp._id,
        name: emp.name,
        role: emp.role,
        department: emp.department || '未分配',
        phone: emp.phone || '',
        email: emp.email || '',
        status: emp.active ? 'active' : 'inactive'
      }));

      return this.createResponse(true, '获取员工列表成功', formattedEmployees);
    } catch (error) {
      return this.createResponse(false, '获取员工列表失败', null, error.message);
    }
  }

  // 辅助方法：计算状态统计
  private calculateStatusStats(customers: any[]): Record<string, number> {
    const stats: Record<string, number> = {};
    customers.forEach(customer => {
      const status = customer.contractStatus;
      stats[status] = (stats[status] || 0) + 1;
    });
    return stats;
  }

  // 辅助方法：计算线索来源统计
  private calculateLeadSourceStats(customers: any[]): Record<string, number> {
    const stats: Record<string, number> = {};
    customers.forEach(customer => {
      const source = customer.leadSource;
      if (source) {
        stats[source] = (stats[source] || 0) + 1;
      }
    });
    return stats;
  }

  // 辅助方法：计算服务类别统计
  private calculateServiceCategoryStats(customers: any[]): Record<string, number> {
    const stats: Record<string, number> = {};
    customers.forEach(customer => {
      const category = customer.serviceCategory;
      if (category) {
        stats[category] = (stats[category] || 0) + 1;
      }
    });
    return stats;
  }

  // 批量导入客户（Excel格式）
  @Post('import-excel')
  @ApiOperation({ summary: '批量导入客户（Excel格式）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel文件',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/temp',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = extname(file.originalname);
        callback(null, `customer-excel-${uniqueSuffix}${extension}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!['.xlsx', '.xls'].includes(ext)) {
        return callback(new BadRequestException('仅支持 .xlsx 或 .xls 格式的Excel文件'), false);
      }
      callback(null, true);
    },
  }))
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      if (!file) {
        throw new BadRequestException('请上传Excel文件');
      }

      this.logger.log(`开始处理客户Excel导入，文件名: ${file.originalname}`);
      const importResults = await this.customersService.importFromExcel(file.path, req.user.userId);

      return this.createResponse(
        true,
        `成功导入 ${importResults.success} 条客户，失败 ${importResults.fail} 条`,
        importResults
      );
    } catch (error) {
      this.logger.error(`客户Excel导入失败: ${error.message}`);
      return this.createResponse(
        false,
        `Excel导入失败: ${error.message}`,
        null,
        error.message
      );
    }
  }

  // ==================== 公海相关接口 ====================

  // 获取公海客户列表
  @Get('public-pool')
  @ApiOperation({ summary: '获取公海客户列表' })
  async getPublicPoolCustomers(@Query() query: PublicPoolQueryDto): Promise<ApiResponse> {
    try {
      const result = await this.customersService.getPublicPoolCustomers(query);
      return this.createResponse(true, '公海客户列表获取成功', result);
    } catch (error) {
      return this.createResponse(false, '公海客户列表获取失败', null, error.message);
    }
  }

  // 员工领取客户
  @Post('public-pool/claim')
  @ApiOperation({ summary: '员工从公海领取客户' })
  @ApiBody({ type: ClaimCustomersDto })
  async claimCustomers(@Body() dto: ClaimCustomersDto, @Request() req): Promise<ApiResponse> {
    try {
      const result = await this.customersService.claimCustomers(dto.customerIds, req.user.userId);
      const message = `领取完成：成功 ${result.success} 个，失败 ${result.failed} 个`;
      return this.createResponse(true, message, result);
    } catch (error) {
      return this.createResponse(false, error.message || '领取失败', null, error.message);
    }
  }

  // 管理员从公海分配客户
  @Post('public-pool/assign')
  @ApiOperation({ summary: '管理员从公海分配客户（仅管理员和经理）' })
  @ApiBody({ type: AssignFromPoolDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  async assignFromPool(@Body() dto: AssignFromPoolDto, @Request() req): Promise<ApiResponse> {
    try {
      const result = await this.customersService.assignFromPool(
        dto.customerIds,
        dto.assignedTo,
        dto.reason,
        req.user.userId
      );
      const message = `分配完成：成功 ${result.success} 个，失败 ${result.failed} 个`;
      return this.createResponse(true, message, result);
    } catch (error) {
      return this.createResponse(false, error.message || '分配失败', null, error.message);
    }
  }

  // 释放客户到公海
  @Post(':id/release-to-pool')
  @ApiOperation({ summary: '释放客户到公海' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @ApiBody({ type: ReleaseToPoolDto })
  async releaseToPool(
    @Param('id') id: string,
    @Body() dto: ReleaseToPoolDto,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.releaseToPool(id, dto.reason, req.user.userId);
      return this.createResponse(true, '客户已释放到公海', customer);
    } catch (error) {
      return this.createResponse(false, error.message || '释放失败', null, error.message);
    }
  }

  // 批量释放到公海
  @Post('batch-release-to-pool')
  @ApiOperation({ summary: '批量释放客户到公海' })
  @ApiBody({ type: BatchReleaseToPoolDto })
  async batchReleaseToPool(@Body() dto: BatchReleaseToPoolDto, @Request() req): Promise<ApiResponse> {
    try {
      const result = await this.customersService.batchReleaseToPool(
        dto.customerIds,
        dto.reason,
        req.user.userId
      );
      const message = `释放完成：成功 ${result.success} 个，失败 ${result.failed} 个`;
      return this.createResponse(true, message, result);
    } catch (error) {
      return this.createResponse(false, error.message || '批量释放失败', null, error.message);
    }
  }

  // 获取公海统计数据
  @Get('public-pool/statistics')
  @ApiOperation({ summary: '获取公海统计数据（管理员和经理）' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  async getPublicPoolStatistics(): Promise<ApiResponse> {
    try {
      const statistics = await this.customersService.getPublicPoolStatistics();
      return this.createResponse(true, '公海统计数据获取成功', statistics);
    } catch (error) {
      return this.createResponse(false, '公海统计数据获取失败', null, error.message);
    }
  }

  // 获取客户的公海历史记录
  @Get(':id/public-pool-logs')
  @ApiOperation({ summary: '获取客户的公海历史记录' })
  @ApiParam({ name: 'id', description: '客户ID' })
  async getPublicPoolLogs(@Param('id') id: string): Promise<ApiResponse> {
    try {
      const logs = await this.customersService.getPublicPoolLogs(id);
      return this.createResponse(true, '公海历史记录获取成功', logs);
    } catch (error) {
      return this.createResponse(false, '公海历史记录获取失败', null, error.message);
    }
  }

}