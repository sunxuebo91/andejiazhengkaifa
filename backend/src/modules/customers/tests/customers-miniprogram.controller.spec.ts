import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from '../customers.controller';
import { CustomersService } from '../customers.service';
import { WeixinService } from '../../weixin/weixin.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ForbiddenException } from '@nestjs/common';
import { CustomerFollowUpType } from '../models/customer-follow-up.entity';

describe('CustomersController - Miniprogram APIs', () => {
  let controller: CustomersController;
  let customersService: CustomersService;
  let weixinService: WeixinService;

  const mockCustomersService = {
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    assignCustomer: jest.fn(),
    createFollowUp: jest.fn(),
    getFollowUps: jest.fn(),
    getAssignmentLogs: jest.fn(),
    getStatistics: jest.fn(),
  };

  const mockWeixinService = {
    recordCustomerAction: jest.fn(),
    sendStatusChangeNotification: jest.fn(),
  };

  const mockUser = {
    userId: 'user123',
    role: '普通员工',
    username: 'testuser',
    name: '测试用户'
  };

  const mockCustomer = {
    _id: 'customer123',
    name: '张三',
    phone: '13812345678',
    leadSource: '美团',
    contractStatus: '匹配中',
    assignedTo: 'user123',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
        {
          provide: WeixinService,
          useValue: mockWeixinService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(RolesGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<CustomersController>(CustomersController);
    customersService = module.get<CustomersService>(CustomersService);
    weixinService = module.get<WeixinService>(WeixinService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getListForMiniprogram', () => {
    it('应该成功获取客户列表', async () => {
      const mockResponse = {
        customers: [mockCustomer],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false
      };

      mockCustomersService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getListForMiniprogram(
        { page: 1, limit: 20 },
        { user: mockUser }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockCustomersService.findAll).toHaveBeenCalledWith(
        { page: 1, limit: 20, assignedTo: mockUser.userId },
        mockUser.userId
      );
    });

    it('应该对普通员工的数据进行脱敏处理', async () => {
      const customerWithSensitiveData = {
        ...mockCustomer,
        phone: '13812345678'
      };

      const mockResponse = {
        customers: [customerWithSensitiveData],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false
      };

      mockCustomersService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getListForMiniprogram(
        {},
        { user: mockUser }
      );

      // 验证数据脱敏 - 普通员工看自己的客户应该看到完整手机号
      expect(result.data.customers[0].phone).toBe('13812345678');
    });

    it('应该处理服务异常', async () => {
      mockCustomersService.findAll.mockRejectedValue(new Error('数据库连接失败'));

      const result = await controller.getListForMiniprogram(
        {},
        { user: mockUser }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('获取客户列表失败');
    });
  });

  describe('createForMiniprogram', () => {
    const createCustomerDto = {
      name: '李四',
      phone: '13987654321',
      leadSource: '抖音',
      contractStatus: '匹配中'
    };

    it('应该成功创建客户', async () => {
      const mockCreatedCustomer = {
        ...mockCustomer,
        ...createCustomerDto,
        _id: 'newcustomer123'
      };

      mockCustomersService.create.mockResolvedValue(mockCreatedCustomer);

      const result = await controller.createForMiniprogram(
        createCustomerDto,
        'test-key-123',
        'v1',
        'req-123',
        { user: mockUser }
      );

      expect(result.success).toBe(true);
      expect(result.data.customer).toEqual(mockCreatedCustomer);
      expect(mockCustomersService.create).toHaveBeenCalledWith(
        createCustomerDto,
        mockUser.userId
      );
    });

    it('应该处理重复手机号错误', async () => {
      const duplicateError = new Error('手机号已存在');
      duplicateError.name = 'DUPLICATE_PHONE';
      mockCustomersService.create.mockRejectedValue(duplicateError);

      const result = await controller.createForMiniprogram(
        createCustomerDto,
        undefined,
        undefined,
        undefined,
        { user: mockUser }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('DUPLICATE_PHONE');
    });

    it('应该记录幂等性键', async () => {
      const mockCreatedCustomer = {
        ...mockCustomer,
        ...createCustomerDto
      };

      mockCustomersService.create.mockResolvedValue(mockCreatedCustomer);

      const idempotencyKey = 'test-key-123';
      await controller.createForMiniprogram(
        createCustomerDto,
        idempotencyKey,
        'v1',
        'req-123',
        { user: mockUser }
      );

      // 验证幂等性键被正确处理
      expect(mockCustomersService.create).toHaveBeenCalled();
    });
  });

  describe('getOneForMiniprogram', () => {
    it('应该成功获取客户详情', async () => {
      mockCustomersService.findOne.mockResolvedValue(mockCustomer);

      const result = await controller.getOneForMiniprogram(
        'customer123',
        { user: mockUser }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('应该检查访问权限', async () => {
      const otherUserCustomer = {
        ...mockCustomer,
        assignedTo: 'otheruser123'
      };

      mockCustomersService.findOne.mockResolvedValue(otherUserCustomer);

      const result = await controller.getOneForMiniprogram(
        'customer123',
        { user: mockUser }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('FORBIDDEN');
    });
  });

  describe('updateForMiniprogram', () => {
    const updateData = {
      contractStatus: '已签约',
      remarks: '客户已确认服务'
    };

    it('应该成功更新客户信息', async () => {
      const updatedCustomer = {
        ...mockCustomer,
        ...updateData
      };

      mockCustomersService.findOne.mockResolvedValue(mockCustomer);
      mockCustomersService.update.mockResolvedValue(updatedCustomer);

      const result = await controller.updateForMiniprogram(
        'customer123',
        updateData,
        { user: mockUser }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('应该检查编辑权限', async () => {
      const otherUserCustomer = {
        ...mockCustomer,
        assignedTo: 'otheruser123'
      };

      mockCustomersService.findOne.mockResolvedValue(otherUserCustomer);

      const result = await controller.updateForMiniprogram(
        'customer123',
        updateData,
        { user: mockUser }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('FORBIDDEN');
    });
  });

  describe('assignForMiniprogram', () => {
    const assignData = {
      assignedTo: 'newuser123',
      assignmentReason: '客户要求更换负责人'
    };

    it('应该允许管理员分配客户', async () => {
      const adminUser = {
        ...mockUser,
        role: '系统管理员'
      };

      const assignedCustomer = {
        ...mockCustomer,
        assignedTo: assignData.assignedTo
      };

      mockCustomersService.assignCustomer.mockResolvedValue(assignedCustomer);

      const result = await controller.assignCustomerForMiniprogram(
        'customer123',
        assignData,
        { user: adminUser }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('应该允许经理分配客户', async () => {
      const managerUser = {
        ...mockUser,
        role: '经理'
      };

      const assignedCustomer = {
        ...mockCustomer,
        assignedTo: assignData.assignedTo
      };

      mockCustomersService.assignCustomer.mockResolvedValue(assignedCustomer);

      const result = await controller.assignCustomerForMiniprogram(
        'customer123',
        assignData,
        { user: managerUser }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('createFollowUpForMiniprogram', () => {
    const followUpData = {
      type: CustomerFollowUpType.PHONE,
      content: '与客户电话沟通，确认服务需求'
    };

    it('应该成功创建跟进记录', async () => {
      const mockFollowUp = {
        _id: 'followup123',
        customerId: 'customer123',
        ...followUpData,
        createdBy: mockUser.userId,
        createdAt: new Date()
      };

      mockCustomersService.findOne.mockResolvedValue(mockCustomer);
      mockCustomersService.createFollowUp.mockResolvedValue(mockFollowUp);

      const result = await controller.createFollowUpForMiniprogram(
        'customer123',
        followUpData,
        { user: mockUser }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFollowUp);
    });

    it('应该检查跟进权限', async () => {
      const otherUserCustomer = {
        ...mockCustomer,
        assignedTo: 'otheruser123'
      };

      mockCustomersService.findOne.mockResolvedValue(otherUserCustomer);

      const result = await controller.createFollowUpForMiniprogram(
        'customer123',
        followUpData,
        { user: mockUser }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('FORBIDDEN');
    });
  });

  describe('getStatisticsForMiniprogram', () => {
    it('应该为普通员工返回个人统计', async () => {
      const mockPersonalStats = {
        customers: [mockCustomer],
        total: 1
      };

      mockCustomersService.findAll.mockResolvedValue(mockPersonalStats);

      const result = await controller.getStatisticsForMiniprogram(
        { user: mockUser }
      );

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(1);
      expect(result.data.myCustomers).toBe(1);
    });

    it('应该为管理员返回全局统计', async () => {
      const adminUser = {
        ...mockUser,
        role: '系统管理员'
      };

      const mockGlobalStats = {
        total: 100,
        byContractStatus: {
          '已签约': 30,
          '匹配中': 50,
          '流失客户': 20
        }
      };

      const mockAllCustomers = {
        customers: [mockCustomer],
        total: 1
      };

      mockCustomersService.getStatistics.mockResolvedValue(mockGlobalStats);
      mockCustomersService.findAll.mockResolvedValue(mockAllCustomers);

      const result = await controller.getStatisticsForMiniprogram(
        { user: adminUser }
      );

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(100);
      expect(result.data.byContractStatus).toBeDefined();
      expect(result.data.byLeadSource).toBeDefined();
      expect(result.data.byServiceCategory).toBeDefined();
    });
  });

  describe('权限控制辅助方法', () => {
    it('canAccessCustomer 应该正确检查访问权限', () => {
      // 系统管理员可以访问所有客户
      const adminUser = { ...mockUser, role: '系统管理员' };
      expect(controller['canAccessCustomer'](mockCustomer, adminUser)).toBe(true);

      // 经理可以访问所有客户
      const managerUser = { ...mockUser, role: '经理' };
      expect(controller['canAccessCustomer'](mockCustomer, managerUser)).toBe(true);

      // 普通员工只能访问自己的客户
      expect(controller['canAccessCustomer'](mockCustomer, mockUser)).toBe(true);

      // 普通员工不能访问其他人的客户
      const otherUserCustomer = { ...mockCustomer, assignedTo: 'otheruser123' };
      expect(controller['canAccessCustomer'](otherUserCustomer, mockUser)).toBe(false);
    });

    it('sanitizeCustomerData 应该正确脱敏数据', () => {
      const customerWithSensitiveData = {
        ...mockCustomer,
        phone: '13812345678'
      };

      // 普通员工看自己的客户，不脱敏
      const result1 = controller['sanitizeCustomerData'](customerWithSensitiveData, mockUser);
      expect(result1.phone).toBe('13812345678');

      // 普通员工看其他人的客户，脱敏
      const otherUserCustomer = { ...customerWithSensitiveData, assignedTo: 'otheruser123' };
      const result2 = controller['sanitizeCustomerData'](otherUserCustomer, mockUser);
      expect(result2.phone).toBe('138****5678');

      // 管理员看任何客户，不脱敏
      const adminUser = { ...mockUser, role: '系统管理员' };
      const result3 = controller['sanitizeCustomerData'](otherUserCustomer, adminUser);
      expect(result3.phone).toBe('13812345678');
    });

    it('maskPhoneNumber 应该正确掩码手机号', () => {
      expect(controller['maskPhoneNumber']('13812345678')).toBe('138****5678');
      expect(controller['maskPhoneNumber']('1381234567')).toBe('138****4567');
      expect(controller['maskPhoneNumber']('138123456')).toBe('138123456'); // 长度不足，不掩码
      expect(controller['maskPhoneNumber']('')).toBe('');
      expect(controller['maskPhoneNumber'](null)).toBe('');
    });
  });

  describe('错误处理', () => {
    it('应该正确处理数据库连接错误', async () => {
      mockCustomersService.findAll.mockRejectedValue(new Error('Database connection failed'));

      const result = await controller.getListForMiniprogram(
        {},
        { user: mockUser }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('获取客户列表失败');
    });

    it('应该正确处理权限异常', async () => {
      const forbiddenError = new ForbiddenException('无权限访问');
      mockCustomersService.findOne.mockRejectedValue(forbiddenError);

      const result = await controller.getOneForMiniprogram(
        'customer123',
        { user: mockUser }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('FORBIDDEN');
    });
  });
});
