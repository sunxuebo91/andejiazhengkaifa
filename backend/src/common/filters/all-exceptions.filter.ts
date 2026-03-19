import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../logging/app-logger';
import { RequestContextStore } from '../logging/request-context';

/**
 * AllExceptionsFilter — 全局兜底异常过滤器
 *
 * 捕获所有未被 HttpExceptionFilter / CosExceptionFilter 处理的非预期错误
 * （数据库错误、TypeError、ReferenceError 等），统一以结构化 JSON 输出，
 * 避免框架默认行为直接暴露错误堆栈给客户端。
 *
 * 注册顺序：必须排在 HttpExceptionFilter 之前（NestJS 过滤器后注册先执行），
 * 或者直接使用 @Catch() 装饰器（不指定类型）作为最终兜底。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new AppLogger('UnhandledException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 如果是 HttpException，让上层 HttpExceptionFilter 处理
    // 但如果没注册 HttpExceptionFilter，这里也能兜底
    let status = 500;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message || '服务器内部错误';
    }

    // 500 级别以结构化 error 级别记录，包含完整堆栈
    this.logger.error('unhandled.exception', exception, {
      status,
      method: request?.method,
      url: request?.url,
    });

    // 生产环境不暴露内部错误细节给客户端
    const isProduction = process.env.NODE_ENV === 'production';

    response.status(status).json({
      success: false,
      message: isProduction && status === 500 ? '服务器内部错误' : message,
      requestId: RequestContextStore.getValue('requestId'),
      error: {
        code: `HTTP_${status}`,
      },
      timestamp: Date.now(),
    });
  }
}

