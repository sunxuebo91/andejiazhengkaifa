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
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  // 启用路由日志
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
  
  const configService = app.get(ConfigService);
  console.log('BAIDU_OCR_APP_ID:', configService.get('BAIDU_OCR_APP_ID'));

  // 增加错误处理中间件
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error');
  });

  // 启用CORS以支持前端应用
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5179', 'http://localhost:5180', 'http://localhost:5181', 'http://localhost:5182', 'http://localhost:5183', 'http://localhost:5184', 'http://localhost:5185', 'http://localhost:5186', 'http://localhost:5187', 'http://localhost:5188', 'http://localhost:5189', 'http://localhost:5190', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176', 'http://127.0.0.1:5177', 'http://127.0.0.1:5178', 'http://127.0.0.1:5179', 'http://127.0.0.1:5180', 'http://127.0.0.1:5181', 'http://127.0.0.1:5182', 'http://127.0.0.1:5183', 'http://127.0.0.1:5184', 'http://127.0.0.1:5185', 'http://127.0.0.1:5186', 'http://127.0.0.1:5187', 'http://127.0.0.1:5188', 'http://127.0.0.1:5189', 'http://127.0.0.1:5190', 'http://10.2.24.16:5173', 'http://10.2.24.16:5174', 'http://10.2.24.16:5175', 'http://10.2.24.16:5176', 'http://10.2.24.16:5177', 'http://10.2.24.16:5178', 'http://10.2.24.16:5179', 'http://10.2.24.16:5180', 'http://10.2.24.16:5181', 'http://10.2.24.16:5182', 'http://10.2.24.16:5183', 'http://10.2.24.16:5184', 'http://10.2.24.16:5185', 'http://10.2.24.16:5186', 'http://10.2.24.16:5187', 'http://10.2.24.16:5188', 'http://10.2.24.16:5189', 'http://10.2.24.16:5190'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
    credentials: true,
  });

  // 设置API前缀
  app.setGlobalPrefix('api');

  // 设置全局响应拦截器和异常过滤器
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // 设置静态资源目录和文件上传中间件
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // 自动删除非DTO中定义的属性
    transform: true, // 自动类型转换
  }));

  // 配置Swagger API文档
  const config = new DocumentBuilder()
    .setTitle('安德家政API')
    .setDescription('安德家政系统API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 配置文件上传限制
  app.use((req, res, next) => {
    req.setTimeout(300000); // 5分钟超时
    next();
  });

  const port = process.env.PORT || 3000; // 修改为使用端口3000
  try {
    await app.listen(port, '0.0.0.0');
    console.log(`应用程序正在运行，端口: ${port}`);
  } catch (error) {
    console.error('启动失败:', error.message);
    process.exit(1);
  }
}
bootstrap().catch(err => {
  const errorLogPath = path.join(logDir, 'error.log');
  fs.appendFileSync(errorLogPath, `${new Date().toISOString()} - Application failed to start: ${err.stack}\n`);
  console.error('Application failed to start:', err);
  process.exit(1);
});