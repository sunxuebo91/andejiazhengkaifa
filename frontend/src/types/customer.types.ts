import { CustomerFollowUp } from './customer-follow-up.types';

export interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  wechatId?: string;
  idCardNumber?: string;
  leadSource: '美团' | '抖音' | '快手' | '小红书' | '转介绍' | '其他';
  serviceCategory: '月嫂' | '住家育儿嫂' | '保洁' | '住家保姆' | '养宠' | '小时工' | '白班育儿' | '白班保姆' | '住家护老';
  contractStatus: '已签约' | '匹配中' | '流失客户' | '已退款' | '退款中' | '待定';
  leadLevel: 'A类' | 'B类' | 'C类' | 'D类';
  salaryBudget: number;
  expectedStartDate: string;
  homeArea: number;
  familySize: number;
  restSchedule: '单休' | '双休' | '无休' | '调休' | '待定';
  address: string;
  ageRequirement?: string;
  genderRequirement?: string;
  originRequirement?: string;
  educationRequirement?: string;
  expectedDeliveryDate?: string;
  remarks?: string;
  createdBy: string;
  createdByUser?: { name: string; username: string } | null;
  lastUpdatedBy?: string;
  lastUpdatedByUser?: { name: string; username: string } | null;
  followUps?: CustomerFollowUp[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerData {
  name: string;
  phone: string;
  wechatId?: string;
  idCardNumber?: string;
  leadSource: string;
  serviceCategory?: string;
  contractStatus: string;
  leadLevel?: string;
  salaryBudget?: number;
  expectedStartDate?: string;
  homeArea?: number;
  familySize?: number;
  restSchedule?: string;
  address?: string;
  ageRequirement?: string;
  genderRequirement?: string;
  originRequirement?: string;
  educationRequirement?: string;
  expectedDeliveryDate?: string;
  remarks?: string;
}

export interface CustomerQuery {
  search?: string;
  caregiverName?: string;
  caregiverPhone?: string;
  leadSource?: string;
  serviceCategory?: string;
  contractStatus?: string;
  leadLevel?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerStatistics {
  total: number;
  byContractStatus: Record<string, number>;
  byLeadSource: Record<string, number>;
  byServiceCategory: Record<string, number>;
}

// 选项常量
export const LEAD_SOURCES = ['美团', '抖音', '快手', '小红书', '转介绍', '其他'] as const;

export const SERVICE_CATEGORIES = [
  '月嫂', '住家育儿嫂', '保洁', '住家保姆', '养宠', '小时工', '白班育儿', '白班保姆', '住家护老'
] as const;

export const CONTRACT_STATUSES = ['已签约', '匹配中', '流失客户', '已退款', '退款中', '待定'] as const;

export const LEAD_LEVELS = ['A类', 'B类', 'C类', 'D类'] as const;

export const REST_SCHEDULES = ['单休', '双休', '无休', '调休', '待定'] as const;

export const EDUCATION_REQUIREMENTS = [
  '无学历', '小学', '初中', '中专', '职高', '高中', '大专', '本科', '研究生及以上'
] as const; 