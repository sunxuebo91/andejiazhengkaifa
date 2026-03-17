import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { message, Button, Input, Select, Form, Spin } from 'antd';
import { WifiOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import DeviceDetector from '../../utils/deviceDetector';
import './JoinInterviewMobile.css';

// 声明微信小程序 API
declare const wx: any;

const { Option } = Select;

// 检测是否在微信小程序中
const isInMiniProgram = () => {
  return typeof wx !== 'undefined' && wx.miniProgram;
};

// 向小程序发送消息
const postMessageToMiniProgram = (data: any) => {
  if (isInMiniProgram()) {
    try {
      wx.miniProgram.postMessage({ data });
      console.log('📤 向小程序发送消息:', data);
    } catch (error) {
      console.error('向小程序发送消息失败:', error);
    }
  }
};

// ==================== 新增：连接状态类型 ====================
type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'failed';

// 网络质量等级对应的颜色
const networkQualityColors: Record<string, string> = {
  excellent: '#52c41a',
  good: '#52c41a',
  fair: '#faad14',
  poor: '#ff4d4f',
  unknown: '#999',
};

interface JoinFormValues {
  userName: string;
  role: 'customer' | 'helper';
}

interface GuestInfo {
  guestId: string;
  userName: string;
  role: string;
}

const JoinInterviewMobile: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const zegoInstanceRef = useRef<any>(null);

  const [inMeeting, setInMeeting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [zegoToken, setZegoToken] = useState<string>('');
  const [form] = Form.useForm();
  const autoJoinAttemptedRef = useRef(false); // 🎯 防止重复自动加入

  // 📱 设备信息
  // const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [networkQuality, setNetworkQuality] = useState<string>('unknown');

  // ==================== 新增：断线重连状态 ====================
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5; // 最大重连次数
  const reconnectInterval = 3000; // 重连间隔（毫秒）

  // 🚀 初始化设备检测
  useEffect(() => {
    // const info = DeviceDetector.getDeviceInfo();
    // setDeviceInfo(info);
    DeviceDetector.logDeviceInfo();

    // 检测网络质量
    checkNetworkQuality();

    // ==================== 新增：监听网络状态变化 ====================
    const handleOnline = () => {
      console.log('📶 网络已恢复');
      message.success('网络已恢复');
      if (connectionState === 'disconnected' || connectionState === 'reconnecting') {
        attemptReconnect();
      }
    };

    const handleOffline = () => {
      console.log('📶 网络已断开');
      message.warning('网络已断开，正在尝试重连...');
      setConnectionState('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connectionState]);

  // 🎯 检查是否有缓存的访客信息，如果有则自动加入
  useEffect(() => {
    if (!roomId || inMeeting || autoJoinAttemptedRef.current) return;

    // 尝试从 localStorage 获取之前的访客信息
    const tryAutoJoin = () => {
      // 遍历可能的角色
      const roles = ['customer', 'helper'];

      for (const role of roles) {
        // 尝试查找该角色的缓存
        const storagePattern = `guest_id_${roomId}_`;
        const keys = Object.keys(localStorage).filter(key =>
          key.startsWith(storagePattern) && key.includes(`_${role}`)
        );

        if (keys.length > 0) {
          // 找到缓存，提取姓名
          const key = keys[0];
          const timeKey = key.replace('guest_id_', 'guest_id_time_');
          const guestId = localStorage.getItem(key);
          const storedTime = localStorage.getItem(timeKey);

          // 检查是否过期（1小时）
          if (guestId && storedTime) {
            const elapsed = Date.now() - parseInt(storedTime);
            if (elapsed < 3600000) {
              // 提取姓名（格式：guest_id_roomId_userName_role）
              const parts = key.split('_');
              const userName = parts.slice(3, -1).join('_'); // 姓名可能包含下划线

              console.log('📱 检测到缓存的访客信息，准备自动加入:', { userName, role, guestId });

              // 设置表单值
              form.setFieldsValue({ userName, role });

              // 延迟自动提交，确保表单已渲染
              setTimeout(() => {
                console.log('✅ 自动提交表单，重新加入房间');
                form.submit();
              }, 500);

              autoJoinAttemptedRef.current = true;
              return true;
            }
          }
        }
      }
      return false;
    };

    tryAutoJoin();
  }, [roomId, inMeeting, form]);

  // 检测网络质量
  const checkNetworkQuality = async () => {
    try {
      const startTime = Date.now();
      await fetch('https://zego-webrtc-express.zegocloud.com/ping', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      const latency = Date.now() - startTime;

      let quality = 'good';
      if (latency > 500) quality = 'poor';
      else if (latency > 300) quality = 'fair';
      else if (latency < 100) quality = 'excellent';

      setNetworkQuality(quality);
      console.log(`📶 访客端网络质量: ${quality} (延迟: ${latency}ms)`);
    } catch (error) {
      console.error('网络质量检测失败:', error);
      setNetworkQuality('unknown');
    }
  };

  // ==================== 新增：断线重连逻辑 ====================
  const attemptReconnect = useCallback(async () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setConnectionState('failed');
      message.error('重连失败，请刷新页面重试');
      return;
    }

    if (!guestInfo || !roomId) {
      console.log('❌ 缺少访客信息，无法重连');
      return;
    }

    setConnectionState('reconnecting');
    setReconnectAttempts(prev => prev + 1);
    console.log(`🔄 尝试第 ${reconnectAttempts + 1} 次重连...`);

    try {
      // 先检测网络质量
      await checkNetworkQuality();

      // 销毁旧的 ZEGO 实例
      if (zegoInstanceRef.current) {
        try {
          zegoInstanceRef.current.destroy();
          zegoInstanceRef.current = null;
        } catch (e) {
          console.warn('销毁旧实例失败:', e);
        }
      }

      // 重新生成 Token
      const { token: baseToken, appId } = await generateGuestToken(
        guestInfo.guestId,
        guestInfo.userName,
        guestInfo.role as 'customer' | 'helper'
      );

      // 重新生成 Kit Token
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        appId,
        baseToken,
        roomId,
        guestInfo.guestId,
        guestInfo.userName
      );

      setZegoToken(kitToken);
      setConnectionState('connected');
      setReconnectAttempts(0);
      message.success('重连成功！');
      console.log('✅ 重连成功');

      // 触发重新初始化 ZEGO
      // 由于 zegoToken 变化，useEffect 会自动重新初始化
    } catch (error: any) {
      console.error('重连失败:', error);

      // 设置延迟重试
      reconnectTimerRef.current = setTimeout(() => {
        attemptReconnect();
      }, reconnectInterval);
    }
  }, [reconnectAttempts, guestInfo, roomId]);

  // 手动重连按钮
  const handleManualReconnect = () => {
    setReconnectAttempts(0);
    attemptReconnect();
  };

  // 生成访客 Token
  const generateGuestToken = async (guestId: string, userName: string, role: 'customer' | 'helper') => {
    try {
      const response = await axios.post('/api/zego/generate-guest-token', {
        userId: guestId, // 后端期望的字段名是 userId
        userName,
        roomId,
        role,
        expireTime: 7200, // 2小时
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || '生成 Token 失败');
      }
    } catch (error: any) {
      console.error('生成访客 Token 失败:', error);
      throw error;
    }
  };

  // 加入视频房间
  const joinMeeting = async (values: JoinFormValues) => {
    try {
      console.log('📱 移动端访客加入视频面试房间...', { roomId, ...values });
      setLoading(true);

      if (!roomId) {
        throw new Error('房间ID无效');
      }

      // 如果姓名为空，使用默认名称
      const userName = values.userName?.trim() || (values.role === 'customer' ? '客户' : '阿姨');

      // 🔧 生成或获取持久化的访客 ID（支持会话恢复）
      const storageKey = `guest_id_${roomId}_${userName}_${values.role}`;
      const storageTimeKey = `guest_id_time_${roomId}_${userName}_${values.role}`;

      let guestId = localStorage.getItem(storageKey);
      const storedTime = localStorage.getItem(storageTimeKey);

      // 检查是否过期（1小时 = 3600000ms）
      const isExpired = storedTime && Date.now() - parseInt(storedTime) > 3600000;

      if (!guestId || isExpired) {
        // 首次进入或ID已过期，生成新的访客ID
        // ZEGO userId 要求：只能包含字母、数字、下划线，长度不超过32位
        // 使用纯数字+字母的格式，避免下划线开头
        const timestamp = Date.now().toString();
        const randomStr = Math.random().toString(36).substring(2, 9);
        guestId = `guest${timestamp}${randomStr}`; // 移除下划线，避免 ZEGO userId invalid 错误
        localStorage.setItem(storageKey, guestId);
        localStorage.setItem(storageTimeKey, Date.now().toString());
        console.log(
          isExpired ? '⏰ ID已过期，生成新访客ID:' : '✅ 首次进入，生成新访客ID:',
          guestId
        );
      } else {
        // 重新进入，使用已有的访客ID（会话恢复）
        console.log('🔄 会话恢复，使用已有访客ID:', guestId);
        // 更新时间戳
        localStorage.setItem(storageTimeKey, Date.now().toString());
      }

      const displayName = `${userName}（${
        values.role === 'customer' ? '客户' : '阿姨'
      }）`;

      // 生成 Token
      const { token: baseToken, appId } = await generateGuestToken(guestId, displayName, values.role);
      console.log('获取到 Base Token:', baseToken.substring(0, 20) + '...');
      console.log('=== 移动端访客 - 房间信息 ===');
      console.log('房间ID:', roomId);
      console.log('访客ID:', guestId);
      console.log('显示名称:', displayName);

      // 生成 Kit Token
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        appId,
        baseToken,
        roomId,
        guestId,
        displayName
      );
      console.log('生成 Kit Token 成功');

      // 保存信息并进入房间
      setGuestInfo({ userName: displayName, role: values.role, guestId });
      setZegoToken(kitToken);
      setInMeeting(true);
      setLoading(false);

      console.log('✅ 访客信息已保存，等待容器渲染...');
    } catch (error: any) {
      console.error('加入视频面试失败:', error);
      message.error(error.response?.data?.message || error.message || '加入视频面试失败，请重试');
      setLoading(false);
    }
  };

  // 初始化 ZEGO SDK（在容器渲染后）
  useEffect(() => {
    if (inMeeting && zegoToken && guestInfo && meetingContainerRef.current && !zegoInstanceRef.current) {
      console.log('📱 容器已渲染，开始初始化 ZEGO...');

      // 清理容器内容
      if (meetingContainerRef.current) {
        meetingContainerRef.current.innerHTML = '';
      }

      try {
        // 创建 ZEGO 实例
        const zegoInstance = ZegoUIKitPrebuilt.create(zegoToken);
        zegoInstanceRef.current = zegoInstance;

        // 🚀 获取设备优化配置
        const optimalConfig = DeviceDetector.getOptimalZegoConfig();
        const optimalResolution = DeviceDetector.getZegoResolutionEnum(ZegoUIKitPrebuilt);

        console.log('📱 访客端 - 设备优化配置:', {
          分辨率: optimalConfig.videoResolution,
          帧率: optimalConfig.frameRate,
          码率: optimalConfig.bitrate,
          网络质量: networkQuality,
        });

        // 加入房间 - 移动端优化配置
        zegoInstance.joinRoom({
          container: meetingContainerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall, // 使用群组通话模式，和 PC 端一致
          },
          // 🎯 关键配置：显示预加入页面（半透明背景，用户可以填写信息）
          showPreJoinView: true,
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          // 🌐 设置语言为中文
          language: 'zh-CN' as any,
          // 移动端优化配置 - 使用 ZEGO 自带的 UI
          showMyCameraToggleButton: true, // ✅ 显示摄像头按钮
          showMyMicrophoneToggleButton: true, // ✅ 显示麦克风按钮
          showAudioVideoSettingsButton: true, // ✅ 显示音视频设置（包含美颜）
          showTextChat: true, // ✅ 显示聊天
          showUserList: true, // ✅ 显示成员列表
          showScreenSharingButton: false, // ❌ 移动端不支持屏幕共享
          showLayoutButton: false, // ❌ 不显示布局切换
          showNonVideoUser: true,
          showOnlyAudioUser: true,
          showUserName: true, // ✅ 显示用户名
          showRoomTimer: false,
          // 访客权限：不能管理他人
          showTurnOffRemoteCameraButton: false,
          showTurnOffRemoteMicrophoneButton: false,
          showRemoveUserButton: false,
          lowerLeftNotification: {
            showUserJoinAndLeave: false,
            showTextChat: false,
          },
          // 视频配置 - 使用智能分辨率
          videoResolutionDefault: optimalResolution,
	          videoCodec: 'H264' as const,
          maxUsers: 6, // 最多6人
          layout: 'Grid' as const, // 使用网格布局
          // 回调
          onJoinRoom: () => {
            console.log('✅ 移动端访客成功加入房间');
            message.success('已加入视频面试');
            setConnectionState('connected');
            setReconnectAttempts(0);

            // 通知小程序加入成功
            postMessageToMiniProgram({
              type: 'joined',
              message: '已加入视频面试',
              roomId,
              userName: guestInfo.userName
            });
          },
          onLeaveRoom: () => {
            console.log('📱 移动端访客离开房间');
            setInMeeting(false);
            setGuestInfo(null);
            zegoInstanceRef.current = null;
            setConnectionState('connected');
          },
          onUserJoin: (users: any[]) => {
            console.log('✅ 用户加入房间:', users);
          },
          onUserLeave: (users: any[]) => {
            console.log('🔧 用户离开房间:', users);
          },
        });

        console.log('✅ 移动端访客视频会议初始化完成');
      } catch (error: any) {
        console.error('初始化 ZEGO 失败:', error);
        message.error(error.message || '初始化视频失败');
        setInMeeting(false);
      }
    }
  }, [inMeeting, zegoToken, guestInfo, roomId, networkQuality]);

  // 监听页面关闭
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🔧 检测到页面即将关闭/刷新，主动调用离开房间');

      if (zegoInstanceRef.current) {
        try {
          zegoInstanceRef.current.destroy();
          console.log('✅ ZEGO 实例已销毁（页面关闭）');
        } catch (error) {
          console.error('销毁 ZEGO 实例失败:', error);
        }
      }

      if (guestInfo && roomId) {
        const userId = guestInfo.guestId;
        const leaveData = JSON.stringify({ roomId, userId });
        const blob = new Blob([leaveData], { type: 'application/json' });
        navigator.sendBeacon(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/zego/leave-room`,
          blob
        );
        console.log('✅ 已发送离开房间请求（sendBeacon）');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (zegoInstanceRef.current) {
        zegoInstanceRef.current.destroy();
      }
    };
  }, [guestInfo, roomId]);

  // 如果已经在会议中，显示视频界面（使用 ZEGO 自带的 UI）
  if (inMeeting) {
    return (
      <div className="join-interview-mobile">
        {/* 视频容器 - ZEGO 会在这里渲染完整的 UI，包括所有控制按钮 */}
        <div className="video-container-mobile" ref={meetingContainerRef}></div>

        {/* ==================== 新增：网络状态指示器 ==================== */}
        <div className="network-indicator" style={{
          position: 'fixed',
          top: 8,
          right: 8,
          zIndex: 1000,
          padding: '4px 8px',
          borderRadius: 4,
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <WifiOutlined style={{ color: networkQualityColors[networkQuality] || '#999' }} />
          <span style={{ color: networkQualityColors[networkQuality] || '#999' }}>
            {networkQuality === 'excellent' ? '极佳' :
             networkQuality === 'good' ? '良好' :
             networkQuality === 'fair' ? '一般' :
             networkQuality === 'poor' ? '较差' : '检测中'}
          </span>
        </div>

        {/* ==================== 新增：断线重连遮罩层 ==================== */}
        {(connectionState === 'disconnected' || connectionState === 'reconnecting' || connectionState === 'failed') && (
          <div className="reconnect-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            color: '#fff',
          }}>
            {connectionState === 'reconnecting' && (
              <>
                <Spin size="large" />
                <p style={{ marginTop: 16, fontSize: 16 }}>
                  正在重新连接... ({reconnectAttempts}/{maxReconnectAttempts})
                </p>
                <p style={{ color: '#999', fontSize: 12 }}>请保持网络畅通</p>
              </>
            )}

            {connectionState === 'disconnected' && (
              <>
                <WarningOutlined style={{ fontSize: 48, color: '#faad14' }} />
                <p style={{ marginTop: 16, fontSize: 16 }}>网络已断开</p>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleManualReconnect}
                  style={{ marginTop: 16 }}
                >
                  立即重连
                </Button>
              </>
            )}

            {connectionState === 'failed' && (
              <>
                <WarningOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
                <p style={{ marginTop: 16, fontSize: 16 }}>重连失败</p>
                <p style={{ color: '#999', fontSize: 12 }}>已尝试 {maxReconnectAttempts} 次</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={handleManualReconnect}
                  >
                    再试一次
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    刷新页面
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // 显示加入表单
  return (
    <div className="join-form-mobile">
      <div className="join-form-container">
        <h2>🎥 加入视频面试</h2>
        <p className="room-id">房间号：{roomId}</p>

        <Form form={form} onFinish={joinMeeting} layout="vertical">
          <Form.Item
            label="您的姓名（选填）"
            name="userName"
          >
            <Input
              placeholder="请输入您的姓名"
              size="large"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            label="您的身份"
            name="role"
            rules={[{ required: true, message: '请选择您的身份' }]}
          >
            <Select
              placeholder="请选择您的身份"
              size="large"
              disabled={loading}
            >
              <Option value="customer">👤 我是客户</Option>
              <Option value="helper">👩‍🔧 我是阿姨</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              disabled={loading}
              block
              style={{
                height: '48px',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              {loading ? '加载中...' : '进入面试间'}
            </Button>
          </Form.Item>
        </Form>

        {!loading && (
          <div className="tips">
            <p>💡 温馨提示：</p>
            <ul>
              <li>请确保网络连接稳定</li>
              <li>请允许浏览器访问摄像头和麦克风</li>
              <li>建议使用耳机以获得更好的通话质量</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinInterviewMobile;

