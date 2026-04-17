import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFiles, ParseIntPipe, DefaultValuePipe, Logger, UploadedFile, BadRequestException, Req, Headers, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { FilesInterceptor, FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { ResumeService } from './resume.service';
import { CreateResumeDto, CreateResumeV2Dto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { Resume } from './models/resume.entity';
import { UploadService } from '../upload/upload.service';
import { QwenAIService } from '../ai/qwen-ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { UseGuards, Request } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Public } from '../auth/decorators/public.decorator';
import { UpdateAvailabilityDto, BatchUpdateAvailabilityDto, QueryAvailabilityDto } from './dto/availability.dto';

// Multer 配置
const multerConfig: MulterOptions = {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    fieldSize: 50 * 1024 * 1024, // 50MB
  },
};

// 小程序工装生成专用的内存存储配置
const memoryUploadConfig = {
  storage: memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
};

@ApiTags('简历管理')
@Controller('resumes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ResumeController {
  private readonly logger = new Logger(ResumeController.name);

  constructor(
    private readonly resumeService: ResumeService,
    private readonly uploadService: UploadService,
    private readonly qwenAIService: QwenAIService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
    { name: 'photoFiles', maxCount: 30 },
    { name: 'certificateFiles', maxCount: 30 },
    { name: 'medicalReportFiles', maxCount: 10 },
    { name: 'selfIntroductionVideo', maxCount: 1 },
    { name: 'confinementMealPhotos', maxCount: 30 },
    { name: 'cookingPhotos', maxCount: 30 },
    { name: 'complementaryFoodPhotos', maxCount: 30 },
    { name: 'positiveReviewPhotos', maxCount: 30 }
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
        selfIntroductionVideo: {
          type: 'string',
          format: 'binary',
          description: '自我介绍视频（最大10MB）'
        },
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
      selfIntroductionVideo?: Express.Multer.File[],
      medicalReportFiles?: Express.Multer.File[],
      confinementMealPhotos?: Express.Multer.File[],
      cookingPhotos?: Express.Multer.File[],
      complementaryFoodPhotos?: Express.Multer.File[],
      positiveReviewPhotos?: Express.Multer.File[]
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
        selfIntroductionVideo: files.selfIntroductionVideo?.length || 0,
        confinementMealPhotos: files.confinementMealPhotos?.length || 0,
        cookingPhotos: files.cookingPhotos?.length || 0,
        complementaryFoodPhotos: files.complementaryFoodPhotos?.length || 0,
        positiveReviewPhotos: files.positiveReviewPhotos?.length || 0,
        rawBody: Object.keys(req.body),
      });

      // 日志：检查 leadSource 的值
      this.logger.log(`📋 创建简历 - 接收到的 leadSource: ${dto.leadSource || '未传递'}, body.leadSource: ${req.body?.leadSource || '未传递'}`);

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

      // 添加自我介绍视频
      if (files.selfIntroductionVideo && files.selfIntroductionVideo.length > 0) {
        // 验证视频文件大小（10MB限制）
        const videoFile = files.selfIntroductionVideo[0];
        if (videoFile.size > 10 * 1024 * 1024) {
          throw new BadRequestException('自我介绍视频文件大小不能超过10MB');
        }
        filesArray.push(videoFile);
        fileTypes.push('selfIntroductionVideo');
      }

      // 添加月子餐照片
      if (files.confinementMealPhotos && files.confinementMealPhotos.length > 0) {
        filesArray.push(...files.confinementMealPhotos);
        fileTypes.push(...files.confinementMealPhotos.map(() => 'confinementMealPhoto'));
      }

      // 添加烹饪照片
      if (files.cookingPhotos && files.cookingPhotos.length > 0) {
        filesArray.push(...files.cookingPhotos);
        fileTypes.push(...files.cookingPhotos.map(() => 'cookingPhoto'));
      }

      // 添加辅食添加照片
      if (files.complementaryFoodPhotos && files.complementaryFoodPhotos.length > 0) {
        filesArray.push(...files.complementaryFoodPhotos);
        fileTypes.push(...files.complementaryFoodPhotos.map(() => 'complementaryFoodPhoto'));
      }

      // 添加好评展示照片
      if (files.positiveReviewPhotos && files.positiveReviewPhotos.length > 0) {
        filesArray.push(...files.positiveReviewPhotos);
        fileTypes.push(...files.positiveReviewPhotos.map(() => 'positiveReviewPhoto'));
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

  @Get('enums')
  @Public()
  @ApiOperation({ summary: '获取枚举字典（供前端使用）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getEnums() {
    try {
      const enums = {
        gender: [
          { value: 'female', label: '女' },
          { value: 'male', label: '男' }
        ],
        jobType: [
          { value: 'yuesao', label: '月嫂' },
          { value: 'zhujia-yuer', label: '住家育儿' },
          { value: 'baiban-yuer', label: '白班育儿' },
          { value: 'baojie', label: '保洁' },
          { value: 'baiban-baomu', label: '白班保姆' },
          { value: 'zhujia-baomu', label: '住家保姆' },
          { value: 'yangchong', label: '养宠' },
          { value: 'xiaoshi', label: '小时工' },
          { value: 'zhujia-hulao', label: '住家护老' },
          { value: 'jiajiao', label: '家教' },
          { value: 'peiban', label: '陪伴师' }
        ],
        education: [
          { value: 'no', label: '无学历' },
          { value: 'primary', label: '小学' },
          { value: 'middle', label: '初中' },
          { value: 'secondary', label: '中专' },
          { value: 'vocational', label: '职业学校' },
          { value: 'high', label: '高中' },
          { value: 'college', label: '大专' },
          { value: 'bachelor', label: '本科' },
          { value: 'graduate', label: '研究生' }
        ],
        skills: [
          { value: 'chanhou', label: '产后修复师' },
          { value: 'teshu-yinger', label: '特殊婴儿护理' },
          { value: 'yiliaobackground', label: '医疗背景' },
          { value: 'yuying', label: '高级育婴师' },
          { value: 'zaojiao', label: '早教师' },
          { value: 'fushi', label: '辅食营养师' },
          { value: 'ertui', label: '小儿推拿师' },
          { value: 'waiyu', label: '外语' },
          { value: 'zhongcan', label: '中餐' },
          { value: 'xican', label: '西餐' },
          { value: 'mianshi', label: '面食' },
          { value: 'jiashi', label: '驾驶' },
          { value: 'shouyi', label: '整理收纳' },
          { value: 'muying', label: '母婴护理师' },
          { value: 'cuiru', label: '高级催乳师' },
          { value: 'yuezican', label: '月子餐营养师' },
          { value: 'yingyang', label: '营养师' },
          { value: 'liliao-kangfu', label: '理疗康复' },
          { value: 'shuangtai-huli', label: '双胎护理' },
          { value: 'yanglao-huli', label: '养老护理' }
        ],
        maritalStatus: [
          { value: 'single', label: '未婚' },
          { value: 'married', label: '已婚' },
          { value: 'divorced', label: '离异' },
          { value: 'widowed', label: '丧偶' }
        ],
        religion: [
          { value: 'none', label: '无' },
          { value: 'buddhism', label: '佛教' },
          { value: 'christianity', label: '基督教' },
          { value: 'islam', label: '伊斯兰教' },
          { value: 'catholicism', label: '天主教' },
          { value: 'hinduism', label: '印度教' },
          { value: 'taoism', label: '道教' },
          { value: 'protestantism', label: '新教' },
          { value: 'orthodoxy', label: '东正教' }
        ],
        zodiac: [
          { value: 'rat', label: '鼠' },
          { value: 'ox', label: '牛' },
          { value: 'tiger', label: '虎' },
          { value: 'rabbit', label: '兔' },
          { value: 'dragon', label: '龙' },
          { value: 'snake', label: '蛇' },
          { value: 'horse', label: '马' },
          { value: 'goat', label: '羊' },
          { value: 'monkey', label: '猴' },
          { value: 'rooster', label: '鸡' },
          { value: 'dog', label: '狗' },
          { value: 'pig', label: '猪' }
        ],
        zodiacSign: [
          { value: 'capricorn', label: '摩羯座' },
          { value: 'aquarius', label: '水瓶座' },
          { value: 'pisces', label: '双鱼座' },
          { value: 'aries', label: '白羊座' },
          { value: 'taurus', label: '金牛座' },
          { value: 'gemini', label: '双子座' },
          { value: 'cancer', label: '巨蟹座' },
          { value: 'leo', label: '狮子座' },
          { value: 'virgo', label: '处女座' },
          { value: 'libra', label: '天秤座' },
          { value: 'scorpio', label: '天蝎座' },
          { value: 'sagittarius', label: '射手座' }
        ],
        orderStatus: [
          { value: 'accepting', label: '想接单' },
          { value: 'not-accepting', label: '不接单' },
          { value: 'signed', label: '已签约' },
          { value: 'on-service', label: '已上户' }
        ],
        leadSource: [
          { value: 'referral', label: '转介绍' },
          { value: 'paid-lead', label: '付费线索' },
          { value: 'community', label: '社群线索' },
          { value: 'door-to-door', label: '地推' },
          { value: 'shared-order', label: '合单' },
          { value: 'other', label: '其他' }
        ],
        maternityNurseLevel: [
          { value: 'junior', label: '初级月嫂' },
          { value: 'silver', label: '银牌月嫂' },
          { value: 'gold', label: '金牌月嫂' },
          { value: 'platinum', label: '铂金月嫂' },
          { value: 'diamond', label: '钻石月嫂' },
          { value: 'crown', label: '皇冠月嫂' }
        ],
        fileTypes: [
          { value: 'idCardFront', label: '身份证正面' },
          { value: 'idCardBack', label: '身份证背面' },
          { value: 'personalPhoto', label: '个人照片' },
          { value: 'certificate', label: '技能证书' },
          { value: 'medicalReport', label: '体检报告' }
        ]
      };

      return {
        success: true,
        data: enums,
        message: '获取枚举字典成功'
      };
    } catch (error) {
      this.logger.error(`获取枚举字典失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `获取枚举字典失败: ${error.message}`
      };
    }
  }

  // 检查是否是管理员或经理
  private isManagerOrAdmin(user: any): boolean {
    return user?.role === '系统管理员' || user?.role === 'admin' ||
           user?.role === '经理' || user?.role === 'manager';
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
    @Query('isDraft') isDraftStr?: string,
    @Req() req?: any
  ) {
    try {
      // 手动解析数字参数，避免使用ParseIntPipe
      let page = 1;
      let pageSize = 10;
      let maxAge: number | undefined = undefined;

      // 🆕 权限控制：已上户且关联有效合同的简历，只有管理员和合同归属人（员工本人）能看到
      const user = req?.user;
      const currentUserId = user?.userId;
      const isAdmin = user?.role === 'admin' || user?.role === '系统管理员';

      // 详细记录请求信息
      this.logger.log(`接收到简历列表请求, URL: ${req?.url}, 参数: page=${pageStr}, pageSize=${pageSizeStr}, keyword=${keyword}, jobType=${jobType}, timestamp=${timestamp}, currentUserId=${currentUserId}`);

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

      // 解析 isDraft 过滤参数
      let isDraftFilter: boolean | undefined = undefined;
      if (isDraftStr === 'true') isDraftFilter = true;
      else if (isDraftStr === 'false') isDraftFilter = false;

      // 调用服务获取数据
      const result = await this.resumeService.findAll(
        page,
        pageSize,
        keyword,
        jobType,
        orderStatus,
        maxAge,
        nativePlace,
        ethnicity,
        currentUserId,
        isDraftFilter,
        isAdmin,
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

  @Get('assignable-users')
  @Permissions('resume:assign')
  @ApiOperation({ summary: '获取可分配的员工列表（管理员/经理）' })
  async getAssignableUsers() {
    try {
      const users = await this.resumeService.getAssignableUsers();
      return { success: true, data: users };
    } catch (error) {
      return { success: false, data: null, message: error.message };
    }
  }

  @Patch(':id/toggle-hidden')
  @Permissions('resume:edit')
  @ApiOperation({ summary: '切换推荐简历隐藏状态（归属员工或管理员可操作）' })
  async toggleHidden(@Param('id') id: string, @Req() req: any) {
    try {
      const currentUserId = req?.user?.userId;
      const isAdmin = req?.user?.role === 'admin' || req?.user?.role === '系统管理员';
      const result = await this.resumeService.toggleHidden(id, currentUserId, isAdmin);
      return {
        success: true,
        data: result,
        message: result.isHidden ? '已设为仅归属员工可见' : '已取消隐藏，全员可见',
      };
    } catch (error) {
      return { success: false, data: null, message: error.message };
    }
  }

  @Patch(':id/assign')
  @Permissions('resume:assign')
  @ApiOperation({ summary: '分配阿姨给指定员工（管理员/经理）' })
  async assignResume(
    @Param('id') id: string,
    @Body() body: { assignedTo: string },
    @Request() req,
  ) {
    try {
      const resume = await this.resumeService.assignResume(id, body.assignedTo, req.user?.userId);
      return { success: true, data: resume, message: '分配成功' };
    } catch (error) {
      return { success: false, data: null, message: error.message };
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

  // ==================== 公开接口（不脱敏，供小程序使用） ====================

  @Get('public/list')
  @Public()
  @ApiOperation({ summary: '获取简历列表（公开接口，不脱敏）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAllPublic(
    @Query('page') pageStr: string = '1',
    @Query('pageSize') pageSizeStr: string = '10',
    @Query('keyword') keyword?: string,
    @Query('jobType') jobType?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('maxAge') maxAgeStr?: string,
    @Query('nativePlace') nativePlace?: string,
    @Query('ethnicity') ethnicity?: string,
    @Query('_t') timestamp?: string,
  ) {
    try {
      this.logger.log(`公开接口 - 获取简历列表: page=${pageStr}, pageSize=${pageSizeStr}`);

      // 手动解析数字参数
      let page = 1;
      let pageSize = 10;
      let maxAge: number | undefined = undefined;

      try {
        const parsedPage = parseInt(pageStr, 10);
        if (!isNaN(parsedPage) && parsedPage > 0) {
          page = parsedPage;
        }
      } catch (e) {
        this.logger.warn(`页码解析错误: ${e.message}`);
      }

      try {
        const parsedPageSize = parseInt(pageSizeStr, 10);
        if (!isNaN(parsedPageSize) && parsedPageSize > 0) {
          pageSize = Math.min(parsedPageSize, 100); // 限制最大100条
        }
      } catch (e) {
        this.logger.warn(`每页数量解析错误: ${e.message}`);
      }

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

      // 调用服务获取数据（公开接口无用户信息，已上户简历会被过滤）
      // filterLowQuality=true：过滤掉"无个人照片且薪资为0"的低质量简历
      const result = await this.resumeService.findAll(
        page,
        pageSize,
        keyword,
        jobType,
        orderStatus,
        maxAge,
        nativePlace,
        ethnicity,
        undefined, // currentUserId
        undefined, // isDraft
        false,     // isAdmin
        true,      // filterLowQuality：公开列表过滤无照片且薪资=0的简历
      );

      return {
        success: true,
        data: result,
        message: '获取简历列表成功'
      };
    } catch (error) {
      this.logger.error(`公开接口 - 获取简历列表失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
        message: `获取简历列表失败: ${error.message}`
      };
    }
  }

  @Get('public/:id')
  @Public()
  @ApiOperation({ summary: '获取简历详情（公开接口，不脱敏）' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOnePublicFull(@Param('id') id: string) {
    try {
      this.logger.log(`公开接口 - 获取简历详情: id=${id}`);
      // 公开接口无用户信息，已上户+有效合同的简历不可见
      const resume = await this.resumeService.findOne(id, undefined, false);

      if (!resume) {
        return {
          success: false,
          data: null,
          message: '简历不存在'
        };
      }

      // 获取员工评价数据
      const employeeEvaluations = await this.resumeService.getEmployeeEvaluations(id);

      // 获取推荐理由标签
      const recommendationTags = await this.resumeService.getRecommendationTags(id);

      // 添加员工评价和推荐理由到响应数据
      const resumeData = resume.toObject ? resume.toObject() : resume;
      // 与 CRM 详情接口保持一致：优先工装照，其次个人照片，最后兼容旧 photoUrls
      const avatarUrl =
        resumeData?.uniformPhoto?.url ||
        (Array.isArray(resumeData?.personalPhoto) && resumeData.personalPhoto.length > 0 ? resumeData.personalPhoto[0]?.url : undefined) ||
        (Array.isArray(resumeData?.photoUrls) && resumeData.photoUrls.length > 0 ? resumeData.photoUrls[0] : undefined) ||
        '';
      const enhancedData = {
        ...resumeData,
        // 头像字段（与列表接口 /resumes/public/list 保持一致）
        avatarUrl,
        // 相册 URL 数组（便捷字段，供相册页直接使用）
        confinementMealPhotoUrls: (resumeData.confinementMealPhotos || []).map((p: any) => p.url).filter(Boolean),
        cookingPhotoUrls: (resumeData.cookingPhotos || []).map((p: any) => p.url).filter(Boolean),
        complementaryFoodPhotoUrls: (resumeData.complementaryFoodPhotos || []).map((p: any) => p.url).filter(Boolean),
        positiveReviewPhotoUrls: (resumeData.positiveReviewPhotos || []).map((p: any) => p.url).filter(Boolean),
        // 自我介绍视频便捷 URL
        selfIntroductionVideoUrl: resumeData?.selfIntroductionVideo?.url || null,
        employeeEvaluations: employeeEvaluations || [],
        recommendationTags: recommendationTags || []
      };

      return {
        success: true,
        data: enhancedData,
        message: '获取简历详情成功'
      };
    } catch (error) {
      this.logger.error(`公开接口 - 获取简历详情失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `获取简历详情失败: ${error.message}`
      };
    }
  }

  // ==================== 分享相关接口 ====================

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

  // ==================== 员工信息查询接口（供安得褓贝小程序使用）====================

  @Get('staff/info')
  @Public()
  @ApiOperation({ summary: '根据手机号获取CRM员工姓名、头像、手机号（公开接口，供安得褓贝小程序调用）' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getStaffInfo(@Query('phone') phone: string) {
    if (!phone) {
      return { success: false, data: null, message: '请提供手机号' };
    }

    try {
      const staffInfo = await this.resumeService.getStaffInfoByPhone(phone);
      if (!staffInfo) {
        return { success: false, data: null, message: '未找到该手机号对应的员工' };
      }

      return {
        success: true,
        data: staffInfo,
        message: '查询成功',
      };
    } catch (error) {
      this.logger.error(`获取员工信息失败: ${error.message}`, error.stack);
      return { success: false, data: null, message: `查询失败: ${error.message}` };
    }
  }

  // ==================== 小程序专用接口 ====================

  @Post('miniprogram/self-register')
  @Public()
  @ApiOperation({ summary: '阿姨自助注册接口（无需JWT认证）' })
  @ApiBody({ type: CreateResumeV2Dto })
  async selfRegister(
    @Body() dto: CreateResumeV2Dto,
    @Req() req?,
  ) {
    // 提取请求IP后将完整业务逻辑委托给服务层
    const requestIp = req.ip || req.connection?.remoteAddress || 'unknown';
    return this.resumeService.selfRegisterMiniprogram(dto, requestIp);
  }

  @Post('miniprogram/create')
  @Permissions('resume:create')
  @ApiOperation({ summary: '小程序创建简历（支持幂等性和去重）' })
  @ApiBody({ type: CreateResumeV2Dto })
  async createForMiniprogram(
    @Body() dto: CreateResumeV2Dto,
    @Headers('Idempotency-Key') idempotencyKey?: string,
    @Headers('api-version') apiVersion?: string,
    @Headers('x-request-id') requestId?: string,
    @Req() req?,
  ) {
    try {
      this.logger.log(`🆕 小程序创建简历:`);
      this.logger.log(`📝 创建数据: ${JSON.stringify(dto, null, 2)}`);
      this.logger.log(`🔑 请求头: idempotencyKey=${idempotencyKey}, apiVersion=${apiVersion}, requestId=${requestId}`);

      // 特别记录selfIntroduction字段
      if (dto.selfIntroduction !== undefined) {
        this.logger.log(`✨ 包含自我介绍: ${dto.selfIntroduction ? '有内容(' + dto.selfIntroduction.length + '字符)' : '空内容'}`);
      } else {
        this.logger.log(`⚠️ 未包含自我介绍字段`);
      }

      // 获取用户ID（如果已登录）或使用null
      const userId = req.user?.userId || null;

      // 调用服务层的创建方法
      const result = await this.resumeService.createV2(dto, idempotencyKey, userId);

      this.logger.log(`✅ 小程序创建简历成功: ${result.id}, 操作类型: ${result.action}`);

      // 获取完整的简历数据用于响应
      const createdResume = await this.resumeService.findOne(result.id);

      return {
        success: true,
        data: {
          id: result.id,
          createdAt: result.createdAt,
          action: result.action || 'CREATED',
          // 返回完整的简历数据，方便小程序端使用
          resume: this.resumeService.formatResumeForMiniprogram(createdResume)
        },
        message: result.action === 'UPDATED' ? '简历已更新' : '创建简历成功'
      };
    } catch (error) {
      this.logger.error(`小程序创建简历失败: ${error.message}`);

      // 处理特定错误类型
      if (error instanceof ConflictException) {
        const errorData = error.getResponse() as any;
        return {
          success: false,
          code: 'DUPLICATE',
          data: errorData.existingId ? { existingId: errorData.existingId } : null,
          message: error.message
        };
      }

      if (error instanceof BadRequestException) {
        const errorData = error.getResponse() as any;
        return {
          success: false,
          code: 'VALIDATION_ERROR',
          data: errorData.errors || null,
          message: error.message
        };
      }

      return {
        success: false,
        code: 'INTERNAL_ERROR',
        data: { requestId },
        message: `创建简历失败: ${error.message}`
      };
    }
  }

  @Get('miniprogram/:id')
  @Permissions('resume:view')
  @ApiOperation({ summary: '小程序获取简历详情' })
  @ApiParam({ name: 'id', description: '简历ID' })
  async getForMiniprogram(
    @Param('id') id: string,
    @Req() req,
  ) {
    try {
      this.logger.log(`🔍 小程序获取简历详情: ${id}`);

      // 已上户+有效合同的简历权限控制
      const currentUserId = req?.user?.userId;
      const isAdmin = req?.user?.role === 'admin' || req?.user?.role === '系统管理员';
      const resume = await this.resumeService.findOne(id, currentUserId, isAdmin);

      // 获取员工评价数据
      const employeeEvaluations = await this.resumeService.getEmployeeEvaluations(id);

      // 获取推荐理由标签
      const recommendationTags = await this.resumeService.getRecommendationTags(id);

      if (!resume) {
        return {
          success: false,
          data: null,
          message: '简历不存在'
        };
      }

      // 构建小程序友好的响应数据
      const formattedResume = this.resumeService.formatResumeForMiniprogram(resume);
      const responseData = {
        ...formattedResume,
        // 员工评价数据
        employeeEvaluations: employeeEvaluations || [],
        // 推荐理由标签
        recommendationTags: recommendationTags || [],
      };

      this.logger.log(`✅ 小程序获取简历详情成功: ${id}`);
      this.logger.log(`📋 自我介绍字段: ${formattedResume.selfIntroduction ? '有内容(' + (formattedResume.selfIntroduction as string).length + '字符)' : '无内容'}`);
      this.logger.log(`📊 员工评价数量: ${employeeEvaluations?.length || 0}`);
      this.logger.log(`🏷️ 推荐理由标签数量: ${recommendationTags?.length || 0}`);

      return {
        success: true,
        data: responseData,
        message: '获取简历详情成功'
      };
    } catch (error) {
      this.logger.error(`❌ 小程序获取简历详情失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `获取简历详情失败: ${error.message}`
      };
    }
  }

  @Patch('miniprogram/:id')
  @Permissions('resume:edit')
  @ApiOperation({ summary: '小程序更新简历（JSON格式）' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiBody({ type: UpdateResumeDto })
  async updateForMiniprogram(
    @Param('id') id: string,
    @Body() dto: UpdateResumeDto,
    @Req() req,
  ) {
    try {
      this.logger.log(`🔄 小程序更新简历 ${id}:`);
      this.logger.log(`📝 更新数据: ${JSON.stringify(dto, null, 2)}`);

      // 特别记录selfIntroduction字段
      if (dto.selfIntroduction !== undefined) {
        this.logger.log(`✨ 包含自我介绍更新: ${dto.selfIntroduction ? '有内容(' + dto.selfIntroduction.length + '字符)' : '清空'}`);
      }

      const resume = await this.resumeService.update(id, dto);

      this.logger.log(`✅ 小程序更新简历成功: ${id}`);
      this.logger.log(`📋 返回的自我介绍: ${resume.selfIntroduction ? '有内容(' + resume.selfIntroduction.length + '字符)' : '无内容'}`);

      return {
        success: true,
        data: this.resumeService.formatResumeForMiniprogram(resume),
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
  @Permissions('resume:edit')
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
          enum: ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'medicalReport', 'selfIntroductionVideo', 'confinementMealPhoto', 'cookingPhoto', 'complementaryFoodPhoto', 'positiveReviewPhoto'],
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

      const validTypes = ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'medicalReport', 'selfIntroductionVideo', 'confinementMealPhoto', 'cookingPhoto', 'complementaryFoodPhoto', 'positiveReviewPhoto'];
      if (!type || !validTypes.includes(type)) {
        throw new BadRequestException(`请指定正确的文件类型，有效类型: ${validTypes.join(', ')}`);
      }

      this.logger.log(`小程序上传文件: 简历ID=${id}, 文件类型=${type}, 文件名=${file.originalname}`);

      const result = await this.resumeService.addFileWithType(id, file, type);
      const uploadedFileUrl = result.fileUrl;

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

  @Post('miniprogram/:id/upload-files')
  @Permissions('resume:edit')
  @UseInterceptors(FilesInterceptor('files', 30, multerConfig))
  @ApiOperation({ summary: '小程序批量上传文件' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          description: '要上传的文件数组'
        },
        types: {
          type: 'string',
          description: '文件类型数组，JSON字符串格式，如["personalPhoto","certificate"]'
        }
      },
      required: ['files', 'types']
    },
  })
  async uploadFilesForMiniprogram(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('types') types: string,
    @Req() req,
  ) {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('请选择要上传的文件');
      }

      let fileTypes: string[];
      try {
        fileTypes = JSON.parse(types);
      } catch {
        throw new BadRequestException('文件类型格式错误，应为JSON数组');
      }

      if (files.length !== fileTypes.length) {
        throw new BadRequestException('文件数量与类型数量不匹配');
      }

      this.logger.log(`📁 小程序批量上传文件: 简历ID=${id}, 文件数量=${files.length}`);

      const uploadResults = [];
      const uploadPromises = files.map(async (file, index) => {
        const fileType = fileTypes[index];
        const result = await this.resumeService.addFileWithType(id, file, fileType);
        return {
          fileUrl: result.fileUrl,
          fileType: fileType,
          fileName: file.originalname,
          fileSize: file.size,
          index: index
        };
      });

      const results = await Promise.all(uploadPromises);

      this.logger.log(`✅ 小程序批量上传成功: ${results.length}个文件`);

      return {
        success: true,
        data: {
          resumeId: id,
          uploadedFiles: results,
          totalCount: results.length
        },
        message: `成功上传${results.length}个文件`
      };
    } catch (error) {
      this.logger.error(`❌ 小程序批量文件上传失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `批量文件上传失败: ${error.message}`
      };
    }
  }

  @Delete('miniprogram/:id/delete-file')
  @Permissions('resume:edit')
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
          enum: ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'medicalReport', 'selfIntroductionVideo', 'confinementMealPhoto', 'cookingPhoto', 'complementaryFoodPhoto', 'positiveReviewPhoto'],
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

  @Post('miniprogram/validate')
  @Permissions('resume:create')
  @ApiOperation({ summary: '小程序数据验证' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: '手机号' },
        idNumber: { type: 'string', description: '身份证号' }
      }
    }
  })
  async validateForMiniprogram(
    @Body() data: { phone?: string; idNumber?: string },
    @Req() req,
  ) {
    try {
      this.logger.log(`🔍 小程序数据验证: ${JSON.stringify(data)}`);

      const validationResults = {
        phone: { valid: true, exists: false, message: '' },
        idNumber: { valid: true, exists: false, message: '' }
      };

      // 验证手机号
      if (data.phone) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(data.phone)) {
          validationResults.phone = { valid: false, exists: false, message: '手机号格式不正确' };
        } else {
          const existingResume = await this.resumeService.findByPhone(data.phone);
          if (existingResume) {
            validationResults.phone = { valid: true, exists: true, message: '手机号已存在' };
          }
        }
      }

      // 验证身份证号
      if (data.idNumber) {
        const idRegex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
        if (!idRegex.test(data.idNumber)) {
          validationResults.idNumber = { valid: false, exists: false, message: '身份证号格式不正确' };
        }
      }

      return {
        success: true,
        data: validationResults,
        message: '验证完成'
      };
    } catch (error) {
      this.logger.error(`❌ 小程序数据验证失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `数据验证失败: ${error.message}`
      };
    }
  }

  /**
   * 查询简历对应劳动者的保险和背调状态
   * 需要 resume:view 权限（JWT 已在类级别强制）
   */
  @Get('miniprogram/:id/check-status')
  @Permissions('resume:view')
  @ApiOperation({ summary: '【小程序】查询劳动者保险与背调状态' })
  @ApiParam({ name: 'id', description: '简历ID（MongoDB ObjectId）' })
  @ApiResponse({ status: 200, description: '查询成功', schema: { example: { success: true, data: { hasInsurance: true, hasBackgroundCheck: false }, message: '查询成功' } } })
  async checkWorkerStatusForMiniprogram(
    @Param('id') id: string,
    @Req() req,
  ) {
    try {
      this.logger.log(`🔍 小程序查询劳动者保险/背调状态: resumeId=${id}`);
      const result = await this.resumeService.checkWorkerStatus(id, req.user);
      return { success: true, data: result, message: '查询成功' };
    } catch (error) {
      this.logger.error(`❌ 查询劳动者保险/背调状态失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: { hasInsurance: false, hasBackgroundCheck: false },
        message: error.message || '查询失败',
      };
    }
  }

  /**
   * 直接通过身份证号查询劳动者保险与背调状态
   * 需要 resume:view 权限
   */
  @Post('miniprogram/check-status-by-idcard')
  @Permissions('resume:view')
  @ApiOperation({ summary: '【小程序】通过身份证号查询劳动者保险与背调状态' })
  @ApiBody({ schema: { type: 'object', properties: { idCard: { type: 'string', description: '身份证号' } }, required: ['idCard'] } })
  @ApiResponse({ status: 200, description: '查询成功', schema: { example: { success: true, data: { hasInsurance: true, hasBackgroundCheck: false }, message: '查询成功' } } })
  async checkWorkerStatusByIdCardForMiniprogram(
    @Body('idCard') idCard: string,
    @Req() req,
  ) {
    try {
      this.logger.log(`🔍 小程序通过身份证号查询保险/背调状态: idCard=${idCard}`);
      if (!idCard) {
        return { success: false, data: { hasInsurance: false, hasBackgroundCheck: false }, message: '身份证号不能为空' };
      }
      const result = await this.resumeService.checkWorkerStatusByIdCard(idCard);
      return { success: true, data: result, message: '查询成功' };
    } catch (error) {
      this.logger.error(`❌ 通过身份证号查询保险/背调状态失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: { hasInsurance: false, hasBackgroundCheck: false },
        message: error.message || '查询失败',
      };
    }
  }

  @Get('miniprogram/stats')
  @Permissions('resume:view')
  @ApiOperation({ summary: '小程序统计信息' })
  async getStatsForMiniprogram(@Req() req) {
    try {
      this.logger.log(`📊 小程序获取统计信息`);

      // 获取基础统计
      const totalResumes = await this.resumeService.count();
      const resumesWithSelfIntro = await this.resumeService.countWithSelfIntroduction();
      const recentResumes = await this.resumeService.countRecentResumes(7); // 最近7天

      const stats = {
        totalResumes,
        resumesWithSelfIntroduction: resumesWithSelfIntro,
        selfIntroductionRate: totalResumes > 0 ? ((resumesWithSelfIntro / totalResumes) * 100).toFixed(2) : '0.00',
        recentResumes,
        lastUpdated: new Date().toISOString()
      };

      this.logger.log(`📈 统计结果: 总数=${totalResumes}, 有自我介绍=${resumesWithSelfIntro}, 比例=${stats.selfIntroductionRate}%`);

      return {
        success: true,
        data: stats,
        message: '获取统计信息成功'
      };
    } catch (error) {
      this.logger.error(`❌ 小程序获取统计信息失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `获取统计信息失败: ${error.message}`
      };
    }
  }

  /**
   * 小程序生成AI工装照
   * 上传个人照片 → AI生成工装照 → 返回原图URL和工装照URL
   */
  @Post('miniprogram/generate-uniform')
  @Permissions('resume:edit')
  @UseInterceptors(FileInterceptor('file', memoryUploadConfig))
  @ApiOperation({ summary: '【小程序】AI生成工装照' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: '个人照片文件（支持jpg/png，建议正面免冠照）' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: '生成成功', schema: { example: { success: true, data: { personalPhotoUrl: 'https://...', uniformPhotoUrl: 'https://...' }, message: 'AI工装照生成成功' } } })
  async generateUniformForMiniprogram(@UploadedFile() file: Express.Multer.File, @Req() req) {
    try {
      if (!file) {
        throw new BadRequestException('请上传照片文件');
      }

      this.logger.log(`📸 小程序工装生成: 文件大小=${file.size}, 类型=${file.mimetype}`);

      // 检查AI服务是否可用
      if (!this.qwenAIService.isUniformSwapConfigured()) {
        throw new HttpException({ success: false, message: 'AI换装服务未配置，请联系管理员' }, HttpStatus.SERVICE_UNAVAILABLE);
      }

      // 获取工装模板URL列表
      const templateUrls = this.getUniformTemplateUrls();
      if (templateUrls.length === 0) {
        throw new HttpException({ success: false, message: '未配置工装模板图片，请联系管理员' }, HttpStatus.SERVICE_UNAVAILABLE);
      }

      // 方案2：如已开启预处理，先做人脸验证+白底合成+锐化
      let fileToUpload = file;
      if (this.qwenAIService.isPreprocessEnabled()) {
        this.logger.log('[小程序工装] 方案2已开启，开始预处理...');
        const processedBuffer = await this.qwenAIService.preprocessImageForUniform(file.buffer);
        fileToUpload = { ...file, buffer: processedBuffer, size: processedBuffer.length };
      }

      // 1. 上传个人照片到COS（方案1：原图；方案2：预处理后图）
      const personalPhotoUrl = await this.uploadService.uploadFile(fileToUpload, { type: 'personalPhoto' });
      this.logger.log(`✅ 个人照片已上传: ${personalPhotoUrl.substring(0, 60)}...`);

      // 2. 随机选取模板，调用AI换装
      const templateUrl = templateUrls[Math.floor(Math.random() * templateUrls.length)];
      this.logger.log(`🎨 使用模板生成工装照，共${templateUrls.length}个模板可用`);

      const imageBuffer = await this.generateUniformWithFallback(personalPhotoUrl, templateUrl);

      // 3. 上传生成的工装照到COS
      const fakeFile = {
        buffer: imageBuffer,
        originalname: `uniform-photo-${Date.now()}.jpg`,
        mimetype: 'image/jpeg',
        size: imageBuffer.length,
        fieldname: 'uniformPhoto',
        encoding: '7bit',
      } as Express.Multer.File;

      const uniformPhotoUrl = await this.uploadService.uploadFile(fakeFile, { type: 'personalPhoto' });
      this.logger.log(`✅ 工装照已生成: ${uniformPhotoUrl.substring(0, 60)}...`);

      return {
        success: true,
        data: { personalPhotoUrl, uniformPhotoUrl },
        message: 'AI工装照生成成功',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ 小程序工装生成失败: ${message}`);

      // 人脸验证不通过 → 400，前端直接展示中文提示
      if (message.includes('请上传') || message.includes('照片太模糊') || message.includes('侧脸') || message.includes('照片不符合要求')) {
        throw new HttpException({ success: false, message }, HttpStatus.BAD_REQUEST);
      }

      if (message.includes('繁忙') || message.includes('rate') || message.includes('limit')) {
        throw new HttpException({ success: false, message: 'AI服务繁忙，请稍后几秒再重试' }, HttpStatus.TOO_MANY_REQUESTS);
      }

      throw new HttpException({ success: false, message: `生成失败: ${message}` }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 小程序通过已有照片URL重新生成工装照
   */
  @Post('miniprogram/regenerate-uniform')
  @Permissions('resume:edit')
  @ApiOperation({ summary: '【小程序】重新生成AI工装照（使用已上传的照片URL）' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photoUrl: { type: 'string', description: '已上传到COS的个人照片URL' },
      },
      required: ['photoUrl'],
    },
  })
  @ApiResponse({ status: 200, description: '生成成功', schema: { example: { success: true, data: { personalPhotoUrl: 'https://...', uniformPhotoUrl: 'https://...' }, message: 'AI工装照重新生成成功' } } })
  async regenerateUniformForMiniprogram(@Body() body: { photoUrl: string }, @Req() req) {
    try {
      const { photoUrl } = body;
      if (!photoUrl) {
        throw new BadRequestException('请提供照片URL');
      }

      this.logger.log(`🔄 小程序重新生成工装照: ${photoUrl.substring(0, 60)}...`);

      if (!this.qwenAIService.isUniformSwapConfigured()) {
        throw new HttpException({ success: false, message: 'AI换装服务未配置，请联系管理员' }, HttpStatus.SERVICE_UNAVAILABLE);
      }

      const templateUrls = this.getUniformTemplateUrls();
      if (templateUrls.length === 0) {
        throw new HttpException({ success: false, message: '未配置工装模板图片，请联系管理员' }, HttpStatus.SERVICE_UNAVAILABLE);
      }

      // 方案2：如已开启预处理，下载图片后做人脸验证+白底合成+锐化，上传为新URL
      let photoUrlForAI = photoUrl;
      if (this.qwenAIService.isPreprocessEnabled()) {
        this.logger.log(`[小程序重新生成] 方案2已开启，下载并预处理照片...`);
        try {
          const axios = require('axios');
          const dlResp = await axios.get(photoUrl, { responseType: 'arraybuffer', timeout: 30000 });
          const originalBuffer = Buffer.from(dlResp.data);
          const processedBuffer = await this.qwenAIService.preprocessImageForUniform(originalBuffer);
          const preprocessedFile = {
            buffer: processedBuffer,
            originalname: `preprocessed-${Date.now()}.jpg`,
            mimetype: 'image/jpeg',
            size: processedBuffer.length,
            fieldname: 'personalPhoto',
            encoding: '7bit',
          } as Express.Multer.File;
          photoUrlForAI = await this.uploadService.uploadFile(preprocessedFile, { type: 'personalPhoto' });
          this.logger.log(`[小程序重新生成] 预处理完成，使用预处理URL: ${photoUrlForAI.substring(0, 60)}...`);
        } catch (preprocessErr) {
          // 人脸验证不通过的错误需要向上抛出，不降级
          if (preprocessErr.message?.includes('请上传') || preprocessErr.message?.includes('照片太模糊') || preprocessErr.message?.includes('侧脸') || preprocessErr.message?.includes('照片不符合要求')) {
            throw preprocessErr;
          }
          this.logger.warn(`[小程序重新生成] 预处理失败，降级使用原URL: ${preprocessErr.message}`);
          photoUrlForAI = photoUrl;
        }
      }

      const templateUrl = templateUrls[Math.floor(Math.random() * templateUrls.length)];
      this.logger.log(`🎨 使用模板重新生成，共${templateUrls.length}个模板可用`);

      const imageBuffer = await this.generateUniformWithFallback(photoUrlForAI, templateUrl);

      const fakeFile = {
        buffer: imageBuffer,
        originalname: `uniform-photo-${Date.now()}.jpg`,
        mimetype: 'image/jpeg',
        size: imageBuffer.length,
        fieldname: 'uniformPhoto',
        encoding: '7bit',
      } as Express.Multer.File;

      const uniformPhotoUrl = await this.uploadService.uploadFile(fakeFile, { type: 'personalPhoto' });
      this.logger.log(`✅ 工装照重新生成成功: ${uniformPhotoUrl.substring(0, 60)}...`);

      return {
        success: true,
        data: { personalPhotoUrl: photoUrl, uniformPhotoUrl },
        message: 'AI工装照重新生成成功',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ 小程序重新生成工装失败: ${message}`);

      // 人脸验证不通过 → 400，前端直接展示中文提示
      if (message.includes('请上传') || message.includes('照片太模糊') || message.includes('侧脸') || message.includes('照片不符合要求')) {
        throw new HttpException({ success: false, message }, HttpStatus.BAD_REQUEST);
      }

      if (message.includes('繁忙') || message.includes('rate') || message.includes('limit')) {
        throw new HttpException({ success: false, message: 'AI服务繁忙，请稍后几秒再重试' }, HttpStatus.TOO_MANY_REQUESTS);
      }

      throw new HttpException({ success: false, message: `生成失败: ${message}` }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** 获取工装模板URL列表（从环境变量读取） */
  private getUniformTemplateUrls(): string[] {
    const multi = this.configService.get<string>('UNIFORM_TEMPLATE_URLS') || '';
    const single = this.configService.get<string>('UNIFORM_TEMPLATE_URL') || '';
    return multi
      ? multi.split(',').map(u => u.trim()).filter(Boolean)
      : single ? [single.trim()] : [];
  }

  /** 统一生成逻辑：优先Seedream，失败回退FaceChain（带内存保护） */
  private async generateUniformWithFallback(personalPhotoUrl: string, templateUrl: string): Promise<Buffer> {
    if (this.qwenAIService.isSeedreamConfigured()) {
      try {
        this.logger.log('[AI换装] 使用豆包Seedream生成...');
        return await this.qwenAIService.swapHeadWithSeedream(personalPhotoUrl, templateUrl);
      } catch (seedreamErr) {
        // 内存保护：FaceChain需要加载TensorFlow，内存不足时跳过回退
        const freeMB = Math.round(require('os').freemem() / 1024 / 1024);
        if (freeMB < 200) {
          this.logger.error(`[AI换装] Seedream失败且系统可用内存仅${freeMB}MB，跳过FaceChain回退防止OOM`);
          throw new Error(`AI生成失败，请稍后重试（Seedream: ${seedreamErr.message}）`);
        }
        this.logger.warn(`[AI换装] Seedream失败(${seedreamErr.message})，可用内存${freeMB}MB，尝试FaceChain...`);
        if (this.qwenAIService.isTextAiConfigured()) {
          return await this.qwenAIService.swapHeadToUniform(personalPhotoUrl, templateUrl);
        }
        throw seedreamErr;
      }
    }
    this.logger.log('[AI换装] Seedream未配置，使用FaceChain生成...');
    return await this.qwenAIService.swapHeadToUniform(personalPhotoUrl, templateUrl);
  }

  @Get(':id/public')
  @Public()
  @ApiOperation({ summary: '获取简历公开详情（无认证，脱敏）' })
  @ApiParam({ name: 'id', description: '简历ID' })
  async findOnePublic(@Param('id') id: string, @Query('shared') shared?: string) {
    try {
      this.logger.log(`获取公开简历详情: id=${id}, shared=${shared}`);

      // 公开接口无用户信息，已上户+有效合同的简历不可见
      // 如果是分享模式，返回脱敏的公开字段
      if (shared === '1') {
        const resume = await this.resumeService.findOne(id, undefined, false);
        if (!resume) {
          return {
            success: false,
            data: null,
            message: '简历不存在'
          };
        }

        // 返回公开字段（脱敏）
        const publicData = this.filterPublicFields(resume);
        return {
          success: true,
          data: publicData,
          message: '获取简历详情成功'
        };
      }

      // 默认行为：返回完整数据（需要权限控制）
      const resume = await this.resumeService.findOne(id, undefined, false);
      if (!resume) {
        return {
          success: false,
          data: null,
          message: '简历不存在'
        };
      }
      return {
        success: true,
        data: resume,
        message: '获取简历详情成功'
      };
    } catch (error) {
      this.logger.warn(`获取公开简历详情失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: error?.message || '服务器内部错误'
      };
    }
  }

  /**
   * 过滤出公开可见字段（脱敏处理）
   */
  private filterPublicFields(resume: any) {
    if (!resume) return null;

    return {
      id: resume._id?.toString() || resume.id,
      name: resume.name,
      gender: resume.gender,
      age: resume.age,
      jobType: resume.jobType,
      education: resume.education,
      experienceYears: resume.experienceYears,
      expectedSalary: resume.expectedSalary,
      serviceArea: resume.serviceArea,
      skills: resume.skills,
      nativePlace: resume.nativePlace,
      selfIntroduction: resume.selfIntroduction,
      // 处理过的头像（如果已生成）
      avatarProcessed: resume.avatarProcessed,
      avatarRound: resume.avatarRound,
      // 工作经历（保留必要信息）
      workExperiences: resume.workExperiences || [],
      // 🆕 新增的4个相册字段（公开展示）
      confinementMealPhotos: resume.confinementMealPhotos || [], // 🍲 月子餐照片
      cookingPhotos: resume.cookingPhotos || [], // 👨‍🍳 烹饪照片
      complementaryFoodPhotos: resume.complementaryFoodPhotos || [], // 🍼 辅食添加照片
      positiveReviewPhotos: resume.positiveReviewPhotos || [], // ⭐ 好评展示照片
      // URL数组格式（兼容）
      confinementMealPhotoUrls: (resume.confinementMealPhotos || []).map((photo: any) => photo.url).filter(Boolean),
      cookingPhotoUrls: (resume.cookingPhotos || []).map((photo: any) => photo.url).filter(Boolean),
      complementaryFoodPhotoUrls: (resume.complementaryFoodPhotos || []).map((photo: any) => photo.url).filter(Boolean),
      positiveReviewPhotoUrls: (resume.positiveReviewPhotos || []).map((photo: any) => photo.url).filter(Boolean)
    };
    // 严禁返回：phone、idNumber、身份证照片、报告、内部备注等敏感信息
  }

  // 获取简历操作日志（仅管理员可访问）
  @Get(':id/operation-logs')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions('resume:view')
  @ApiOperation({ summary: '获取简历操作日志（仅管理员）' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiResponse({ status: 200, description: '操作日志获取成功' })
  async getOperationLogs(@Param('id') id: string, @Request() req): Promise<any> {
    try {
      // 验证用户是否为管理员
      if (req.user.role !== 'admin') {
        return {
          success: false,
          data: null,
          message: '权限不足，仅管理员可查看操作日志'
        };
      }
      const logs = await this.resumeService.getOperationLogs(id);
      return {
        success: true,
        data: logs,
        message: '操作日志获取成功'
      };
    } catch (error) {
      this.logger.error(`获取简历操作日志失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `操作日志获取失败: ${error.message}`
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取简历详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string, @Req() req?: any) {
    try {
      this.logger.log(`🔧 Controller获取简历详情: id=${id}`);
      this.logger.log(`🔧 准备调用ResumeService.findOne`);

      // 🆕 获取当前用户信息，用于权限检查（已上户+有效合同的简历只有管理员和归属人能看到）
      const currentUserId = req?.user?.userId;
      const isAdmin = req?.user?.role === 'admin' || req?.user?.role === '系统管理员';

      const resume = await this.resumeService.findOne(id, currentUserId, isAdmin);
      this.logger.log(`🔧 ResumeService.findOne执行完成，结果类型: ${typeof resume}`);
      this.logger.log(`🔧 返回的lastUpdatedBy类型: ${typeof resume?.lastUpdatedBy}`);

      // 获取员工评价数据
      const employeeEvaluations = await this.resumeService.getEmployeeEvaluations(id);

      // 获取推荐理由标签
      const recommendationTags = await this.resumeService.getRecommendationTags(id);

      // 🆕 添加URL数组格式的字段（兼容小程序）
      const resumeData = resume.toObject ? resume.toObject() : resume;
      // 与列表接口保持一致：优先工装照，其次个人照片，最后兼容旧photoUrls
      const avatarUrl =
        resumeData?.uniformPhoto?.url ||
        (Array.isArray(resumeData?.personalPhoto) && resumeData.personalPhoto.length > 0 ? resumeData.personalPhoto[0]?.url : undefined) ||
        (Array.isArray(resumeData?.photoUrls) && resumeData.photoUrls.length > 0 ? resumeData.photoUrls[0] : undefined) ||
        '';
      const enhancedData = {
        ...resumeData,
        // 🆕 头像字段（与列表接口 /resumes/list 保持一致）
        avatarUrl,
        // 🆕 新增的4个相册字段的URL数组（兼容旧版）
        confinementMealPhotoUrls: (resumeData.confinementMealPhotos || []).map((photo: any) => photo.url).filter(Boolean),
        cookingPhotoUrls: (resumeData.cookingPhotos || []).map((photo: any) => photo.url).filter(Boolean),
        complementaryFoodPhotoUrls: (resumeData.complementaryFoodPhotos || []).map((photo: any) => photo.url).filter(Boolean),
        positiveReviewPhotoUrls: (resumeData.positiveReviewPhotos || []).map((photo: any) => photo.url).filter(Boolean),
        // 员工评价数据
        employeeEvaluations: employeeEvaluations || [],
        // 推荐理由标签
        recommendationTags: recommendationTags || []
      };

      return {
        success: true,
        data: enhancedData,
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
    { name: 'photoFiles', maxCount: 30 },
    { name: 'certificateFiles', maxCount: 30 },
    { name: 'medicalReportFiles', maxCount: 10 },
    { name: 'selfIntroductionVideo', maxCount: 1 },
    { name: 'confinementMealPhotos', maxCount: 30 },
    { name: 'cookingPhotos', maxCount: 30 },
    { name: 'complementaryFoodPhotos', maxCount: 30 },
    { name: 'positiveReviewPhotos', maxCount: 30 }
  ], multerConfig))
  @ApiOperation({ summary: '更新简历' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(
    @Param('id') id: string,
    @Body() updateResumeDto: UpdateResumeDto,
    @UploadedFiles() files: {
      idCardFront?: Express.Multer.File[],
      idCardBack?: Express.Multer.File[],
      photoFiles?: Express.Multer.File[],
      certificateFiles?: Express.Multer.File[],
      medicalReportFiles?: Express.Multer.File[],
      selfIntroductionVideo?: Express.Multer.File[],
      confinementMealPhotos?: Express.Multer.File[],
      cookingPhotos?: Express.Multer.File[],
      complementaryFoodPhotos?: Express.Multer.File[],
      positiveReviewPhotos?: Express.Multer.File[]
    } | undefined,
    @Req() req: any,
  ) {
    try {
      // 确保files对象存在，避免undefined访问错误
      const safeFiles = files || {};

      this.logger.log('🔄 更新简历请求:', {
        id,
        contentType: req.headers['content-type'],
        bodyKeys: Object.keys(updateResumeDto || {}),
        learningIntention: updateResumeDto?.learningIntention,
        currentStage: updateResumeDto?.currentStage,
      });

      this.logger.debug('更新简历 - 接收到的文件数据:', {
        idCardFront: safeFiles.idCardFront?.length || 0,
        idCardBack: safeFiles.idCardBack?.length || 0,
        photoFiles: safeFiles.photoFiles?.length || 0,
        certificateFiles: safeFiles.certificateFiles?.length || 0,
        medicalReportFiles: safeFiles.medicalReportFiles?.length || 0,
        selfIntroductionVideo: safeFiles.selfIntroductionVideo?.length || 0,
        confinementMealPhotos: safeFiles.confinementMealPhotos?.length || 0,
        cookingPhotos: safeFiles.cookingPhotos?.length || 0,
        complementaryFoodPhotos: safeFiles.complementaryFoodPhotos?.length || 0,
        positiveReviewPhotos: safeFiles.positiveReviewPhotos?.length || 0,
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

      // 添加自我介绍视频
      if (safeFiles.selfIntroductionVideo && safeFiles.selfIntroductionVideo.length > 0) {
        // 验证视频文件大小（10MB限制）
        const videoFile = safeFiles.selfIntroductionVideo[0];
        if (videoFile.size > 10 * 1024 * 1024) {
          throw new BadRequestException('自我介绍视频文件大小不能超过10MB');
        }
        filesArray.push(videoFile);
        fileTypes.push('selfIntroductionVideo');
      }

      // 添加月子餐照片
      if (safeFiles.confinementMealPhotos && safeFiles.confinementMealPhotos.length > 0) {
        filesArray.push(...safeFiles.confinementMealPhotos);
        fileTypes.push(...safeFiles.confinementMealPhotos.map(() => 'confinementMealPhoto'));
      }

      // 添加烹饪照片
      if (safeFiles.cookingPhotos && safeFiles.cookingPhotos.length > 0) {
        filesArray.push(...safeFiles.cookingPhotos);
        fileTypes.push(...safeFiles.cookingPhotos.map(() => 'cookingPhoto'));
      }

      // 添加辅食添加照片
      if (safeFiles.complementaryFoodPhotos && safeFiles.complementaryFoodPhotos.length > 0) {
        filesArray.push(...safeFiles.complementaryFoodPhotos);
        fileTypes.push(...safeFiles.complementaryFoodPhotos.map(() => 'complementaryFoodPhoto'));
      }

      // 添加好评展示照片
      if (safeFiles.positiveReviewPhotos && safeFiles.positiveReviewPhotos.length > 0) {
        filesArray.push(...safeFiles.positiveReviewPhotos);
        fileTypes.push(...safeFiles.positiveReviewPhotos.map(() => 'positiveReviewPhoto'));
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
      this.logger.error('更新简历失败:', error);
      // 修改错误处理，与创建简历保持一致
      return {
        success: false,
        message: error.message || '更新简历失败',
        error: error.message,
      };
    }
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('resume:delete')
  @ApiOperation({ summary: '删除简历（仅管理员）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '无权限' })
  async remove(@Param('id') id: string, @Req() req) {
    try {
      const userId = req.user?.sub || req.user?.userId || req.user?.id;
      this.logger.log(`管理员 ${req.user?.username} 删除简历: id=${id}`);
      await this.resumeService.remove(id, userId);
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

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({ summary: '上传单个简历文件' })
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
          description: '文件类型：idCardFront/idCardBack/personalPhoto/certificate/medicalReport/confinementMealPhoto/complementaryFoodPhoto/positiveReviewPhoto'
        },
      },
    },
  })
  async uploadSingleFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    try {
      const result = await this.resumeService.addFileWithType(id, file, type);

      return {
        success: true,
        data: {
          fileUrl: result.fileUrl,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        },
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

  @Post(':id/files')
  @UseInterceptors(FilesInterceptor('files', 30, multerConfig))
  @ApiOperation({ summary: '批量上传简历文件' })
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
      this.logger.debug(`🔥🔥🔥 [CONSOLE-DEBUG-OLD] findAllOld方法被调用! URL: ${req?.url}`);

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

  // ==================== 档期管理接口 ====================

  @Get(':id/availability')
  @ApiOperation({ summary: '获取月嫂档期日历' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAvailability(
    @Param('id') id: string,
    @Query() query: QueryAvailabilityDto,
  ) {
    try {
      const availability = await this.resumeService.getAvailability(id, query);
      return {
        success: true,
        data: availability,
        message: '获取档期成功'
      };
    } catch (error) {
      this.logger.error(`获取档期失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `获取档期失败: ${error.message}`
      };
    }
  }

  @Post(':id/availability')
  @ApiOperation({ summary: '更新月嫂档期（按日期范围）' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    try {
      const result = await this.resumeService.updateAvailability(id, dto);
      return {
        success: true,
        data: result,
        message: result.message
      };
    } catch (error) {
      this.logger.error(`更新档期失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `更新档期失败: ${error.message}`
      };
    }
  }

  @Post(':id/availability/batch')
  @ApiOperation({ summary: '批量更新月嫂档期（按日期列表）' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async batchUpdateAvailability(
    @Param('id') id: string,
    @Body() dto: BatchUpdateAvailabilityDto,
  ) {
    try {
      const result = await this.resumeService.batchUpdateAvailability(id, dto);
      return {
        success: true,
        data: result,
        message: result.message
      };
    } catch (error) {
      this.logger.error(`批量更新档期失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `批量更新档期失败: ${error.message}`
      };
    }
  }

  @Delete(':id/availability')
  @ApiOperation({ summary: '删除月嫂档期' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteAvailability(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      if (!startDate || !endDate) {
        throw new BadRequestException('开始日期和结束日期不能为空');
      }
      const result = await this.resumeService.deleteAvailability(id, startDate, endDate);
      return {
        success: true,
        data: result,
        message: result.message
      };
    } catch (error) {
      this.logger.error(`删除档期失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `删除档期失败: ${error.message}`
      };
    }
  }

  @Get(':id/availability/check')
  @ApiOperation({ summary: '检查档期是否可用' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async checkAvailability(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      if (!startDate || !endDate) {
        throw new BadRequestException('开始日期和结束日期不能为空');
      }
      const isAvailable = await this.resumeService.checkAvailability(
        id,
        new Date(startDate),
        new Date(endDate)
      );
      return {
        success: true,
        data: { isAvailable },
        message: isAvailable ? '档期可用' : '档期已被占用'
      };
    } catch (error) {
      this.logger.error(`检查档期失败: ${error.message}`, error.stack);
      return {
        success: false,
        data: null,
        message: `检查档期失败: ${error.message}`
      };
    }
  }

  // ==================== 小程序：AI推荐文案 ====================

  /**
   * 根据简历ID调用千问AI生成约50字推荐文案
   * 无需Token，用员工手机号验证身份
   * POST /resumes/miniprogram/:id/recommendation
   * Body: { phone: "138xxxxxxxx" }
   */
  @Post('miniprogram/:id/recommendation')
  @Public()
  @ApiOperation({ summary: '🤖 AI生成简历推荐文案（手机号鉴权，无需Token）' })
  @ApiParam({ name: 'id', description: '简历ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone'],
      properties: {
        phone: { type: 'string', description: '员工手机号', example: '13800138000' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '返回约50字推荐文案',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            recommendation: { type: 'string', description: '推荐文案（约50字）' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async generateRecommendation(
    @Param('id') id: string,
    @Body('phone') phone: string,
  ) {
    // 验证员工手机号
    if (!phone) {
      return { success: false, data: null, message: '请提供员工手机号' };
    }
    const staffExists = await this.resumeService.checkStaffByPhone(phone);
    if (!staffExists) {
      return { success: false, data: null, message: '手机号未授权，请联系管理员' };
    }

    try {
      this.logger.log(`🤖 小程序请求AI推荐文案，简历ID: ${id}，员工手机: ${phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}`);
      const recommendation = await this.resumeService.generateResumeRecommendation(id);
      this.logger.log(`✅ AI推荐文案生成成功，简历ID: ${id}，内容长度: ${recommendation.length}`);
      return {
        success: true,
        data: { recommendation },
        message: '推荐文案生成成功',
      };
    } catch (error) {
      this.logger.error(`❌ AI推荐文案生成失败，简历ID: ${id}，错误: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `推荐文案生成失败: ${error.message}`,
      };
    }
  }
}
