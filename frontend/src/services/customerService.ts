import { apiService } from './api';
import {
  Customer,
  CreateCustomerData,
  CustomerQuery,
  CustomerListResponse,
  CustomerStatistics,
  PublicPoolLog,
  PublicPoolStatistics
} from '../types/customer.types';

export const customerService = {
  // 获取客户列表
  async getCustomers(query?: CustomerQuery): Promise<CustomerListResponse> {
    const response = await apiService.get('/api/customers', query);
    return response.data;
  },

  // 创建客户
  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    const response = await apiService.post('/api/customers', data);
    return response.data;
  },

  // 获取客户详情（通过ID）
  async getCustomerById(id: string): Promise<Customer> {
    const response = await apiService.get(`/api/customers/${id}`);
    return response.data;
  },

  // 获取客户详情（通过客户ID）
  async getCustomerByCustomerId(customerId: string): Promise<Customer> {
    const response = await apiService.get(`/api/customers/customer-id/${customerId}`);
    return response.data;
  },

  // 更新客户信息
  async updateCustomer(id: string, data: Partial<CreateCustomerData>): Promise<Customer> {
    const response = await apiService.patch(`/api/customers/${id}`, data);
    return response.data;
  },

  // 删除客户
  async deleteCustomer(id: string): Promise<void> {
    await apiService.delete(`/api/customers/${id}`);
  },


  // 分配客户归属人
  async assignCustomer(id: string, assignedTo: string, assignmentReason?: string): Promise<Customer> {
    const response = await apiService.patch(`/api/customers/${id}/assign`, { assignedTo, assignmentReason });
    return response.data;
  },

  // 批量分配客户
  async batchAssignCustomers(customerIds: string[], assignedTo: string, assignmentReason?: string): Promise<{
    success: number;
    failed: number;
    errors: Array<{ customerId: string; error: string }>;
  }> {
    const response = await apiService.post('/api/customers/batch-assign', {
      customerIds,
      assignedTo,
      assignmentReason,
    });
    return response.data;
  },

  // 可分配的用户列表
  async getAssignableUsers(): Promise<Array<{ _id: string; name: string; username: string; role: string; department?: string }>> {
    const response = await apiService.get('/api/customers/assignable-users');
    return response.data;
  },

  // 获取客户分配历史
  async getAssignmentLogs(id: string): Promise<any[]> {
    const response = await apiService.get(`/api/customers/${id}/assignment-logs`);
    return response.data;
  },

  // 获取客户统计信息
  async getStatistics(): Promise<CustomerStatistics> {
    const response = await apiService.get('/api/customers/statistics');
    return response.data;
  },

  // ==================== 公海相关接口 ====================

  // 获取公海客户列表
  async getPublicPoolCustomers(query?: any): Promise<CustomerListResponse> {
    const response = await apiService.get('/api/customers/public-pool', query);
    return response.data;
  },

  // 员工领取客户
  async claimCustomers(customerIds: string[]): Promise<{ success: number; failed: number; errors: any[] }> {
    const response = await apiService.post('/api/customers/public-pool/claim', { customerIds });
    return response.data;
  },

  // 管理员从公海分配客户
  async assignFromPool(customerIds: string[], assignedTo: string, reason?: string): Promise<{ success: number; failed: number; errors: any[] }> {
    const response = await apiService.post('/api/customers/public-pool/assign', { customerIds, assignedTo, reason });
    return response.data;
  },

  // 释放客户到公海
  async releaseToPool(customerId: string, reason: string): Promise<Customer> {
    const response = await apiService.post(`/api/customers/${customerId}/release-to-pool`, { reason });
    return response.data;
  },

  // 批量释放到公海
  async batchReleaseToPool(customerIds: string[], reason: string): Promise<{ success: number; failed: number; errors: any[] }> {
    const response = await apiService.post('/api/customers/batch-release-to-pool', { customerIds, reason });
    return response.data;
  },

  // 获取公海统计数据
  async getPublicPoolStatistics(): Promise<PublicPoolStatistics> {
    const response = await apiService.get('/api/customers/public-pool/statistics');
    return response.data;
  },

  // 获取客户的公海历史记录
  async getPublicPoolLogs(customerId: string): Promise<PublicPoolLog[]> {
    const response = await apiService.get(`/api/customers/${customerId}/public-pool-logs`);
    return response.data;
  },

  // 获取用户当前持有的客户数量
  async getMyCustomerCount(): Promise<{ count: number; limit: number }> {
    const response = await apiService.get('/api/customers/my-customer-count');
    return response.data;
  },

  // 根据手机号获取客户地址
  async getAddressByPhone(phone: string): Promise<{ address: string | null }> {
    const response = await apiService.get(`/api/customers/address-by-phone/${phone}`);
    return response.data;
  },

  // 获取客户操作日志（仅管理员可用）
  async getOperationLogs(customerId: string): Promise<any[]> {
    const response = await apiService.get(`/api/customers/${customerId}/operation-logs`);
    return response.data;
  },

  // 🆕 同步客户线索等级为O类（当合同签约时调用）
  async syncLeadLevelToO(customerId: string): Promise<void> {
    await apiService.patch(`/api/customers/${customerId}/sync-lead-level-o`, {});
  },
};