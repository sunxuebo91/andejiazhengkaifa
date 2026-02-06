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
  }
};

export default trainingLeadService;

