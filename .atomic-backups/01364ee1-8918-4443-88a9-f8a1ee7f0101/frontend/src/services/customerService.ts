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

  // 获取客户统计信息
  async getStatistics(): Promise<CustomerStatistics> {
    const response = await apiService.get('/api/customers/statistics');
    return response.data;
  },
}; 