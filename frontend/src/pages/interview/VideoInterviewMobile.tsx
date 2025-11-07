import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message, Modal } from 'antd';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { generateZegoToken } from '../../services/zego';
import {
  AudioOutlined,
  AudioMutedOutlined,
  VideoCameraOutlined,
  VideoCameraAddOutlined,
  SwapOutlined,
  UserAddOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import './VideoInterviewMobile.css';

// interface Participant {
//   userId: string;
//   userName: string;
//   isMuted: boolean;
//   isVideoOff: boolean;
// }

const VideoInterviewMobile: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const zegoInstanceRef = useRef<any>(null);
  // const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // 获取当前用户信息（与PC端完全一致）
  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return {
          id: user._id || user.id || `user_${Date.now()}`,
          name: user.name || user.username || '用户',
        };
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
    return {
      id: `user_${Date.now()}`,
      name: '用户',
    };
  };

  // 初始化视频会议（与PC端逻辑完全一致）
  const initMeeting = async () => {
    try {
      console.log('📱 移动端 - 开始初始化视频会议');
      const currentUser = getCurrentUser();
      console.log('📱 当前用户:', currentUser);
      const userId = currentUser.id;
      const userName = currentUser.name;
      console.log('📱 房间ID:', roomId);
      console.log('📱 请求参数:', { userId, roomId, userName });

      // 从后端获取配置和 Token（与PC端完全一致）
      const response = await generateZegoToken({
        userId,
        roomId: roomId!,
        userName,
        expireTime: 7200, // 2小时
      });

      console.log('📱 Token 响应:', response);

      if (!response.success || !response.data?.token) {
        throw new Error('获取视频Token失败');
      }

      const baseToken = response.data.token;
      const appId = response.data.appId;
      console.log('📱 获取到 Base Token:', baseToken.substring(0, 20) + '...');
      console.log('📱 AppID:', appId);

      // 使用 base token 生成 Kit Token（与PC端完全一致）
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        appId,
        baseToken,
        roomId!,
        userId,
        userName
      );
      console.log('📱 生成 Kit Token:', kitToken.substring(0, 20) + '...');

      if (!meetingContainerRef.current) {
        throw new Error('视频容器未找到');
      }

      // 移动端优化配置（使用kitToken，与PC端一致）
      const zegoInstance = ZegoUIKitPrebuilt.create(kitToken);
      zegoInstanceRef.current = zegoInstance;

      // 加入房间 - 移动端优化配置
      await zegoInstance.joinRoom({
        container: meetingContainerRef.current,
        scenario: {
          mode: ZegoUIKitPrebuilt.VideoConference,
        },

        // 移动端UI优化
        layout: 'Auto', // 自动布局，适配移动端
        autoHideFooter: false, // 工具栏固定显示在底部，不自动隐藏
        showLayoutButton: true, // 显示布局切换按钮
        showScreenSharingButton: false, // 移动端不显示屏幕共享
        showNonVideoUser: true, // 显示无视频用户
        showOnlyAudioUser: true, // 显示纯音频用户
        showUserList: true, // 显示用户列表
        showRoomTimer: true, // 显示房间计时器
        showTurnOffRemoteCameraButton: false, // 不显示关闭远程摄像头按钮
        showTurnOffRemoteMicrophoneButton: false, // 不显示关闭远程麦克风按钮
        showRemoveUserButton: false, // 不显示移除用户按钮
        showMyCameraToggleButton: true, // 显示摄像头切换按钮
        showMyMicrophoneToggleButton: true, // 显示麦克风切换按钮
        showAudioVideoSettingsButton: true, // 显示音视频设置按钮
        showTextChat: true, // 显示文字聊天
        showUserName: true, // 显示用户名
        showPinButton: true, // 显示固定按钮
        showMoreButton: true, // 显示更多按钮
        showRoomDetailsButton: true, // 显示房间详情按钮

        lowerLeftNotification: {
          showUserJoinAndLeave: true, // 显示用户进出提示
          showTextChat: true, // 显示聊天消息提示
        },

        // 视频配置
        videoResolutionDefault: ZegoUIKitPrebuilt.VideoResolution_720P, // 使用720P高清
        turnOnCameraWhenJoining: true, // 加入时打开摄像头
        turnOnMicrophoneWhenJoining: true, // 加入时打开麦克风
        useFrontFacingCamera: true, // 使用前置摄像头

        // 回调
        onJoinRoom: () => {
          console.log('✅ 移动端 - 成功加入房间');
          message.success('已加入视频面试');
        },
        onLeaveRoom: () => {
          console.log('📱 移动端 - 离开房间');
          navigate('/interview/list');
        },
        onUserJoin: (users: any[]) => {
          console.log('✅ 用户加入:', users);
        },
        onUserLeave: (users: any[]) => {
          console.log('🔧 用户离开:', users);
        },
      });

      console.log('✅ 移动端视频会议初始化完成');
    } catch (error: any) {
      console.error('初始化视频会议失败:', error);
      message.error(error.message || '初始化视频会议失败');
    }
  };

  // 更新参与者列表
  // const updateParticipants = (users: any[], action: 'join' | 'leave') => {
  //   setParticipants((prev) => {
  //     if (action === 'join') {
  //       const newUsers = users.filter(
  //         (u) => !prev.some((p) => p.userId === u.userID)
  //       );
  //       return [
  //         ...prev,
  //         ...newUsers.map((u) => ({
  //           userId: u.userID,
  //           userName: u.userName,
  //           isMuted: false,
  //           isVideoOff: false,
  //         })),
  //       ];
  //     } else {
  //       return prev.filter((p) => !users.some((u) => u.userID === p.userId));
  //     }
  //   });
  // };

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

  // 开始/停止录制
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    message.info(isRecording ? '录制已停止' : '录制已开始');
  };

  // 邀请用户
  const inviteUser = () => {
    const inviteLink = `${window.location.origin}/interview/join/${roomId}`;
    
    // 移动端分享
    if (navigator.share) {
      navigator
        .share({
          title: '视频面试邀请',
          text: `邀请您参加视频面试，房间号：${roomId}`,
          url: inviteLink,
        })
        .then(() => message.success('分享成功'))
        .catch((error) => console.log('分享失败:', error));
    } else {
      // 复制链接
      navigator.clipboard.writeText(inviteLink).then(() => {
        message.success('邀请链接已复制到剪贴板');
      });
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
        navigate('/interview/list');
      },
    });
  };

  useEffect(() => {
    initMeeting();

    return () => {
      if (zegoInstanceRef.current) {
        zegoInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="video-interview-mobile">
      {/* 视频容器 */}
      <div className="video-container-mobile" ref={meetingContainerRef}></div>

      {/* 底部工具栏 */}
      <div className="toolbar-mobile">
        <div className="toolbar-item" onClick={toggleRecording}>
          <AudioOutlined className={isRecording ? 'active' : ''} />
          <span>录音</span>
        </div>

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
          <span>画面录制</span>
        </div>

        <div className="toolbar-item" onClick={inviteUser}>
          <UserAddOutlined />
          <span>邀请</span>
        </div>
      </div>

      {/* 挂断按钮 */}
      <div className="hangup-button-mobile" onClick={hangUp}>
        <PhoneOutlined rotate={135} />
      </div>
    </div>
  );
};

export default VideoInterviewMobile;

