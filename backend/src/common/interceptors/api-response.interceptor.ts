import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RequestContextStore } from '../logging/request-context';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId =
      request?.user?.userId ||
      request?.user?._id?.toString?.() ||
      request?.user?.id;

    if (userId) {
      RequestContextStore.set({ userId: String(userId) });
    }

    return next.handle().pipe(
      map(data => {
        // 如果数据已经是标准格式，直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        
        // 否则包装成标准格式
        return {
          success: true,
          data,
          requestId: RequestContextStore.getValue('requestId'),
          timestamp: Date.now()
        };
      })
    );
  }
}
