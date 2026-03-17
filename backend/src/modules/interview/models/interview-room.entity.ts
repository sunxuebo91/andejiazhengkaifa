import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// 参与者子文档
@Schema({ _id: false })
export class Participant {
  @Prop({ required: true })
  userId: string; // ZEGO 用户ID（guest_xxx 或 user_xxx）

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true, enum: ['host', 'guest'] })
  role: 'host' | 'guest';

  @Prop()
  identity?: string; // 访客身份（求职者填写的）

  @Prop({ required: true })
  joinedAt: Date;

  @Prop()
  leftAt?: Date;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

// 面试间主实体
@Schema({ timestamps: true, collection: 'interview_rooms' })
export class InterviewRoom extends Document {
  @Prop({ required: true, unique: true, index: true })
  roomId: string; // 房间ID（唯一）

  @Prop({ required: true })
  roomName: string; // 房间名称

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  hostUserId: Types.ObjectId; // 主持人用户ID（关联User表，用于权限控制）

  @Prop({ required: true })
  hostName: string; // 主持人姓名

  @Prop({ required: true })
  hostZegoUserId: string; // 主持人ZEGO用户ID（user_xxx格式）

  @Prop({ required: true, enum: ['active', 'ended'], default: 'active', index: true })
  status: 'active' | 'ended'; // 状态

  @Prop({ enum: ['pc', 'miniprogram'], default: 'pc' })
  source?: 'pc' | 'miniprogram'; // 创建来源：PC端或小程序H5

  @Prop()
  hostUrl?: string; // 主持人重新进入的URL（带token）

  @Prop({ required: true })
  createdAt: Date; // 创建时间

  @Prop()
  endedAt?: Date; // 结束时间

  @Prop()
  duration?: number; // 持续时长（秒）

  @Prop({ type: [ParticipantSchema], default: [] })
  participants: Participant[]; // 参与者列表

  // ==================== 新增：简历关联 ====================
  @Prop({ type: Types.ObjectId, ref: 'Resume', index: true })
  resumeId?: Types.ObjectId; // 关联的简历ID

  @Prop()
  candidateName?: string; // 候选人姓名（冗余存储，方便显示）

  @Prop()
  candidatePhone?: string; // 候选人手机号（冗余存储）

  @Prop()
  candidatePosition?: string; // 候选人应聘职位（冗余存储）

  // ==================== 新增：面试评价 ====================
  @Prop({ type: Number, min: 1, max: 5 })
  rating?: number; // 面试评分（1-5星）

  @Prop()
  interviewNote?: string; // 面试备注/评价
}

export const InterviewRoomSchema = SchemaFactory.createForClass(InterviewRoom);

// 创建索引
InterviewRoomSchema.index({ hostUserId: 1, status: 1 });
InterviewRoomSchema.index({ createdAt: -1 });
InterviewRoomSchema.index({ resumeId: 1 }); // 简历关联索引
