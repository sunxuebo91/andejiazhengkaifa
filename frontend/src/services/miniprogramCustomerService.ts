import { apiService } from './api';
import {
  Customer,
  CreateCustomerData,
  CustomerQuery,
  CustomerListResponse,
  CustomerStatistics
} from '../types/customer.types';

// 小程序专用的API响应接口
export interface MiniprogramApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: number;
}

// 小程序客户列表响应接口
export interface MiniprogramCustomerListResponse extends CustomerListResponse {
  hasMore: boolean; // 小程序需要的分页信息
}

// 小程序创建客户响应接口
export interface MiniprogramCreateCustomerResponse {
  id: string;
  customerId: string;
  createdAt: string;
  customer: Customer;
  action: 'CREATED' | 'UPDATED';
}

// 小程序统计信息接口
export interface MiniprogramCustomerStatistics {
  total: number;
  myCustomers?: number; // 普通员工专用
  byContractStatus: Record<string, number>;
  byLeadSource?: Record<string, number>;
  byServiceCategory?: Record<string, number>;
}

// 客户跟进记录接口
export interface CustomerFollowUp {
  _id: string;
  customerId: string;
  type: 'phone' | 'wechat' | 'visit' | 'other';
  content: string;
  createdBy: string;
  createdByUser?: { name: string; username: string };
  createdAt: string;
  updatedAt: string;
}

// 客户分配历史接口
export interface CustomerAssignmentLog {
  _id: string;
  customerId: string;
  oldAssignedTo?: string;
  newAssignedTo: string;
  assignedBy: string;
  assignedAt: string;
  reason?: string;
  oldAssignedToUser?: { name: string; username: string };
  newAssignedToUser?: { name: string; username: string };
  assignedByUser?: { name: string; username: string };
}

/**
 * 小程序专用客户管理服务
 * 包含权限控制、数据脱敏、错误处理等功能
 */
export const miniprogramCustomerService = {
  /**
   * 获取客户列表（支持权限控制和数据脱敏）
   */
  async getCustomers(query?: CustomerQuery): Promise<MiniprogramCustomerListResponse> {
    try {
      const response = await apiService.get<MiniprogramApiResponse<MiniprogramCustomerListResponse>>(
        '/api/customers/miniprogram/list', 
        query
      );
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || '获取客户列表失败');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('获取客户列表失败:', error);
      throw new Error(error.message || '网络错误，请重试');
    }
  },

  /**
   * 创建客户（支持幂等性）
   */
  async createCustomer(
    data: CreateCustomerData, 
    options?: {
      idempotencyKey?: string;
      apiVersion?: string;
      requestId?: string;
    }
  ): Promise<MiniprogramCreateCustomerResponse> {
    try {
      const headers: Record<string, string> = {};
      
      if (options?.idempotencyKey) {
        headers['Idempotency-Key'] = options.idempotencyKey;
      }
      if (options?.apiVersion) {
        headers['api-version'] = options.apiVersion;
      }
      if (options?.requestId) {
        headers['x-request-id'] = options.requestId;
      }
      
      const response = await apiService.post<MiniprogramApiResponse<MiniprogramCreateCustomerResponse>>(
        '/api/customers/miniprogram/create',
        data,
        { headers }
      );
      
      if (!response.data?.success) {
        const errorCode = response.data?.error;
        if (errorCode === 'DUPLICATE_PHONE') {
          throw new Error('该手机号已存在客户记录');
        }
        throw new Error(response.data?.message || '创建客户失败');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('创建客户失败:', error);
      throw new Error(error.message || '网络错误，请重试');
    }
  },

  /**
   * 获取客户详情（权限控制）
   */
  async getCustomerById(id: string): Promise<Customer> {
    try {
      const response = await apiService.get<MiniprogramApiResponse<Customer>>(
        `/api/customers/miniprogram/${id}`
      );
      
      if (!response.data?.success) {
        const errorCode = response.data?.error;
        if (errorCode === 'FORBIDDEN') {
          throw new Error('无权限访问此客户信息');
        }
        throw new Error(response.data?.message || '获取客户详情失败');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('获取客户详情失败:', error);
      throw new Error(error.message || '网络错误，请重试');
    }
  },

  /**
   * 更新客户信息（权限控制）
   */
  async updateCustomer(id: string, data: Partial<CreateCustomerData>): Promise<Customer> {
    try {
      const response = await apiService.patch<MiniprogramApiResponse<Customer>>(
        `/api/customers/miniprogram/${id}`,
        data
      );
      
      if (!response.data?.success) {
        const errorCode = response.data?.error;
        if (errorCode === 'FORBIDDEN') {
          throw new Error('无权限修改此客户信息');
        }
        throw new Error(response.data?.message || '更新客户信息失败');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('更新客户信息失败:', error);
      throw new Error(error.message || '网络错误，请重试');
    }
  },

  /**
   * 分配客户（仅管理员和经理）
   */
  async assignCustomer(
    id: string, 
    assignedTo: string, 
    assignmentReason?: string
  ): Promise<Customer> {
    try {
      const response = await apiService.patch<MiniprogramApiResponse<Customer>>(
        `/api/customers/miniprogram/${id}/assign`,
        { assignedTo, assignmentReason }
      );
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || '客户分配失败');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('客户分配失败:', error);
      throw new Error(error.message || '网络错误，请重试');
    }
  },

  /**
   * 创建客户跟进记录（权限控制）
   */
  async createFollowUp(
    customerId: string,
    data: {
      type: 'phone' | 'wechat' | 'visit' | 'other';
      content: string;
    }
  ): Promise<CustomerFollowUp> {
    try {
      const response = await apiService.post<MiniprogramApiResponse<CustomerFollowUp>>(
        `/api/customers/miniprogram/${customerId}/follow-ups`,
        data
      );
      
      if (!response.data?.success) {
        const errorCode = response.data?.error;
        if (errorCode === 'FORBIDDEN') {
          throw new Error('无权限跟进此客户');
        }
        throw new Error(response.data?.message || '创建跟进记录失败');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('创建跟进记录失败:', error);
      throw new Error(error.message || '网络错误，请重试');
    }
  },

  /**
   * 获取客户跟进记录（权限控制）
   */
  async getFollowUps(customerId: string): Promise<CustomerFollowUp[]> {
    try {
      const response = await apiService.get<MiniprogramApiResponse<CustomerFollowUp[]>>(
        `/api/customers/miniprogram/${customerId}/follow-ups`
      );
      
      if (!response.data?.success) {
        const errorCode = response.data?.error;
        if (errorCode === 'FORBIDDEN') {
          throw new Error('无权限查看此客户的跟进记录');
        }
        throw new Error(response.data?.message || '获取跟进记录失败');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('获取跟进记录失败:', error);
      throw new Error(error.message || '网络错误，请重试');
    }
  },

  /**
   * 获取客户分配历史（仅管理员和经理）
   */
  async getAssignmentLogs(customerId: string): Promise<CustomerAssignmentLog[]> {
    try {
      const response = await apiService.get<MiniprogramApiResponse<CustomerAssignmentLog[]>>(
        `/api/customers/miniprogram/${customerId}/assignment-logs`
      );
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || '获取分配历史失败');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('获取分配历史失败:', error);
      throw new Error(error.message || '网络错误，请重试');
    }
  },

  /**
   * 获取客户统计信息（基于角色权限）
   */
  async getStatistics(): Promise<MiniprogramCustomerStatistics> {
    try {
      const response = await apiService.get<MiniprogramApiResponse<MiniprogramCustomerStatistics>>(
        '/api/customers/miniprogram/statistics'
      );
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || '获取统计信息失败');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('获取统计信息失败:', error);
      throw new Error(error.message || '网络错误，请重试');
    }
  },

  /**
   * 生成幂等性键
   */
  generateIdempotencyKey(): string {
    return `miniprogram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * 生成请求ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
};

export default miniprogramCustomerService;
