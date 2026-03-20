import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, IResume } from './models/resume.entity';
import { CreateResumeDto, CreateResumeV2Dto, OrderStatus } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { Logger } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { Contract, ContractDocument } from '../contracts/models/contract.model';

import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UpdateAvailabilityDto, BatchUpdateAvailabilityDto, QueryAvailabilityDto } from './dto/availability.dto';
import { AvailabilityStatus } from './models/availability-period.schema';
import { EmployeeEvaluation } from '../employee-evaluation/models/employee-evaluation.entity';
import { ResumeQueryService } from './resume-query.service';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);
  private readonly idempotencyCache = new Map<string, any>(); // 简单内存缓存，生产环境应使用Redis
  private readonly rateLimitCache = new Map<string, { count: number; resetTime: number }>(); // 限流缓存

  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<IResume>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
    private uploadService: UploadService,
    private readonly jwtService: JwtService,
    @InjectModel(EmployeeEvaluation.name)
    private readonly employeeEvaluationModel: Model<EmployeeEvaluation>,
    private readonly resumeQueryService: ResumeQueryService,
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
      reports: [],
      selfIntroductionVideo: null
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
                case 'selfIntroductionVideo':
                  categorizedFiles.selfIntroductionVideo = fileInfo;
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
      reports: categorizedFiles.reports,
      selfIntroductionVideo: categorizedFiles.selfIntroductionVideo
    };

    // 如果idNumber为null、空字符串或undefined，则删除它，避免唯一索引问题
    if (resumeData.idNumber === null || resumeData.idNumber === '' || resumeData.idNumber === undefined) {
      delete resumeData.idNumber;
      this.logger.log('检测到空的idNumber字段，已从数据中删除');
    }

    try {
      const resume = new this.resumeModel(resumeData);
      const savedResume = await resume.save();

      this.logger.log(`简历创建成功，文件信息: ${JSON.stringify({
        idCardFront: !!savedResume.idCardFront,
        idCardBack: !!savedResume.idCardBack,
        photoCount: savedResume.photoUrls?.length || 0,
        certificateCount: savedResume.certificates?.length || 0,
        reportCount: savedResume.reports?.length || 0,
        selfIntroductionVideo: !!savedResume.selfIntroductionVideo
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

  async findAll(page: number, pageSize: number, keyword?: string, jobType?: string, orderStatus?: string, maxAge?: number, nativePlace?: string, ethnicity?: string, currentUserId?: string) {
    return this.resumeQueryService.findAll(page, pageSize, keyword, jobType, orderStatus, maxAge, nativePlace, ethnicity, currentUserId);
  }

  async findOne(id: string, currentUserId?: string) {
    return this.resumeQueryService.findOne(id, currentUserId);
  }

  async update(id: string, updateResumeDto: UpdateResumeDto, userId?: string) {
    const updateData: any = { ...updateResumeDto };

    // 设置最后更新人
    if (userId) {
      updateData.lastUpdatedBy = new Types.ObjectId(userId);
    }

    // 🔧 修复：同步更新 certificateUrls 和 certificates 字段
    // 当小程序提交空数组时，需要同时清空两个字段
    if (updateResumeDto.certificateUrls !== undefined) {
      updateData.certificateUrls = updateResumeDto.certificateUrls;
      // 同步更新 certificates 字段（包括空数组的情况）
      if (Array.isArray(updateResumeDto.certificateUrls)) {
        if (updateResumeDto.certificateUrls.length === 0) {
          // 如果是空数组，清空 certificates
          updateData.certificates = [];
        } else {
          // 如果有数据，转换为 FileInfo 格式
          updateData.certificates = updateResumeDto.certificateUrls.map(url => ({
            url: url,
            filename: url.split('/').pop() || '',
            mimetype: 'image/jpeg',
            size: 0
          }));
        }
      }
    }

    // 🔧 修复：同步更新 medicalReportUrls 和 reports 字段
    if (updateResumeDto.medicalReportUrls !== undefined) {
      updateData.medicalReportUrls = updateResumeDto.medicalReportUrls;
      // 同步更新 reports 字段（包括空数组的情况）
      if (Array.isArray(updateResumeDto.medicalReportUrls)) {
        if (updateResumeDto.medicalReportUrls.length === 0) {
          updateData.reports = [];
        } else {
          updateData.reports = updateResumeDto.medicalReportUrls.map(url => ({
            url: url,
            filename: url.split('/').pop() || '',
            mimetype: url.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            size: 0
          }));
        }
      }
    }

    // 🔧 修复：同步更新 photoUrls 和 personalPhoto 字段
    if (updateResumeDto.photoUrls !== undefined) {
      updateData.photoUrls = updateResumeDto.photoUrls;
      // 同步更新 personalPhoto 字段（包括空数组的情况）
      if (Array.isArray(updateResumeDto.photoUrls)) {
        if (updateResumeDto.photoUrls.length === 0) {
          updateData.personalPhoto = [];
        } else {
          updateData.personalPhoto = updateResumeDto.photoUrls.map(url => ({
            url: url,
            filename: url.split('/').pop() || '',
            mimetype: 'image/jpeg',
            size: 0
          }));
        }
      }
    }

    this.logger.log(`📝 更新简历 ${id}，字段同步情况:`);
    if (updateResumeDto.certificateUrls !== undefined) {
      this.logger.log(`  - certificateUrls: ${updateData.certificateUrls?.length || 0} 项`);
      this.logger.log(`  - certificates: ${updateData.certificates?.length || 0} 项 (已同步)`);
    }
    if (updateResumeDto.medicalReportUrls !== undefined) {
      this.logger.log(`  - medicalReportUrls: ${updateData.medicalReportUrls?.length || 0} 项`);
      this.logger.log(`  - reports: ${updateData.reports?.length || 0} 项 (已同步)`);
    }
    if (updateResumeDto.photoUrls !== undefined) {
      this.logger.log(`  - photoUrls: ${updateData.photoUrls?.length || 0} 项`);
      this.logger.log(`  - personalPhoto: ${updateData.personalPhoto?.length || 0} 项 (已同步)`);
    }

    const resume = await this.resumeModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        updateData,
        {
          new: true,
          // 确保触发timestamps的updatedAt更新
          timestamps: true,
          runValidators: true
        }
      )
      .populate('userId', 'username name')
      .populate('lastUpdatedBy', 'username name')
      .exec();

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    this.logger.log(`✅ 简历更新成功: ${id}, updatedAt: ${(resume as any).updatedAt}`);
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

      // 验证文件类型参数
      const validFileTypes = ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'medicalReport', 'selfIntroductionVideo', 'confinementMealPhoto', 'cookingPhoto', 'complementaryFoodPhoto', 'positiveReviewPhoto', 'workExperiencePhoto'];
      if (!validFileTypes.includes(fileType)) {
        this.logger.error(`无效的文件类型: ${fileType}, 有效类型: ${validFileTypes.join(', ')}`);
        throw new BadRequestException(`无效的文件类型: ${fileType}`);
      }

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
      this.logger.debug(`文件上传成功: fileUrl=${fileUrl}, fileType=${fileType}`);

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
          this.logger.debug(`更新了idCardFront: ${fileUrl}`);
          break;
        case 'idCardBack':
          resumeDoc.idCardBack = uploadedFileInfo;
          this.logger.debug(`更新了idCardBack: ${fileUrl}`);
          break;
        case 'personalPhoto':
          if (!resumeDoc.photoUrls) resumeDoc.photoUrls = [];
          resumeDoc.photoUrls.push(fileUrl);
          // 同时更新personalPhoto字段（支持多张个人照片）
          if (!resumeDoc.personalPhoto) resumeDoc.personalPhoto = [];
          resumeDoc.personalPhoto.push(uploadedFileInfo);
          this.logger.debug(`添加到个人照片: ${fileUrl}, 总数: ${resumeDoc.photoUrls.length}`);
          break;
        case 'certificate':
          if (!resumeDoc.certificates) resumeDoc.certificates = [];
          resumeDoc.certificates.push(uploadedFileInfo);
          if (!resumeDoc.certificateUrls) resumeDoc.certificateUrls = [];
          resumeDoc.certificateUrls.push(fileUrl);
          this.logger.debug(`添加到证书: ${fileUrl}, 总数: ${resumeDoc.certificates.length}`);
          break;
        case 'medicalReport':
          if (!resumeDoc.reports) resumeDoc.reports = [];
          resumeDoc.reports.push(uploadedFileInfo);
          if (!resumeDoc.medicalReportUrls) resumeDoc.medicalReportUrls = [];
          resumeDoc.medicalReportUrls.push(fileUrl);
          this.logger.debug(`添加到体检报告: ${fileUrl}, 总数: ${resumeDoc.reports.length}`);
          break;
        case 'selfIntroductionVideo':
          resumeDoc.selfIntroductionVideo = uploadedFileInfo;
          this.logger.debug(`设置自我介绍视频: ${fileUrl}`);
          break;
        case 'confinementMealPhoto':
          if (!resumeDoc.confinementMealPhotos) resumeDoc.confinementMealPhotos = [];
          resumeDoc.confinementMealPhotos.push(uploadedFileInfo);
          this.logger.debug(`添加到月子餐照片: ${fileUrl}, 总数: ${resumeDoc.confinementMealPhotos.length}`);
          break;
        case 'cookingPhoto':
          if (!resumeDoc.cookingPhotos) resumeDoc.cookingPhotos = [];
          resumeDoc.cookingPhotos.push(uploadedFileInfo);
          this.logger.debug(`添加到烹饪照片: ${fileUrl}, 总数: ${resumeDoc.cookingPhotos.length}`);
          break;
        case 'complementaryFoodPhoto':
          if (!resumeDoc.complementaryFoodPhotos) resumeDoc.complementaryFoodPhotos = [];
          resumeDoc.complementaryFoodPhotos.push(uploadedFileInfo);
          this.logger.debug(`添加到辅食添加照片: ${fileUrl}, 总数: ${resumeDoc.complementaryFoodPhotos.length}`);
          break;
        case 'positiveReviewPhoto':
          if (!resumeDoc.positiveReviewPhotos) resumeDoc.positiveReviewPhotos = [];
          resumeDoc.positiveReviewPhotos.push(uploadedFileInfo);
          this.logger.debug(`添加到好评展示照片: ${fileUrl}, 总数: ${resumeDoc.positiveReviewPhotos.length}`);
          break;
        case 'workExperiencePhoto':
          // 工作经历照片暂时不存储在简历顶层，由前端在保存时关联到具体的工作经历
          // 这里只返回上传成功的文件信息，前端会将其添加到对应的工作经历中
          this.logger.debug(`工作经历照片上传成功: ${fileUrl}`);
          break;
        default:
          // 移除默认归类，如果到了这里说明验证有问题
          this.logger.error(`文件类型验证失败，未处理的类型: ${fileType}`);
          throw new BadRequestException(`未知的文件类型: ${fileType}`);
      }

      this.logger.debug('保存更新后的简历信息');
      const savedResume = await resumeDoc.save();
      this.logger.debug(`简历更新成功，当前文件统计: photoUrls=${savedResume.photoUrls?.length || 0}, certificates=${savedResume.certificates?.length || 0}, reports=${savedResume.reports?.length || 0}`);

      // 返回包含文件URL的结果
      return {
        resume: savedResume,
        fileUrl: fileUrl,
        fileInfo: uploadedFileInfo
      };
    } catch (error) {
      this.logger.error(`文件上传处理失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  async removeFile(id: string, fileUrlOrId: string) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    this.logger.debug(`开始删除文件: resumeId=${id}, fileUrlOrId=${fileUrlOrId}`);

    // 判断传入的是完整URL还是fileId
    let fileUrl: string;
    let fileId: string | null = null;

    if (fileUrlOrId.startsWith('http://') || fileUrlOrId.startsWith('https://')) {
      // 传入的是完整URL
      fileUrl = fileUrlOrId;
      this.logger.debug(`处理完整URL: ${fileUrl}`);
    } else {
      // 传入的是fileId，构建URL
      fileId = fileUrlOrId;
      fileUrl = `/api/upload/file/${fileId}`;
      this.logger.debug(`根据fileId构建URL: ${fileUrl}`);
    }

    // 从简历中移除文件ID (如果有的话)
    if (fileId) {
      resume.fileIds = resume.fileIds.filter(id => id.toString() !== fileId);
    }

    // 从所有URL数组中移除对应的文件URL
    let fileRemoved = false;

    if (resume.photoUrls) {
      const originalLength = resume.photoUrls.length;
      resume.photoUrls = resume.photoUrls.filter(url => url !== fileUrl);
      if (resume.photoUrls.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从photoUrls中移除了文件: ${fileUrl}`);
      }
    }

    if (resume.certificateUrls) {
      const originalLength = resume.certificateUrls.length;
      resume.certificateUrls = resume.certificateUrls.filter(url => url !== fileUrl);
      if (resume.certificateUrls.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从certificateUrls中移除了文件: ${fileUrl}`);
      }
    }

    if (resume.medicalReportUrls) {
      const originalLength = resume.medicalReportUrls.length;
      resume.medicalReportUrls = resume.medicalReportUrls.filter(url => url !== fileUrl);
      if (resume.medicalReportUrls.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从medicalReportUrls中移除了文件: ${fileUrl}`);
      }
    }

    // 从结构化文件信息中移除
    if (resume.personalPhoto && Array.isArray(resume.personalPhoto)) {
      const originalLength = resume.personalPhoto.length;
      resume.personalPhoto = resume.personalPhoto.filter(photo => photo.url !== fileUrl);
      if (resume.personalPhoto.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从personalPhoto数组中移除了文件: ${fileUrl}`);
      }
    }

    if (resume.certificates) {
      const originalLength = resume.certificates.length;
      resume.certificates = resume.certificates.filter(cert => cert.url !== fileUrl);
      if (resume.certificates.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从certificates中移除了文件: ${fileUrl}`);
      }
    }

    if (resume.reports) {
      const originalLength = resume.reports.length;
      resume.reports = resume.reports.filter(report => report.url !== fileUrl);
      if (resume.reports.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从reports中移除了文件: ${fileUrl}`);
      }
    }

    // 从月子餐照片中移除
    if (resume.confinementMealPhotos && Array.isArray(resume.confinementMealPhotos)) {
      const originalLength = resume.confinementMealPhotos.length;
      resume.confinementMealPhotos = resume.confinementMealPhotos.filter(photo => photo.url !== fileUrl);
      if (resume.confinementMealPhotos.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从confinementMealPhotos数组中移除了文件: ${fileUrl}`);
      }
    }

    // 从辅食添加照片中移除
    if (resume.complementaryFoodPhotos && Array.isArray(resume.complementaryFoodPhotos)) {
      const originalLength = resume.complementaryFoodPhotos.length;
      resume.complementaryFoodPhotos = resume.complementaryFoodPhotos.filter(photo => photo.url !== fileUrl);
      if (resume.complementaryFoodPhotos.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从complementaryFoodPhotos数组中移除了文件: ${fileUrl}`);
      }
    }

    // 从好评展示照片中移除
    if (resume.positiveReviewPhotos && Array.isArray(resume.positiveReviewPhotos)) {
      const originalLength = resume.positiveReviewPhotos.length;
      resume.positiveReviewPhotos = resume.positiveReviewPhotos.filter(photo => photo.url !== fileUrl);
      if (resume.positiveReviewPhotos.length < originalLength) {
        fileRemoved = true;
        this.logger.debug(`从positiveReviewPhotos数组中移除了文件: ${fileUrl}`);
      }
    }

    // 检查身份证照片
    if (resume.idCardFront?.url === fileUrl) {
      resume.idCardFront = undefined;
      fileRemoved = true;
      this.logger.debug(`移除了idCardFront: ${fileUrl}`);
    }

    if (resume.idCardBack?.url === fileUrl) {
      resume.idCardBack = undefined;
      fileRemoved = true;
      this.logger.debug(`移除了idCardBack: ${fileUrl}`);
    }

    // 保存更新后的简历
    await resume.save();

    // 尝试删除物理文件
    try {
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        // 对于完整的COS URL，直接调用uploadService删除
        await this.uploadService.deleteFile(fileUrl);
        this.logger.log(`物理文件删除成功: ${fileUrl}`);
      } else if (fileId) {
        // 对于fileId，也可以尝试删除
        await this.uploadService.deleteFile(fileId);
        this.logger.log(`物理文件删除成功: ${fileId}`);
      }
    } catch (deleteError) {
      this.logger.warn(`物理文件删除失败，但数据库记录已清理: ${deleteError.message}`);
      // 不抛出错误，因为数据库记录已经清理完成
    }

    if (fileRemoved) {
      this.logger.log(`文件删除成功: ${fileUrl}`);
      return { message: '文件删除成功' };
    } else {
      this.logger.warn(`未找到要删除的文件: ${fileUrl}`);
      return { message: '文件未找到，可能已被删除' };
    }
  }

  /**
   * 根据文件URL和类型删除文件（小程序专用）
   */
  async removeFileByUrl(id: string, fileUrl: string, fileType: string) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    this.logger.debug(`开始删除文件: resumeId=${id}, fileType=${fileType}, fileUrl=${fileUrl}`);

    let fileRemoved = false;

    // 根据文件类型进行删除
    switch (fileType) {
      case 'idCardFront':
        if (resume.idCardFront?.url === fileUrl) {
          resume.idCardFront = undefined;
          fileRemoved = true;
          this.logger.debug(`移除了idCardFront: ${fileUrl}`);
        }
        break;

      case 'idCardBack':
        if (resume.idCardBack?.url === fileUrl) {
          resume.idCardBack = undefined;
          fileRemoved = true;
          this.logger.debug(`移除了idCardBack: ${fileUrl}`);
        }
        break;

      case 'personalPhoto':
        // 从photoUrls数组中移除
        if (resume.photoUrls) {
          const originalLength = resume.photoUrls.length;
          resume.photoUrls = resume.photoUrls.filter(url => url !== fileUrl);
          if (resume.photoUrls.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从photoUrls中移除了文件: ${fileUrl}`);
          }
        }
        // 从personalPhoto数组中移除匹配的文件
        if (resume.personalPhoto && Array.isArray(resume.personalPhoto)) {
          const originalLength = resume.personalPhoto.length;
          resume.personalPhoto = resume.personalPhoto.filter(photo => photo.url !== fileUrl);
          if (resume.personalPhoto.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从personalPhoto数组中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'certificate':
        // 从certificates数组中移除
        if (resume.certificates) {
          const originalLength = resume.certificates.length;
          resume.certificates = resume.certificates.filter(cert => cert.url !== fileUrl);
          if (resume.certificates.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从certificates中移除了文件: ${fileUrl}`);
          }
        }
        // 从certificateUrls数组中移除
        if (resume.certificateUrls) {
          const originalLength = resume.certificateUrls.length;
          resume.certificateUrls = resume.certificateUrls.filter(url => url !== fileUrl);
          if (resume.certificateUrls.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从certificateUrls中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'medicalReport':
        // 从reports数组中移除
        if (resume.reports) {
          const originalLength = resume.reports.length;
          resume.reports = resume.reports.filter(report => report.url !== fileUrl);
          if (resume.reports.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从reports中移除了文件: ${fileUrl}`);
          }
        }
        // 从medicalReportUrls数组中移除
        if (resume.medicalReportUrls) {
          const originalLength = resume.medicalReportUrls.length;
          resume.medicalReportUrls = resume.medicalReportUrls.filter(url => url !== fileUrl);
          if (resume.medicalReportUrls.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从medicalReportUrls中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'selfIntroductionVideo':
        // 移除自我介绍视频
        if (resume.selfIntroductionVideo && resume.selfIntroductionVideo.url === fileUrl) {
          resume.selfIntroductionVideo = null;
          fileRemoved = true;
          this.logger.debug(`移除了自我介绍视频: ${fileUrl}`);
        }
        break;

      case 'confinementMealPhoto':
        // 从confinementMealPhotos数组中移除
        if (resume.confinementMealPhotos) {
          const originalLength = resume.confinementMealPhotos.length;
          resume.confinementMealPhotos = resume.confinementMealPhotos.filter(photo => photo.url !== fileUrl);
          if (resume.confinementMealPhotos.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从confinementMealPhotos中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'cookingPhoto':
        // 从cookingPhotos数组中移除
        if (resume.cookingPhotos) {
          const originalLength = resume.cookingPhotos.length;
          resume.cookingPhotos = resume.cookingPhotos.filter(photo => photo.url !== fileUrl);
          if (resume.cookingPhotos.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从cookingPhotos中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'complementaryFoodPhoto':
        // 从complementaryFoodPhotos数组中移除
        if (resume.complementaryFoodPhotos) {
          const originalLength = resume.complementaryFoodPhotos.length;
          resume.complementaryFoodPhotos = resume.complementaryFoodPhotos.filter(photo => photo.url !== fileUrl);
          if (resume.complementaryFoodPhotos.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从complementaryFoodPhotos中移除了文件: ${fileUrl}`);
          }
        }
        break;

      case 'positiveReviewPhoto':
        // 从positiveReviewPhotos数组中移除
        if (resume.positiveReviewPhotos) {
          const originalLength = resume.positiveReviewPhotos.length;
          resume.positiveReviewPhotos = resume.positiveReviewPhotos.filter(photo => photo.url !== fileUrl);
          if (resume.positiveReviewPhotos.length < originalLength) {
            fileRemoved = true;
            this.logger.debug(`从positiveReviewPhotos中移除了文件: ${fileUrl}`);
          }
        }
        break;

      default:
        throw new BadRequestException(`不支持的文件类型: ${fileType}`);
    }

    if (!fileRemoved) {
      throw new NotFoundException('未找到要删除的文件');
    }

    // 保存更新后的简历
    await resume.save();

    // 尝试删除物理文件
    try {
      await this.uploadService.deleteFile(fileUrl);
      this.logger.log(`物理文件删除成功: ${fileUrl}`);
    } catch (deleteError) {
      this.logger.warn(`物理文件删除失败，但数据库记录已清理: ${deleteError.message}`);
      // 不抛出错误，因为数据库记录已经清理完成
    }

    this.logger.log(`文件删除成功: ${fileUrl}`);
    return resume;
  }

  /**
   * V2版本创建简历 - 支持幂等性、去重和规范化
   */
  async createV2(dto: CreateResumeV2Dto, idempotencyKey?: string, userId?: string) {
    // 1. 幂等性检查
    if (idempotencyKey) {
      const cacheKey = `idempotency:${idempotencyKey}`;
      const cached = this.idempotencyCache.get(cacheKey);
      if (cached) {
        this.logger.log(`幂等性命中，返回缓存结果: ${idempotencyKey}`);
        return cached;
      }
    }

    // 2. 数据规范化和校验
    const normalizedDto = this.normalizeResumeData(dto);

    // 3. 手机号去重检查
    const existingResume = await this.resumeModel.findOne({ phone: normalizedDto.phone });
    if (existingResume) {
      if (dto.createOrUpdate) {
        // 允许更新模式
        const updatedResume = await this.updateExistingResume(existingResume._id.toString(), normalizedDto, userId);
        const result = {
          id: updatedResume._id.toString(),
          createdAt: (updatedResume as any).createdAt,
          action: 'UPDATED'
        };

        // 缓存结果
        if (idempotencyKey) {
          this.idempotencyCache.set(`idempotency:${idempotencyKey}`, result);
          // 5分钟后清除缓存
          setTimeout(() => this.idempotencyCache.delete(`idempotency:${idempotencyKey}`), 5 * 60 * 1000);
        }

        return result;
      } else {
        // 返回409冲突
        throw new ConflictException({
          message: '该手机号已被使用',
          existingId: existingResume._id.toString()
        });
      }
    }

    // 4. 创建新简历
    const resumeData: any = {
      ...normalizedDto,
      userId: userId ? new Types.ObjectId(userId) : undefined,
      status: 'pending',
      fileIds: [],
      // ⭐ 强制设置 leadSource 为销售创建，不信任前端传递的值
      leadSource: 'other'  // 销售创建的简历默认为 'other'，可根据业务需求调整
    };

    // 清理空值避免索引问题
    if (!resumeData.idNumber) {
      delete resumeData.idNumber;
    }

    try {
      const resume = new this.resumeModel(resumeData);
      const savedResume = await resume.save();

      const result = {
        id: savedResume._id.toString(),
        createdAt: (savedResume as any).createdAt,
        action: 'CREATED'
      };

      // 缓存结果
      if (idempotencyKey) {
        this.idempotencyCache.set(`idempotency:${idempotencyKey}`, result);
        setTimeout(() => this.idempotencyCache.delete(`idempotency:${idempotencyKey}`), 5 * 60 * 1000);
      }

      this.logger.log(`v2简历创建成功: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('v2简历创建失败:', error);
      throw new BadRequestException(`创建简历失败: ${error.message}`);
    }
  }

  /**
   * 数据规范化处理
   */
  private normalizeResumeData(dto: CreateResumeV2Dto) {
    const normalized = { ...dto };

    // 规范化手机号（已在DTO中处理，这里再次确保）
    if (normalized.phone) {
      normalized.phone = normalized.phone.replace(/\D/g, '');
    }

    // 规范化字符串字段
    ['name', 'nativePlace', 'selfIntroduction'].forEach(field => {
      if (normalized[field] && typeof normalized[field] === 'string') {
        normalized[field] = normalized[field].trim().replace(/[\u3000\s]+/g, ' ');
      }
    });

    // 确保数组字段
    if (!Array.isArray(normalized.skills)) {
      normalized.skills = [];
    }
    if (!Array.isArray(normalized.serviceArea)) {
      normalized.serviceArea = [];
    }

    // 技能枚举校验和过滤
    const validSkills = ['chanhou', 'teshu-yinger', 'yiliaobackground', 'yuying', 'zaojiao', 'fushi', 'ertui', 'waiyu', 'zhongcan', 'xican', 'mianshi', 'jiashi', 'shouyi', 'muying', 'cuiru', 'yuezican', 'yingyang', 'liliao-kangfu', 'shuangtai-huli', 'yanglao-huli'];
    normalized.skills = normalized.skills.filter(skill => validSkills.includes(skill));

    // 设置默认值
    if (normalized.experienceYears === undefined) {
      normalized.experienceYears = 0;
    }

    return normalized;
  }

  /**
   * 更新已存在的简历
   */
  private async updateExistingResume(id: string, data: any, userId?: string) {
    const updateData = { ...data };

    // ⭐ 安全检查：不允许更新 leadSource 字段，保持原有来源标记
    if (updateData.leadSource !== undefined) {
      this.logger.warn(`⚠️ 前端尝试修改 leadSource 字段，已忽略`);
      delete updateData.leadSource;
    }

    if (userId) {
      updateData.lastUpdatedBy = new Types.ObjectId(userId);
    }

    const resume = await this.resumeModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      updateData,
      { new: true, runValidators: true }
    );

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    return resume;
  }

  /**
   * 兼容测试用例的 create 方法
   */
  async create(createResumeDto: CreateResumeDto) {
    // 检查手机号唯一性
    const exist = await this.resumeModel.findOne({ phone: createResumeDto.phone });
    if (exist) {
      throw new ConflictException('该手机号已被使用');
    }

    // 复制DTO以避免修改原始对象
    const resumeData = { ...createResumeDto };

    // 如果idNumber为null、空字符串或undefined，则删除它，避免唯一索引问题
    if (resumeData.idNumber === null || resumeData.idNumber === '' || resumeData.idNumber === undefined) {
      delete resumeData.idNumber;
      this.logger.log('检测到空的idNumber字段，已从数据中删除');
    }

    const resume = new this.resumeModel(resumeData);
    return resume.save();
  }

  async updateWithFiles(
    id: string,
    updateResumeDto: UpdateResumeDto,
    files?: Express.Multer.File[],
    fileTypes?: string[],
    userId?: string
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

    // 更新简历基本信息，但跳过undefined值和文件相关字段
    this.logger.log(`📋 updateWithFiles 接收到的DTO: ${JSON.stringify({
      learningIntention: updateResumeDto.learningIntention,
      currentStage: updateResumeDto.currentStage,
      allKeys: Object.keys(updateResumeDto)
    })}`);

    const updateFields = Object.keys(updateResumeDto)
      .filter(key => updateResumeDto[key] !== undefined && updateResumeDto[key] !== null)
      .filter(key => !['idCardFront', 'idCardBack', 'photoUrls', 'certificateUrls', 'medicalReportUrls', 'certificates', 'reports', 'personalPhoto'].includes(key))
      .reduce((obj, key) => {
        obj[key] = updateResumeDto[key];
        return obj;
      }, {});

    this.logger.log(`✅ 准备更新的字段: ${JSON.stringify(updateFields)}`);

    // 只更新非undefined和非文件相关的字段
    Object.assign(resume, updateFields);

    // 设置最后更新人
    if (userId) {
      resume.lastUpdatedBy = new Types.ObjectId(userId);
    }

    // 更新分类文件信息
    Object.keys(categorizedFiles).forEach(type => {
      switch (type) {
        case 'personalPhoto':
          // 支持多张个人照片
          if (!resume.personalPhoto) resume.personalPhoto = [];
          resume.personalPhoto.push(...categorizedFiles[type]);
          if (!resume.photoUrls) resume.photoUrls = [];
          resume.photoUrls.push(...categorizedFiles[type].map(f => f.url));
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
        case 'selfIntroductionVideo':
          resume.selfIntroductionVideo = categorizedFiles[type][0];
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

    this.logger.log(`📝 简历更新成功详情:`);
    this.logger.log(`  - 简历ID: ${id}`);
    this.logger.log(`  - 姓名: ${savedResume.name}`);
    this.logger.log(`  - updatedAt: ${(savedResume as any).updatedAt}`);
    this.logger.log(`  - createdAt: ${(savedResume as any).createdAt}`);
    this.logger.log(`  - 文件统计: ${JSON.stringify({
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

  /**
   * 获取所有简历的筛选选项
   * 包括籍贯和民族列表
   */
  async getFilterOptions() {
    // 获取所有简历记录
    const resumes = await this.resumeModel.find({}, { nativePlace: 1, ethnicity: 1 }).exec();

    // 手动收集不同的籍贯和民族
    const nativePlaceSet = new Set<string>();
    const ethnicitySet = new Set<string>();

    resumes.forEach(resume => {
      if (resume.nativePlace && typeof resume.nativePlace === 'string' && resume.nativePlace.trim() !== '') {
        nativePlaceSet.add(resume.nativePlace.trim());
      }

      if (resume.ethnicity && typeof resume.ethnicity === 'string' && resume.ethnicity.trim() !== '') {
        ethnicitySet.add(resume.ethnicity.trim());
      }
    });

    // 转换为数组并排序
    const nativePlaces = Array.from(nativePlaceSet).sort();
    const ethnicities = Array.from(ethnicitySet).sort();

    return {
      nativePlaces,
      ethnicities
    };
  }

  /**
   * 搜索服务人员
   * 根据手机号或姓名搜索简历库中的服务人员
   */
  async searchWorkers(phone?: string, name?: string, limit: number = 10) {
    try {
      const orConditions = [];
      if (phone) {
        orConditions.push({ phone: { $regex: phone, $options: 'i' } });
      }
      if (name) {
        orConditions.push({ name: { $regex: name, $options: 'i' } });
      }

      if (orConditions.length === 0) {
        return [];
      }

      const query = { $or: orConditions };

      this.logger.log(`搜索服务人员，查询条件: ${JSON.stringify(query)}`);

      const workers = await this.resumeModel
        .find(query)
        .sort({ updatedAt: -1, createdAt: -1 }) // 先排序
        .select('_id name phone idNumber age jobType nativePlace currentAddress')
        .limit(limit)
        .exec();

      this.logger.log(`搜索结果: ${JSON.stringify(workers, null, 2)}`);

      return workers;
    } catch (error) {
      this.logger.error(`搜索服务人员失败: ${error.message}`, error.stack);
      throw new Error('搜索服务人员失败');
    }
  }

  /**
   * 批量修复所有缺失的 updatedAt 字段
   */
  public async batchFixMissingUpdatedAt() {
    return this.resumeQueryService.batchFixMissingUpdatedAt();
  }

  /**
   * 从Excel文件导入简历数据
   * @param filePath Excel文件路径
   * @param userId 当前用户ID
   */
  async importFromExcel(filePath: string, userId: string): Promise<{ success: number; fail: number; errors: string[] }> {
    this.logger.log(`开始处理Excel文件导入: ${filePath}`);

    // 统计结果
    const result = {
      success: 0,
      fail: 0,
      errors: [] as string[]
    };

    try {
      // 使用ExcelJS读取文件
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      // 获取第一个工作表
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new BadRequestException('Excel文件中没有找到工作表');
      }

      // 检查是否有数据
      if (worksheet.rowCount <= 1) {
        throw new BadRequestException('Excel文件中没有数据');
      }

      // 获取表头
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString().trim() || '';
      });

      // 检查必需的列是否存在
      const requiredColumns = ['姓名', '手机号', '工种'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        throw new BadRequestException(`Excel文件缺少必需的列: ${missingColumns.join(', ')}`);
      }

      // 解析每一行数据
      const promises = [];

      // 从第二行开始，跳过表头
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData: Record<string, any> = {};

        // 获取每个单元格的值
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            rowData[header] = cell.value;
          }
        });

        // 检查必填字段
        if (!rowData['姓名'] || !rowData['手机号'] || !rowData['工种']) {
          result.fail++;
          result.errors.push(`第 ${rowNumber} 行缺少必填字段`);
          continue;
        }

        // 转换数据为DTO格式
        const resumeData = this.mapExcelRowToResumeDto(rowData, userId);

        // 创建简历(异步)
        promises.push(
          this.create(resumeData)
            .then(() => {
              result.success++;
            })
            .catch(error => {
              result.fail++;
              result.errors.push(`第 ${rowNumber} 行导入失败: ${error.message}`);
            })
        );
      }

      // 等待所有创建操作完成
      await Promise.all(promises);

      // 清理临时文件
      fs.unlinkSync(filePath);

      this.logger.log(`Excel导入完成，成功: ${result.success}, 失败: ${result.fail}`);
      return result;
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      this.logger.error(`Excel导入过程中发生错误: ${error.message}`);
      throw error;
    }
  }

  /**
   * 将Excel行数据映射到简历DTO
   */
  private mapExcelRowToResumeDto(rowData: Record<string, any>, userId: string): CreateResumeDto {
    // 工种映射
    const jobTypeMap: Record<string, string> = {
      '月嫂': 'yuexin',
      '住家育儿嫂': 'zhujia-yuer',
      '白班育儿': 'baiban-yuer',
      '保洁': 'baojie',
      '白班保姆': 'baiban-baomu',
      '住家保姆': 'zhujia-baomu',
      '养宠': 'yangchong',
      '小时工': 'xiaoshi',
      '住家护老': 'zhujia-hulao'
    };

    // 性别映射
    const genderMap: Record<string, string> = {
      '男': 'male',
      '女': 'female'
    };

    // 学历映射
    const educationMap: Record<string, string> = {
      '小学': 'primary',
      '初中': 'juniorHigh',
      '高中': 'highSchool',
      '中专': 'technicalSchool',
      '大专': 'associateDegree',
      '本科': 'bachelor',
      '硕士': 'master',
      '博士': 'doctorate'
    };

    // 创建基本数据
    const dto: any = {
      userId,
      name: rowData['姓名']?.toString().trim(),
      phone: rowData['手机号']?.toString().trim(),
      jobType: jobTypeMap[rowData['工种']?.toString().trim()] || rowData['工种']?.toString().trim(),
      status: 'pending'
    };

    // 可选字段
    if (rowData['性别']) {
      dto.gender = genderMap[rowData['性别']?.toString().trim()] || 'female';
    }

    if (rowData['年龄']) {
      dto.age = Number(rowData['年龄']) || 0;
    }

    if (rowData['身份证号']) {
      dto.idNumber = rowData['身份证号']?.toString().trim();
    }

    if (rowData['微信']) {
      dto.wechat = rowData['微信']?.toString().trim();
    }

    if (rowData['期望职位']) {
      dto.expectedPosition = rowData['期望职位']?.toString().trim();
    }

    if (rowData['工作经验']) {
      dto.experienceYears = Number(rowData['工作经验']) || 0;
      dto.workExperience = Number(rowData['工作经验']) || 0;
    }

    if (rowData['学历']) {
      dto.education = educationMap[rowData['学历']?.toString().trim()] || 'juniorHigh';
    }

    if (rowData['期望薪资']) {
      dto.expectedSalary = Number(rowData['期望薪资']) || 0;
    }

    if (rowData['籍贯']) {
      dto.nativePlace = rowData['籍贯']?.toString().trim();
    }

    if (rowData['民族']) {
      dto.ethnicity = rowData['民族']?.toString().trim();
    }

    if (rowData['接单状态']) {
      const statusMap: Record<string, string> = {
        '想接单': 'accepting',
        '不接单': 'not-accepting',
        '已签约': 'signed',
        '已上户': 'on-service'
      };
      dto.orderStatus = statusMap[rowData['接单状态']?.toString().trim()] || 'accepting';
    }

    // 返回转换后的DTO
    return dto as CreateResumeDto;
  }

  /**
   * 调试方法：直接查询最新的记录
   */
  async debugLatestRecords(limit: number = 10) {
    try {
      this.logger.log(`🔍 直接查询最新的${limit}条记录...`);

      const records = await this.resumeModel
        .find({})
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(limit)
        .select('name updatedAt createdAt')
        .lean()
        .exec();

      this.logger.log(`🔍 查询到${records.length}条记录`);
      return records;
    } catch (error) {
      this.logger.error('❌ 调试查询失败:', error);
      throw error;
    }
  }

  /**
   * 生成分享令牌（仅包含简历ID与有效期）
   */
  public createShareToken(resumeId: string, expiresInHours = 72) {
    if (!resumeId) throw new BadRequestException('简历ID不能为空');
    const payload = { rid: resumeId };
    const expiresIn = `${expiresInHours}h`;
    const token = this.jwtService.sign(payload, { expiresIn });
    const expireAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();
    return { token, expireAt };
  }

  /**
   * 通过分享令牌获取脱敏后的公开简历详情
   */
  public async findSharedByToken(token: string) {
    try {
      const payload: any = this.jwtService.verify(token);
      const rid = payload?.rid;
      if (!rid) throw new BadRequestException('无效的分享令牌');
      const resume = await this.resumeModel.findById(new Types.ObjectId(rid)).lean();
      if (!resume) throw new NotFoundException('分享已失效或简历不存在');
      return this.toMaskedPublicResume(resume as any);
    } catch (e) {
      this.logger.warn(`分享令牌校验失败: ${e?.message}`);
      throw new BadRequestException('分享链接无效或已过期');
    }
  }

  /** 将原始简历转换为公开可见（脱敏）结构 */
  private toMaskedPublicResume(r: any) {
    if (!r) return null;
    const result: any = {
      id: (r._id || r.id)?.toString?.(),
      nameMasked: this.maskName(r.name),
      phoneMasked: this.maskPhone(r.phone),
      gender: r.gender,
      age: r.age,
      jobType: r.jobType,
      education: r.education,
      experienceYears: r.experienceYears,
      expectedPosition: r.expectedPosition,
      expectedSalary: r.expectedSalary,
      nativePlace: r.nativePlace,
      skills: r.skills,
      selfIntroduction: r.selfIntroduction,
      serviceArea: r.serviceArea,
      photoUrls: r.photoUrls,
      // 自我介绍视频（公开可见）
      selfIntroductionVideo: r.selfIntroductionVideo || null,
      selfIntroductionVideoUrl: r.selfIntroductionVideo?.url || null,
      // 工作经历（保留必要字段）
      workExperiences: r.workExperiences || r.workHistory || []
    };

    // 去掉强敏感信息（即使存在也不返回）
    delete result.idNumber;
    delete result.idCardFront;
    delete result.idCardBack;
    delete result.personalPhoto;
    delete result.certificates;
    delete result.reports;
    delete result.certificateUrls;
    delete result.medicalReportUrls;
    delete result.emergencyContactName;
    delete result.emergencyContactPhone;
    delete result.currentAddress;
    delete result.hukouAddress;
    delete result.birthDate;
    return result;
  }

  private maskName(name?: string) {
    if (!name) return '';
    const first = name.charAt(0);
    return `${first}**`;
  }

  private maskPhone(phone?: string) {
    if (!phone) return '';
    const m = String(phone).match(/^(\d{3})(\d{4})(\d{4})$/);
    if (m) return `${m[1]}****${m[3]}`;
    // 通用兜底：仅显示前3后2
    if (phone.length > 5) return `${phone.slice(0,3)}****${phone.slice(-2)}`;
    return '****';
  }
  /**
   * 获取公开脱敏简历列表（无需登录）
   */
  public async findPublicList(page = 1, pageSize = 20, keyword?: string, jobType?: string, nativePlace?: string) {
    try {
      const query: any = {};

      // 关键词搜索（姓名、工种）
      if (keyword) {
        query.$or = [
          { name: { $regex: keyword, $options: 'i' } },
          { jobType: { $regex: keyword, $options: 'i' } }
        ];
      }

      // 工种筛选
      if (jobType) {
        query.jobType = jobType;
      }

      // 籍贯筛选
      if (nativePlace) {
        query.nativePlace = nativePlace;
      }

      const skip = (page - 1) * pageSize;
      const total = await this.resumeModel.countDocuments(query);

      const resumes = await this.resumeModel
        .find(query)
        .select('_id name phone gender age jobType education experienceYears nativePlace skills expectedSalary serviceArea photoUrls selfIntroduction')
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean();

      // 脱敏处理
      const maskedResumes = resumes.map(resume => ({
        id: resume._id.toString(),
        nameMasked: this.maskName(resume.name),
        phoneMasked: this.maskPhone(resume.phone),
        gender: resume.gender,
        age: resume.age,
        jobType: resume.jobType,
        education: resume.education,
        experienceYears: resume.experienceYears,
        nativePlace: resume.nativePlace,
        skills: resume.skills,
        expectedSalary: resume.expectedSalary,
        serviceArea: resume.serviceArea,
        photoUrls: resume.photoUrls,
        selfIntroduction: resume.selfIntroduction
      }));

      return {
        items: maskedResumes,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    } catch (error) {
      this.logger.error(`获取公开简历列表失败: ${error.message}`);
      throw error;
    }
  }

  async updatePersonalPhotos(id: string, photos: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>, userId?: string) {
    const resume = await this.resumeModel.findById(new Types.ObjectId(id));
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    // 更新个人照片数组，保持传入的顺序
    resume.personalPhoto = photos.map(photo => ({
      url: photo.url,
      filename: photo.filename || '',
      size: photo.size || 0,
      mimetype: photo.mimetype || 'image/jpeg'
    }));

    // 同时更新photoUrls数组以保持兼容性
    resume.photoUrls = photos.map(photo => photo.url);

    // 设置最后更新人
    if (userId) {
      resume.lastUpdatedBy = new Types.ObjectId(userId);
    }

    await resume.save();

    this.logger.log(`个人照片排序更新成功: ${id}, 照片数量: ${photos.length}`);
    return resume;
  }

  /**
   * 根据手机号查找简历
   */
  async findByPhone(phone: string) {
    return this.resumeQueryService.findByPhone(phone);
  }

  /**
   * 统计简历总数
   */
  async count(): Promise<number> {
    return await this.resumeModel.countDocuments();
  }

  /**
   * 统计包含自我介绍的简历数量
   */
  async countWithSelfIntroduction(): Promise<number> {
    return await this.resumeModel.countDocuments({
      selfIntroduction: { $exists: true, $nin: [null, ''] }
    });
  }

  /**
   * 统计最近N天创建的简历数量
   */
  async countRecentResumes(days: number): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.resumeModel.countDocuments({
      createdAt: { $gte: startDate }
    });
  }

  /**
   * 根据身份证号查找简历
   */
  async findByIdNumber(idNumber: string): Promise<IResume | null> {
    return this.resumeQueryService.findByIdNumber(idNumber);
  }

  /**
   * 限流检查
   * @param key 限流键（如IP地址、手机号等）
   * @param maxRequests 最大请求次数
   * @param windowSeconds 时间窗口（秒）
   * @returns { allowed: boolean, remaining: number }
   */
  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const cached = this.rateLimitCache.get(key);

    if (!cached || now > cached.resetTime) {
      // 创建新的限流记录
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + windowSeconds * 1000
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (cached.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // 增加计数
    cached.count++;
    this.rateLimitCache.set(key, cached);
    return { allowed: true, remaining: maxRequests - cached.count };
  }

  /**
   * 小程序阿姨自助注册 - 完整业务逻辑（含数据验证、限流、去重、DTO组装）
   * 将原 controller 中的验证与业务规则集中到服务层，controller 只负责提取 IP 并调用本方法。
   */
  async selfRegisterMiniprogram(
    dto: CreateResumeV2Dto,
    requestIp: string,
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      _id: string;
      id: string;
      name: string;
      phone: string;
      status: string;
      leadSource: string;
      createdAt: any;
    };
    error?: string;
    details?: Array<{ field: string; message: string }>;
    status?: number;
  }> {
    this.logger.log(`新建自助注册简历:`);
    this.logger.log(`注册数据: ${JSON.stringify(dto, null, 2)}`);
    this.logger.log(`请求IP: ${requestIp}`);

    // ---------- 数据验证 ----------
    if (!dto.name || dto.name.trim().length < 2 || dto.name.trim().length > 20) {
      return {
        success: false,
        message: '数据验证失败',
        error: 'VALIDATION_ERROR',
        details: [{ field: 'name', message: '姓名必须是2-20个字符' }],
      };
    }

    if (!dto.phone || !/^1[3-9]\d{9}$/.test(dto.phone)) {
      return {
        success: false,
        message: '数据验证失败',
        error: 'VALIDATION_ERROR',
        details: [{ field: 'phone', message: '手机号格式不正确' }],
      };
    }

    if (!dto.age || dto.age < 18 || dto.age > 65) {
      return {
        success: false,
        message: '数据验证失败',
        error: 'VALIDATION_ERROR',
        details: [{ field: 'age', message: '年龄必须在18-65之间' }],
      };
    }

    if (!dto.gender || !['male', 'female'].includes(dto.gender)) {
      return {
        success: false,
        message: '数据验证失败',
        error: 'VALIDATION_ERROR',
        details: [{ field: 'gender', message: '性别必须是male或female' }],
      };
    }

    if (!dto.jobType) {
      return {
        success: false,
        message: '数据验证失败',
        error: 'VALIDATION_ERROR',
        details: [{ field: 'jobType', message: '工种不能为空' }],
      };
    }

    // 验证身份证号格式（如果提供）
    if (dto.idNumber) {
      const idRegex =
        /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
      if (!idRegex.test(dto.idNumber)) {
        return {
          success: false,
          message: '数据验证失败',
          error: 'VALIDATION_ERROR',
          details: [{ field: 'idNumber', message: '身份证号格式不正确' }],
        };
      }

      // 检查身份证号是否已存在
      const existingWithIdNumber = await this.findByIdNumber(dto.idNumber);
      if (existingWithIdNumber) {
        return {
          success: false,
          message: '该身份证号已注册',
          error: 'DUPLICATE_ID_NUMBER',
          status: 409,
        };
      }
    }

    // ---------- 限流检查（简单实现，生产环境应使用Redis）----------
    const rateLimitKey = `rate_limit:${requestIp}`;
    const rateLimitResult = await this.checkRateLimit(rateLimitKey, 3, 60); // 每分钟3次
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: '提交过于频繁，请稍后再试',
        error: 'RATE_LIMIT_EXCEEDED',
        status: 429,
      };
    }

    // ---------- 强制设置字段（不信任前端传值）----------
    // 使用 any 类型以允许设置 DTO 中未声明的 status 字段（与原 controller 行为一致）
    const selfRegisterDto: any = {
      ...dto,
      leadSource: 'self-registration', // 固定值，标记为自助注册
      status: 'draft',                 // 固定值
      education: dto.education || 'middle',
      expectedSalary: dto.expectedSalary || 0,
      experienceYears: dto.experienceYears || 0,
      workExperiences: dto.workExperiences || [],
      skills: dto.skills || [],
    };

    try {
      // 调用服务层创建简历（不需要userId）
      const result = await this.createSelfRegister(selfRegisterDto);

      this.logger.log(`自助注册成功:`, {
        resumeId: result._id,
        name: result.name,
        phone: result.phone,
        leadSource: result.leadSource,
        ip: requestIp,
      });

      return {
        success: true,
        message: '简历创建成功',
        data: {
          _id: result._id.toString(),
          id: result._id.toString(),
          name: result.name,
          phone: result.phone,
          status: result.status,
          leadSource: result.leadSource,
          createdAt: (result as any).createdAt,
        },
      };
    } catch (error) {
      this.logger.error(`自助注册失败: ${error.message}`, error.stack);

      // 处理特定错误类型
      if (error instanceof ConflictException) {
        return {
          success: false,
          message: error.message,
          error: 'DUPLICATE_ERROR',
          status: 409,
        };
      }

      if (error instanceof BadRequestException) {
        return {
          success: false,
          message: error.message,
          error: 'VALIDATION_ERROR',
          status: 400,
        };
      }

      return {
        success: false,
        message: '服务器内部错误',
        error: 'INTERNAL_ERROR',
        status: 500,
      };
    }
  }

  /**
   * 阿姨自助注册 - 创建简历（无需JWT认证）
   */
  async createSelfRegister(dto: CreateResumeV2Dto): Promise<IResume> {
    // 数据规范化
    const normalizedDto = this.normalizeResumeData(dto);

    // 检查手机号是否已存在
    const existingResume = await this.resumeModel.findOne({ phone: normalizedDto.phone });
    if (existingResume) {
      throw new ConflictException('该手机号已注册');
    }

    // 检查身份证号是否已存在（如果提供）
    if (normalizedDto.idNumber) {
      const existingWithIdNumber = await this.resumeModel.findOne({ idNumber: normalizedDto.idNumber });
      if (existingWithIdNumber) {
        throw new ConflictException('该身份证号已注册');
      }
    }

    // 创建简历数据
    const resumeData: any = {
      ...normalizedDto,
      leadSource: 'self-registration',  // 强制设置，使用leadSource字段标记来源
      status: 'draft',                  // 强制设置
      userId: null,                     // 自助注册时没有userId
      fileIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 清理空值避免索引问题
    if (!resumeData.idNumber) {
      delete resumeData.idNumber;
    }

    try {
      const resume = new this.resumeModel(resumeData);
      const savedResume = await resume.save();
      this.logger.log(`✅ 自助注册简历创建成功: ${savedResume._id}`);
      return savedResume;
    } catch (error) {
      this.logger.error('❌ 自助注册简历创建失败:', error);

      // 处理MongoDB唯一索引冲突
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        if (field === 'phone') {
          throw new ConflictException('该手机号已注册');
        } else if (field === 'idNumber') {
          throw new ConflictException('该身份证号已注册');
        }
        throw new ConflictException('数据重复');
      }

      throw new BadRequestException(`创建简历失败: ${error.message}`);
    }
  }

  /**
   * 将简历文档格式化为小程序友好的响应对象。
   * 供 createForMiniprogram、getForMiniprogram、updateForMiniprogram 三个接口共用，
   * 统一维护字段映射，避免重复的大块内联对象拼装。
   *
   * @param resume 从数据库取出的简历文档（IResume）
   * @returns 包含所有小程序所需字段的普通对象
   */
  public formatResumeForMiniprogram(resume: any): Record<string, any> {
    return {
      id: resume._id || resume.id,
      name: resume.name,
      phone: resume.phone,
      age: resume.age,
      gender: resume.gender,
      jobType: resume.jobType,
      education: resume.education,
      experienceYears: resume.experienceYears,
      nativePlace: resume.nativePlace,
      selfIntroduction: resume.selfIntroduction, // 自我介绍
      internalEvaluation: resume.internalEvaluation, // 内部员工评价
      wechat: resume.wechat,
      currentAddress: resume.currentAddress,
      hukouAddress: resume.hukouAddress,
      birthDate: resume.birthDate,
      skills: resume.skills || [],
      serviceArea: resume.serviceArea || [],
      expectedSalary: resume.expectedSalary,
      maternityNurseLevel: resume.maternityNurseLevel || null, // 月嫂档位
      workExperiences: resume.workExperiences || resume.workHistory || [],
      // 文件信息 - 完整对象格式（包含 url, filename, size, mimetype）
      idCardFront: resume.idCardFront,
      idCardBack: resume.idCardBack,
      personalPhoto: resume.personalPhoto || [],
      certificates: resume.certificates || [], // 技能证书图片（FileInfo 对象数组）
      reports: resume.reports || [], // 体检报告（FileInfo 对象数组）
      selfIntroductionVideo: resume.selfIntroductionVideo || null, // 自我介绍视频
      // 新增的 4 个相册字段（FileInfo 对象数组）
      confinementMealPhotos: resume.confinementMealPhotos || [], // 月子餐照片
      cookingPhotos: resume.cookingPhotos || [], // 烹饪照片
      complementaryFoodPhotos: resume.complementaryFoodPhotos || [], // 辅食添加照片
      positiveReviewPhotos: resume.positiveReviewPhotos || [], // 好评展示照片
      // 兼容旧格式 - 仅 URL 字符串数组
      idCardFrontUrl: resume.idCardFront?.url,
      idCardBackUrl: resume.idCardBack?.url,
      photoUrls: resume.photoUrls || [],
      certificateUrls: resume.certificateUrls || [], // 技能证书图片 URL 数组（兼容旧版）
      medicalReportUrls: resume.medicalReportUrls || [], // 体检报告 URL 数组（兼容旧版）
      selfIntroductionVideoUrl: resume.selfIntroductionVideo?.url || null, // 视频 URL 兼容
      // 新增的 4 个相册字段的 URL 数组（兼容旧版）
      confinementMealPhotoUrls: (resume.confinementMealPhotos || []).map((photo: any) => photo.url).filter(Boolean),
      cookingPhotoUrls: (resume.cookingPhotos || []).map((photo: any) => photo.url).filter(Boolean),
      complementaryFoodPhotoUrls: (resume.complementaryFoodPhotos || []).map((photo: any) => photo.url).filter(Boolean),
      positiveReviewPhotoUrls: (resume.positiveReviewPhotos || []).map((photo: any) => photo.url).filter(Boolean),
      // 时间戳
      createdAt: (resume as any).createdAt || new Date(),
      updatedAt: (resume as any).updatedAt || new Date(),
    };
  }

  /**
   * 获取月嫂档期
   */
  async getAvailability(
    resumeId: string,
    query?: QueryAvailabilityDto
  ) {
    const resume = await this.resumeModel.findById(resumeId);
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    let periods = resume.availabilityCalendar || [];

    // 如果指定了日期范围，进行筛选
    if (query?.startDate && query?.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      periods = periods.filter(p => {
        const date = new Date(p.date);
        return date >= start && date <= end;
      });
    }

    // 如果指定了状态，进行筛选
    if (query?.status) {
      periods = periods.filter(p => p.status === query.status);
    }

    return {
      resumeId: resume._id,
      name: resume.name,
      jobType: resume.jobType,
      availabilityCalendar: periods.map(p => ({
        date: p.date,
        status: p.status,
        contractId: p.contractId,
        remarks: p.remarks
      }))
    };
  }

  /**
   * 更新月嫂档期（按日期范围）
   */
  async updateAvailability(resumeId: string, dto: UpdateAvailabilityDto) {
    const resume = await this.resumeModel.findById(resumeId);
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    // 验证日期范围
    if (start > end) {
      throw new BadRequestException('开始日期不能晚于结束日期');
    }

    // 生成日期范围内的所有日期
    const periods = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      periods.push({
        date: new Date(d),
        status: dto.status,
        contractId: dto.contractId ? new Types.ObjectId(dto.contractId) : undefined,
        remarks: dto.remarks
      });
    }

    // 删除旧的档期（在日期范围内的）
    resume.availabilityCalendar = (resume.availabilityCalendar || []).filter(p => {
      const date = new Date(p.date);
      return date < start || date > end;
    });

    // 添加新的档期
    resume.availabilityCalendar.push(...periods);

    // 按日期排序
    resume.availabilityCalendar.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    await resume.save();

    this.logger.log(`更新档期成功: resumeId=${resumeId}, 更新了${periods.length}天`);

    return {
      updated: periods.length,
      message: `成功更新${periods.length}天的档期`
    };
  }

  /**
   * 批量更新档期（按日期列表）
   */
  async batchUpdateAvailability(resumeId: string, dto: BatchUpdateAvailabilityDto) {
    const resume = await this.resumeModel.findById(resumeId);
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    const periods = dto.dates.map(dateStr => ({
      date: new Date(dateStr),
      status: dto.status,
      contractId: dto.contractId ? new Types.ObjectId(dto.contractId) : undefined,
      remarks: dto.remarks
    }));

    // 删除旧的档期（在日期列表中的）
    const datesToUpdate = new Set(dto.dates.map(d => new Date(d).toISOString().split('T')[0]));
    resume.availabilityCalendar = (resume.availabilityCalendar || []).filter(p => {
      const dateStr = new Date(p.date).toISOString().split('T')[0];
      return !datesToUpdate.has(dateStr);
    });

    // 添加新的档期
    resume.availabilityCalendar.push(...periods);

    // 按日期排序
    resume.availabilityCalendar.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    await resume.save();

    return {
      updated: periods.length,
      message: `成功更新${periods.length}天的档期`
    };
  }

  /**
   * 检查档期是否可用（无冲突）
   */
  async checkAvailability(
    resumeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const resume = await this.resumeModel.findById(resumeId);
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    const periods = resume.availabilityCalendar || [];

    // 检查是否有档期冲突（occupied 状态）
    const hasConflict = periods.some(period => {
      const periodDate = new Date(period.date);
      return (
        period.status === AvailabilityStatus.OCCUPIED &&
        periodDate >= startDate &&
        periodDate <= endDate
      );
    });

    return !hasConflict;
  }

  /**
   * 删除指定日期范围的档期
   */
  async deleteAvailability(resumeId: string, startDate: string, endDate: string) {
    const resume = await this.resumeModel.findById(resumeId);
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const originalLength = resume.availabilityCalendar?.length || 0;

    // 删除指定日期范围内的档期
    resume.availabilityCalendar = (resume.availabilityCalendar || []).filter(p => {
      const date = new Date(p.date);
      return date < start || date > end;
    });

    const deletedCount = originalLength - (resume.availabilityCalendar?.length || 0);

    await resume.save();

    return {
      deleted: deletedCount,
      message: `成功删除${deletedCount}天的档期`
    };
  }

  /**
   * 获取员工评价数据
   */
  async getEmployeeEvaluations(resumeId: string) {
    try {
      // 直接查询 employee_evaluations 集合
      const EmployeeEvaluation = this.resumeModel.db.collection('employee_evaluations');

      const evaluations = await EmployeeEvaluation
        .find({
          employeeId: new Types.ObjectId(resumeId),
          status: 'published'
        })
        .sort({ evaluationDate: -1 })
        .limit(10)
        .toArray();

      return evaluations.map(evaluation => ({
        id: evaluation._id.toString(),
        overallRating: evaluation.overallRating,
        comment: evaluation.comment,
        evaluatorName: evaluation.evaluatorName,
        evaluationDate: evaluation.evaluationDate,
        evaluationType: evaluation.evaluationType,
        tags: evaluation.tags || [],
        strengths: evaluation.strengths,
        improvements: evaluation.improvements
      }));
    } catch (error) {
      this.logger.error(`获取员工评价失败: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 从评价内容中提取标签（4-6个字）
   */
  private extractTagsFromComment(comment: string): string[] {
    if (!comment) return [];

    // 常见的正面评价关键词（4-6个字）
    const positiveKeywords = [
      '形象气质好', '好沟通', '相处愉快', '有亲和力', '做事仔细认真',
      '个人形象好', '干净整洁', '沟通顺畅', '做事认真心', '做饭好吃',
      '月子餐好吃', '个人卫生好', '不计较', '有爱任性', '诚实轻经',
      '和蔼可亲', '对产妇耐心', '活不空实', '对宝宝有爱心', '专业知识丰富',
      '责任心强', '服务态度好', '工作效率高', '技能熟练', '经验丰富',
      '认真负责', '细心周到', '温柔体贴', '勤快麻利', '手脚麻利',
      '喜欢孩子', '形象气质佳', '乐观开朗', '信任度高', '执行力强',
      '产后恢复好', '产专专业', '开朗爱笑', '信性度高', '热心力强',
      '爱快头方', '沟通能力强', '开朗爱笑', '执行力强', '热心助人'
    ];

    const foundTags: string[] = [];

    // 在评价内容中查找匹配的关键词
    for (const keyword of positiveKeywords) {
      if (comment.includes(keyword)) {
        foundTags.push(keyword);
      }
    }

    return foundTags;
  }

  /**
   * 计算推荐理由标签（从客户评价和员工评价中提取）
   */
  async getRecommendationTags(resumeId: string) {
    try {
      const tagCountMap = new Map<string, number>();

      // 1. 从员工评价中提取标签
      const EmployeeEvaluation = this.resumeModel.db.collection('employee_evaluations');
      const employeeEvaluations = await EmployeeEvaluation
        .find({
          employeeId: new Types.ObjectId(resumeId),
          status: 'published'
        })
        .toArray();

      // 统计员工评价中的标签
      for (const evaluation of employeeEvaluations) {
        // 从tags字段获取标签
        if (evaluation.tags && Array.isArray(evaluation.tags)) {
          for (const tag of evaluation.tags) {
            if (tag && tag.length >= 2 && tag.length <= 6) {
              tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
            }
          }
        }

        // 从评价内容中提取标签
        if (evaluation.comment) {
          const extractedTags = this.extractTagsFromComment(evaluation.comment);
          for (const tag of extractedTags) {
            tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
          }
        }
      }

      // 2. 从工作经历中的客户评价提取标签
      const resume = await this.resumeModel.findById(resumeId);
      if (resume && resume.workHistory && Array.isArray(resume.workHistory)) {
        for (const workExp of resume.workHistory) {
          if (workExp.customerReview) {
            const extractedTags = this.extractTagsFromComment(workExp.customerReview);
            for (const tag of extractedTags) {
              tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
            }
          }
        }
      }

      // 3. 转换为数组并按出现次数排序
      const sortedTags = Array.from(tagCountMap.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      return sortedTags;
    } catch (error) {
      this.logger.error(`计算推荐理由标签失败: ${error.message}`, error.stack);
      return [];
    }
  }

}
