/**
 * 小程序专用工具函数
 * 包含数据验证、格式化、错误处理等功能
 */

import { CreateCustomerData } from '../types/customer.types';

/**
 * 表单验证错误接口
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * 小程序客户表单验证
 */
export const validateCustomerForm = (data: Partial<CreateCustomerData>): ValidationError[] => {
  const errors: ValidationError[] = [];

  // 必填字段验证
  if (!data.name?.trim()) {
    errors.push({ field: 'name', message: '客户姓名不能为空' });
  }

  // 手机号改为可选，但如果填写了需要验证格式
  if (data.phone?.trim() && !isValidPhoneNumber(data.phone)) {
    errors.push({ field: 'phone', message: '请输入有效的手机号码' });
  }

  if (!data.leadSource) {
    errors.push({ field: 'leadSource', message: '请选择线索来源' });
  }

  if (!data.contractStatus) {
    errors.push({ field: 'contractStatus', message: '请选择客户状态' });
  }

  // 线索等级改为必填
  if (!data.leadLevel) {
    errors.push({ field: 'leadLevel', message: '请选择线索等级' });
  }

  // 可选字段验证
  if (data.salaryBudget && (data.salaryBudget < 1000 || data.salaryBudget > 50000)) {
    errors.push({ field: 'salaryBudget', message: '薪资预算应在1000-50000元之间' });
  }

  if (data.homeArea && (data.homeArea < 10 || data.homeArea > 1000)) {
    errors.push({ field: 'homeArea', message: '家庭面积应在10-1000平方米之间' });
  }

  if (data.familySize && (data.familySize < 1 || data.familySize > 20)) {
    errors.push({ field: 'familySize', message: '家庭人口应在1-20人之间' });
  }

  return errors;
};

/**
 * 验证手机号格式
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone.trim());
};

/**
 * 格式化客户表单数据
 */
export const formatCustomerFormData = (data: Partial<CreateCustomerData>): CreateCustomerData => {
  return {
    name: data.name?.trim() || '',
    phone: data.phone?.trim() || '',
    wechatId: data.wechatId?.trim() || undefined,
    idCardNumber: data.idCardNumber?.trim() || undefined,
    leadSource: data.leadSource || '',
    serviceCategory: data.serviceCategory || undefined,
    contractStatus: data.contractStatus || '',
    leadLevel: data.leadLevel || undefined,
    salaryBudget: data.salaryBudget ? Number(data.salaryBudget) : undefined,
    expectedStartDate: data.expectedStartDate || undefined,
    homeArea: data.homeArea ? Number(data.homeArea) : undefined,
    familySize: data.familySize ? Number(data.familySize) : undefined,
    restSchedule: data.restSchedule || undefined,
    address: data.address?.trim() || undefined,
    ageRequirement: data.ageRequirement?.trim() || undefined,
    genderRequirement: data.genderRequirement?.trim() || undefined,
    originRequirement: data.originRequirement?.trim() || undefined,
    educationRequirement: data.educationRequirement || undefined,
    expectedDeliveryDate: data.expectedDeliveryDate || undefined,
    remarks: data.remarks?.trim() || undefined,
    assignedTo: data.assignedTo || undefined,
    assignmentReason: data.assignmentReason?.trim() || undefined,
  };
};

/**
 * 格式化日期显示
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * 格式化相对时间（如：2小时前）
 */
export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return '刚刚';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return formatDate(dateString);
    }
  } catch (error) {
    return dateString;
  }
};

/**
 * 获取客户状态的显示样式
 */
export const getCustomerStatusStyle = (status: string): { color: string; backgroundColor: string } => {
  const statusStyles: Record<string, { color: string; backgroundColor: string }> = {
    '已签约': { color: '#52c41a', backgroundColor: '#f6ffed' },
    '匹配中': { color: '#1890ff', backgroundColor: '#e6f7ff' },
    '已面试': { color: '#13c2c2', backgroundColor: '#e6fffb' },
    '流失客户': { color: '#ff4d4f', backgroundColor: '#fff2f0' },
    '已退款': { color: '#faad14', backgroundColor: '#fffbe6' },
    '退款中': { color: '#fa8c16', backgroundColor: '#fff7e6' },
    '待定': { color: '#8c8c8c', backgroundColor: '#f5f5f5' },
  };

  return statusStyles[status] || { color: '#8c8c8c', backgroundColor: '#f5f5f5' };
};

/**
 * 获取线索等级的显示样式
 */
export const getLeadLevelStyle = (level: string): { color: string; backgroundColor: string } => {
  const levelStyles: Record<string, { color: string; backgroundColor: string }> = {
    'A类': { color: '#ff4d4f', backgroundColor: '#fff2f0' },
    'B类': { color: '#fa8c16', backgroundColor: '#fff7e6' },
    'C类': { color: '#faad14', backgroundColor: '#fffbe6' },
    'D类': { color: '#8c8c8c', backgroundColor: '#f5f5f5' },
  };

  return levelStyles[level] || { color: '#8c8c8c', backgroundColor: '#f5f5f5' };
};

/**
 * 处理API错误
 */
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return '网络错误，请重试';
  }
};

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * 节流函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 深拷贝对象
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  
  return obj;
};

/**
 * 生成唯一ID
 */
export const generateUniqueId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 检查是否为空值
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
};

/**
 * 安全的JSON解析
 */
export const safeJsonParse = <T>(jsonString: string, defaultValue: T): T => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON解析失败:', error);
    return defaultValue;
  }
};

/**
 * 安全的JSON字符串化
 */
export const safeJsonStringify = (obj: any): string => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('JSON字符串化失败:', error);
    return '{}';
  }
};
