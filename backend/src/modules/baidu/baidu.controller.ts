import { Controller, Get, Query, HttpException } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Controller('baidu/place')
export class BaiduController {
  constructor(private configService: ConfigService) {}

  @Get('suggestion')
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
