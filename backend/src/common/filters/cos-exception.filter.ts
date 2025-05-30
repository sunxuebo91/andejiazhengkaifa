import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

export enum CosErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
}

export class CosException extends HttpException {
  public readonly type: CosErrorType;
  public readonly cause: any;

  constructor(
    type: CosErrorType,
    status: HttpStatus,
    message: string,
    cause?: any,
  ) {
    super(
      {
        type,
        message,
        cause: cause?.message || cause,
      },
      status,
    );
    this.type = type;
    this.cause = cause;
  }
}

@Catch(CosException)
export class CosExceptionFilter implements ExceptionFilter {
  catch(exception: CosException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      type: exception.type,
      message: exception.message,
      cause: exception.cause,
    });
  }
} 