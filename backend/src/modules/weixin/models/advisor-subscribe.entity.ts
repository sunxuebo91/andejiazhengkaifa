import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AdvisorSubscribe extends Document {
  @Prop({ required: true })
  advisorId: string; // 顾问ID

  @Prop({ required: true })
  openid: string; // 微信用户openid

  @Prop({ required: true })
  templateId: string; // 订阅消息模板ID

  @Prop({ required: true, default: true })
  subscribed: boolean; // 是否已订阅

  @Prop()
  subscribeTime: Date; // 订阅时间

  @Prop()
  unsubscribeTime: Date; // 取消订阅时间

  @Prop({ type: Object })
  subscribeData?: any; // 订阅时的额外数据

  @Prop({ default: true })
  active: boolean; // 是否激活
}

export const AdvisorSubscribeSchema = SchemaFactory.createForClass(AdvisorSubscribe);
