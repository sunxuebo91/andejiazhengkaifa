import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UsePipes, 
  ValidationPipe, 
  UploadedFile, 
  UseInterceptors, 
  Put, 
  Delete, 
  UploadedFiles, 
  Logger, 
  Query, 
  InternalServerErrorException, 
  HttpException, 
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ResumeService } from './resume.service';
import { Resume } from './models/resume.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { Express } from 'express';
import { UploadService } from '../upload/upload.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/models/user.entity';

@ApiTags('resumes')
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
      
      try {
        // 使用try-catch避免TypeScript的undefined警告
        const originalname = file.originalname ?? '未知文件名';
        const mimetype = file.mimetype ?? '未知类型';
        
        // 使用Logger的静态方法而不是实例方法，避免this绑定问题
        Logger.debug(`处理文件: ${originalname}, 类型: ${mimetype}`, 'ResumeController');
        
        if (!originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
          return callback(new Error('只允许上传jpg、jpeg、png和pdf文件！'), false);
        }
      } catch (error) {
        return callback(new Error('文件处理错误'), false);
      }
      
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  @UsePipes(new ValidationPipe())
  @ApiOperation({ summary: '创建新简历' })
  @ApiResponse({ status: 201, description: '简历创建成功' })
  @ApiResponse({ status: 400, description: '无效的请求数据' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '创建简历的表单数据，包含基本信息和文件',
    type: CreateResumeDto,
  })
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

      this.logger.debug('准备保存简历数据');
      return await this.resumeService.createWithFiles(createResumeDto, fileUrls);
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新简历' })
  @ApiResponse({ status: 200, description: '简历更新成功' })
  @ApiResponse({ status: 404, description: '简历不存在' })
  @UsePipes(new ValidationPipe())
  async update(
    @Param('id') id: string,
    @Body() updateResumeDto: CreateResumeDto,
  ): Promise<Resume> {
    this.logger.debug(`更新简历，ID: ${id}`);
    return this.resumeService.update(id, updateResumeDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除简历' })
  @ApiResponse({ status: 204, description: '简历删除成功' })
  @ApiResponse({ status: 404, description: '简历不存在' })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.debug(`删除简历，ID: ${id}`);
    return this.resumeService.remove(id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取简历详情' })
  @ApiResponse({ status: 200, description: '返回简历详情' })
  @ApiResponse({ status: 404, description: '简历不存在' })
  async findOne(@Param('id') id: string): Promise<Resume> {
    this.logger.debug(`获取简历详情，ID: ${id}`);
    return this.resumeService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: '获取所有简历' })
  @ApiResponse({ status: 200, description: '返回简历列表' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('search') search?: string,
  ) {
    this.logger.debug(`获取简历列表，页码: ${page}, 每页数量: ${pageSize}, 搜索: ${search || '无'}`);
    
    // 如果有搜索关键词，进行搜索
    if (search) {
      return this.resumeService.searchResumes(search);
    }
    
    // 否则进行分页查询
    const parsedPage = parseInt(page as any);
    const parsedPageSize = parseInt(pageSize as any);
    
    return this.resumeService.findWithPagination(parsedPage, parsedPageSize);
  }

  @Get('check-duplicate')
  @ApiOperation({ summary: '检查简历是否重复' })
  @ApiResponse({ status: 200, description: '返回查重结果' })
  async checkDuplicate(
    @Query('phone') phone?: string, 
    @Query('idNumber') idNumber?: string
  ) {
    this.logger.debug(`查重检查: phone=${phone}, idNumber=${idNumber}`);
    
    if (!phone && !idNumber) {
      return {
        message: '请提供手机号或身份证号进行查重',
        duplicate: false
      };
    }

    try {
      return await this.resumeService.checkDuplicate(phone, idNumber);
    } catch (error) {
      this.logger.error('查重检查失败:', error);
      throw new InternalServerErrorException('查重检查失败');
    }
  }
}