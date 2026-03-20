import { Controller, Get, Query, HttpException } from '@nestjs/common';
import { AppLogger } from '../../common/logging/app-logger';

@Controller('baidu/place')
export class BaiduController {
  private readonly logger = new AppLogger(BaiduController.name);

  @Get('suggestion')
  async getPlaceSuggestion(
    @Query('query') query: string,
    @Query('region') region?: string,
    @Query('city_limit') cityLimit?: string,
    @Query('output') output?: string,
  ) {
    if (!query) {
      throw new HttpException('缺少必要参数: query', 400);
    }

    this.logger.warn('百度地图地点建议接口已停用', {
      query,
      region,
      cityLimit,
      output,
    });
    throw new HttpException('百度地图功能已停用', 503);
  }
}
