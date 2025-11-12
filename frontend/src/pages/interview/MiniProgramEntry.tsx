import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { setToken } from '../../services/auth';
import './MiniProgramEntry.css';

/**
 * 小程序入口页面
 * 用于接收小程序传递的Token和用户信息
 * 自动保存Token到localStorage，然后跳转到视频面试页面
 */
const MiniProgramEntry: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleEntry = async () => {
      try {
        // 获取URL参数
        const token = searchParams.get('token');
        const roomId = searchParams.get('roomId');
        const userName = searchParams.get('userName');
        const isGuest = searchParams.get('isGuest');
        const skipLogin = searchParams.get('skipLogin');

        console.log('📱 小程序入口页面 - 接收参数:', {
          token: token ? '✅ 已接收' : '❌ 未接收',
          roomId,
          userName,
          isGuest,
          skipLogin
        });

        // 验证必要参数
        if (!roomId) {
          message.error('缺少房间ID参数');
          setTimeout(() => {
            window.history.back();
          }, 1500);
          return;
        }

        // 保存Token（HR模式）
        if (token) {
          console.log('💾 保存Token到localStorage...');
          setToken(token, false); // 不记住我，使用localStorage
          localStorage.setItem('access_token', token);
          localStorage.setItem('isLoggedIn', 'true');
          
          if (userName) {
            localStorage.setItem('userName', decodeURIComponent(userName));
            console.log('💾 保存用户名:', decodeURIComponent(userName));
          }
          
          console.log('✅ Token已保存，自动登录成功');
        }

        // 访客模式
        if (isGuest === 'true' || skipLogin === 'true') {
          localStorage.setItem('isGuest', 'true');
          if (userName) {
            localStorage.setItem('guestName', decodeURIComponent(userName));
          }
          console.log('✅ 访客模式已设置');
        }

        // 延迟跳转，确保Token已保存
        setTimeout(() => {
          console.log('🔄 跳转到视频面试页面...');
          // 跳转到PC端的面试间页面，而不是直接进入视频通话
          navigate(`/interview/video`, { replace: true });
        }, 500);

      } catch (error: any) {
        console.error('❌ 小程序入口处理失败:', error);
        message.error(error.message || '处理失败，请重试');
        setTimeout(() => {
          window.history.back();
        }, 1500);
      }
    };

    handleEntry();
  }, [searchParams, navigate]);

  return (
    <div className="miniprogram-entry">
      <div className="entry-container">
        <div className="spinner"></div>
        <p className="entry-text">正在进入视频面试...</p>
        <p className="entry-subtitle">请稍候</p>
      </div>
    </div>
  );
};

export default MiniProgramEntry;

