import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FollowUp, FollowUpType } from './models/follow-up.entity';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { ResumeService } from '../resume/resume.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class FollowUpService {
  constructor(
    @InjectModel(FollowUp.name) private followUpModel: Model<FollowUp>,
    private resumeService: ResumeService,
    private usersService: UsersService,
  ) {}

  // 创建跟进记录
  async create(createFollowUpDto: CreateFollowUpDto, userId: string): Promise<FollowUp> {
    // 验证简历是否存在
    const resume = await this.resumeService.findOne(createFollowUpDto.resumeId);
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    // 验证用户是否存在
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 创建跟进记录
    const followUp = new this.followUpModel({
      ...createFollowUpDto,
      resumeId: new Types.ObjectId(createFollowUpDto.resumeId),
      createdBy: new Types.ObjectId(userId),
    });

    return followUp.save();
  }

  // 获取简历的所有跟进记录
  async findByResumeId(resumeId: string, page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;
    
    const [followUps, total] = await Promise.all([
      this.followUpModel
        .find({ resumeId: new Types.ObjectId(resumeId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('createdBy', 'name username')
        .exec(),
      this.followUpModel.countDocuments({ resumeId: new Types.ObjectId(resumeId) })
    ]);

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

  // 获取所有跟进记录（仅管理员）
  async findAll(page: number = 1, pageSize: number = 10, userId?: string) {
    // 检查用户权限
    if (userId) {
      const user = await this.usersService.findById(userId);
      if (!user || user.role !== 'admin') {
        throw new BadRequestException('只有管理员可以查看所有跟进记录');
      }
    }

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

  // 增强删除权限检查
  async delete(id: string, userId: string): Promise<void> {
    const followUp = await this.followUpModel.findById(id);
    if (!followUp) {
      throw new NotFoundException('跟进记录不存在');
    }

    // 获取当前用户信息
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 管理员可以删除任何记录，其他用户只能删除自己创建的记录
    if (user.role !== 'admin' && followUp.createdBy.toString() !== userId) {
      throw new BadRequestException('只有创建者或管理员可以删除跟进记录');
    }

    await this.followUpModel.findByIdAndDelete(id);
  }
} 