import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    // 获取异常状态码和消息
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    
    const message = 
      exception instanceof HttpException
        ? exception.message
        : '服务器内部错误';
    
    const exceptionResponse = 
      exception instanceof HttpException
        ? exception.getResponse()
        : { message };
    
    // 构建返回的错误对象
    const responseBody = {
      code: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof exceptionResponse === 'object' && 'message' in exceptionResponse 
        ? (exceptionResponse as any).message 
        : message,
      success: false,
      data: null,
    };
    
    // 记录错误日志
    this.logger.error(
      `${request.method} ${request.url} ${status} - ${JSON.stringify(responseBody.message)}`
    );
    
    if (!(exception instanceof HttpException)) {
      this.logger.error(exception.stack);
    }
    
    // 发送响应
    response.status(status).json(responseBody);
  }
} 