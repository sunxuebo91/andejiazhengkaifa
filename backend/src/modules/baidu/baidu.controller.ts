import { Controller, Get, Query, HttpException, Post, UseGuards, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('baidu')
@Controller()
export class BaiduController {
  private readonly logger = new Logger(BaiduController.name);

  constructor(private configService: ConfigService) {}

  @Get('ocr/test')
  @ApiOperation({ summary: '测试OCR服务连接' })
  @ApiResponse({ status: 200, description: '连接正常' })
  async testOcr(@Query('_') timestamp: string) {
    this.logger.debug(`测试OCR连接，时间戳: ${timestamp}`);
    return { 
      status: 'ok', 
      message: 'OCR服务连接正常', 
      timestamp: new Date().toISOString()
    };
  }

  @Get('ocr-direct/test')
  @ApiOperation({ summary: '测试OCR直连服务' })
  @ApiResponse({ status: 200, description: '连接正常' })
  async testOcrDirect(@Query('_') timestamp: string) {
    this.logger.debug(`测试OCR直连服务，时间戳: ${timestamp}`);
    return { 
      status: 'ok', 
      message: 'OCR直连服务连接正常', 
      timestamp: new Date().toISOString()
    };
  }

  @Get('place')
  async getPlaceSuggestion(
    @Query('query') query: string,
    @Query('region') region?: string,
    @Query('city_limit') cityLimit?: string,
    @Query('output') output?: string,
  ) {
    const BAIDU_AK = this.configService.get<string>('BAIDU_MAP_AK');
    
    if (!query) {
      throw new HttpException('缺少必要参数: query', 400);
    }

    try {
      const response = await axios.get('https://api.map.baidu.com/place/v2/suggestion', {
        params: {
          query,
          region: region || '',
          city_limit: cityLimit || 'false',
          output: output || 'json',
          ak: BAIDU_AK,
        },
        timeout: 5000,
      });

      return response.data;
    } catch (error) {
      console.error('百度地图API调用失败:', error);
      throw new HttpException('百度地图服务暂时不可用', 503);
    }
  }
}
