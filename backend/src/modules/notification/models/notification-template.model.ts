import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * 通知类型枚举
 */
export enum NotificationType {
  // 简历相关
  RESUME_CREATED = 'RESUME_CREATED',                   // 新简历创建
  RESUME_STATUS_CHANGED = 'RESUME_STATUS_CHANGED',     // 简历状态变更
  RESUME_ASSIGNED = 'RESUME_ASSIGNED',                 // 简历被分配
  RESUME_ORDER_STATUS_CHANGED = 'RESUME_ORDER_STATUS_CHANGED', // 接单状态变更
  RESUME_FOLLOW_UP_DUE = 'RESUME_FOLLOW_UP_DUE',      // 简历长期未跟进
  RESUME_RELEASE_REQUESTED = 'RESUME_RELEASE_REQUESTED', // 他人首次签约触发，通知简历创建人释放
  
  // 客户相关
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',               // 新客户创建
  CUSTOMER_ASSIGNED = 'CUSTOMER_ASSIGNED',             // 客户分配
  CUSTOMER_TRANSFERRED = 'CUSTOMER_TRANSFERRED',       // 客户转移
  CUSTOMER_RECLAIMED = 'CUSTOMER_RECLAIMED',           // 客户回收到公海
  CUSTOMER_ASSIGNED_FROM_POOL = 'CUSTOMER_ASSIGNED_FROM_POOL', // 从公海分配
  CUSTOMER_STATUS_CHANGED = 'CUSTOMER_STATUS_CHANGED', // 客户状态变更
  CUSTOMER_FOLLOW_UP_DUE = 'CUSTOMER_FOLLOW_UP_DUE',  // 客户长期未跟进

  // 线索自动流转相关
  LEAD_AUTO_TRANSFER_OUT = 'LEAD_AUTO_TRANSFER_OUT',   // 线索流出通知
  LEAD_AUTO_TRANSFER_IN = 'LEAD_AUTO_TRANSFER_IN',     // 线索流入通知
  
  // 合同相关
  CONTRACT_CREATED = 'CONTRACT_CREATED',               // 合同创建
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',                 // 合同签署完成
  CONTRACT_WORKER_CHANGED = 'CONTRACT_WORKER_CHANGED', // 合同换人
  CONTRACT_EXPIRING_SOON = 'CONTRACT_EXPIRING_SOON',  // 合同即将到期
  CONTRACT_STATUS_CHANGED = 'CONTRACT_STATUS_CHANGED', // 合同状态变更

  // 职培线索相关
  TRAINING_LEAD_ASSIGNED = 'TRAINING_LEAD_ASSIGNED',           // 线索分配/流转给你
  TRAINING_LEAD_FOLLOW_UP_ADDED = 'TRAINING_LEAD_FOLLOW_UP_ADDED', // 有人跟进了你的线索
  TRAINING_LEAD_CREATED = 'TRAINING_LEAD_CREATED',             // 新线索创建（通知管理员）

  // 职培线索自动流转相关
  TRAINING_LEAD_AUTO_TRANSFER_OUT = 'TRAINING_LEAD_AUTO_TRANSFER_OUT', // 学员线索流出通知
  TRAINING_LEAD_AUTO_TRANSFER_IN = 'TRAINING_LEAD_AUTO_TRANSFER_IN',   // 学员线索流入通知

  // 表单相关
  FORM_SUBMISSION_RECEIVED = 'FORM_SUBMISSION_RECEIVED',           // 表单提交通知（通知归属人）
  FORM_SUBMISSION_RECEIVED_ADMIN = 'FORM_SUBMISSION_RECEIVED_ADMIN', // 表单提交通知（通知表单创建者/管理员）

  // 跟进记录相关（家政简历/客户）
  RESUME_FOLLOW_UP_ADDED = 'RESUME_FOLLOW_UP_ADDED',     // 简历新增跟进记录
  CUSTOMER_FOLLOW_UP_ADDED = 'CUSTOMER_FOLLOW_UP_ADDED', // 客户新增跟进记录

  // 合同审批相关
  CONTRACT_APPROVAL_REQUESTED = 'CONTRACT_APPROVAL_REQUESTED', // 合同删除审批申请
  CONTRACT_APPROVAL_APPROVED = 'CONTRACT_APPROVAL_APPROVED',   // 合同删除审批通过
  CONTRACT_APPROVAL_REJECTED = 'CONTRACT_APPROVAL_REJECTED',   // 合同删除审批驳回

  // 阿姨黑名单
  AUNT_BLACKLISTED = 'AUNT_BLACKLISTED',               // 阿姨被拉黑通知（管理员）

  // 面试
  INTERVIEW_INVITED = 'INTERVIEW_INVITED',             // 面试邀请通知

  // 员工评价
  EMPLOYEE_EVALUATION_RECEIVED = 'EMPLOYEE_EVALUATION_RECEIVED', // 员工评价提交通知

  // 日报相关
  DAILY_REPORT_PERSONAL = 'DAILY_REPORT_PERSONAL',     // 个人日报
  DAILY_REPORT_TEAM = 'DAILY_REPORT_TEAM',            // 团队日报
  WEEKLY_REPORT = 'WEEKLY_REPORT',                     // 周报
  MONTHLY_REPORT = 'MONTHLY_REPORT',                   // 月报

  // 推荐奖励系统（CRM 侧铃铛通知）
  REFERRAL_NEW_REFERRER_APPROVAL = 'REFERRAL_NEW_REFERRER_APPROVAL', // 新推荐人待审批（通知管理员/来源员工）

  // 系统相关
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',         // 系统公告
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',           // 权限变更
  ACCOUNT_SECURITY = 'ACCOUNT_SECURITY',               // 账号安全
}

/**
 * 通知优先级
 */
export enum NotificationPriority {
  HIGH = 'HIGH',       // 高优先级
  MEDIUM = 'MEDIUM',   // 中优先级
  LOW = 'LOW',         // 低优先级
}

/**
 * 通知模板
 */
@Schema({ timestamps: true })
export class NotificationTemplate extends Document {
  @Prop({ type: String, required: true, unique: true, enum: Object.values(NotificationType) })
  type: NotificationType;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: String, required: true })
  title: string; // 支持变量: {{变量名}}

  @Prop({ type: String, required: true })
  content: string; // 支持变量: {{变量名}}

  @Prop({ type: String, enum: Object.values(NotificationPriority), default: NotificationPriority.MEDIUM })
  priority: NotificationPriority;

  @Prop({ type: Boolean, default: true })
  enabled: boolean;

  @Prop({ type: String })
  icon?: string; // 图标名称

  @Prop({ type: String })
  color?: string; // 颜色

  @Prop({ type: String })
  actionUrl?: string; // 点击跳转的URL模板

  @Prop({ type: String })
  actionText?: string; // 操作按钮文本

  @Prop({ type: Object })
  metadata?: Record<string, any>; // 额外的元数据
}

export const NotificationTemplateSchema = SchemaFactory.createForClass(NotificationTemplate);

