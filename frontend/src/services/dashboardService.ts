import apiService from './api';
import { DashboardStats, CustomerBusinessMetrics, FinancialMetrics, EfficiencyMetrics } from '../types/dashboard.types';

export interface DashboardResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

class DashboardService {
  /**
   * 获取完整驾驶舱统计数据
   */
  async getDashboardStats(params?: { startDate?: string; endDate?: string }): Promise<DashboardStats> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.startDate) {
        queryParams.append('startDate', params.startDate);
      }
      if (params?.endDate) {
        queryParams.append('endDate', params.endDate);
      }
      
      const url = `/api/dashboard/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiService.get(url) as DashboardResponse<DashboardStats>;
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || '获取驾驶舱统计数据失败');
      }
    } catch (error: any) {
      console.error('获取驾驶舱统计数据失败:', error);
      throw new Error(error.response?.data?.message || error.message || '获取驾驶舱统计数据失败');
    }
  }

  /**
   * 获取客户业务指标
   */
  async getCustomerBusinessMetrics(): Promise<CustomerBusinessMetrics> {
    try {
      const response = await apiService.get('/api/dashboard/customer-business') as DashboardResponse<CustomerBusinessMetrics>;
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || '获取客户业务指标失败');
      }
    } catch (error: any) {
      console.error('获取客户业务指标失败:', error);
      throw new Error(error.response?.data?.message || error.message || '获取客户业务指标失败');
    }
  }

  /**
   * 获取财务营收指标
   */
  async getFinancialMetrics(): Promise<FinancialMetrics> {
    try {
      const response = await apiService.get('/api/dashboard/financial') as DashboardResponse<FinancialMetrics>;
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || '获取财务营收指标失败');
      }
    } catch (error: any) {
      console.error('获取财务营收指标失败:', error);
      throw new Error(error.response?.data?.message || error.message || '获取财务营收指标失败');
    }
  }

  /**
   * 获取运营效率指标
   */
  async getEfficiencyMetrics(): Promise<EfficiencyMetrics> {
    try {
      const response = await apiService.get('/api/dashboard/efficiency') as DashboardResponse<EfficiencyMetrics>;
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || '获取运营效率指标失败');
      }
    } catch (error: any) {
      console.error('获取运营效率指标失败:', error);
      throw new Error(error.response?.data?.message || error.message || '获取运营效率指标失败');
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiService.get<DashboardResponse>('/api/dashboard/health');
      return response.success;
    } catch (error) {
      console.error('Dashboard健康检查失败:', error);
      return false;
    }
  }
}

export const dashboardService = new DashboardService();
export default dashboardService; 