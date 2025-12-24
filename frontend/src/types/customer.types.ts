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
  contractStatus: '已签约' | '匹配中' | '已面试' | '流失客户' | '已退款' | '退款中' | '待定';
  leadLevel: 'A类' | 'B类' | 'C类' | 'D类' | '流失';
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
  dealAmount?: number;
  createdBy: string;
  createdByUser?: { name: string; username: string } | null;
  lastUpdatedBy?: string;
  lastUpdatedByUser?: { name: string; username: string } | null;
  followUps?: CustomerFollowUp[];
  // 分配信息
  assignedTo?: string;
  assignedBy?: string;
  assignedToUser?: { name: string; username: string } | null;
  assignedByUser?: { name: string; username: string } | null;
  assignedAt?: string;
  assignmentReason?: string;
  // 公海相关字段
  inPublicPool?: boolean;
  publicPoolEntryTime?: string;
  publicPoolEntryReason?: string;
  lastFollowUpBy?: string;
  lastFollowUpTime?: string;
  claimCount?: number;
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
  // 创建时可选指定负责人
  assignedTo?: string;
  assignmentReason?: string;
}

export interface CustomerQuery {
  search?: string;
  caregiverName?: string;
  caregiverPhone?: string;
  leadSource?: string;
  serviceCategory?: string;
  contractStatus?: string;
  leadLevel?: string;
  assignedTo?: string; // 可选：按负责人筛选
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
export const LEAD_SOURCES = ['美团', '抖音', '快手', '小红书', '转介绍', '杭州同馨', '握个手平台', '线索购买', '莲心', '美家', '天机鹿', '孕妈联盟', '高阁', '星星', '妈妈网', '犀牛', '宝宝树', '其他'] as const;

export const SERVICE_CATEGORIES = [
  '月嫂', '住家育儿嫂', '保洁', '住家保姆', '养宠', '小时工', '白班育儿', '白班保姆', '住家护老'
] as const;

export const CONTRACT_STATUSES = ['已签约', '匹配中', '已面试', '流失客户', '已退款', '退款中', '待定'] as const;

export const LEAD_LEVELS = ['O类', 'A类', 'B类', 'C类', 'D类', '流失'] as const;

export const REST_SCHEDULES = ['单休', '双休', '无休', '调休', '待定'] as const;

export const EDUCATION_REQUIREMENTS = [
  '无学历', '小学', '初中', '中专', '职高', '高中', '大专', '本科', '研究生及以上'
] as const;

// 公海相关类型
export interface PublicPoolLog {
  _id: string;
  customerId: string;
  action: 'enter' | 'claim' | 'assign' | 'release';
  operatorId: string;
  fromUserId?: string;
  toUserId?: string;
  reason?: string;
  operatedAt: string;
  operatorUser?: { name: string; username: string };
  fromUser?: { name: string; username: string };
  toUser?: { name: string; username: string };
}

export interface PublicPoolStatistics {
  total: number;
  todayEntered: number;
  todayClaimed: number;
  byLeadSource: Record<string, number>;
  byLeadLevel: Record<string, number>;
}