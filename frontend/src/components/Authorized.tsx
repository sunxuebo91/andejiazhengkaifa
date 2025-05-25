import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spin } from 'antd';

interface AuthorizedProps {
  children: React.ReactNode;
  authority?: string | string[]; // 所需权限
  role?: string | string[]; // 所需角色
  noMatch?: React.ReactNode; // 无权限时显示的内容
}

// 权限控制组件
const Authorized: React.FC<AuthorizedProps> = ({
  children,
  authority,
  role,
  noMatch = <Navigate to="/unauthorized" replace />
}) => {
  const { hasPermission, hasRole, loading } = useAuth();
  const location = useLocation();
  
  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        padding: '50px 0' 
      }}>
        <Spin size="large">
          <div style={{ padding: '50px', background: 'rgba(0, 0, 0, 0.05)' }}>
            正在加载权限...
          </div>
        </Spin>
      </div>
    );
  }
  
  // 检查权限
  if (authority) {
    const authorities = Array.isArray(authority) ? authority : [authority];
    const hasAuthority = authorities.some(auth => hasPermission(auth));
    
    if (!hasAuthority) {
      return noMatch as React.ReactElement;
    }
  }
  
  // 检查角色
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    const hasRoleAuth = roles.some(r => hasRole(r));
    
    if (!hasRoleAuth) {
      return noMatch as React.ReactElement;
    }
  }
  
  // 通过权限检查，显示子组件
  return <>{children}</>;
};

// 权限按钮组件
export const AuthorizedButton: React.FC<AuthorizedProps & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  authority,
  role,
  ...props
}) => {
  const { hasPermission, hasRole } = useAuth();
  
  // 检查权限和角色
  const checkAuthority = () => {
    if (authority) {
      const authorities = Array.isArray(authority) ? authority : [authority];
      if (!authorities.some(auth => hasPermission(auth))) {
        return false;
      }
    }
    
    if (role) {
      const roles = Array.isArray(role) ? role : [role];
      if (!roles.some(r => hasRole(r))) {
        return false;
      }
    }
    
    return true;
  };
  
  // 如果没有权限，不渲染按钮
  if (!checkAuthority()) {
    return null;
  }
  
  // 通过权限检查，渲染按钮
  return React.cloneElement(children as React.ReactElement, props);
};

export default Authorized; 