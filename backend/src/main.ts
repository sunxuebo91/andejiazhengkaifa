// 确保crypto模块在全局可用，解决@nestjs/schedule的crypto依赖问题
import * as crypto from 'crypto';
// 兼容新版本Node.js，只在crypto不存在时设置
if (!(global as any).crypto) {
  try {
    (global as any).crypto = crypto;
  } catch (error) {
    // 忽略在新版本Node.js中的只读错误
    console.log('Crypto already available globally');
  }
}

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
// 确保在其他导入之前加载环境变量
dotenv.config();

// 配置日志目录
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
    });

    // 启用CORS
    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With,Cache-Control,Pragma,If-Modified-Since,If-None-Match',
      credentials: true,
    });

    // 设置API前缀
    app.setGlobalPrefix('api');

    // 全局响应转换和错误处理
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    // 设置静态资源和文件上传配置
    app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // 启用全局验证
    // 临时放宽验证规则进行调试
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false, // 临时设为false
      skipMissingProperties: true,  // 跳过缺失属性
      disableErrorMessages: false, // 显示详细错误信息
    }));

    // 配置Swagger文档
    const config = new DocumentBuilder()
      .setTitle('安得家政CRM API')
      .setDescription('家政服务管理系统API文档')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // 启动服务器
    const port = process.env.NODE_ENV === 'production' ? 3000 : 3001;
    await app.listen(port);
    console.log(`应用已启动，监听端口：${port}，环境：${process.env.NODE_ENV || 'development'}`);
    console.log(`API文档地址：http://localhost:${port}/api/docs`);
  } catch (error) {
    console.error('应用启动失败:', error);
    process.exit(1);
  }
}

bootstrap();