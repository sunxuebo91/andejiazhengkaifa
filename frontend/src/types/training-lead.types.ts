// 线索状态枚举
export enum LeadStatus {
  FOLLOWING = '跟进中',
  ENROLLED = '已报名',
  GRADUATED = '已结业',
  NEW_NOT_FOLLOWED_UP = '新客未跟进',
  TRANSFER_NOT_FOLLOWED_UP = '流转未跟进',
  NOT_FOLLOWED_UP = '未跟进',
  NOT_FOLLOWED_UP_7_DAYS = '7天未跟进',
  NOT_FOLLOWED_UP_15_DAYS = '15天未跟进',
  VISITED = '已到店',
  INVALID = '无效线索'
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
  studentId: string;
  name: string;
  gender?: string;
  age?: number;
  consultPosition?: string;
  phone?: string;
  wechatId?: string;
  leadSource?: string;
  trainingType?: string;
  intendedCourses?: string[];
  reportedCertificates?: string[];
  intentionLevel?: string;
  leadGrade?: string;
  expectedStartDate?: string;
  budget?: number;
  courseAmount?: number;
  serviceFeeAmount?: number;
  isOnlineCourse?: boolean;
  address?: string;
  isReported?: boolean;
  studentOwner?: UserInfo | string;
  remarks?: string;
  status: string;
  createdBy: UserInfo | string;
  assignedTo?: UserInfo | string;
  referredBy?: UserInfo | string; // 用户归属（生成分享链接/二维码的用户）
  lastFollowUpAt?: string;
  inPublicPool?: boolean;
  publicPoolAt?: string;
  publicPoolReason?: 'manual' | 'invalid';
  createdAt: string;
  updatedAt: string;
  followUps?: TrainingLeadFollowUp[];
  followUpStatus?: string | null;      // 注意力标记：'新客未跟进' | '流转未跟进' | null
  lastFollowUpResult?: string | null;  // 最近跟进结果：'已接通' | '未接通' | '已回复' | '未回复' | ...
}

// 跟进记录接口
export interface TrainingLeadFollowUp {
  _id: string;
  leadId: string;
  type: string;
  followUpResult: string;  // 跟进结果
  contactSuccess: boolean; // 是否联系成功
  content: string;
  nextFollowUpDate?: string;
  createdBy: UserInfo | string;
  createdAt: string;
  updatedAt: string;
}

// 创建培训线索DTO
export interface CreateTrainingLeadDto {
  name: string;
  gender?: string;
  age?: number;
  consultPosition?: string;
  phone?: string;
  wechatId?: string;
  leadSource?: string;
  trainingType?: string;
  intendedCourses?: string[];
  reportedCertificates?: string[];
  intentionLevel?: string;
  leadGrade?: string;
  expectedStartDate?: string;
  budget?: number;
  courseAmount?: number;
  serviceFeeAmount?: number;
  isOnlineCourse?: boolean;
  address?: string;
  isReported?: boolean;
  studentOwner?: string;
  remarks?: string;
}

// 更新培训线索DTO
export interface UpdateTrainingLeadDto extends Partial<CreateTrainingLeadDto> {}

// 查询参数
export interface TrainingLeadQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  leadSource?: string;
  trainingType?: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: string;
  isReported?: boolean;
  studentOwner?: string;
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
  followUpResult: string;
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

// 选项配置（全量，用于列表筛选/颜色映射）
export const LEAD_STATUS_OPTIONS = [
  { label: '跟进中', value: LeadStatus.FOLLOWING, color: '#fa8c16' },
  { label: '已报名', value: LeadStatus.ENROLLED, color: '#13c2c2' },
  { label: '已结业', value: LeadStatus.GRADUATED, color: '#52c41a' },
  { label: '新客未跟进', value: LeadStatus.NEW_NOT_FOLLOWED_UP, color: '#ff4d4f' },
  { label: '流转未跟进', value: LeadStatus.TRANSFER_NOT_FOLLOWED_UP, color: '#faad14' },
  { label: '未跟进', value: LeadStatus.NOT_FOLLOWED_UP, color: '#faad14' },
  { label: '7天未跟进', value: LeadStatus.NOT_FOLLOWED_UP_7_DAYS, color: '#ff7a45' },
  { label: '15天未跟进', value: LeadStatus.NOT_FOLLOWED_UP_15_DAYS, color: '#ff4d4f' },
  { label: '已到店', value: LeadStatus.VISITED, color: '#1890ff' },
  { label: '无效线索', value: LeadStatus.INVALID, color: '#d9d9d9' }
];

// 仅限人工手动选择的终态（创建/编辑表单下拉专用）
// 其余状态（跟进中/新客未跟进/流转未跟进/7天未跟进/15天未跟进/未跟进）由系统自动计算，不在表单中出现
export const LEAD_STATUS_MANUAL_OPTIONS = [
  { label: '已报名', value: LeadStatus.ENROLLED, color: '#13c2c2' },
  { label: '已到店', value: LeadStatus.VISITED, color: '#1890ff' },
  { label: '已结业', value: LeadStatus.GRADUATED, color: '#52c41a' },
  { label: '无效线索', value: LeadStatus.INVALID, color: '#d9d9d9' },
];

export const LEAD_SOURCE_OPTIONS = [
  { label: '美团', value: '美团' },
  { label: '抖音', value: '抖音' },
  { label: '快手', value: '快手' },
  { label: '小红书', value: '小红书' },
  { label: '转介绍', value: '转介绍' },
  { label: '幼亲舒', value: '幼亲舒' },
  { label: 'BOSS直聘', value: 'BOSS直聘' },
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

// 跟进结果选项（根据跟进方式动态选择）
export const FOLLOW_UP_RESULT_OPTIONS: Record<string, Array<{ label: string; value: string; color: string }>> = {
  电话: [
    { label: '已接通', value: '已接通', color: '#52c41a' },
    { label: '未接通', value: '未接通', color: '#ff4d4f' },
    { label: '关机', value: '关机', color: '#8c8c8c' },
    { label: '停机', value: '停机', color: '#8c8c8c' },
    { label: '拒接', value: '拒接', color: '#ff4d4f' },
    { label: '忙线', value: '忙线', color: '#faad14' }
  ],
  微信: [
    { label: '已回复', value: '已回复', color: '#52c41a' },
    { label: '未回复', value: '未回复', color: '#faad14' },
    { label: '已读未回', value: '已读未回', color: '#faad14' },
    { label: '已拉黑', value: '已拉黑', color: '#ff4d4f' }
  ],
  到店: [
    { label: '已到店', value: '已到店', color: '#52c41a' },
    { label: '未到店', value: '未到店', color: '#ff4d4f' },
    { label: '爽约', value: '爽约', color: '#ff4d4f' }
  ],
  其他: [
    { label: '成功', value: '成功', color: '#52c41a' },
    { label: '失败', value: '失败', color: '#ff4d4f' }
  ]
};

export const LEAD_GRADE_OPTIONS = [
  { label: 'A', value: 'A', color: '#f5222d' },
  { label: 'B', value: 'B', color: '#fa8c16' },
  { label: 'C', value: 'C', color: '#faad14' },
  { label: 'D', value: 'D', color: '#52c41a' },
  { label: 'O', value: 'O', color: '#8c8c8c' },
];
