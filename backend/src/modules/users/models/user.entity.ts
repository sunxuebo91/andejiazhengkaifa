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
  suspended?: boolean; // 账号是否被暂停
  monthlyTask?: number; // 本月任务（数量）
  // 微信相关字段
  wechatOpenId?: string;
  wechatNickname?: string;
  wechatAvatar?: string;
  // 推荐返费系统字段
  isAdmin?: boolean;
  isActive?: boolean;
  leftAt?: Date;
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

  @Prop({ default: false })
  suspended?: boolean; // 账号是否被暂停

  @Prop()
  monthlyTask?: number; // 本月任务（数量）

  // 微信相关字段
  @Prop()
  wechatOpenId?: string;

  @Prop()
  wechatNickname?: string;

  @Prop()
  wechatAvatar?: string;

  // 推荐返费系统字段
  @Prop({ default: false })
  isAdmin?: boolean; // 是否为管理员

  @Prop({ default: true })
  isActive?: boolean; // 是否在职，默认 true；标记离职时设为 false

  @Prop()
  leftAt?: Date; // 离职日期（离职时由管理员填写），是返费归属的分割线
}

export const UserSchema = SchemaFactory.createForClass(User);