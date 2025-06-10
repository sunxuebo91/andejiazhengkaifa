import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ 
    required: true,
    enum: ['美团', '抖音', '快手', '小红书社群线索', '转介绍', '其他']
  })
  leadSource: string;

  @Prop({
    required: true,
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
    enum: ['A类', 'B类', 'C类', 'D类']
  })
  leadLevel: string;

  @Prop({ required: true })
  salaryBudget: number;

  @Prop({ required: true })
  expectedStartDate: Date;

  @Prop({ required: true })
  homeArea: number;

  @Prop({ required: true })
  familySize: number;

  @Prop({
    required: true,
    enum: ['单休', '双休', '无休', '调休', '待定']
  })
  restSchedule: string;

  @Prop({ required: true })
  address: string;

  @Prop()
  ageRequirement: string;

  @Prop()
  genderRequirement: string;

  @Prop()
  originRequirement: string;

  @Prop()
  expectedDeliveryDate: Date;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  // 系统生成的客户ID
  @Prop()
  customerId: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer); 