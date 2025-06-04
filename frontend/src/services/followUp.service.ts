import apiService, { ApiResponse } from './api';

export interface FollowUpType {
  PHONE: 'phone';
  WECHAT: 'wechat';
  VISIT: 'visit';
  INTERVIEW: 'interview';
  SIGNED: 'signed';
  OTHER: 'other';
}

export interface CreateFollowUpDto {
  resumeId: string;
  type: keyof FollowUpType;
  content: string;
}

export interface FollowUpRecord {
  _id: string;
  resumeId: {
    _id: string;
    name: string;
    phone: string;
  };
  type: keyof FollowUpType;
  content: string;
  createdBy: {
    _id: string;
    name: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpListResponse {
  success: boolean;
  data: {
    items: FollowUpRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  message?: string;
}

// 创建跟进记录
export const createFollowUp = async (data: CreateFollowUpDto): Promise<FollowUpRecord> => {
  const response = await apiService.post<FollowUpRecord>('/api/follow-ups', data);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || '创建跟进记录失败');
};

// 获取简历的跟进记录
export const getFollowUpsByResumeId = async (
  resumeId: string, 
  page: number = 1, 
  pageSize: number = 10
): Promise<ApiResponse<FollowUpListResponse['data']>> => {
  const response = await apiService.get<FollowUpListResponse['data']>(`/api/follow-ups/resume/${resumeId}`, {
    page,
    pageSize
  });
  if (response.success && response.data) {
    return response;
  }
  throw new Error(response.message || '获取跟进记录失败');
};

// 获取当前用户的跟进记录
export const getCurrentUserFollowUps = async (
  page: number = 1, 
  pageSize: number = 10
): Promise<FollowUpListResponse> => {
  const response = await apiService.get<FollowUpListResponse>('/api/follow-ups/user', {
    page,
    pageSize
  });
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || '获取用户跟进记录失败');
};

// 获取所有跟进记录（仅管理员）
export const getAllFollowUps = async (
  page: number = 1, 
  pageSize: number = 10
): Promise<FollowUpListResponse> => {
  const response = await apiService.get<FollowUpListResponse>('/api/follow-ups/all', {
    page,
    pageSize
  });
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || '获取所有跟进记录失败');
};

// 获取最近的跟进记录
export const getRecentFollowUps = async (limit: number = 5): Promise<FollowUpRecord[]> => {
  const response = await apiService.get<FollowUpRecord[]>('/api/follow-ups/recent', {
    limit
  });
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || '获取最近跟进记录失败');
};

// 删除跟进记录
export const deleteFollowUp = async (id: string): Promise<void> => {
  const response = await apiService.delete(`/api/follow-ups/${id}`);
  if (!response.success) {
    throw new Error(response.message || '删除跟进记录失败');
  }
};

// 跟进类型映射
export const followUpTypeMap = {
  phone: '电话沟通',
  wechat: '微信沟通',
  visit: '到店沟通',
  interview: '面试沟通',
  signed: '已签单',
  other: '其他'
} as const; 