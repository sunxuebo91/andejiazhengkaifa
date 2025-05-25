import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  isLoggedIn, 
  logout as authLogout, 
  getCurrentUser,
  getUserPermissions
} from '../services/auth';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  permissions: [],
  loading: true,
  hasPermission: () => false,
  hasRole: () => false,
  login: () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      if (isLoggedIn()) {
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          
          // 获取用户权限
          const userPermissions = await getUserPermissions();
          setPermissions(userPermissions);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // 检查是否有特定权限
  const hasPermission = (permission: string): boolean => {
    if (!permissions || permissions.length === 0) return false;
    
    // 如果有通配符权限，表示拥有所有权限
    if (permissions.includes('*')) return true;
    
    return permissions.includes(permission);
  };

  // 检查是否有特定角色
  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  // 设置用户登录
  const login = (userData: User) => {
    console.log('用户登录成功，设置状态:', userData);
    setUser(userData);
    if (userData.permissions) {
      setPermissions(userData.permissions);
    } else {
      // 如果登录信息中没有权限，尝试获取
      getUserPermissions().then(perms => {
        console.log('获取到用户权限:', perms);
        setPermissions(perms);
      });
    }
  };

  // 登出
  const logout = async () => {
    try {
      await authLogout();
      setUser(null);
      setPermissions([]);
      navigate('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        hasPermission,
        hasRole,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 