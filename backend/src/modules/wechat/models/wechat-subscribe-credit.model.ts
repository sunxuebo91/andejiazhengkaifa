import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WechatSubscribeCreditDocument = WechatSubscribeCredit & Document;

/**
 * 服务号订阅通知额度
 * 一次员工订阅授权 = 一次发送额度
 * 唯一键：(openid, templateId)
 */
@Schema({ timestamps: true, collection: 'wechat_subscribe_credits' })
export class WechatSubscribeCredit {
  @Prop({ required: true, index: true })
  openid: string;

  @Prop({ required: true, index: true })
  templateId: string;

  @Prop({ default: 0 })
  remaining: number;

  @Prop({ default: 0 })
  totalSubscribed: number;

  @Prop({ default: 0 })
  totalSent: number;

  @Prop()
  lastSubscribedAt?: Date;

  @Prop()
  lastSentAt?: Date;
}

export const WechatSubscribeCreditSchema = SchemaFactory.createForClass(WechatSubscribeCredit);
WechatSubscribeCreditSchema.index({ openid: 1, templateId: 1 }, { unique: true });
