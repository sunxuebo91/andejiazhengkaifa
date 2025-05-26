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
            enum: ['idCardFront', 'idCardBack', 'other'],
            description: '文件类型：idCardFront(身份证正面)、idCardBack(身份证背面)、other(其他)'
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

      const resume = await this.resumeService.createWithFiles(
        { ...dto, userId: req.user.userId },
        filesArray,
        fileTypes
      );
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
  @ApiOperation({ summary: '更新简历' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(@Param('id') id: string, @Body() updateResumeDto: UpdateResumeDto) {
    try {
      this.logger.log(`更新简历: id=${id}, data=${JSON.stringify(updateResumeDto)}`);
      const resume = await this.resumeService.update(id, updateResumeDto);
      return {
        success: true,
        data: resume,
        message: '更新简历成功'
      };
    } catch (error) {
      this.logger.error(`更新简历失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `更新简历失败: ${error.message}`
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
}