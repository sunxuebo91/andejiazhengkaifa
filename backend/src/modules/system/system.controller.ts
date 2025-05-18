import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SystemService } from './system.service';

@ApiTags('system')
@Controller()
export class SystemController {
  private readonly logger = new Logger(SystemController.name);

  constructor(private readonly systemService: SystemService) {}

  @Post('test')
  @ApiOperation({ summary: '测试接口' })
  @ApiResponse({ status: 200, description: '测试成功' })
  async test(@Body() data: any) {
    this.logger.debug('测试接口被调用');
    return {
      success: true,
      message: '测试成功',
      data: data || {},
      timestamp: new Date().toISOString()
    };
  }

  @Get('status')
  @ApiOperation({ summary: '服务器状态' })
  @ApiResponse({ status: 200, description: '服务器状态信息' })
  async getStatus() {
    this.logger.debug('获取服务器状态');
    return this.systemService.getServerStatus();
  }

  @Get('test-ocr')
  @ApiOperation({ summary: '测试OCR服务' })
  @ApiResponse({ status: 200, description: 'OCR服务状态' })
  async testOcr() {
    this.logger.debug('测试OCR服务');
    return this.systemService.testOCRService();
  }
} 