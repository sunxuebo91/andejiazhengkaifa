import React, { ReactNode, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, Spin } from 'antd';
import BasicLayout from './layouts/BasicLayout';
import { PageContainer } from '@ant-design/pro-components';
import { AuthProvider } from './contexts/AuthContext';
import AuthorizedRoute from './components/AuthorizedRoute';

// Lazy load components
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ResumeList = React.lazy(() => import('./pages/aunt/ResumeList'));
const CreateResume = React.lazy(() => import('./pages/aunt/CreateResume'));
const ResumeDetail = React.lazy(() => import('./pages/aunt/ResumeDetail'));
const CustomerList = React.lazy(() => import('./pages/customers/CustomerList'));
const CreateCustomer = React.lazy(() => import('./pages/customers/CreateCustomer'));
const CustomerDetail = React.lazy(() => import('./pages/customers/CustomerDetail'));
const EditCustomer = React.lazy(() => import('./pages/customers/EditCustomer'));
const ContractList = React.lazy(() => import('./pages/contracts/ContractList'));
const CreateContract = React.lazy(() => import('./pages/contracts/CreateContract'));
const ContractDetail = React.lazy(() => import('./pages/contracts/ContractDetail'));
const UserList = React.lazy(() => import('./pages/users/UserList'));
const CreateUser = React.lazy(() => import('./pages/users/CreateUser'));
const EditUser = React.lazy(() => import('./pages/users/EditUser'));
const RoleList = React.lazy(() => import('./pages/roles/RoleList'));
const EditRole = React.lazy(() => import('./pages/roles/EditRole'));
const ProfilePage = React.lazy(() => import('./pages/profile/ProfilePage'));
const AccountSettings = React.lazy(() => import('./pages/settings/AccountSettings'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Unauthorized = React.lazy(() => import('./pages/Unauthorized'));

interface AppProps {
  children?: ReactNode;
}

const LoadingComponent = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large">
      <div style={{ padding: '50px', background: 'rgba(0, 0, 0, 0.05)' }}>
        加载中...
      </div>
    </Spin>
  </div>
);

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
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Suspense fallback={<LoadingComponent />}>
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
                      path="resumes/detail/:id" 
                      element={<AuthorizedRoute element={<ResumeDetail />} authority="resume:view" />} 
                    />
                  </Route>
                  
                  {/* 客户管理模块 - 需要customer相关权限 */}
                  <Route path="customers">
                    <Route 
                      path="list" 
                      element={<AuthorizedRoute element={<CustomerList />} />} 
                    />
                    <Route 
                      path="create" 
                      element={<AuthorizedRoute element={<CreateCustomer />} />} 
                    />
                    <Route 
                      path=":id" 
                      element={<AuthorizedRoute element={<CustomerDetail />} />} 
                    />
                    <Route 
                      path="edit/:id" 
                      element={<AuthorizedRoute element={<EditCustomer />} />} 
                    />
                    {/* 重定向 /customers 到 /customers/list */}
                    <Route index element={<Navigate to="list" replace />} />
                  </Route>
                  
                  {/* 合同管理模块 - 需要contract相关权限 */}
                  <Route path="contracts">
                    <Route 
                      path="list" 
                      element={<AuthorizedRoute element={<ContractList />} />} 
                    />
                    <Route 
                      path="create" 
                      element={<AuthorizedRoute element={<CreateContract />} />} 
                    />
                    <Route 
                      path=":id" 
                      element={<AuthorizedRoute element={<ContractDetail />} />} 
                    />
                    {/* 重定向 /contracts 到 /contracts/list */}
                    <Route index element={<Navigate to="list" replace />} />
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
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}