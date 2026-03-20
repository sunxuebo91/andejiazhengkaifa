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
import type { Request } from 'express';
// 确保在其他导入之前加载环境变量
// 根据NODE_ENV加载对应的.env文件
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.dev';
const envPath = path.join(__dirname, '..', envFile);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ 已加载环境变量文件: ${envFile}`);
} else {
  dotenv.config();
  console.log(`⚠️  未找到${envFile}，使用默认.env文件`);
}

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
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NestLoggerAdapter } from './common/logging/nest-logger.adapter';

// 创建全局 Logger 适配器实例（bootstrap 前后共享同一个实例）
const nestLoggerAdapter = new NestLoggerAdapter();

type RawBodyRequest = Request & { rawBody?: string };

async function bootstrap() {
  try {
    // 将 NestLoggerAdapter 直接作为 logger 传入：
    //   - NestJS 内部会调用 Logger.overrideLogger(nestLoggerAdapter)
    //   - 框架级日志（路由注册、模块初始化、守卫异常等）也会走结构化 JSON
    //   - bufferLogs:true 确保应用完全启动前的日志不会丢失
    const app = await NestFactory.create(AppModule, {
      logger: nestLoggerAdapter,
      bufferLogs: true,
    });

    // 动态 API 不使用 ETag / 304，避免权限变更后浏览器复用陈旧响应。
    app.getHttpAdapter().getInstance().disable('etag');

    // 启用CORS
    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With,Cache-Control,Pragma,If-Modified-Since,If-None-Match',
      credentials: true,
    });

    // 设置API前缀
    app.setGlobalPrefix('api');

    app.use('/api', (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      next();
    });

    // 全局响应转换和错误处理
    // 注意过滤器注册顺序：NestJS 后注册先执行，所以 AllExceptions 先注册作为兜底
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

    // 设置静态资源和文件上传配置
    app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

    // 为支付回调接口配置原始文本解析器（接收XML）- 必须在JSON解析器之前
    app.use('/api/dashubao/payment/callback', express.text({ type: 'application/xml' }));
    app.use('/api/dashubao/payment/callback', express.text({ type: 'text/xml' }));

    // 为需要签名验真的 JSON 回调保留原始请求体
    app.use(express.json({
      limit: '50mb',
      verify: (req: RawBodyRequest, _res, buf) => {
        if (req.originalUrl === '/api/esign/callback') {
          req.rawBody = buf.toString('utf8');
        }
      },
    }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // 启用全局验证
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
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
    const port = process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001);
    await app.listen(port, '0.0.0.0'); // 明确绑定到所有接口
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      context: 'Bootstrap',
      message: 'application.started',
      port,
      env: process.env.NODE_ENV || 'development',
      docsUrl: `http://localhost:${port}/api/docs`,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      context: 'Bootstrap',
      message: 'application.start_failed',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    }));
    process.exit(1);
  }
}

bootstrap();
