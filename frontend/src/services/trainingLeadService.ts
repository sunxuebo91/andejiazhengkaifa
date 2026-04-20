import apiService from './api';
import {
  TrainingLead,
  TrainingLeadQuery,
  TrainingLeadListResponse,
  CreateTrainingLeadDto,
  UpdateTrainingLeadDto,
  TrainingLeadFollowUp,
  CreateTrainingLeadFollowUpDto,
  ShareTokenResponse
} from '../types/training-lead.types';

export const trainingLeadService = {
  /**
   * 获取培训线索列表
   */
  async getTrainingLeads(query?: TrainingLeadQuery): Promise<TrainingLeadListResponse> {
    const response = await apiService.get('/api/training-leads', query);
    return response.data;
  },

  /**
   * 创建培训线索
   */
  async createTrainingLead(data: CreateTrainingLeadDto): Promise<TrainingLead> {
    const response = await apiService.post('/api/training-leads', data);
    return response.data;
  },

  /**
   * 获取培训线索详情
   */
  async getTrainingLeadById(id: string): Promise<TrainingLead> {
    const response = await apiService.get(`/api/training-leads/${id}`);
    return response.data;
  },

  /**
   * 更新培训线索
   */
  async updateTrainingLead(id: string, data: UpdateTrainingLeadDto): Promise<TrainingLead> {
    const response = await apiService.patch(`/api/training-leads/${id}`, data);
    return response.data;
  },

  /**
   * 删除培训线索
   */
  async deleteTrainingLead(id: string): Promise<void> {
    await apiService.delete(`/api/training-leads/${id}`);
  },

  /**
   * 添加跟进记录
   */
  async createFollowUp(
    leadId: string,
    data: CreateTrainingLeadFollowUpDto
  ): Promise<TrainingLeadFollowUp> {
    const response = await apiService.post(`/api/training-leads/${leadId}/follow-ups`, data);
    return response.data;
  },

  /**
   * 获取跟进记录列表
   */
  async getFollowUps(leadId: string): Promise<TrainingLeadFollowUp[]> {
    const response = await apiService.get(`/api/training-leads/${leadId}/follow-ups`);
    return response.data;
  },

  /**
   * 生成分享链接和二维码
   */
  async generateShareToken(): Promise<ShareTokenResponse> {
    const response = await apiService.post('/api/training-leads/generate-share-token');
    return response.data;
  },

  /**
   * 公开表单提交
   */
  async submitPublicForm(token: string, data: CreateTrainingLeadDto): Promise<TrainingLead> {
    const response = await apiService.post('/api/training-leads/public/submit', { token, data });
    return response.data;
  },

  /**
   * AI识别图片中的职培线索（返回预览数据，不写入数据库）
   */
  async aiParseImage(file: File): Promise<any[]> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiService.upload('/api/training-leads/ai-preview-image', formData, 'POST', { timeout: 180000 });
    return response.data || [];
  },

  /**
   * AI识别Excel中的职培线索（自动映射字段，返回预览，不写入数据库）
   */
  async aiParseExcel(file: File): Promise<any[]> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiService.upload('/api/training-leads/ai-preview-excel', formData, 'POST', { timeout: 180000 });
    return response.data || [];
  },

  /**
   * 批量创建职培线索（确认AI预览后调用）
   */
  async bulkCreateLeads(leads: any[]): Promise<{ success: number; fail: number; errors: string[] }> {
    const response = await apiService.post('/api/training-leads/bulk-create', { leads });
    return response.data;
  },

  /**
   * 批量查重手机号
   */
  async checkDuplicates(phones: string[]): Promise<{ duplicatePhones: string[] }> {
    const response = await apiService.post('/api/training-leads/check-duplicates', { phones });
    return response.data;
  },

  /**
   * 释放线索到公海池
   */
  async releaseLead(id: string): Promise<TrainingLead> {
    const response = await apiService.post(`/api/training-leads/${id}/release`);
    return response.data;
  },

  /**
   * 从公海池认领线索
   */
  async claimLead(id: string): Promise<TrainingLead> {
    const response = await apiService.post(`/api/training-leads/${id}/claim`);
    return response.data;
  },

  /**
   * 获取学员线索操作日志（仅管理员可访问）
   */
  async getOperationLogs(id: string): Promise<any[]> {
    const response = await apiService.get(`/api/training-leads/${id}/operation-logs`);
    return response.data;
  },
};

export default trainingLeadService;

