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
  if (remember) {
    // 如果选择记住我，存储在Cookie中，有效期7天
    Cookies.save(TOKEN_KEY, token, {
      path: '/',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  } else {
    // 否则存储在localStorage中
    localStorage.setItem(TOKEN_KEY, token);
  }

  // 设置axios默认请求头
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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

  // 模拟环境下使用的token不需要完整验证
  if (process.env.NODE_ENV === 'development' && token.startsWith('mock_token_')) {
    return false; // 开发环境的模拟token视为永久有效
  }

  // 检查token格式是否正确
  if (!token || !token.includes('.') || token.split('.').length !== 3) {
    console.log('Token格式不正确: 不是标准的JWT格式');
    return true;
  }

  try {
    const decoded: any = jwtDecode(token);
    
    // 验证decoded对象中是否包含必要的字段
    if (!decoded || typeof decoded !== 'object' || !decoded.exp) {
      console.log('Token解析后缺少有效的exp字段');
      return true;
    }
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Token解析失败:', error);
    // Token解析失败，清除存储的无效token
    removeToken();
    return true;
  }
};

// 判断用户是否已登录
export const isLoggedIn = (): boolean => {
  return !!getToken() && !isTokenExpired();
};

// 获取当前用户信息
export const getCurrentUser = (): any => {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

// 用户角色相关
export const hasRole = (role: string): boolean => {
  const user = getCurrentUser();
  return user?.role === role;
};

// 登录API
export const login = async (username: string, password: string): Promise<any> => {
  try {
    const response = await axios.post('/api/auth/login', { username, password });
    const { token, user } = response.data;
    
    // 存储token和用户信息
    setToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    return response.data;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
};

// 登出API
export const logout = async (): Promise<void> => {
  try {
    await axios.post('/api/auth/logout');
  } catch (error) {
    console.error('登出失败:', error);
  } finally {
    // 无论成功与否，都清除本地token
    removeToken();
  }
};

// 获取用户权限
export const getUserPermissions = async (): Promise<string[]> => {
  try {
    const response = await axios.get('/api/auth/permissions');
    return response.data.permissions || [];
  } catch (error) {
    console.error('获取权限失败:', error);
    return [];
  }
};

// 模拟登录函数（开发环境使用）
const mockLogin = (username: string, password: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 模拟用户数据
      const users = [
        { 
          id: '1', 
          username: 'admin', 
          password: 'admin123', 
          name: '管理员',
          role: 'admin',
          permissions: ['*'] 
        },
        { 
          id: '2', 
          username: 'manager', 
          password: 'manager123', 
          name: '经理',
          role: 'manager',
          permissions: ['resume:view', 'resume:create', 'resume:edit', 'resume:assign'] 
        },
        { 
          id: '3', 
          username: 'employee', 
          password: 'employee123', 
          name: '员工',
          role: 'employee',
          permissions: ['resume:view', 'resume:create'] 
        }
      ];

      const user = users.find(u => u.username === username && u.password === password);

      if (user) {
        // 模拟token，使用一个特殊前缀标识这是开发环境的token
        const token = `mock_token_${user.id}_${Date.now()}`;
        const { password, ...userWithoutPassword } = user;
        
        resolve({
          token,
          user: userWithoutPassword
        });
      } else {
        reject(new Error('用户名或密码错误'));
      }
    }, 500); // 模拟网络延迟
  });
};

// 模拟获取权限
const mockGetPermissions = (): Promise<string[]> => {
  return new Promise((resolve) => {
    const user = getCurrentUser();
    setTimeout(() => {
      if (user?.role === 'admin') {
        resolve(['*']); // 管理员拥有所有权限
      } else if (user?.role === 'manager') {
        resolve(['resume:view', 'resume:create', 'resume:edit', 'resume:assign']);
      } else {
        resolve(['resume:view', 'resume:create']); // 普通员工
      }
    }, 300);
  });
}; 