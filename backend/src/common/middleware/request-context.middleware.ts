import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AppLogger } from '../logging/app-logger';
import { RequestContextStore } from '../logging/request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new AppLogger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startedAt = Date.now();
    const requestIdHeader = req.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : (requestIdHeader as string) || randomUUID();

    const realIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';

    res.setHeader('x-request-id', requestId);

    RequestContextStore.run(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        ip: realIp,
        userAgent: req.headers['user-agent'],
      },
      () => {
        this.logger.info('request.start', { query: req.query });

        res.on('finish', () => {
          // Passport/JWT guard usually attaches user on req
          const userId =
            (req as any).user?.userId ||
            (req as any).user?._id?.toString?.() ||
            (req as any).user?.id;

          if (userId) {
            RequestContextStore.set({ userId: String(userId) });
          }

          const durationMs = Date.now() - startedAt;
          const slowThreshold = parseInt(process.env.SLOW_REQUEST_MS || '3000', 10);

          if (durationMs >= slowThreshold) {
            this.logger.warn('request.slow', { statusCode: res.statusCode, durationMs, threshold: slowThreshold });
          } else {
            this.logger.info('request.finish', { statusCode: res.statusCode, durationMs });
          }
        });

        next();
      },
    );
  }
}

