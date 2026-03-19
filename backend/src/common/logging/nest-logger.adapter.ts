import { LoggerService } from '@nestjs/common';
import { AppLogger } from './app-logger';

/**
 * NestLoggerAdapter
 *
 * 实现 NestJS LoggerService 接口，内部委托给 AppLogger。
 * 通过 Logger.overrideLogger(new NestLoggerAdapter()) 注册后，
 * 全项目所有 `new Logger(context)` 实例会自动走结构化 JSON 输出，
 * 无需逐个修改模块代码。
 *
 * NestJS Logger.error(message, trace?, context?) 中：
 *   - trace 通常为 error.stack 字符串，直接作为 error 参数传给 AppLogger
 *   - context 覆盖当前实例的 context
 */
export class NestLoggerAdapter implements LoggerService {
  // 按 context 名称缓存 AppLogger 实例，避免重复创建
  private readonly loggers = new Map<string, AppLogger>();

  private getLogger(context?: string): AppLogger {
    const key = context || 'NestJS';
    if (!this.loggers.has(key)) {
      this.loggers.set(key, new AppLogger(key));
    }
    return this.loggers.get(key)!;
  }

  /**
   * 从 NestJS 可选参数里提取 context 字符串。
   * NestJS 约定：最后一个字符串参数为 context。
   */
  private extractContext(optionalParams: any[]): string | undefined {
    for (let i = optionalParams.length - 1; i >= 0; i--) {
      if (typeof optionalParams[i] === 'string') {
        return optionalParams[i];
      }
    }
    return undefined;
  }

  log(message: any, ...optionalParams: any[]): void {
    const context = this.extractContext(optionalParams);
    this.getLogger(context).info(String(message));
  }

  error(message: any, ...optionalParams: any[]): void {
    // optionalParams[0] 通常为 trace (string) 或 error 对象，[1] 为 context
    const [traceOrError, contextArg] = optionalParams;
    const context =
      typeof contextArg === 'string'
        ? contextArg
        : typeof traceOrError === 'string' && optionalParams.length > 1
          ? undefined
          : this.extractContext(optionalParams);

    this.getLogger(context).error(String(message), traceOrError);
  }

  warn(message: any, ...optionalParams: any[]): void {
    const context = this.extractContext(optionalParams);
    this.getLogger(context).warn(String(message));
  }

  debug(message: any, ...optionalParams: any[]): void {
    const context = this.extractContext(optionalParams);
    this.getLogger(context).debug(String(message));
  }

  verbose(message: any, ...optionalParams: any[]): void {
    const context = this.extractContext(optionalParams);
    this.getLogger(context).verbose(String(message));
  }
}

