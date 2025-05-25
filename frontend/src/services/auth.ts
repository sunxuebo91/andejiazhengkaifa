import axios from 'axios';
import Cookies from 'react-cookies';
import { jwtDecode } from 'jwt-decode';

// Token相关常量
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';

// 获取token
export const getToken = (): string | null => {
  return Cookies.load(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
};

// 设置token
export const setToken = (token: string, remember: boolean = false): void => {
  // 验证 token 格式
  if (!token || !token.includes('.') || token.split('.').length !== 3) {
    console.error('Invalid token format');
    return;
  }

  try {
    // 尝试解码 token 以验证其有效性
    const decoded = jwtDecode(token);
    if (!decoded || typeof decoded !== 'object' || !decoded.exp) {
      console.error('Invalid token content');
      return;
    }

    if (remember) {
      // 如果选择记住我，存储在Cookie中，有效期7天
      Cookies.save(TOKEN_KEY, token, {
        path: '/',
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
    } else {
      // 否则存储在localStorage中
      localStorage.setItem(TOKEN_KEY, token);
    }

    // 设置axios默认请求头
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } catch (error) {
    console.error('Error setting token:', error);
    removeToken(); // 清除可能存在的无效token
  }
};

// 移除token
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  Cookies.remove(TOKEN_KEY, { path: '/' });
  localStorage.removeItem(USER_KEY);
  
  // 移除axios默认请求头
  delete axios.defaults.headers.common['Authorization'];
};

// 检查token是否有效或已过期
export const isTokenExpired = (): boolean => {
  const token = getToken();
  if (!token) return true;

  try {
    const decoded: any = jwtDecode(token);
    if (!decoded || typeof decoded !== 'object' || !decoded.exp) {
      console.error('Token missing exp field');
      removeToken();
      return true;
    }
    
    const currentTime = Date.now() / 1000;
    const isExpired = decoded.exp < currentTime;
    
    if (isExpired) {
      console.log('Token has expired');
      removeToken();
    }
    
    return isExpired;
  } catch (error) {
    console.error('Error decoding token:', error);
    removeToken();
    return true;
  }
};

// 判断用户是否已登录
export const isLoggedIn = (): boolean => {
  const token = getToken();
  if (!token) return false;
  return !isTokenExpired();
};

// 获取当前用户信息
export const getCurrentUser = (): any => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user info:', error);
    return null;
  }
};

// 用户角色相关
export const hasRole = (role: string): boolean => {
  const user = getCurrentUser();
  return user?.role === role;
};

// 登录API
export const login = async (username: string, password: string): Promise<any> => {
  try {
    console.log('Attempting login for username:', username);
    const response = await axios.post('/api/auth/login', { username, password });
    console.log('Login response:', response.data);
    
    // 检查响应格式
    if (!response.data || !response.data.success) {
      console.error('Invalid login response format:', response.data);
      throw new Error(response.data?.message || '登录失败');
    }
    
    const { token, user } = response.data.data;
    
    if (!token || !user) {
      console.error('Missing token or user data:', response.data.data);
      throw new Error('登录响应数据不完整');
    }
    
    // 存储token和用户信息
    setToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    return response.data.data;
  } catch (error: any) {
    console.error('Login failed:', error);
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
      // 处理后端返回的错误消息
      if (error.response.data?.message) {
        throw new Error(error.response.data.message);
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('无法连接到服务器，请检查网络连接');
    } else {
      console.error('Error setting up request:', error.message);
      throw error;
    }
    throw error;
  }
};

// 登出API
export const logout = async (): Promise<void> => {
  try {
    // 调用后端登出接口
    await axios.post('/api/auth/logout');
  } catch (error) {
    console.error('Logout API call failed:', error);
  } finally {
    // 无论后端调用是否成功，都清除本地状态
    removeToken();
  }
};

// 获取用户权限
export const getUserPermissions = async (): Promise<string[]> => {
  try {
    if (!isLoggedIn()) {
      return [];
    }
    const user = getCurrentUser();
    return user?.permissions || [];
  } catch (error) {
    console.error('Error getting permissions:', error);
    return [];
  }
};