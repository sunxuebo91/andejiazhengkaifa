import React, { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Card, message, Radio, Space } from 'antd';
import { VideoCameraOutlined, UserOutlined } from '@ant-design/icons';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import axios from 'axios';

// 访客身份类型
type GuestRole = 'customer' | 'helper';

interface JoinFormValues {
  userName: string;
  role: GuestRole;
}

const JoinInterview: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [inMeeting, setInMeeting] = useState(false);
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const zegoInstanceRef = useRef<any>(null);
  const [zegoToken, setZegoToken] = useState<string | null>(null);
  const [guestInfo, setGuestInfo] = useState<{ userName: string; role: GuestRole; guestId: string } | null>(null);

  // 📝 提词器相关状态
  const [teleprompterVisible, setTeleprompterVisible] = useState(false);
  const [teleprompterContent, setTeleprompterContent] = useState('');
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(50);
  const [teleprompterHeight, setTeleprompterHeight] = useState('50vh');
  const [isScrolling, setIsScrolling] = useState(false);
  const teleprompterRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<any>(null);
  const roomCheckIntervalRef = useRef<any>(null);
  const teleprompterPollIntervalRef = useRef<any>(null);
  const lastTeleprompterTimestampRef = useRef<number>(0);
  // const cleanupIntervalRef = useRef<any>(null); // 🔧 定期清理检查定时器

  // 从 URL 获取房间名称（可选）
  const roomName = searchParams.get('name') || '视频面试';

  // 📝 提词器控制函数

  // 开始自动滚动
  const startScrolling = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }

    setIsScrolling(true);
    scrollIntervalRef.current = setInterval(() => {
      if (teleprompterRef.current) {
        const container = teleprompterRef.current;
        const maxScroll = container.scrollHeight - container.clientHeight;

        if (container.scrollTop >= maxScroll) {
          // 滚动到底部，停止
          stopScrolling();
        } else {
          container.scrollTop += teleprompterSpeed / 60; // 每帧滚动的像素数
        }
      }
    }, 1000 / 60); // 60 FPS
  };

  // 停止滚动
  const stopScrolling = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    setIsScrolling(false);
  };

  // 重置滚动位置
  const resetScroll = () => {
    if (teleprompterRef.current) {
      teleprompterRef.current.scrollTop = 0;
    }
  };

  // 检查房间状态
  const checkRoomStatus = async () => {
    try {
      if (!roomId) return;

      const response = await axios.post('/api/zego/check-room', {
        roomId,
      });

      if (response.data.success && response.data.data.isDismissed) {
        // 房间已解散，自动强制离开（不需要用户点击确定）
        console.log('⚠️ 检测到房间已解散，自动离开');
        message.warning('主持人已解散房间，您已被强制离开', 3);
        handleRoomDismissed();
      }
    } catch (error) {
      console.error('检查房间状态失败:', error);
    }
  };

  // 轮询获取提词器消息
  const pollTeleprompterMessages = async () => {
    try {
      if (!roomId || !guestInfo) return;

      const response = await axios.post('/api/zego/get-teleprompter', {
        roomId,
        userId: guestInfo.guestId,
        lastTimestamp: lastTeleprompterTimestampRef.current,
      });

      if (response.data.success && response.data.data.length > 0) {
        const messages = response.data.data;

        // 处理每条消息
        messages.forEach((msg: any) => {
          if (msg.type === 'CONTENT') {
            // 更新提词内容
            setTeleprompterContent(msg.content);
            setTeleprompterSpeed(msg.scrollSpeed);
            setTeleprompterHeight(msg.displayHeight);
            setTeleprompterVisible(true);
            console.log('收到提词内容:', msg.content);
          } else if (msg.type === 'CONTROL') {
            // 控制播放状态
            if (msg.action === 'PLAY') {
              startScrolling();
              console.log('开始播放提词器');
            } else if (msg.action === 'PAUSE') {
              stopScrolling(); // 暂停就是停止滚动
              console.log('暂停提词器');
            } else if (msg.action === 'STOP') {
              stopScrolling();
              setTeleprompterVisible(false);
              console.log('停止提词器');
            }
          }

          // 更新最后接收的时间戳
          if (msg.timestamp > lastTeleprompterTimestampRef.current) {
            lastTeleprompterTimestampRef.current = msg.timestamp;
          }
        });
      }
    } catch (error) {
      console.error('获取提词器消息失败:', error);
    }
  };

  // 处理房间解散
  const handleRoomDismissed = () => {
    console.log('🔧 房间已解散，开始清理...');

    // 停止定时检查
    if (roomCheckIntervalRef.current) {
      clearInterval(roomCheckIntervalRef.current);
      roomCheckIntervalRef.current = null;
    }

    // 停止提词器轮询
    if (teleprompterPollIntervalRef.current) {
      clearInterval(teleprompterPollIntervalRef.current);
      teleprompterPollIntervalRef.current = null;
    }

    // 强制离开房间
    if (zegoInstanceRef.current) {
      try {
        zegoInstanceRef.current.destroy();
        console.log('✅ ZEGO 实例已销毁');
      } catch (error) {
        console.error('销毁实例失败:', error);
      }
      zegoInstanceRef.current = null;
    }

    // 🔧 清理容器内容
    if (meetingContainerRef.current) {
      meetingContainerRef.current.innerHTML = '';
      console.log('✅ 容器内容已清理');
    }

    // 🔧 清理 localStorage 中的访客ID和时间戳（房间解散时）
    if (guestInfo && roomId) {
      const storageKey = `guest_id_${roomId}_${guestInfo.userName}_${guestInfo.role}`;
      const storageTimeKey = `guest_id_time_${roomId}_${guestInfo.userName}_${guestInfo.role}`;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(storageTimeKey);
      console.log('✅ 已清理访客ID缓存（房间解散）');
    }

    setZegoToken(null);
    setGuestInfo(null);
    setInMeeting(false);
    message.error('房间已解散');

    // 尝试关闭窗口
    setTimeout(() => {
      window.close();
    }, 1000);
  };

  // 处理房间消息
  const handleRoomMessage = (message: any) => {
    try {
      const data = JSON.parse(message.message);
      console.log('收到房间消息:', data);

      // 检查是否是发给自己的消息
      const currentUserId = guestInfo?.userName || '';
      const isTargeted =
        data.targetUserIds === 'ALL' ||
        data.targetUserIds.includes('ALL') ||
        data.targetUserIds.includes(currentUserId);

      if (!isTargeted) {
        console.log('消息不是发给我的，忽略');
        return;
      }

      // 处理提词器内容推送
      if (data.type === 'TELEPROMPTER_CONTENT') {
        setTeleprompterContent(data.content);
        setTeleprompterSpeed(data.scrollSpeed || 50);
        setTeleprompterHeight(data.displayHeight || '50vh');
        message.info('收到新的提词内容');
      }

      // 处理提词器控制指令
      if (data.type === 'TELEPROMPTER_CONTROL') {
        if (data.action === 'PLAY') {
          setTeleprompterVisible(true);
          resetScroll();
          setTimeout(() => startScrolling(), 100);
        } else if (data.action === 'PAUSE') {
          stopScrolling();
        } else if (data.action === 'STOP') {
          stopScrolling();
          setTeleprompterVisible(false);
          resetScroll();
        }
      }
    } catch (error) {
      console.error('处理房间消息失败:', error);
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
      if (roomCheckIntervalRef.current) {
        clearInterval(roomCheckIntervalRef.current);
      }
    };
  }, []);

  // 生成访客 Token（调用公开接口）
  const generateGuestToken = async (guestId: string, userName: string, role: GuestRole) => {
    try {
      const response = await axios.post<{
        success: boolean;
        data: { token: string; appId: number };
      }>('/api/zego/generate-guest-token', {
        userId: guestId, // 传递前端生成的 guestId
        roomId,
        userName,
        role,
        expireTime: 7200,
      });

      if (!response.data.success || !response.data.data?.token) {
        throw new Error('获取视频Token失败');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('生成访客 Token 失败:', error);
      throw error;
    }
  };

  // 加入视频房间
  const joinMeeting = async (values: JoinFormValues) => {
    try {
      console.log('访客加入视频面试房间...', { roomId, ...values });
      setLoading(true);

      if (!roomId) {
        throw new Error('房间ID无效');
      }

      // 如果姓名为空，使用默认名称
      const userName = values.userName?.trim() || (values.role === 'customer' ? '客户' : '阿姨');

      // 🔧 生成或获取持久化的访客 ID（支持会话恢复）
      // 使用 localStorage 存储访客ID，确保同一个访客重新进入时使用相同的ID
      const storageKey = `guest_id_${roomId}_${userName}_${values.role}`;
      const storageTimeKey = `guest_id_time_${roomId}_${userName}_${values.role}`;

      let guestId = localStorage.getItem(storageKey);
      const storedTime = localStorage.getItem(storageTimeKey);

      // 检查是否过期（1小时 = 3600000ms）
      const isExpired = storedTime && (Date.now() - parseInt(storedTime)) > 3600000;

      if (!guestId || isExpired) {
        // 首次进入或ID已过期，生成新的访客ID
        // ZEGO userId 要求：只能包含字母、数字、下划线，长度不超过32位
        // 使用纯数字+字母的格式，避免下划线开头
        const timestamp = Date.now().toString();
        const randomStr = Math.random().toString(36).substring(2, 9);
        guestId = `guest${timestamp}${randomStr}`; // 移除下划线，避免 ZEGO userId invalid 错误
        localStorage.setItem(storageKey, guestId);
        localStorage.setItem(storageTimeKey, Date.now().toString());
        console.log(isExpired ? '⏰ ID已过期，生成新访客ID:' : '✅ 首次进入，生成新访客ID:', guestId);
      } else {
        // 重新进入，使用已有的访客ID（会话恢复）
        console.log('🔄 会话恢复，使用已有访客ID:', guestId);
        // 更新时间戳
        localStorage.setItem(storageTimeKey, Date.now().toString());
      }

      const displayName = `${userName}（${values.role === 'customer' ? '客户' : '阿姨'}）`;

      console.log('访客信息:', { guestId, displayName, roomId });

      // 获取 Token（传递 guestId）
      const { token: baseToken, appId } = await generateGuestToken(guestId, displayName, values.role);
      console.log('获取到 Base Token:', baseToken.substring(0, 20) + '...');
      console.log('=== 访客端 - 房间信息 ===');
      console.log('房间ID:', roomId);
      console.log('房间ID类型:', typeof roomId);
      console.log('房间ID长度:', roomId?.length);
      console.log('房间ID字符:', roomId ? Array.from(roomId).map(c => c.charCodeAt(0)) : 'undefined');
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
      setZegoToken(kitToken);
      setGuestInfo({ userName: displayName, role: values.role, guestId });
      setInMeeting(true);
      setLoading(false);
    } catch (error: any) {
      console.error('加入房间失败:', error);
      message.error(error.response?.data?.message || error.message || '加入视频面试房间失败，请重试');
      setLoading(false);
    }
  };

  // 初始化 ZEGO SDK
  useEffect(() => {
    if (inMeeting && zegoToken && guestInfo && meetingContainerRef.current && !zegoInstanceRef.current) {
      console.log('容器已渲染，开始初始化 ZEGO...');

      // 🔧 清理容器内容，确保没有残留的DOM元素
      if (meetingContainerRef.current) {
        meetingContainerRef.current.innerHTML = '';
      }

      try {
        const zp = ZegoUIKitPrebuilt.create(zegoToken);
        zegoInstanceRef.current = zp;
        console.log('ZEGO 实例创建成功，开始加入房间...');
        console.log('Token 信息:', {
          tokenLength: zegoToken.length,
          tokenPrefix: zegoToken.substring(0, 20) + '...'
        });

        const config = {
          container: meetingContainerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall, // 使用群组通话模式
          },
          showPreJoinView: false, // 跳过预加入页面，直接进入房间
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true, // 访客也可以使用美颜
          showScreenSharingButton: false, // 访客不允许屏幕共享
          showTextChat: true,
          showUserList: true,
          maxUsers: 6, // 最多6人
          layout: 'Grid' as const, // 使用网格布局
          showLayoutButton: false, // 不显示布局切换按钮
          showNonVideoUser: true, // 显示没有视频的用户
          showOnlyAudioUser: true, // 显示纯音频用户
          showUserName: true, // 显示用户名
          // 视频配置
          videoResolutionDefault: ZegoUIKitPrebuilt.VideoResolution_360P,
          // 🎨 美颜功能通过音视频设置按钮访问（访客也可以使用）
          // 访客权限：隐藏管理按钮
          showRemoveUserButton: false, // 访客不能踢人
          showTurnOffRemoteMicrophoneButton: false, // 访客不能禁言他人
          showTurnOffRemoteCameraButton: false, // 访客不能关闭他人摄像头
          // 加入房间成功回调
          onJoinRoom: () => {
            console.log('✅ 访客端成功加入房间');
            message.success('成功加入视频面试房间');

            // 启动定期检查房间状态（每5秒检查一次）
            roomCheckIntervalRef.current = setInterval(() => {
              checkRoomStatus();
            }, 5000);

            // 启动提词器消息轮询（每2秒检查一次）
            teleprompterPollIntervalRef.current = setInterval(() => {
              pollTeleprompterMessages();
            }, 2000);
          },
          // 监听房间状态变化（被服务端强制踢出）
          onRoomStateChanged: (roomID: string, state: string, errorCode: number, extendedData: any) => {
            console.log('房间状态变化:', { roomID, state, errorCode, extendedData });

            // state: 'DISCONNECTED', errorCode: 3 表示被服务端强制踢出
            if (state === 'DISCONNECTED' && errorCode === 3) {
              console.log('⚠️ 被服务端强制踢出房间');

              // 立即显示提示并自动处理
              message.warning('主持人已解散房间，您已被强制离开', 3);

              // 自动清理并关闭
              handleRoomDismissed();
            }
          },
          onLeaveRoom: () => {
            console.log('访客端离开房间');

            // 停止定期检查
            if (roomCheckIntervalRef.current) {
              clearInterval(roomCheckIntervalRef.current);
              roomCheckIntervalRef.current = null;
            }

            // 停止提词器轮询
            if (teleprompterPollIntervalRef.current) {
              clearInterval(teleprompterPollIntervalRef.current);
              teleprompterPollIntervalRef.current = null;
            }

            // 通知后端用户离开
            if (roomId && guestInfo) {
              axios.post('/api/zego/leave-room', {
                roomId,
                userId: guestInfo.guestId,
              }).catch(error => {
                console.error('通知后端离开房间失败:', error);
              });
            }

            // 🔧 清理容器内容
            if (meetingContainerRef.current) {
              meetingContainerRef.current.innerHTML = '';
              console.log('✅ 容器内容已清理');
            }

            // 🎯 关键修改：不再清理 localStorage 中的访客ID
            // 保留访客ID，让用户重新进入时能够恢复会话，避免重复画面
            // localStorage 中的ID会在房间解散时清理，或者1小时后自动过期
            if (guestInfo && roomId) {
              console.log('✅ 保留访客ID缓存，支持会话恢复');
            }

            zegoInstanceRef.current = null;
            setZegoToken(null);
            setGuestInfo(null);
            setInMeeting(false);
            message.info('已离开视频面试房间');
            // 访客离开后显示提示
            setTimeout(() => {
              window.close(); // 尝试关闭窗口
            }, 1000);
          },
          onUserJoin: (users: any[]) => {
            console.log('✅ 用户加入房间:', users);
            message.success(`${users.map(u => u.userName).join(', ')} 加入了房间`);
          },
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
                    // 🔥 第二次还是没找到，打印详细信息帮助调试
                    console.log('🔥 第二次尝试仍未找到，打印所有视频元素信息：');
                    const allVideos = meetingContainerRef.current?.querySelectorAll('video');
                    allVideos?.forEach((video: any, index) => {
                      console.log(`  Video ${index}:`, {
                        id: video.id,
                        className: video.className,
                        parentId: video.parentElement?.id,
                        parentClass: video.parentElement?.className,
                        grandParentId: video.parentElement?.parentElement?.id,
                      });
                    });
                  }
                }
              } catch (error) {
                console.error(`清理用户 ${user.userName} 视频元素失败:`, error);
              }
            };

            users.forEach(user => cleanupUser(user));

            message.info(`${users.map(u => u.userName).join(', ')} 离开了房间`);
          },
          // 📝 监听房间消息（用于接收提词器指令）
          onInRoomMessageReceived: (messageInfo: any) => {
            console.log('收到房间消息:', messageInfo);
            handleRoomMessage(messageInfo);
          },
        };

        console.log('访客加入房间配置:', config);
        zp.joinRoom(config);
      } catch (error: any) {
        console.error('初始化 ZEGO 失败:', error);
        message.error('初始化视频失败，请重试');
        setInMeeting(false);
        setZegoToken(null);
        setGuestInfo(null);
      }
    }
  }, [inMeeting, zegoToken, guestInfo]);

  // 🔧 监听浏览器标签页关闭/刷新事件
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🔧 检测到页面即将关闭/刷新，主动调用离开房间');

      // 🎯 关键：主动调用 ZEGO 的 destroy 方法，触发正常的离开流程
      if (zegoInstanceRef.current) {
        try {
          // 调用 ZEGO 的销毁方法，这会触发 onLeaveRoom 回调
          zegoInstanceRef.current.destroy();
          console.log('✅ ZEGO 实例已销毁（页面关闭）');
        } catch (error) {
          console.error('销毁 ZEGO 实例失败:', error);
        }
      }

      // 同时通知后端
      if (guestInfo && roomId) {
        const userId = guestInfo.guestId || `guest_${guestInfo.userName}`;
        const leaveData = JSON.stringify({ roomId, userId });
        const blob = new Blob([leaveData], { type: 'application/json' });
        navigator.sendBeacon(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/zego/leave-room`, blob);
        console.log('✅ 已发送离开房间请求（sendBeacon）');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [guestInfo, roomId]);

  // 清理
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

  // 如果已经在会议中，只显示视频容器
  if (inMeeting) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        {/* 视频容器 */}
        <div
          ref={meetingContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        />

        {/* 📝 提词器显示组件 */}
        {teleprompterVisible && (
          <div
            style={{
              position: 'absolute',
              top: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: teleprompterHeight,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              borderRadius: '12px',
              zIndex: 10000,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* 标题栏 */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              }}
            >
              <span style={{ color: 'white', fontSize: '16px', fontWeight: 500 }}>
                📝 提词器
              </span>
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    if (isScrolling) {
                      stopScrolling();
                    } else {
                      startScrolling();
                    }
                  }}
                >
                  {isScrolling ? '⏸️ 暂停' : '▶️ 播放'}
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() => {
                    stopScrolling();
                    setTeleprompterVisible(false);
                  }}
                >
                  关闭
                </Button>
              </Space>
            </div>

            {/* 内容区域 */}
            <div
              ref={teleprompterRef}
              style={{
                flex: 1,
                padding: '40px',
                color: 'white',
                fontSize: '24px',
                lineHeight: '2',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
              onWheel={(e) => {
                // 允许用户手动滚动
                if (e.deltaY !== 0) {
                  stopScrolling(); // 手动滚动时停止自动滚动
                }
              }}
            >
              {teleprompterContent || '等待提词内容...'}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 显示加入表单
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 450,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <VideoCameraOutlined style={{ fontSize: 48, color: '#5DBFB3', marginBottom: 16 }} />
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{roomName}</h2>
          <p style={{ color: '#666', marginTop: 8 }}>请填写您的信息加入视频面试</p>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={joinMeeting}
          initialValues={{ role: 'customer' }}
        >
          <Form.Item
            label="选择身份"
            name="role"
            rules={[{ required: true, message: '请选择您的身份' }]}
          >
            <Radio.Group size="large" style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio.Button value="customer" style={{ width: '100%', height: 48, lineHeight: '48px' }}>
                  <UserOutlined /> 我是客户
                </Radio.Button>
                <Radio.Button value="helper" style={{ width: '100%', height: 48, lineHeight: '48px' }}>
                  <UserOutlined /> 我是阿姨
                </Radio.Button>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="您的姓名"
            name="userName"
            rules={[
              { min: 2, message: '姓名至少2个字符' },
              { max: 20, message: '姓名最多20个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入您的真实姓名"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              style={{ height: 48, fontSize: 16, fontWeight: 600 }}
            >
              加入视频面试
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16, textAlign: 'center', color: '#999', fontSize: 12 }}>
          <p>进入房间后，请确保您的摄像头和麦克风权限已开启</p>
        </div>
      </Card>
    </div>
  );
};

export default JoinInterview;

