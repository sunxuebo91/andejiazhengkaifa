export interface Contract {
  _id: string;
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
  createdBy: string | { _id: string; name: string; username: string };
  createdByUser?: { name: string; username: string } | null;
  createdAt: string;
  updatedAt: string;
}

export enum ContractType {
  HOURLY_WORKER = '小时工',
  NANNY_CHILDCARE = '保姆/育儿嫂',
  MATERNITY_NURSE = '月嫂'
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
}

export interface Worker {
  _id: string;
  name: string;
  phone: string;
  idNumber: string;
  age: number;
  jobType: string;
  nativePlace: string;
} 