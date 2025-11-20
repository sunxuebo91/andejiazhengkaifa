import { apiService } from './api';
import {
  Customer,
  CreateCustomerData,
  CustomerQuery,
  CustomerListResponse,
  CustomerStatistics
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
};