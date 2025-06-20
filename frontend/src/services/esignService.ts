import apiClient from './api';

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
  signature: string;
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
}

export interface TemplateDataResponse {
  code: number;
  data: TemplateField[];
  msg: string;
}

class ESignService {
  // 获取合同列表
  async getContracts(): Promise<Contract[]> {
    try {
      const response = await apiClient.get<ESignResponse<Contract[]>>('/esign/contracts');
      return response.data?.data || [];
    } catch (error) {
      console.error('获取合同列表失败:', error);
      throw new Error('获取合同列表失败');
    }
  }

  // 获取合同详情
  async getContract(id: string): Promise<Contract> {
    try {
      const response = await apiClient.get<ESignResponse<Contract>>(`/esign/contracts/${id}`);
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
      const response = await apiClient.post<ESignResponse<Contract>>('/esign/contracts', data);
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
      const response = await apiClient.put<ESignResponse<Contract>>(`/esign/contracts/${id}`, data);
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
      await apiClient.delete(`/esign/contracts/${id}`);
    } catch (error) {
      console.error('删除合同失败:', error);
      throw new Error('删除合同失败');
    }
  }

  // 发送签名请求
  async sendSignatureRequest(data: SignatureRequest): Promise<void> {
    try {
      await apiClient.post<ESignResponse>('/esign/send-signature-request', data);
    } catch (error) {
      console.error('发送签名请求失败:', error);
      throw new Error('发送签名请求失败');
    }
  }

  // 签名合同
  async signContract(data: SignContractRequest): Promise<Contract> {
    try {
      const response = await apiClient.post<ESignResponse<Contract>>('/esign/sign-contract', data);
      if (!response.data?.data) {
        throw new Error('签名合同失败，返回数据为空');
      }
      return response.data.data;
    } catch (error) {
      console.error('签名合同失败:', error);
      throw new Error('签名合同失败');
    }
  }

  // 获取签名URL
  async getSigningUrl(contractId: string): Promise<string> {
    try {
      const response = await apiClient.get<ESignResponse<{ url: string }>>(`/esign/contracts/${contractId}/signing-url`);
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
      const response = await apiClient.get(`/esign/contracts/${contractId}/download`, {
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
      const response = await apiClient.get<ESignResponse<any[]>>(`/esign/contracts/${contractId}/history`);
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
      
      const response = await apiClient.post<ESignResponse<{ fileId: string; fileName: string }>>(
        '/esign/upload-contract-file', 
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

  // 预览合同文件
  async previewContract(contractId: string): Promise<string> {
    try {
      const response = await apiClient.get<ESignResponse<{ previewUrl: string }>>(`/esign/contracts/${contractId}/preview`);
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
      await apiClient.post('/esign/contracts/batch-delete', { contractIds });
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
      const response = await apiClient.get<ESignResponse<{
        total: number;
        draft: number;
        pending: number;
        signed: number;
        expired: number;
      }>>('/esign/contracts/stats');
      if (!response.data?.data) {
        throw new Error('获取合同统计失败，返回数据为空');
      }
      return response.data.data;
    } catch (error) {
      console.error('获取合同统计失败:', error);
      throw new Error('获取合同统计失败');
    }
  }

  // 获取模板控件信息
  async getTemplateData(templateIdent: string): Promise<TemplateField[]> {
    try {
      const response = await apiClient.post('/esign/template/data', {
        templateIdent
      });
      
      // 处理嵌套的响应结构
      if (response.data?.success && response.data?.data?.code === 100000) {
        return response.data.data.data; // 返回实际的模板字段数组
      } else {
        throw new Error(response.data?.data?.msg || response.data?.message || '获取模板控件信息失败');
      }
    } catch (error) {
      console.error('获取模板控件信息失败:', error);
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
}

export default new ESignService(); 