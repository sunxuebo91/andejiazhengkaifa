import axios from 'axios';
import { message } from 'antd';
import { getToken, removeToken } from '../services/auth';

// 创建axios实例
const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器
request.interceptors.request.use(
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

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 处理NestJS返回的嵌套数据结构
    const responseData = response.data || {};
    
    // 打印一下响应数据结构，方便调试
    console.log('API响应数据结构:', responseData);
    
    // 检查标准响应格式：code = 0 表示成功，data字段包含实际数据
    if (responseData.code === 0 && responseData.data !== undefined) {
      return responseData.data;
    }
    
    // 如果没有标准嵌套结构，直接返回响应数据
    return responseData;
  },
  (error) => {
    // 统一错误处理
    if (error.response) {
      switch (error.response.status) {
        case 401:
          message.error('登录已过期，请重新登录');
          removeToken();
          window.location.href = '/login';
          break;
        case 403:
          message.error('没有权限访问该资源');
          break;
        case 500:
          message.error('服务器错误，请稍后再试');
          break;
        default:
          message.error(error.response.data?.message || '请求失败');
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error('请求配置错误');
    }
    return Promise.reject(error);
  }
);

export default request; 