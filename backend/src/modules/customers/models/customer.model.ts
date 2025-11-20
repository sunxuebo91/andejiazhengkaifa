import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  name: string;

  @Prop({ unique: true, sparse: true })
  phone: string;

  @Prop()
  wechatId: string;

  @Prop()
  idCardNumber: string;

  @Prop({
    required: true,
    enum: ['美团', '抖音', '快手', '小红书', '转介绍', '杭州同馨', '握个手平台', '线索购买', '莲心', '美家', '天机鹿', '孕妈联盟', '高阁', '星星', '其他']
  })
  leadSource: string;

  @Prop({
    enum: ['月嫂', '住家育儿嫂', '保洁', '住家保姆', '养宠', '小时工', '白班育儿', '白班保姆', '住家护老']
  })
  serviceCategory: string;

  @Prop({
    required: true,
    enum: ['已签约', '匹配中', '流失客户', '已退款', '退款中', '待定']
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
