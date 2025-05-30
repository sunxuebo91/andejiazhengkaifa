import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, IResume } from './models/resume.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { Logger } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<IResume>,
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

    // 检查手机号是否重复
    const existingResumeWithPhone = await this.resumeModel.findOne({
      phone: createResumeDto.phone
    });
    if (existingResumeWithPhone) {
      throw new ConflictException('该手机号已被其他简历使用');
    }

    // 如果提供了身份证号，检查是否重复
    if (createResumeDto.idNumber) {
      const existingResumeWithIdNumber = await this.resumeModel.findOne({
        idNumber: createResumeDto.idNumber
      });
      if (existingResumeWithIdNumber) {
        throw new ConflictException('该身份证号已被其他简历使用');
      }
    }

    // 确保files是数组
    const filesArray = Array.isArray(files) ? files : [];
    const fileUploadErrors: string[] = [];
    
    // 分类存储文件信息
    const categorizedFiles = {
      idCardFront: null,
      idCardBack: null,
      photoUrls: [],
      certificateUrls: [],
      medicalReportUrls: [],
      certificates: [],
      reports: []
    };
    
    // 只有在有文件时才处理文件上传
    if (filesArray.length > 0) {
      // 上传文件
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const fileType = fileTypes[i] || 'other';
        
        if (file) {  // 确保文件存在
          try {
            // uploadService.uploadFile 返回完整的COS URL
            const fileUrl = await this.uploadService.uploadFile(file, { type: fileType });
            
            if (fileUrl) {
              this.logger.debug(`文件上传成功，URL: ${fileUrl}`);
              
              const fileInfo = {
                url: fileUrl,  // 直接使用返回的完整URL
                filename: file.originalname,
                mimetype: file.mimetype,
                size: file.size
              };
              
              // 根据文件类型分类存储
              switch (fileType) {
                case 'idCardFront':
                  categorizedFiles.idCardFront = fileInfo;
                  break;
                case 'idCardBack':
                  categorizedFiles.idCardBack = fileInfo;
                  break;
                case 'personalPhoto':
                  categorizedFiles.photoUrls.push(fileUrl);
                  break;
                case 'certificate':
                  categorizedFiles.certificates.push(fileInfo);
                  categorizedFiles.certificateUrls.push(fileUrl);
                  break;
                case 'medicalReport':
                  categorizedFiles.reports.push(fileInfo);
                  categorizedFiles.medicalReportUrls.push(fileUrl);
                  break;
                default:
                  // 默认归类为个人照片
                  categorizedFiles.photoUrls.push(fileUrl);
                  break;
              }
            }
          } catch (error) {
            this.logger.error(`文件上传失败: ${error.message}`);
            fileUploadErrors.push(`文件 ${file.originalname} 上传失败: ${error.message}`);
          }
        }
      }
    }

    // 创建简历对象
    const resumeData = {
      ...createResumeDto,
      fileIds: [], // 暂时清空fileIds，因为我们现在直接使用URL
      idCardFront: categorizedFiles.idCardFront,
      idCardBack: categorizedFiles.idCardBack,
      photoUrls: categorizedFiles.photoUrls,
      certificateUrls: categorizedFiles.certificateUrls,
      medicalReportUrls: categorizedFiles.medicalReportUrls,
      certificates: categorizedFiles.certificates,
      reports: categorizedFiles.reports
    };

    try {
      const resume = new this.resumeModel(resumeData);
      const savedResume = await resume.save();
      
      this.logger.log(`简历创建成功，文件信息: ${JSON.stringify({
        idCardFront: !!savedResume.idCardFront,
        idCardBack: !!savedResume.idCardBack,
        photoCount: savedResume.photoUrls?.length || 0,
        certificateCount: savedResume.certificates?.length || 0,
        reportCount: savedResume.reports?.length || 0
      })}`);
      
      return {
        success: true,
        data: savedResume,
        message: fileUploadErrors.length > 0 
          ? `简历创建成功，但部分文件上传失败: ${fileUploadErrors.join(', ')}`
          : '简历创建成功'
      };
    } catch (error) {
      this.logger.error('保存简历失败:', error);
      throw new BadRequestException(`创建简历失败: ${error.message}`);
    }
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

  async addFileWithType(id: string, file: Express.Multer.File, fileType: string) {
    try {
      this.logger.debug(`开始处理文件上传: id=${id}, type=${fileType}, filename=${file.originalname}`);
      
      // 验证 ID 格式
      if (!Types.ObjectId.isValid(id)) {
        this.logger.error(`无效的简历ID格式: ${id}`);
        throw new BadRequestException('无效的简历ID格式');
      }

      const resumeId = new Types.ObjectId(id);
      const resumeDoc = await this.resumeModel.findById(resumeId);
      
      if (!resumeDoc) {
        this.logger.error(`简历不存在: id=${id}`);
        throw new NotFoundException('简历不存在');
      }

      // 上传文件，获取完整的COS URL
      this.logger.debug('开始上传文件到存储服务');
      const fileUrl = await this.uploadService.uploadFile(file, { type: fileType });
      this.logger.debug(`文件上传成功: fileUrl=${fileUrl}`);

      const uploadedFileInfo = {
        url: fileUrl,  // 直接使用返回的完整URL
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };

      // 根据文件类型分类存储
      switch (fileType) {
        case 'idCardFront':
          resumeDoc.idCardFront = uploadedFileInfo;
          break;
        case 'idCardBack':
          resumeDoc.idCardBack = uploadedFileInfo;
          break;
        case 'personalPhoto':
          if (!resumeDoc.photoUrls) resumeDoc.photoUrls = [];
          resumeDoc.photoUrls.push(fileUrl);
          break;
        case 'certificate':
          if (!resumeDoc.certificates) resumeDoc.certificates = [];
          resumeDoc.certificates.push(uploadedFileInfo);
          if (!resumeDoc.certificateUrls) resumeDoc.certificateUrls = [];
          resumeDoc.certificateUrls.push(fileUrl);
          break;
        case 'medicalReport':
          if (!resumeDoc.reports) resumeDoc.reports = [];
          resumeDoc.reports.push(uploadedFileInfo);
          if (!resumeDoc.medicalReportUrls) resumeDoc.medicalReportUrls = [];
          resumeDoc.medicalReportUrls.push(fileUrl);
          break;
        default:
          // 默认归类为个人照片
          if (!resumeDoc.photoUrls) resumeDoc.photoUrls = [];
          resumeDoc.photoUrls.push(fileUrl);
          break;
      }

      this.logger.debug('保存更新后的简历信息');
      const savedResume = await resumeDoc.save();
      this.logger.debug('简历更新成功');

      return savedResume;
    } catch (error) {
      this.logger.error(`文件上传处理失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  async removeFile(id: string, fileId: string) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    // 从简历中移除文件ID
    resume.fileIds = resume.fileIds.filter(id => id.toString() !== fileId);
    
    // 构建要删除的URL
    const fileUrl = `/api/upload/file/${fileId}`;
    
    // 从所有URL数组中移除对应的文件URL
    if (resume.photoUrls) {
      resume.photoUrls = resume.photoUrls.filter(url => url !== fileUrl);
    }
    
    if (resume.certificateUrls) {
      resume.certificateUrls = resume.certificateUrls.filter(url => url !== fileUrl);
    }
    
    if (resume.medicalReportUrls) {
      resume.medicalReportUrls = resume.medicalReportUrls.filter(url => url !== fileUrl);
    }
    
    // 从结构化文件信息中移除
    if (resume.personalPhoto && resume.personalPhoto.url === fileUrl) {
      resume.personalPhoto = undefined;
    }
    
    if (resume.certificates) {
      resume.certificates = resume.certificates.filter(cert => cert.url !== fileUrl);
    }
    
    if (resume.reports) {
      resume.reports = resume.reports.filter(report => report.url !== fileUrl);
    }
    
    // 检查身份证照片
    if (resume.idCardFront?.url === fileUrl) {
      resume.idCardFront = undefined;
    }
    
    if (resume.idCardBack?.url === fileUrl) {
      resume.idCardBack = undefined;
    }
    
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

  async updateWithFiles(
    id: string, 
    updateResumeDto: UpdateResumeDto, 
    files?: Express.Multer.File[],
    fileTypes?: string[]
  ) {
    // 检查身份证号是否重复
    if (updateResumeDto.idNumber) {
      const existingResume = await this.resumeModel.findOne({
        idNumber: updateResumeDto.idNumber,
        _id: { $ne: id } // 排除当前简历
      });
      
      if (existingResume) {
        throw new ConflictException('身份证号已被其他简历使用');
      }
    }
    
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }
  
    // 处理文件上传
    const categorizedFiles: any = {};
    const filesArray = Array.isArray(files) ? files : [];
    const fileTypesArray = Array.isArray(fileTypes) ? fileTypes : [];
  
    // 上传新文件
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      const fileType = fileTypesArray[i] || 'personalPhoto'; // 默认为个人照片
  
      // 上传文件，获取完整的COS URL
      const fileUrl = await this.uploadService.uploadFile(file, { type: fileType });
      
      this.logger.debug(`更新简历文件上传成功，URL: ${fileUrl}`);
  
      const fileInfo = {
        url: fileUrl,  // 直接使用返回的完整URL
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };
  
      // 根据文件类型分类存储
      if (!categorizedFiles[fileType]) {
        categorizedFiles[fileType] = [];
      }
      categorizedFiles[fileType].push(fileInfo);
    }
  
    // 更新简历基本信息
    Object.assign(resume, updateResumeDto);
    
    // 更新分类文件信息
    Object.keys(categorizedFiles).forEach(type => {
      switch (type) {
        case 'personalPhoto':
          resume.personalPhoto = categorizedFiles[type][0]; // 个人照片只保存一个
          if (!resume.photoUrls) resume.photoUrls = [];
          resume.photoUrls.push(categorizedFiles[type][0].url);
          break;
        case 'idCardFront':
          resume.idCardFront = categorizedFiles[type][0];
          break;
        case 'idCardBack':
          resume.idCardBack = categorizedFiles[type][0];
          break;
        case 'certificate':
          if (!resume.certificates) resume.certificates = [];
          resume.certificates.push(...categorizedFiles[type]);
          if (!resume.certificateUrls) resume.certificateUrls = [];
          resume.certificateUrls.push(...categorizedFiles[type].map(f => f.url));
          break;
        case 'medicalReport':
          if (!resume.reports) resume.reports = [];
          resume.reports.push(...categorizedFiles[type]);
          if (!resume.medicalReportUrls) resume.medicalReportUrls = [];
          resume.medicalReportUrls.push(...categorizedFiles[type].map(f => f.url));
          break;
        default:
          // 默认归类为个人照片
          if (!resume.photoUrls) resume.photoUrls = [];
          resume.photoUrls.push(...categorizedFiles[type].map(f => f.url));
          break;
      }
    });
  
    // 保存更新后的简历
    const savedResume = await resume.save();
    
    this.logger.log(`简历更新成功，文件信息: ${JSON.stringify({
      idCardFront: !!savedResume.idCardFront,
      idCardBack: !!savedResume.idCardBack,
      photoCount: savedResume.photoUrls?.length || 0,
      certificateCount: savedResume.certificates?.length || 0,
      reportCount: savedResume.reports?.length || 0
    })}`);
    
    return {
      success: true,
      data: savedResume,
      message: '简历更新成功'
    };
  }
}