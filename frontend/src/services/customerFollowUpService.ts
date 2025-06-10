import { apiService } from './api';
import { 
  CustomerFollowUp, 
  CreateCustomerFollowUpData
} from '../types/customer-follow-up.types';

export const customerFollowUpService = {
  // 创建跟进记录
  async createFollowUp(customerId: string, data: CreateCustomerFollowUpData): Promise<CustomerFollowUp> {
    const response = await apiService.post(`/api/customers/${customerId}/follow-ups`, data);
    return response.data.data;
  },

  // 获取客户跟进记录
  async getFollowUps(customerId: string): Promise<CustomerFollowUp[]> {
    const response = await apiService.get(`/api/customers/${customerId}/follow-ups`);
    return response.data.data;
  },
}; 