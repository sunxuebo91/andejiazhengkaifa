import apiService from './api';
import { Contract, CreateContractData, Worker } from '../types/contract.types';

export const contractService = {
  // 创建合同
  async createContract(data: CreateContractData): Promise<Contract> {
    const response = await apiService.post('/api/contracts', data);
    return response.data;
  },

  // 获取合同列表
  async getContracts(params: {
    page?: number;
    limit?: number;
    search?: string;
    contractType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    contracts: Contract[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await apiService.get('/api/contracts', params);
    return response.data;
  },

  // 根据ID获取合同详情
  async getContractById(id: string): Promise<Contract> {
    const response = await apiService.get(`/api/contracts/${id}`);
    return response.data;
  },

  // 根据合同编号获取合同
  async getContractByNumber(contractNumber: string): Promise<Contract> {
    const response = await apiService.get(`/api/contracts/number/${contractNumber}`);
    return response.data;
  },

  // 根据客户ID获取合同列表
  async getContractsByCustomerId(customerId: string): Promise<Contract[]> {
    const response = await apiService.get(`/api/contracts/customer/${customerId}`);
    return response.data;
  },

  // 根据服务人员ID获取合同列表
  async getContractsByWorkerId(workerId: string): Promise<Contract[]> {
    const response = await apiService.get(`/api/contracts/worker/${workerId}`);
    return response.data;
  },

  // 更新合同
  async updateContract(id: string, data: Partial<CreateContractData>): Promise<Contract> {
    const response = await apiService.put(`/api/contracts/${id}`, data);
    return response.data;
  },

  // 删除合同
  async deleteContract(id: string): Promise<void> {
    await apiService.delete(`/api/contracts/${id}`);
  },

  // 获取统计信息
  async getStatistics(): Promise<{
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    byContractType: Record<string, number>;
    thisMonth: number;
    thisYear: number;
  }> {
    const response = await apiService.get('/api/contracts/statistics');
    return response.data;
  },

  // 搜索服务人员
  async searchWorkers(searchText: string, limit: number = 10): Promise<Worker[]> {
    const params: any = { limit };
    
    // 使用同一个搜索文本作为电话和姓名进行搜索
    if (searchText) {
      params.phone = searchText;
      params.name = searchText;
    }
    
    const response = await apiService.get('/api/resumes/search-workers', params);
    
    // 后端返回的数据结构是 { success, data, message }，我们需要的是 data 字段
    if (response && response.data) {
      return response.data;
    }
    
    return [];
  },

  // 获取爱签信息
  async getEsignInfo(contractId: string): Promise<{
    contractNo: string;
    templateNo?: string;
    status?: any;
    preview?: any;
    statusError?: string;
    previewError?: string;
  }> {
    const response = await apiService.get(`/api/contracts/${contractId}/esign-info`);
    return response.data;
  },

  // 下载爱签合同
  async downloadContract(contractId: string, options: {
    force?: number;
    downloadFileType?: number;
  } = {}): Promise<any> {
    const response = await apiService.post(`/api/contracts/${contractId}/download-contract`, options);
    // 返回完整的响应对象，包含success、data、message字段
    return response;
  },

  // 预览合同
  async previewContract(contractNo: string, signers?: Array<{
    account: string;
    signStrategyList: Array<{
      attachNo: number;
      locationMode: number;
      signPage: number;
      signX: number;
      signY: number;
      signKey?: string;
    }>;
    isWrite?: number;
  }>): Promise<{
    success: boolean;
    contractNo: string;
    contractStatus?: number;
    statusText?: string;
    shouldDownload?: boolean;
    previewUrl?: string;
    embeddedUrl?: string;
    previewData?: string;
    contractInfo?: any;
    status?: any;
    method?: string;
    previewInfo?: {
      canDownload: boolean;
      shouldDownload?: boolean;
      contractCompleted?: boolean;
      contractSigning?: boolean;
      hasPreviewImage?: boolean;
      hasPreviewUrl?: boolean;
      hasEmbeddedUrl?: boolean;
      contractStatus?: number;
      contractName?: string;
      validityTime?: string;
      signUsers?: any[];
      statusText?: string;
      recommendation?: string;
      error?: boolean;
      availableFormats: Array<{ 
        type: number | string; 
        name: string; 
        recommended?: boolean;
        description?: string;
      }>;
    };
    message: string;
    fallbackMode?: boolean;
  }> {
    try {
      let response;
      if (signers && signers.length > 0) {
        // 如果提供了签署方信息，使用POST方法
        response = await apiService.post(`/api/esign/preview-contract/${contractNo}`, { signers });
      } else {
        // 否则使用GET方法（使用默认配置）
        response = await apiService.get(`/api/esign/preview-contract/${contractNo}`);
      }
      return response.data || response;
    } catch (error: any) {
      console.error('预览合同API调用失败:', error);
      
      // 如果错误响应中包含数据，返回错误响应数据
      if (error.response?.data) {
        return error.response.data;
      }
      
      // 否则返回一个标准的错误响应
      return {
        success: false,
        contractNo,
        message: error.message || '预览合同失败',
        contractStatus: undefined,
        statusText: '未知状态',
        previewInfo: {
          canDownload: false,
          error: true,
          recommendation: '请稍后重试或联系管理员',
          availableFormats: []
        }
      };
    }
  },

  // ==================== 换人功能 ====================

  // 检查客户现有合同
  async checkCustomerContract(customerPhone: string): Promise<{
    hasContract: boolean;
    contract?: any;
    contractHistory?: any;
  }> {
    const response = await apiService.get(`/api/contracts/check-customer/${customerPhone}`);
    return response.data;
  },

  // 创建换人合同
  async createChangeWorkerContract(originalContractId: string, contractData: any): Promise<any> {
    const response = await apiService.post(`/api/contracts/change-worker/${originalContractId}`, contractData);
    return response.data;
  },

  // 获取客户合同历史
  async getCustomerHistory(customerPhone: string): Promise<any> {
    const response = await apiService.get(`/api/contracts/history/${customerPhone}`);
    return response.data;
  },

  // 获取最新合同列表（用于主列表显示）
  async getLatestContracts(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{
    contracts: Contract[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });
    
    const response = await apiService.get(`/api/contracts/latest/list?${queryParams}`);
    return response.data;
  },

  // 合同签约成功回调
  async handleContractSigned(contractId: string, esignData: any): Promise<any> {
    const response = await apiService.post(`/api/contracts/signed-callback/${contractId}`, esignData);
    return response.data;
  }
}; 