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
    this.logger.log(`创建面试间: ${dto.roomId}, 主持人: ${userId}, 关联简历: ${dto.resumeId || '无'}`);

    // 🔥 第一步：自动关闭该用户所有活跃的面试间
    await this.autoCloseUserActiveRooms(userId, dto.hostZegoUserId);

    // 🔥 第二步：创建新的面试间（包含简历关联信息）
    const roomData: any = {
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
    };

    // 添加简历关联信息（如果有）
    if (dto.resumeId) {
      roomData.resumeId = new Types.ObjectId(dto.resumeId);
    }
    if (dto.candidateName) {
      roomData.candidateName = dto.candidateName;
    }
    if (dto.candidatePhone) {
      roomData.candidatePhone = dto.candidatePhone;
    }
    if (dto.candidatePosition) {
      roomData.candidatePosition = dto.candidatePosition;
    }

    const room = new this.interviewRoomModel(roomData);
    const savedRoom = await room.save();
    this.logger.log(`面试间创建成功: ${savedRoom.roomId}, 关联简历: ${savedRoom.resumeId || '无'}`);

    // 🔥 第三步：在 ZegoService 内存中注册房间（用于定时清理任务）
    try {
      this.zegoService.createRoom(dto.roomId, dto.hostZegoUserId);
      this.logger.log(`✅ 房间已在 ZegoService 中注册: ${dto.roomId}`);
    } catch (error) {
      this.logger.warn(`⚠️ 注册房间到 ZegoService 失败: ${dto.roomId}`, error);
    }

    return savedRoom;
  }

  /**
   * 自动关闭用户所有活跃的面试间（私有方法）
   */
  private async autoCloseUserActiveRooms(userId: string, newHostZegoUserId: string): Promise<void> {
    this.logger.log(`🔍 检查用户 ${userId} 是否有活跃的面试间`);

    // 1. 查询该用户所有活跃的面试间
    const activeRooms = await this.interviewRoomModel.find({
      hostUserId: new Types.ObjectId(userId),
      status: 'active',
    }).exec();

    if (activeRooms.length === 0) {
      this.logger.log(`✅ 用户没有活跃的面试间，可以直接创建新面试间`);
      return;
    }

    this.logger.log(`🔄 发现 ${activeRooms.length} 个活跃面试间，准备自动关闭`);

    // 2. 遍历关闭所有活跃面试间
    for (const room of activeRooms) {
      try {
        this.logger.log(`🔄 正在关闭旧面试间: ${room.roomId}, 旧主持人: ${room.hostZegoUserId}`);

        // 更新数据库状态
        const endedAt = new Date();
        const duration = Math.floor((endedAt.getTime() - room.createdAt.getTime()) / 1000);

        room.status = 'ended';
        room.endedAt = endedAt;
        room.duration = duration;
        await room.save();

        this.logger.log(`✅ 数据库状态已更新: ${room.roomId}`);

        // 解散 ZEGO 房间 - 使用旧面试间自己的 hostZegoUserId
        try {
          await this.zegoService.dismissRoom(room.roomId, room.hostZegoUserId);
          this.logger.log(`✅ ZEGO 房间已解散: ${room.roomId}`);
        } catch (error) {
          this.logger.warn(`⚠️ 解散 ZEGO 房间失败: ${room.roomId}`, error);
          // ZEGO 解散失败不影响数据库更新，继续处理
        }

        this.logger.log(`✅ 已自动关闭旧面试间: ${room.roomId}, 持续时长: ${duration}秒`);
      } catch (error) {
        this.logger.error(`❌ 关闭面试间失败: ${room.roomId}`, error);
        // 某个面试间关闭失败，继续处理下一个
      }
    }

    this.logger.log(`✅ 所有旧面试间已关闭，准备创建新面试间`);
  }

  /**
   * 获取用户当前活跃的面试间
   */
  async getUserActiveRoom(userId: string): Promise<InterviewRoom | null> {
    this.logger.log(`🔍 查询用户 ${userId} 的活跃面试间`);

    const activeRoom = await this.interviewRoomModel
      .findOne({
        hostUserId: new Types.ObjectId(userId),
        status: 'active',
      })
      .sort({ createdAt: -1 }) // 获取最新的活跃面试间
      .exec();

    if (activeRoom) {
      this.logger.log(`✅ 找到活跃面试间: ${activeRoom.roomId}`);
    } else {
      this.logger.log(`✅ 用户没有活跃的面试间`);
    }

    return activeRoom;
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
   * 自动结束面试间（由 ZegoService 定时任务调用）
   * 用于处理3分钟无人自动关闭的情况
   */
  async autoEndRoom(roomId: string): Promise<void> {
    this.logger.log(`🤖 自动结束面试间: ${roomId}`);

    const room = await this.interviewRoomModel.findOne({ roomId }).exec();

    if (!room) {
      this.logger.warn(`面试间不存在: ${roomId}`);
      return;
    }

    // 如果已经结束，跳过
    if (room.status === 'ended') {
      this.logger.log(`面试间已结束，跳过: ${roomId}`);
      return;
    }

    // 更新状态
    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - room.createdAt.getTime()) / 1000);

    room.status = 'ended';
    room.endedAt = endedAt;
    room.duration = duration;

    await room.save();
    this.logger.log(`✅ 面试间已自动结束: ${roomId}, 持续时长: ${duration}秒`);
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

  /**
   * 添加参与者（访客加入时调用）
   */
  async addParticipant(
    roomId: string,
    userId: string,
    userName: string,
    role: 'customer' | 'helper',
  ) {
    this.logger.log(`添加参与者到面试间: ${roomId}, 用户: ${userName}, 角色: ${role}`);

    const room = await this.interviewRoomModel.findOne({ roomId });

    if (!room) {
      this.logger.warn(`面试间不存在: ${roomId}`);
      return null;
    }

    // 检查参与者是否已存在
    const existingParticipant = room.participants.find(
      (p) => p.userId === userId,
    );

    if (existingParticipant) {
      this.logger.log(`参与者已存在: ${userId}`);
      return room;
    }

    // 添加参与者（访客统一使用'guest'角色，identity字段记录具体身份）
    room.participants.push({
      userId,
      userName,
      role: 'guest', // 访客统一使用'guest'角色
      identity: role, // 将customer/helper保存到identity字段
      joinedAt: new Date(),
    });

    await room.save();
    this.logger.log(`✅ 参与者已添加: ${userName} (${role})`);

    return room;
  }

  /**
   * 移除参与者（访客离开时调用）
   */
  async removeParticipant(roomId: string, userId: string) {
    this.logger.log(`移除参与者: ${roomId}, 用户: ${userId}`);

    const room = await this.interviewRoomModel.findOne({ roomId });

    if (!room) {
      this.logger.warn(`面试间不存在: ${roomId}`);
      return null;
    }

    // 移除参与者
    room.participants = room.participants.filter((p) => p.userId !== userId);

    await room.save();
    this.logger.log(`✅ 参与者已移除: ${userId}`);

    return room;
  }
}
