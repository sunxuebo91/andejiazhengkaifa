import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

// 定义不包含密码的用户数据接口
export interface UserWithoutPassword {
  _id: any;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: string;
  department?: string;
  permissions: string[];
  active: boolean;
  // 微信相关字段
  wechatOpenId?: string;
  wechatNickname?: string;
  wechatAvatar?: string;
  createdAt?: any;
  updatedAt?: any;
  __v?: number;
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  avatar?: string;

  @Prop({ required: true })
  role: string;

  @Prop()
  department?: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: true })
  active: boolean;

  // 微信相关字段
  @Prop()
  wechatOpenId?: string;

  @Prop()
  wechatNickname?: string;

  @Prop()
  wechatAvatar?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);