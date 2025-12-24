import apiService from './api';
import {
  InsurancePolicy,
  CreatePolicyData,
  QueryPolicyData,
  CancelPolicyData,
  PrintPolicyData,
  InvoiceData,
  SurrenderPolicyData,
  AmendPolicyData,
  AddInsuredData,
  PolicyStatus,
  DashubaoResponse,
} from '../types/insurance.types';

export const insuranceService = {
  // 创建保单（投保确认）
  async createPolicy(data: CreatePolicyData): Promise<InsurancePolicy> {
    const response = await apiService.post('/api/dashubao/policy', data);
    return response.data;
  },

  // 查询保单（从大树保查询）
  async queryPolicy(data: QueryPolicyData): Promise<DashubaoResponse> {
    const response = await apiService.post('/api/dashubao/policy/query', data);
    return response.data;
  },

  // 注销保单
  async cancelPolicy(data: CancelPolicyData): Promise<DashubaoResponse> {
    const response = await apiService.post('/api/dashubao/policy/cancel', data);
    return response.data;
  },

  // 打印保单（下载PDF）
  async printPolicy(data: PrintPolicyData): Promise<Blob> {
    const response = await apiService.post('/api/dashubao/policy/print', data, {
      responseType: 'blob', // 接收二进制数据
    });
    return response.data;
  },

  // 申请电子发票
  async requestInvoice(data: InvoiceData): Promise<DashubaoResponse> {
    const response = await apiService.post('/api/dashubao/policy/invoice', data);
    return response.data;
  },

  // 创建支付订单
  async createPaymentOrder(policyRef: string, tradeType: string = 'MWEB'): Promise<DashubaoResponse> {
    const response = await apiService.post(`/api/dashubao/policy/payment/${policyRef}?tradeType=${tradeType}`);
    return response.data;
  },

  // 批改（替换被保险人）
  async amendPolicy(data: AmendPolicyData): Promise<DashubaoResponse> {
    const response = await apiService.post('/api/dashubao/policy/amend', data);
    return response.data;
  },

  // 批增（增加被保险人）
  async addInsured(data: AddInsuredData): Promise<DashubaoResponse> {
    const response = await apiService.post('/api/dashubao/policy/add-insured', data);
    return response.data;
  },

  // 退保
  async surrenderPolicy(data: SurrenderPolicyData): Promise<DashubaoResponse> {
    const response = await apiService.post('/api/dashubao/policy/surrender', data);
    return response.data;
  },

  // 查询返佣信息
  async queryRebate(policyNo: string): Promise<DashubaoResponse> {
    const response = await apiService.get(`/api/dashubao/policy/rebate/${policyNo}`);
    return response.data;
  },

  // 获取本地保单列表
  async getPolicies(params: {
    status?: PolicyStatus;
    resumeId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: InsurancePolicy[]; total: number }> {
    const response = await apiService.get('/api/dashubao/policies', params);
    return response.data;
  },

  // 根据ID获取保单详情
  async getPolicyById(id: string): Promise<InsurancePolicy> {
    const response = await apiService.get(`/api/dashubao/policy/${id}`);
    return response.data;
  },

  // 根据保单号获取保单详情
  async getPolicyByPolicyNo(policyNo: string): Promise<InsurancePolicy> {
    const response = await apiService.get(`/api/dashubao/policy/by-policy-no/${policyNo}`);
    return response.data;
  },

  // 根据商户单号获取保单详情
  async getPolicyByPolicyRef(policyRef: string): Promise<InsurancePolicy> {
    const response = await apiService.get(`/api/dashubao/policy/by-policy-ref/${policyRef}`);
    return response.data;
  },

  // 同步保单状态
  async syncPolicyStatus(policyNo: string): Promise<InsurancePolicy> {
    const response = await apiService.post(`/api/dashubao/policy/sync/${policyNo}`);
    return response.data;
  },
};

export default insuranceService;

