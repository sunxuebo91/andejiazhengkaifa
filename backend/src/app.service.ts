import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '安得家政CRM开发API服务已启动';
  }
} 