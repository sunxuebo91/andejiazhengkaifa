import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFiles, ParseIntPipe, DefaultValuePipe, Logger, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { ResumeService } from './resume.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { Resume } from './models/resume.entity';
import { UploadService } from '../upload/upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';

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
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: '创建简历' })
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
        fileTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['idCardFront', 'idCardBack', 'personalPhoto', 'certificate', 'medicalReport', 'other'],
            description: '文件类型：idCardFront(身份证正面)、idCardBack(身份证背面)、personalPhoto(个人照片)、certificate(证书)、medicalReport(体检报告)、other(其他)'
          }
        },
        title: { type: 'string' },
        content: { type: 'string' },
      },
    },
  })
  async create(
    @Body() dto: CreateResumeDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Req() req,
  ) {
    let resume = null;
    let fileErrors = [];

    try {
      // 从请求体中提取文件类型数组
      let fileTypes: string[] = [];
      if (req.body.fileTypes) {
        if (Array.isArray(req.body.fileTypes)) {
          fileTypes = req.body.fileTypes;
        } else if (typeof req.body.fileTypes === 'string') {
          try {
            fileTypes = JSON.parse(req.body.fileTypes);
          } catch {
            fileTypes = [req.body.fileTypes];
          }
        }
      }

      this.logger.debug('接收到的原始请求数据:', {
        jobType: dto.jobType,
        rawBody: req.body,
        contentType: req.headers['content-type'],
        fileTypes,
        filesCount: files?.length || 0
      });

      const filesArray = files || [];
      
      this.logger.debug('解析后的 DTO 对象:', {
        jobType: dto.jobType,
        jobTypeType: typeof dto.jobType,
        dtoKeys: Object.keys(dto),
        fileTypesLength: fileTypes.length,
        filesLength: filesArray.length
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

  @Get()
  @ApiOperation({ summary: '获取简历列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    try {
      this.logger.log(`获取简历列表: page=${page}, pageSize=${pageSize}, search=${search}`);
      const result = await this.resumeService.findAll(page, pageSize, search);
      return {
        success: true,
        data: result,
        message: '获取简历列表成功'
      };
    } catch (error) {
      this.logger.error(`获取简历列表失败: ${error.message}`);
      return {
        success: false,
        data: { items: [], total: 0 },
        message: `获取简历列表失败: ${error.message}`
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取简历详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    try {
      this.logger.log(`获取简历详情: id=${id}`);
      const resume = await this.resumeService.findOne(id);
      return {
        success: true,
        data: resume,
        message: '获取简历详情成功'
      };
    } catch (error) {
      this.logger.error(`获取简历详情失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `获取简历详情失败: ${error.message}`
      };
    }
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: '更新简历' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '更新成功' })
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('files'))
  async update(
    @Param('id') id: string,
    @Body() updateResumeDto: UpdateResumeDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    try {
      console.log('更新简历 - 请求体:', req.body);
      console.log('更新简历 - DTO验证后:', updateResumeDto);
      
      // 处理 fileTypes
      let fileTypes: string[] = [];
      if (req.body.fileTypes) {
        if (typeof req.body.fileTypes === 'string') {
          try {
            fileTypes = JSON.parse(req.body.fileTypes);
          } catch {
            fileTypes = [req.body.fileTypes];
          }
        } else if (Array.isArray(req.body.fileTypes)) {
          fileTypes = req.body.fileTypes;
        }
      }
      
      console.log('更新简历 - 文件类型:', fileTypes);
      console.log('更新简历 - 上传文件数量:', files?.length || 0);
      
      const result = await this.resumeService.updateWithFiles(
        id,
        updateResumeDto,
        files || [],
        fileTypes,
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
  @UseInterceptors(FilesInterceptor('files'))
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
  @ApiOperation({ summary: '删除简历文件' })
  async removeFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    return this.resumeService.removeFile(id, fileId);
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
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

  @Delete(':id/files/:fileId')
  @ApiOperation({ summary: '删除简历文件' })
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Body('type') type: string,
  ) {
    try {
      const result = await this.resumeService.removeFile(id, fileId);
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
  // 删除从这里开始的重复代码：
  // @Patch(':id')
  // async update(
  //   @Param('id') id: string,
  //   @Body() updateResumeDto: UpdateResumeDto,
  // ) {
  //   ...
  // }
}