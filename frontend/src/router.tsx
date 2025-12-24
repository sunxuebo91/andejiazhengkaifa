import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import VideoInterviewTest from './pages/interview/VideoInterviewTest';

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
const SignContractPage = lazy(() => import('./pages/esign/SignContractPage'));
const WeChatBind = lazy(() => import('./pages/wechat/WeChatBind'));
const WeChatTest = lazy(() => import('./pages/wechat/WeChatTest'));
// const VideoInterview = lazy(() => import('./pages/interview/VideoInterview'));
// const VideoInterview = lazy(() => import('./pages/interview/VideoInterviewTest'));
const VideoInterview = VideoInterviewTest;
const NotFound = lazy(() => import('./pages/NotFound'));
// 保险相关页面
const CreateInsurance = lazy(() => import('./pages/insurance/CreateInsurance'));
const InsuranceList = lazy(() => import('./pages/insurance/InsuranceList'));

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
      // 电子签约相关路由
      {
        path: 'esign',
        name: '电子签约',
        element: <ESignaturePage />,
        meta: {
          title: '电子签约管理',
          description: '基于爱签平台的电子合同签署系统'
        }
      },
      {
        path: 'esign/contracts',
        name: '合同管理',
        element: <ESignaturePage />,
        meta: {
          title: '合同管理',
          description: '查看和管理所有电子合同'
        }
      },
      {
        path: 'esign/sign/:contractId',
        name: '签署合同',
        element: <SignContractPage />,
        meta: {
          title: '签署合同',
          description: '在线签署电子合同'
        }
      },
      {
        path: 'wechat/bind',
        name: '微信绑定',
        element: <WeChatBind />,
        meta: {
          title: '微信绑定',
          description: '绑定微信账号以接收通知'
        }
      },
      {
        path: 'wechat/test',
        name: '微信测试',
        element: <WeChatTest />,
        meta: {
          title: '微信通知测试',
          description: '测试微信通知功能'
        }
      },
      {
        path: 'interview/video',
        name: '视频面试',
        element: <VideoInterview />,
        meta: {
          title: '视频面试',
          description: '家政人员视频面试功能'
        }
      },
      // 保险相关路由
      {
        path: 'insurance/create',
        name: '新建投保',
        element: <CreateInsurance />,
        meta: {
          title: '新建投保',
          description: '为家政服务人员购买保险'
        }
      },
      {
        path: 'insurance/list',
        name: '保单管理',
        element: <InsuranceList />,
        meta: {
          title: '保单管理',
          description: '管理所有保险保单'
        }
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