import { Controller, Get, Post, Body, Param, UsePipes, ValidationPipe, UploadedFile, UseInterceptors, Put, Delete, UploadedFiles, Logger, Query, InternalServerErrorException, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ResumeService } from './resume.service';
import ResumeEntity from './models/resume.entity';  // 使用默认导出
import { CreateResumeDto } from './dto/create-resume.dto';
import { Express } from 'express';
import { ObjectId } from 'mongodb';
import { UploadService } from '../upload/upload.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('简历管理')
@ApiBearerAuth()
@Controller('resumes')
export class ResumeController {
  private readonly logger = new Logger(ResumeController.name);

  constructor(
    private readonly resumeService: ResumeService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建新简历', description: '创建一个新的家政服务人员简历' })
  @ApiResponse({ status: 201, description: '简历创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
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
  ): Promise<ResumeEntity> {
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
  @ApiOperation({ summary: '更新简历', description: '更新指定ID的简历信息' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '简历不存在' })
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new ValidationPipe())
  async update(
    @Param('id') id: string,
    @Body() updateResumeDto: CreateResumeDto,
  ): Promise<ResumeEntity | null> {
    return this.resumeService.update(id, updateResumeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除简历', description: '删除指定ID的简历' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '简历不存在' })
  async remove(@Param('id') id: string): Promise<boolean> {
    return this.resumeService.remove(id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个简历', description: '根据ID获取单个简历的详细信息' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '简历不存在' })
  async findOne(@Param('id') id: string) {
    this.logger.debug(`接收到获取简历请求，ID: ${id}`);
    try {
      const resume = await this.resumeService.findOne(id);
      
      if (!resume) {
        this.logger.warn(`未找到ID为 ${id} 的简历`);
        return {
          success: false,
          message: `未找到ID为 ${id} 的简历`,
          timestamp: Date.now()
        };
      }
      
      this.logger.debug(`返回简历数据: ${JSON.stringify(resume)}`);
      return {
        success: true,
        data: resume,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error(`获取简历时发生错误: ${error.message}`);
      return {
        success: false,
        message: '获取简历失败',
        error: {
          code: 'RESUME_FETCH_ERROR',
          details: error.message
        },
        timestamp: Date.now()
      };
    }
  }

  @Get()
  @ApiOperation({ summary: '获取简历列表', description: '获取所有简历信息，支持分页和筛选' })
  @ApiQuery({ name: 'page', required: false, description: '页码，从1开始' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.resumeService.findAll(page, limit, search);
  }

  @Get('count')
  @ApiOperation({ summary: '获取简历总数', description: '获取系统中的简历总数' })
  @ApiResponse({ status: 200, description: '获取成功' })
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