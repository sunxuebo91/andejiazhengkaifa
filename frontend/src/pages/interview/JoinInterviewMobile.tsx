import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { message, Modal, Button, Input, Select, Form } from 'antd';
import axios from 'axios';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import {
  AudioOutlined,
  AudioMutedOutlined,
  VideoCameraOutlined,
  VideoCameraAddOutlined,
  SwapOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
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
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // 生成访客 Token
  const generateGuestToken = async (guestId: string, userName: string) => {
    try {
      const response = await axios.post('/api/zego/generate-guest-token', {
        guestId,
        userName,
        roomId,
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

      // 🔧 生成或获取持久化的访客 ID（支持会话恢复）
      const storageKey = `guest_id_${roomId}_${values.userName}_${values.role}`;
      const storageTimeKey = `guest_id_time_${roomId}_${values.userName}_${values.role}`;

      let guestId = localStorage.getItem(storageKey);
      const storedTime = localStorage.getItem(storageTimeKey);

      // 检查是否过期（1小时 = 3600000ms）
      const isExpired = storedTime && Date.now() - parseInt(storedTime) > 3600000;

      if (!guestId || isExpired) {
        // 首次进入或ID已过期，生成新的访客ID
        guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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

      const displayName = `${values.userName}（${
        values.role === 'customer' ? '客户' : '阿姨'
      }）`;

      // 生成 Token
      const tokenData = await generateGuestToken(guestId, displayName);

      if (!meetingContainerRef.current) {
        throw new Error('视频容器未找到');
      }

      // 创建 ZEGO 实例
      const zegoInstance = ZegoUIKitPrebuilt.create(tokenData.token);
      zegoInstanceRef.current = zegoInstance;

      // 加入房间 - 移动端配置
      await zegoInstance.joinRoom({
        container: meetingContainerRef.current,
        scenario: {
          mode: ZegoUIKitPrebuilt.VideoConference,
        },
        // 移动端优化配置
        showScreenSharingButton: false,
        showLayoutButton: false,
        showNonVideoUser: true,
        showOnlyAudioUser: true,
        showUserList: false,
        showRoomTimer: false,
        showTurnOffRemoteCameraButton: false,
        showTurnOffRemoteMicrophoneButton: false,
        showRemoveUserButton: false,
        lowerLeftNotification: {
          showUserJoinAndLeave: false,
          showTextChat: false,
        },
        // 自定义UI
        showMyCameraToggleButton: false,
        showMyMicrophoneToggleButton: false,
        showAudioVideoSettingsButton: true, // 移动端也显示音视频设置（包含美颜）
        showTextChat: false,
        showUserName: false,
        // 视频配置
        videoResolutionDefault: ZegoUIKitPrebuilt.VideoResolution_360P,
        // 🎨 美颜功能通过音视频设置按钮访问
        // 回调
        onJoinRoom: () => {
          console.log('✅ 移动端访客成功加入房间');
          setInMeeting(true);
          setGuestInfo({
            guestId,
            userName: values.userName,
            role: values.role,
          });
          message.success('已加入视频面试');

          // 通知小程序加入成功
          postMessageToMiniProgram({
            type: 'joined',
            message: '已加入视频面试',
            roomId,
            userName: values.userName
          });
        },
        onLeaveRoom: () => {
          console.log('📱 移动端访客离开房间');
          setInMeeting(false);
          setGuestInfo(null);
          zegoInstanceRef.current = null;
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
      console.error('加入视频面试失败:', error);
      message.error(error.message || '加入视频面试失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换麦克风
  const toggleMicrophone = () => {
    if (zegoInstanceRef.current) {
      const newState = !isMuted;
      zegoInstanceRef.current.setMicrophoneState(!newState);
      setIsMuted(newState);
      message.info(newState ? '麦克风已关闭' : '麦克风已开启');
    }
  };

  // 切换摄像头
  const toggleCamera = () => {
    if (zegoInstanceRef.current) {
      const newState = !isVideoOff;
      zegoInstanceRef.current.setCameraState(!newState);
      setIsVideoOff(newState);
      message.info(newState ? '摄像头已关闭' : '摄像头已开启');
    }
  };

  // 翻转摄像头
  const switchCamera = () => {
    if (zegoInstanceRef.current) {
      zegoInstanceRef.current.useFrontFacingCamera(
        !zegoInstanceRef.current.isFrontFacingCamera()
      );
      message.info('摄像头已切换');
    }
  };

  // 挂断
  const hangUp = () => {
    Modal.confirm({
      title: '确认离开',
      content: '确定要离开视频面试吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        if (zegoInstanceRef.current) {
          zegoInstanceRef.current.destroy();
        }
        setInMeeting(false);
        setGuestInfo(null);

        // 通知小程序用户已离开
        postMessageToMiniProgram({
          type: 'leave',
          message: '用户已离开视频面试'
        });

        // 如果在小程序中，返回上一页
        if (isInMiniProgram()) {
          setTimeout(() => {
            wx.miniProgram.navigateBack();
          }, 500);
        }
      },
    });
  };

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

  // 如果已经在会议中，显示视频界面
  if (inMeeting) {
    return (
      <div className="join-interview-mobile">
        {/* 视频容器 */}
        <div className="video-container-mobile" ref={meetingContainerRef}></div>

        {/* 底部工具栏 */}
        <div className="toolbar-mobile">
          <div className="toolbar-item" onClick={toggleMicrophone}>
            {isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
            <span>麦克风</span>
          </div>

          <div className="toolbar-item" onClick={switchCamera}>
            <SwapOutlined />
            <span>翻转</span>
          </div>

          <div className="toolbar-item" onClick={toggleCamera}>
            {isVideoOff ? <VideoCameraAddOutlined /> : <VideoCameraOutlined />}
            <span>摄像头</span>
          </div>
        </div>

        {/* 挂断按钮 */}
        <div className="hangup-button-mobile" onClick={hangUp}>
          <PhoneOutlined rotate={135} />
        </div>
      </div>
    );
  }

  // 显示加入表单
  return (
    <div className="join-form-mobile">
      <div className="join-form-container">
        <h2>加入视频面试</h2>
        <p className="room-id">房间号：{roomId}</p>

        <Form onFinish={joinMeeting} layout="vertical">
          <Form.Item
            label="您的姓名"
            name="userName"
            rules={[{ required: true, message: '请输入您的姓名' }]}
          >
            <Input placeholder="请输入您的姓名" size="large" />
          </Form.Item>

          <Form.Item
            label="您的身份"
            name="role"
            rules={[{ required: true, message: '请选择您的身份' }]}
          >
            <Select placeholder="请选择您的身份" size="large">
              <Option value="customer">客户</Option>
              <Option value="helper">阿姨</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              加入面试
            </Button>
          </Form.Item>
        </Form>

        <div className="tips">
          <p>💡 温馨提示：</p>
          <ul>
            <li>请确保网络连接稳定</li>
            <li>请允许浏览器访问摄像头和麦克风</li>
            <li>建议使用耳机以获得更好的通话质量</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JoinInterviewMobile;

