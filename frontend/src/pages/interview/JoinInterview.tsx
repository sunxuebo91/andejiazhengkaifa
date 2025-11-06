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
  const [guestInfo, setGuestInfo] = useState<{ userName: string; role: GuestRole } | null>(null);

  // 从 URL 获取房间名称（可选）
  const roomName = searchParams.get('name') || '视频面试';

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

      // 生成访客 ID（使用时间戳 + 随机数）
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const displayName = `${values.userName}（${values.role === 'customer' ? '客户' : '阿姨'}）`;

      console.log('生成访客ID:', guestId);

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
      setGuestInfo({ userName: displayName, role: values.role });
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
            mode: ZegoUIKitPrebuilt.GroupCall, // 使用群组通话模式（官方推荐）
          },
          showPreJoinView: false, // 跳过预加入页面，直接进入房间
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: false, // 访客不允许屏幕共享
          showTextChat: true,
          showUserList: true,
          maxUsers: 6,
          layout: 'Grid' as const, // 使用网格布局（类似您的截图）
          showLayoutButton: false, // 不显示布局切换按钮
          showNonVideoUser: true, // 显示没有视频的用户
          showOnlyAudioUser: true, // 显示纯音频用户
          showUserName: true, // 显示用户名
          // 视频配置
          videoResolutionDefault: ZegoUIKitPrebuilt.VideoResolution_360P,
          // 加入房间成功回调
          onJoinRoom: () => {
            console.log('✅ 访客端成功加入房间');
            message.success('成功加入视频面试房间');
          },
          onLeaveRoom: () => {
            console.log('访客端离开房间');
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
            console.log('用户离开房间:', users);
            message.info(`${users.map(u => u.userName).join(', ')} 离开了房间`);
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

  // 清理
  useEffect(() => {
    return () => {
      if (zegoInstanceRef.current) {
        try {
          zegoInstanceRef.current.destroy();
        } catch (error) {
          console.error('销毁 ZEGO 实例失败:', error);
        }
      }
    };
  }, []);

  // 如果已经在会议中，只显示视频容器
  if (inMeeting) {
    return (
      <div
        ref={meetingContainerRef}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
        }}
      />
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
          <VideoCameraOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
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
              { required: true, message: '请输入您的姓名' },
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

