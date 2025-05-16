import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Home from '@/pages/Home'; // 修复路径，确保正确导入 Home 组件
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { UserLayoutProps } from './layouts/UserLayout';
import { BasicLayoutProps } from './layouts/BasicLayout';
import { BlankLayoutProps } from './layouts/BlankLayout';

// 路由懒加载
const UserLayout = lazy(() => import('./layouts/UserLayout'));
const BasicLayout = lazy(() => import('./layouts/BasicLayout'));
const BlankLayout = lazy(() => import('./layouts/BlankLayout'));

// 页面懒加载
const LoginPage = lazy(() => import('./pages/Login'));
const RegisterPage = lazy(() => import('./pages/Register'));
const HomePage = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AuntResumeList = lazy(() => import('./pages/aunt/ResumeList'));
const AuntCreateResume = lazy(() => import('./pages/aunt/CreateResume'));
const AuntResumeDetail = lazy(() => import('./pages/aunt/ResumeDetail'));

export interface RouteConfig {
  path: string;
  name?: string;
  element: React.ReactNode;
  children?: RouteConfig[];
  permission?: string;
  meta?: Record<string, any>;
}

export const userLayoutRoutes: RouteConfig[] = [
  {
    path: '',
    element: <UserLayout />,
    children: [
      {
        path: 'login',
        name: '登录',
        element: <LoginPage />,
      },
      {
        path: 'register',
        name: '注册',
        element: <RegisterPage />,
      },
      {
        path: '',
        element: <Navigate to="/login" replace />,
      },
    ],
  },
];

export const basicLayoutRoutes: RouteConfig[] = [
  {
    path: '',
    element: <BasicLayout />,
    children: [
      {
        path: '',
        name: '首页',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        name: '驾驶舱',
        element: <Dashboard />,
      },
      {
        path: 'home',
        name: '首页',
        element: <HomePage />,
      },
      {
        path: 'aunt',
        name: '阿姨管理',
        children: [
          {
            path: 'resumes',
            name: '简历列表',
            element: <AuntResumeList />,
          },
          {
            path: 'resumes/create',
            name: '创建简历',
            element: <AuntCreateResume />,
          },
          {
            path: 'resumes/detail/:id',
            name: '简历详情',
            element: <AuntResumeDetail />,
          },
        ],
      },
    ],
  },
];

export const blankLayoutRoutes: RouteConfig[] = [
  {
    path: '',
    element: <BlankLayout />,
    children: [],
  },
];

export const routeConfig: RouteConfig[] = [
  {
    path: '/',
    children: [...basicLayoutRoutes],
  },
  {
    path: '/user',
    children: [...userLayoutRoutes],
  },
  {
    path: '/blank',
    children: [...blankLayoutRoutes],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

const router = createBrowserRouter(routeConfig, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

export default router;