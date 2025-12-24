// 保单状态枚举
export enum PolicyStatus {
  PENDING = 'pending',         // 待支付
  PROCESSING = 'processing',   // 处理中
  ACTIVE = 'active',           // 已生效
  EXPIRED = 'expired',         // 已过期
  CANCELLED = 'cancelled',     // 已注销
  SURRENDERED = 'surrendered', // 已退保
}

// 被保险人信息
export interface InsuredPerson {
  insuredId?: string;
  insuredName: string;
  insuredType?: string; // 1-成人, 2-儿童, 3-老人
  idType: string;       // 1-身份证, 2-护照, 3-其他等
  idNumber: string;
  birthDate: string;    // yyyyMMddHHmmss
  gender: string;       // M-男, F-女, O-其他
  mobile?: string;
  email?: string;
  occupationCode?: string;
  occupationName?: string;
  relationShip?: string; // 与投保人关系
}

// 投保人信息
export interface PolicyHolder {
  policyHolderType: string; // I-个人, C-企业
  policyHolderName: string;
  phIdType: string;
  phIdNumber: string;
  phBirthDate?: string;
  gender?: string;
  phTelephone?: string;
  phAddress?: string;
  phPostCode?: string;
  phEmail?: string;
  reqFaPiao?: string;  // 是否打印发票
  reqMail?: string;    // 是否邮寄发票
  mailType?: string;   // 1-平邮, 2-快递
  phProvinceCode?: string;
  phCityCode?: string;
  phDistrictCode?: string;
}

// 返佣信息
export interface RebateInfo {
  rebateRate: number;
  rebateCusName: string;
  rebateCusIdNo: string;
  rebateAccountNo: string;
  rebateBankKeepMobile: string;
  rebateDelayDays?: number;
  rebateMoney?: string;
  executeDate?: string;
  taskState?: string;
}

// 微信支付信息
export interface WechatPayInfo {
  appId?: string;
  timeStamp?: string;
  nonceStr?: string;
  packageValue?: string;
  sign?: string;
  prepayId?: string;
  webUrl?: string;
}

// 保险保单
export interface InsurancePolicy {
  _id: string;
  agencyPolicyRef: string;
  policyNo?: string;
  orderId?: string;
  productCode?: string;
  planCode: string;
  issueDate?: string;
  effectiveDate: string;
  expireDate: string;
  groupSize: number;
  totalPremium: number;
  premiumCalType?: string;
  destination?: string;
  remark?: string;
  serviceAddress?: string;
  workOrderId?: string;
  policyHolder: PolicyHolder;
  insuredList: InsuredPerson[];
  rebateInfo?: RebateInfo;
  status: PolicyStatus;
  policyPdfUrl?: string;
  authUrl?: string;
  wechatPayInfo?: WechatPayInfo;
  resumeId?: string;
  createdBy?: string;
  errorMessage?: string;
  rawResponse?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// 创建保单请求数据
export interface CreatePolicyData {
  productCode?: string;
  planCode: string;
  effectiveDate: string;
  expireDate: string;
  groupSize: number;
  totalPremium: number;
  premiumCalType?: string;
  destination?: string;
  remark?: string;
  serviceAddress?: string;
  workOrderId?: string;
  policyHolder: PolicyHolder;
  insuredList: InsuredPerson[];
  rebateInfo?: RebateInfo;
  resumeId?: string;
}

// 查询保单请求数据
export interface QueryPolicyData {
  agencyPolicyRef?: string;
  policyNo?: string;
}

// 注销保单请求数据
export interface CancelPolicyData {
  policyNo: string;
}

// 打印保单请求数据
export interface PrintPolicyData {
  policyNo: string;
  reasonRemark?: string;
}

// 电子发票请求数据
export interface InvoiceData {
  policyNo: string;
  amount: number;
  phone?: string;
  mail?: string;
  invoiceHead?: string;
  invoiceHeadType: string; // 01-个人, 02-公司/企业
  invoiceTaxpayerId?: string;
}

// 退保请求数据
export interface SurrenderPolicyData {
  policyNo: string;
  removeReason: string; // 13-退票退保, 14-航班取消, 15-航班改签
}

// 原被保险人简化信息（批改接口用）
export interface OldInsuredInfo {
  insuredName: string;
  idType: string;
  idNumber: string;
}

// 新被保险人信息（批改接口用）
export interface NewInsuredInfo {
  insuredName: string;
  idType: string;
  idNumber: string;
  birthDate: string;
  gender: string;
  mobile?: string;
}

// 批改请求数据
export interface AmendPolicyData {
  policyNo: string;
  oldInsured: OldInsuredInfo;
  newInsured: NewInsuredInfo;
}

// 批增请求数据
export interface AddInsuredData {
  policyNo: string;
  totalPremium: number;
  insuredList: InsuredPerson[];
}

// 大树保API响应
export interface DashubaoResponse {
  Success: string;
  Message?: string;
  OrderId?: string;
  PolicyNo?: string;
  PolicyPdfUrl?: string;
  AgencyPolicyRef?: string;
  TotalPremium?: string;
  AuthUrl?: string;
  SurrenderPremium?: string;
  WeChatAppId?: string;
  WeChatTimeStamp?: string;
  WeChatNonceStr?: string;
  WeChatPackageValue?: string;
  WeChatSign?: string;
  WeChatPrepayId?: string;
  WeChatWebUrl?: string;
}

// 证件类型选项
export const ID_TYPE_OPTIONS = [
  { value: '1', label: '身份证' },
  { value: '2', label: '护照' },
  { value: '3', label: '其他' },
  { value: '4', label: '军人证' },
  { value: '5', label: '港澳台居民居住证' },
  { value: '6', label: '港澳居民来往内地通行证' },
  { value: '7', label: '台湾居民来往大陆通行证' },
  { value: '8', label: '外国人永久居留身份证' },
];

// 性别选项
export const GENDER_OPTIONS = [
  { value: 'M', label: '男' },
  { value: 'F', label: '女' },
  { value: 'O', label: '其他' },
];

// 投保人类型选项
export const POLICY_HOLDER_TYPE_OPTIONS = [
  { value: 'I', label: '个人' },
  { value: 'C', label: '企业' },
];

// 保单状态显示
export const POLICY_STATUS_MAP: Record<PolicyStatus, { text: string; color: string }> = {
  [PolicyStatus.PENDING]: { text: '待支付', color: 'orange' },
  [PolicyStatus.PROCESSING]: { text: '处理中', color: 'blue' },
  [PolicyStatus.ACTIVE]: { text: '已生效', color: 'green' },
  [PolicyStatus.EXPIRED]: { text: '已过期', color: 'default' },
  [PolicyStatus.CANCELLED]: { text: '已注销', color: 'red' },
  [PolicyStatus.SURRENDERED]: { text: '已退保', color: 'purple' },
};

// 发票抬头类型
export const INVOICE_HEAD_TYPE_OPTIONS = [
  { value: '01', label: '个人' },
  { value: '02', label: '公司/企业' },
  { value: '03', label: '政府机构' },
  { value: '04', label: '其他' },
];

// 退保原因
export const SURRENDER_REASON_OPTIONS = [
  { value: '13', label: '退票退保' },
  { value: '14', label: '航班取消' },
  { value: '15', label: '航班改签' },
];

