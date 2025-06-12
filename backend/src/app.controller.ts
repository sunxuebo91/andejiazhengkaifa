import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { ResumeService } from './modules/resume/resume.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly resumeService: ResumeService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: '后端服务正常运行'
    };
  }

  @Get('test-worker-search')
  async testWorkerSearch(
    @Query('phone') phone?: string,
  ) {
    try {
      const workers = await this.resumeService.searchWorkers(phone);
      return {
        success: true,
        data: workers,
        message: '测试成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
} 