import { ContractStatus } from './models/contract.model';

// 以订单为中心的数据一致性同步：同步门槛 —— 仅对"已签约 + 最新"的合同执行
export const SYNCABLE_CONTRACT_STATUSES: ContractStatus[] = [
  ContractStatus.SIGNED,
  ContractStatus.ACTIVE,
];

// Customer → Contract 的字段白名单（客户档案被编辑时，下发到合同的反范式化字段）
export const CUSTOMER_TO_CONTRACT_FIELD_MAP = {
  name: 'customerName',
  phone: 'customerPhone',
  idCardNumber: 'customerIdCard',
  address: 'customerAddress',
} as const;

export type CustomerSyncSourceField = keyof typeof CUSTOMER_TO_CONTRACT_FIELD_MAP;

// Resume → Contract 的字段白名单（阿姨简历被编辑时，下发到合同的反范式化字段）
// 注意：workerSalary 不在白名单内 —— 属合同条款，签约时已定
export const RESUME_TO_CONTRACT_FIELD_MAP = {
  name: 'workerName',
  phone: 'workerPhone',
  idNumber: 'workerIdCard',
  currentAddress: 'workerAddress',
} as const;

export type ResumeSyncSourceField = keyof typeof RESUME_TO_CONTRACT_FIELD_MAP;

// Contract → Customer 的字段白名单（合同签约时回灌到客户档案）
export const CONTRACT_TO_CUSTOMER_FIELD_MAP = {
  customerName: 'name',
  customerPhone: 'phone',
  customerIdCard: 'idCardNumber',
  customerAddress: 'address',
} as const;

// Contract → Resume 的字段白名单（合同签约时回灌到阿姨简历）
export const CONTRACT_TO_RESUME_FIELD_MAP = {
  workerName: 'name',
  workerPhone: 'phone',
  workerIdCard: 'idNumber',
} as const;

// 空值保护：白名单中哪些字段禁止用空值覆盖已有值
// （身份证号、手机号、姓名、地址都不允许被空值抹掉）
export const NEVER_OVERWRITE_WITH_EMPTY = new Set<string>([
  'name',
  'phone',
  'idCardNumber',
  'idNumber',
  'address',
  'currentAddress',
  'customerName',
  'customerPhone',
  'customerIdCard',
  'customerAddress',
  'workerName',
  'workerPhone',
  'workerIdCard',
  'workerAddress',
]);

// 敏感字段（非空→非空的变更允许，但必须额外打高亮审计）
export const SENSITIVE_FIELDS = new Set<string>([
  'idCardNumber',
  'idNumber',
  'customerIdCard',
  'workerIdCard',
]);

// 同步来源标识（写入 contract.lastProfileSyncSource）
export enum ContractProfileSyncSource {
  CONTRACT_SIGNED = 'contract_signed',
  CONTRACT_TERMINATED = 'contract_terminated',
  CUSTOMER_UPDATE = 'customer_update',
  RESUME_UPDATE = 'resume_update',
}

// 判断一个字符串值是否视为"空"
export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

// 规范化：trim 字符串，非字符串原样返回
export function normalize(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
