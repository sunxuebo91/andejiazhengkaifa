import { HttpException, HttpStatus } from '@nestjs/common';

export enum CosErrorType {
  INVALID_FILE_ID = 'INVALID_FILE_ID',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class CosException extends HttpException {
  constructor(
    public readonly errorType: CosErrorType,
    public readonly message: string,
    public readonly statusCode: HttpStatus,
    public readonly originalError?: any,
  ) {
    super(
      {
        errorType,
        message,
        statusCode,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}