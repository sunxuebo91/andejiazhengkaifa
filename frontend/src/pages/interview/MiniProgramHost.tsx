import React, { useEffect } from 'react';
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

    // 立即跳转到H5页面
    window.location.replace(h5Url);
  }, []);

  // 返回 null，不显示任何内容
  return null;
};

export default MiniProgramHost;

