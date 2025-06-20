import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ESignService } from './esign.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// 预览请求DTO
interface PreviewRequestDto {
  templateId: string;
  formData: Record<string, any>;
}

@Controller('esign')
// @UseGuards(JwtAuthGuard) // Temporarily disabled for testing
export class ESignController {
  private readonly logger = new Logger(ESignController.name);
  
  constructor(private readonly esignService: ESignService) {
    this.logger.log('ESignController 已初始化');
  }

  /**
   * 获取调试配置信息 - 移到顶部测试
   */
  @Get('debug-config')
  async getDebugConfig() {
    this.logger.log('调用 debug-config 端点');
    try {
      const config = this.esignService.getDebugConfig();
      
      return {
        success: true,
        data: config,
        message: '获取配置信息成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取配置信息失败',
      };
    }
  }

  /**
   * 获取调试配置信息 - 复制版本用于测试
   */
  @Get('debug-config-copy')
  async getDebugConfigCopy() {
    this.logger.log('调用 debug-config-copy 端点');
    try {
      const config = this.esignService.getDebugConfig();
      
      return {
        success: true,
        data: config,
        message: '获取配置信息成功 (复制版本)',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取配置信息失败',
      };
    }
  }

  /**
   * 简单测试端点
   */
  @Get('test')
  async simpleTest() {
    this.logger.log('调用 test 端点');
    return {
      success: true,
      message: '测试端点工作正常',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 测试爱签连接
   */
  @Get('test-connection')
  async testConnection() {
    this.logger.log('调用 test-connection 端点');
    
    try {
      const result = await this.esignService.testConnection();
      
      return {
        success: result.success,
        data: result,
        message: result.message,
      };
    } catch (error) {
      this.logger.error('爱签连接测试失败', error.stack);
      
      return {
        success: false,
        message: error.message || '连接测试失败',
      };
    }
  }

  /**
   * 获取模板控件信息（用于前端动态表单生成）
   */
  @Get('templates/:templateId/components')
  async getTemplateComponents(@Param('templateId') templateId: string) {
    this.logger.log(`调用 templates/${templateId}/components 端点`);
    
    try {
      const result = await this.esignService.getTemplateComponents(templateId);
      
      return {
        success: true,
        data: result.data,
        message: '获取模板控件信息成功',
      };
    } catch (error) {
      this.logger.error(`获取模板控件信息失败: ${templateId}`, error.stack);
      
      return {
        success: false,
        message: error.message || '获取模板控件信息失败',
      };
    }
  }

  /**
   * 生成模板预览
   */
  @Post('templates/preview')
  async generatePreview(@Body() previewRequest: PreviewRequestDto) {
    this.logger.log(`调用 templates/preview 端点`);
    
    try {
      if (!previewRequest.templateId) {
        throw new BadRequestException('模板ID不能为空');
      }

      const result = await this.esignService.generateTemplatePreview(
        previewRequest.templateId,
        previewRequest.formData || {}
      );

      return {
        success: true,
        data: {
          previewUrl: result.data.previewUrl,
          previewId: result.data.previewId
        },
        message: '生成预览成功',
      };
    } catch (error) {
      this.logger.error(`生成模板预览失败: ${previewRequest.templateId}`, error.stack);
      
      return {
        success: false,
        message: error.message || '生成预览失败',
      };
    }
  }

  /**
   * 获取模板控件信息 - 调用真实的爱签API
   */
  @Post('template/data')
  async getTemplateData(@Body() body: { templateIdent: string }) {
    this.logger.log(`调用 template/data 端点，模板标识: ${body.templateIdent}`);
    
    try {
      if (!body.templateIdent) {
        throw new BadRequestException('模板标识不能为空');
      }

      const result = await this.esignService.getTemplateData(body.templateIdent);
      
      return {
        code: 100000,
        data: result, // 直接返回result，而不是result.data
        msg: '成功'
      };
    } catch (error) {
      this.logger.error(`获取模板控件信息失败: ${body.templateIdent}`, error.stack);
      
      return {
        code: 500,
        data: null,
        msg: error.message || '获取模板控件信息失败'
      };
    }
  }

  /**
   * 创建完整的签署流程
   */
  @Post('contracts/create-with-template')
  async createContractWithTemplate(@Body() contractData: any) {
    this.logger.log(`调用 contracts/create-with-template 端点`);
    
    try {
      const result = await this.esignService.createContractWithTemplate(contractData);
      
      return {
        success: true,
        data: result,
        message: '创建合同成功',
      };
    } catch (error) {
      this.logger.error(`创建合同失败: ${contractData.templateId}`, error.stack);
      
      return {
        success: false,
        message: error.message || '创建合同失败',
      };
    }
  }
} 