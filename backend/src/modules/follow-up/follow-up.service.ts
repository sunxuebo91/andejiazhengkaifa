import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FollowUp, FollowUpType } from './models/follow-up.entity';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { User } from '../users/models/user.entity';
import { Resume } from '../resume/models/resume.entity';

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

// 定义查询结果类型
export interface FollowUpQueryResult {
  items: PopulatedFollowUp[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class FollowUpService {
  constructor(
    @InjectModel(FollowUp.name) private followUpModel: Model<FollowUp>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel(Resume.name) private resumeModel: Model<Resume>,
  ) {}

  // 创建跟进记录
  async create(createFollowUpDto: CreateFollowUpDto, userId: string): Promise<PopulatedFollowUp> {
    // 验证用户是否存在并获取用户信息
    const user = await this.userModel.findById(userId).select('name username').lean();
    if (!user) {
      throw new NotFoundException('创建跟进记录的用户不存在');
    }
    
    console.log('创建跟进记录的用户信息:', user);
    
    // 验证简历是否存在
    const resume = await this.resumeModel.findById(createFollowUpDto.resumeId);
    if (!resume) {
      throw new NotFoundException('关联的简历不存在');
    }
    
    // 创建跟进记录
    const followUp = new this.followUpModel({
      ...createFollowUpDto,
      resumeId: new Types.ObjectId(createFollowUpDto.resumeId),
      createdBy: new Types.ObjectId(userId),
    });

    // 保存跟进记录
    const savedFollowUp = await followUp.save();
    
    // 🎯 关键逻辑：更新简历的updatedAt时间戳
    // 这不是修改简历内容，而是更新简历的活动时间
    const currentTime = new Date();
    await this.resumeModel.findByIdAndUpdate(
      createFollowUpDto.resumeId,
      { 
        updatedAt: currentTime,
        // 可选：记录最后跟进人
        lastUpdatedBy: new Types.ObjectId(userId)
      },
      { 
        timestamps: false, // 禁用自动时间戳，使用我们手动设置的时间
        new: true 
      }
    );
    
    console.log(`简历 ${createFollowUpDto.resumeId} 的updatedAt已更新为: ${currentTime.toISOString()}`);
    
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
  async findByResumeId(resumeId: string, page: number = 1, pageSize: number = 10): Promise<FollowUpQueryResult> {
    const skip = (page - 1) * pageSize;
    
    console.log('=== 查询跟进记录开始 ===');
    console.log('查询参数:', { 
      resumeId, 
      page, 
      pageSize,
      skip,
      timestamp: new Date().toISOString()
    });
    
    try {
      const [followUps, total] = await Promise.all([
        this.followUpModel
          .find({ resumeId: new Types.ObjectId(resumeId) })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .populate<{ createdBy: PopulatedUser }>({
            path: 'createdBy',
            select: 'name username',
            model: 'User'
          })
          .lean()
          .exec(),
        this.followUpModel.countDocuments({ resumeId: new Types.ObjectId(resumeId) })
      ]);

      console.log('查询结果统计:', {
        total,
        currentPage: page,
        pageSize,
        returnedCount: followUps.length
      });

      if (followUps.length > 0) {
        const firstFollowUp = followUps[0] as PopulatedFollowUp;
        console.log('第一条跟进记录详情:', {
          id: firstFollowUp._id,
          type: firstFollowUp.type,
          content: firstFollowUp.content,
          createdAt: firstFollowUp.createdAt,
          createdBy: {
            id: firstFollowUp.createdBy._id,
            name: firstFollowUp.createdBy.name,
            username: firstFollowUp.createdBy.username
          }
        });
      } else {
        console.log('没有找到跟进记录');
      }

      console.log('=== 查询跟进记录结束 ===');

      return {
        items: followUps as PopulatedFollowUp[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    } catch (error) {
      console.error('查询跟进记录时发生错误:', error);
      throw error;
    }
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