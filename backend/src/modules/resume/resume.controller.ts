import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFiles, ParseIntPipe, DefaultValuePipe, Logger, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FilesInterceptor, FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { ResumeService } from './resume.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { Resume } from './models/resume.entity';
import { UploadService } from '../upload/upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Public } from '../auth/decorators/public.decorator';

// Multer 配置
const multerConfig: MulterOptions = {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    fieldSize: 50 * 1024 * 1024, // 50MB
  },
};

@ApiTags('简历管理')
@Controller('resumes')
@UseGuards(JwtAuthGuard)
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
    { name: 'photoFiles', maxCount: 10 },
    { name: 'certificateFiles', maxCount: 10 },
    { name: 'medicalReportFiles', maxCount: 10 }
  ], multerConfig))
  @ApiOperation({ summary: '创建简历' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idCardFront: {
          type: 'string',
          format: 'binary',
          description: '身份证正面照片'
        },
        idCardBack: {
          type: 'string',
          format: 'binary',
          description: '身份证背面照片'
        },
        photoFiles: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: '个人照片'
        },
        certificateFiles: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: '技能证书'
        },
        medicalReportFiles: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: '体检报告'
        },
        title: { type: 'string' },
        content: { type: 'string' },
      },
    },
  })
  async create(
    @Body() dto: CreateResumeDto,
    @UploadedFiles() files: {
      idCardFront?: Express.Multer.File[],
      idCardBack?: Express.Multer.File[],
      photoFiles?: Express.Multer.File[],
      certificateFiles?: Express.Multer.File[],
      medicalReportFiles?: Express.Multer.File[]
    },
    @Req() req,
  ) {
    let resume = null;
    let fileErrors = [];

    try {
      this.logger.debug('接收到的文件数据:', {
        idCardFront: files.idCardFront?.length || 0,
        idCardBack: files.idCardBack?.length || 0,
        photoFiles: files.photoFiles?.length || 0,
        certificateFiles: files.certificateFiles?.length || 0,
        medicalReportFiles: files.medicalReportFiles?.length || 0,
        rawBody: Object.keys(req.body),
      });

      // 将分类的文件重新组合成单一数组，并生成对应的文件类型数组
      const filesArray: Express.Multer.File[] = [];
      const fileTypes: string[] = [];

      // 添加身份证正面
      if (files.idCardFront && files.idCardFront.length > 0) {
        filesArray.push(...files.idCardFront);
        fileTypes.push(...files.idCardFront.map(() => 'idCardFront'));
      }

      // 添加身份证背面
      if (files.idCardBack && files.idCardBack.length > 0) {
        filesArray.push(...files.idCardBack);
        fileTypes.push(...files.idCardBack.map(() => 'idCardBack'));
      }

      // 添加个人照片
      if (files.photoFiles && files.photoFiles.length > 0) {
        filesArray.push(...files.photoFiles);
        fileTypes.push(...files.photoFiles.map(() => 'personalPhoto'));
      }

      // 添加技能证书
      if (files.certificateFiles && files.certificateFiles.length > 0) {
        filesArray.push(...files.certificateFiles);
        fileTypes.push(...files.certificateFiles.map(() => 'certificate'));
      }

      // 添加体检报告
      if (files.medicalReportFiles && files.medicalReportFiles.length > 0) {
        filesArray.push(...files.medicalReportFiles);
        fileTypes.push(...files.medicalReportFiles.map(() => 'medicalReport'));
      }

      this.logger.debug('解析后的文件信息:', {
        jobType: dto.jobType,
        filesCount: filesArray.length,
        fileTypes: fileTypes
      });

      // 尝试创建简历
      resume = await this.resumeService.createWithFiles(
        { ...dto, userId: req.user.userId },
        filesArray,
        fileTypes
      );

      // 检查是否有文件上传错误
      if (resume && resume.fileUploadErrors && resume.fileUploadErrors.length > 0) {
        fileErrors = resume.fileUploadErrors;
        delete resume.fileUploadErrors; // 移除错误信息，避免污染返回数据
      }

      // 如果简历创建成功，即使有文件上传错误也返回成功
      if (resume) {
        this.logger.log(`简历创建成功: ${resume._id}`);
        return {
          success: true,
          data: resume,
          message: fileErrors.length > 0
            ? `简历创建成功，但部分文件上传失败: ${fileErrors.join(', ')}`
            : '创建简历成功'
        };
      }

      throw new Error('简历创建失败');
    } catch (error) {
      this.logger.error(`创建简历失败: ${error.message}`, error.stack);

      // 处理特定类型的错误
      if (error instanceof ConflictException) {
        return {
          success: false,
          data: null,
          message: error.message
        };
      }

      if (error instanceof BadRequestException) {
        return {
          success: false,
          data: null,
          message: error.message
        };
      }

      // 如果简历已经创建成功，但后续处理出错，返回部分成功状态
      if (resume) {
        this.logger.warn(`简历已创建但处理过程中出现错误: ${error.message}`, {
          resumeId: resume._id,
          error: error.message
        });
        return {
          success: true,
          data: resume,
          message: `简历已创建，但处理过程中出现错误: ${error.message}`
        };
      }

      // 完全失败的情况
      return {
        success: false,
        data: null,
        message: `创建简历失败: ${error.message}`
      };
    }
  }

  @Post('json')
  @ApiOperation({ summary: '创建简历（JSON格式）' })
  @ApiBody({ type: CreateResumeDto })
  async createJson(
    @Body() dto: CreateResumeDto,
    @Req() req,
  ) {
    try {
      const resume = await this.resumeService.create({
        ...dto,
        userId: req.user.userId
      });
      return {
        success: true,
        data: resume,
        message: '创建简历成功'
      };
    } catch (error) {
      this.logger.error(`创建简历失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `创建简历失败: ${error.message}`
      };
    }
  }

  @Post('import-excel')
  @ApiOperation({ summary: '批量导入简历（Excel格式）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel文件',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/temp',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = extname(file.originalname);
        callback(null, `excel-${uniqueSuffix}${extension}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!['.xlsx', '.xls'].includes(ext)) {
        return callback(new BadRequestException('仅支持 .xlsx 或 .xls 格式的Excel文件'), false);
      }
      callback(null, true);
    },
  }))
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('请上传Excel文件');
      }

      this.logger.log(`开始处理Excel导入，文件名: ${file.originalname}`);
      const importResults = await this.resumeService.importFromExcel(file.path, req.user.userId);

      return {
        success: true,
        data: importResults,
        message: `成功导入 ${importResults.success} 条简历，失败 ${importResults.fail} 条`
      };
    } catch (error) {
      this.logger.error(`Excel导入失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `Excel导入失败: ${error.message}`
      };
    }
  }

  @Get()
  @ApiOperation({ summary: '获取简历列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(
    @Query('page') pageStr: string = '1',
    @Query('pageSize') pageSizeStr: string = '10',
    @Query('keyword') keyword?: string,
    @Query('jobType') jobType?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('maxAge') maxAgeStr?: string,
    @Query('nativePlace') nativePlace?: string,
    @Query('ethnicity') ethnicity?: string,
    @Query('_t') timestamp?: string, // 时间戳参数
    @Req() req?: any
  ) {
    try {
      // 手动解析数字参数，避免使用ParseIntPipe
      let page = 1;
      let pageSize = 10;
      let maxAge: number | undefined = undefined;

      // 详细记录请求信息
      this.logger.log(`接收到简历列表请求, URL: ${req?.url}, 参数: page=${pageStr}, pageSize=${pageSizeStr}, keyword=${keyword}, jobType=${jobType}, timestamp=${timestamp}`);

      // 安全地解析页码
      try {
        if (pageStr) {
          const parsed = parseInt(pageStr, 10);
          if (!isNaN(parsed) && parsed > 0) {
            page = parsed;
          }
        }
      } catch (e) {
        this.logger.warn(`页码解析错误: ${e.message}`);
      }

      // 安全地解析每页条数
      try {
        if (pageSizeStr) {
          const parsed = parseInt(pageSizeStr, 10);
          if (!isNaN(parsed) && parsed > 0) {
            pageSize = Math.min(parsed, 100); // 限制最大为100
          }
        }
      } catch (e) {
        this.logger.warn(`每页条数解析错误: ${e.message}`);
      }

      // 安全地解析最大年龄
      try {
        if (maxAgeStr) {
          const parsed = parseInt(maxAgeStr, 10);
          if (!isNaN(parsed)) {
            maxAge = parsed;
          }
        }
      } catch (e) {
        this.logger.warn(`最大年龄解析错误: ${e.message}`);
      }

      this.logger.log(`解析后的参数: page=${page}, pageSize=${pageSize}, maxAge=${maxAge}`);

      // 调用服务获取数据
      const result = await this.resumeService.findAll(
        page,
        pageSize,
        keyword,
        jobType,
        orderStatus,
        maxAge,
        nativePlace,
        ethnicity
      );

      return {
        success: true,
        data: result,
        message: '获取简历列表成功'
      };
    } catch (error) {
      this.logger.error(`获取简历列表失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
        message: `获取简历列表失败: ${error.message}`
      };
    }
  }

  @Get('options')
  @ApiOperation({ summary: '获取简历筛选选项' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getOptions() {
    try {
      const options = await this.resumeService.getFilterOptions();

      return {
        success: true,
        data: options,
        message: '获取筛选选项成功'
      };
    } catch (error) {
      this.logger.error(`获取筛选选项失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `获取筛选选项失败: ${error.message}`
      };
    }
  }



  @Get('search-workers')
  @Public()
  @ApiOperation({ summary: '搜索服务人员' })
  @ApiResponse({ status: 200, description: '搜索成功' })
  async searchWorkers(
    @Query('phone') phone?: string,
    @Query('name') name?: string,
    @Query('limit') limitStr: string = '10',
  ) {
    try {
      const limit = parseInt(limitStr);
      const workers = await this.resumeService.searchWorkers(phone, name, limit);
      return {
        success: true,
        data: workers,
        message: '搜索服务人员成功'
      };
    } catch (error) {
      this.logger.error(`搜索服务人员失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: error.message || '搜索服务人员失败'
      };
    }
  }

  @Get('test-search-workers')
  @Public()
  @ApiOperation({ summary: '测试搜索服务人员（无认证）' })
  @ApiResponse({ status: 200, description: '测试成功' })
  async testSearchWorkers(
    @Query('phone') phone?: string,
    @Query('name') name?: string,
    @Query('limit') limitStr: string = '10',
  ) {
    try {
      const limit = parseInt(limitStr);
      const workers = await this.resumeService.searchWorkers(phone, name, limit);
      return {
        success: true,
        data: workers,
        message: '测试搜索服务人员成功'
      };
    } catch (error) {
      this.logger.error(`测试搜索服务人员失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: error.message || '测试搜索服务人员失败'
      };
    }
  }

  @Post(':id/share')
  @ApiOperation({ summary: '生成简历分享链接（返回令牌）' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiBody({ schema: { type: 'object', properties: { expiresInHours: { type: 'number', example: 72 } } } })
  async createShare(
    @Param('id') id: string,
    @Body('expiresInHours') expiresInHours?: string | number,
  ) {
    try {
      const hours = expiresInHours === undefined || expiresInHours === null || expiresInHours === ''
        ? 72
        : Number(expiresInHours);
      const { token, expireAt } = this.resumeService.createShareToken(id, isNaN(hours) ? 72 : hours);
      return {
        success: true,
        data: {
          token,
          expireAt,
          // 小程序公开详情页路径（由前端/小程序直接使用）
          path: `/pages/public/detail/index?token=${token}`,
        },
        message: '生成分享链接成功',
      };
    } catch (error) {
      this.logger.error(`生成分享链接失败: ${error.message}`);
      return { success: false, data: null, message: error.message || '生成分享链接失败' };
    }
  }

  @Get('shared/:token')
  @Public()
  @ApiOperation({ summary: '获取分享简历（脱敏）详情' })
  @ApiParam({ name: 'token', description: '分享令牌' })
  async getShared(@Param('token') token: string) {
    try {
      const data = await this.resumeService.findSharedByToken(token);
      return { success: true, data, message: '获取分享详情成功' };
    } catch (error) {
      this.logger.warn(`获取分享详情失败: ${error.message}`);
      return { success: false, data: null, message: error.message || '获取分享详情失败' };
    }
  }

  // ==================== 小程序专用接口 ====================

  @Post('miniprogram/create')
  @ApiOperation({ summary: '小程序创建简历（JSON格式）' })
  @ApiBody({ type: CreateResumeDto })
  async createForMiniprogram(
    @Body() dto: CreateResumeDto,
    @Req() req,
  ) {
    try {
      this.logger.log(`小程序创建简历: ${JSON.stringify(dto, null, 2)}`);

      const resume = await this.resumeService.create({
        ...dto,
        userId: req.user.userId
      });

      return {
        success: true,
        data: {
          id: resume._id || resume.id,
          name: resume.name,
          phone: resume.phone,
          age: resume.age,
          gender: resume.gender,
          jobType: resume.jobType,
          education: resume.education,
          experienceYears: resume.experienceYears,
          expectedSalary: resume.expectedSalary,
          nativePlace: resume.nativePlace,
          skills: resume.skills,
          serviceArea: resume.serviceArea,
          selfIntroduction: resume.selfIntroduction,
          school: resume.school,
          major: resume.major,
          workExperiences: resume.workExperiences || resume.workHistory || [],
          createdAt: (resume as any).createdAt,
          updatedAt: (resume as any).updatedAt
        },
        message: '创建简历成功'
      };
    } catch (error) {
      this.logger.error(`小程序创建简历失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `创建简历失败: ${error.message}`
      };
    }
  }

  @Patch('miniprogram/:id')
  @ApiOperation({ summary: '小程序更新简历（JSON格式）' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiBody({ type: UpdateResumeDto })
  async updateForMiniprogram(
    @Param('id') id: string,
    @Body() dto: UpdateResumeDto,
    @Req() req,
  ) {
    try {
      this.logger.log(`小程序更新简历 ${id}: ${JSON.stringify(dto, null, 2)}`);

      const resume = await this.resumeService.update(id, dto);

      return {
        success: true,
        data: {
          id: resume._id || resume.id,
          name: resume.name,
          phone: resume.phone,
          age: resume.age,
          gender: resume.gender,
          jobType: resume.jobType,
          education: resume.education,
          experienceYears: resume.experienceYears,
          expectedSalary: resume.expectedSalary,
          nativePlace: resume.nativePlace,
          skills: resume.skills,
          serviceArea: resume.serviceArea,
          selfIntroduction: resume.selfIntroduction,
          school: resume.school,
          major: resume.major,
          workExperiences: resume.workExperiences || resume.workHistory || [],
          // 文件相关字段
          idCardFrontUrl: resume.idCardFront?.url,
          idCardBackUrl: resume.idCardBack?.url,
          photoUrls: resume.photoUrls || [],
          certificateUrls: resume.certificateUrls || [],
          medicalReportUrls: resume.medicalReportUrls || [],
          // 新格式文件字段
          idCardFront: resume.idCardFront,
          idCardBack: resume.idCardBack,
          personalPhoto: resume.personalPhoto,
          certificates: resume.certificates || [],
          reports: resume.reports || [],
          updatedAt: (resume as any).updatedAt
        },
        message: '更新简历成功'
      };
    } catch (error) {
      this.logger.error(`小程序更新简历失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `更新简历失败: ${error.message}`
      };
    }
  }

  @Post('miniprogram/:id/upload-file')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({ summary: '小程序上传单个文件' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件'
        },
        type: {
          type: 'string',
          enum: ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'medicalReport'],
          description: '文件类型'
        },
      },
      required: ['file', 'type']
    },
  })
  async uploadFileForMiniprogram(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Req() req,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('请选择要上传的文件');
      }

      if (!type || !['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'medicalReport'].includes(type)) {
        throw new BadRequestException('请指定正确的文件类型');
      }

      this.logger.log(`小程序上传文件: 简历ID=${id}, 文件类型=${type}, 文件名=${file.originalname}`);

      const resume = await this.resumeService.addFileWithType(id, file, type);

      // 根据文件类型返回相应的URL
      let uploadedFileUrl = '';
      switch (type) {
        case 'idCardFront':
          uploadedFileUrl = resume.idCardFront?.url || '';
          break;
        case 'idCardBack':
          uploadedFileUrl = resume.idCardBack?.url || '';
          break;
        case 'personalPhoto':
          uploadedFileUrl = (resume.personalPhoto && resume.personalPhoto.length > 0 && resume.personalPhoto[resume.personalPhoto.length - 1]?.url) || (resume.photoUrls && resume.photoUrls[resume.photoUrls.length - 1]) || '';
          break;
        case 'certificate':
          uploadedFileUrl = resume.certificates && resume.certificates.length > 0
            ? resume.certificates[resume.certificates.length - 1].url
            : (resume.certificateUrls && resume.certificateUrls[resume.certificateUrls.length - 1]) || '';
          break;
        case 'medicalReport':
          uploadedFileUrl = resume.reports && resume.reports.length > 0
            ? resume.reports[resume.reports.length - 1].url
            : (resume.medicalReportUrls && resume.medicalReportUrls[resume.medicalReportUrls.length - 1]) || '';
          break;
      }

      return {
        success: true,
        data: {
          fileUrl: uploadedFileUrl,
          fileType: type,
          fileName: file.originalname,
          fileSize: file.size,
          resumeId: id
        },
        message: '文件上传成功'
      };
    } catch (error) {
      this.logger.error(`小程序文件上传失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `文件上传失败: ${error.message}`
      };
    }
  }

  @Delete('miniprogram/:id/delete-file')
  @ApiOperation({ summary: '小程序删除文件' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          description: '要删除的文件URL'
        },
        fileType: {
          type: 'string',
          enum: ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'medicalReport'],
          description: '文件类型'
        },
      },
      required: ['fileUrl', 'fileType']
    },
  })
  async deleteFileForMiniprogram(
    @Param('id') id: string,
    @Body('fileUrl') fileUrl: string,
    @Body('fileType') fileType: string,
    @Req() req,
  ) {
    try {
      if (!fileUrl || !fileType) {
        throw new BadRequestException('请提供文件URL和文件类型');
      }

      this.logger.log(`小程序删除文件: 简历ID=${id}, 文件类型=${fileType}, 文件URL=${fileUrl}`);

      const resume = await this.resumeService.removeFileByUrl(id, fileUrl, fileType);

      return {
        success: true,
        data: {
          resumeId: id,
          deletedFileUrl: fileUrl,
          fileType: fileType
        },
        message: '文件删除成功'
      };
    } catch (error) {
      this.logger.error(`小程序文件删除失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `文件删除失败: ${error.message}`
      };
    }
  }



  @Get(':id')
  @ApiOperation({ summary: '获取简历详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    try {
      this.logger.log(`🔧 Controller获取简历详情: id=${id}`);
      this.logger.log(`🔧 准备调用ResumeService.findOne`);
      const resume = await this.resumeService.findOne(id);
      this.logger.log(`🔧 ResumeService.findOne执行完成，结果类型: ${typeof resume}`);
      this.logger.log(`🔧 返回的lastUpdatedBy类型: ${typeof resume?.lastUpdatedBy}`);
      return {
        success: true,
        data: resume,
        message: '获取简历详情成功'
      };
    } catch (error) {
      this.logger.error(`🔧 获取简历详情失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `获取简历详情失败: ${error.message}`
      };
    }
  }

  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
    { name: 'photoFiles', maxCount: 10 },
    { name: 'certificateFiles', maxCount: 10 },
    { name: 'medicalReportFiles', maxCount: 10 }
  ], multerConfig))
  @ApiOperation({ summary: '更新简历' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(
    @Param('id') id: string,
    @Body() updateResumeDto: UpdateResumeDto,
    @UploadedFiles() files: {
      idCardFront?: Express.Multer.File[],
      idCardBack?: Express.Multer.File[],
      photoFiles?: Express.Multer.File[],
      certificateFiles?: Express.Multer.File[],
      medicalReportFiles?: Express.Multer.File[]
    } | undefined,
    @Req() req: any,
  ) {
    try {
      // 确保files对象存在，避免undefined访问错误
      const safeFiles = files || {};

      this.logger.debug('更新简历 - 接收到的文件数据:', {
        idCardFront: safeFiles.idCardFront?.length || 0,
        idCardBack: safeFiles.idCardBack?.length || 0,
        photoFiles: safeFiles.photoFiles?.length || 0,
        certificateFiles: safeFiles.certificateFiles?.length || 0,
        medicalReportFiles: safeFiles.medicalReportFiles?.length || 0,
        rawBody: Object.keys(req.body || {}),
        hasFiles: !!files
      });

      // 将分类的文件重新组合成单一数组，并生成对应的文件类型数组
      const filesArray: Express.Multer.File[] = [];
      const fileTypes: string[] = [];

      // 添加身份证正面
      if (safeFiles.idCardFront && safeFiles.idCardFront.length > 0) {
        filesArray.push(...safeFiles.idCardFront);
        fileTypes.push(...safeFiles.idCardFront.map(() => 'idCardFront'));
      }

      // 添加身份证背面
      if (safeFiles.idCardBack && safeFiles.idCardBack.length > 0) {
        filesArray.push(...safeFiles.idCardBack);
        fileTypes.push(...safeFiles.idCardBack.map(() => 'idCardBack'));
      }

      // 添加个人照片
      if (safeFiles.photoFiles && safeFiles.photoFiles.length > 0) {
        filesArray.push(...safeFiles.photoFiles);
        fileTypes.push(...safeFiles.photoFiles.map(() => 'personalPhoto'));
      }

      // 添加技能证书
      if (safeFiles.certificateFiles && safeFiles.certificateFiles.length > 0) {
        filesArray.push(...safeFiles.certificateFiles);
        fileTypes.push(...safeFiles.certificateFiles.map(() => 'certificate'));
      }

      // 添加体检报告
      if (safeFiles.medicalReportFiles && safeFiles.medicalReportFiles.length > 0) {
        filesArray.push(...safeFiles.medicalReportFiles);
        fileTypes.push(...safeFiles.medicalReportFiles.map(() => 'medicalReport'));
      }

      this.logger.debug('更新简历 - 解析后的文件信息:', {
        filesCount: filesArray.length,
        fileTypes: fileTypes
      });

      const result = await this.resumeService.updateWithFiles(
        id,
        updateResumeDto,
        filesArray,
        fileTypes,
        req.user.userId // 添加用户ID
      );

      return result;
    } catch (error) {
      console.error('更新简历失败:', error);
      // 修改错误处理，与创建简历保持一致
      return {
        success: false,
        message: error.message || '更新简历失败',
        error: error.message,
      };
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除简历' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string) {
    try {
      this.logger.log(`删除简历: id=${id}`);
      await this.resumeService.remove(id);
      return {
        success: true,
        message: '删除简历成功'
      };
    } catch (error) {
      this.logger.error(`删除简历失败: ${error.message}`);
      return {
        success: false,
        message: `删除简历失败: ${error.message}`
      };
    }
  }

  @Post(':id/files')
  @UseInterceptors(FilesInterceptor('files', 30, multerConfig))
  @ApiOperation({ summary: '上传简历文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadFiles(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.resumeService.addFiles(id, files);
  }

  @Delete(':id/files/:fileId')
  @ApiOperation({ summary: '删除简历文件（URL参数方式）' })
  async removeFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    try {
      const result = await this.resumeService.removeFile(id, decodeURIComponent(fileId));
      return {
        success: true,
        data: result,
        message: '删除文件成功'
      };
    } catch (error) {
      this.logger.error(`删除文件失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `删除文件失败: ${error.message}`
      };
    }
  }

  @Post(':id/files/delete')
  @ApiOperation({ summary: '删除简历文件（请求体方式）' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          description: '要删除的文件URL'
        }
      },
      required: ['fileUrl']
    }
  })
  async removeFileByBody(
    @Param('id') id: string,
    @Body('fileUrl') fileUrl: string,
  ) {
    try {
      this.logger.log(`删除文件请求: resumeId=${id}, fileUrl=${fileUrl}`);
      const result = await this.resumeService.removeFile(id, fileUrl);
      return {
        success: true,
        data: result,
        message: '删除文件成功'
      };
    } catch (error) {
      this.logger.error(`删除文件失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `删除文件失败: ${error.message}`
      };
    }
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({ summary: '上传简历文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: {
          type: 'string',
          description: '文件类型：idCardFront/idCardBack/personalPhoto/certificate/medicalReport'
        },
      },
    },
  })
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    try {
      const resume = await this.resumeService.addFileWithType(id, file, type);
      return {
        success: true,
        data: resume,
        message: '上传文件成功'
      };
    } catch (error) {
      this.logger.error(`上传文件失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `上传文件失败: ${error.message}`
      };
    }
  }



      @Get('findAll')
  @ApiOperation({ summary: '获取简历列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAllOld(
    @Query('page') pageStr: string = '1',
    @Query('pageSize') pageSizeStr: string = '10',
    @Query('keyword') keyword?: string,
    @Query('jobType') jobType?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('maxAge') maxAgeStr?: string,
    @Query('nativePlace') nativePlace?: string,
    @Query('ethnicity') ethnicity?: string,
    @Query('_t') timestamp?: string, // 时间戳参数
    @Req() req?: any
  ) {
    try {
      // 手动解析数字参数，避免使用ParseIntPipe
      let page = 1;
      let pageSize = 10;
      let maxAge: number | undefined = undefined;

      // 详细记录请求信息
      this.logger.log(`接收到简历列表请求, URL: ${req?.url}, 参数: page=${pageStr}, pageSize=${pageSizeStr}, keyword=${keyword}, jobType=${jobType}, timestamp=${timestamp}`);
      console.log(`🔥🔥🔥 [CONSOLE-DEBUG-OLD] findAllOld方法被调用! URL: ${req?.url}`);

      // 安全地解析页码
      try {
        if (pageStr) {
          const parsed = parseInt(pageStr, 10);
          if (!isNaN(parsed) && parsed > 0) {
            page = parsed;
          }
        }
      } catch (e) {
        this.logger.warn(`页码解析错误: ${e.message}`);
      }

      // 安全地解析每页条数
      try {
        if (pageSizeStr) {
          const parsed = parseInt(pageSizeStr, 10);
          if (!isNaN(parsed) && parsed > 0) {
            pageSize = Math.min(parsed, 100); // 限制最大为100
          }
        }
      } catch (e) {
        this.logger.warn(`每页条数解析错误: ${e.message}`);
      }

      // 安全地解析最大年龄
      try {
        if (maxAgeStr) {
          const parsed = parseInt(maxAgeStr, 10);
          if (!isNaN(parsed)) {
            maxAge = parsed;
          }
        }
      } catch (e) {
        this.logger.warn(`最大年龄解析错误: ${e.message}`);
      }

      this.logger.log(`解析后的参数: page=${page}, pageSize=${pageSize}, maxAge=${maxAge}`);

      // 调用服务获取数据
      const result = await this.resumeService.findAll(
        page,
        pageSize,
        keyword,
        jobType,
        orderStatus,
        maxAge,
        nativePlace,
        ethnicity
      );

      return {
        success: true,
        data: result,
        message: '获取简历列表成功'
      };
    } catch (error) {
      this.logger.error(`获取简历列表失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
        message: `获取简历列表失败: ${error.message}`
      };
    }
  }

  @Patch(':id/personal-photos')
  @ApiOperation({ summary: '更新个人照片排序' })
  @ApiParam({ name: 'id', description: '简历ID' })
  async updatePersonalPhotos(
    @Param('id') id: string,
    @Body() photoData: { photos: Array<{ url: string; filename?: string; size?: number; mimetype?: string }> },
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.sub;
      const result = await this.resumeService.updatePersonalPhotos(id, photoData.photos, userId);
      return {
        success: true,
        data: result,
        message: '个人照片排序更新成功'
      };
    } catch (error) {
      this.logger.error(`更新个人照片排序失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `更新个人照片排序失败: ${error.message}`
      };
    }
  }
}
