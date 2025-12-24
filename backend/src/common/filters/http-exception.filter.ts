import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // 获取异常响应内容
    const exceptionResponse = exception.getResponse();

    // 提取有意义的错误消息
    let errorMessage = exception.message;
    let errorDetails: any = exceptionResponse;

    // 处理 ValidationPipe 抛出的验证错误
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;

      // 如果是验证错误，message 数组包含具体的错误信息
      if (Array.isArray(responseObj.message)) {
        // 将所有验证错误拼接成一个字符串
        errorMessage = responseObj.message.join('; ');
      } else if (typeof responseObj.message === 'string' && responseObj.message !== 'Bad Request') {
        // 如果有具体的错误消息，使用它
        errorMessage = responseObj.message;
      }

      // 保存详细信息用于调试
      errorDetails = responseObj;
    }

    const errorResponse: ApiResponse = {
      success: false,
      message: errorMessage,
      error: {
        code: `HTTP_${status}`,
        details: errorDetails,
      },
      timestamp: Date.now(),
    };

    this.logger.error(`${request.method} ${request.url} ${status}`, {
      errorResponse,
      stack: exception.stack,
    });

    response.status(status).json(errorResponse);
  }
}