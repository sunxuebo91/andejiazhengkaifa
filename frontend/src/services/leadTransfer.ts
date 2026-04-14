import apiService from './api';

export interface UserQuota {
  userId: string;
  userName: string;
  role: 'source' | 'target' | 'both';
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
  targetModule?: 'customer' | 'training';
  triggerConditions: {
    inactiveHours: number;
    transferCooldownHours?: number;
    maxTransferCount?: number;
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
  targetModule?: 'customer' | 'training';
  triggerConditions: {
    inactiveHours: number;
    transferCooldownHours?: number;
    maxTransferCount?: number;
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
  // 获取所有规则（可按模块过滤）
  async getRules(targetModule?: 'customer' | 'training'): Promise<LeadTransferRule[]> {
    const params = targetModule ? { targetModule } : {};
    const response: any = await apiService.get('/api/lead-transfer/rules', params);
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  // 获取学员线索流转规则
  async getTrainingRules(): Promise<LeadTransferRule[]> {
    return this.getRules('training');
  }

  // 手动执行学员线索流转规则
  async executeTrainingNow(ruleId: string): Promise<{
    transferredCount: number;
    message: string;
    userStats?: Array<{ userId: string; userName: string; transferredOut: number; transferredIn: number }>;
  }> {
    const response: any = await apiService.post(`/api/training-leads/admin/auto-transfer/trigger-rule/${ruleId}`, {});
    const data = response?.data ?? response;
    return {
      transferredCount: data?.data?.transferredCount ?? 0,
      message: data?.message ?? '执行完成',
      userStats: data?.data?.userStats,
    };
  }

  // 获取单个规则详情
  async getRule(id: string): Promise<LeadTransferRule> {
    const response: any = await apiService.get(`/api/lead-transfer/rules/${id}`);
    if (response?.data?._id) {
      return response.data;
    }
    if (response?._id) {
      return response;
    }
    throw new Error('获取规则详情失败：响应格式错误');
  }

  // 创建规则
  async createRule(data: CreateLeadTransferRuleDto): Promise<LeadTransferRule> {
    const response: any = await apiService.post('/api/lead-transfer/rules', data);
    return response.data;
  }

  // 更新规则
  async updateRule(id: string, data: Partial<CreateLeadTransferRuleDto>): Promise<LeadTransferRule> {
    const response: any = await apiService.patch(`/api/lead-transfer/rules/${id}`, data);
    return response.data;
  }

  // 切换规则启用状态
  async toggleRule(id: string, enabled: boolean): Promise<LeadTransferRule> {
    const response: any = await apiService.patch(`/api/lead-transfer/rules/${id}/toggle`, { enabled });
    return response.data;
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
    const response: any = await apiService.post('/api/lead-transfer/execute-now', { ruleId });
    if (response?.data?.transferredCount !== undefined) {
      return response.data;
    }
    if (response?.transferredCount !== undefined) {
      return response;
    }
    return { transferredCount: 0, message: '执行完成' };
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
    const response: any = await apiService.get('/api/lead-transfer/records', params);
    console.log('getRecords API响应:', response);
    console.log('response.data:', response.data);
    console.log('response.records:', response.records);

    // 处理响应格式：api.ts的拦截器已经返回了 { success: true, data: {...} }
    // 所以我们需要检查两种情况：
    // 1. response.data 存在（标准格式）
    // 2. response.records 存在（已经是数据对象）
    if (response.data && response.data.records) {
      console.log('使用 response.data 格式');
      return response.data;
    } else if (response.records) {
      console.log('使用 response 直接格式');
      return response;
    } else {
      console.error('未知的响应格式:', response);
      throw new Error('获取流转记录失败：响应格式错误');
    }
  }

  // 获取统计信息
  async getStatistics(): Promise<LeadTransferStatistics> {
    const response: any = await apiService.get('/api/lead-transfer/statistics');
    console.log('getStatistics API响应:', response);

    // 处理响应格式：api.ts的拦截器返回 { success: true, data: {...} }
    // 或者直接返回统计数据对象
    if (response.data && response.data.totalCount !== undefined) {
      return response.data;
    } else if (response.totalCount !== undefined) {
      return response;
    } else {
      console.error('未知的响应格式:', response);
      throw new Error('获取统计信息失败：响应格式错误');
    }
  }

  // 获取用户统计
  async getUserStatistics(userId: string): Promise<any> {
    const response: any = await apiService.get(`/api/lead-transfer/user-statistics/${userId}`);
    return response.data || response;
  }
}

export default new LeadTransferService();
