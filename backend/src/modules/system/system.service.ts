import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import * as process from 'process';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(private readonly configService: ConfigService) {}

  async getServerStatus() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const cpus = os.cpus();
    
    return {
      success: true,
      data: {
        uptime: uptime, // 秒
        memory: {
          free: Math.round(freeMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          used: Math.round((totalMemory - freeMemory) / 1024 / 1024), // MB
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        },
        cpu: {
          cores: cpus.length,
          model: cpus[0].model,
          speed: cpus[0].speed,
        },
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
      },
      timestamp: new Date().toISOString()
    };
  }

  async testOCRService() {
    try {
      const baiduAppId = this.configService.get<string>('BAIDU_APP_ID');
      const baiduApiKey = this.configService.get<string>('BAIDU_API_KEY');
      const baiduSecretKey = this.configService.get<string>('BAIDU_SECRET_KEY');
      
      // 检查配置是否存在
      if (!baiduApiKey || !baiduSecretKey) {
        return {
          success: false,
          message: '百度OCR配置缺失',
          timestamp: new Date().toISOString()
        };
      }
      
      // 获取百度OCR访问令牌
      const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${baiduApiKey}&client_secret=${baiduSecretKey}`;
      
      const response = await axios.get(tokenUrl);
      
      if (response.data && response.data.access_token) {
        return {
          success: true,
          message: 'OCR服务连接正常',
          data: {
            accessToken: response.data.access_token.substring(0, 10) + '...',
            expiresIn: response.data.expires_in,
          },
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          message: '获取OCR访问令牌失败',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      this.logger.error('测试OCR服务失败:', error);
      return {
        success: false,
        message: '测试OCR服务失败: ' + error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
} 