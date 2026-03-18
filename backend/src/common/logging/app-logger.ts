import { sanitizeLogData } from './log-sanitizer';
import { RequestContextStore } from './request-context';

export interface LogMeta {
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class AppLogger {
  constructor(private readonly context: string) {}

  log(message: string, meta?: LogMeta): void {
    this.write('info', message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this.write('info', message, meta);
  }

  debug(message: string, meta?: LogMeta): void {
    this.write('debug', message, meta);
  }

  warn(message: string, meta?: LogMeta): void {
    this.write('warn', message, meta);
  }

  error(message: string, error?: unknown, meta?: LogMeta): void {
    const mergedMeta = {
      ...meta,
      error: error ? sanitizeLogData(error) : undefined,
    };

    this.write('error', message, mergedMeta);
  }

  child(context: string): AppLogger {
    return new AppLogger(`${this.context}.${context}`);
  }

  private write(level: LogLevel, message: string, meta?: LogMeta): void {
    const ctx = RequestContextStore.get();
    const payload = sanitizeLogData({
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      requestId: ctx?.requestId,
      method: ctx?.method,
      path: ctx?.path,
      userId: ctx?.userId,
      ip: ctx?.ip,
      ...meta,
    });

    const line = JSON.stringify(payload);
    switch (level) {
      case 'debug':
        console.debug(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      case 'error':
        console.error(line);
        break;
      default:
        console.log(line);
        break;
    }
  }
}

