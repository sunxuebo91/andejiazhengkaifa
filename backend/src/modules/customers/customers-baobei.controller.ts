import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ServiceSecretGuard } from '../auth/guards/service-secret.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CustomersService } from './customers.service';
import { UsersService } from '../users/users.service';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

/**
 * 褓贝小程序客户列表控制器（专供微信小程序云函数调用）
 *
 * 鉴权方式：X-Service-Secret 共享密钥（机器间鉴权），不使用 JWT。
 * 身份过滤：通过 query 参数 phone 找到对应员工，按其角色决定可见范围。
 * 路由前缀：/api/miniprogram/customers
 */
@ApiTags('褓贝小程序-客户列表')
@Controller('miniprogram/customers')
@Public()
@UseGuards(ServiceSecretGuard)
export class CustomersBaobeiController {
  private readonly logger = new Logger(CustomersBaobeiController.name);

  constructor(
    private readonly customersService: CustomersService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * 角色映射：英文角色码 → 中文角色名
   */
  private mapRoleToChineseRole(role: string): string {
    const roleMap: Record<string, string> = {
      admin: '系统管理员',
      manager: '经理',
      employee: '普通员工',
      operator: '运营',
      dispatch: '派单老师',
      admissions: '招生老师',
    };
    return roleMap[role] || role;
  }

  /**
   * 褓贝小程序 - 按 ID 获取单个客户信息
   * GET /api/miniprogram/customers/baobei/detail?id=xxx
   *
   * 用于推荐提交页展示"关联客户订单"卡片，X-Service-Secret 鉴权，无需 phone 参数。
   */
  @Get('baobei/detail')
  @ApiOperation({ summary: '【褓贝小程序·云函数】按ID获取客户信息（X-Service-Secret 鉴权）' })
  @ApiQuery({ name: 'id', required: true, description: '客户 _id（MongoDB ObjectId）' })
  async getCustomerByIdForBaobei(@Query('id') id: string): Promise<ApiResponse> {
    if (!id) {
      throw new BadRequestException('id 参数不能为空');
    }

    this.logger.log(`[褓贝云函数] 按ID查询客户，id=${id}`);

    const customer = await this.customersService.findOne(id);
    if (!customer) {
      throw new BadRequestException(`未找到 id=${id} 的客户`);
    }

    const c = customer as any;
    return {
      success: true,
      message: '获取成功',
      data: {
        id: c._id,
        customerId: c.customerId,
        name: c.name,
        phone: c.phone,
        contractStatus: c.contractStatus,
        needs: {
          orderType: c.needOrderType || '',
          workingHours: c.needWorkingHours || '',
          salary: c.needSalary || '',
          servicePeriod: c.needServicePeriod || '',
          onboardingTime: c.needOnboardingTime || '',
          serviceAddress: c.needServiceAddress || '',
        },
      },
      timestamp: Date.now(),
    };
  }

  /**
   * 褓贝小程序 - 获取客户列表
   * GET /api/miniprogram/customers/baobei/list?phone=xxx&page=1&limit=20&search=xxx&contractStatus=xxx
   *
   * phone: 调用方（员工）手机号，用于确认身份与权限范围
   *   - 普通员工：只返回分配给自己的客户
   *   - 经理 / 管理员等：返回全部客户
   */
  @Get('baobei/list')
  @ApiOperation({ summary: '【褓贝小程序·云函数】客户列表（X-Service-Secret 鉴权）' })
  @ApiQuery({ name: 'phone', required: true, description: '员工手机号（用于身份过滤）' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认 1' })
  @ApiQuery({ name: 'limit', required: false, description: '每页条数，默认 20，最大 100' })
  @ApiQuery({ name: 'search', required: false, description: '关键词搜索' })
  @ApiQuery({ name: 'contractStatus', required: false, description: '签约状态筛选' })
  async getListForBaobei(
    @Query('phone') phone: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('contractStatus') contractStatus?: string,
  ): Promise<ApiResponse> {
    if (!phone) {
      throw new BadRequestException('phone 参数不能为空');
    }

    this.logger.log(`[褓贝云函数] 查询客户列表，phone=${phone}`);

    // 1. 根据 phone 查找 CRM 员工
    const staffUser = await this.usersService.findByPhone(phone);
    if (!staffUser) {
      this.logger.warn(`[褓贝云函数] 未找到手机号对应的员工: ${phone}`);
      throw new BadRequestException(`未找到手机号 ${phone} 对应的员工账号`);
    }

    const userId = (staffUser as any)._id?.toString();
    const userRole = this.mapRoleToChineseRole((staffUser as any).role || '');

    // 2. 构造查询参数
    const query: CustomerQueryDto = {
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 100),
      search,
      contractStatus: contractStatus as any,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    // 3. 普通员工只能查看分配给自己的客户
    if (userRole === '普通员工') {
      query.assignedTo = userId;
    }

    const result = await this.customersService.findAll(query, userId);

    // 4. 只返回褓贝小程序需要的字段
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

    return {
      success: true,
      message: '客户列表获取成功',
      data: {
        customers,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasMore: result.page * result.limit < result.total,
      },
      timestamp: Date.now(),
    };
  }
}
