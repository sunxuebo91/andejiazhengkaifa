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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ApiResponse } from '../../common/interfaces/api-response.interface';
import { Public } from '../auth/decorators/public.decorator';
import { WeixinService } from '../weixin/weixin.service';
import { WechatCloudService } from '../weixin/services/wechat-cloud.service';
import { UsersService } from '../users/users.service';

/**
 * 客户/线索控制器（CRM Web + 安得家政小程序）
 * 路由归属：
 *   - /customers/miniprogram/*  安得家政小程序（B 端员工，JWT 鉴权）
 *   - /customers/*              CRM Web 端（内部管理，JWT + 权限）
 * 注：安得褓贝小程序（C 端雇主）的客户列表在独立文件
 *     customers-baobei.controller.ts（路由前缀 /miniprogram/customers，
 *     使用 ServiceSecretGuard 机器间鉴权），不在本控制器内。
 */
@ApiTags('客户管理')
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(
    private readonly customersService: CustomersService,
    private readonly weixinService: WeixinService,
    private readonly wechatCloudService: WechatCloudService,
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

  @Get('enums')
  @Public()
  @ApiOperation({ summary: '获取客户模块枚举配置（供前端/小程序使用）' })
  async getEnums() {
    return {
      success: true,
      data: {
        leadSource: [
          { value: '美团', label: '美团' },
          { value: '抖音', label: '抖音' },
          { value: '快手', label: '快手' },
          { value: '小红书', label: '小红书' },
          { value: '转介绍', label: '转介绍' },
          { value: '99保姆网', label: '99保姆网' },
          { value: '杭州同馨', label: '杭州同馨' },
          { value: '握个手平台', label: '握个手平台' },
          { value: '线索购买', label: '线索购买' },
          { value: '莲心', label: '莲心' },
          { value: '美家', label: '美家' },
          { value: '天机鹿', label: '天机鹿' },
          { value: '孕妈联盟', label: '孕妈联盟' },
          { value: '高阁', label: '高阁' },
          { value: '星星', label: '星星' },
          { value: '妈妈网', label: '妈妈网' },
          { value: '犀牛', label: '犀牛' },
          { value: '宝宝树', label: '宝宝树' },
          { value: '幼亲舒', label: '幼亲舒' },
          { value: '熊猫', label: '熊猫' },
          { value: '官网', label: '官网' },
          { value: '其他', label: '其他' }
        ],
        serviceCategory: [
          { value: '月嫂', label: '月嫂' },
          { value: '住家育儿嫂', label: '住家育儿嫂' },
          { value: '保洁', label: '保洁' },
          { value: '住家保姆', label: '住家保姆' },
          { value: '养宠', label: '养宠' },
          { value: '小时工', label: '小时工' },
          { value: '白班育儿', label: '白班育儿' },
          { value: '白班保姆', label: '白班保姆' },
          { value: '住家护老', label: '住家护老' },
          { value: '家教', label: '家教' },
          { value: '陪伴师', label: '陪伴师' }
        ],
        contractStatus: [
          { value: '已签约', label: '已签约' },
          { value: '签约中', label: '签约中' },
          { value: '匹配中', label: '匹配中' },
          { value: '已面试', label: '已面试' },
          { value: '流失客户', label: '流失客户' },
          { value: '已退款', label: '已退款' },
          { value: '退款中', label: '退款中' },
          { value: '待定', label: '待定' }
        ],
        leadLevel: [
          { value: 'O类', label: 'O类' },
          { value: 'A类', label: 'A类' },
          { value: 'B类', label: 'B类' },
          { value: 'C类', label: 'C类' },
          { value: 'D类', label: 'D类' },
          { value: '流失', label: '流失' }
        ],
        restSchedule: [
          { value: '单休', label: '单休' },
          { value: '双休', label: '双休' },
          { value: '无休', label: '无休' },
          { value: '调休', label: '调休' },
          { value: '待定', label: '待定' }
        ],
        educationRequirement: [
          { value: '无学历', label: '无学历' },
          { value: '小学', label: '小学' },
          { value: '初中', label: '初中' },
          { value: '中专', label: '中专' },
          { value: '职高', label: '职高' },
          { value: '高中', label: '高中' },
          { value: '大专', label: '大专' },
          { value: '本科', label: '本科' },
          { value: '研究生及以上', label: '研究生及以上' }
        ]
      },
      message: '获取枚举配置成功'
    };
  }

  // 辅助方法：检查用户是否有权限访问客户
  private canAccessCustomer(customer: any, user: any): boolean {
    const userRole = this.mapRoleToChineseRole(user.role);

    if (['系统管理员', '经理', '运营', '派单老师'].includes(userRole)) {
      return true; // 管理员/经理/运营/派单老师可以访问所有客户
    } else if (userRole === '普通员工') {
      // 🔥 修复：普通员工只能访问自己负责的客户
      // assignedTo 可能是 ObjectId、ObjectId字符串、或 populate 后的对象
      let assignedToId: string | undefined;
      if (customer.assignedTo) {
        if (typeof customer.assignedTo === 'string') {
          assignedToId = customer.assignedTo;
        } else if (customer.assignedTo._id) {
          assignedToId = customer.assignedTo._id?.toString?.() || customer.assignedTo._id;
        } else {
          assignedToId = customer.assignedTo.toString?.() || String(customer.assignedTo);
        }
      }

      // 调试日志 - 使用 log 级别确保能看到
      this.logger.log(`🔐 权限检查: assignedToId=${assignedToId}, userId=${user.userId}, match=${assignedToId === user.userId}`);

      return assignedToId === user.userId;
    } else if (userRole === '招生老师') {
      // 招生老师只能访问自己负责（assignedTo）或创建（createdBy）的客户
      // 与列表查询 customer-query.service.ts 中 admissions 的可见范围保持一致
      const assignedToId = this.extractUserId(customer.assignedTo);
      const createdById = this.extractUserId(customer.createdBy);
      return assignedToId === user.userId || createdById === user.userId;
    }
    return false;
  }

  // 辅助方法：从 ObjectId / 字符串 / populate 对象中提取 userId 字符串
  private extractUserId(field: any): string | undefined {
    if (!field) return undefined;
    if (typeof field === 'string') return field;
    if (field._id) return field._id?.toString?.() || field._id;
    return field.toString?.() || String(field);
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
      // 线索流转相关字段
      transferCount: customer.transferCount || 0,
      lastTransferredAt: customer.lastTransferredAt,
      autoTransferEnabled: customer.autoTransferEnabled,
      lastActivityAt: customer.lastActivityAt,
    };

    // 🔥 修复：判断是否是自己负责的客户
    // assignedTo 可能是 ObjectId、ObjectId字符串、或 populate 后的对象 {_id, name, username}
    let assignedToId: string | undefined;
    if (customer.assignedTo) {
      if (typeof customer.assignedTo === 'string') {
        assignedToId = customer.assignedTo;
      } else if (customer.assignedTo._id) {
        // populate 后的对象
        assignedToId = customer.assignedTo._id?.toString?.() || customer.assignedTo._id;
      } else {
        // 原始 ObjectId
        assignedToId = customer.assignedTo.toString?.() || String(customer.assignedTo);
      }
    }
    const isOwnCustomer = assignedToId === userId;

    // 招生老师"自己负责"的范围与列表查询保持一致：assignedTo 或 createdBy 任一命中即可
    const createdById = this.extractUserId(customer.createdBy);
    const isOwnForAdmissions = isOwnCustomer || createdById === userId;

    if (userRole === '普通员工') {
      // 普通员工：自己的客户显示完整信息，其他客户脱敏
      return {
        ...baseData,
        phone: isOwnCustomer ? customer.phone : this.maskPhoneNumber(customer.phone),
        wechatId: isOwnCustomer ? customer.wechatId : undefined,
        idCardNumber: isOwnCustomer ? customer.idCardNumber : undefined, // 🔥 添加身份证号
        address: isOwnCustomer ? customer.address : undefined,
        salaryBudget: isOwnCustomer ? customer.salaryBudget : undefined,
        expectedStartDate: isOwnCustomer ? customer.expectedStartDate : undefined,
        homeArea: isOwnCustomer ? customer.homeArea : undefined,
        familySize: isOwnCustomer ? customer.familySize : undefined,
        restSchedule: isOwnCustomer ? customer.restSchedule : undefined,
        ageRequirement: isOwnCustomer ? customer.ageRequirement : undefined,
        genderRequirement: isOwnCustomer ? customer.genderRequirement : undefined,
        originRequirement: isOwnCustomer ? customer.originRequirement : undefined,
        educationRequirement: isOwnCustomer ? customer.educationRequirement : undefined,
        expectedDeliveryDate: isOwnCustomer ? customer.expectedDeliveryDate : undefined,
        dealAmount: isOwnCustomer ? customer.dealAmount : undefined, // 成交金额
        remarks: isOwnCustomer ? customer.remarks : undefined,
      };
    } else if (userRole === '招生老师') {
      // 招生老师：自己负责或自己创建的客户显示完整信息，其他客户脱敏
      return {
        ...baseData,
        phone: isOwnForAdmissions ? customer.phone : this.maskPhoneNumber(customer.phone),
        wechatId: isOwnForAdmissions ? customer.wechatId : undefined,
        idCardNumber: isOwnForAdmissions ? customer.idCardNumber : undefined,
        address: isOwnForAdmissions ? customer.address : undefined,
        salaryBudget: isOwnForAdmissions ? customer.salaryBudget : undefined,
        expectedStartDate: isOwnForAdmissions ? customer.expectedStartDate : undefined,
        homeArea: isOwnForAdmissions ? customer.homeArea : undefined,
        familySize: isOwnForAdmissions ? customer.familySize : undefined,
        restSchedule: isOwnForAdmissions ? customer.restSchedule : undefined,
        ageRequirement: isOwnForAdmissions ? customer.ageRequirement : undefined,
        genderRequirement: isOwnForAdmissions ? customer.genderRequirement : undefined,
        originRequirement: isOwnForAdmissions ? customer.originRequirement : undefined,
        educationRequirement: isOwnForAdmissions ? customer.educationRequirement : undefined,
        expectedDeliveryDate: isOwnForAdmissions ? customer.expectedDeliveryDate : undefined,
        dealAmount: isOwnForAdmissions ? customer.dealAmount : undefined,
        remarks: isOwnForAdmissions ? customer.remarks : undefined,
        needWorkingHours: isOwnForAdmissions ? customer.needWorkingHours : undefined,
        needWorkContent: isOwnForAdmissions ? customer.needWorkContent : undefined,
        needRemarks: isOwnForAdmissions ? customer.needRemarks : undefined,
        needServicePeriod: isOwnForAdmissions ? customer.needServicePeriod : undefined,
      };
    } else if (userRole === '经理') {
      // 经理可以看到部门内所有客户的完整信息
      return {
        ...baseData,
        phone: customer.phone,
        wechatId: customer.wechatId,
        idCardNumber: customer.idCardNumber, // 🔥 添加身份证号
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
        dealAmount: customer.dealAmount, // 成交金额
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

  // 官网公开表单提交接口（无需登录）
  @Post('website-lead')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '官网留资表单提交（公开接口，无需认证）' })
  async createFromWebsite(
    @Body() body: { name: string; phone: string; serviceCategory?: string; remarks?: string },
  ): Promise<ApiResponse> {
    try {
      const result = await this.customersService.createFromWebsite(body);
      return this.createResponse(true, result.message, { customerId: result.customerId });
    } catch (error) {
      return this.createResponse(false, error.message || '提交失败', null, error.message);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('customer:create')
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
  @Permissions('customer:view')
  async findAll(@Query() query: CustomerQueryDto, @Request() req): Promise<ApiResponse> {
    try {
      const result = await this.customersService.findAll(query, req.user.userId);
      return this.createResponse(true, '客户列表获取成功', result);
    } catch (error) {
      return this.createResponse(false, '客户列表获取失败', null, error.message);
    }
  }

  @Get('statistics')
  @Permissions('customer:view')
  async getStatistics(): Promise<ApiResponse> {
    try {
      const stats = await this.customersService.getStatistics();
      return this.createResponse(true, '客户统计信息获取成功', stats);
    } catch (error) {
      return this.createResponse(false, '客户统计信息获取失败', null, error.message);
    }
  }

  @Get('search')
  @ApiOperation({ summary: '搜索客户（用于电子签名等场景，包含所有状态客户）' })
  @Permissions('customer:view')
  async searchCustomers(
    @Query('search') search: string,
    @Query('limit') limit: string = '10',
  ): Promise<ApiResponse> {
    try {
      const limitNum = parseInt(limit) || 10;
      // 🔥 电子签名搜索：包含所有状态的客户（包括流失客户）
      const result = await this.customersService.searchForESign(search, limitNum);
      return this.createResponse(true, '客户搜索成功', result);
    } catch (error) {
      return this.createResponse(false, '客户搜索失败', null, error.message);
    }
  }

  @Get('customer-id/:customerId')
  @Permissions('customer:view')
  async findByCustomerId(@Param('customerId') customerId: string): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.findByCustomerId(customerId);
      return this.createResponse(true, '客户详情获取成功', customer);
    } catch (error) {
      return this.createResponse(false, '客户详情获取失败', null, error.message);
    }
  }

  // 根据手机号获取客户地址（用于合同详情页显示服务地址）
  @Get('address-by-phone/:phone')
  @ApiOperation({ summary: '根据手机号获取客户地址' })
  @Permissions('customer:view')
  async getAddressByPhone(@Param('phone') phone: string): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.findByPhone(phone);
      if (!customer) {
        return this.createResponse(false, '客户不存在', null);
      }
      return this.createResponse(true, '获取客户地址成功', { address: customer.address || null });
    } catch (error) {
      return this.createResponse(false, '获取客户地址失败', null, error.message);
    }
  }

  // 可分配的用户列表 - 必须在 :id 路由之前
  @Get('assignable-users')
  @Permissions('user:view')
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
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'manager', 'operator')
  @Permissions('customer:edit')
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

      // ✅ 为批量分配添加通知数据
      const notificationData = {
        assignedToId: dto.assignedTo,
        source: dto.assignmentReason || '批量分配',
        assignerName: req.user.name || req.user.username,
        assignTime: new Date(),
        customerCount: result.success,  // 成功分配的客户数量
        customerIds: dto.customerIds,   // 客户ID列表
      };

      // 🚀 CRM端主动调用云函数发送批量通知（异步执行，不阻塞响应）
      if (result.success > 0) {
        this.wechatCloudService.sendBatchCustomerAssignNotification(notificationData)
          .catch(error => {
            this.logger.error(`发送批量通知失败: ${error.message}`);
          });
      }

      const message = `批量分配完成：成功 ${result.success} 个，失败 ${result.failed} 个`;
      return this.createResponse(true, message, {
        ...result,
        notificationData,
      });
    } catch (error) {
      return this.createResponse(false, error.message || '批量分配失败', null, error.message);
    }
  }

  // 获取用户当前持有的客户数量 - 必须在 :id 路由之前
  @Get('my-customer-count')
  @ApiOperation({ summary: '获取当前用户持有的客户数量' })
  @Permissions('customer:view')
  async getMyCustomerCount(@Request() req): Promise<ApiResponse> {
    try {
      const count = await this.customersService.getUserCustomerCount(req.user.userId);
      return this.createResponse(true, '客户数量获取成功', { count, limit: 50 });
    } catch (error) {
      return this.createResponse(false, '客户数量获取失败', null, error.message);
    }
  }

  // ==================== 公海相关接口 - 必须在 :id 路由之前 ====================

  // 获取公海客户列表
  @Get('public-pool')
  @ApiOperation({ summary: '获取公海客户列表' })
  @Permissions('customer:view')
  async getPublicPoolCustomers(@Query() query: PublicPoolQueryDto): Promise<ApiResponse> {
    try {
      const result = await this.customersService.getPublicPoolCustomers(query);
      return this.createResponse(true, '公海客户列表获取成功', result);
    } catch (error) {
      return this.createResponse(false, '公海客户列表获取失败', null, error.message);
    }
  }

  // 获取公海统计数据
  @Get('public-pool/statistics')
  @ApiOperation({ summary: '获取公海统计数据（管理员和经理）' })
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'manager', 'operator')
  @Permissions('customer:view')
  async getPublicPoolStatistics(): Promise<ApiResponse> {
    try {
      const statistics = await this.customersService.getPublicPoolStatistics();
      return this.createResponse(true, '公海统计数据获取成功', statistics);
    } catch (error) {
      return this.createResponse(false, '公海统计数据获取失败', null, error.message);
    }
  }

  // 员工领取客户
  @Post('public-pool/claim')
  @ApiOperation({ summary: '员工从公海领取客户' })
  @ApiBody({ type: ClaimCustomersDto })
  @Permissions('customer:edit')
  async claimCustomers(@Body() dto: ClaimCustomersDto, @Request() req): Promise<ApiResponse> {
    try {
      this.logger.debug('🎯 [领取客户] 开始处理:', { customerIds: dto.customerIds, userId: req.user.userId });
      const result = await this.customersService.claimCustomers(dto.customerIds, req.user.userId);
      this.logger.debug('✅ [领取客户] 处理完成:', result);
      const message = `领取完成：成功 ${result.success} 个，失败 ${result.failed} 个`;
      const response = this.createResponse(true, message, result);
      this.logger.debug('📤 [领取客户] 返回响应:', response);
      return response;
    } catch (error) {
      this.logger.error('❌ [领取客户] 处理失败:', error.message, error.stack);
      const response = this.createResponse(false, error.message || '领取失败', null, error.message);
      this.logger.debug('📤 [领取客户] 返回错误响应:', response);
      return response;
    }
  }

  // 管理员从公海分配客户
  @Post('public-pool/assign')
  @ApiOperation({ summary: '管理员从公海分配客户（仅管理员和经理）' })
  @ApiBody({ type: AssignFromPoolDto })
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'manager', 'operator')
  @Permissions('customer:edit')
  async assignFromPool(@Body() dto: AssignFromPoolDto, @Request() req): Promise<ApiResponse> {
    try {
      const result = await this.customersService.assignFromPool(
        dto.customerIds,
        dto.assignedTo,
        dto.reason,
        req.user.userId
      );

      // ✅ 为从公海分配添加通知数据
      const notificationData = {
        assignedToId: dto.assignedTo,
        source: dto.reason || '从公海分配',
        assignerName: req.user.name || req.user.username,
        assignTime: new Date(),
        customerCount: result.success,
        customerIds: dto.customerIds,
        fromPublicPool: true,  // 标记来自公海
      };

      // 🚀 CRM端主动调用云函数发送通知（异步执行，不阻塞响应）
      if (result.success > 0) {
        this.wechatCloudService.sendBatchCustomerAssignNotification(notificationData)
          .catch(error => {
            this.logger.error(`发送公海分配通知失败: ${error.message}`);
          });
      }

      const message = `分配完成：成功 ${result.success} 个，失败 ${result.failed} 个`;
      return this.createResponse(true, message, {
        ...result,
        notificationData,
      });
    } catch (error) {
      return this.createResponse(false, error.message || '分配失败', null, error.message);
    }
  }

  // 批量释放到公海
  @Post('batch-release-to-pool')
  @ApiOperation({ summary: '批量释放客户到公海' })
  @ApiBody({ type: BatchReleaseToPoolDto })
  @Permissions('customer:edit')
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

  @Get(':id')
  @Permissions('customer:view')
  async findOne(@Param('id') id: string, @Request() req): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.findOne(id);
      if (!this.canAccessCustomer(customer, req.user)) {
        throw new ForbiddenException('无权限访问此客户信息');
      }
      const sanitized = this.sanitizeCustomerData(customer, req.user);
      return this.createResponse(true, '客户详情获取成功', sanitized);
    } catch (error) {
      return this.createResponse(false, '客户详情获取失败', null, error.message);
    }
  }

  @Patch(':id')
  @Permissions('customer:edit')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.update(id, updateCustomerDto, req.user.userId);
      return this.createResponse(true, '客户信息更新成功', customer);
    } catch (error) {
      this.logger.error(`❌ 客户更新失败 [${id}]: ${error.message}`, error.stack);
      return this.createResponse(false, error.message || '客户信息更新失败', null, error.message);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('customer:delete')
  async remove(@Param('id') id: string, @Request() req): Promise<ApiResponse> {
    try {
      await this.customersService.remove(id, req.user.userId);
      return this.createResponse(true, '客户删除成功');
    } catch (error) {
      return this.createResponse(false, '客户删除失败', null, error.message);
    }
  }

  // 创建客户跟进记录
  @Post(':id/follow-ups')
  @Permissions('customer:edit')
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
  @Permissions('customer:view')
  async getFollowUps(@Param('id') id: string): Promise<ApiResponse> {
    try {
      const followUps = await this.customersService.getFollowUps(id);
      return this.createResponse(true, '跟进记录获取成功', followUps);
    } catch (error) {
      return this.createResponse(false, '跟进记录获取失败', null, error.message);
    }
  }

  // 获取客户跟进状态
  @Get(':id/follow-up-status')
  @ApiOperation({ summary: '获取客户跟进状态（新客未跟进/流转未跟进）' })
  @Permissions('customer:view')
  async getFollowUpStatus(@Param('id') id: string): Promise<ApiResponse> {
    try {
      const status = await this.customersService.getFollowUpStatus(id);
      return this.createResponse(true, '跟进状态获取成功', status);
    } catch (error) {
      return this.createResponse(false, '跟进状态获取失败', null, error.message);
    }
  }

  // 分配客户归属人
  @Patch(':id/assign')
  @Permissions('customer:edit')
  async assignCustomer(
    @Param('id') id: string,
    @Body() dto: AssignCustomerDto,
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      const updated = await this.customersService.assignCustomer(id, dto.assignedTo, dto.assignmentReason, req.user.userId);

      // ✅ 构建通知数据
      const notificationData = {
        assignedToId: dto.assignedTo,
        customerName: (updated as any).name,
        customerPhone: (updated as any).phone,
        source: dto.assignmentReason || '手动分配',
        assignerName: req.user.name || req.user.username,
        customerId: id,
        assignTime: (updated as any).assignedAt || new Date(),
        serviceCategory: (updated as any).serviceCategory,
        leadSource: (updated as any).leadSource,
      };

      // 🚀 CRM端主动调用云函数发送通知（异步执行，不阻塞响应）
      this.wechatCloudService.sendCustomerAssignNotification(notificationData)
        .catch(error => {
          this.logger.error(`发送通知失败: ${error.message}`);
        });

      return this.createResponse(true, '客户分配成功', {
        ...(updated as any).toObject ? (updated as any).toObject() : updated,
        notificationData,
      });
    } catch (error) {
      return this.createResponse(false, error.message || '客户分配失败', null, error.message);
    }
  }



  // 客户分配历史
  @Get(':id/assignment-logs')
  @Permissions('customer:view')
  async getAssignmentLogs(@Param('id') id: string): Promise<ApiResponse> {
    try {
      const logs = await this.customersService.getAssignmentLogs(id);
      return this.createResponse(true, '分配历史获取成功', logs);
    } catch (error) {
      return this.createResponse(false, '分配历史获取失败', null, error.message);
    }
  }

  // 获取客户操作日志（仅管理员可访问）
  @Get(':id/operation-logs')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions('customer:view')
  @ApiOperation({ summary: '获取客户操作日志（仅管理员）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  async getOperationLogs(@Param('id') id: string, @Request() req): Promise<ApiResponse> {
    try {
      // 验证用户是否为管理员
      if (req.user.role !== 'admin') {
        return this.createResponse(false, '权限不足，仅管理员可查看操作日志', null, 'Forbidden');
      }
      const logs = await this.customersService.getOperationLogs(id);
      return this.createResponse(true, '操作日志获取成功', logs);
    } catch (error) {
      return this.createResponse(false, '操作日志获取失败', null, error.message);
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
      'employee': '普通员工',
      'operator': '运营',
      'dispatch': '派单老师',
      'admissions': '招生老师',
    };
    return roleMap[role] || role;
  }

  @Get('miniprogram/statistics')
  @ApiOperation({ summary: '小程序获取客户统计信息（基于角色权限）' })
  @Permissions('customer:view')
  async getStatisticsForMiniprogram(@Query() query: CustomerQueryDto, @Request() req): Promise<ApiResponse> {
    try {
      const userRole = this.mapRoleToChineseRole(req.user.role);
      const userId = req.user.userId;
      const filteredQuery: any = { ...query };

      let stats;
      if (userRole === '普通员工') {
        // 普通员工只能看自己负责的客户统计
        filteredQuery.assignedTo = userId;
        const filteredStats = await this.customersService.getFilteredStatisticsForMiniprogram(filteredQuery);

        // 简化的统计信息
        stats = {
          total: filteredStats.total,
          myCustomers: filteredStats.total,
          byContractStatus: filteredStats.byContractStatus,
        };
      } else {
        // 管理员和经理可以看全局统计
        stats = await this.customersService.getFilteredStatisticsForMiniprogram(filteredQuery);
      }

      return this.createResponse(true, '统计信息获取成功', stats);
    } catch (error) {
      return this.createResponse(false, '统计信息获取失败', null, error.message);
    }
  }

  @Get('miniprogram/today-todo-stats')
  @ApiOperation({ summary: '小程序获取客户信息统计' })
  @Permissions('customer:view')
  async getTodayTodoStatsForMiniprogram(@Request() req): Promise<ApiResponse> {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;  // 传递用户角色用于权限判断
      const stats = await this.customersService.getTodayTodoStats(userId, userRole);
      return this.createResponse(true, '客户信息统计获取成功', stats);
    } catch (error) {
      return this.createResponse(false, '客户信息统计获取失败', null, error.message);
    }
  }

  @Get('miniprogram/performance-progress')
  @ApiOperation({ summary: '小程序获取业绩进度' })
  @Permissions('customer:view')
  async getPerformanceProgressForMiniprogram(@Request() req): Promise<ApiResponse> {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;  // 传递用户角色用于权限判断
      const progress = await this.customersService.getPerformanceProgress(userId, userRole);
      return this.createResponse(true, '业绩进度获取成功', progress);
    } catch (error) {
      return this.createResponse(false, '业绩进度获取失败', null, error.message);
    }
  }

  @Get('miniprogram/contract-stats')
  @ApiOperation({ summary: '小程序获取合同统计' })
  @Permissions('customer:view')
  async getContractStatsForMiniprogram(@Request() req): Promise<ApiResponse> {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const stats = await this.customersService.getContractStats(userId, userRole);
      return this.createResponse(true, '合同统计获取成功', stats);
    } catch (error) {
      return this.createResponse(false, '合同统计获取失败', null, error.message);
    }
  }

  @Get('miniprogram/list')
  @ApiOperation({ summary: '小程序获取客户列表（支持权限控制和数据脱敏）' })
  @Permissions('customer:view')
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
  @Permissions('customer:create')
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
      this.logger.debug(`🆕 小程序创建客户:`);
      this.logger.debug(`📝 创建数据: ${JSON.stringify(createCustomerDto, null, 2)}`);
      this.logger.debug(`🔑 请求头: idempotencyKey=${idempotencyKey}, apiVersion=${apiVersion}, requestId=${requestId}`);

      // 兼容小程序端传入的 notes 字段，映射到 remarks
      if ((createCustomerDto as any).notes && !createCustomerDto.remarks) {
        createCustomerDto.remarks = (createCustomerDto as any).notes;
      }
      delete (createCustomerDto as any).notes;

      // 幂等性处理：如果提供了幂等性键，检查是否已存在相同的请求
      if (idempotencyKey) {
        // 这里可以实现幂等性逻辑，检查Redis或数据库中是否已有相同的请求
        // 暂时简化处理，直接创建
      }

      const customer = await this.customersService.create(createCustomerDto, req.user.userId);

      this.logger.debug(`✅ 小程序创建客户成功: ${(customer as any)._id}`);

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
      this.logger.error(`小程序创建客户失败: ${error.message}`);

      // 处理特定错误类型（参考简历创建接口）
      if (error.message?.includes('该手机号已存在')) {
        return this.createResponse(false, '该手机号已存在客户记录', null, 'DUPLICATE_PHONE');
      }

      // 处理手机号或微信号验证错误
      if (error.message?.includes('请填写手机号或微信号')) {
        return this.createResponse(false, '请填写手机号或微信号', null, 'MISSING_CONTACT');
      }

      return this.createResponse(false, error.message || '客户创建失败', { requestId }, 'DUPLICATE_PHONE');
    }
  }

  // ==================== 安得褓贝小程序专用接口 ====================

  /**
   * 褓贝小程序 - 获取客户列表
   * 返回字段：客户编号、客户姓名、客户电话、签约状态、客户需求（11个need字段）
   * 支持分页、关键词搜索、签约状态筛选
   * 普通员工只能看分配给自己的客户；管理员/经理可看全部
   */
  @Get('baobei/list')
  @ApiOperation({ summary: '【褓贝小程序】客户列表（含客户需求）' })
  @Permissions('customer:view')
  async getListForBaobei(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('contractStatus') contractStatus?: string,
    @Request() req?,
  ): Promise<ApiResponse> {
    try {
      const userId = req.user.userId;
      const userRole = this.mapRoleToChineseRole(req.user.role);

      const query: CustomerQueryDto = {
        page: Number(page) || 1,
        limit: Math.min(Number(limit) || 20, 100), // 最多100条
        search,
        contractStatus: contractStatus as any,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      // 普通员工只能查看分配给自己的客户
      if (userRole === '普通员工') {
        query.assignedTo = userId;
      }

      const result = await this.customersService.findAll(query, userId);

      // 只返回褓贝小程序需要的字段
      const customers = result.customers.map((c: any) => ({
        id: c._id,
        customerId: c.customerId,
        name: c.name,
        phone: c.phone,
        contractStatus: c.contractStatus,
        needs: {
          orderType: c.needOrderType || '',
          workingHours: c.needWorkingHours || '',
          salary: c.needSalary || '',
          restTime: c.needRestTime || '',
          familyMembers: c.needFamilyMembers || '',
          serviceAddress: c.needServiceAddress || '',
          houseArea: c.needHouseArea || '',
          workContent: c.needWorkContent || '',
          remarks: c.needRemarks || '',
          servicePeriod: c.needServicePeriod || '',
          onboardingTime: c.needOnboardingTime || '',
        },
      }));

      return this.createResponse(true, '客户列表获取成功', {
        customers,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasMore: result.page * result.limit < result.total,
      });
    } catch (error) {
      this.logger.error(`褓贝小程序获取客户列表失败: ${error.message}`);
      return this.createResponse(false, '获取客户列表失败', null, error.message);
    }
  }

  @Get('miniprogram/:id')
  @ApiOperation({ summary: '小程序获取客户详情（权限控制）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @Permissions('customer:view')
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
  @Permissions('customer:edit')
  async updateForMiniprogram(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      this.logger.debug(`🔄 小程序更新客户 ${id}:`);
      this.logger.debug(`📝 更新数据: ${JSON.stringify(updateCustomerDto, null, 2)}`);

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
          this.logger.debug(`📱 客户状态变更: ${oldStatus} -> ${updatedCustomer.contractStatus}`);
          // await this.weixinService.sendCustomerStatusChangeNotification({...});
        } catch (notificationError) {
          this.logger.error('发送微信通知失败:', notificationError);
          // 通知失败不影响主业务
        }
      }

      this.logger.debug(`✅ 小程序更新客户成功: ${id}`);

      // 根据角色脱敏数据
      const sanitizedCustomer = this.sanitizeCustomerData(updatedCustomer, req.user);

      return this.createResponse(true, '客户信息更新成功', sanitizedCustomer);
    } catch (error) {
      this.logger.error(`小程序更新客户失败: ${error.message}`);

      if (error instanceof ForbiddenException) {
        return this.createResponse(false, error.message, null, 'FORBIDDEN');
      }

      // 处理手机号或微信号验证错误
      if (error.message?.includes('请填写手机号或微信号')) {
        return this.createResponse(false, '请填写手机号或微信号', null, 'MISSING_CONTACT');
      }

      return this.createResponse(false, '客户信息更新失败', null, error.message);
    }
  }

  @Patch('miniprogram/:id/assign')
  @ApiOperation({ summary: '小程序分配客户（仅管理员和经理）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @Permissions('customer:edit')
  async assignCustomerForMiniprogram(
    @Param('id') id: string,
    @Body() dto: AssignCustomerDto,
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      // 普通员工和招生老师不允许分配客户
      const userRole = this.mapRoleToChineseRole(req.user.role);
      if (['普通员工', '招生老师'].includes(userRole)) {
        throw new ForbiddenException('无权限分配客户');
      }
      this.logger.debug(`👥 小程序分配客户 ${id} 给 ${dto.assignedTo}`);

      const updatedCustomer = await this.customersService.assignCustomer(
        id,
        dto.assignedTo,
        dto.assignmentReason,
        req.user.userId
      );

      this.logger.debug(`✅ 小程序分配客户成功: ${id}`);

	      // 根据角色脱敏数据（用于前端展示）
	      const sanitizedCustomer = this.sanitizeCustomerData(updatedCustomer, req.user);

	      // ✅ 构建通知数据
	      const notificationData = {
	        assignedToId: dto.assignedTo,                                    // 被分配人ID
	        customerName: (updatedCustomer as any).name,                     // 客户姓名
	        customerPhone: (updatedCustomer as any).phone,                   // 客户电话
	        source: dto.assignmentReason || '手动分配',                      // 线索来源/分配原因
	        assignerName: req.user.name || req.user.username,                // 分配人姓名
	        customerId: (updatedCustomer as any)._id?.toString?.() ?? id,    // 客户ID
	        assignTime: (updatedCustomer as any).assignedAt || new Date(),   // 分配时间
	        serviceCategory: (updatedCustomer as any).serviceCategory,       // 服务类别
	        leadSource: (updatedCustomer as any).leadSource,                 // 线索来源
	      };

	      this.logger.debug(`📱 通知数据已准备: ${JSON.stringify(notificationData)}`);

	      // 🚀 CRM端主动调用云函数发送通知（异步执行，不阻塞响应）
	      this.wechatCloudService.sendCustomerAssignNotification(notificationData)
	        .catch(error => {
	          this.logger.error(`发送通知失败: ${error.message}`);
	        });

	      // ✅ 确保返回结构中至少包含 customerId / assignedTo / assignedAt 以及 notificationData
	      const responseData = {
	        customerId: (updatedCustomer as any)._id?.toString?.() ?? id,
	        assignedTo: (updatedCustomer as any).assignedTo,
	        assignedAt: (updatedCustomer as any).assignedAt,
	        ...sanitizedCustomer,
	        notificationData,
	      };

	      return this.createResponse(true, '客户分配成功', responseData);
    } catch (error) {
      this.logger.error(`小程序分配客户失败: ${error.message}`);
      return this.createResponse(false, error.message || '客户分配失败', null, error.message);
    }
  }

  @Post('miniprogram/:id/follow-ups')
  @ApiOperation({ summary: '小程序创建客户跟进记录（权限控制）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @Permissions('customer:edit')
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

      this.logger.debug(`📝 小程序创建跟进记录成功: 客户${id}, 跟进人${req.user.userId}`);

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
  @Permissions('customer:view')
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
  @ApiOperation({ summary: '小程序获取客户分配历史（权限控制）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @Permissions('customer:view')
  async getAssignmentLogsForMiniprogram(@Param('id') id: string, @Request() req): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.findOne(id);
      if (!this.canAccessCustomer(customer, req.user)) {
        throw new ForbiddenException('无权限查看此客户的分配历史');
      }

      const logs = await this.customersService.getAssignmentLogs(id);
      return this.createResponse(true, '分配历史获取成功', logs);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return this.createResponse(false, error.message, null, 'FORBIDDEN');
      }
      return this.createResponse(false, '分配历史获取失败', null, error.message);
    }
  }

  @Post('miniprogram/:id/release-to-pool')
  @ApiOperation({ summary: '小程序释放客户到公海' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @ApiBody({ type: ReleaseToPoolDto })
  @Permissions('customer:edit')
  async releaseToPoolForMiniprogram(
    @Param('id') id: string,
    @Body() dto: ReleaseToPoolDto,
    @Request() req,
  ): Promise<ApiResponse> {
    try {
      this.logger.debug(`📤 小程序释放客户到公海 ${id}, 原因: ${dto.reason}`);

      // 调用现有的 releaseToPool 方法
      const customer = await this.customersService.releaseToPool(id, dto.reason, req.user.userId);

      this.logger.debug(`✅ 小程序释放客户成功: ${id}`);
      return this.createResponse(true, '客户已释放到公海', customer);
    } catch (error) {
      this.logger.error(`❌ 小程序释放客户失败: ${error.message}`);
      return this.createResponse(false, error.message || '释放失败', null, error.message);
    }
  }

  @Get('miniprogram/employees/list')
  @ApiOperation({ summary: '小程序获取员工列表（用于分配客户）' })
  @Permissions('customer:view')
  async getEmployeesForMiniprogram(@Request() req): Promise<ApiResponse> {
    try {
      const userRole = this.mapRoleToChineseRole(req.user.role);
      const userId = req.user.userId;
      const userDepartment = req.user.department;

      // 根据角色返回不同的员工列表
      let employees: any[] = [];

      if (['系统管理员', '运营'].includes(userRole)) {
        // 管理员/运营：返回所有活跃员工
        const result = await this.usersService.findAll(1, 1000);
        employees = result.items.filter(user => user.active);
      } else if (['经理', '派单老师'].includes(userRole)) {
        // 经理/派单老师：返回所有活跃员工（用于分配客户）
        const result = await this.usersService.findAll(1, 1000);
        employees = result.items.filter(user => user.active);
      } else {
        // 普通员工/招生老师：只返回自己
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

  /**
   * 🆕 同步客户线索等级为O类（当合同签约时调用）
   * 此接口由前端在检测到合同签约时调用
   */
  @Patch(':id/sync-lead-level-o')
  @ApiOperation({ summary: '同步客户线索等级为O类（合同签约时自动调用）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @UseGuards(JwtAuthGuard)
  async syncLeadLevelToO(@Param('id') id: string): Promise<ApiResponse> {
    try {
      await this.customersService.updateLeadLevelToOOnContractSigned(id);
      return this.createResponse(true, '线索等级已同步为O类', null);
    } catch (error) {
      this.logger.error(`同步线索等级失败: ${error.message}`);
      return this.createResponse(false, '同步线索等级失败', null, error.message);
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

  // 释放客户到公海（带:id参数的路由）
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

  // 获取客户的公海历史记录（带:id参数的路由）
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

  // 冻结线索（仅管理员）
  @Patch(':id/freeze')
  @ApiOperation({ summary: '冻结线索（仅管理员）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async freezeCustomer(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.freezeCustomer(id, req.user.userId, reason);
      return this.createResponse(true, '线索已冻结', customer);
    } catch (error) {
      return this.createResponse(false, error.message || '冻结失败', null, error.message);
    }
  }

  // 解冻线索（仅管理员）
  @Patch(':id/unfreeze')
  @ApiOperation({ summary: '解冻线索（仅管理员）' })
  @ApiParam({ name: 'id', description: '客户ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async unfreezeCustomer(
    @Param('id') id: string,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const customer = await this.customersService.unfreezeCustomer(id, req.user.userId);
      return this.createResponse(true, '线索已解冻', customer);
    } catch (error) {
      return this.createResponse(false, error.message || '解冻失败', null, error.message);
    }
  }

}
