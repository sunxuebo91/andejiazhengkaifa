import apiService from './api';

export interface ContractDeletionApproval {
  _id: string;
  contractId: {
    _id: string;
    contractNumber: string;
    customerName: string;
    workerName: string;
  };
  contractNumber: string;
  requestedBy: {
    _id: string;
    username: string;
    name: string;
  };
  requestedByName: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: {
    _id: string;
    username: string;
    name: string;
  };
  approvedByName?: string;
  approvalComment?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalListResponse {
  approvals: ContractDeletionApproval[];
  total: number;
  page: number;
  limit: number;
}

export const approvalService = {
  // 获取所有审批请求（管理员）
  async getAll(status?: string, page: number = 1, limit: number = 10): Promise<ApprovalListResponse> {
    const params: any = { page, limit };
    if (status) {
      params.status = status;
    }
    const response = await apiService.get('/api/contract-approvals', params);
    return response.data;
  },

  // 获取我的删除请求
  async getMyRequests(): Promise<ContractDeletionApproval[]> {
    const response = await apiService.get('/api/contract-approvals/my-requests');
    return response.data;
  },

  // 获取单个审批请求详情
  async getOne(id: string): Promise<ContractDeletionApproval> {
    const response = await apiService.get(`/api/contract-approvals/${id}`);
    return response.data;
  },

  // 批准删除请求
  async approve(id: string, comment?: string): Promise<{
    success: boolean;
    message: string;
    data: ContractDeletionApproval;
  }> {
    const response = await apiService.post(`/api/contract-approvals/${id}/approve`, {
      comment,
    });
    return response.data;
  },

  // 拒绝删除请求
  async reject(id: string, comment: string): Promise<{
    success: boolean;
    message: string;
    data: ContractDeletionApproval;
  }> {
    const response = await apiService.post(`/api/contract-approvals/${id}/reject`, {
      comment,
    });
    return response.data;
  },
};

