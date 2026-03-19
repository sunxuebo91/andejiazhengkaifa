import { sanitizeLogData } from './log-sanitizer';
import { RequestContextStore } from './request-context';

export interface LogMeta {
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 日志级别权重，用于过滤低于配置级别的日志
const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 模块加载时读取一次并缓存，避免每次 write() 都重读 process.env
// 支持运行时通过 AppLogger.setLevel() 动态调整（测试/热重载场景）
let configuredLevelWeight: number = (() => {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
  return LOG_LEVEL_WEIGHT[raw] ?? LOG_LEVEL_WEIGHT['info'];
})();

export class AppLogger {
  constructor(private readonly context: string) {}

  /** 运行时动态调整日志级别（测试 / 热重载场景使用） */
  static setLevel(level: LogLevel): void {
    configuredLevelWeight = LOG_LEVEL_WEIGHT[level] ?? LOG_LEVEL_WEIGHT['info'];
  }

  log(message: string, meta?: LogMeta): void {
    this.write('info', message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this.write('info', message, meta);
  }

  debug(message: string, meta?: LogMeta): void {
    this.write('debug', message, meta);
  }

  // NestJS Logger 兼容：verbose 映射到 debug
  verbose(message: string, meta?: LogMeta): void {
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
    // 低于配置级别的日志直接丢弃（使用预缓存的 weight，零 env 读开销）
    if (LOG_LEVEL_WEIGHT[level] < configuredLevelWeight) {
      return;
    }

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

