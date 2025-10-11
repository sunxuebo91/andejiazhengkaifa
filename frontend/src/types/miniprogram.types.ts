/**
 * 小程序专用类型定义
 */

import { Customer, CreateCustomerData } from './customer.types';

// 小程序用户角色权限
export interface MiniprogramUserPermissions {
  role: '系统管理员' | '经理' | '普通员工';
  canViewAllCustomers: boolean;
  canEditAllCustomers: boolean;
  canAssignCustomers: boolean;
  canViewStatistics: boolean;
  canViewAssignmentLogs: boolean;
  dataScope: 'all' | 'department' | 'own';
}

// 小程序页面状态
export interface MiniprogramPageState {
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
}

// 小程序列表查询参数
export interface MiniprogramListQuery {
  page: number;
  limit: number;
  search?: string;
  contractStatus?: string;
  leadSource?: string;
  serviceCategory?: string;
  leadLevel?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 小程序客户表单状态
export interface MiniprogramCustomerFormState {
  data: Partial<CreateCustomerData>;
  errors: Record<string, string>;
  submitting: boolean;
  mode: 'create' | 'edit';
  originalData?: Customer;
}

// 小程序客户详情页面数据
export interface MiniprogramCustomerDetailData {
  customer: Customer;
  followUps: CustomerFollowUp[];
  assignmentLogs: CustomerAssignmentLog[];
  permissions: {
    canEdit: boolean;
    canAssign: boolean;
    canViewFollowUps: boolean;
    canCreateFollowUp: boolean;
    canViewAssignmentLogs: boolean;
  };
}

// 小程序跟进记录
export interface CustomerFollowUp {
  _id: string;
  customerId: string;
  type: 'phone' | 'wechat' | 'visit' | 'other';
  content: string;
  createdBy: string;
  createdByUser?: {
    name: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 小程序分配历史记录
export interface CustomerAssignmentLog {
  _id: string;
  customerId: string;
  oldAssignedTo?: string;
  newAssignedTo: string;
  assignedBy: string;
  assignedAt: string;
  reason?: string;
  oldAssignedToUser?: {
    name: string;
    username: string;
  };
  newAssignedToUser?: {
    name: string;
    username: string;
  };
  assignedByUser?: {
    name: string;
    username: string;
  };
}

// 小程序统计数据
export interface MiniprogramStatistics {
  overview: {
    totalCustomers: number;
    myCustomers: number;
    todayNew: number;
    thisWeekNew: number;
  };
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  sourceDistribution: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  trends: Array<{
    date: string;
    newCustomers: number;
    signedCustomers: number;
  }>;
}

// 小程序搜索建议
export interface MiniprogramSearchSuggestion {
  type: 'customer' | 'phone' | 'recent';
  value: string;
  label: string;
  extra?: string;
}

// 小程序筛选选项
export interface MiniprogramFilterOption {
  label: string;
  value: string;
  count?: number;
  selected?: boolean;
}

// 小程序筛选配置
export interface MiniprogramFilterConfig {
  contractStatus: MiniprogramFilterOption[];
  leadSource: MiniprogramFilterOption[];
  serviceCategory: MiniprogramFilterOption[];
  leadLevel: MiniprogramFilterOption[];
}

// 小程序操作按钮配置
export interface MiniprogramActionButton {
  key: string;
  label: string;
  icon?: string;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  visible?: boolean;
  onClick: () => void;
}

// 小程序表单字段配置
export interface MiniprogramFormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'phone';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
  visible?: boolean;
  disabled?: boolean;
}

// 小程序通知消息
export interface MiniprogramNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// 小程序缓存数据
export interface MiniprogramCacheData {
  customers: Customer[];
  lastUpdateTime: number;
  version: string;
}

// 小程序同步状态
export interface MiniprogramSyncStatus {
  lastSyncTime: string;
  syncing: boolean;
  hasChanges: boolean;
  conflictCount: number;
}

// 小程序网络状态
export interface MiniprogramNetworkStatus {
  online: boolean;
  networkType: string;
  signalStrength: number;
}

// 小程序设备信息
export interface MiniprogramDeviceInfo {
  platform: string;
  version: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

// 小程序用户偏好设置
export interface MiniprogramUserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
  };
  display: {
    pageSize: number;
    showAvatar: boolean;
    compactMode: boolean;
  };
}

// 小程序错误信息
export interface MiniprogramError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  requestId?: string;
}

// 小程序API请求选项
export interface MiniprogramRequestOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
  showLoading?: boolean;
  loadingText?: string;
  showError?: boolean;
  errorHandler?: (error: MiniprogramError) => void;
}

// 小程序分页信息
export interface MiniprogramPagination {
  current: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
}

// 小程序排序配置
export interface MiniprogramSortConfig {
  field: string;
  order: 'asc' | 'desc';
  label: string;
}

// 小程序导出配置
export interface MiniprogramExportConfig {
  format: 'excel' | 'csv' | 'pdf';
  fields: string[];
  filters: Record<string, any>;
  filename?: string;
}

// 小程序批量操作
export interface MiniprogramBatchOperation {
  type: 'assign' | 'delete' | 'export' | 'update';
  selectedIds: string[];
  params?: Record<string, any>;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
}

export default {};
