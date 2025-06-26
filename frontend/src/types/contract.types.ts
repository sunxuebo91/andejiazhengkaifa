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