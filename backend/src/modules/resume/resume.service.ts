import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResumeEntity, ResumeModel } from './models/resume.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { Logger } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @InjectModel(ResumeEntity.name)
    private readonly resumeModel: ResumeModel,
    private uploadService: UploadService
  ) {}

  async create(createResumeDto: CreateResumeDto): Promise<ResumeEntity> {
    this.logger.log(`创建新简历: ${JSON.stringify(createResumeDto)}`);
    const createdResume = new this.resumeModel(createResumeDto);
    const savedResume = await createdResume.save();
    this.logger.log(`简历创建成功: ${savedResume._id}`);
    return savedResume;
  }

  async findAll(page: number = 1, pageSize: number = 10, search?: string): Promise<{ items: ResumeEntity[]; total: number }> {
    this.logger.log(`查询简历列表: page=${page}, pageSize=${pageSize}, search=${search}`);
    
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { nativePlace: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.resumeModel.find(query)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .exec(),
      this.resumeModel.countDocuments(query).exec(),
    ]);

    this.logger.log(`查询成功: 总数=${total}, 当前页=${page}, 每页=${pageSize}, 返回数量=${items.length}`);
    this.logger.debug(`示例数据: ${JSON.stringify(items[0])}`);

    return {
      items,
      total,
    };
  }

  async findOne(id: string): Promise<ResumeEntity> {
    this.logger.log(`查询单个简历: id=${id}`);
    const resume = await this.resumeModel.findById(id).exec();
    if (!resume) {
      this.logger.warn(`简历未找到: id=${id}`);
      throw new NotFoundException(`简历未找到: ${id}`);
    }
    return resume;
  }

  async update(id: string, updateResumeDto: UpdateResumeDto): Promise<ResumeEntity> {
    this.logger.log(`更新简历: id=${id}, data=${JSON.stringify(updateResumeDto)}`);
    const updatedResume = await this.resumeModel
      .findByIdAndUpdate(id, updateResumeDto, { new: true })
      .exec();
    if (!updatedResume) {
      this.logger.warn(`简历未找到: id=${id}`);
      throw new NotFoundException(`简历未找到: ${id}`);
    }
    return updatedResume;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`删除简历: id=${id}`);
    const result = await this.resumeModel.findByIdAndDelete(id).exec();
    if (!result) {
      this.logger.warn(`简历未找到: id=${id}`);
      throw new NotFoundException(`简历未找到: ${id}`);
    }
  }

  async uploadFile(resumeId: string, file: Express.Multer.File, type: string): Promise<ResumeEntity> {
    const resume = await this.findOne(resumeId);
    
    // 上传文件到 GridFS
    const fileId = await this.uploadService.uploadFile(file, { type });
    
    // 准备文件信息
    const fileInfo = {
      fileId,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadTime: new Date()
    };

    // 根据文件类型更新简历
    let updateQuery: any = {};
    switch (type) {
      case 'idCardFront':
        updateQuery = { 'idCardFront': fileInfo };
        break;
      case 'idCardBack':
        updateQuery = { 'idCardBack': fileInfo };
        break;
      case 'personalPhoto':
        updateQuery = { 'personalPhoto': fileInfo };
        break;
      case 'certificate':
        updateQuery = { $push: { 'certificates': fileInfo } };
        break;
      case 'report':
        updateQuery = { $push: { 'reports': fileInfo } };
        break;
      default:
        throw new Error('不支持的文件类型');
    }

    const updatedResume = await this.resumeModel.findByIdAndUpdate(
      resumeId,
      updateQuery,
      { new: true }
    ).exec();

    if (!updatedResume) {
      throw new NotFoundException(`简历未找到: ${resumeId}`);
    }

    return updatedResume;
  }

  async deleteFile(resumeId: string, fileId: string, type: string): Promise<ResumeEntity> {
    const resume = await this.findOne(resumeId);
    
    // 从 GridFS 删除文件
    await this.uploadService.deleteFile(fileId);
    
    // 根据文件类型更新简历
    let updateQuery: any = {};
    switch (type) {
      case 'idCardFront':
        updateQuery = { $unset: { 'idCardFront': 1 } };
        break;
      case 'idCardBack':
        updateQuery = { $unset: { 'idCardBack': 1 } };
        break;
      case 'personalPhoto':
        updateQuery = { $unset: { 'personalPhoto': 1 } };
        break;
      case 'certificate':
        updateQuery = { $pull: { 'certificates': { fileId } } };
        break;
      case 'report':
        updateQuery = { $pull: { 'reports': { fileId } } };
        break;
      default:
        throw new Error('不支持的文件类型');
    }

    const updatedResume = await this.resumeModel.findByIdAndUpdate(
      resumeId,
      updateQuery,
      { new: true }
    ).exec();

    if (!updatedResume) {
      throw new NotFoundException(`简历未找到: ${resumeId}`);
    }

    return updatedResume;
  }
}