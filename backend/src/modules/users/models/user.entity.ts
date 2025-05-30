import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

// 定义不包含密码的用户数据接口
export interface UserWithoutPassword {
  _id: any;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  permissions: string[];
  active: boolean;
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

  @Prop({ required: true })
  role: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: true })
  active: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);