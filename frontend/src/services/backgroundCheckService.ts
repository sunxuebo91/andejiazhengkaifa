import apiService, { api } from './api';
import { BackgroundCheck, CreateReportData } from '../types/background-check.types';

export const backgroundCheckService = {
  async prepareAuth(workerName: string, esignContractNo?: string): Promise<{ stuffId: string; imageUrl: string; esignContractNo: string }> {
    const response = await apiService.post('/api/zmdb/prepare-auth', { workerName, esignContractNo });
    return response.data;
  },

  async createReport(data: CreateReportData): Promise<BackgroundCheck> {
    const payload = {
      stuffId: data.stuffId,
      authStuffUrl: data.imageUrl,
      esignContractNo: data.esignContractNo,
      name: data.name,
      mobile: data.mobile,
      idNo: data.idNo,
      position: data.position,
      packageType: data.packageType || '1', // 套餐类型，默认标准版
    };
    const response = await apiService.post('/api/zmdb/reports', payload);
    return response.data;
  },

  async getReports(params: { page?: number; limit?: number } = {}): Promise<{
    data: BackgroundCheck[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await apiService.get<any>('/api/zmdb/reports', params);
    return response as any;
  },

  async cancelReport(id: string): Promise<void> {
    await apiService.delete(`/api/zmdb/reports/${id}/cancel`);
  },

  async downloadReport(reportId: string): Promise<Blob> {
    const token = localStorage.getItem('token');
    const response = await api.get(`/api/zmdb/reports/${reportId}/download`, {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  async getByIdNo(idNo: string): Promise<BackgroundCheck | null> {
    const response = await apiService.get<any>(`/api/zmdb/reports/by-idno/${idNo}`);
    return response.data;
  },
};
