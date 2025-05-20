import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
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
    
    const errorResponse: ApiResponse = {
      success: false,
      message: exception.message,
      error: {
        code: `HTTP_${status}`,
        details: exception.getResponse(),
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