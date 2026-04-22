import apiService from './api';
import { Contract } from '../types/contract.types';

/**
 * 职培订单 CRM 端服务
 * 对应后端 /api/training-orders，与家政合同接口物理隔离，
 * 返回结构与 /api/contracts 保持一致，字段沿用 Contract 模型。
 */
export const trainingOrderService = {
  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{
    contracts: Contract[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await apiService.get('/api/training-orders', params);
    return response.data;
  },

  async detail(id: string): Promise<{ contract: Contract; lead: any | null }> {
    const response = await apiService.get(`/api/training-orders/${id}`);
    return response.data;
  },

  /** 标记已毕业（证书申报） */
  async markGraduated(id: string): Promise<Contract> {
    const response = await apiService.post(`/api/training-orders/${id}/graduate`);
    return response.data;
  },

  /** 标记已退款（扣减报课金额） */
  async markRefunded(id: string, refundAmount: number): Promise<Contract> {
    const response = await apiService.post(`/api/training-orders/${id}/refund`, { refundAmount });
    return response.data;
  },
};
