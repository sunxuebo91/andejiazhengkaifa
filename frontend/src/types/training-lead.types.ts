// 客户分级枚举
export enum LeadLevel {
  A = 'A类',
  B = 'B类',
  C = 'C类',
  D = 'D类',
  CLOSED = '0-成交'
}

// 线索状态枚举
export enum LeadStatus {
  NEW = '新线索',
  FOLLOWING = '跟进中',
  CLOSED = '已成交',
  LOST = '已流失'
}

// 意向程度枚举
export enum IntentionLevel {
  HIGH = '高',
  MEDIUM = '中',
  LOW = '低'
}

// 跟进方式枚举
export enum FollowUpType {
  PHONE = '电话',
  WECHAT = '微信',
  VISIT = '到店',
  OTHER = '其他'
}

// 用户信息接口
export interface UserInfo {
  _id: string;
  name: string;
  username: string;
}

// 培训线索接口
export interface TrainingLead {
  _id: string;
  leadId: string;
  name: string;
  phone?: string;
  wechatId?: string;
  leadLevel: string;
  leadSource?: string;
  trainingType?: string;
  intendedCourses?: string[];
  intentionLevel?: string;
  expectedStartDate?: string;
  budget?: number;
  address?: string;
  remarks?: string;
  status: string;
  createdBy: UserInfo | string;
  assignedTo?: UserInfo | string;
  referredBy?: UserInfo | string; // 用户归属（生成分享链接/二维码的用户）
  lastFollowUpAt?: string;
  createdAt: string;
  updatedAt: string;
  followUps?: TrainingLeadFollowUp[];
}

// 跟进记录接口
export interface TrainingLeadFollowUp {
  _id: string;
  leadId: string;
  type: string;
  content: string;
  nextFollowUpDate?: string;
  createdBy: UserInfo | string;
  createdAt: string;
  updatedAt: string;
}

// 创建培训线索DTO
export interface CreateTrainingLeadDto {
  name: string;
  phone?: string;
  wechatId?: string;
  leadLevel: string;
  leadSource?: string;
  trainingType?: string;
  intendedCourses?: string[];
  intentionLevel?: string;
  expectedStartDate?: string;
  budget?: number;
  address?: string;
  remarks?: string;
}

// 更新培训线索DTO
export interface UpdateTrainingLeadDto extends Partial<CreateTrainingLeadDto> {}

// 查询参数
export interface TrainingLeadQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  leadLevel?: string;
  status?: string;
  leadSource?: string;
  trainingType?: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: string;
}

// 列表响应
export interface TrainingLeadListResponse {
  items: TrainingLead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 创建跟进记录DTO
export interface CreateTrainingLeadFollowUpDto {
  type: string;
  content: string;
  nextFollowUpDate?: string;
}

// 分享令牌响应
export interface ShareTokenResponse {
  token: string;
  expireAt: string;
  shareUrl: string;
  qrCodeUrl: string;
}

// 选项配置
export const LEAD_LEVEL_OPTIONS = [
  { label: 'A类', value: LeadLevel.A, color: '#f5222d' },
  { label: 'B类', value: LeadLevel.B, color: '#fa8c16' },
  { label: 'C类', value: LeadLevel.C, color: '#1890ff' },
  { label: 'D类', value: LeadLevel.D, color: '#8c8c8c' },
  { label: '0-成交', value: LeadLevel.CLOSED, color: '#52c41a' }
];

export const LEAD_STATUS_OPTIONS = [
  { label: '新线索', value: LeadStatus.NEW, color: '#1890ff' },
  { label: '跟进中', value: LeadStatus.FOLLOWING, color: '#fa8c16' },
  { label: '已成交', value: LeadStatus.CLOSED, color: '#52c41a' },
  { label: '已流失', value: LeadStatus.LOST, color: '#8c8c8c' }
];

export const LEAD_SOURCE_OPTIONS = [
  { label: '美团', value: '美团' },
  { label: '抖音', value: '抖音' },
  { label: '快手', value: '快手' },
  { label: '小红书', value: '小红书' },
  { label: '转介绍', value: '转介绍' },
  { label: '其他', value: '其他' }
];

export const TRAINING_TYPE_OPTIONS = [
  { label: '月嫂', value: '月嫂' },
  { label: '育儿嫂', value: '育儿嫂' },
  { label: '保姆', value: '保姆' },
  { label: '护老', value: '护老' },
  { label: '师资', value: '师资' }
];

export const INTENDED_COURSES_OPTIONS = [
  { label: '高级母婴护理师', value: '高级母婴护理师' },
  { label: '高级催乳师', value: '高级催乳师' },
  { label: '高级产后修复师', value: '高级产后修复师' },
  { label: '月子餐营养师', value: '月子餐营养师' },
  { label: '高级育婴师', value: '高级育婴师' },
  { label: '早教指导师', value: '早教指导师' },
  { label: '辅食营养师', value: '辅食营养师' },
  { label: '小儿推拿师', value: '小儿推拿师' },
  { label: '高级养老护理师', value: '高级养老护理师' },
  { label: '早教精英班', value: '早教精英班' }
];

export const INTENTION_LEVEL_OPTIONS = [
  { label: '高', value: IntentionLevel.HIGH },
  { label: '中', value: IntentionLevel.MEDIUM },
  { label: '低', value: IntentionLevel.LOW }
];

export const FOLLOW_UP_TYPE_OPTIONS = [
  { label: '电话', value: FollowUpType.PHONE, icon: '📞' },
  { label: '微信', value: FollowUpType.WECHAT, icon: '💬' },
  { label: '到店', value: FollowUpType.VISIT, icon: '🏠' },
  { label: '其他', value: FollowUpType.OTHER, icon: '📝' }
];

