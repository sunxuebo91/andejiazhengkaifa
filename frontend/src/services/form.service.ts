import api from './api';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormField {
  label: string;
  fieldName: string;
  fieldType: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'phone' | 'date' | 'email';
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  order?: number;
  validationRule?: string;
  validationMessage?: string;
}

export interface FormConfig {
  _id?: string;
  title: string;
  description?: string;
  bannerUrl?: string;
  status?: 'active' | 'inactive';
  startTime?: string;
  endTime?: string;
  successMessage?: string;
  allowMultipleSubmissions?: boolean;
  submissionCount?: number;
  viewCount?: number;
  fields?: FormField[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: any;
  updatedBy?: any;
}

export interface FormSubmission {
  _id: string;
  formId: string;
  data: Record<string, any>;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  wechatOpenId?: string;
  wechatUnionId?: string;
  source: 'h5' | 'miniprogram' | 'web';
  followUpStatus: 'pending' | 'contacted' | 'completed';
  followUpNote?: string;
  followUpBy?: any;
  followUpAt?: string;
  referredBy?: { _id: string; name: string; username: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface FormStats {
  formId: string;
  title: string;
  viewCount: number;
  submissionCount: number;
  totalSubmissions: number;
  pendingCount: number;
  contactedCount: number;
  completedCount: number;
}

/**
 * 创建表单
 */
export const createForm = async (data: FormConfig) => {
  const response = await api.post('/api/forms', data);
  return response.data;
};

/**
 * 获取表单列表
 */
export const getFormList = async (params?: {
  status?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}) => {
  const response = await api.get('/api/forms', { params });
  return response.data;
};

/**
 * 获取表单详情
 */
export const getFormDetail = async (id: string) => {
  const response = await api.get(`/api/forms/${id}`);
  return response.data;
};

/**
 * 更新表单
 */
export const updateForm = async (id: string, data: FormConfig) => {
  const response = await api.put(`/api/forms/${id}`, data);
  return response.data;
};

/**
 * 删除表单
 */
export const deleteForm = async (id: string) => {
  const response = await api.delete(`/api/forms/${id}`);
  return response.data;
};

/**
 * 获取表单统计数据
 */
export const getFormStats = async (id: string): Promise<FormStats> => {
  const response = await api.get(`/api/forms/${id}/stats`);
  return response.data;
};

/**
 * 获取所有表单的提交列表
 */
export const getAllFormSubmissions = async (
  params?: {
    followUpStatus?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }
) => {
  const response = await api.get('/api/forms/all-submissions', { params });
  return response.data;
};

/**
 * 获取表单提交列表
 */
export const getFormSubmissions = async (
  formId: string,
  params?: {
    followUpStatus?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }
) => {
  const response = await api.get(`/api/forms/${formId}/submissions`, { params });
  return response.data;
};

/**
 * 更新提交记录（跟进）
 */
export const updateSubmission = async (
  submissionId: string,
  data: {
    followUpStatus?: string;
    followUpNote?: string;
  }
) => {
  const response = await api.put(`/api/forms/submissions/${submissionId}`, data);
  return response.data;
};

/**
 * 导出表单数据为Excel
 */
export const exportFormToExcel = async (formId: string) => {
  const response = await api.get(`/api/forms/${formId}/export`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * 生成表单分享令牌
 */
export const generateShareToken = async (formId: string) => {
  const response = await api.post(`/api/forms/${formId}/generate-share-token`);
  return response.data;
};

/**
 * 删除表单提交记录（仅管理员）
 */
export const deleteFormSubmission = async (submissionId: string) => {
  const response = await api.delete(`/api/forms/submissions/${submissionId}`);
  return response.data;
};
