import api from './api';

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
  items: FollowUpRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 创建跟进记录
export const createFollowUp = async (data: CreateFollowUpDto): Promise<FollowUpRecord> => {
  const response = await api.post('/follow-ups', data);
  return response.data;
};

// 获取简历的跟进记录
export const getFollowUpsByResumeId = async (
  resumeId: string, 
  page: number = 1, 
  pageSize: number = 10
): Promise<FollowUpListResponse> => {
  const response = await api.get(`/follow-ups/resume/${resumeId}`, {
    params: { page, pageSize }
  });
  return response.data;
};

// 获取当前用户的跟进记录
export const getCurrentUserFollowUps = async (
  page: number = 1, 
  pageSize: number = 10
): Promise<FollowUpListResponse> => {
  const response = await api.get('/follow-ups/user', {
    params: { page, pageSize }
  });
  return response.data;
};

// 获取所有跟进记录（仅管理员）
export const getAllFollowUps = async (
  page: number = 1, 
  pageSize: number = 10
): Promise<FollowUpListResponse> => {
  const response = await api.get('/follow-ups/all', {
    params: { page, pageSize }
  });
  return response.data;
};

// 获取最近的跟进记录
export const getRecentFollowUps = async (limit: number = 5): Promise<FollowUpRecord[]> => {
  const response = await api.get('/follow-ups/recent', {
    params: { limit }
  });
  return response.data;
};

// 删除跟进记录
export const deleteFollowUp = async (id: string): Promise<void> => {
  await api.delete(`/follow-ups/${id}`);
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