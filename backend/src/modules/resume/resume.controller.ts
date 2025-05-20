import { Controller, Get, Post, Body, Param, UsePipes, ValidationPipe, UploadedFile, UseInterceptors, Put, Delete, UploadedFiles, Logger, Query, InternalServerErrorException, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ResumeService } from './resume.service';
import { Resume } from './models/resume.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { Express } from 'express';
import { ObjectId } from 'mongodb';
import { UploadService } from '../upload/upload.service';

@Controller('resumes')
export class ResumeController {
  private readonly logger = new Logger(ResumeController.name);

  constructor(
    private readonly resumeService: ResumeService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
    { name: 'photoFiles', maxCount: 5 },
    { name: 'certificateFiles', maxCount: 5 },
    { name: 'medicalReportFiles', maxCount: 5 },
  ], {
    fileFilter: (req, file, callback) => {
      if (!file || !file.originalname || !file.mimetype) {
        return callback(new Error('无效的文件'), false);
      }
      
      console.log(`处理文件: ${file.originalname}, 类型: ${file.mimetype}`);
      
      if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
        return callback(new Error('只允许上传jpg、jpeg、png和pdf文件！'), false);
      }
      
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  @UsePipes(new ValidationPipe())
  async create(
    @Body() createResumeDto: CreateResumeDto,
    @UploadedFiles() files: {
      idCardFront?: Express.Multer.File[],
      idCardBack?: Express.Multer.File[],
      photoFiles?: Express.Multer.File[],
      certificateFiles?: Express.Multer.File[],
      medicalReportFiles?: Express.Multer.File[],
    },
  ): Promise<Resume> {
    this.logger.debug('接收到的 DTO:', createResumeDto);
    this.logger.debug('接收到的文件:', files);

    // 处理文件上传
    const fileUrls = {
      idCardFrontUrl: '',
      idCardBackUrl: '',
      photoUrls: [] as string[],
      certificateUrls: [] as string[],
      medicalReportUrls: [] as string[],
    };

    try {
      if (files) {
        if (files.idCardFront?.[0]) {
          this.logger.debug('上传身份证正面照片');
          fileUrls.idCardFrontUrl = await this.uploadService.uploadFile(files.idCardFront[0], 'resumes/id-cards');
        }
        if (files.idCardBack?.[0]) {
          this.logger.debug('上传身份证反面照片');
          fileUrls.idCardBackUrl = await this.uploadService.uploadFile(files.idCardBack[0], 'resumes/id-cards');
        }
        if (files.photoFiles) {
          this.logger.debug('上传个人照片');
          for (const file of files.photoFiles) {
            const url = await this.uploadService.uploadFile(file, 'resumes/photos');
            fileUrls.photoUrls.push(url);
          }
        }
        if (files.certificateFiles) {
          this.logger.debug('上传证书照片');
          for (const file of files.certificateFiles) {
            const url = await this.uploadService.uploadFile(file, 'resumes/certificates');
            fileUrls.certificateUrls.push(url);
          }
        }
        if (files.medicalReportFiles) {
          this.logger.debug('上传体检报告');
          for (const file of files.medicalReportFiles) {
            const url = await this.uploadService.uploadFile(file, 'resumes/medical-reports');
            fileUrls.medicalReportUrls.push(url);
          }
        }
      }

      // 合并文件URL到简历数据中
      const resumeData = {
        ...createResumeDto,
        ...fileUrls,
      };

      this.logger.debug('准备保存简历数据:', resumeData);
      return await this.resumeService.create(resumeData);
    } catch (error) {
      this.logger.error('处理文件上传时出错:', {
        message: error.message,
        stack: error.stack,
        files: files ? Object.keys(files) : null,
        dto: createResumeDto
      });
      
      // 返回更友好的错误信息
      if (error.message.includes('文件大小超过限制')) {
        throw new HttpException('文件大小超过5MB限制', HttpStatus.BAD_REQUEST);
      } else if (error.message.includes('不支持的文件类型')) {
        throw new HttpException('仅支持上传jpg、jpeg、png和pdf文件', HttpStatus.BAD_REQUEST);
      } else if (error.message.includes('COS')) {
        throw new HttpException('文件存储服务暂时不可用', HttpStatus.SERVICE_UNAVAILABLE);
      } else {
        throw new HttpException('处理简历数据时出错: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new ValidationPipe())
  async update(
    @Param('id') id: string,
    @Body() updateResumeDto: CreateResumeDto,
  ): Promise<Resume | null> {
    return this.resumeService.update(id, updateResumeDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<boolean> {
    return this.resumeService.remove(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Resume | { message: string }> {
    this.logger.debug(`接收到获取简历请求，ID: ${id}`);
    try {
      const resume = await this.resumeService.findOne(id);
      
      if (!resume) {
        this.logger.warn(`未找到ID为 ${id} 的简历`);
        return { message: `未找到ID为 ${id} 的简历` };
      }
      
      this.logger.debug(`返回简历数据: ${JSON.stringify(resume)}`);
      return resume;
    } catch (error) {
      this.logger.error(`获取简历时发生错误: ${error.message}`);
      throw error;
    }
  }

  @Get()
  async findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number): Promise<{ success: boolean; data: { items: Resume[]; total: number }; timestamp: number }> {
    try {
      this.logger.debug(`开始获取简历列表，页码: ${page}, 每页数量: ${pageSize}`);
      
      // 获取实际数据
      const { items, total } = await this.resumeService.findAll(page, pageSize);
      
      // 添加日志输出，查看具体数据
      this.logger.debug('数据库返回的简历数据:', JSON.stringify(items, null, 2));
      this.logger.debug(`数据库返回数据条数: ${items.length}, 总数: ${total}`);
      
      // 如果没有数据，添加两条模拟数据
      let finalItems = items;
      if (items.length === 0) {
        this.logger.debug('数据库中没有数据，使用模拟数据');
        const mockResumes = [
          {
            _id: new ObjectId(),
            id: 'mock1',
            name: '张阿姨',
            phone: '13800138001',
            age: 45,
            gender: 'female',
            nativePlace: '河南省郑州市',
            orderStatus: 'accepting',
            education: 'middle',
            experienceYears: 5,
            jobType: 'yuying',
            expectedSalary: 8000,
            serviceArea: '郑州市金水区',
            skills: ['yuying', 'zaojiao', 'fushi'],
            leadSource: 'referral',
            createdAt: new Date(),
            updatedAt: new Date(),
            medicalReportUrls: ['https://example.com/medical1.pdf'],
            photoUrls: ['https://example.com/photo1.jpg'],
            idCardFrontUrl: 'https://example.com/idcard1_front.jpg',
            idCardBackUrl: 'https://example.com/idcard1_back.jpg'
          },
          {
            _id: new ObjectId(),
            id: 'mock2',
            name: '李阿姨',
            phone: '13900139002',
            age: 42,
            gender: 'female',
            nativePlace: '山东省济南市',
            orderStatus: 'not-accepting',
            education: 'high',
            experienceYears: 8,
            jobType: 'chanhou',
            expectedSalary: 10000,
            serviceArea: '济南市历下区',
            skills: ['chanhou', 'teshu-yinger', 'yiliaobackground'],
            leadSource: 'paid-lead',
            createdAt: new Date(),
            updatedAt: new Date(),
            medicalReportUrls: [],
            photoUrls: ['https://example.com/photo2.jpg'],
            idCardFrontUrl: 'https://example.com/idcard2_front.jpg',
            idCardBackUrl: 'https://example.com/idcard2_back.jpg'
          }
        ];
        finalItems = mockResumes;
        this.logger.debug('使用模拟数据:', JSON.stringify(finalItems, null, 2));
      }

      // 添加日志输出，查看最终返回的数据
      this.logger.debug('最终返回的简历数据:', JSON.stringify(finalItems, null, 2));
      this.logger.debug(`最终返回数据条数: ${finalItems.length}`);

      // 返回前端期望的格式
      const response = {
        success: true,
        data: {
          items: finalItems,
          total: total || finalItems.length
        },
        timestamp: Date.now()
      };
      
      this.logger.debug('返回给前端的数据:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      this.logger.error('获取简历列表失败:', error);
      this.logger.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw new HttpException('获取简历列表失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('count')
  async countResumes(): Promise<{ count: number }> {
    const count = await this.resumeService.count();
    return { count };
  }

  @Get('check-duplicate')
  async checkDuplicate(@Query('phone') phone: string, @Query('idNumber') idNumber: string) {
    try {
      console.log('查重检查请求:', { phone, idNumber });
      
      if (!phone && !idNumber) {
        return {
          message: '请提供手机号或身份证号进行查重',
          duplicate: false
        };
      }

      // 使用checkDuplicate方法进行查重
      let result = await this.resumeService.checkDuplicate(phone, idNumber);
      
      return {
        duplicate: result.duplicate,
        duplicatePhone: phone && result.duplicate,
        duplicateIdNumber: idNumber && result.duplicate,
        message: result.duplicate ? '发现重复数据，请勿重复提交' : '未发现重复数据'
      };
    } catch (error) {
      console.error('查重检查失败:', error);
      throw new InternalServerErrorException('查重检查失败');
    }
  }
}