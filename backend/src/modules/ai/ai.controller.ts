import {
  Controller,
  Post,
  Body,
  Get,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';
import { QwenAIService, ParsedResume, ParsedCustomer } from './qwen-ai.service';
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

@ApiTags('AI服务')
@Controller('ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(private readonly qwenAIService: QwenAIService) {}

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
}

