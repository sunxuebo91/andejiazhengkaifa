import React, { ReactNode, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, Spin, message } from 'antd';
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
const PublicPool = React.lazy(() => import('./pages/customers/PublicPool'));
const ContractList = React.lazy(() => import('./pages/contracts/ContractList'));
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
const ESignaturePage = React.lazy(() => import('./pages/esign/ESignaturePage'));
const SignContractPage = React.lazy(() => import('./pages/esign/SignContractPage'));
const PaymentGuide = React.lazy(() => import('./pages/PaymentGuide'));
const Payment = React.lazy(() => import('./pages/Payment'));
const TestSortableUpload = React.lazy(() => import('./pages/TestSortableUpload'));
// 🔴 PC端视频面试组件（已注释，使用小程序H5代替）
// const VideoInterview = React.lazy(() => import('./pages/interview/VideoInterview'));
// const JoinInterview = React.lazy(() => import('./pages/interview/JoinInterview'));
const JoinInterviewMobile = React.lazy(() => import('./pages/interview/JoinInterviewMobile'));
const H5Login = React.lazy(() => import('./pages/interview/H5Login'));
const MiniProgramConfig = React.lazy(() => import('./pages/interview/MiniProgramConfig'));
const MiniProgramHost = React.lazy(() => import('./pages/interview/MiniProgramHost'));
const InterviewRoomList = React.lazy(() => import('./pages/interview/InterviewRoomList'));
// const MiniProgramEntry = React.lazy(() => import('./pages/interview/MiniProgramEntry'));
// const VideoInterviewMiniprogram = React.lazy(() => import('./pages/interview/VideoInterviewMiniprogram'));

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
    
    // 配置全局message
    message.config({
      top: 100,
      duration: 3,
      maxCount: 3,
      rtl: false,
    });
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#5DBFB3',
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
                {/* 公开访问页面 - 不需要登录 */}
                <Route path="/login" element={<Login />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                {/* 🔴 PC端视频面试路由（已注释，使用小程序H5代替） */}
                {/* <Route path="/interview/join/:roomId" element={<JoinInterview />} /> */}
                {/* <Route path="/interview/video" element={<VideoInterview />} /> */}

                {/* ✅ 移动端和小程序H5路由（保留） */}
                <Route path="/interview/join-mobile/:roomId" element={<JoinInterviewMobile />} />
                <Route path="/interview/h5-login" element={<H5Login />} />
                <Route path="/interview/miniprogram" element={<MiniProgramHost />} />
                <Route path="/interview/miniprogram-config" element={<MiniProgramConfig />} />

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
                      path="public-pool"
                      element={<AuthorizedRoute element={<PublicPool />} />}
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
                      element={<AuthorizedRoute element={<ESignaturePage />} />} 
                    />
                    <Route 
                      path="detail/:id" 
                      element={<AuthorizedRoute element={<ContractDetail />} />} 
                    />
                    <Route 
                      path=":id" 
                      element={<AuthorizedRoute element={<ContractDetail />} />} 
                    />
                    {/* 重定向 /contracts 到 /contracts/list */}
                    <Route index element={<Navigate to="list" replace />} />
                  </Route>
                  
                  {/* 电子签约模块 - 需要esign相关权限 */}
                  <Route path="esign">
                    <Route 
                      index 
                      element={<AuthorizedRoute element={<ESignaturePage />} />} 
                    />
                    <Route 
                      path="contracts" 
                      element={<AuthorizedRoute element={<ESignaturePage />} />} 
                    />
                    <Route 
                      path="sign/:contractId" 
                      element={<AuthorizedRoute element={<SignContractPage />} />} 
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

                  {/* 支付相关路由 - 所有登录用户可访问 */}
                  <Route 
                    path="payment-guide/:contractId" 
                    element={<AuthorizedRoute element={<PaymentGuide />} />} 
                  />
                  <Route 
                    path="payment/:contractId" 
                    element={<AuthorizedRoute element={<Payment />} />} 
                  />

                  {/* 个人信息相关路由 - 所有登录用户可访问 */}
                  <Route 
                    path="profile" 
                    element={<AuthorizedRoute element={<ProfilePage />} />} 
                  />
                  <Route
                    path="settings/account"
                    element={<AuthorizedRoute element={<AccountSettings />} />}
                  />

                  {/* 测试页面 - 开发环境使用 */}
                  <Route
                    path="test/sortable-upload"
                    element={<AuthorizedRoute element={<TestSortableUpload />} />}
                  />

                  {/* 面试间管理 - 所有登录用户可访问 */}
                  <Route
                    path="interview/rooms"
                    element={<AuthorizedRoute element={<InterviewRoomList />} />}
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