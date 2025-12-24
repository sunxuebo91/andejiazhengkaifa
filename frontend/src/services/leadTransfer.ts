import apiService from './api';

export interface UserQuota {
  userId: string;
  userName: string;
  role: 'source' | 'target';
  transferredOut: number;
  transferredIn: number;
  balance: number;
  pendingCompensation: number;
}

export interface LeadTransferRule {
  _id: string;
  ruleName: string;
  description?: string;
  enabled: boolean;
  triggerConditions: {
    inactiveHours: number;
    contractStatuses: string[];
    leadSources?: string[];
    createdDateRange?: {
      startDate?: Date | null;
      endDate?: Date | null;
    };
  };
  executionWindow: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  sourceUserIds: string[];
  targetUserIds: string[];
  distributionConfig: {
    strategy: 'balanced-random' | 'round-robin' | 'least-load';
    enableCompensation: boolean;
    compensationPriority: number;
  };
  userQuotas: UserQuota[];
  statistics: {
    totalTransferred: number;
    lastExecutedAt?: Date;
    lastExecutionResult?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadTransferRecord {
  _id: string;
  ruleId: string;
  ruleName: string;
  customerId: string;
  customerNumber: string; // 添加客户编号
  customerName: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  transferredAt: Date;
  reason: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  snapshot: {
    contractStatus: string;
    inactiveHours: number;
    lastActivityAt: Date;
  };
}

export interface CreateLeadTransferRuleDto {
  ruleName: string;
  description?: string;
  enabled: boolean;
  triggerConditions: {
    inactiveHours: number;
    contractStatuses: string[];
    leadSources?: string[];
    createdDateRange?: {
      startDate?: Date | null;
      endDate?: Date | null;
    };
  };
  executionWindow?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  sourceUserIds: string[];
  targetUserIds: string[];
  distributionConfig?: {
    strategy?: 'balanced-random' | 'round-robin' | 'least-load';
    enableCompensation?: boolean;
    compensationPriority?: number;
  };
}

export interface LeadTransferStatistics {
  totalCount: number;
  successCount: number;
  failedCount: number;
  successRate: string;
}

class LeadTransferService {
  // 获取所有规则
  async getRules(): Promise<LeadTransferRule[]> {
    const response = await apiService.get('/api/lead-transfer/rules');
    console.log('API原始响应:', response);
    console.log('response.data:', response.data);

    // 处理两种可能的响应格式
    // 1. { success: true, data: [...] } - 标准格式
    // 2. [...] - 直接返回数组
    if (Array.isArray(response.data)) {
      console.log('返回的是数组格式，直接使用');
      return response.data;
    } else if (response.data.data) {
      console.log('返回的是标准格式，使用 data 字段');
      return response.data.data;
    } else {
      console.error('未知的响应格式:', response.data);
      return [];
    }
  }

  // 获取单个规则详情
  async getRule(id: string): Promise<LeadTransferRule> {
    const response = await apiService.get(`/api/lead-transfer/rules/${id}`);
    console.log('getRule API响应:', response);
    console.log('response.data:', response.data);

    // 处理两种可能的响应格式
    if (response.data.data) {
      return response.data.data;
    } else if (response.data._id) {
      // 直接返回的是规则对象
      return response.data;
    } else {
      console.error('未知的响应格式:', response.data);
      throw new Error('获取规则详情失败：响应格式错误');
    }
  }

  // 创建规则
  async createRule(data: CreateLeadTransferRuleDto): Promise<LeadTransferRule> {
    const response = await apiService.post('/api/lead-transfer/rules', data);
    return response.data.data;
  }

  // 更新规则
  async updateRule(id: string, data: Partial<CreateLeadTransferRuleDto>): Promise<LeadTransferRule> {
    const response = await apiService.patch(`/api/lead-transfer/rules/${id}`, data);
    return response.data.data;
  }

  // 切换规则启用状态
  async toggleRule(id: string): Promise<LeadTransferRule> {
    const response = await apiService.patch(`/api/lead-transfer/rules/${id}/toggle`);
    return response.data.data;
  }

  // 删除规则
  async deleteRule(id: string): Promise<void> {
    await apiService.delete(`/api/lead-transfer/rules/${id}`);
  }

  // 手动执行规则
  async executeNow(ruleId: string): Promise<{
    transferredCount: number;
    message: string;
    userStats?: Array<{
      userId: string;
      userName: string;
      transferredOut: number;
      transferredIn: number;
    }>;
  }> {
    const response = await apiService.post('/api/lead-transfer/execute-now', { ruleId });
    // 处理两种可能的响应格式
    if (response.data.data) {
      return response.data.data;
    } else if (response.data.transferredCount !== undefined) {
      return response.data;
    } else {
      return { transferredCount: 0, message: '执行完成' };
    }
  }

  // 获取流转记录
  async getRecords(params: {
    page?: number;
    limit?: number;
    ruleId?: string;
    customerId?: string;
    fromUserId?: string;
    toUserId?: string;
    status?: 'success' | 'failed';
    startDate?: string;
    endDate?: string;
  }): Promise<{ records: LeadTransferRecord[]; total: number; page: number; totalPages: number }> {
    const response = await apiService.get('/api/lead-transfer/records', params);
    console.log('getRecords API响应:', response);

    // 处理响应格式：api.ts的拦截器已经返回了response.data
    // 所以这里response就是{ success: true, data: {...} }
    if (response.data) {
      return response.data;
    } else {
      console.error('未知的响应格式:', response);
      throw new Error('获取流转记录失败：响应格式错误');
    }
  }

  // 获取统计信息
  async getStatistics(): Promise<LeadTransferStatistics> {
    const response = await apiService.get('/api/lead-transfer/statistics');
    console.log('getStatistics API响应:', response);

    // 处理响应格式
    if (response.data) {
      return response.data;
    } else {
      console.error('未知的响应格式:', response);
      throw new Error('获取统计信息失败：响应格式错误');
    }
  }

  // 获取用户统计
  async getUserStatistics(userId: string): Promise<any> {
    const response = await apiService.get(`/api/lead-transfer/user-statistics/${userId}`);
    return response.data.data;
  }
}

export default new LeadTransferService();

