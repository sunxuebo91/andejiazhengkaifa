import { api } from './api';

export interface Contract {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'pending' | 'signed' | 'expired';
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
  signerName?: string;
  signerEmail?: string;
  createdBy: string;
  filePath?: string;
  fileId?: string;
}

export interface CreateContractRequest {
  合同签署日期: string;
  甲方联系人: string; // 客户联系人
  甲方联系电话: string; // 客户联系电话
  甲方身份证号: string; // 客户身份证号
  乙方联系人: string; // 服务人员联系人
  乙方联系电话: string; // 服务人员联系电话
  乙方身份证号: string; // 服务人员身份证号
  甲方地址: string; // 客户地址
  乙方地址: string; // 服务人员地址
  服务内容: string;
  服务期限: string;
  合同金额: string;
  合同金额大写: string;
  付款方式: string;
  合同条款: string;
  fileId?: string;
}

export interface SignatureRequest {
  contractId: string;
  signerName: string;
  signerEmail: string;
  message?: string;
}

export interface SignContractRequest {
  contractId: string;
  signerName: string;
  signerIdCard: string;
  signatureMethod: 'SMS' | 'MANUAL';
  signature?: string;
  signatureImage?: string;
}

export interface ESignResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface TemplateField {
  autoScale: number;
  dataKey: string;
  dataType: number;
  fillType: number;
  page: number;
  required: number;
  locationX?: number;
  locationY?: number;
  signUser?: string;
  signUserType?: number;
  options?: Array<{
    label: string;
    value: string;
    selected: boolean;
    index: number;
  }>;
}

export interface TemplateDataResponse {
  code: number;
  data: TemplateField[];
  msg: string;
}

// 基于官方爱签流程的新API接口
interface CreateContractFlowRequest {
  contractName: string;
  templateNo: string;
  templateParams: Record<string, any>;
  signerName: string;
  signerMobile: string;
  signerIdCard: string;
  validityTime?: number;
  signOrder?: number;
}

interface CreateContractFlowResponse {
  success: boolean;
  data?: {
    contractNo: string;
    signUrl: string;
    message: string;
  };
  message: string;
}

export interface AddStrangerRequest {
  account: string;
  userType: number;
  name?: string;
  companyName?: string;
  mobile?: string;
  signPwd?: string;
  isSignPwdNotice?: number;
  isNotice?: number;
  identifiedNotifyUrl?: string;
  creditCode?: string;
  agentName?: string;
  agentCardNo?: string;
  idCard?: string;
  bankCard?: string;
  immutableInfoList?: string[];
}

interface ContractStatusResponse {
  success: boolean;
  data?: any;
  message: string;
  errorCode?: number;
  originalError?: any;
  statusInfo?: any;
  detailedStatus?: {
    text: string;
    color: string;
    type: string;
    detailed: boolean;
    signers?: any[];
    summary?: string;
    customerSigned?: boolean;
    workerSigned?: boolean;
    customer?: any;
    worker?: any;
  };
  code?: number;
  msg?: string;
}

// 添加甲乙双方用户请求接口
interface AddUsersBatchRequest {
  partyAName: string;
  partyAMobile: string;
  partyAIdCard?: string;
  partyBName: string;
  partyBMobile: string;
  partyBIdCard?: string;
  isNotice?: boolean;
  isSignPwdNotice?: boolean;
}

// 批量添加用户响应接口（axios拦截器已提取data字段）
interface AddUsersBatchResponse {
  success: boolean;
  message: string;
  partyA: {
    success: boolean;
    message: string;
    request: any;
    response: any;
  };
  partyB: {
    success: boolean;
    message: string;
    request: any;
    response: any;
  };
}

// 合同模板接口
interface ContractTemplate {
  templateNo: string;
  templateName: string;
  description: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'select';
    required: boolean;
    options?: string[];
  }>;
}

// 创建合同请求接口（步骤2）
interface CreateContractStep2Request {
  contractNo: string;
  contractName: string;
  templateNo: string;
  templateParams: Record<string, any>;
  validityTime?: number;
  signOrder?: number;
  readSeconds?: number;
  needAgree?: number;
  autoExpand?: number;
  refuseOn?: number;
  autoContinue?: number;
  viewFlg?: number;
  enableDownloadButton?: number;
}

// 创建合同响应接口（步骤2）- 爱签API格式
interface CreateContractStep2Response {
  code: number;
  msg: string;
  data?: {
    previewUrl?: string;
    contractFiles?: string;
    contractNo?: string;
  };
}

class ESignService {
  // 获取合同列表
  async getContracts(): Promise<Contract[]> {
    try {
      const response = await api.get<ESignResponse<Contract[]>>('/api/esign/contracts');
      return response.data?.data || [];
    } catch (error) {
      console.error('获取合同列表失败:', error);
      throw new Error('获取合同列表失败');
    }
  }

  // 获取合同详情
  async getContract(id: string): Promise<Contract> {
    try {
      const response = await api.get<ESignResponse<Contract>>(`/esign/contracts/${id}`);
      if (!response.data?.data) {
        throw new Error('合同数据为空');
      }
      return response.data.data;
    } catch (error) {
      console.error('获取合同详情失败:', error);
      throw new Error('获取合同详情失败');
    }
  }

  // 创建合同
  async createContract(data: CreateContractRequest): Promise<Contract> {
    try {
      const response = await api.post<ESignResponse<Contract>>('/api/esign/contracts', data);
      if (!response.data?.data) {
        throw new Error('创建合同失败，返回数据为空');
      }
      return response.data.data;
    } catch (error) {
      console.error('创建合同失败:', error);
      throw new Error('创建合同失败');
    }
  }

  // 更新合同
  async updateContract(id: string, data: Partial<CreateContractRequest>): Promise<Contract> {
    try {
      const response = await api.put<ESignResponse<Contract>>(`/api/esign/contracts/${id}`, data);
      if (!response.data?.data) {
        throw new Error('更新合同失败，返回数据为空');
      }
      return response.data.data;
    } catch (error) {
      console.error('更新合同失败:', error);
      throw new Error('更新合同失败');
    }
  }

  // 删除合同
  async deleteContract(id: string): Promise<void> {
    try {
      await api.delete(`/api/esign/contracts/${id}`);
    } catch (error) {
      console.error('删除合同失败:', error);
      throw new Error('删除合同失败');
    }
  }

  // 发送签名请求
  async sendSignatureRequest(data: SignatureRequest): Promise<void> {
    try {
      await api.post<ESignResponse>('/api/esign/send-signature-request', data);
    } catch (error) {
      console.error('发送签名请求失败:', error);
      throw new Error('发送签名请求失败');
    }
  }

  // 签名合同
  async signContract(data: SignContractRequest): Promise<ESignResponse<any>> {
    try {
      const response = await api.post<ESignResponse<any>>('/api/esign/sign-contract', data);
      return response.data || { success: false, data: null, message: '签名失败' };
    } catch (error) {
      console.error('签名合同失败:', error);
      throw new Error('签名合同失败');
    }
  }

  // 获取签名URL
  async getSigningUrl(contractId: string): Promise<string> {
    try {
      const response = await api.get<ESignResponse<{ url: string }>>(`/api/esign/contracts/${contractId}/signing-url`);
      if (!response.data?.data?.url) {
        throw new Error('获取签名URL失败，返回数据为空');
      }
      return response.data.data.url;
    } catch (error) {
      console.error('获取签名URL失败:', error);
      throw new Error('获取签名URL失败');
    }
  }

  // 下载合同
  async downloadContract(contractId: string): Promise<Blob> {
    try {
      const response = await api.get(`/api/esign/contracts/${contractId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('下载合同失败:', error);
      throw new Error('下载合同失败');
    }
  }

  // 获取签名历史
  async getSigningHistory(contractId: string): Promise<any[]> {
    try {
      const response = await api.get<ESignResponse<any[]>>(`/api/esign/contracts/${contractId}/history`);
      return response.data?.data || [];
    } catch (error) {
      console.error('获取签名历史失败:', error);
      throw new Error('获取签名历史失败');
    }
  }

  // 上传合同文件
  async uploadContractFile(file: File): Promise<{ fileId: string; fileName: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post<ESignResponse<{ fileId: string; fileName: string }>>(
        '/api/esign/upload-contract-file', 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      if (!response.data?.data) {
        throw new Error('上传合同文件失败，返回数据为空');
      }
      return response.data.data;
    } catch (error) {
      console.error('上传合同文件失败:', error);
      throw new Error('上传合同文件失败');
    }
  }

  // 预览合同文件（旧版本，用于预览URL）
  async previewContractFile(contractId: string): Promise<string> {
    try {
      const response = await api.get<ESignResponse<{ previewUrl: string }>>(`/api/esign/contracts/${contractId}/preview`);
      if (!response.data?.data?.previewUrl) {
        throw new Error('预览合同失败，返回数据为空');
      }
      return response.data.data.previewUrl;
    } catch (error) {
      console.error('预览合同失败:', error);
      throw new Error('预览合同失败');
    }
  }

  // 批量操作
  async batchDeleteContracts(contractIds: string[]): Promise<void> {
    try {
      await api.post('/api/esign/contracts/batch-delete', { contractIds });
    } catch (error) {
      console.error('批量删除合同失败:', error);
      throw new Error('批量删除合同失败');
    }
  }

  // 合同统计
  async getContractStats(): Promise<{
    total: number;
    draft: number;
    pending: number;
    signed: number;
    expired: number;
  }> {
    try {
      const response = await api.get<ESignResponse<{
        total: number;
        draft: number;
        pending: number;
        signed: number;
        expired: number;
      }>>('/api/esign/contracts/stats');
      if (!response.data?.data) {
        throw new Error('获取合同统计失败，返回数据为空');
      }
      return response.data.data;
    } catch (error) {
      console.error('获取合同统计失败:', error);
      throw new Error('获取合同统计失败');
    }
  }

  // 🔥 获取模板控件信息（从爱签API获取真实字段）
  async getTemplateData(templateIdent: string): Promise<TemplateField[]> {
    try {
      const response = await api.post('/api/esign/template/data', {
        templateIdent
      });

      console.log('🔍 getTemplateData 原始响应:', response.data);

      // 🔥 后端直接返回 { code: 100000, data: [...], msg: '成功' }
      if (response.data?.code === 100000) {
        return response.data.data; // 返回实际的模板字段数组
      } else {
        throw new Error(response.data?.msg || '获取模板控件信息失败');
      }
    } catch (error) {
      console.error('❌ 获取模板控件信息失败:', error);
      throw new Error('获取模板控件信息失败');
    }
  }

  // 数字转大写金额
  convertToChineseAmount(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '';
    
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const units = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿'];
    const decimalUnits = ['角', '分'];
    
    if (num === 0) return '零元整';
    
    const [integerPart, decimalPart] = num.toString().split('.');
    let result = '';
    
    // 处理整数部分
    const integerStr = integerPart.split('').reverse();
    for (let i = 0; i < integerStr.length; i++) {
      const digit = parseInt(integerStr[i]);
      if (digit !== 0) {
        result = digits[digit] + units[i] + result;
      } else if (result && !result.startsWith('零')) {
        result = '零' + result;
      }
    }
    
    result = result || '零';
    result += '元';
    
    // 处理小数部分
    if (decimalPart) {
      const decimalStr = decimalPart.padEnd(2, '0').substring(0, 2);
      let decimalResult = '';
      
      for (let i = 0; i < decimalStr.length; i++) {
        const digit = parseInt(decimalStr[i]);
        if (digit !== 0) {
          decimalResult += digits[digit] + decimalUnits[i];
        }
      }
      
      result += decimalResult || '整';
    } else {
      result += '整';
    }
    
    return result;
  }

  /**
   * 基于官方爱签流程创建合同（完整流程）
   * 包含：添加陌生用户 -> 创建合同 -> 添加签署方 -> 返回签署链接
   */
  async createContractFlow(request: CreateContractFlowRequest): Promise<CreateContractFlowResponse> {
    try {
      const response = await api.post('/api/esign/create-contract-flow', request);
      return response.data;
    } catch (error) {
      console.error('创建合同流程失败:', error);
      throw error;
    }
  }

  /**
   * 添加陌生用户
   */
  async addStranger(request: AddStrangerRequest): Promise<any> {
    try {
      const response = await api.post('/api/esign/add-stranger', request);
      return response.data;
    } catch (error) {
      console.error('添加陌生用户失败:', error);
      throw error;
    }
  }

  /**
   * 创建合同（基于模板）
   */
  async createContractTemplate(request: {
    contractNo: string;
    contractName: string;
    templateNo: string;
    templateParams: Record<string, any>;
    validityTime?: number;
    signOrder?: number;
  }): Promise<any> {
    try {
      const response = await api.post('/api/esign/create-contract-template', request);
      return response.data;
    } catch (error) {
      console.error('创建合同失败:', error);
      throw error;
    }
  }

  /**
   * 添加签署方（官方标准实现）
   * 支持添加多个签署方，返回签署链接
   */
  async addContractSigners(request: Array<{
    contractNo: string;
    account: string;
    signType: number; // 2：无感知签约，3：有感知签约
    sealNo?: string;
    authSignAccount?: string;
    noticeMobile?: string;
    signOrder?: string;
    isNotice?: number;
    validateType?: number;
    faceAuthMode?: number;
    validateTypeList?: string;
    autoSwitch?: number;
    isNoticeComplete?: number;
    waterMark?: number;
    autoSms?: number;
    customSignFlag?: number;
    signStrategyList?: Array<{
      attachNo: number;
      locationMode: number;
      signKey?: string;
      signPage?: number;
      signX?: number;
      signY?: number;
      signType?: number;
      sealNo?: number;
      canDrag?: number;
      offsetX?: number;
      offsetY?: number;
    }>;
    signStrikeList?: Array<{
      attachNo: number;
      signPage: string;
      signX?: number;
      signY?: number;
    }>;
    receiverFillStrategyList?: Array<{
      attachNo: number;
      signKey: string;
      defaultValue?: string;
    }>;
    authConfig?: {
      idType?: string;
      idNumber?: string;
      name?: string;
      mobile?: string;
    };
    isIframe?: number;
    willType?: string;
    signMark?: string;
  }>): Promise<any> {
    try {
      const response = await api.post('/api/esign/add-signers', request);
      return response.data;
    } catch (error) {
      console.error('添加签署方失败:', error);
      throw error;
    }
  }

  /**
   * 简化版添加签署方
   * 适用于常见的甲乙双方签署场景
   */
  async addSimpleContractSigners(request: {
    contractNo: string;
    signers: Array<{
      account: string;
      name: string;
      mobile: string;
      signType?: 'auto' | 'manual';
      validateType?: 'sms' | 'password' | 'face';
      signPosition?: {
        page?: number;
        x?: number;
        y?: number;
        keyword?: string;
      };
    }>;
    signOrder?: 'sequential' | 'parallel';
  }): Promise<any> {
    try {
      const response = await api.post('/api/esign/add-signers-simple', request);
      return response.data;
    } catch (error) {
      console.error('简化版添加签署方失败:', error);
      throw error;
    }
  }

  /**
   * 获取合同状态
   */
  async getContractStatus(contractNo: string): Promise<ContractStatusResponse> {
    try {
      const response = await api.get(`/api/esign/contract-status/${contractNo}`);
      
      // 按照官方文档处理合同状态响应
      console.log('🔍 合同状态API响应:', response);
      
      const result = response as any;
      
      // 检查响应格式和状态信息
      if (result.code === 100000) {
        console.log('✅ 合同状态查询成功');
      if (result.detailedStatus) {
          console.log('📋 状态信息:', result.detailedStatus);
        }
        if (result.statusInfo) {
          console.log('📋 标准状态:', result.statusInfo);
        }
      } else {
        console.warn('⚠️ 合同状态查询失败:', result.msg);
      }
      
      return result;
    } catch (error) {
      console.error('获取合同状态失败:', error);
      throw error;
    }
  }

  /**
   * 批量同步合同状态
   */
  async syncContractStatus(contractNos: string[]): Promise<any> {
    try {
      const response = await api.post('/api/esign/sync-contract-status', { contractNos });
      return response.data;
    } catch (error) {
      console.error('批量同步合同状态失败:', error);
      throw error;
    }
  }

  /**
   * 下载已签署合同（完善版本）
   * 支持多种下载选项
   */
  async downloadSignedContract(contractNo: string, options?: {
    force?: number; // 强制下载标识：0（默认）：未签署完的无法下载，1：无论什么状态都强制下载
    downloadFileType?: number; // 下载文件类型：1：PDF文件，2：多个单张PNG文件，含PDF文件，3：分页PNG压缩文件，含PDF文件，4：合同单张图片，不含PDF文件，5：所有分页图片，不含PDF文件
    outfile?: string; // 文件本地路径（可选）
  }): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (options?.force !== undefined) params.append('force', options.force.toString());
      if (options?.downloadFileType !== undefined) params.append('downloadFileType', options.downloadFileType.toString());
      if (options?.outfile) params.append('outfile', options.outfile);
      
      const queryString = params.toString();
      const url = `/api/esign/download-contract/${contractNo}${queryString ? '?' + queryString : ''}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('下载已签署合同失败:', error);
      throw error;
    }
  }

  /**
   * 下载base64文件数据到本地
   * @param base64Data base64编码的文件数据
   * @param fileName 文件名
   * @param fileType 文件类型（用于确定MIME类型）
   */
  downloadBase64File(base64Data: string, fileName: string, fileType?: number): void {
    try {
      // 根据文件类型确定MIME类型
      let mimeType = 'application/octet-stream';
      if (fileType === 1 || fileName.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (fileName.toLowerCase().endsWith('.zip')) {
        mimeType = 'application/zip';
      } else if (fileName.toLowerCase().endsWith('.png')) {
        mimeType = 'image/png';
      }

      // 创建Blob对象
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('文件下载成功:', fileName);
    } catch (error) {
      console.error('下载文件失败:', error);
      throw new Error('下载文件失败');
    }
  }

  /**
   * 批量添加甲乙双方用户
   */
  async addUsersBatch(request: AddUsersBatchRequest): Promise<AddUsersBatchResponse> {
    try {
      console.log('调用批量添加用户API:', request);
      const response = await api.post('/api/esign/add-users-batch', request);
      console.log('批量添加用户响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('批量添加用户请求失败:', error);
      throw error;
    }
  }

  /**
   * 获取合同模板列表
   */
  async getTemplates(): Promise<ContractTemplate[]> {
    try {
      const response = await api.get('/api/esign/templates');
      return response.data;
    } catch (error) {
      console.error('获取模板列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建合同（步骤2：上传待签署文件）
   */
  async createContractStep2(request: CreateContractStep2Request): Promise<CreateContractStep2Response> {
    try {
      console.log('调用创建合同API:', request);
      const response = await api.post('/api/esign/create-contract', request);
      console.log('创建合同响应:', response);
      // 返回后端的爱签API响应格式
      return response.data as CreateContractStep2Response;
    } catch (error) {
      console.error('创建合同失败:', error);
      throw error;
    }
  }

  /**
   * 预览合同信息
   */
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
  }>): Promise<any> {
    try {
      let response;
      
      if (signers && signers.length > 0) {
        // 如果提供了签署方配置，使用POST请求
        response = await api.post(`/api/esign/preview-contract/${contractNo}`, { signers });
      } else {
        // 否则使用GET请求（使用默认配置）
        response = await api.get(`/api/esign/preview-contract/${contractNo}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('预览合同失败:', error);
      throw error;
    }
  }

  /**
   * 撤销合同
   */
  async withdrawContract(contractNo: string, reason?: string): Promise<any> {
    try {
      const response = await api.post(`/api/esign/withdraw-contract/${contractNo}`, { 
        reason: reason || '用户主动撤销合同' 
      });
      return response.data;
    } catch (error) {
      console.error('撤销合同失败:', error);
      throw error;
    }
  }
}

export default new ESignService();
export type {
  CreateContractFlowRequest,
  CreateContractFlowResponse,
  ContractStatusResponse,
  AddUsersBatchRequest,
  AddUsersBatchResponse,
  ContractTemplate,
  CreateContractStep2Request,
  CreateContractStep2Response
}; 