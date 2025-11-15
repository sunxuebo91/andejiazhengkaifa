/**
 * 优化版视频面试组件
 * 支持PC端和移动端自适应
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { message, Spin } from 'antd';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { generateZegoToken } from '@/services/zego';
import DeviceDetector from '@/utils/deviceDetector';
import './VideoInterviewOptimized.css';

// 获取当前用户信息
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return {
        id: user._id || user.id || `user_${Date.now()}`,
        name: user.name || user.username || '用户',
        avatar: user.avatar || null,
      };
    } catch (e) {
      console.error('Failed to parse user:', e);
    }
  }
  return {
    id: `user_${Date.now()}`,
    name: '用户',
    avatar: null,
  };
};

const VideoInterviewOptimized: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const zegoInstanceRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState(DeviceDetector.getDeviceInfo());
  const [error, setError] = useState<string | null>(null);

  // 监听屏幕方向变化
  useEffect(() => {
    const cleanup = DeviceDetector.onOrientationChange((orientation) => {
      console.log('📱 屏幕方向变化:', orientation);
      setDeviceInfo(DeviceDetector.getDeviceInfo());

      // 重新调整视频布局
      if (zegoInstanceRef.current) {
        // ZEGO会自动处理布局调整
      }
    });

    return cleanup;
  }, []);

  // 初始化视频会议
  useEffect(() => {
    if (!roomId) {
      message.error('房间ID不能为空');
      navigate('/interview/list');
      return;
    }

    // 打印设备信息(调试用)
    DeviceDetector.logDeviceInfo();

    // 初始化会议
    initMeeting();

    // 清理函数
    return () => {
      if (zegoInstanceRef.current) {
        try {
          zegoInstanceRef.current.destroy();
          console.log('✅ ZEGO实例已销毁');
        } catch (error) {
          console.error('销毁ZEGO实例失败:', error);
        }
      }

      // 解锁屏幕方向
      DeviceDetector.unlockOrientation();
    };
  }, [roomId]);

  // 初始化会议
  const initMeeting = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📱 开始初始化视频会议...');
      console.log('📱 设备信息:', deviceInfo);

      // 获取用户信息
      const currentUser = getCurrentUser();
      const userId = currentUser.id;
      const userName = searchParams.get('userName') || currentUser.name;

      console.log('📱 用户信息:', { userId, userName, roomId });

      // 从后端获取Token
      const response = await generateZegoToken({
        userId,
        roomId: roomId!,
        userName,
        expireTime: 7200,
      });

      if (!response.success || !response.data?.token) {
        throw new Error('获取视频Token失败');
      }

      const baseToken = response.data.token;
      const appId = response.data.appId;

      console.log('📱 Token获取成功');

      // 生成Kit Token
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        appId,
        baseToken,
        roomId!,
        userId,
        userName
      );

      if (!meetingContainerRef.current) {
        throw new Error('视频容器未找到');
      }

      // 清理容器
      meetingContainerRef.current.innerHTML = '';

      // 创建ZEGO实例
      const zegoInstance = ZegoUIKitPrebuilt.create(kitToken);
      zegoInstanceRef.current = zegoInstance;

      // 获取最优配置
      const optimalConfig = DeviceDetector.getOptimalZegoConfig();
      console.log('📱 最优配置:', optimalConfig);

      // 加入房间
      await zegoInstance.joinRoom({
        container: meetingContainerRef.current,
        scenario: {
          mode: ZegoUIKitPrebuilt.VideoConference,
        },

        // 显示控制
        showMyCameraToggleButton: true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: !deviceInfo.isMobile, // 移动端隐藏
        showTextChat: true,
        showUserList: true,
        showRemoveUserButton: false,
        showPinButton: !deviceInfo.isMobile, // 移动端隐藏
        showRoomDetailsButton: !deviceInfo.isMobile, // 移动端隐藏
        showScreenSharingButton: !deviceInfo.isMobile, // 移动端隐藏屏幕共享
        showLayoutButton: !deviceInfo.isMobile, // 移动端隐藏布局切换

        // 通知设置
        lowerLeftNotification: {
          showUserJoinAndLeave: true,
          showTextChat: true,
        },

        // 视频配置 - 根据设备自适应
        videoResolutionDefault: deviceInfo.isMobile || deviceInfo.isSmallScreen
          ? ZegoUIKitPrebuilt.VideoResolution_360P
          : ZegoUIKitPrebuilt.VideoResolution_720P,

        videoCodec: 'H264' as const,
        // 移动端使用前置摄像头
        turnOnCameraWhenJoining: true,
        turnOnMicrophoneWhenJoining: true,
	        showPreJoinView: DeviceDetector.isIOS() || DeviceDetector.isWeChat(),
        useFrontFacingCamera: deviceInfo.isMobile,

        // 布局配置
        layout: deviceInfo.isMobile ? 'Auto' : 'Grid',

        // 最大视频数量 - 移动端限制
        maxUsers: deviceInfo.isMobile ? 4 : 6,

        // 回调函数
        onJoinRoom: () => {
          console.log('✅ 成功加入房间');
          message.success('已加入视频面试');
          setLoading(false);

          // 移动端锁定屏幕方向
          if (deviceInfo.isMobile) {
            DeviceDetector.lockOrientation('portrait');
          }
        },

        onLeaveRoom: () => {
          console.log('📱 离开房间');
          message.info('已离开视频面试');
          navigate('/interview/list');
        },

        onUserJoin: (users: any[]) => {
          console.log('✅ 用户加入:', users);
          users.forEach(user => {
            message.info(`${user.userName} 加入了会议`);
          });
        },

        onUserLeave: (users: any[]) => {
          console.log('👋 用户离开:', users);
          users.forEach(user => {
            message.info(`${user.userName} 离开了会议`);
          });
        },
      });

      console.log('✅ 视频会议初始化完成');
    } catch (error: any) {
      console.error('❌ 初始化视频会议失败:', error);
      setError(error.message || '初始化视频会议失败');
      message.error(error.message || '初始化视频会议失败');
      setLoading(false);
    }
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className="video-interview-loading">
        <Spin size="large" />
        <p className="loading-text">
          {deviceInfo.isMobile ? '正在加载移动端视频面试...' : '正在加载视频面试...'}
        </p>
        <p className="loading-tip">
          {deviceInfo.isMobile
            ? '建议使用WiFi网络以获得更好的体验'
            : '请确保已允许摄像头和麦克风权限'}
        </p>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="video-interview-error">
        <div className="error-icon">❌</div>
        <h2>加载失败</h2>
        <p>{error}</p>
        <button
          className="retry-button"
          onClick={() => {
            setError(null);
            initMeeting();
          }}
        >
          重试
        </button>
        <button
          className="back-button"
          onClick={() => navigate('/interview/list')}
        >
          返回列表
        </button>
      </div>
    );
  }

  // 渲染视频容器
  return (
    <div className={`video-interview-container ${deviceInfo.isMobile ? 'mobile' : 'desktop'}`}>
      {/* 视频容器 */}
      <div
        ref={meetingContainerRef}
        className="meeting-container"
        style={{
          width: '100%',
          height: '100%',
        }}
      />

      {/* 移动端提示 */}
      {deviceInfo.isMobile && (
        <div className="mobile-tips">
          <p>💡 提示: 横屏可获得更好的视频体验</p>
        </div>
      )}

      {/* 网络状态提示 */}
      {DeviceDetector.isSlowNetwork() && (
        <div className="network-warning">
          <p>⚠️ 当前网络较慢,可能影响视频质量</p>
        </div>
      )}
    </div>
  );
};

export default VideoInterviewOptimized;

