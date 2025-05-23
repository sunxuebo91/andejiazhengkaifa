import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFiles, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ResumeService } from './resume.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { ResumeEntity } from './models/resume.entity';
import { Logger } from '@nestjs/common';

@ApiTags('简历管理')
@Controller('resumes')
export class ResumeController {
  private readonly logger = new Logger(ResumeController.name);

  constructor(private readonly resumeService: ResumeService) {}

  @Post()
  @ApiOperation({ summary: '创建新简历' })
  @ApiResponse({ status: 201, description: '简历创建成功', type: ResumeEntity })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async create(@Body() createResumeDto: CreateResumeDto): Promise<{ success: boolean; data: any; message?: string }> {
    this.logger.log(`创建新简历: ${JSON.stringify(createResumeDto)}`);
    try {
      const resume = await this.resumeService.create(createResumeDto);
      return {
        success: true,
        data: resume,
        message: '简历创建成功'
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
  @ApiResponse({ status: 200, description: '获取成功', type: [ResumeEntity] })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ): Promise<{ success: boolean; data: { items: any[]; total: number }; message?: string }> {
    this.logger.log(`获取简历列表: page=${page}, pageSize=${pageSize}, search=${search}`);
    try {
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
  @ApiOperation({ summary: '获取单个简历详情' })
  @ApiResponse({ status: 200, description: '获取成功', type: ResumeEntity })
  @ApiResponse({ status: 404, description: '简历不存在' })
  async findOne(@Param('id') id: string): Promise<{ success: boolean; data: any; message?: string }> {
    this.logger.log(`获取简历详情: id=${id}`);
    try {
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
  @ApiOperation({ summary: '更新简历信息' })
  @ApiResponse({ status: 200, description: '更新成功', type: ResumeEntity })
  @ApiResponse({ status: 404, description: '简历不存在' })
  async update(
    @Param('id') id: string,
    @Body() updateResumeDto: UpdateResumeDto,
  ): Promise<{ success: boolean; data: any; message?: string }> {
    this.logger.log(`更新简历: id=${id}, data=${JSON.stringify(updateResumeDto)}`);
    try {
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
  @ApiResponse({ status: 404, description: '简历不存在' })
  async remove(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`删除简历: id=${id}`);
    try {
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

  @Post(':id/upload')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: '上传简历相关文件' })
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
        type: {
          type: 'string',
          enum: ['photo', 'certificate', 'medical'],
          description: '文件类型：照片、证书、体检报告',
        },
      },
    },
  })
  async uploadFiles(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('type') type: 'photo' | 'certificate' | 'medical',
  ): Promise<{ success: boolean; data?: { urls: string[] }; message: string }> {
    this.logger.log(`上传文件: id=${id}, type=${type}, files=${files.length}`);
    try {
      // TODO: 实现文件上传逻辑
      const urls = files.map(file => `/uploads/${file.filename}`);
      return {
        success: true,
        data: { urls },
        message: '文件上传成功'
      };
    } catch (error) {
      this.logger.error(`文件上传失败: ${error.message}`);
      return {
        success: false,
        message: `文件上传失败: ${error.message}`
      };
    }
  }
}