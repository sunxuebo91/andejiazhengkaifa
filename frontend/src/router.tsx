import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// 路由懒加载
const BasicLayout = lazy(() => import('./layouts/BasicLayout'));

// 页面懒加载
const LoginPage = lazy(() => import('./pages/Login'));
const HomePage = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AuntResumeList = lazy(() => import('./pages/aunt/ResumeList'));
const AuntCreateResume = lazy(() => import('./pages/aunt/CreateResume'));
const AuntResumeDetail = lazy(() => import('./pages/aunt/ResumeDetail'));
const ESignaturePage = lazy(() => import('./pages/esign/ESignaturePage'));
const NotFound = lazy(() => import('./pages/NotFound'));

export interface RouteConfig {
  path: string;
  name?: string;
  element?: React.ReactNode;
  children?: RouteConfig[];
  permission?: string;
  meta?: Record<string, any>;
}

export const basicLayoutRoutes: RouteConfig[] = [
  {
    path: '/',
    element: <BasicLayout />,
    children: [
      {
        path: '',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        name: '仪表板',
        element: <Dashboard />,
      },
      {
        path: 'home',
        name: '首页',
        element: <HomePage />,
      },
      {
        path: 'aunt/list',
        name: '简历列表',
        element: <AuntResumeList />,
      },
      {
        path: 'aunt/create-resume',
        name: '创建简历',
        element: <AuntCreateResume />,
      },
      {
        path: 'aunt/resumes/detail/:id',
        name: '简历详情',
        element: <AuntResumeDetail />,
      },
      {
        path: 'esign',
        name: '电子签名',
        element: <ESignaturePage />,
      },
    ],
  },
];

export const authRoutes: RouteConfig[] = [
  {
    path: '/login',
    name: '登录',
    element: <LoginPage />,
  },
];

export const routeConfig: RouteConfig[] = [
  ...basicLayoutRoutes,
  ...authRoutes,
  {
    path: '*',
    element: <NotFound />,
  },
];

const router = createBrowserRouter(routeConfig, {
  future: {
    v7_relativeSplatPath: true,
  },
});

export default router;