import { QueryClient } from '@tanstack/react-query';
import { notifyError } from './utils/notification';

// 防止重复错误提示的时间窗口(毫秒)
const ERROR_DEDUPE_WINDOW = 5000;
let lastErrorTime = 0;
let lastErrorMessage = '';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1分钟内数据不会被标记为过时
      cacheTime: 300000, // 5分钟内未被使用的数据将被从缓存中移除
      retry: 1, // 请求失败时重试一次
      retryDelay: 1000, // 重试间隔1秒
      refetchOnWindowFocus: import.meta.env.PROD, // 生产环境下窗口聚焦时重新获取数据
      refetchOnMount: true, // 组件挂载时重新获取数据
      // 全局错误处理
      onError: (error: Error) => {
        if (import.meta.env.DEV) {
          console.error('查询错误:', error);
        }
        
        // 避免同一错误短时间内重复提示
        const now = Date.now();
        if (
          now - lastErrorTime > ERROR_DEDUPE_WINDOW || 
          lastErrorMessage !== error.message
        ) {
          notifyError(error.message || '数据加载失败，请稍后再试');
          lastErrorTime = now;
          lastErrorMessage = error.message;
        }
      },
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      // 不在这里设置全局错误回调，改为在各个mutation中单独处理
    },
  },
}); 