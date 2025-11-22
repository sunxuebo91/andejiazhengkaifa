import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Form, Space, message, Modal, Typography, Spin, Select, Slider, Drawer } from 'antd';
import { VideoCameraOutlined, ShareAltOutlined, CopyOutlined, FileTextOutlined } from '@ant-design/icons';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { generateZegoToken } from '../../services/zego';
import { apiService } from '../../services/api';
import { setToken } from '../../services/auth';
import './VideoInterviewMobile.css';

const { Title, Paragraph, Text } = Typography;

/**
 * 视频面试页面
 * 用于家政人员的视频面试功能
 * 支持：3-6人视频面试、美颜、踢人、邀人、房间管理等功能
 */
const VideoInterview: React.FC = () => {
  const [form] = Form.useForm();
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
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(10); // 滚动速度(像素/秒)
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]); // 选中的参与者

  // 🎨 美颜相关状态
  const [beautyDrawerVisible, setBeautyDrawerVisible] = useState(false);
  const [beautyEnabled, setBeautyEnabled] = useState(false);
  const [beautyParams, setBeautyParams] = useState({
    whitening: 50,    // 美白 (0-100)
    smoothing: 60,    // 磨皮 (0-100)
    sharpening: 30,   // 锐化 (0-100)
    rosiness: 40      // 红润 (0-100)
  });
  const [participants, setParticipants] = useState<Array<{ userId: string; userName: string; role?: string }>>([]); // 参与者列表

  // 🔧 定期清理检查定时器
  const cleanupIntervalRef = useRef<any>(null);

  // 📱 移动端检测
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 📱 从URL读取参数，支持小程序传入 roomId/userName/token
  useEffect(() => {
    // 设置页面标题
    document.title = '视频面试';

    try {
      const params = new URLSearchParams(window.location.search);
      const rid = params.get('roomId');
      const uname = params.get('userName');
      const token = params.get('token');
      const isGuest = params.get('isGuest');
      const skipLogin = params.get('skipLogin');
      const autoJoin = params.get('autoJoin'); // 🎯 新增：是否自动加入

      console.log('📱 VideoInterview - 接收URL参数:', {
        token: token ? '✅ 已接收' : '❌ 未接收',
        roomId: rid,
        userName: uname,
        isGuest,
        skipLogin,
        autoJoin
      });

      // 处理Token（HR模式）
      if (token) {
        console.log('💾 保存Token到localStorage...');
        setToken(token, false); // 不记住我，使用localStorage
        localStorage.setItem('access_token', token);
        localStorage.setItem('isLoggedIn', 'true');
        console.log('✅ Token已保存，自动登录成功');
      }

      // 访客模式
      if (isGuest === 'true' || skipLogin === 'true') {
        localStorage.setItem('isGuest', 'true');
        if (uname) {
          localStorage.setItem('guestName', decodeURIComponent(uname));
        }
        console.log('✅ 访客模式已设置');
      }

      // 设置表单值
      if (rid) {
        form.setFieldsValue({ roomId: rid });
      }
      if (uname) {
        const decodedName = decodeURIComponent(uname);
        form.setFieldsValue({ userName: decodedName });
        // 同时保存用户名到localStorage
        if (token) {
          localStorage.setItem('userName', decodedName);
          console.log('💾 保存用户名:', decodedName);
        }
      }

      // 🎯 如果有 roomId 且不在会议中，自动加入房间
      if (rid && !inMeeting) {
        console.log('🎯 检测到 roomId，准备自动加入房间...');
        // 延迟一下，确保表单值已设置
        setTimeout(() => {
          form.submit();
          console.log('✅ 已自动提交表单，加入房间');
        }, 500);
      }
    } catch (error) {
      console.error('❌ 处理URL参数失败:', error);
    }
  }, [form]);

  // 生成随机房间ID
  const generateRoomId = () => {
    return `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  // 📝 提词器控制函数

  // 推送提词内容
  const pushTeleprompterContent = async () => {
    if (!teleprompterContent.trim()) {
      message.warning('请输入提词内容');
      return;
    }

    if (selectedParticipants.length === 0) {
      message.warning('请选择要推送的阿姨');
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
  const controlTeleprompter = async (action: 'PLAY' | 'PAUSE' | 'STOP' | 'SHOW' | 'HIDE') => {
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
        } else if (action === 'SHOW') {
          message.success('提词器已显示');
        } else if (action === 'HIDE') {
          message.info('提词器已关闭');
        }
      } else {
        throw new Error(response.message || '操作失败');
      }
    } catch (error: any) {
      console.error('控制提词器失败:', error);
      message.error(error.message || '操作失败，请重试');
    }
  };

  // 一键推送并开启提词器
  const quickStartTeleprompter = async () => {
    if (!teleprompterContent.trim()) {
      message.warning('请输入提词内容');
      return;
    }

    if (selectedParticipants.length === 0) {
      message.warning('请选择要推送的阿姨');
      return;
    }

    if (!roomInfo) {
      message.error('请先加入房间');
      return;
    }

    try {
      const response = await apiService.post('/api/zego/quick-start-teleprompter', {
        roomId: roomInfo.roomId,
        content: teleprompterContent,
        targetUserIds: selectedParticipants,
        scrollSpeed: teleprompterSpeed,
        autoPlay: true,
      });

      if (response.success) {
        message.success('🚀 提词器已启动！');
      } else {
        throw new Error(response.message || '启动失败');
      }
    } catch (error: any) {
      console.error('快速启动提词器失败:', error);
      message.error(error.message || '启动失败，请重试');
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
  const joinMeeting = async (values: { roomId: string; userName?: string }) => {
    try {
      console.log('开始加入视频面试房间...', values);
      setLoading(true);
      const currentUser = getCurrentUser();
      console.log('当前用户:', currentUser);
      const userId = currentUser.id;
      const userName = values.userName || currentUser.name;
      let roomId = values.roomId;

      console.log('请求参数:', { userId, roomId, userName });

      // 🎯 第一步：检查是否有活跃的面试间
      try {
        const activeRoomResponse = await apiService.get('/api/interview/active-room');
        if (activeRoomResponse.success && activeRoomResponse.data) {
          // 找到活跃面试间，直接进入
          const activeRoom = activeRoomResponse.data;
          console.log('✅ 找到活跃面试间，直接进入:', activeRoom.roomId);
          roomId = activeRoom.roomId; // 使用活跃面试间的 roomId
          message.info('进入已存在的面试间');
        } else {
          // 没有活跃面试间，创建新的
          console.log('ℹ️ 没有活跃面试间，创建新的');
          await apiService.post('/api/interview/rooms', {
            roomId,
            roomName: `${userName}的面试间`,
            hostName: userName,
            hostZegoUserId: userId,
          });
          console.log('✅ 面试间记录已创建');
        }
      } catch (error: any) {
        console.warn('⚠️ 检查/创建面试间失败，但继续加入房间:', error);
      }

      // 从后端获取配置和 Token
      const response = await generateZegoToken({
        userId,
        roomId,
        userName,
        expireTime: 7200, // 2小时
      });

      console.log('Token 响应:', response);

      if (!response.success || !response.data?.token) {
        throw new Error('获取视频Token失败');
      }

      const baseToken = response.data.token;
      const appId = response.data.appId;
      console.log('获取到 Base Token:', baseToken.substring(0, 20) + '...');
      console.log('AppID:', appId);
      console.log('=== HR端 - 房间信息 ===');
      console.log('房间ID:', roomId);
      console.log('房间ID类型:', typeof roomId);
      console.log('房间ID长度:', roomId.length);
      console.log('房间ID字符:', Array.from(roomId).map(c => c.charCodeAt(0)));
      console.log('用户ID:', userId);
      console.log('用户名:', userName);

      // 使用 base token 生成 Kit Token
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        appId,
        baseToken,
        roomId,
        userId,
        userName
      );
      console.log('生成 Kit Token:', kitToken.substring(0, 20) + '...');

      // 保存 kit token 和房间信息，然后设置 inMeeting 为 true
      // useEffect 会在容器渲染后初始化 ZEGO
      setZegoToken(kitToken);
      setRoomInfo({ roomId, userName });
      setInMeeting(true);
      setLoading(false);

      // 保存房间号到本地存储，用于重新进入
      localStorage.setItem('lastRoomId', roomId);
    } catch (error: any) {
      console.error('加入房间失败:', error);
      message.error(error.message || '加入视频面试房间失败，请重试');
      setLoading(false);
    }
  };

  // 生成分享链接（H5 PC端）
  const generateShareLink = () => {
    if (!roomInfo) {
      message.error('请先创建或加入房间');
      return '';
    }
    const baseUrl = window.location.origin;
    return `${baseUrl}/interview/join/${roomInfo.roomId}?name=${encodeURIComponent('视频面试')}`;
  };

  // 生成移动端分享链接（使用miniprogram目录下的H5页面）
  const generateMobileShareLink = () => {
    if (!roomInfo) {
      return '';
    }
    const baseUrl = window.location.origin;
    // 🔥 移动端使用 miniprogram 目录下的 H5 页面，必须包含 roomId 参数
    return `${baseUrl}/miniprogram/video-interview-guest.html?roomId=${roomInfo.roomId}`;
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
        // 开启美颜
        zegoInstanceRef.current.setBeautyEffect(true, beautyParams);
        message.success('美颜已开启');
      } else {
        // 关闭美颜
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

    // 如果美颜已开启，实时更新
    if (beautyEnabled && zegoInstanceRef.current) {
      try {
        zegoInstanceRef.current.setBeautyEffect(true, newParams);
      } catch (error) {
        console.error('更新美颜参数失败:', error);
      }
    }
  };

  // 打开美颜设置面板
  const openBeautySettings = () => {
    setBeautyDrawerVisible(true);
  };

  // 复制分享链接
  const copyShareLink = () => {
    const link = generateShareLink();
    if (!link) return;

    navigator.clipboard.writeText(link).then(() => {
      message.success('邀请链接已复制到剪贴板');
    }).catch(() => {
      // 降级方案
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

  // 显示分享弹窗
  const showShareModal = () => {
    if (!roomInfo) {
      message.error('请先创建或加入房间');
      return;
    }
    setShareModalVisible(true);
  };

  // 当容器渲染后初始化 ZEGO
  useEffect(() => {
    if (inMeeting && zegoToken && roomInfo && meetingContainerRef.current && !zegoInstanceRef.current) {
      console.log('容器已渲染，开始初始化 ZEGO...');

      // 🔧 清理容器内容，确保没有残留的DOM元素
      if (meetingContainerRef.current) {
        meetingContainerRef.current.innerHTML = '';
      }

      try {
        // 使用 create 方法创建实例
        const zp = ZegoUIKitPrebuilt.create(zegoToken);
        zegoInstanceRef.current = zp;
        console.log('ZEGO 实例创建成功，开始加入房间...');
        console.log('Token 信息:', {
          tokenLength: zegoToken.length,
          tokenPrefix: zegoToken.substring(0, 20) + '...'
        });

        // 加入房间配置
        const config = {
          container: meetingContainerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall, // 使用群组通话模式（所有人平等，但可以配置权限）
          },
          // 🌐 设置语言为中文
          language: 'zh-CN' as any,
          showPreJoinView: true, // 显示预加入页面，让用户授权摄像头和麦克风
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true, // 显示音视频设置按钮（包含美颜设置）
          showScreenSharingButton: true,
          showTextChat: true,
          showUserList: true,
          maxUsers: 6, // 最多6人
          layout: 'Grid' as const, // 使用网格布局
          showLayoutButton: false, // 不显示布局切换按钮
          showNonVideoUser: true, // 显示没有视频的用户
          showOnlyAudioUser: true, // 显示纯音频用户
          showUserName: true, // 显示用户名
          // 视频配置
          videoResolutionDefault: ZegoUIKitPrebuilt.VideoResolution_720P,
	          videoCodec: 'H264' as const,
          // 🎨 美颜功能通过音视频设置按钮访问
          // 🔥 HR端管理权限：踢人、禁言、关闭摄像头
          // 注意：在 GroupCall 模式下，这些按钮对所有人可见，但通常第一个加入的人被视为"房主"
          showRemoveUserButton: true, // 显示踢人按钮
          showTurnOffRemoteMicrophoneButton: true, // 显示禁言按钮
          showTurnOffRemoteCameraButton: true, // 显示关闭他人摄像头按钮
          // 加入房间成功回调
          onJoinRoom: () => {
            console.log('✅ HR端成功加入房间');
            message.success('成功加入视频面试房间');

            // 🔧 启动定期清理任务：每3秒检查一次是否有残留的视频元素
            cleanupIntervalRef.current = setInterval(() => {
              if (!meetingContainerRef.current) return;

              // 获取当前参与者列表中的所有 userId
              const currentUserIds = participants.map(p => p.userId);
              const currentUser = getCurrentUser();
              currentUserIds.push(currentUser.id.toString()); // 加上自己

              // 查找所有视频元素
              const allVideoElements = meetingContainerRef.current.querySelectorAll('[data-userid], [id*="zego"]');

              allVideoElements.forEach((element: any) => {
                const userId = element.getAttribute('data-userid') || element.id;

                // 如果这个视频元素的用户不在参与者列表中，说明是残留的，删除它
                const isCurrentUser = currentUserIds.some(id => userId.includes(id));
                if (!isCurrentUser && userId) {
                  console.log('🔧 发现残留视频元素，清理:', userId);
                  element.remove();
                }
              });
            }, 3000); // 每3秒检查一次
          },
          // 离开房间回调
          onLeaveRoom: () => {
            console.log('HR端离开房间');

            // 🔧 停止定期清理任务
            if (cleanupIntervalRef.current) {
              clearInterval(cleanupIntervalRef.current);
              cleanupIntervalRef.current = null;
            }

            // 🔧 清理容器内容
            if (meetingContainerRef.current) {
              meetingContainerRef.current.innerHTML = '';
            }

            zegoInstanceRef.current = null;
            setZegoToken(null);
            setRoomInfo(null);
            setInMeeting(false);
            setParticipants([]); // 清空参与者列表
            message.info('已离开视频面试房间');
          },
          // 用户加入回调
          onUserJoin: (users: any[]) => {
            console.log('✅ 用户加入房间:', users);
            message.success(`${users.map(u => u.userName).join(', ')} 加入了房间`);
            // 更新参与者列表
            setParticipants(prev => {
              const newUsers = users.filter(u => !prev.some(p => p.userId === u.userID));
              return [...prev, ...newUsers.map(u => {
                // 从userId中提取角色信息 (guest_xxx 或 user_xxx)
                const role = u.userID.startsWith('guest_') ? 'helper' : 'interviewer';
                return {
                  userId: u.userID,
                  userName: u.userName,
                  role
                };
              })];
            });
          },
          // 用户离开回调
          onUserLeave: (users: any[]) => {
            console.log('🔧 用户离开房间:', users);

            // 🔧 手动清理离开用户的视频元素，防止画面卡住
            const cleanupUser = (user: any, attempt: number = 1) => {
              try {
                if (!meetingContainerRef.current) return;

                console.log(`🔍 开始清理用户 ${user.userName} (${user.userID}) - 尝试${attempt}`);

                // 🔍 先打印所有可能的视频元素，帮助调试
                if (attempt === 1) {
                  const allElements = meetingContainerRef.current.querySelectorAll('*');
                  console.log('📊 容器内所有元素数量:', allElements.length);

                  // 查找所有包含 video 标签的元素
                  const videoElements = meetingContainerRef.current.querySelectorAll('video');
                  console.log('📹 找到的 video 元素:', videoElements.length);
                  videoElements.forEach((video: any, index) => {
                    console.log(`  Video ${index}:`, {
                      id: video.id,
                      className: video.className,
                      parentId: video.parentElement?.id,
                      parentClass: video.parentElement?.className,
                    });
                  });
                }

                // 尝试多种选择器来查找用户的视频元素
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
                      console.log(`✅ 清理用户 ${user.userName} (${user.userID}) 的视频元素 (尝试${attempt}, 选择器: ${selector})`);
                      element.remove();
                      found = true;
                    });
                  }
                });

                if (!found) {
                  console.log(`⚠️ 未找到用户 ${user.userName} (${user.userID}) 的视频元素 (尝试${attempt})`);

                  // 如果第一次没找到，3秒后再试一次（可能 DOM 还没更新）
                  if (attempt === 1) {
                    setTimeout(() => cleanupUser(user, 2), 3000);
                  } else {
                    // 🔥 第二次还是没找到，使用终极方案：清理所有不在参与者列表中的视频元素
                    console.log('🔥 使用终极清理方案：清理所有孤立的视频元素');
                    const allVideos = meetingContainerRef.current?.querySelectorAll('video');
                    const currentUser = getCurrentUser();
                    const validUserIds = [...participants.map(p => p.userId), currentUser.id.toString()];

                    allVideos?.forEach((video: any) => {
                      const videoId = video.id || video.parentElement?.id || '';
                      const isValid = validUserIds.some(id => videoId.includes(id));

                      if (!isValid && videoId) {
                        console.log(`🗑️ 清理孤立视频元素:`, videoId);
                        video.parentElement?.remove();
                      }
                    });
                  }
                }
              } catch (error) {
                console.error(`清理用户 ${user.userName} 视频元素失败:`, error);
              }
            };

            users.forEach(user => cleanupUser(user));

            message.info(`${users.map(u => u.userName).join(', ')} 离开了房间`);
            // 从参与者列表中移除
            setParticipants(prev => prev.filter(p => !users.some(u => u.userID === p.userId)));
          },
        };

        console.log('加入房间配置:', config);
        zp.joinRoom(config);

        // 🌐 加入房间后立即设置语言为中文
        setTimeout(() => {
          try {
            zp.setLanguage('zh-CN' as any);
            console.log('✅ 已设置语言为中文');
          } catch (error) {
            console.error('设置语言失败:', error);
          }
        }, 100);
      } catch (error: any) {
        console.error('初始化 ZEGO 失败:', error);
        message.error('初始化视频失败，请重试');
        setInMeeting(false);
        setZegoToken(null);
        setRoomInfo(null);
      }
    }
  }, [inMeeting, zegoToken, roomInfo]);

  // 离开房间
  const leaveMeeting = () => {
    Modal.confirm({
      title: '确认离开',
      content: '确定要离开视频面试房间吗？',
      onOk: () => {
        console.log('🔧 手动离开房间，开始清理...');

        // 销毁 ZEGO 实例
        if (zegoInstanceRef.current) {
          try {
            zegoInstanceRef.current.destroy();
            console.log('✅ ZEGO 实例已销毁');
          } catch (error) {
            console.error('销毁 ZEGO 实例失败:', error);
          }
          zegoInstanceRef.current = null;
        }

        // 🔧 清理容器内容
        if (meetingContainerRef.current) {
          meetingContainerRef.current.innerHTML = '';
          console.log('✅ 容器内容已清理');
        }

        // 清理状态
        setZegoToken(null);
        setRoomInfo(null);
        setInMeeting(false);
        setParticipants([]); // 清空参与者列表
        message.info('已离开视频面试房间');
      },
    });
  };

  // 🔴 解散房间（主持人权限）
  const dismissRoom = async () => {
    Modal.confirm({
      title: '⚠️ 确认解散房间',
      content: '解散房间后，所有参与者将被强制离开，此操作不可撤销！',
      okText: '确认解散',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          if (!roomInfo) {
            message.error('房间信息不存在');
            return;
          }

          console.log('🔧 正在解散房间:', roomInfo.roomId);

          // 🎯 先结束面试间记录
          try {
            await apiService.post(`/api/interview/rooms/${roomInfo.roomId}/end`);
            console.log('✅ 面试间记录已结束');
          } catch (error) {
            console.warn('⚠️ 结束面试间记录失败:', error);
          }

          // 调用后端 API 解散房间 (使用 apiService 自动处理认证)
          const response = await apiService.post('/api/zego/dismiss-room', {
            roomId: roomInfo.roomId,
          });

          console.log('解散房间响应:', response);

          if (!response.success) {
            throw new Error(response.message || '解散房间失败');
          }

          // 销毁 ZEGO 实例
          if (zegoInstanceRef.current) {
            try {
              zegoInstanceRef.current.destroy();
              console.log('✅ ZEGO 实例已销毁');
            } catch (error) {
              console.error('销毁 ZEGO 实例失败:', error);
            }
            zegoInstanceRef.current = null;
          }

          // 🔧 清理容器内容
          if (meetingContainerRef.current) {
            meetingContainerRef.current.innerHTML = '';
            console.log('✅ 容器内容已清理');
          }

          // 清理状态
          setZegoToken(null);
          setRoomInfo(null);
          setInMeeting(false);
          setParticipants([]); // 清空参与者列表
          message.success('房间已解散，所有参与者已被强制离开');
        } catch (error: any) {
          console.error('解散房间失败:', error);
          message.error(error.message || '解散房间失败，请重试');
        }
      },
    });
  };

  // 🔧 监听浏览器标签页关闭/刷新事件
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🔧 检测到页面即将关闭/刷新，主动调用离开房间');

      // 🎯 关键：主动调用 ZEGO 的 leaveRoom 方法，触发正常的离开流程
      if (zegoInstanceRef.current) {
        try {
          // 调用 ZEGO 的离开房间方法，这会触发 onLeaveRoom 回调
          zegoInstanceRef.current.destroy();
          console.log('✅ ZEGO 实例已销毁（页面关闭）');
        } catch (error) {
          console.error('销毁 ZEGO 实例失败:', error);
        }
      }

      // 同时通知后端
      if (roomInfo) {
        const currentUser = getCurrentUser();
        const leaveData = JSON.stringify({
          roomId: roomInfo.roomId,
          userId: currentUser.id.toString()
        });
        const blob = new Blob([leaveData], { type: 'application/json' });
        navigator.sendBeacon(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/zego/leave-room`, blob);
        console.log('✅ 已发送离开房间请求（sendBeacon）');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomInfo]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      console.log('🔧 组件卸载，开始清理...');

      if (zegoInstanceRef.current) {
        try {
          zegoInstanceRef.current.destroy();
          console.log('✅ ZEGO 实例已销毁');
        } catch (error) {
          console.error('销毁 ZEGO 实例失败:', error);
        }
        zegoInstanceRef.current = null;
      }

      // 🔧 清理容器内容
      if (meetingContainerRef.current) {
        meetingContainerRef.current.innerHTML = '';
        console.log('✅ 容器内容已清理');
      }
    };
  }, []);

  // 如果在会议中，显示会议容器
  if (inMeeting) {
    return (
      <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
        <div
          ref={meetingContainerRef}
          style={{ width: '100%', height: '100%' }}
        />
        {/* 悬浮按钮组 */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            display: 'flex',
            gap: '12px',
          }}
        >
          <Button
            type="default"
            size="large"
            icon={<ShareAltOutlined />}
            onClick={showShareModal}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
          >
            邀请他人
          </Button>
          <Button
            icon={<FileTextOutlined />}
            size="large"
            onClick={() => setTeleprompterDrawerVisible(true)}
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
          >
            提词器控制
          </Button>
          <Button
            size="large"
            onClick={openBeautySettings}
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              background: beautyEnabled ? '#52c41a' : undefined,
              color: beautyEnabled ? '#fff' : undefined,
              borderColor: beautyEnabled ? '#52c41a' : undefined,
            }}
          >
            🎨 美颜 {beautyEnabled ? '✓' : ''}
          </Button>
          <Button
            type="default"
            size="large"
            onClick={leaveMeeting}
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
          >
            离开房间
          </Button>
          <Button
            type="primary"
            danger
            size="large"
            onClick={dismissRoom}
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(255, 0, 0, 0.2)',
            }}
          >
            🔴 解散房间
          </Button>
        </div>

        {/* 📝 提词器控制抽屉 */}
        <Drawer
          title="📝 提词器控制"
          placement={isMobile ? "bottom" : "right"}
          height={isMobile ? "70vh" : undefined}
          width={isMobile ? undefined : 450}
          open={teleprompterDrawerVisible}
          onClose={() => setTeleprompterDrawerVisible(false)}
          className={isMobile ? "mobile-teleprompter-drawer" : ""}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* 提词内容输入 */}
            <div>
              <div style={{
                marginBottom: 6,
                fontWeight: 600,
                fontSize: isMobile ? '15px' : '14px'
              }}>
                提词内容:
              </div>
              <Input.TextArea
                value={teleprompterContent}
                onChange={(e) => setTeleprompterContent(e.target.value)}
                placeholder="请输入提词内容..."
                autoSize={{ minRows: isMobile ? 4 : 8, maxRows: 15 }}
                style={{
                  fontSize: isMobile ? '15px' : '14px',
                  minHeight: isMobile ? '100px' : 'auto'
                }}
              />
            </div>

            {/* 推送对象选择 */}
            <div>
              <div style={{
                marginBottom: 6,
                fontWeight: 600,
                fontSize: isMobile ? '15px' : '14px'
              }}>
                推送给:
              </div>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                size={isMobile ? "large" : "middle"}
                placeholder="请选择阿姨"
                value={selectedParticipants}
                onChange={setSelectedParticipants}
                options={[
                  { label: '所有阿姨', value: 'ALL' },
                  ...participants
                    .filter(p => p.role === 'helper')
                    .map(p => ({
                      label: `${p.userName}`,
                      value: p.userId,
                    })),
                ]}
              />
              <div style={{
                marginTop: 8,
                fontSize: isMobile ? '14px' : '12px',
                color: '#999',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                💡 当前房间有 {participants.filter(p => p.role === 'helper').length} 位阿姨在线
              </div>
            </div>

            {/* 滚动速度调整 */}
            <div>
              <div style={{
                marginBottom: 8,
                fontWeight: 600,
                fontSize: isMobile ? '15px' : '14px'
              }}>
                滚动速度: {teleprompterSpeed} 像素/秒
              </div>
              <Slider
                min={10}
                max={100}
                value={teleprompterSpeed}
                onChange={setTeleprompterSpeed}
                marks={{
                  10: '极慢',
                  30: '慢',
                  50: '中',
                  70: '快',
                  100: '极快',
                }}
              />
            </div>

            {/* 控制按钮 */}
            <div>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {/* 一键推送并开启 */}
                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<ShareAltOutlined />}
                  onClick={quickStartTeleprompter}
                  style={{
                    height: isMobile ? '48px' : '40px',
                    fontSize: isMobile ? '16px' : '16px',
                    fontWeight: 600,
                    borderRadius: '12px',
                    background: '#5DBFB3',
                    borderColor: '#5DBFB3',
                    boxShadow: '0 4px 12px rgba(93, 191, 179, 0.3)'
                  }}
                >
                  🚀 一键推送并开启
                </Button>

                {/* 分步操作 */}
                <Space style={{ width: '100%' }} size="middle">
                  <Button
                    block
                    size="large"
                    icon={<ShareAltOutlined />}
                    onClick={pushTeleprompterContent}
                    style={{
                      flex: 1,
                      height: isMobile ? '48px' : '40px',
                      borderRadius: '8px'
                    }}
                  >
                    📤 推送
                  </Button>
                  <Button
                    block
                    size="large"
                    onClick={() => controlTeleprompter('SHOW')}
                    style={{
                      flex: 1,
                      height: isMobile ? '48px' : '40px',
                      borderRadius: '8px'
                    }}
                  >
                    👁️ 显示
                  </Button>
                </Space>

                <Space style={{ width: '100%' }} size="middle">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => controlTeleprompter('PLAY')}
                    style={{
                      flex: 1,
                      height: isMobile ? '48px' : '40px',
                      borderRadius: '8px'
                    }}
                  >
                    ▶️ 播放
                  </Button>
                  <Button
                    size="large"
                    onClick={() => controlTeleprompter('PAUSE')}
                    style={{
                      flex: 1,
                      height: isMobile ? '48px' : '40px',
                      borderRadius: '8px'
                    }}
                  >
                    ⏸️ 暂停
                  </Button>
                </Space>

                <Button
                  danger
                  block
                  size="large"
                  onClick={() => controlTeleprompter('HIDE')}
                  style={{
                    height: isMobile ? '48px' : '40px',
                    borderRadius: '8px'
                  }}
                >
                  ❌ 关闭提词器
                </Button>
              </Space>
            </div>

            {/* 使用说明 */}
            <div style={{ background: '#f0f2f5', padding: 12, borderRadius: 4 }}>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
                <strong>使用说明：</strong>
                <br />
                1. 编辑提词内容，支持多行文本
                <br />
                2. 选择推送对象（所有人或特定受邀者）
                <br />
                3. 调整滚动速度
                <br />
                4. 点击"推送内容"发送给受邀者
                <br />
                5. 点击"开始播放"让受邀者看到提词器
                <br />
                6. 受邀者可以手动暂停和滚动查看
              </div>
            </div>
          </Space>
        </Drawer>

        {/* 🎨 美颜设置面板（仅房间创建者可用） */}
        <Drawer
          title="🎨 美颜设置"
          placement="right"
          width={400}
          onClose={() => setBeautyDrawerVisible(false)}
          open={beautyDrawerVisible}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 美颜开关 */}
            <div>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 500 }}>美颜效果</span>
                <Button
                  type={beautyEnabled ? 'primary' : 'default'}
                  onClick={toggleBeauty}
                  size="large"
                >
                  {beautyEnabled ? '✅ 已开启' : '关闭'}
                </Button>
              </div>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                开启后可调整美白、磨皮、锐化和红润参数
              </Paragraph>
            </div>

            {/* 美颜参数调整 */}
            {beautyEnabled && (
              <>
                {/* 美白 */}
                <div>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>
                    美白: {beautyParams.whitening}
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    value={beautyParams.whitening}
                    onChange={(value) => adjustBeautyParam('whitening', value)}
                    marks={{
                      0: '自然',
                      50: '中等',
                      100: '最强',
                    }}
                  />
                </div>

                {/* 磨皮 */}
                <div>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>
                    磨皮: {beautyParams.smoothing}
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    value={beautyParams.smoothing}
                    onChange={(value) => adjustBeautyParam('smoothing', value)}
                    marks={{
                      0: '自然',
                      50: '中等',
                      100: '最强',
                    }}
                  />
                </div>

                {/* 锐化 */}
                <div>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>
                    锐化: {beautyParams.sharpening}
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    value={beautyParams.sharpening}
                    onChange={(value) => adjustBeautyParam('sharpening', value)}
                    marks={{
                      0: '柔和',
                      50: '中等',
                      100: '清晰',
                    }}
                  />
                </div>

                {/* 红润 */}
                <div>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>
                    红润: {beautyParams.rosiness}
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    value={beautyParams.rosiness}
                    onChange={(value) => adjustBeautyParam('rosiness', value)}
                    marks={{
                      0: '自然',
                      50: '中等',
                      100: '最强',
                    }}
                  />
                </div>

                {/* 预设方案 */}
                <div>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>快速预设:</div>
                  <Space wrap>
                    <Button
                      onClick={() => {
                        const preset = { whitening: 30, smoothing: 40, sharpening: 20, rosiness: 30 };
                        setBeautyParams(preset);
                        if (beautyEnabled && zegoInstanceRef.current) {
                          zegoInstanceRef.current.setBeautyEffect(true, preset);
                        }
                      }}
                    >
                      自然
                    </Button>
                    <Button
                      onClick={() => {
                        const preset = { whitening: 50, smoothing: 60, sharpening: 30, rosiness: 40 };
                        setBeautyParams(preset);
                        if (beautyEnabled && zegoInstanceRef.current) {
                          zegoInstanceRef.current.setBeautyEffect(true, preset);
                        }
                      }}
                    >
                      标准
                    </Button>
                    <Button
                      onClick={() => {
                        const preset = { whitening: 70, smoothing: 80, sharpening: 40, rosiness: 60 };
                        setBeautyParams(preset);
                        if (beautyEnabled && zegoInstanceRef.current) {
                          zegoInstanceRef.current.setBeautyEffect(true, preset);
                        }
                      }}
                    >
                      增强
                    </Button>
                  </Space>
                </div>
              </>
            )}

            {/* 使用说明 */}
            <div style={{ background: '#f0f2f5', padding: 12, borderRadius: 4 }}>
              <div style={{ fontSize: 12, color: '#666' }}>
                <strong>💡 使用说明：</strong>
                <br />
                1. 点击"开启"按钮启用美颜效果
                <br />
                2. 调整各项参数以达到最佳效果
                <br />
                3. 可使用快速预设方案
                <br />
                4. 美颜效果仅对您的摄像头有效
                <br />
                <br />
                <strong>⚠️ 权限说明：</strong>
                <br />
                只有房间创建者（HR）可以调整美颜参数
              </div>
            </div>
          </Space>
        </Drawer>

        {/* 分享邀请链接弹窗 */}
        <Modal
          title="邀请他人加入视频面试"
          open={shareModalVisible}
          onCancel={() => setShareModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setShareModalVisible(false)}>
              关闭
            </Button>,
          ]}
          width={700}
        >
          {/* PC端链接 */}
          <div style={{ marginBottom: 24 }}>
            <Title level={5}>💻 PC端链接</Title>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              适用于电脑浏览器访问
            </Paragraph>
            <Input.TextArea
              value={generateShareLink()}
              readOnly
              autoSize={{ minRows: 2, maxRows: 3 }}
              style={{ marginBottom: 8 }}
            />
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={copyShareLink}
              block
            >
              复制PC端链接
            </Button>
          </div>

          {/* 移动端链接 */}
          <div style={{ marginBottom: 24 }}>
            <Title level={5}>📱 移动端链接（H5）</Title>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              适用于手机浏览器访问（推荐用于微信分享）
            </Paragraph>
            <Input.TextArea
              value={generateMobileShareLink()}
              readOnly
              autoSize={{ minRows: 2, maxRows: 3 }}
              style={{ marginBottom: 8 }}
            />
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                const link = generateMobileShareLink();
                navigator.clipboard.writeText(link).then(() => {
                  message.success('移动端链接已复制');
                });
              }}
              block
            >
              复制移动端链接
            </Button>
          </div>

          {/* 使用说明 */}
          <div style={{ background: '#f0f2f5', padding: 12, borderRadius: 4 }}>
            <Paragraph style={{ margin: 0, fontSize: 12, color: '#666' }}>
              <strong>📋 使用说明：</strong>
              <br />
              • <strong>PC端链接</strong>：发送给使用电脑的用户
              <br />
              • <strong>移动端链接</strong>：发送给使用手机浏览器的用户（包括微信）
              <br />
              <br />
              <Text type="secondary">💡 提示：复制链接后可通过微信、短信等方式发送给面试者。访客点击链接后会自动跳转到面试间。</Text>
            </Paragraph>
          </div>
        </Modal>
      </div>
    );
  }

  // 显示加入房间表单
  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <VideoCameraOutlined
            style={{ fontSize: '64px', color: '#5DBFB3', marginBottom: '16px' }}
          />
          <Title level={2}>视频面试</Title>
          <Paragraph type="secondary">
            支持 3-6 人视频面试，内置美颜、屏幕共享、聊天等功能
          </Paragraph>
        </div>

        {/* 用户信息卡片 */}
        <Card
          style={{
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #5DBFB3 0%, #4AA89E 100%)',
            border: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#5DBFB3',
              marginRight: '16px',
              overflow: 'hidden'
            }}>
              {getCurrentUser().avatar ? (
                <img
                  src={getCurrentUser().avatar}
                  alt="avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                getCurrentUser().name?.substring(0, 1) || 'HR'
              )}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
                {getCurrentUser().name || '加载中...'}
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                主持人
              </div>
            </div>
          </div>
        </Card>

        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={joinMeeting}
            initialValues={{
              roomId: generateRoomId(),
              userName: getCurrentUser().name,
            }}
          >
            {/* 隐藏的 roomId 字段 */}
            <Form.Item name="roomId" hidden>
              <Input />
            </Form.Item>

            {/* 隐藏的 userName 字段 */}
            <Form.Item name="userName" hidden>
              <Input />
            </Form.Item>

            <Form.Item style={{ marginBottom: '16px' }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<VideoCameraOutlined />}
                loading={loading}
                block
                style={{
                  height: '56px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: '#5DBFB3',
                  borderColor: '#5DBFB3'
                }}
              >
                创建面试间
              </Button>
            </Form.Item>
          </Form>
        </Spin>

        <div style={{ marginTop: '32px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          <Title level={4}>功能说明</Title>
          <ul style={{ marginBottom: 0 }}>
            <li>✅ 支持 3-6 人同时视频面试</li>
            <li>✅ 内置美颜功能（点击设置按钮调节）</li>
            <li>✅ 支持屏幕共享（可展示简历）</li>
            <li>✅ 支持文字聊天</li>
            <li>✅ 支持查看成员列表</li>
            <li>✅ 支持踢出成员（房主权限）</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default VideoInterview;

