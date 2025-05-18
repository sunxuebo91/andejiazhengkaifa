import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BasicLayout from './layouts/BasicLayout';
import { ConfigProvider, App as AntdApp } from 'antd';
import ResumeList from './pages/aunt/ResumeList';
import CreateResume from './pages/aunt/CreateResume';
import ResumeDetail from './pages/aunt/ResumeDetail';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import UserList from './pages/users/UserList';
import CreateUser from './pages/users/CreateUser';
import EditUser from './pages/users/EditUser';
import RoleList from './pages/roles/RoleList';
import EditRole from './pages/roles/EditRole';
import ProfilePage from './pages/profile/ProfilePage';
import AccountSettings from './pages/settings/AccountSettings';
import { ReactNode, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { AuthProvider } from './contexts/AuthContext';
import AuthorizedRoute from './components/AuthorizedRoute';
import QueryLoadingIndicator from './components/QueryLoadingIndicator';

interface AppProps {
  children?: ReactNode;
}

export default function App({ children }: AppProps) {
  useEffect(() => {
    console.log('App component mounted');
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2B5AED',
          borderRadius: 4,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <AuthProvider>
            <QueryLoadingIndicator />
            <Routes>
              {/* 登录页面 - 不需要权限 */}
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* 需要登录的路由 */}
              <Route
                path="/"
                element={
                  <PageContainer>
                    <BasicLayout />
                  </PageContainer>
                }
              >
                {/* 默认首页 */}
                <Route index element={<Navigate to="/dashboard" replace />} />
                
                {/* 驾驶舱页面 - 所有登录用户可访问 */}
                <Route 
                  path="dashboard" 
                  element={<AuthorizedRoute element={<Dashboard />} />} 
                />
                
                {/* 阿姨管理模块 - 需要resume相关权限 */}
                <Route path="aunt">
                  <Route 
                    path="list" 
                    element={<AuthorizedRoute element={<ResumeList />} authority="resume:view" />} 
                  />
                  <Route 
                    path="create-resume" 
                    element={<AuthorizedRoute element={<CreateResume />} authority="resume:create" />} 
                  />
                  <Route 
                    path="resume/:id" 
                    element={<AuthorizedRoute element={<ResumeDetail />} authority="resume:view" />} 
                  />
                </Route>
                
                {/* 用户管理模块 - 需要管理员权限 */}
                <Route path="users">
                  <Route 
                    path="list" 
                    element={<AuthorizedRoute element={<UserList />} role="admin" />} 
                  />
                  <Route 
                    path="create" 
                    element={<AuthorizedRoute element={<CreateUser />} role="admin" />} 
                  />
                  <Route
                    path="edit/:id"
                    element={<AuthorizedRoute element={<EditUser />} role="admin" />}
                  />
                </Route>
                
                {/* 角色管理模块 - 需要管理员权限 */}
                <Route path="roles">
                  <Route 
                    path="list" 
                    element={<AuthorizedRoute element={<RoleList />} role="admin" />} 
                  />
                  <Route 
                    path="edit/:id" 
                    element={<AuthorizedRoute element={<EditRole />} role="admin" />} 
                  />
                </Route>

                {/* 个人信息相关路由 - 所有登录用户可访问 */}
                <Route 
                  path="profile" 
                  element={<AuthorizedRoute element={<ProfilePage />} />} 
                />
                <Route 
                  path="settings/account" 
                  element={<AuthorizedRoute element={<AccountSettings />} />} 
                />
                
                {/* 404页面 */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            {children}
          </AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}