import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  isLoggedIn,
  logout as authLogout,
  getCurrentUser,
  getUserPermissions,
  fetchCurrentUser
} from '../services/auth';

const ROLE_ALIAS_MAP: Record<string, string> = {
  admin: 'admin',
  administrator: 'admin',
  系统管理员: 'admin',
  管理员: 'admin',
  超级管理员: 'admin',
  manager: 'manager',
  经理: 'manager',
  主管: 'manager',
  employee: 'employee',
  staff: 'employee',
  普通员工: 'employee',
  员工: 'employee',
  销售: 'employee',
  operator: 'operator',
  运营: 'operator',
  运营专员: 'operator',
  admissions: 'admissions',
  招生老师: 'admissions',
  招生: 'admissions',
  dispatch: 'dispatch',
  派单老师: 'dispatch',
  派单: 'dispatch',
};

const normalizeRole = (role?: string): string => {
  if (!role) {
    return '';
  }

  const trimmedRole = role.trim();
  return ROLE_ALIAS_MAP[trimmedRole] || ROLE_ALIAS_MAP[trimmedRole.toLowerCase()] || trimmedRole;
};

const normalizePermissions = (permissionList?: string[]): string[] => {
  if (!Array.isArray(permissionList)) {
    return [];
  }

  return [...new Set(permissionList)];
};

const formatUser = (userData: Partial<User>): User => ({
  id: userData.id || userData._id?.toString() || '',
  username: userData.username || '',
  name: userData.name || '',
  phone: userData.phone,
  email: userData.email,
  avatar: userData.avatar,
  role: normalizeRole(userData.role || ''),
  department: userData.department,
  permissions: normalizePermissions(userData.permissions),
  wechatOpenId: userData.wechatOpenId,
  wechatNickname: userData.wechatNickname,
  wechatAvatar: userData.wechatAvatar,
});

interface User {
  id: string;
  _id?: string; // MongoDB ObjectId
  username: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  role: string;
  department?: string;
  permissions?: string[];
  // 微信相关字段
  wechatOpenId?: string;
  wechatNickname?: string;
  wechatAvatar?: string;
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshUserInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  permissions: [],
  loading: true,
  hasPermission: () => false,
  hasRole: () => false,
  login: () => {},
  logout: async () => {},
  updateUser: () => {},
  refreshUserInfo: async () => {},
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
          const formattedUser = formatUser(currentUser);
          setUser(formattedUser);

          // 先用本地缓存快速渲染
          const userPermissions = await getUserPermissions();
          setPermissions(normalizePermissions(userPermissions));
        }
      }
      setLoading(false);

      // 后台静默刷新服务器最新用户信息（确保权限始终是最新的，解决 localStorage 缓存过期问题）
      if (isLoggedIn()) {
        fetchCurrentUser()
          .then(updatedUser => {
            const formattedUser = formatUser(updatedUser);
            setUser(formattedUser);
            if (formattedUser.permissions) {
              setPermissions(normalizePermissions(formattedUser.permissions));
            }
          })
          .catch(() => {
            // 服务器刷新失败时继续使用缓存数据，不影响正常使用
          });
      }
    };

    initAuth();
  }, []);

  // 检查是否有特定权限
  const hasPermission = (permission: string): boolean => {
    if (!permissions || permissions.length === 0) return false;
    
    // 如果有通配符权限，表示拥有所有权限
    if (permissions.includes('*')) return true;

    if (permissions.includes(permission)) return true;

    const [resource] = permission.split(':');
    return permissions.includes(`${resource}:all`);
  };

  // 检查是否有特定角色
  const hasRole = (role: string): boolean => {
    return normalizeRole(user?.role) === normalizeRole(role);
  };

  // 设置用户登录
  const login = (userData: any) => {
    const formattedUser = formatUser(userData);
    
    console.log('用户登录成功，设置状态:', formattedUser);
    setUser(formattedUser);
    if (formattedUser.permissions) {
      setPermissions(formattedUser.permissions);
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

  // 更新用户信息
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = formatUser({ ...user, ...userData });
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // 从服务器刷新用户信息
  const refreshUserInfo = async () => {
    try {
      if (!isLoggedIn()) {
        return;
      }

      const updatedUser = await fetchCurrentUser();
      const formattedUser = formatUser(updatedUser);
      
      setUser(formattedUser);

      // 更新权限
      if (formattedUser.permissions) {
        setPermissions(formattedUser.permissions);
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
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
        updateUser,
        refreshUserInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 
