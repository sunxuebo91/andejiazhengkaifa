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
  Res,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as ExcelJS from 'exceljs';
import { TrainingLeadsService } from './training-leads.service';
import { CreateTrainingLeadDto } from './dto/create-training-lead.dto';
import { UpdateTrainingLeadDto } from './dto/update-training-lead.dto';
import { TrainingLeadQueryDto } from './dto/training-lead-query.dto';
import { CreateTrainingLeadFollowUpDto } from './dto/create-training-lead-follow-up.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { QwenAIService, ParsedTrainingLead } from '../ai/qwen-ai.service';

// Multer配置 - Excel文件上传
const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `training-leads-${uniqueSuffix}.xlsx`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
};

// Multer配置 - 图片上传（AI识别）
const imageUploadConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = file.originalname.split('.').pop() || 'jpg';
      cb(null, `leads-img-${uniqueSuffix}.${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
};

@ApiTags('培训线索管理')
@Controller('training-leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TrainingLeadsController {
  private readonly logger = new Logger(TrainingLeadsController.name);

  constructor(
    private readonly trainingLeadsService: TrainingLeadsService,
    private readonly qwenAIService: QwenAIService,
  ) {}

  // 检查是否是管理员或经理（有全局查看权限的角色：admin/manager/operator/admissions）
  // dispatch/employee 只能查看自己创建的线索
  private isManagerOrAdmin(user: any): boolean {
    return ['系统管理员', 'admin', '经理', 'manager', 'operator'].includes(user?.role);
  }

  @Post()
  @Permissions('training-lead:create')
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
  @Permissions('training-lead:create')
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

  // ==================== 标准模板下载 + 智能Excel导入 ====================

  /** 列名 → 系统字段 模糊匹配映射表 */
  private static readonly COLUMN_ALIAS_MAP: Record<string, string[]> = {
    name:            ['姓名', '名字', '学员姓名', 'name'],
    gender:          ['性别', 'gender', 'sex'],
    age:             ['年龄', 'age'],
    phone:           ['手机号', '手机', '电话', '联系电话', '联系方式', 'phone', 'tel', 'mobile'],
    wechatId:        ['微信号', '微信', 'wechat', 'wx'],
    leadSource:      ['渠道来源', '线索来源', '来源', '渠道', 'source'],
    trainingType:    ['培训类型', '性质', '类型', 'type'],
    consultPosition: ['咨询职位', '职位', 'position'],
    intendedCourses: ['意向课程', '课程', 'courses'],
    intentionLevel:  ['意向程度', '意向', '类别', 'intention'],
    leadGrade:       ['线索等级', '等级', 'grade'],
    address:         ['所在地区', '地区', '地址', '城市', 'address', 'city'],
    budget:          ['预算金额', '预算', 'budget'],
    remarks:         ['备注', '备注信息', 'remark', 'remarks', 'note'],
    followUpPerson:  ['跟进人', '录入人', '发起人', '负责人', '创建人'],
    followUpContent: ['跟进内容', '跟进记录', '沟通内容'],
    followUpType:    ['跟进方式', '沟通方式'],
    followUpTime:    ['跟进时间', '沟通时间'],
  };

  /** 提取单元格文本值 */
  private getCellText(cell: any): string {
    const val = cell?.value;
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return String(val);
    if (val instanceof Date) return val.toLocaleDateString('zh-CN');
    if (typeof val === 'object') {
      if ('result' in val) return String(val.result ?? '').trim();
      if ('text' in val) return String(val.text ?? '').trim();
      if ('richText' in val && Array.isArray(val.richText)) {
        return val.richText.map((r: any) => r.text || '').join('').trim();
      }
    }
    return String(val).trim();
  }

  /** 根据列名模糊匹配系统字段 */
  private matchField(header: string): string | null {
    const h = header.trim().toLowerCase();
    for (const [field, aliases] of Object.entries(TrainingLeadsController.COLUMN_ALIAS_MAP)) {
      if (aliases.some(a => a.toLowerCase() === h)) return field;
    }
    // 模糊包含匹配
    for (const [field, aliases] of Object.entries(TrainingLeadsController.COLUMN_ALIAS_MAP)) {
      if (aliases.some(a => h.includes(a.toLowerCase()) || a.toLowerCase().includes(h))) return field;
    }
    return null;
  }

  /** 模板下载已移到前端生成，后端不再提供此接口 */

  @Post('check-duplicates')
  @Permissions('training-lead:create')
  @ApiOperation({ summary: '批量查重手机号（前端解析Excel后调用）' })
  async checkDuplicates(@Body() body: { phones: string[] }) {
    const phones = (body.phones || []).filter(Boolean);
    if (phones.length === 0) return { success: true, data: { duplicatePhones: [] } };
    try {
      const existingLeads = await this.trainingLeadsService.findByPhones(phones);
      const duplicatePhones = existingLeads.map((l: any) => l.phone);
      return { success: true, data: { duplicatePhones } };
    } catch (error: any) {
      this.logger.error(`查重失败: ${error.message}`);
      return { success: false, data: { duplicatePhones: [] }, message: error.message };
    }
  }

  // ==================== AI 批量导入 ====================

  @Post('ai-preview-image')
  @Permissions('training-lead:create')
  @UseInterceptors(FileInterceptor('file', imageUploadConfig))
  @ApiOperation({ summary: 'AI识别图片中的职培线索（返回预览，不写入数据库）' })
  @ApiConsumes('multipart/form-data')
  async aiPreviewImage(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) throw new BadRequestException('请上传图片文件');
    try {
      const fs = await import('fs');
      const imageBuffer = fs.readFileSync(file.path);
      const imageBase64 = imageBuffer.toString('base64');
      const mimeType = file.mimetype || 'image/jpeg';
      const leads = await this.qwenAIService.parseTrainingLeadsFromImage(imageBase64, mimeType);
      fs.unlinkSync(file.path);
      return { success: true, data: leads, message: `AI识别到 ${leads.length} 条线索` };
    } catch (error) {
      this.logger.error(`AI图片识别失败: ${error.message}`);
      return { success: false, data: [], message: `识别失败: ${error.message}` };
    }
  }

  @Post('ai-preview-excel')
  @Permissions('training-lead:create')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({ summary: 'AI识别Excel中的职培线索（自动映射字段，返回预览，不写入数据库）' })
  @ApiConsumes('multipart/form-data')
  async aiPreviewExcel(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) throw new BadRequestException('请上传Excel文件');
    const fs = await import('fs');
    try {
      // 使用流式读取，避免将整个 Excel 载入内存（防止内存爆炸）
      const MAX_ROWS = 200;
      const rows: string[] = [];
      let rowIdx = 0;

      const StreamReader = (ExcelJS as any).stream?.xlsx?.WorkbookReader;
      if (!StreamReader) throw new Error('ExcelJS 流式读取不可用');

      const workbookReader = new StreamReader(file.path, { sharedStrings: 'cache', hyperlinks: 'ignore', worksheets: 'emit', entries: 'emit' });

      await new Promise<void>((resolve, reject) => {
        let firstSheet = false;
        workbookReader.on('worksheet', (worksheet: any) => {
          if (firstSheet) return; // 只处理第一个 sheet
          firstSheet = true;
          worksheet.on('row', (row: any) => {
            if (rowIdx >= MAX_ROWS) return;
            const vals: any[] = row.values ?? [];
            // row.values 是 1-indexed，index 0 为 null
            const cells: string[] = [];
            for (let i = 1; i < vals.length; i++) {
              cells.push(this.serializeRawValue(vals[i]));
            }
            if (cells.some(c => c.length > 0)) {
              rows.push(cells.join('\t'));
            }
            rowIdx++;
          });
          worksheet.on('end', resolve);
          worksheet.on('error', reject);
        });
        workbookReader.on('end', resolve);
        workbookReader.on('error', reject);
        workbookReader.read();
      });

      if (rows.length === 0) throw new BadRequestException('Excel文件中没有有效数据');

      // 限制总文本长度，防止超出 AI 上下文
      let tableText = rows.join('\n');
      if (tableText.length > 10000) {
        tableText = tableText.slice(0, 10000);
        this.logger.warn(`Excel 文本过长，已截断至 10000 字符`);
      }

      this.logger.log(`Excel 流式读取完成，共 ${rows.length} 行，文本长度 ${tableText.length}`);
      const leads = await this.qwenAIService.parseTrainingLeadsFromExcelText(tableText);
      return { success: true, data: leads, message: `AI识别到 ${leads.length} 条线索` };
    } catch (error) {
      this.logger.error(`AI Excel识别失败: ${error?.message || error}`);
      return { success: false, data: [], message: `识别失败: ${error?.message || '未知错误'}` };
    } finally {
      try { fs.unlinkSync(file.path); } catch (_) {}
    }
  }

  /** 将流式读取的原始单元格值安全序列化为字符串 */
  private serializeRawValue(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return String(val);
    if (val instanceof Date) return val.toLocaleDateString('zh-CN');
    if (typeof val === 'object') {
      if ('result' in val) {
        const res = val.result;
        if (res === null || res === undefined) return '';
        if (typeof res === 'object' && 'error' in res) return '';
        if (res instanceof Date) return res.toLocaleDateString('zh-CN');
        return String(res);
      }
      if ('richText' in val) {
        return (val.richText as any[]).map((r: any) => r.text ?? '').join('').trim();
      }
      if ('error' in val) return '';
      if ('text' in val) return String(val.text).trim();
    }
    return String(val);
  }

  @Post('bulk-create')
  @Permissions('training-lead:create')
  @ApiOperation({ summary: '批量创建职培线索（确认AI预览后调用）' })
  async bulkCreate(@Body() body: { leads: ParsedTrainingLead[] }, @Request() req) {
    if (!body.leads || !Array.isArray(body.leads) || body.leads.length === 0) {
      throw new BadRequestException('请提供有效的线索数据');
    }
    const result = await this.trainingLeadsService.bulkCreateLeads(body.leads as any[], req.user.userId);
    return {
      success: true,
      data: result,
      message: `成功创建 ${result.success} 条线索，失败 ${result.fail} 条`
    };
  }

  @Get()
  @Permissions('training-lead:view')
  @ApiOperation({ summary: '获取培训线索列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: TrainingLeadQueryDto, @Request() req) {
    const user = req?.user;
    // 管理员和经理可以看到所有线索，普通员工只能看自己创建的
    if (!this.isManagerOrAdmin(user)) {
      query.createdBy = user?.userId;
    }
    const result = await this.trainingLeadsService.findAll(query);
    return {
      success: true,
      data: result,
      message: '获取培训线索列表成功'
    };
  }

  @Get(':id')
  @Permissions('training-lead:view')
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
  @Permissions('training-lead:edit')
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
  @Permissions('training-lead:delete')
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
  @Permissions('training-lead:edit')
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
  @Permissions('training-lead:view')
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
  @Permissions('training-lead:create')
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

