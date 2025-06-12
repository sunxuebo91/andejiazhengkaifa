import apiService from './api';
import { Contract, CreateContractData, Worker } from '../types/contract.types';

export const contractService = {
  // 创建合同
  async createContract(data: CreateContractData): Promise<Contract> {
    const response = await apiService.post('/api/contracts', data);
    return response.data;
  },

  // 获取合同列表
  async getContracts(params: {
    page?: number;
    limit?: number;
    search?: string;
    contractType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    contracts: Contract[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await apiService.get('/api/contracts', params);
    return response.data;
  },

  // 根据ID获取合同详情
  async getContractById(id: string): Promise<Contract> {
    const response = await apiService.get(`/api/contracts/${id}`);
    return response.data;
  },

  // 根据合同编号获取合同
  async getContractByNumber(contractNumber: string): Promise<Contract> {
    const response = await apiService.get(`/api/contracts/number/${contractNumber}`);
    return response.data;
  },

  // 根据客户ID获取合同列表
  async getContractsByCustomerId(customerId: string): Promise<Contract[]> {
    const response = await apiService.get(`/api/contracts/customer/${customerId}`);
    return response.data;
  },

  // 根据服务人员ID获取合同列表
  async getContractsByWorkerId(workerId: string): Promise<Contract[]> {
    const response = await apiService.get(`/api/contracts/worker/${workerId}`);
    return response.data;
  },

  // 更新合同
  async updateContract(id: string, data: Partial<CreateContractData>): Promise<Contract> {
    const response = await apiService.put(`/api/contracts/${id}`, data);
    return response.data;
  },

  // 删除合同
  async deleteContract(id: string): Promise<void> {
    await apiService.delete(`/api/contracts/${id}`);
  },

  // 获取统计信息
  async getStatistics(): Promise<{
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    byContractType: Record<string, number>;
    thisMonth: number;
    thisYear: number;
  }> {
    const response = await apiService.get('/api/contracts/statistics');
    return response.data;
  },

  // 搜索服务人员
  async searchWorkers(phone?: string, name?: string, limit: number = 10): Promise<Worker[]> {
    const params: any = { limit };
    if (phone) {
      params.phone = phone;
    }
    if (name) {
      params.name = name;
    }
    
    const response = await apiService.get('/api/resumes/search-workers', params);
    return response.data;
  },
}; 