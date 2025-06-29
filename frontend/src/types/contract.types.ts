export interface Contract {
  _id?: string;
  contractNumber: string;
  customerName: string;
  customerPhone: string;
  customerIdCard?: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  workerName: string;
  workerPhone: string;
  workerIdCard: string;
  workerSalary: number;
  customerServiceFee: number;
  workerServiceFee?: number;
  deposit?: number;
  finalPayment?: number;
  expectedDeliveryDate?: string;
  salaryPaymentDay?: number;
  remarks?: string;
  monthlyWorkDays?: number;
  customerId: string;
  workerId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // 爱签相关字段
  esignContractNo?: string;
  esignStatus?: string;
  esignCreatedAt?: string;
  esignTemplateNo?: string;
  esignPreviewUrl?: string;
  esignSignUrls?: string; // JSON字符串，存储真实的签署链接
}

export enum ContractType {
  YUEXIN = '月嫂',
  ZHUJIA_YUER = '住家育儿嫂',
  BAOJIE = '保洁',
  ZHUJIA_BAOMU = '住家保姆',
  YANGCHONG = '养宠',
  XIAOSHI = '小时工',
  BAIBAN_YUER = '白班育儿',
  BAIBAN_BAOMU = '白班保姆',
  ZHUJIA_HULAO = '住家护老'
}

export const CONTRACT_TYPES = Object.values(ContractType);

export interface CreateContractData {
  customerName: string;
  customerPhone: string;
  customerIdCard?: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  workerName: string;
  workerPhone: string;
  workerIdCard: string;
  workerSalary: number;
  customerServiceFee: number;
  workerServiceFee?: number;
  deposit?: number;
  finalPayment?: number;
  expectedDeliveryDate?: string;
  salaryPaymentDay?: number;
  remarks?: string;
  monthlyWorkDays?: number;
  customerId: string;
  workerId: string;
  
  // 爱签相关字段
  esignContractNo?: string;
  esignStatus?: string;
  esignCreatedAt?: string;
  esignTemplateNo?: string;
  esignSignUrls?: string; // JSON字符串，存储真实的签署链接
}

export interface Worker {
  _id: string;
  name: string;
  phone: string;
  idNumber: string;
  age: number;
  jobType: string;
  nativePlace: string;
  currentAddress?: string;
}

// 🎯 精准合同状态相关类型定义
export interface ContractSigner {
  account: string;
  name?: string;
  status: number; // 1=待签署, 2=已签署
  signOrder?: number;
  mobile?: string;
  signTime?: string;
}

export interface DetailedContractStatus {
  text: string; // 精准状态文本，如"客户未签约（甲方未签约）"
  color: string; // 状态颜色
  type: 'success' | 'info' | 'warning' | 'error'; // Antd标签类型
  detailed: boolean; // 是否为精准解析状态
  signers?: ContractSigner[]; // 签署方详情
  summary?: string; // 状态摘要
  customerSigned?: boolean; // 客户是否已签约
  workerSigned?: boolean; // 阿姨是否已签约
  customer?: ContractSigner; // 客户签署方信息
  worker?: ContractSigner; // 阿姨签署方信息
  error?: string; // 解析错误信息
}

export interface EnhancedContractStatusResponse {
  code: number;
  msg: string;
  data: {
    contractNo: string;
    status: number; // 合同整体状态
    contractName?: string;
    signers?: ContractSigner[];
    [key: string]: any;
  };
  detailedStatus?: DetailedContractStatus; // 后端解析的精准状态
}