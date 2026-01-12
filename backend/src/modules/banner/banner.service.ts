import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Banner, BannerDocument } from './models/banner.model';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';
import { ReorderBannerDto } from './dto/reorder-banner.dto';

@Injectable()
export class BannerService {
  private readonly logger = new Logger(BannerService.name);

  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
  ) {}

  /**
   * 创建Banner
   */
  async create(dto: CreateBannerDto, userId: string): Promise<Banner> {
    this.logger.log(`创建Banner: ${dto.title}`);
    
    const banner = new this.bannerModel({
      ...dto,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    return banner.save();
  }

  /**
   * 获取Banner列表（分页）
   */
  async findAll(query: QueryBannerDto) {
    const { status, keyword, page = 1, pageSize = 10 } = query;
    
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (keyword) {
      filter.title = { $regex: keyword, $options: 'i' };
    }

    const skip = (page - 1) * pageSize;

    const [list, total] = await Promise.all([
      this.bannerModel
        .find(filter)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('createdBy', 'name username')
        .populate('updatedBy', 'name username')
        .exec(),
      this.bannerModel.countDocuments(filter),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取单个Banner
   */
  async findOne(id: string): Promise<Banner> {
    const banner = await this.bannerModel
      .findById(id)
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .exec();

    if (!banner) {
      throw new NotFoundException(`Banner ${id} 不存在`);
    }

    return banner;
  }

  /**
   * 更新Banner
   */
  async update(id: string, dto: UpdateBannerDto, userId: string): Promise<Banner> {
    this.logger.log(`更新Banner: ${id}`);

    const banner = await this.bannerModel.findByIdAndUpdate(
      id,
      {
        ...dto,
        updatedBy: new Types.ObjectId(userId),
      },
      { new: true },
    ).exec();

    if (!banner) {
      throw new NotFoundException(`Banner ${id} 不存在`);
    }

    return banner;
  }

  /**
   * 删除Banner
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`删除Banner: ${id}`);

    const result = await this.bannerModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Banner ${id} 不存在`);
    }
  }

  /**
   * 更新Banner状态
   */
  async updateStatus(id: string, status: string, userId: string): Promise<Banner> {
    this.logger.log(`更新Banner状态: ${id} -> ${status}`);

    const banner = await this.bannerModel.findByIdAndUpdate(
      id,
      {
        status,
        updatedBy: new Types.ObjectId(userId),
      },
      { new: true },
    ).exec();

    if (!banner) {
      throw new NotFoundException(`Banner ${id} 不存在`);
    }

    return banner;
  }

  /**
   * 批量调整排序
   */
  async reorder(dto: ReorderBannerDto, userId: string): Promise<void> {
    this.logger.log(`批量调整Banner排序，共 ${dto.items.length} 个`);

    const updatePromises = dto.items.map(item =>
      this.bannerModel.findByIdAndUpdate(
        item.id,
        {
          order: item.order,
          updatedBy: new Types.ObjectId(userId),
        },
      ).exec(),
    );

    await Promise.all(updatePromises);
  }

  /**
   * 获取小程序活跃的Banner列表
   */
  async findActiveBannersForMiniprogram(): Promise<Banner[]> {
    const now = new Date();

    const banners = await this.bannerModel
      .find({
        status: 'active',
        $or: [
          // 没有设置时间限制
          { startTime: { $exists: false }, endTime: { $exists: false } },
          // 只设置了开始时间
          { startTime: { $lte: now }, endTime: { $exists: false } },
          // 只设置了结束时间
          { startTime: { $exists: false }, endTime: { $gte: now } },
          // 设置了开始和结束时间
          { startTime: { $lte: now }, endTime: { $gte: now } },
        ],
      })
      .sort({ order: 1, createdAt: -1 })
      .select('title imageUrl linkUrl linkType order')
      .exec();

    return banners;
  }

  /**
   * 记录Banner浏览
   */
  async recordView(id: string): Promise<void> {
    await this.bannerModel.findByIdAndUpdate(id, {
      $inc: { viewCount: 1 },
    }).exec();
  }

  /**
   * 记录Banner点击
   */
  async recordClick(id: string): Promise<void> {
    await this.bannerModel.findByIdAndUpdate(id, {
      $inc: { clickCount: 1 },
    }).exec();
  }
}

