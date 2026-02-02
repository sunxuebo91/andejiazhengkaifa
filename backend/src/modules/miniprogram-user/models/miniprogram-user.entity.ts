import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * 小程序用户实体
 * 用于存储小程序端用户的注册信息
 *
 * 注意：
 * - openid 是主要标识（小程序启动时可直接获取）
 * - phone 是可选的（需要用户授权才能获取）
 * - 匿名用户只有 openid，没有 phone
 */
@Schema({ timestamps: true, collection: 'miniprogram_users' })
export class MiniProgramUser extends Document {
  @Prop({ sparse: true, unique: true })
  phone?: string; // 手机号（可选，需要用户授权）

  @Prop({ sparse: true, unique: true })
  username?: string; // 账号（可选，用户自定义账号）

  @Prop()
  password?: string; // 密码（加密存储）

  @Prop()
  nickname?: string; // 昵称

  @Prop()
  avatar?: string; // 头像URL（微信头像或用户上传的图片URL）

  @Prop()
  avatarFile?: string; // 头像文件路径（用户上传的图片文件）

  @Prop({ required: true, unique: true })
  openid: string; // 微信openid（主要标识）

  @Prop()
  unionid?: string; // 微信unionid

  @Prop({ default: 'active' })
  status: string; // 状态：active-活跃, inactive-不活跃, blocked-已封禁

  @Prop()
  lastLoginAt?: Date; // 最近登录时间

  @Prop()
  lastLoginIp?: string; // 最近登录IP

  @Prop()
  loginCount: number; // 登录次数

  @Prop()
  gender?: number; // 性别：0-未知, 1-男, 2-女

  @Prop()
  city?: string; // 城市

  @Prop()
  province?: string; // 省份

  @Prop()
  country?: string; // 国家

  @Prop()
  language?: string; // 语言

  @Prop({ type: Object })
  extra?: Record<string, any>; // 额外信息

  // timestamps: true 会自动添加 createdAt 和 updatedAt
}

export const MiniProgramUserSchema = SchemaFactory.createForClass(MiniProgramUser);

// 创建索引
MiniProgramUserSchema.index({ phone: 1 });
MiniProgramUserSchema.index({ username: 1 });
MiniProgramUserSchema.index({ openid: 1 });
MiniProgramUserSchema.index({ createdAt: -1 });
MiniProgramUserSchema.index({ lastLoginAt: -1 });

