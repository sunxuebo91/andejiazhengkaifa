import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('test-api')
export class TestController {
  @Get('health')
  async testHealth() {
    return {
      success: true,
      message: '测试控制器正常',
      timestamp: new Date().toISOString()
    };
  }

  @Post('create-contract')
  async testCreateContract(@Body() data: any) {
    return {
      success: true,
      message: '测试合同创建成功',
      data: data,
      timestamp: new Date().toISOString()
    };
  }
} 