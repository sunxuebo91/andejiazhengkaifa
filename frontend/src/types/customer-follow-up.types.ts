// 客户跟进方式枚举
export enum CustomerFollowUpType {
  PHONE = 'phone',      // 电话跟进
  WECHAT = 'wechat',    // 微信跟进
  VISIT = 'visit',      // 到店跟进
  OTHER = 'other'       // 其他
}

// 跟进方式选项
export const FOLLOW_UP_TYPE_OPTIONS = [
  { value: CustomerFollowUpType.PHONE, label: '电话跟进' },
  { value: CustomerFollowUpType.WECHAT, label: '微信跟进' },
  { value: CustomerFollowUpType.VISIT, label: '到店跟进' },
  { value: CustomerFollowUpType.OTHER, label: '其他' },
] as const;

// 跟进记录接口
export interface CustomerFollowUp {
  _id: string;
  customerId: string;
  type: CustomerFollowUpType;
  content: string;
  createdBy: {
    _id: string;
    name: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 创建跟进记录数据接口
export interface CreateCustomerFollowUpData {
  type: CustomerFollowUpType;
  content: string;
}

// 跟进记录响应接口
export interface CustomerFollowUpResponse {
  success: boolean;
  message: string;
  data: CustomerFollowUp | CustomerFollowUp[];
} 