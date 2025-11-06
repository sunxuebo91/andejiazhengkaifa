import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Form, Space, message, Modal, Typography, Spin } from 'antd';
import { VideoCameraOutlined, UserOutlined, TeamOutlined, ShareAltOutlined, CopyOutlined } from '@ant-design/icons';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { generateZegoToken } from '../../services/zego';

const { Title, Paragraph } = Typography;

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

  // 生成随机房间ID
  const generateRoomId = () => {
    return `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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

  // 加入视频面试房间
  const joinMeeting = async (values: { roomId: string; userName?: string }) => {
    try {
      console.log('开始加入视频面试房间...', values);
      setLoading(true);
      const currentUser = getCurrentUser();
      console.log('当前用户:', currentUser);
      const userId = currentUser.id;
      const userName = values.userName || currentUser.name;
      const roomId = values.roomId;

      console.log('请求参数:', { userId, roomId, userName });

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
    } catch (error: any) {
      console.error('加入房间失败:', error);
      message.error(error.message || '加入视频面试房间失败，请重试');
      setLoading(false);
    }
  };

  // 生成分享链接
  const generateShareLink = () => {
    if (!roomInfo) {
      message.error('请先创建或加入房间');
      return '';
    }
    const baseUrl = window.location.origin;
    return `${baseUrl}/interview/join/${roomInfo.roomId}?name=${encodeURIComponent('视频面试')}`;
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
            mode: ZegoUIKitPrebuilt.GroupCall, // 使用群组通话模式（官方推荐）
          },
          showPreJoinView: false, // 跳过预加入页面，直接进入房间
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: true,
          showTextChat: true,
          showUserList: true,
          maxUsers: 6, // 最多6人
          layout: 'Grid' as const, // 使用网格布局（类似您的截图）
          showLayoutButton: false, // 不显示布局切换按钮
          showNonVideoUser: true, // 显示没有视频的用户
          showOnlyAudioUser: true, // 显示纯音频用户
          showUserName: true, // 显示用户名
          // 视频配置
          videoResolutionDefault: ZegoUIKitPrebuilt.VideoResolution_360P,
          // 加入房间成功回调
          onJoinRoom: () => {
            console.log('✅ HR端成功加入房间');
            message.success('成功加入视频面试房间');
          },
          // 离开房间回调
          onLeaveRoom: () => {
            console.log('HR端离开房间');
            zegoInstanceRef.current = null;
            setZegoToken(null);
            setRoomInfo(null);
            setInMeeting(false);
            message.info('已离开视频面试房间');
          },
          // 用户加入回调
          onUserJoin: (users: any[]) => {
            console.log('✅ 用户加入房间:', users);
            message.success(`${users.map(u => u.userName).join(', ')} 加入了房间`);
          },
          // 用户离开回调
          onUserLeave: (users: any[]) => {
            console.log('用户离开房间:', users);
            message.info(`${users.map(u => u.userName).join(', ')} 离开了房间`);
          },
        };

        console.log('加入房间配置:', config);
        zp.joinRoom(config);
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
        if (zegoInstanceRef.current) {
          zegoInstanceRef.current.destroy();
          zegoInstanceRef.current = null;
        }
        setZegoToken(null);
        setRoomInfo(null);
        setInMeeting(false);
        message.info('已离开视频面试房间');
      },
    });
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (zegoInstanceRef.current) {
        zegoInstanceRef.current.destroy();
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
            type="primary"
            danger
            size="large"
            onClick={leaveMeeting}
          >
            离开房间
          </Button>
        </div>

        {/* 分享邀请链接弹窗 */}
        <Modal
          title="邀请他人加入视频面试"
          open={shareModalVisible}
          onCancel={() => setShareModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setShareModalVisible(false)}>
              关闭
            </Button>,
            <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={copyShareLink}>
              复制链接
            </Button>,
          ]}
        >
          <div style={{ marginBottom: 16 }}>
            <Paragraph>
              将以下链接发送给客户或阿姨，他们无需登录系统即可直接加入视频面试：
            </Paragraph>
            <Input.TextArea
              value={generateShareLink()}
              readOnly
              autoSize={{ minRows: 3, maxRows: 5 }}
              style={{ marginTop: 8 }}
            />
          </div>
          <div style={{ background: '#f0f2f5', padding: 12, borderRadius: 4 }}>
            <Paragraph style={{ margin: 0, fontSize: 12, color: '#666' }}>
              <strong>使用说明：</strong>
              <br />
              1. 点击"复制链接"按钮复制邀请链接
              <br />
              2. 将链接发送给客户或阿姨（微信、短信等）
              <br />
              3. 对方点击链接后选择身份（客户/阿姨）并输入姓名即可加入
              <br />
              4. 无需登录系统，访客只能访问视频面试页面
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
            style={{ fontSize: '64px', color: '#1890ff', marginBottom: '16px' }}
          />
          <Title level={2}>视频面试</Title>
          <Paragraph type="secondary">
            支持 3-6 人视频面试，内置美颜、屏幕共享、聊天等功能
          </Paragraph>
        </div>

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
            <Form.Item
              label="房间号"
              name="roomId"
              rules={[{ required: true, message: '请输入房间号' }]}
              extra="输入相同房间号的用户将进入同一个视频面试房间"
            >
              <Input
                prefix={<TeamOutlined />}
                placeholder="请输入房间号"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="您的名称"
              name="userName"
              rules={[{ required: true, message: '请输入您的名称' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入您的名称"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'center' }} size="middle">
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<VideoCameraOutlined />}
                  loading={loading}
                >
                  加入视频面试
                </Button>
                <Button
                  size="large"
                  onClick={() => {
                    form.setFieldsValue({ roomId: generateRoomId() });
                  }}
                >
                  生成新房间号
                </Button>
                <Button
                  size="large"
                  icon={<ShareAltOutlined />}
                  onClick={showShareModal}
                >
                  邀请他人
                </Button>
              </Space>
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

