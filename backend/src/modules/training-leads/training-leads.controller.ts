import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { TrainingLeadsService } from './training-leads.service';
import { CreateTrainingLeadDto } from './dto/create-training-lead.dto';
import { UpdateTrainingLeadDto } from './dto/update-training-lead.dto';
import { TrainingLeadQueryDto } from './dto/training-lead-query.dto';
import { CreateTrainingLeadFollowUpDto } from './dto/create-training-lead-follow-up.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

// Multer配置 - Excel文件上传
const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `training-leads-${uniqueSuffix}.xlsx`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
};

@ApiTags('培训线索管理')
@Controller('training-leads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrainingLeadsController {
  private readonly logger = new Logger(TrainingLeadsController.name);

  constructor(private readonly trainingLeadsService: TrainingLeadsService) {}

  @Post()
  @ApiOperation({ summary: '创建培训线索' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 409, description: '手机号已存在' })
  async create(@Body() createDto: CreateTrainingLeadDto, @Request() req) {
    const lead = await this.trainingLeadsService.create(createDto, req.user.userId);
    return {
      success: true,
      data: lead,
      message: '培训线索创建成功'
    };
  }

  @Post('import-excel')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({ summary: '批量导入培训线索（Excel格式）' })
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
  @ApiResponse({ status: 201, description: '导入成功' })
  @ApiResponse({ status: 400, description: '文件格式错误' })
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('请上传Excel文件');
      }

      this.logger.log(`开始处理培训线索Excel导入，文件名: ${file.originalname}`);
      const importResults = await this.trainingLeadsService.importFromExcel(file.path, req.user.userId);

      return {
        success: true,
        data: importResults,
        message: `成功导入 ${importResults.success} 条培训线索，失败 ${importResults.fail} 条`
      };
    } catch (error) {
      this.logger.error(`培训线索Excel导入失败: ${error.message}`);
      return {
        success: false,
        data: null,
        message: `Excel导入失败: ${error.message}`
      };
    }
  }

  @Get()
  @ApiOperation({ summary: '获取培训线索列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: TrainingLeadQueryDto) {
    const result = await this.trainingLeadsService.findAll(query);
    return {
      success: true,
      data: result,
      message: '获取培训线索列表成功'
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取培训线索详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '线索不存在' })
  async findOne(@Param('id') id: string) {
    const lead = await this.trainingLeadsService.findOne(id);
    return {
      success: true,
      data: lead,
      message: '获取培训线索详情成功'
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新培训线索' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '线索不存在' })
  @ApiResponse({ status: 409, description: '手机号已存在' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateTrainingLeadDto) {
    const lead = await this.trainingLeadsService.update(id, updateDto);
    return {
      success: true,
      data: lead,
      message: '培训线索更新成功'
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除培训线索' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '线索不存在' })
  async remove(@Param('id') id: string) {
    await this.trainingLeadsService.remove(id);
    return {
      success: true,
      message: '培训线索删除成功'
    };
  }

  @Post(':id/follow-ups')
  @ApiOperation({ summary: '添加跟进记录' })
  @ApiResponse({ status: 201, description: '添加成功' })
  @ApiResponse({ status: 404, description: '线索不存在' })
  async createFollowUp(
    @Param('id') id: string,
    @Body() createDto: CreateTrainingLeadFollowUpDto,
    @Request() req
  ) {
    const followUp = await this.trainingLeadsService.createFollowUp(id, createDto, req.user.userId);
    return {
      success: true,
      data: followUp,
      message: '跟进记录添加成功'
    };
  }

  @Get(':id/follow-ups')
  @ApiOperation({ summary: '获取跟进记录列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '线索不存在' })
  async getFollowUps(@Param('id') id: string) {
    const followUps = await this.trainingLeadsService.getFollowUps(id);
    return {
      success: true,
      data: followUps,
      message: '获取跟进记录成功'
    };
  }

  @Post('generate-share-token')
  @ApiOperation({ summary: '生成分享链接和二维码' })
  @ApiResponse({ status: 201, description: '生成成功' })
  async generateShareToken(@Request() req) {
    const result = await this.trainingLeadsService.createShareToken(req.user.userId);
    return {
      success: true,
      data: result,
      message: '分享链接生成成功'
    };
  }

  // ==================== 公开接口（无需登录） ====================

  @Post('public/submit')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公开表单提交（通过分享链接）' })
  @ApiResponse({ status: 200, description: '提交成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async submitPublicForm(
    @Body() body: { token: string; data: CreateTrainingLeadDto }
  ) {
    try {
      // 验证令牌并获取归属用户ID
      const referredByUserId = await this.trainingLeadsService.verifyShareToken(body.token);

      // 创建培训线索，使用归属用户作为创建人，同时设置归属用户
      const lead = await this.trainingLeadsService.create(body.data, referredByUserId, referredByUserId);

      return {
        success: true,
        data: lead,
        message: '提交成功'
      };
    } catch (error: any) {
      this.logger.error(`公开表单提交失败: ${error.message}`);
      throw error;
    }
  }
}

