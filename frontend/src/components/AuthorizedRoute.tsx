import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spin } from 'antd';

interface AuthorizedRouteProps {
  element: React.ReactNode;
  authority?: string | string[];
  role?: string | string[];
}

const AuthorizedRoute: React.FC<AuthorizedRouteProps> = ({
  element,
  authority,
  role
}) => {
  const { user, hasPermission, hasRole, loading } = useAuth();
  const location = useLocation();
  
  // 如果正在加载权限信息，显示加载状态
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            加载权限信息...
          </div>
        </Spin>
      </div>
    );
  }
  
  // 检查是否登录
  if (!user) {
    // 保存当前路径，登录后可以重定向回来
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  // 检查权限
  if (authority) {
    const authorities = Array.isArray(authority) ? authority : [authority];
    // 检查用户是否有任意一个所需权限
    const hasAuthority = authorities.some(auth => hasPermission(auth));
    
    if (!hasAuthority) {
      return <Navigate to="/unauthorized" replace />;
    }
  }
  
  // 检查角色
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    // 检查用户是否有任意一个所需角色
    const hasRoleAuth = roles.some(r => hasRole(r));
    
    if (!hasRoleAuth) {
      return <Navigate to="/unauthorized" replace />;
    }
  }
  
  // 通过权限检查，渲染路由组件
  return <>{element}</>;
};

export default AuthorizedRoute; 