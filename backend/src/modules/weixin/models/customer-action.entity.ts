import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CustomerAction extends Document {
  @Prop({ required: true })
  customerId: string; // 客户ID

  @Prop({ required: true })
  advisorId: string; // 顾问ID

  @Prop({ required: true })
  actionType: string; // 行为类型：view_resume, contact_advisor, etc.

  @Prop({ type: Object, required: true })
  actionData: any; // 行为相关数据

  @Prop()
  customerName: string; // 客户姓名

  @Prop()
  customerPhone: string; // 客户电话

  @Prop()
  resumeId: string; // 简历ID（如果是查看简历行为）

  @Prop()
  ip: string; // 客户IP地址

  @Prop()
  userAgent: string; // 用户代理

  @Prop({ default: false })
  notified: boolean; // 是否已通知顾问

  @Prop()
  customerRecordId: string; // 关联的客户记录ID（如果创建了客户）
}

export const CustomerActionSchema = SchemaFactory.createForClass(CustomerAction);
