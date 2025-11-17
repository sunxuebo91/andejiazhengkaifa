import React, { useState, useEffect, useRef } from 'react';
import { message, Modal } from 'antd';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
// 🎯 引入 AI 降噪模块
import { AiDenoise } from 'zego-express-engine-webrtc/aidenoise';
import { generateZegoToken } from '../../services/zego';
import { apiService } from '../../services/api';
import './H5VideoRoom.css';

interface H5VideoRoomProps {
  roomId: string;
  userId: string;
  userName: string;
  role: 'host' | 'guest' | 'helper'; // 主持人 | 普通访客 | 阿姨
  onLeave?: () => void;
}

interface Participant {
  userId: string;
  userName: string;
  streamId: string;
  stream?: MediaStream;
}

const H5VideoRoom: React.FC<H5VideoRoomProps> = ({
  roomId,
  userId,
  userName,
  role,
  onLeave
}) => {
  // ZEGO 相关
  const zegoEngineRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // 状态
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [signalStrength] = useState(3); // 0-3 (暂时固定值，后续可以动态更新)

  // 🎯 新增：准备页面和加载状态
  const [isReady, setIsReady] = useState(false); // 是否已准备好（点击了加入按钮）
  const [isLoading, setIsLoading] = useState(false); // 是否正在加载
  const [loadingProgress, setLoadingProgress] = useState(0); // 加载进度 0-100
  const [loadingText, setLoadingText] = useState('准备中...'); // 加载提示文本

  // 定时器
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化 ZEGO
  useEffect(() => {
    // 🎯 只有点击"加入面试间"后才初始化
    if (!isReady) {
      return;
    }

    const initZego = async () => {
      try {
        setIsLoading(true);
        setLoadingProgress(0);
        setLoadingText('正在连接服务器...');
        console.log('🚀 初始化 ZEGO Express Engine...');

        // 获取 token
        const response = await generateZegoToken({
          userId,
          roomId,
          userName,
          expireTime: 7200,
        });

        if (!response.data || !response.data.appId || !response.data.token) {
          throw new Error('获取 ZEGO 配置失败');
        }

        const { appId, token } = response.data;
        const server = 'wss://webliveroom-api.zego.im/ws';

        setLoadingProgress(20);
        setLoadingText('正在初始化引擎...');

        // 🎯 在创建引擎前注册 AI 降噪模块
        (ZegoExpressEngine as any).use(AiDenoise);
        console.log('✅ AI 降噪模块已注册');

        // 创建引擎
        const zg = new (ZegoExpressEngine as any)(appId, server);

        // 设置日志级别为 ERROR，减少控制台输出
        zg.setLogConfig({
          logLevel: 'error',  // 只输出错误日志
          remoteLogLevel: 'disable'  // 禁用远程日志
        });

        zegoEngineRef.current = zg;

        setLoadingProgress(40);
        setLoadingText('正在登录房间...');

        // 监听远端流更新
        zg.on('roomStreamUpdate', async (roomID: string, updateType: string, streamList: any[]) => {
          console.log('📡 远端流更新:', { roomID, updateType, streamList });

          if (updateType === 'ADD') {
            for (const stream of streamList) {
              const remoteStream = await zg.startPlayingStream(stream.streamID);
              
              setParticipants(prev => {
                const exists = prev.some(p => p.streamId === stream.streamID);
                if (!exists) {
                  return [...prev, {
                    userId: stream.user.userID,
                    userName: stream.user.userName,
                    streamId: stream.streamID,
                    stream: remoteStream
                  }];
                }
                return prev;
              });

              message.success(`${stream.user.userName} 加入了房间`);
            }
          } else if (updateType === 'DELETE') {
            for (const stream of streamList) {
              zg.stopPlayingStream(stream.streamID);
              
              setParticipants(prev => prev.filter(p => p.streamId !== stream.streamID));
              
              message.info(`${stream.user.userName} 离开了房间`);
            }
          }
        });

        // 登录房间
        await zg.loginRoom(roomId, token, { userID: userId, userName: userName }, { userUpdate: true });
        console.log('✅ 登录房间成功');

        setLoadingProgress(60);
        setLoadingText('正在打开摄像头...');

        // 创建本地流（优化参数，提升加载速度）
        const localStream = await zg.createStream({
          camera: {
            audio: true,
            video: {
              quality: 3,  // 视频质量 1-4，使用3平衡质量和速度
              frameRate: 15,  // 帧率
              width: 360,  // 宽度（降低分辨率提升速度）
              height: 640  // 高度（竖屏 9:16 比例）
            }
          }
        });
        localStreamRef.current = localStream;

        setLoadingProgress(80);
        setLoadingText('正在连接视频...');

        // 🎯 立即渲染本地视频（提升用户体验）
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play();
        }

        // 推流
        const streamID = `${roomId}_${userId}_main`;
        await zg.startPublishingStream(streamID, localStream);
        console.log('✅ 推流成功');

        setLoadingProgress(100);
        setLoadingText('加载完成！');

        // 🎯 异步启用 AI 降噪（不阻塞推流）
        zg.enableAiDenoise(localStream, true)
          .then(() => {
            console.log('✅ AI 降噪已启用');
          })
          .catch((error: any) => {
            console.warn('⚠️ AI 降噪启用失败:', error);
          });

        // 延迟隐藏加载界面
        setTimeout(() => {
          setIsLoading(false);
        }, 500);

        // 启动时长计时器
        durationTimerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);

      } catch (error: any) {
        console.error('❌ 初始化失败:', error);
        console.error('❌ 错误详情:', JSON.stringify(error, null, 2));

        let errorMessage = '初始化视频失败';
        if (error) {
          if (typeof error === 'string') {
            errorMessage = error;
          } else if (error.message) {
            errorMessage = error.message;
          } else if (error.msg) {
            errorMessage = error.msg;
          } else if (error.code) {
            errorMessage = `错误代码: ${error.code}`;
          }
        }

        setIsLoading(false);
        setIsReady(false); // 重置状态，允许重新尝试
        message.error(`初始化失败: ${errorMessage}`);
        if (onLeave) {
          onLeave();
        }
      }
    };

    initZego();

    // 清理
    return () => {
      if (zegoEngineRef.current && roomId) {
        try {
          if (localStreamRef.current) {
            zegoEngineRef.current.stopPublishingStream(`${roomId}_${userId}_main`);
          }
          zegoEngineRef.current.logoutRoom(roomId);
          zegoEngineRef.current.destroyEngine();
        } catch (error) {
          console.error('清理失败:', error);
        }
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [roomId, userId, userName, isReady]); // 🎯 添加 isReady 依赖

  // 渲染远端视频
  useEffect(() => {
    participants.forEach(participant => {
      if (participant.stream) {
        const videoElement = remoteVideoRefs.current.get(participant.streamId);
        if (videoElement && videoElement.srcObject !== participant.stream) {
          videoElement.srcObject = participant.stream;
          videoElement.play();
        }
      }
    });
  }, [participants]);

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 切换麦克风
  const toggleMicrophone = () => {
    if (!zegoEngineRef.current) return;
    const newState = !isMicOn;
    zegoEngineRef.current.muteMicrophone(!newState);
    setIsMicOn(newState);
    message.success(newState ? '麦克风已开启' : '麦克风已关闭');
  };

  // 切换摄像头
  const toggleCamera = () => {
    if (!zegoEngineRef.current || !localStreamRef.current) return;
    const newState = !isCameraOn;
    zegoEngineRef.current.mutePublishStreamVideo(localStreamRef.current, !newState);
    setIsCameraOn(newState);
    message.success(newState ? '摄像头已开启' : '摄像头已关闭');
  };

  // 翻转摄像头
  const switchCamera = () => {
    message.info('摄像头翻转功能开发中');
  };

  // 美颜
  const toggleBeauty = () => {
    message.info('美颜功能开发中');
  };

  // 分享链接
  const handleShareLink = () => {
    // 检测设备类型，生成对应的访客链接
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const shareUrl = isMobile
      ? `${window.location.origin}/interview/join-mobile/${roomId}`  // 移动端访客页面
      : `${window.location.origin}/interview/join/${roomId}`;        // PC端访客页面

    // 尝试使用 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          message.success('邀请链接已复制到剪贴板');
        })
        .catch(() => {
          // 降级方案
          fallbackCopyToClipboard(shareUrl);
        });
    } else {
      // 降级方案
      fallbackCopyToClipboard(shareUrl);
    }
  };

  // 降级复制方案（兼容旧浏览器）
  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        message.success('邀请链接已复制到剪贴板');
      } else {
        message.error('复制失败，请手动复制链接');
      }
    } catch (err) {
      message.error('复制失败，请手动复制链接');
    }

    document.body.removeChild(textArea);
  };

  // 挂断
  const handleHangup = () => {
    Modal.confirm({
      title: '确认离开',
      content: '确定要离开视频面试房间吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        onLeave?.();
      }
    });
  };

  // 禁言
  const handleMuteUser = (participant: Participant) => {
    Modal.confirm({
      title: '禁言用户',
      content: `确定要禁言 ${participant.userName} 吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          // TODO: 调用后端 API 禁言
          message.success(`已禁言 ${participant.userName}`);
        } catch (error) {
          message.error('禁言失败');
        }
      }
    });
  };

  // 禁视频
  const handleMuteVideo = (participant: Participant) => {
    Modal.confirm({
      title: '关闭视频',
      content: `确定要关闭 ${participant.userName} 的视频吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          // TODO: 调用后端 API 禁视频
          message.success(`已关闭 ${participant.userName} 的视频`);
        } catch (error) {
          message.error('操作失败');
        }
      }
    });
  };

  // 踢人
  const handleKickUser = (participant: Participant) => {
    Modal.confirm({
      title: '踢出用户',
      content: `确定要踢出 ${participant.userName} 吗？`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiService.post('/api/zego/kick-user', {
            roomId,
            userId: participant.userId
          });
          message.success(`已踢出 ${participant.userName}`);
        } catch (error) {
          message.error('踢人失败');
        }
      }
    });
  };

  // 渲染信号强度
  const renderSignalStrength = () => {
    const bars = [];
    for (let i = 0; i < 4; i++) {
      bars.push(
        <div
          key={i}
          className={`signal-bar ${i < signalStrength ? 'active' : ''}`}
          style={{ height: `${(i + 1) * 4}px` }}
        />
      );
    }
    return <div className="signal-strength">{bars}</div>;
  };

  return (
    <div className="h5-video-room">
      {/* 🎯 准备页面 - 显示"加入面试间"按钮 */}
      {!isReady && !isLoading && (
        <div className="prepare-page">
          <div className="prepare-content">
            <div className="prepare-icon">🎥</div>
            <h2 className="prepare-title">视频面试</h2>
            <div className="prepare-info">
              <p>房间号: <strong>{roomId}</strong></p>
              <p>用户名: <strong>{userName}</strong></p>
              <p>角色: <strong>{role === 'host' ? '主持人' : role === 'helper' ? '阿姨' : '访客'}</strong></p>
            </div>
            <button
              className="join-button"
              onClick={() => setIsReady(true)}
            >
              加入面试间
            </button>
            <div className="prepare-tips">
              <p>💡 温馨提示：</p>
              <ul>
                <li>请确保网络连接稳定</li>
                <li>请允许浏览器访问摄像头和麦克风</li>
                <li>建议使用耳机以获得更好的音质</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 加载页面 - 显示加载进度 */}
      {isLoading && (
        <div className="loading-page">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h3 className="loading-title">{loadingText}</h3>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <div className="progress-text">{loadingProgress}%</div>
          </div>
        </div>
      )}

      {/* 🎯 视频房间 - 加载完成后显示 */}
      {isReady && !isLoading && (
        <>
          {/* 顶部状态栏 */}
          <div className="top-bar">
            <div className="room-id">房间: {roomId}</div>
            {renderSignalStrength()}
            <div className="duration">{formatDuration(duration)}</div>
          </div>

          {/* 视频区域 - 待实现 */}
          <div className="video-container">
        {/* 本地视频 */}
        <div className="video-item">
          <video ref={localVideoRef} autoPlay playsInline muted className="video-element" />
          <div className="video-label">{userName}（我）</div>
        </div>

        {/* 远端视频 */}
        {participants.slice(0, 5).map((participant) => (
          <div key={participant.streamId} className="video-item">
            <video
              ref={(el) => {
                if (el) remoteVideoRefs.current.set(participant.streamId, el);
              }}
              autoPlay
              playsInline
              className="video-element"
            />
            <div className="video-label">{participant.userName}</div>
            
            {/* 主持人操作按钮 */}
            {role === 'host' && (
              <div className="video-controls">
                <button className="control-btn" onClick={() => handleMuteUser(participant)}>
                  🔇
                </button>
                <button className="control-btn" onClick={() => handleMuteVideo(participant)}>
                  📹
                </button>
                <button className="control-btn" onClick={() => handleKickUser(participant)}>
                  👢
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部工具栏 - 待完善 */}
      <div className="bottom-toolbar">
        <button className={`tool-btn ${isMicOn ? 'active' : ''}`} onClick={toggleMicrophone}>
          {isMicOn ? '🎤' : '🔇'}
        </button>
        <button className={`tool-btn ${isCameraOn ? 'active' : ''}`} onClick={toggleCamera}>
          {isCameraOn ? '📹' : '📷'}
        </button>
        <button className="tool-btn" onClick={switchCamera}>
          🔄
        </button>
        <button className="tool-btn" onClick={toggleBeauty}>
          🎨
        </button>
        <button className="hangup-btn" onClick={handleHangup}>
          ⭕
        </button>
        <button className="expand-btn" onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
          {isDrawerOpen ? '◀️' : '▶️'}
        </button>
      </div>

      {/* 右侧抽屉 - 待实现 */}
      {isDrawerOpen && (
        <div className="side-drawer">
          <div className="drawer-content">
            {role === 'host' && (
              <div className="drawer-item" onClick={() => setIsTeleprompterOpen(true)}>
                <span className="drawer-icon">📝</span>
                <span className="drawer-label">提词器控制</span>
              </div>
            )}
            {role === 'helper' && (
              <div className="drawer-item" onClick={() => setIsTeleprompterOpen(true)}>
                <span className="drawer-icon">📝</span>
                <span className="drawer-label">提词器</span>
              </div>
            )}
            <div className="drawer-item">
              <span className="drawer-icon">👥</span>
              <span className="drawer-label">参与者</span>
            </div>
            {role === 'host' && (
              <div className="drawer-item" onClick={handleShareLink}>
                <span className="drawer-icon">🔗</span>
                <span className="drawer-label">分享链接</span>
              </div>
            )}
            <div className="drawer-item">
              <span className="drawer-icon">⚙️</span>
              <span className="drawer-label">设置</span>
            </div>
            <div className="drawer-item" onClick={handleHangup}>
              <span className="drawer-icon">🚪</span>
              <span className="drawer-label">离开房间</span>
            </div>
            {role === 'host' && (
              <div className="drawer-item danger">
                <span className="drawer-icon">⚠️</span>
                <span className="drawer-label">解散房间</span>
              </div>
            )}
          </div>
        </div>
      )}

          {/* 提词器 - 待实现 */}
          {isTeleprompterOpen && (
            <div className="teleprompter-overlay">
              <div className="teleprompter-panel">
                <div className="teleprompter-header">
                  <span>📝 提词器</span>
                  <button onClick={() => setIsTeleprompterOpen(false)}>✕</button>
                </div>
                <div className="teleprompter-content">
                  <p>提词器内容...</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default H5VideoRoom;

