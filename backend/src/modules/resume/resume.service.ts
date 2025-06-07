import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, IResume } from './models/resume.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { Logger } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';

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

  async findAll(page: number, pageSize: number, keyword?: string, jobType?: string, orderStatus?: string, maxAge?: number, nativePlace?: string, ethnicity?: string) {
    // 构建查询条件
    const query: any = {};
    
    // 添加关键词搜索
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } },
        { expectedPosition: { $regex: keyword, $options: 'i' } }
      ];
    }
    
    // 添加工种筛选
    if (jobType) {
      query.jobType = jobType;
    }
    
    // 添加接单状态筛选
    if (orderStatus) {
      query.orderStatus = orderStatus;
    }
    
    // 添加最大年龄筛选
    if (maxAge !== undefined && maxAge !== null) {
      query.age = { $lte: maxAge };
    }
    
    // 添加籍贯筛选
    if (nativePlace) {
      query.nativePlace = nativePlace;
    }
    
    // 添加民族筛选
    if (ethnicity) {
      query.ethnicity = ethnicity;
    }

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
      
      // 验证文件类型参数
      const validFileTypes = ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'medicalReport'];
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
          // 同时更新personalPhoto字段（保存最新的一张个人照片）
          resumeDoc.personalPhoto = uploadedFileInfo;
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
        default:
          // 移除默认归类，如果到了这里说明验证有问题
          this.logger.error(`文件类型验证失败，未处理的类型: ${fileType}`);
          throw new BadRequestException(`未知的文件类型: ${fileType}`);
      }

      this.logger.debug('保存更新后的简历信息');
      const savedResume = await resumeDoc.save();
      this.logger.debug(`简历更新成功，当前文件统计: photoUrls=${savedResume.photoUrls?.length || 0}, certificates=${savedResume.certificates?.length || 0}, reports=${savedResume.reports?.length || 0}`);

      return savedResume;
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
    if (resume.personalPhoto && resume.personalPhoto.url === fileUrl) {
      resume.personalPhoto = undefined;
      fileRemoved = true;
      this.logger.debug(`移除了personalPhoto: ${fileUrl}`);
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
  
    // 更新简历基本信息，但跳过undefined值和文件相关字段
    const updateFields = Object.keys(updateResumeDto)
      .filter(key => updateResumeDto[key] !== undefined && updateResumeDto[key] !== null)
      .filter(key => !['idCardFront', 'idCardBack', 'photoUrls', 'certificateUrls', 'medicalReportUrls', 'certificates', 'reports', 'personalPhoto'].includes(key))
      .reduce((obj, key) => {
        obj[key] = updateResumeDto[key];
        return obj;
      }, {});
    
    this.logger.debug(`更新的字段: ${JSON.stringify(Object.keys(updateFields))}`);
    
    // 只更新非undefined和非文件相关的字段
    Object.assign(resume, updateFields);
    
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
        '已上户': 'on-service'
      };
      dto.orderStatus = statusMap[rowData['接单状态']?.toString().trim()] || 'accepting';
    }
    
    // 返回转换后的DTO
    return dto as CreateResumeDto;
  }
}