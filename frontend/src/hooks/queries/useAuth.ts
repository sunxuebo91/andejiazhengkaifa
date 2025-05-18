import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { setToken, removeToken } from '../../services/auth';
import { useNavigate } from 'react-router-dom';
import { notifySuccess, notifyError } from '../../utils/notification';

export const authKeys = {
  permissions: ['auth', 'permissions'] as const,
};

// 登录
export const useLogin = () => {
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: (credentials: { username: string; password: string; remember?: boolean }) => {
      return api.auth.login(credentials);
    },
    onSuccess: (data, variables) => {
      const { remember = false } = variables;
      setToken(data.token, remember);
      localStorage.setItem('user', JSON.stringify(data.user));
      notifySuccess('登录成功');
      navigate('/dashboard');
    },
    onError: (error) => {
      notifyError(error.message || '用户名或密码错误');
    },
  });
};

// 登出
export const useLogout = () => {
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: () => {
      if (process.env.NODE_ENV === 'development') {
        return Promise.resolve();
      }
      return api.auth.logout();
    },
    onSuccess: () => {
      removeToken();
      localStorage.removeItem('user');
      notifySuccess('退出登录成功');
      navigate('/login');
    },
    onError: () => {
      // 即使登出API失败，也清除本地数据
      removeToken();
      localStorage.removeItem('user');
      navigate('/login');
    },
  });
};

// 获取权限
export const usePermissions = () => {
  return useQuery({
    queryKey: authKeys.permissions,
    queryFn: () => {
      if (process.env.NODE_ENV === 'development') {
        // 模拟环境
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'admin') return ['*'];
        if (user.role === 'manager') return ['resume:view', 'resume:create', 'resume:edit', 'resume:assign'];
        return ['resume:view', 'resume:create'];
      }
      return api.auth.getPermissions();
    },
    // 5分钟内不重新获取
    staleTime: 5 * 60 * 1000,
  });
}; 