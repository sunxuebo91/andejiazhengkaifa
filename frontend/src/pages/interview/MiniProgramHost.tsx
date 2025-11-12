import React, { useEffect } from 'react';
import { Spin } from 'antd';
import { getToken } from '../../services/auth';

/**
 * 小程序HR主持人页面跳转
 * 直接跳转到打包好的H5页面，并携带JWT Token
 */
const MiniProgramHost: React.FC = () => {
  useEffect(() => {
    // 获取JWT Token
    const token = getToken();

    // 构建H5页面URL，携带Token
    let h5Url = `${window.location.origin}/miniprogram/video-interview-host.html`;
    if (token) {
      h5Url += `?token=${encodeURIComponent(token)}`;
      console.log('✅ 已携带JWT Token跳转到H5页面');
    } else {
      console.warn('⚠️ 未找到JWT Token，可能需要先登录');
    }

    // 跳转到H5页面
    window.location.href = h5Url;
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <Spin size="large" />
      <p>正在跳转到小程序视频面试...</p>
    </div>
  );
};

export default MiniProgramHost;

