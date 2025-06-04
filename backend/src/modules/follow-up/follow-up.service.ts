import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FollowUp, FollowUpType } from './models/follow-up.entity';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { User } from '../users/models/user.entity';

// 定义填充后的用户信息类型
export interface PopulatedUser {
  _id: Types.ObjectId;
  name: string;
  username: string;
}

// 定义填充后的跟进记录类型
export interface PopulatedFollowUp extends Omit<FollowUp, 'createdBy'> {
  createdBy: PopulatedUser;
}

@Injectable()
export class FollowUpService {
  constructor(
    @InjectModel(FollowUp.name) private followUpModel: Model<FollowUp>,
    @InjectModel('User') private userModel: Model<User>,
  ) {}

  // 创建跟进记录
  async create(createFollowUpDto: CreateFollowUpDto, userId: string): Promise<PopulatedFollowUp> {
    // 验证用户是否存在并获取用户信息
    const user = await this.userModel.findById(userId).select('name username').lean();
    if (!user) {
      throw new NotFoundException('创建跟进记录的用户不存在');
    }
    
    console.log('创建跟进记录的用户信息:', user);
    
    // 创建跟进记录
    const followUp = new this.followUpModel({
      ...createFollowUpDto,
      resumeId: new Types.ObjectId(createFollowUpDto.resumeId),
      createdBy: new Types.ObjectId(userId),
    });

    // 保存跟进记录
    const savedFollowUp = await followUp.save();
    
    // 由于配置了自动填充,直接查询即可获取填充后的数据
    const populatedFollowUp = await this.followUpModel
      .findById(savedFollowUp._id)
      .exec();
      
    if (!populatedFollowUp) {
      throw new NotFoundException('跟进记录创建后未找到');
    }

    // 转换为普通对象并返回
    const result = populatedFollowUp.toObject();
    console.log('保存后的跟进记录(带用户信息):', result);

    return result as unknown as PopulatedFollowUp;
  }

  // 获取简历的所有跟进记录
  async findByResumeId(resumeId: string, page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;
    
    // 添加查询前的日志
    console.log('查询跟进记录参数:', { resumeId, page, pageSize });
    
    const [followUps, total] = await Promise.all([
      this.followUpModel
        .find({ resumeId: new Types.ObjectId(resumeId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate({
          path: 'createdBy',
          select: 'name username',
          model: 'User'
        })
        .lean()
        .exec(),
      this.followUpModel.countDocuments({ resumeId: new Types.ObjectId(resumeId) })
    ]);

    // 添加详细的调试日志
    console.log('跟进记录查询结果:', {
      total,
      firstRecord: followUps[0] ? {
        id: followUps[0]._id,
        createdBy: followUps[0].createdBy,
        type: followUps[0].type,
        content: followUps[0].content,
        createdAt: followUps[0].createdAt
      } : null
    });

    return {
      items: followUps,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  // 获取用户创建的所有跟进记录
  async findByUserId(userId: string, page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;
    
    const [followUps, total] = await Promise.all([
      this.followUpModel
        .find({ createdBy: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('resumeId', 'name phone')
        .populate('createdBy', 'name username')
        .exec(),
      this.followUpModel.countDocuments({ createdBy: new Types.ObjectId(userId) })
    ]);

    return {
      items: followUps,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  // 获取最近的跟进记录
  async getRecentFollowUps(limit: number = 5) {
    return this.followUpModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('resumeId', 'name phone')
      .populate('createdBy', 'name username')
      .exec();
  }

  // 获取所有跟进记录
  async findAll(page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;
    
    const [followUps, total] = await Promise.all([
      this.followUpModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('resumeId', 'name phone')
        .populate('createdBy', 'name username')
        .exec(),
      this.followUpModel.countDocuments()
    ]);

    return {
      items: followUps,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  // 测试populate功能
  async testPopulate() {
    return this.followUpModel
      .findOne()
      .populate({
        path: 'createdBy',
        model: 'User',
        select: 'name username'
      })
      .exec();
  }

  // 根据ID获取单个跟进记录
  async findById(id: string): Promise<FollowUp> {
    const followUp = await this.followUpModel
      .findById(id)
      .populate({
        path: 'createdBy',
        select: 'name username',
        model: 'User'
      })
      .lean();
      
    if (!followUp) {
      throw new NotFoundException('跟进记录不存在');
    }
    
    return followUp;
  }

  // 删除跟进记录 - 暂时简化权限检查
  async delete(id: string, userId: string): Promise<void> {
    const followUp = await this.followUpModel.findById(id);
    if (!followUp) {
      throw new NotFoundException('跟进记录不存在');
    }

    await this.followUpModel.findByIdAndDelete(id);
  }
} 