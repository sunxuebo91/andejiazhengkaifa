import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume } from './models/resume.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { Logger } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<Resume>,
    private uploadService: UploadService
  ) {}

  async createWithFiles(
    createResumeDto: CreateResumeDto & { userId: string }, 
    files: Express.Multer.File[] = [],
    fileTypes: string[] = []
  ) {
    if (!createResumeDto.userId) {
      throw new BadRequestException('用户ID不能为空');
    }

    // 确保files是数组
    const filesArray = Array.isArray(files) ? files : [];
    const fileIds: Types.ObjectId[] = [];
    const fileInfoMap = new Map<string, { fileId: string; filename: string; mimetype: string; size: number }>();
    
    // 只有在有文件时才处理文件上传
    if (filesArray.length > 0) {
      // 上传文件
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const fileType = fileTypes[i] || 'other';  // 使用传入的文件类型，如果没有则默认为other
        
        if (file) {  // 确保文件存在
          try {
            const fileId = await this.uploadService.uploadFile(file);
            if (fileId) {
              const objectId = new Types.ObjectId(fileId);
              fileIds.push(objectId);
              
              // 只处理身份证正反面照片
              if (fileType === 'idCardFront' || fileType === 'idCardBack') {
                fileInfoMap.set(fileType, {
                  fileId,
                  filename: file.originalname,
                  mimetype: file.mimetype,
                  size: file.size
                });
              }
            }
          } catch (error) {
            this.logger.error(`文件上传失败: ${error.message}`);
            // 继续处理其他文件，不中断整个流程
          }
        }
      }
    }

    // 构建文件URL信息
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const fileInfo = {
      idCardFront: fileInfoMap.get('idCardFront') ? {
        url: `${baseUrl}/api/upload/file/${fileInfoMap.get('idCardFront').fileId}`,
        filename: fileInfoMap.get('idCardFront').filename,
        mimetype: fileInfoMap.get('idCardFront').mimetype,
        size: fileInfoMap.get('idCardFront').size
      } : undefined,
      idCardBack: fileInfoMap.get('idCardBack') ? {
        url: `${baseUrl}/api/upload/file/${fileInfoMap.get('idCardBack').fileId}`,
        filename: fileInfoMap.get('idCardBack').filename,
        mimetype: fileInfoMap.get('idCardBack').mimetype,
        size: fileInfoMap.get('idCardBack').size
      } : undefined
    };

    // 创建简历，确保fileIds始终是数组
    const resume = new this.resumeModel({
      ...createResumeDto,
      ...fileInfo,
      fileIds: fileIds,
      userId: new Types.ObjectId(createResumeDto.userId)
    });

    return resume.save();
  }

  async findAll(page: number, pageSize: number, search?: string) {
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { expectedPosition: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      this.resumeModel
        .find(query)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .populate('userId', 'username name')
        .exec(),
      this.resumeModel.countDocuments(query)
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async findOne(id: string) {
    const resume = await this.resumeModel
      .findById(new Types.ObjectId(id))
      .populate('userId', 'username name')
      .exec();

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    return resume;
  }

  async update(id: string, updateResumeDto: UpdateResumeDto) {
    const resume = await this.resumeModel
      .findByIdAndUpdate(new Types.ObjectId(id), updateResumeDto, { new: true })
      .populate('userId', 'username name')
      .exec();

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    return resume;
  }

  async remove(id: string) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    // 删除关联的文件
    for (const fileId of resume.fileIds) {
      await this.uploadService.deleteFile(fileId.toString());
    }

    await resume.deleteOne();
    return { message: '删除成功' };
  }

  async addFiles(id: string, files: Express.Multer.File[]) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    const fileIds = [...resume.fileIds];
    
    // 上传新文件
    for (const file of files) {
      const fileId = await this.uploadService.uploadFile(file);
      fileIds.push(new Types.ObjectId(fileId));
    }

    // 更新简历
    resume.fileIds = fileIds;
    return resume.save();
  }

  async removeFile(id: string, fileId: string) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    // 从简历中移除文件ID
    resume.fileIds = resume.fileIds.filter(id => id.toString() !== fileId);
    await resume.save();

    // 删除文件
    await this.uploadService.deleteFile(fileId);
    
    return { message: '文件删除成功' };
  }

  /**
   * 兼容测试用例的 create 方法
   */
  async create(createResumeDto: CreateResumeDto) {
    // 检查手机号唯一性
    const exist = await this.resumeModel.findOne({ phone: createResumeDto.phone });
    if (exist) {
      throw new BadRequestException('手机号已存在');
    }
    const resume = new this.resumeModel(createResumeDto);
    return resume.save();
  }
}