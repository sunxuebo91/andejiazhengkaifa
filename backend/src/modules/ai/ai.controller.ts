import {
  Controller,
  Post,
  Body,
  Get,
  Logger,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiProperty, ApiConsumes } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { QwenAIService, ParsedResume, ParsedCustomer } from './qwen-ai.service';
import { UploadService } from '../upload/upload.service';
import { Public } from '../auth/decorators/public.decorator';

// 简历解析请求 DTO
class ParseResumeDto {
  @ApiProperty({ description: '简历文本内容', example: '姓名：张三\n年龄：35...' })
  @IsString()
  @IsNotEmpty({ message: '简历文本不能为空' })
  @MinLength(10, { message: '简历文本至少需要10个字符' })
  @MaxLength(5000, { message: '简历文本不能超过5000字符' })
  text: string;
}

// 客户解析请求 DTO
class ParseCustomerDto {
  @ApiProperty({ description: '客户需求文本', example: '张女士 13812345678 需要育儿嫂...' })
  @IsString()
  @IsNotEmpty({ message: '客户文本不能为空' })
  @MinLength(5, { message: '客户文本至少需要5个字符' })
  @MaxLength(3000, { message: '客户文本不能超过3000字符' })
  text: string;

  @ApiProperty({ description: '渠道来源（如：莲心/犀牛/小红书等）', required: false })
  @IsString()
  @IsOptional()
  channel?: string;
}

const memoryUploadConfig = {
  storage: memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
};

/** 本地模特图片目录 */
const LOCAL_TEMPLATES_DIR = '/home/ubuntu/andejiazhengcrm/千问模型';

@ApiTags('AI服务')
@Controller('ai')
export class AIController implements OnModuleInit {
  private readonly logger = new Logger(AIController.name);
  /** 启动时从本地目录上传到COS后缓存的模板URL列表 */
  private localTemplateCosUrls: string[] = [];

  constructor(
    private readonly qwenAIService: QwenAIService,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {}

  /** 模块初始化：扫描本地模特目录，上传到COS并缓存URL */
  async onModuleInit() {
    try {
      if (!fs.existsSync(LOCAL_TEMPLATES_DIR)) {
        this.logger.warn(`[模板初始化] 目录不存在: ${LOCAL_TEMPLATES_DIR}，将使用环境变量中的模板URL`);
        return;
      }
      const files = fs.readdirSync(LOCAL_TEMPLATES_DIR)
        .filter(f => !f.startsWith('.'))
        .sort();

      if (files.length === 0) {
        this.logger.warn(`[模板初始化] 目录为空: ${LOCAL_TEMPLATES_DIR}`);
        return;
      }

      this.logger.log(`[模板初始化] 发现 ${files.length} 个模特文件，开始上传到COS...`);
      const urls: string[] = [];
      for (const fileName of files) {
        const filePath = path.join(LOCAL_TEMPLATES_DIR, fileName);
        const buffer = fs.readFileSync(filePath);
        const fakeFile = {
          buffer,
          originalname: `template-${fileName}.jpg`,
          mimetype: 'image/jpeg',
          size: buffer.length,
          fieldname: 'templatePhoto',
          encoding: '7bit',
        } as Express.Multer.File;
        const url = await this.uploadService.uploadFile(fakeFile, { type: 'personalPhoto' });
        urls.push(url);
        this.logger.log(`[模板初始化] ${fileName} → ${url.substring(0, 60)}...`);
      }
      this.localTemplateCosUrls = urls;
      this.logger.log(`[模板初始化] 完成，共缓存 ${urls.length} 个模板URL`);
    } catch (err) {
      this.logger.error(`[模板初始化] 失败: ${err.message}，将回退到环境变量配置`);
    }
  }

  /** 获取可用模板URL列表（优先本地目录，回退环境变量） */
  private getTemplateUrls(): string[] {
    if (this.localTemplateCosUrls.length > 0) {
      return this.localTemplateCosUrls;
    }
    const multi = this.configService.get<string>('UNIFORM_TEMPLATE_URLS') || '';
    const single = this.configService.get<string>('UNIFORM_TEMPLATE_URL') || '';
    return multi
      ? multi.split(',').map(u => u.trim()).filter(Boolean)
      : single ? [single.trim()] : [];
  }

  private handleSwapUniformError(scene: 'swap-uniform' | 'swap-uniform-by-url', error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`[${scene}] 生成失败: ${message}`);

    if (message.includes('繁忙') || message.includes('rate') || message.includes('limit') || message.includes('(429)')) {
      throw new HttpException({ success: false, message: 'AI服务繁忙，请稍后几秒再重试' }, HttpStatus.TOO_MANY_REQUESTS);
    }

    if (message.includes('N1N 接口拒绝访问(403)') || message.includes('N1N 接口认证失败(401)')) {
      throw new HttpException({ success: false, message }, HttpStatus.BAD_GATEWAY);
    }

    throw new HttpException({ success: false, message: `生成失败: ${message}` }, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * AI 服务状态
   */
  @Get('status')
  @Public()
  @ApiOperation({ summary: '获取 AI 服务状态' })
  @ApiResponse({ status: 200, description: '返回 AI 服务配置状态' })
  getStatus() {
    return {
      success: true,
      data: this.qwenAIService.getStatus(),
    };
  }

  /**
   * 解析简历文本（小程序专用）
   */
  @Post('parse-resume')
  @Public()
  @ApiOperation({ summary: '🧠 AI解析简历文本 - 小程序专用' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '简历文本内容',
          example: '姓名：张三\n年龄：35\n籍贯：河南\n...',
        },
      },
      required: ['text'],
    },
  })
  @ApiResponse({ status: 200, description: '解析成功，返回结构化数据' })
  async parseResume(@Body() dto: ParseResumeDto): Promise<{
    success: boolean;
    data?: ParsedResume;
    message: string;
  }> {
    this.logger.log(`收到简历解析请求，文本长度: ${dto.text?.length || 0}`);

    // 参数校验
    if (!dto.text || dto.text.trim().length < 10) {
      throw new HttpException(
        {
          success: false,
          message: '请提供有效的简历文本（至少10个字符）',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 文本长度限制
    if (dto.text.length > 5000) {
      throw new HttpException(
        {
          success: false,
          message: '简历文本过长，请控制在5000字以内',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const parsed = await this.qwenAIService.parseResume(dto.text);

      this.logger.log(`简历解析成功: ${parsed.name || '未知'}`);

      return {
        success: true,
        data: parsed,
        message: '解析成功',
      };
    } catch (error) {
      this.logger.error(`简历解析失败: ${error.message}`);

      // 区分不同错误类型
      if (error.message?.includes('未配置')) {
        throw new HttpException(
          {
            success: false,
            message: 'AI 服务未配置，请联系管理员',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        {
          success: false,
          message: `解析失败: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 图片简历解析（粘贴截图识别）
   */
  @Post('parse-resume-image')
  @Public()
  @ApiOperation({ summary: '🧠 AI图片简历解析 - 粘贴截图识别' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', description: '图片base64编码（不含data:前缀）' },
        mimeType: { type: 'string', description: '图片MIME类型', example: 'image/png' },
      },
      required: ['image'],
    },
  })
  @ApiResponse({ status: 200, description: '解析成功，返回结构化数据' })
  async parseResumeImage(@Body() body: { image: string; mimeType?: string }): Promise<{
    success: boolean;
    data?: ParsedResume;
    message: string;
  }> {
    const { image, mimeType } = body;
    if (!image || image.length < 100) {
      throw new HttpException(
        { success: false, message: '请提供有效的图片数据' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 限制图片大小（base64约为原图4/3倍，限20MB原图）
    if (image.length > 27 * 1024 * 1024) {
      throw new HttpException(
        { success: false, message: '图片过大，请控制在20MB以内' },
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`收到图片简历解析请求，base64长度: ${image.length}, mimeType: ${mimeType || 'image/jpeg'}`);

    try {
      const parsed = await this.qwenAIService.parseResumeFromImage(image, mimeType || 'image/jpeg');
      this.logger.log(`图片简历解析成功: ${parsed.name || '未知'}`);
      return { success: true, data: parsed, message: '图片解析成功' };
    } catch (error) {
      this.logger.error(`图片简历解析失败: ${error.message}`);
      if (error.message?.includes('未配置')) {
        throw new HttpException(
          { success: false, message: 'AI 服务未配置，请联系管理员' },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw new HttpException(
        { success: false, message: `图片解析失败: ${error.message}` },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 解析客户需求文本（小程序专用）
   */
  @Post('parse-customer')
  @Public()
  @ApiOperation({ summary: '🧠 AI解析客户需求 - 小程序专用' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '客户需求文本内容',
          example: '张女士 13812345678 抖音来的 需要育儿嫂 预算8000-10000',
        },
        channel: {
          type: 'string',
          description: '渠道来源（如：莲心/犀牛/小红书等），传入后直接用作 leadSource',
          example: '莲心',
        },
      },
      required: ['text'],
    },
  })
  @ApiResponse({ status: 200, description: '解析成功，返回结构化数据' })
  async parseCustomer(@Body() dto: ParseCustomerDto): Promise<{
    success: boolean;
    data?: ParsedCustomer;
    message: string;
  }> {
    this.logger.log(`收到客户解析请求，文本长度: ${dto.text?.length || 0}`);

    if (!dto.text || dto.text.trim().length < 5) {
      throw new HttpException(
        {
          success: false,
          message: '请提供有效的客户需求文本（至少5个字符）',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.text.length > 3000) {
      throw new HttpException(
        {
          success: false,
          message: '客户文本过长，请控制在3000字以内',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const parsed = await this.qwenAIService.parseCustomer(dto.text, dto.channel);

      this.logger.log(`客户解析成功: ${parsed.name || '未知'}`);

      return {
        success: true,
        data: parsed,
        message: '解析成功',
      };
    } catch (error) {
      this.logger.error(`客户解析失败: ${error.message}`);

      if (error.message?.includes('未配置')) {
        throw new HttpException(
          {
            success: false,
            message: 'AI 服务未配置，请联系管理员',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        {
          success: false,
          message: `解析失败: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 仅上传照片到COS，不触发AI换装（用于先上传排序、后手动生成工装的流程）
   */
  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('file', memoryUploadConfig))
  @ApiOperation({ summary: '仅上传照片到COS，不触发AI' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  async uploadPhotoOnly(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传照片文件');
    }
    const photoUrl = await this.uploadService.uploadFile(file, { type: 'personalPhoto' });
    this.logger.log(`[upload-photo] 已上传: ${photoUrl.substring(0, 60)}...`);
    return { success: true, data: { photoUrl }, message: '照片上传成功' };
  }

  /**
   * 立即换装接口：上传个人照片 → 自动生成工装照 → 返回两个URL
   * 用于创建简历时立即预览AI生成效果
   */
  @Post('swap-uniform')
  @UseInterceptors(FileInterceptor('file', memoryUploadConfig))
  @ApiOperation({ summary: '上传个人照片，立即生成工装照（同步返回）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: '个人照片文件' },
      },
      required: ['file'],
    },
  })
  async swapUniform(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传照片文件');
    }

    if (!this.qwenAIService.isUniformSwapConfigured()) {
      throw new HttpException({ success: false, message: 'AI换装服务未配置' }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 1. 获取工装模板URL列表（优先本地目录，回退环境变量）
    const templateUrls = this.getTemplateUrls();

    if (templateUrls.length === 0) {
      throw new HttpException({ success: false, message: '未配置工装模板图片，请联系管理员' }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 2. 上传个人照片到COS
    const personalPhotoUrl = await this.uploadService.uploadFile(file, { type: 'personalPhoto' });
    this.logger.log(`[swap-uniform] 个人照片已上传: ${personalPhotoUrl.substring(0, 60)}...`);

    // 3. 随机选取模板，调用AI换装（同步等待）
    const templateUrl = templateUrls[Math.floor(Math.random() * templateUrls.length)];
    const templateIndex = templateUrls.indexOf(templateUrl) + 1;
    this.logger.log(`[swap-uniform] 共${templateUrls.length}个模板，本次随机使用模板${templateIndex}，开始AI生成...`);

    try {
      const imageBuffer = await this.generateWithFallback(personalPhotoUrl, templateUrl);
      const fakeFile = {
        buffer: imageBuffer,
        originalname: `uniform-photo-${Date.now()}.jpg`,
        mimetype: 'image/jpeg',
        size: imageBuffer.length,
        fieldname: 'uniformPhoto',
        encoding: '7bit',
      } as Express.Multer.File;

      const uniformPhotoUrl = await this.uploadService.uploadFile(fakeFile, { type: 'personalPhoto' });
      this.logger.log(`[swap-uniform] 工装照已生成并上传: ${uniformPhotoUrl.substring(0, 60)}...`);

      return {
        success: true,
        data: { personalPhotoUrl, uniformPhotoUrl },
        message: 'AI工装照生成成功',
      };
    } catch (error) {
      this.handleSwapUniformError('swap-uniform', error);
    }
  }

  /**
   * 通过已有COS URL重新生成工装照（用于"重新生成"按钮，避免浏览器CORS问题）
   */
  @Post('swap-uniform-by-url')
  @ApiOperation({ summary: '通过已有照片URL重新生成工装照' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photoUrl: { type: 'string', description: '已上传到COS的个人照片URL' },
      },
      required: ['photoUrl'],
    },
  })
  async swapUniformByUrl(@Body() body: { photoUrl: string }) {
    const { photoUrl } = body;
    if (!photoUrl) {
      throw new BadRequestException('请提供照片URL');
    }

    if (!this.qwenAIService.isUniformSwapConfigured()) {
      throw new HttpException({ success: false, message: 'AI换装服务未配置' }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 1. 获取工装模板URL列表（优先本地目录，回退环境变量）
    const templateUrls = this.getTemplateUrls();

    if (templateUrls.length === 0) {
      throw new HttpException({ success: false, message: '未配置工装模板图片，请联系管理员' }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 2. 直接使用传入的COS URL（后端服务端下载，无CORS问题）
    this.logger.log(`[swap-uniform-by-url] 使用已有照片URL: ${photoUrl.substring(0, 60)}...`);

    // 3. 随机选取模板，调用AI换装
    const templateUrl = templateUrls[Math.floor(Math.random() * templateUrls.length)];
    const templateIndex = templateUrls.indexOf(templateUrl) + 1;
    this.logger.log(`[swap-uniform-by-url] 共${templateUrls.length}个模板，本次随机使用模板${templateIndex}`);

    try {
      const imageBuffer = await this.generateWithFallback(photoUrl, templateUrl);
      const fakeFile = {
        buffer: imageBuffer,
        originalname: `uniform-photo-${Date.now()}.jpg`,
        mimetype: 'image/jpeg',
        size: imageBuffer.length,
        fieldname: 'uniformPhoto',
        encoding: '7bit',
      } as Express.Multer.File;

      const uniformPhotoUrl = await this.uploadService.uploadFile(fakeFile, { type: 'personalPhoto' });
      this.logger.log(`[swap-uniform-by-url] 工装照已生成并上传: ${uniformPhotoUrl.substring(0, 60)}...`);

      return {
        success: true,
        data: { personalPhotoUrl: photoUrl, uniformPhotoUrl },
        message: 'AI工装照重新生成成功',
      };
    } catch (error) {
      this.handleSwapUniformError('swap-uniform-by-url', error);
    }
  }

  /**
   * AI批量识别并分类简历照片
   */
  @Post('classify-resume-photos')
  @UseInterceptors(FilesInterceptor('files', 20, { storage: memoryStorage() }))
  @ApiOperation({ summary: 'AI批量识别并分类简历照片（个人照片/烹饪/月子餐/辅食等）' })
  @ApiConsumes('multipart/form-data')
  async classifyResumePhotos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { jobType?: string },
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请上传至少一张照片');
    }
    const results = await this.qwenAIService.classifyResumePhotos(files, body.jobType);
    return { success: true, data: results, message: `成功分类 ${files.length} 张照片` };
  }

  /**
   * 统一生成逻辑：优先Seedream，失败回退FaceChain
   */
  private async generateWithFallback(personalPhotoUrl: string, templateUrl: string): Promise<Buffer> {
    if (this.qwenAIService.isSeedreamConfigured()) {
      try {
        this.logger.log('[AI换装] 使用豆包Seedream生成...');
        return await this.qwenAIService.swapHeadWithSeedream(personalPhotoUrl, templateUrl);
      } catch (seedreamErr) {
        this.logger.warn(`[AI换装] Seedream失败(${seedreamErr.message})，尝试FaceChain...`);
        if (this.qwenAIService.isTextAiConfigured()) {
          return await this.qwenAIService.swapHeadToUniform(personalPhotoUrl, templateUrl);
        }
        throw seedreamErr;
      }
    }
    this.logger.log('[AI换装] Seedream未配置，使用FaceChain生成...');
    return await this.qwenAIService.swapHeadToUniform(personalPhotoUrl, templateUrl);
  }
}

