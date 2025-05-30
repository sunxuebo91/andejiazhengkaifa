import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class Role extends Document {
  @ApiProperty({ description: '角色名称' })
  @Prop({ required: true, unique: true })
  name: string;

  @ApiProperty({ description: '角色描述' })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ description: '权限列表', type: [String] })
  @Prop({ type: [String], default: [] })
  permissions: string[];

  @ApiProperty({ description: '是否激活' })
  @Prop({ default: true })
  active: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role); 