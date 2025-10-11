/**
 * 小程序客户服务测试用例
 * 文件: frontend/src/services/__tests__/miniprogramCustomerService.test.js
 */

// Mock API服务
const mockApiService = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

// Mock 小程序客户服务
jest.mock('../api', () => ({
  apiService: mockApiService
}));

const miniprogramCustomerService = require('../miniprogramCustomerService');

describe('MiniprogramCustomerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomers', () => {
    it('应该成功获取客户列表', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            customers: [
              {
                _id: 'customer123',
                name: '张三',
                phone: '138****5678',
                leadSource: '美团',
                contractStatus: '匹配中'
              }
            ],
            total: 1,
            page: 1,
            limit: 20,
            hasMore: false
          }
        }
      };

      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await miniprogramCustomerService.getCustomers({
        page: 1,
        limit: 20,
        search: '张三'
      });

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/customers/miniprogram/list',
        { page: 1, limit: 20, search: '张三' }
      );
      expect(result.customers).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('应该处理API错误', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            message: '获取客户列表失败'
          }
        }
      };

      mockApiService.get.mockRejectedValue(mockError);

      await expect(miniprogramCustomerService.getCustomers()).rejects.toThrow('获取客户列表失败');
    });

    it('应该处理网络错误', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network Error'));

      await expect(miniprogramCustomerService.getCustomers()).rejects.toThrow('网络错误，请重试');
    });
  });

  describe('createCustomer', () => {
    const customerData = {
      name: '李四',
      phone: '13987654321',
      leadSource: '抖音',
      contractStatus: '匹配中'
    };

    it('应该成功创建客户', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'newcustomer123',
            customerId: 'CUS20240101001',
            createdAt: '2024-01-01T10:00:00.000Z',
            customer: {
              _id: 'newcustomer123',
              ...customerData
            },
            action: 'CREATED'
          }
        }
      };

      mockApiService.post.mockResolvedValue(mockResponse);

      const result = await miniprogramCustomerService.createCustomer(customerData, {
        idempotencyKey: 'test-key-123',
        apiVersion: 'v1',
        requestId: 'req-123'
      });

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/customers/miniprogram/create',
        customerData,
        {
          headers: {
            'Idempotency-Key': 'test-key-123',
            'api-version': 'v1',
            'x-request-id': 'req-123'
          }
        }
      );
      expect(result.id).toBe('newcustomer123');
      expect(result.action).toBe('CREATED');
    });

    it('应该处理重复手机号错误', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            message: '该手机号已存在客户记录',
            error: 'DUPLICATE_PHONE'
          }
        }
      };

      mockApiService.post.mockRejectedValue(mockError);

      await expect(miniprogramCustomerService.createCustomer(customerData))
        .rejects.toThrow('该手机号已存在客户记录');
    });

    it('应该处理幂等性键', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'customer123',
            action: 'UPDATED' // 幂等性返回已存在的记录
          }
        }
      };

      mockApiService.post.mockResolvedValue(mockResponse);

      const result = await miniprogramCustomerService.createCustomer(customerData, {
        idempotencyKey: 'duplicate-key'
      });

      expect(result.action).toBe('UPDATED');
    });
  });

  describe('getCustomerById', () => {
    it('应该成功获取客户详情', async () => {
      const mockCustomer = {
        _id: 'customer123',
        name: '张三',
        phone: '13812345678',
        leadSource: '美团',
        contractStatus: '已签约'
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockCustomer
        }
      };

      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await miniprogramCustomerService.getCustomerById('customer123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/customers/miniprogram/customer123');
      expect(result).toEqual(mockCustomer);
    });

    it('应该处理权限错误', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            message: '无权限访问此客户信息',
            error: 'FORBIDDEN'
          }
        }
      };

      mockApiService.get.mockRejectedValue(mockError);

      await expect(miniprogramCustomerService.getCustomerById('customer123'))
        .rejects.toThrow('无权限访问此客户信息');
    });
  });

  describe('updateCustomer', () => {
    const updateData = {
      contractStatus: '已签约',
      remarks: '客户已确认服务'
    };

    it('应该成功更新客户信息', async () => {
      const mockUpdatedCustomer = {
        _id: 'customer123',
        name: '张三',
        ...updateData
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockUpdatedCustomer
        }
      };

      mockApiService.patch.mockResolvedValue(mockResponse);

      const result = await miniprogramCustomerService.updateCustomer('customer123', updateData);

      expect(mockApiService.patch).toHaveBeenCalledWith(
        '/api/customers/miniprogram/customer123',
        updateData
      );
      expect(result).toEqual(mockUpdatedCustomer);
    });

    it('应该处理权限错误', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            message: '无权限修改此客户信息',
            error: 'FORBIDDEN'
          }
        }
      };

      mockApiService.patch.mockRejectedValue(mockError);

      await expect(miniprogramCustomerService.updateCustomer('customer123', updateData))
        .rejects.toThrow('无权限修改此客户信息');
    });
  });

  describe('assignCustomer', () => {
    it('应该成功分配客户', async () => {
      const mockAssignedCustomer = {
        _id: 'customer123',
        name: '张三',
        assignedTo: 'newuser123'
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockAssignedCustomer
        }
      };

      mockApiService.patch.mockResolvedValue(mockResponse);

      const result = await miniprogramCustomerService.assignCustomer(
        'customer123',
        'newuser123',
        '客户要求更换负责人'
      );

      expect(mockApiService.patch).toHaveBeenCalledWith(
        '/api/customers/miniprogram/customer123/assign',
        {
          assignedTo: 'newuser123',
          assignmentReason: '客户要求更换负责人'
        }
      );
      expect(result).toEqual(mockAssignedCustomer);
    });
  });

  describe('createFollowUp', () => {
    const followUpData = {
      type: 'phone',
      content: '与客户电话沟通，确认服务需求'
    };

    it('应该成功创建跟进记录', async () => {
      const mockFollowUp = {
        _id: 'followup123',
        customerId: 'customer123',
        ...followUpData,
        createdAt: '2024-01-01T10:00:00.000Z'
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockFollowUp
        }
      };

      mockApiService.post.mockResolvedValue(mockResponse);

      const result = await miniprogramCustomerService.createFollowUp('customer123', followUpData);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/customers/miniprogram/customer123/follow-ups',
        followUpData
      );
      expect(result).toEqual(mockFollowUp);
    });

    it('应该处理权限错误', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            message: '无权限跟进此客户',
            error: 'FORBIDDEN'
          }
        }
      };

      mockApiService.post.mockRejectedValue(mockError);

      await expect(miniprogramCustomerService.createFollowUp('customer123', followUpData))
        .rejects.toThrow('无权限跟进此客户');
    });
  });

  describe('getStatistics', () => {
    it('应该成功获取统计信息', async () => {
      const mockStats = {
        total: 100,
        byContractStatus: {
          '已签约': 30,
          '匹配中': 50,
          '流失客户': 20
        }
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockStats
        }
      };

      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await miniprogramCustomerService.getStatistics();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/customers/miniprogram/statistics');
      expect(result).toEqual(mockStats);
    });
  });

  describe('工具方法', () => {
    it('generateIdempotencyKey 应该生成唯一的幂等性键', () => {
      const key1 = miniprogramCustomerService.generateIdempotencyKey();
      const key2 = miniprogramCustomerService.generateIdempotencyKey();

      expect(key1).toMatch(/^miniprogram_\d+_[a-z0-9]+$/);
      expect(key2).toMatch(/^miniprogram_\d+_[a-z0-9]+$/);
      expect(key1).not.toBe(key2);
    });

    it('generateRequestId 应该生成唯一的请求ID', () => {
      const id1 = miniprogramCustomerService.generateRequestId();
      const id2 = miniprogramCustomerService.generateRequestId();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
