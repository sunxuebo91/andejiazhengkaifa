import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getToken, removeToken } from './auth';

// API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// 创建axios实例
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 添加错误响应类型定义
interface ErrorResponseData {
  message?: string;
  error?: {
    code: string;
    details?: any;
  };
  [key: string]: any;
}

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 直接返回数据部分
    return response.data;
  },
  (error: AxiosError<ErrorResponseData>) => {
    if (error.response) {
      // 服务器返回错误
      const { status, data, config } = error.response;
      
      // 处理401未授权错误 - 清除token并重定向到登录页
      if (status === 401) {
        console.error('认证失败，请重新登录');
        // 清除token
        removeToken();
        // 使用window.location.href进行硬重定向，确保完全刷新页面状态
        window.location.href = '/login';
        return Promise.reject(new Error('认证失败，请重新登录'));
      }
      
      // 增强错误日志
      console.groupCollapsed(`请求错误: ${status} - ${config?.url}`);
      console.error('请求配置:', config);
      console.error('响应数据:', data);
      if (status === 400 && data) {
        console.error('验证错误详情:', data.error?.details || data.message);
      }
      console.groupEnd();
      
      // 保留原始错误对象，但添加响应数据
      if (data) {
        error.response.data = {
          ...data,
          originalError: {
            status,
            statusText: error.response.statusText,
            headers: error.response.headers,
            config: {
              url: config?.url,
              method: config?.method,
              headers: config?.headers,
              data: config?.data
            }
          }
        };
      }
      
      return Promise.reject(error);
    }
    
    if (error.request) {
      // 请求发出但没有收到响应
      console.error('网络错误，请检查网络连接或后端服务是否启动');
    } else {
      // 请求配置错误
      console.error('请求配置错误', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API接口类型定义
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    details?: any;
  };
  timestamp: number;
}

// 通用请求方法，添加重试机制
export const request = async <T = any>(config: AxiosRequestConfig, retries = 2, delay = 1000): Promise<ApiResponse<T>> => {
  try {
    return await api.request<any, ApiResponse<T>>(config);
  } catch (error) {
    if (retries > 0 && (error as AxiosError).code === 'ERR_NETWORK') {
      console.log(`请求失败，${delay/1000}秒后重试，剩余重试次数: ${retries-1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return request(config, retries - 1, delay * 2);
    }
    throw error;
  }
};

// 封装常用请求方法
export const apiService = {
  get: <T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request<T>({ ...config, method: 'GET', url, params });
  },
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request<T>({ ...config, method: 'POST', url, data });
  },
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request<T>({ ...config, method: 'PUT', url, data });
  },
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request<T>({ ...config, method: 'PATCH', url, data });
  },
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request<T>({ ...config, method: 'DELETE', url });
  },
  
  // 文件上传专用方法
  upload: <T = any>(url: string, formData: FormData, method: string = 'POST', config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return request<T>({
      ...config,
      method,
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 检查后端服务健康状态
  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await apiService.get<{ status: string; timestamp: string; message?: string }>('/api/health', undefined, { 
        timeout: 5000,
        validateStatus: (status: number) => status === 200
      });
      return response.data?.status === 'ok' || response.data?.status === 'healthy';
    } catch (error) {
      console.error('后端服务健康检查失败:', error);
      return false;
    }
  }
};

export default apiService; 