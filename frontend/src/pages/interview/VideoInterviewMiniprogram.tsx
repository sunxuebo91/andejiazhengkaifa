import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Space, message, Modal, Spin, Slider, Drawer } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { generateZegoToken } from '../../services/zego';
import { apiService } from '../../services/api';
import './VideoInterviewMiniprogram.css';

/**
 * 小程序端视频面试页面
 * 用于家政人员的视频面试功能（小程序内嵌WebView）
 * 支持：3-6人视频面试、美颜、提词器、房间管理等功能
 * UI适配小程序规范
 */
const VideoInterviewMiniprogram: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [inMeeting, setInMeeting] = useState(false);
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const zegoInstanceRef = useRef<any>(null);
  const [zegoToken, setZegoToken] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<{ roomId: string; userName: string } | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // 📝 提词器相关状态
  const [teleprompterDrawerVisible, setTeleprompterDrawerVisible] = useState(false);
  const [teleprompterContent, setTeleprompterContent] = useState('');
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(50);
  const teleprompterHeight = '50vh';
  const selectedParticipants = ['ALL'];

  // 🎨 美颜相关状态
  const [beautyDrawerVisible, setBeautyDrawerVisible] = useState(false);
  const [beautyEnabled, setBeautyEnabled] = useState(false);
  const [beautyParams, setBeautyParams] = useState({
    whitening: 50,
    smoothing: 60,
    sharpening: 30,
    rosiness: 40
  });
  const [participants, setParticipants] = useState<Array<{ userId: string; userName: string }>>([]);

  // 🔧 定期清理检查定时器
  const cleanupIntervalRef = useRef<any>(null);

  // 📝 提词器控制函数
  const pushTeleprompterContent = async () => {
    if (!teleprompterContent.trim()) {
      message.warning('请输入提词内容');
      return;
    }

    if (!roomInfo) {
      message.error('请先加入房间');
      return;
    }

    try {
      const response = await apiService.post('/api/zego/push-teleprompter', {
        roomId: roomInfo.roomId,
        content: teleprompterContent,
        targetUserIds: selectedParticipants,
        scrollSpeed: teleprompterSpeed,
        displayHeight: teleprompterHeight,
      });

      if (response.success) {
        message.success('提词内容已推送');
      } else {
        throw new Error(response.message || '推送失败');
      }
    } catch (error: any) {
      console.error('推送提词内容失败:', error);
      message.error(error.message || '推送失败，请重试');
    }
  };

  // 控制提词器播放状态
  const controlTeleprompter = async (action: 'PLAY' | 'PAUSE' | 'STOP') => {
    if (!roomInfo) {
      message.error('请先加入房间');
      return;
    }

    try {
      const response = await apiService.post('/api/zego/control-teleprompter', {
        roomId: roomInfo.roomId,
        targetUserIds: selectedParticipants,
        action,
      });

      if (response.success) {
        if (action === 'PLAY') {
          message.success('提词器已开始播放');
        } else if (action === 'PAUSE') {
          message.info('提词器已暂停');
        } else if (action === 'STOP') {
          message.info('提词器已停止并隐藏');
        }
      } else {
        throw new Error(response.message || '操作失败');
      }
    } catch (error: any) {
      console.error('控制提词器失败:', error);
      message.error(error.message || '操作失败，请重试');
    }
  };

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

  // 加入视频面试房间
  const joinMeeting = async (roomId: string, userName?: string) => {
    try {
      console.log('📱 小程序端 - 开始加入视频面试房间...', { roomId, userName });
      setLoading(true);
      const currentUser = getCurrentUser();
      console.log('📱 小程序端 - 当前用户:', currentUser);
      const userId = currentUser.id;
      const finalUserName = userName || currentUser.name;

      console.log('📱 小程序端 - 请求参数:', { userId, roomId, userName: finalUserName });

      // 从后端获取配置和 Token
      const response = await generateZegoToken({
        userId,
        roomId,
        userName: finalUserName,
        expireTime: 7200, // 2小时
      });

      console.log('📱 小程序端 - Token 响应:', response);

      if (!response.success || !response.data?.token) {
        throw new Error('获取视频Token失败');
      }

      const baseToken = response.data.token;
      const appId = response.data.appId;
      console.log('📱 小程序端 - 获取到 Base Token:', baseToken.substring(0, 20) + '...');
      console.log('📱 小程序端 - AppID:', appId);

      // 使用 base token 生成 Kit Token
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        appId,
        baseToken,
        roomId,
        userId,
        finalUserName
      );
      console.log('📱 小程序端 - 生成 Kit Token:', kitToken.substring(0, 20) + '...');

      // 保存 kit token 和房间信息
      setZegoToken(kitToken);
      setRoomInfo({ roomId, userName: finalUserName });
      setInMeeting(true);
      setLoading(false);

      // 保存房间号到本地存储
      localStorage.setItem('lastRoomId', roomId);
      
      // 向小程序发送消息：已加入房间
      if (window.wx && window.wx.miniProgram) {
        window.wx.miniProgram.postMessage({
          data: { type: 'joined', roomId, userName: finalUserName }
        });
      }
    } catch (error: any) {
      console.error('📱 小程序端 - 加入房间失败:', error);
      message.error(error.message || '加入视频面试房间失败，请重试');
      setLoading(false);
      
      // 向小程序发送错误消息
      if (window.wx && window.wx.miniProgram) {
        window.wx.miniProgram.postMessage({
          data: { type: 'error', message: error.message || '加入房间失败' }
        });
      }
    }
  };

  // 生成分享链接
  const generateShareLink = () => {
    if (!roomInfo) {
      message.error('请先创建或加入房间');
      return '';
    }
    const baseUrl = window.location.origin;
    return `${baseUrl}/interview/join-mobile/${roomInfo.roomId}`;
  };

  // 生成小程序路径
  const generateMiniprogramPath = () => {
    if (!roomInfo) {
      return '';
    }
    return `pages/interview/interview?roomId=${roomInfo.roomId}`;
  };

  // 🎨 美颜功能控制
  const toggleBeauty = () => {
    if (!zegoInstanceRef.current) {
      message.error('请先加入房间');
      return;
    }

    try {
      const newState = !beautyEnabled;

      if (newState) {
        zegoInstanceRef.current.setBeautyEffect(true, beautyParams);
        message.success('美颜已开启');
      } else {
        zegoInstanceRef.current.setBeautyEffect(false);
        message.success('美颜已关闭');
      }

      setBeautyEnabled(newState);
    } catch (error) {
      console.error('美颜设置失败:', error);
      message.error('美颜设置失败');
    }
  };

  // 调整美颜参数
  const adjustBeautyParam = (param: keyof typeof beautyParams, value: number) => {
    const newParams = { ...beautyParams, [param]: value };
    setBeautyParams(newParams);

    if (beautyEnabled && zegoInstanceRef.current) {
      try {
        zegoInstanceRef.current.setBeautyEffect(true, newParams);
      } catch (error) {
        console.error('更新美颜参数失败:', error);
      }
    }
  };

  // 复制分享链接
  const copyShareLink = () => {
    const link = generateShareLink();
    if (!link) return;

    navigator.clipboard.writeText(link).then(() => {
      message.success('邀请链接已复制到剪贴板');
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = link;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        message.success('邀请链接已复制到剪贴板');
      } catch (err) {
        message.error('复制失败，请手动复制');
      }
      document.body.removeChild(textarea);
    });
  };

  // 当容器渲染后初始化 ZEGO
  useEffect(() => {
    if (inMeeting && zegoToken && roomInfo && meetingContainerRef.current && !zegoInstanceRef.current) {
      console.log('📱 小程序端 - 容器已渲染，开始初始化 ZEGO...');

      // 清理容器内容
      if (meetingContainerRef.current) {
        meetingContainerRef.current.innerHTML = '';
      }

      try {
        const zp = ZegoUIKitPrebuilt.create(zegoToken);
        zegoInstanceRef.current = zp;
        console.log('📱 小程序端 - ZEGO 实例创建成功');

        // 小程序端配置
        const config = {
          container: meetingContainerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall,
          },
          language: 'zh-CN' as any,
          showPreJoinView: false,
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          useFrontFacingCamera: true, // 小程序默认使用前置摄像头
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: false, // 小程序不支持屏幕共享
          showTextChat: true,
          showUserList: true,
          maxUsers: 6,
          layout: 'Auto' as const, // 小程序使用自动布局
          showLayoutButton: true,
          showNonVideoUser: true,
          showOnlyAudioUser: true,
          showUserName: true,
          videoResolutionDefault: ZegoUIKitPrebuilt.VideoResolution_720P,
          showRemoveUserButton: true,
          showTurnOffRemoteMicrophoneButton: true,
          showTurnOffRemoteCameraButton: true,
          showPinButton: true,
          showMoreButton: true,
          showRoomDetailsButton: true,
          autoHideFooter: false, // 工具栏固定显示
          lowerLeftNotification: {
            showUserJoinAndLeave: true,
            showTextChat: true,
          },
          onJoinRoom: () => {
            console.log('✅ 小程序端 - 成功加入房间');
            message.success('成功加入视频面试房间');

            // 向小程序发送消息
            if (window.wx && window.wx.miniProgram) {
              window.wx.miniProgram.postMessage({
                data: { type: 'joined', roomId: roomInfo.roomId }
              });
            }

            // 启动定期清理任务
            cleanupIntervalRef.current = setInterval(() => {
              if (!meetingContainerRef.current) return;
              const currentUserIds = participants.map(p => p.userId);
              const currentUser = getCurrentUser();
              currentUserIds.push(currentUser.id.toString());
              const allVideoElements = meetingContainerRef.current.querySelectorAll('[data-userid], [id*="zego"]');
              allVideoElements.forEach((element: any) => {
                const userId = element.getAttribute('data-userid') || element.id;
                const isCurrentUser = currentUserIds.some(id => userId.includes(id));
                if (!isCurrentUser && userId) {
                  console.log('🔧 小程序端 - 清理残留视频元素:', userId);
                  element.remove();
                }
              });
            }, 3000);
          },
          onLeaveRoom: () => {
            console.log('📱 小程序端 - 离开房间');

            if (cleanupIntervalRef.current) {
              clearInterval(cleanupIntervalRef.current);
              cleanupIntervalRef.current = null;
            }

            if (meetingContainerRef.current) {
              meetingContainerRef.current.innerHTML = '';
            }

            zegoInstanceRef.current = null;
            setZegoToken(null);
            setRoomInfo(null);
            setInMeeting(false);
            setParticipants([]);
            message.info('已离开视频面试房间');

            // 向小程序发送消息
            if (window.wx && window.wx.miniProgram) {
              window.wx.miniProgram.postMessage({
                data: { type: 'leave' }
              });
            }
          },
          onUserJoin: (users: any[]) => {
            console.log('✅ 小程序端 - 用户加入房间:', users);
            message.success(`${users.map(u => u.userName).join(', ')} 加入了房间`);
            setParticipants(prev => {
              const newUsers = users.filter(u => !prev.some(p => p.userId === u.userID));
              return [...prev, ...newUsers.map(u => ({ userId: u.userID, userName: u.userName }))];
            });
          },
          onUserLeave: (users: any[]) => {
            console.log('🔧 小程序端 - 用户离开房间:', users);

            const cleanupUser = (user: any, attempt: number = 1) => {
              try {
                if (!meetingContainerRef.current) return;
                console.log(`🔍 小程序端 - 清理用户 ${user.userName} (${user.userID}) - 尝试${attempt}`);

                const selectors = [
                  `[data-userid="${user.userID}"]`,
                  `[id*="${user.userID}"]`,
                  `[class*="${user.userID}"]`,
                  `video[id*="${user.userID}"]`,
                  `div[id*="${user.userID}"]`,
                ];

                let found = false;
                selectors.forEach(selector => {
                  const elements = meetingContainerRef.current?.querySelectorAll(selector);
                  if (elements && elements.length > 0) {
                    elements.forEach(element => {
                      console.log(`✅ 小程序端 - 清理视频元素 (尝试${attempt})`);
                      element.remove();
                      found = true;
                    });
                  }
                });

                if (!found && attempt === 1) {
                  setTimeout(() => cleanupUser(user, 2), 3000);
                }
              } catch (error) {
                console.error(`小程序端 - 清理用户视频元素失败:`, error);
              }
            };

            users.forEach(user => cleanupUser(user));
            message.info(`${users.map(u => u.userName).join(', ')} 离开了房间`);
            setParticipants(prev => prev.filter(p => !users.some(u => u.userID === p.userId)));
          },
        };

        console.log('📱 小程序端 - 加入房间配置:', config);
        zp.joinRoom(config);

        setTimeout(() => {
          try {
            zp.setLanguage('zh-CN' as any);
            console.log('✅ 小程序端 - 已设置语言为中文');
          } catch (error) {
            console.error('小程序端 - 设置语言失败:', error);
          }
        }, 100);
      } catch (error: any) {
        console.error('📱 小程序端 - 初始化 ZEGO 失败:', error);
        message.error('初始化视频失败，请重试');
        setInMeeting(false);
        setZegoToken(null);
        setRoomInfo(null);

        // 向小程序发送错误消息
        if (window.wx && window.wx.miniProgram) {
          window.wx.miniProgram.postMessage({
            data: { type: 'error', message: error.message || '初始化视频失败' }
          });
        }
      }
    }
  }, [inMeeting, zegoToken, roomInfo]);

  // 从URL参数获取房间ID并自动加入
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('roomId');
    const userNameFromUrl = urlParams.get('userName');

    if (roomIdFromUrl) {
      console.log('📱 小程序端 - 从URL获取房间ID:', roomIdFromUrl);
      joinMeeting(roomIdFromUrl, userNameFromUrl || undefined);
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
      if (zegoInstanceRef.current) {
        try {
          zegoInstanceRef.current.destroy();
        } catch (error) {
          console.error('清理失败:', error);
        }
      }
    };
  }, []);

  return (
    <div className="miniprogram-video-interview">
      {/* 加载状态 */}
      {loading && (
        <div className="miniprogram-loading">
          <Spin size="large" tip="正在加入视频面试..." />
        </div>
      )}

      {/* 视频容器 */}
      <div
        ref={meetingContainerRef}
        className="miniprogram-video-container"
        style={{ display: inMeeting ? 'block' : 'none' }}
      />

      {/* 美颜设置抽屉 */}
      <Drawer
        title="美颜设置"
        placement="bottom"
        onClose={() => setBeautyDrawerVisible(false)}
        open={beautyDrawerVisible}
        height="60%"
        className="miniprogram-beauty-drawer"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 8, fontSize: 16 }}>美白 ({beautyParams.whitening})</div>
            <Slider
              min={0}
              max={100}
              value={beautyParams.whitening}
              onChange={(value) => adjustBeautyParam('whitening', value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontSize: 16 }}>磨皮 ({beautyParams.smoothing})</div>
            <Slider
              min={0}
              max={100}
              value={beautyParams.smoothing}
              onChange={(value) => adjustBeautyParam('smoothing', value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontSize: 16 }}>锐化 ({beautyParams.sharpening})</div>
            <Slider
              min={0}
              max={100}
              value={beautyParams.sharpening}
              onChange={(value) => adjustBeautyParam('sharpening', value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontSize: 16 }}>红润 ({beautyParams.rosiness})</div>
            <Slider
              min={0}
              max={100}
              value={beautyParams.rosiness}
              onChange={(value) => adjustBeautyParam('rosiness', value)}
            />
          </div>
          <Button
            type="primary"
            block
            size="large"
            onClick={toggleBeauty}
            style={{
              marginTop: 16,
              height: 48,
              fontSize: 16,
              borderRadius: 8,
              background: beautyEnabled ? '#ff4d4f' : '#5DBFB3'
            }}
          >
            {beautyEnabled ? '关闭美颜' : '开启美颜'}
          </Button>
        </Space>
      </Drawer>

      {/* 提词器设置抽屉 */}
      <Drawer
        title="提词器设置"
        placement="bottom"
        onClose={() => setTeleprompterDrawerVisible(false)}
        open={teleprompterDrawerVisible}
        height="70%"
        className="miniprogram-teleprompter-drawer"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 8, fontSize: 16 }}>提词内容</div>
            <Input.TextArea
              rows={6}
              value={teleprompterContent}
              onChange={(e) => setTeleprompterContent(e.target.value)}
              placeholder="请输入提词内容..."
              style={{ fontSize: 16 }}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontSize: 16 }}>滚动速度 ({teleprompterSpeed})</div>
            <Slider
              min={10}
              max={100}
              value={teleprompterSpeed}
              onChange={(value) => setTeleprompterSpeed(value)}
            />
          </div>
          <Space style={{ width: '100%' }}>
            <Button
              type="primary"
              block
              size="large"
              onClick={pushTeleprompterContent}
              style={{ height: 48, fontSize: 16, borderRadius: 8 }}
            >
              推送内容
            </Button>
            <Button
              size="large"
              onClick={() => controlTeleprompter('PLAY')}
              style={{ height: 48, fontSize: 16, borderRadius: 8 }}
            >
              播放
            </Button>
            <Button
              size="large"
              onClick={() => controlTeleprompter('PAUSE')}
              style={{ height: 48, fontSize: 16, borderRadius: 8 }}
            >
              暂停
            </Button>
            <Button
              size="large"
              onClick={() => controlTeleprompter('STOP')}
              style={{ height: 48, fontSize: 16, borderRadius: 8 }}
            >
              停止
            </Button>
          </Space>
        </Space>
      </Drawer>

      {/* 分享弹窗 */}
      <Modal
        title="邀请他人"
        open={shareModalVisible}
        onCancel={() => setShareModalVisible(false)}
        footer={null}
        className="miniprogram-share-modal"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>房间号</div>
            <Input
              value={roomInfo?.roomId}
              readOnly
              size="large"
              style={{ fontSize: 16 }}
              addonAfter={
                <CopyOutlined
                  onClick={() => {
                    if (roomInfo?.roomId) {
                      navigator.clipboard.writeText(roomInfo.roomId);
                      message.success('房间号已复制');
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
              }
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>分享链接</div>
            <Input
              value={generateShareLink()}
              readOnly
              size="large"
              style={{ fontSize: 16 }}
              addonAfter={
                <CopyOutlined
                  onClick={copyShareLink}
                  style={{ cursor: 'pointer' }}
                />
              }
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>小程序路径</div>
            <Input
              value={generateMiniprogramPath()}
              readOnly
              size="large"
              style={{ fontSize: 16 }}
              addonAfter={
                <CopyOutlined
                  onClick={() => {
                    const path = generateMiniprogramPath();
                    if (path) {
                      navigator.clipboard.writeText(path);
                      message.success('小程序路径已复制');
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
              }
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default VideoInterviewMiniprogram;

