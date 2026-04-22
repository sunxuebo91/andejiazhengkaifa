// 保险信息接口
export interface InsuranceInfo {
  hasInsurance: boolean;
  policies: Array<{
    policyNo?: string;
    agencyPolicyRef: string;
    planCode: string;
    effectiveDate: string;
    expireDate: string;
    totalPremium: number;
    status: string;
    policyPdfUrl?: string;
  }>;
  totalPolicies: number;
  error?: string;
}

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
  workerAddress?: string;
  customerId: string | { _id: string; name?: string; phone?: string; customerId?: string; address?: string; };
  workerId: string | { _id: string; name?: string; phone?: string; idNumber?: string; currentAddress?: string; hukouAddress?: string; };
  createdBy: string | { _id: string; name?: string; username?: string; };
  lastUpdatedBy?: string | { _id: string; name?: string; username?: string; };
  createdAt: string;
  updatedAt: string;

  // 合同状态（职培扩展：signed/graduated/refunded）
  contractStatus?: 'draft' | 'signing' | 'signed' | 'active' | 'replaced' | 'cancelled' | 'graduated' | 'refunded';

  // 职培终态时间戳
  graduatedAt?: string;
  refundedAt?: string;

  // 爱签相关字段
  esignContractNo?: string;
  esignStatus?: string;
  esignCreatedAt?: string;
  esignTemplateNo?: string;
  esignPreviewUrl?: string;
  esignSignUrls?: string; // JSON字符串，存储真实的签署链接

  // 爱签模板参数（包含合同开始/结束时间等）
  templateParams?: Record<string, any>;

  // 保险信息
  insuranceInfo?: InsuranceInfo;

  // 上户状态：合同签约后自动变 pending（待上户），客户小程序确认后变 confirmed（已上户）
  onboardStatus?: 'not_started' | 'pending' | 'confirmed';
  onboardConfirmedAt?: string;  // 客户确认上户时间
  onboardConfirmedBy?: string;  // 确认人手机号

  // 支付相关字段
  paymentEnabled?: boolean;  // 是否需要付费（运营在 CRM 后台开启）
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';  // 支付状态
  paymentAmount?: number;  // 实付金额（单位：分）
  paidAt?: string;  // 支付时间
  sqbSn?: string;  // 收钱吧订单号

  // 订单类别：housekeeping（家政）/ training（职培）
  orderCategory?: 'housekeeping' | 'training';
  // 职培订单专用字段
  trainingLeadId?: string;
  courseAmount?: number;
  serviceFeeAmount?: number;
  intendedCourses?: string[];
  consultPosition?: string;
}

export enum ContractType {
  YUESAO = '月嫂',
  ZHUJIA_YUER = '住家育儿嫂',
  BAOJIE = '保洁',
  ZHUJIA_BAOMU = '住家保姆',
  YANGCHONG = '养宠',
  XIAOSHI = '小时工',
  BAIBAN_YUER = '白班育儿',
  BAIBAN_BAOMU = '白班保姆',
  ZHUJIA_HULAO = '住家护老',
  ERTONG_PEIBAN = '儿童陪伴师'
}

export const CONTRACT_TYPES = Object.values(ContractType);

export interface CreateContractData {
  customerName: string;
  customerPhone: string;
  customerIdCard?: string;
  contractType?: ContractType;
  startDate?: string;
  endDate?: string;
  workerName?: string;
  workerPhone?: string;
  workerIdCard?: string;
  workerSalary?: number;
  customerServiceFee?: number;
  workerServiceFee?: number;
  deposit?: number;
  finalPayment?: number;
  expectedDeliveryDate?: string;
  salaryPaymentDay?: number;
  remarks?: string;
  monthlyWorkDays?: number;
  customerId?: string;
  workerId?: string;

  // 爱签相关字段
  esignContractNo?: string;
  esignStatus?: string;
  esignCreatedAt?: string;
  esignTemplateNo?: string;
  esignSignUrls?: string; // JSON字符串，存储真实的签署链接

  // 订单类别与职培订单字段
  orderCategory?: 'housekeeping' | 'training';
  trainingLeadId?: string;
  courseAmount?: number;
  serviceFeeAmount?: number;
  intendedCourses?: string[];
  consultPosition?: string;
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