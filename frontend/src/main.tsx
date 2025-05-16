import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'antd/dist/reset.css';
import { ConfigProvider } from 'antd';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider>
      <App /> {/* 确保 App 组件正确传递 children */}
    </ConfigProvider>
  </React.StrictMode>,
);