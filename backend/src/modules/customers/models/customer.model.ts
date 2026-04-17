import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  name: string;

  @Prop({ unique: true, sparse: true })
  phone: string;

  @Prop({ unique: true, sparse: true })
  wechatId: string;

  @Prop()
  idCardNumber: string;

  @Prop({
    required: true,
    enum: ['美团', '抖音', '快手', '小红书', '转介绍', '99保姆网', '杭州同馨', '握个手平台', '线索购买', '莲心', '美家', '天机鹿', '孕妈联盟', '高阁', '星星', '妈妈网', '犀牛', '宝宝树', '幼亲舒', '熊猫', '官网', '其他'],
    default: '其他'  // 防止空值
  })
  leadSource: string;

  @Prop({
    enum: ['月嫂', '住家育儿嫂', '保洁', '住家保姆', '养宠', '小时工', '白班育儿', '白班保姆', '住家护老', '家教', '陪伴师']
  })
  serviceCategory: string;

  @Prop({
    required: true,
    enum: ['已签约', '签约中', '匹配中', '已面试', '流失客户', '已退款', '退款中', '待定']
  })
  contractStatus: string;

  @Prop({
    required: true,
    enum: ['O类', 'A类', 'B类', 'C类', 'D类', '流失']
  })
  leadLevel: string;

  @Prop()
  salaryBudget: number;

  @Prop()
  expectedStartDate: Date;

  @Prop()
  homeArea: number;

  @Prop()
  familySize: number;

  @Prop({
    enum: ['单休', '双休', '无休', '调休', '待定']
  })
  restSchedule: string;

  @Prop()
  address: string;

  @Prop()
  area: string; // 地区

  @Prop()
  ageRequirement: string;

  @Prop()
  genderRequirement: string;

  @Prop()
  originRequirement: string;

  @Prop({
    enum: ['无学历', '小学', '初中', '中专', '职高', '高中', '大专', '本科', '研究生及以上']
  })
  educationRequirement: string;

  @Prop()
  expectedDeliveryDate: Date;

  @Prop()
  remarks: string;

  @Prop()
  dealAmount: number; // 成交金额

  // 客户需求详情（内联编辑卡片专用字段）
  @Prop()
  needOrderType: string; // 订单类型

  @Prop()
  needWorkingHours: string; // 工作时间

  @Prop()
  needSalary: string; // 薪资要求

  @Prop()
  needRestTime: string; // 休息时间

  @Prop()
  needFamilyMembers: string; // 家庭成员

  @Prop()
  needServiceAddress: string; // 服务地址

  @Prop()
  needHouseArea: string; // 房屋面积

  @Prop()
  needWorkContent: string; // 工作内容

  @Prop()
  needRemarks: string; // 需求备注

  @Prop()
  needServicePeriod: string; // 服务周期

  @Prop()
  needOnboardingTime: string; // 上户时间

  @Prop({ required: true })
  createdBy: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastUpdatedBy: Types.ObjectId;

  // 客户分配相关字段
  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo: Types.ObjectId; // 当前负责人

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedBy: Types.ObjectId; // 分配人（管理员）

  @Prop()
  assignedAt: Date; // 分配时间

  @Prop()
  assignmentReason: string; // 分配原因/备注

  // 公海相关字段
  @Prop({ default: false })
  inPublicPool: boolean; // 是否在公海中

  @Prop()
  publicPoolEntryTime: Date; // 进入公海的时间

  @Prop()
  publicPoolEntryReason: string; // 进入公海的原因

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastFollowUpBy: Types.ObjectId; // 最后跟进人

  @Prop()
  lastFollowUpTime: Date; // 最后跟进时间

  @Prop({ default: 0 })
  claimCount: number; // 被领取次数（用于统计）

  // 线索流转相关字段
  @Prop({ default: Date.now })
  lastActivityAt: Date; // 最后活动时间（关键字段，用于判断是否需要流转）

  @Prop({ default: true })
  autoTransferEnabled: boolean; // 是否允许自动流转

  @Prop({ default: 0 })
  transferCount: number; // 被流转次数统计

  @Prop()
  lastTransferredAt: Date; // 最后一次被流转的时间

  // 冻结相关字段
  @Prop({ default: false })
  isFrozen: boolean; // 是否被冻结（冻结后不参与公海掉落和线索流转）

  @Prop()
  frozenAt: Date; // 冻结时间

  @Prop({ type: Types.ObjectId, ref: 'User' })
  frozenBy: Types.ObjectId; // 冻结操作人

  @Prop()
  frozenReason: string; // 冻结原因

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  // 系统生成的客户ID
  @Prop()
  customerId: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// 索引：按负责人和更新时间常用查询
CustomerSchema.index({ assignedTo: 1, updatedAt: -1 });
CustomerSchema.index({ assignedBy: 1, assignedAt: -1 });
// 公海相关索引
CustomerSchema.index({ inPublicPool: 1, publicPoolEntryTime: -1 });
CustomerSchema.index({ lastFollowUpTime: 1 });
// 线索流转相关索引（优化自动流转查询性能）
CustomerSchema.index({
  assignedTo: 1,
  contractStatus: 1,
  lastActivityAt: 1,
  autoTransferEnabled: 1,
  inPublicPool: 1
});
