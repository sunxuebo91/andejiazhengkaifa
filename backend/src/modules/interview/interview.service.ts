import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InterviewRoom } from './models/interview-room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryRoomsDto } from './dto/query-rooms.dto';
import { ZegoService } from '../zego/zego.service';

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    @InjectModel(InterviewRoom.name)
    private readonly interviewRoomModel: Model<InterviewRoom>,
    @Inject(forwardRef(() => ZegoService))
    private readonly zegoService: ZegoService,
  ) {}

  /**
   * 创建面试间
   */
  async createRoom(userId: string, dto: CreateRoomDto): Promise<InterviewRoom> {
    this.logger.log(`创建面试间: ${dto.roomId}, 主持人: ${userId}`);

    const room = new this.interviewRoomModel({
      roomId: dto.roomId,
      roomName: dto.roomName,
      hostUserId: new Types.ObjectId(userId),
      hostName: dto.hostName,
      hostZegoUserId: dto.hostZegoUserId,
      status: 'active',
      createdAt: new Date(),
      participants: [
        {
          userId: dto.hostZegoUserId,
          userName: dto.hostName,
          role: 'host',
          joinedAt: new Date(),
        },
      ],
    });

    const savedRoom = await room.save();
    this.logger.log(`面试间创建成功: ${savedRoom.roomId}`);
    return savedRoom;
  }

  /**
   * 根据主持人ID查询面试间列表
   */
  async findByHostUserId(userId: string, query: QueryRoomsDto) {
    const { status, page = 1, pageSize = 10, search } = query;

    // 构建查询条件
    const filter: any = {
      hostUserId: new Types.ObjectId(userId),
    };

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { roomName: { $regex: search, $options: 'i' } },
        { roomId: { $regex: search, $options: 'i' } },
      ];
    }

    // 执行分页查询
    const skip = (page - 1) * pageSize;
    const [rooms, total] = await Promise.all([
      this.interviewRoomModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.interviewRoomModel.countDocuments(filter),
    ]);

    return {
      list: rooms,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据roomId查询单个面试间
   */
  async findOne(roomId: string, userId: string): Promise<InterviewRoom> {
    const room = await this.interviewRoomModel.findOne({ roomId }).exec();

    if (!room) {
      throw new NotFoundException('面试间不存在');
    }

    // 验证所有权
    if (room.hostUserId.toString() !== userId) {
      throw new ForbiddenException('无权访问此面试间');
    }

    return room;
  }

  /**
   * 结束面试间
   */
  async endRoom(roomId: string, userId: string): Promise<InterviewRoom> {
    const room = await this.interviewRoomModel.findOne({ roomId }).exec();

    if (!room) {
      throw new NotFoundException('面试间不存在');
    }

    // 验证所有权
    if (room.hostUserId.toString() !== userId) {
      throw new ForbiddenException('无权操作此面试间');
    }

    // 检查是否已结束
    if (room.status === 'ended') {
      return room;
    }

    // 更新状态
    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - room.createdAt.getTime()) / 1000);

    room.status = 'ended';
    room.endedAt = endedAt;
    room.duration = duration;

    const updatedRoom = await room.save();

    // 调用 ZEGO 服务解散房间
    try {
      await this.zegoService.dismissRoom(roomId, room.hostZegoUserId);
      this.logger.log(`ZEGO 房间已解散: ${roomId}`);
    } catch (error) {
      this.logger.warn(`解散 ZEGO 房间失败: ${roomId}`, error);
    }

    return updatedRoom;
  }

  /**
   * 检查面试间状态（数据库 + ZEGO 内存）
   */
  async checkRoomStatus(roomId: string, userId: string) {
    const room = await this.interviewRoomModel.findOne({ roomId }).exec();

    if (!room) {
      throw new NotFoundException('面试间不存在');
    }

    // 验证所有权
    if (room.hostUserId.toString() !== userId) {
      throw new ForbiddenException('无权访问此面试间');
    }

    // 检查 ZEGO 内存状态
    const zegoStatus = this.zegoService.checkRoom(roomId);

    return {
      roomId: room.roomId,
      roomName: room.roomName,
      dbStatus: room.status,
      zegoExists: zegoStatus.exists,
      zegoCanJoin: zegoStatus.canJoin,
      isDismissed: zegoStatus.isDismissed,
      createdAt: room.createdAt,
      endedAt: room.endedAt,
      duration: room.duration,
    };
  }
}
