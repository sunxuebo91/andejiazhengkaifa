import React, { useState, useEffect } from 'react';
import { Card, QRCode, Typography, Alert, Spin, Button, message } from 'antd';
import { WechatOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const WeChatBind: React.FC = () => {
  const { user } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [bound, setBound] = useState(false);

  // 检查用户是否已绑定微信
  useEffect(() => {
    if (user?.wechatOpenId) {
      setBound(true);
    }
  }, [user]);

  // 生成绑定二维码
  const generateQRCode = async () => {
    if (!user?._id) {
      message.error('用户信息获取失败');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/wechat/bind-qrcode/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setQrCodeUrl(result.data.qrCodeUrl);
      } else {
        message.error(result.message || '二维码生成失败');
      }
    } catch (error) {
      console.error('生成二维码失败:', error);
      message.error('二维码生成失败');
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时自动生成二维码
  useEffect(() => {
    if (!bound && user?._id) {
      generateQRCode();
    }
  }, [bound, user]);

  if (bound) {
    return (
      <Card style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
        <Title level={3}>微信已绑定</Title>
        <Text type="secondary">
          您已成功绑定微信，将会收到线索分配等重要通知。
        </Text>
        {user?.wechatNickname && (
          <div style={{ marginTop: 16 }}>
            <Text>绑定账号：{user.wechatNickname}</Text>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <WechatOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={3}>绑定微信服务号</Title>
          <Text type="secondary">
            绑定后您将收到线索分配、状态变更等重要通知
          </Text>
        </div>

        <Alert
          message="绑定步骤"
          description={
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li>使用微信扫描下方二维码</li>
              <li>关注"安得家政"服务号</li>
              <li>绑定成功后页面会自动更新</li>
            </ol>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <div style={{ textAlign: 'center' }}>
          {loading ? (
            <Spin size="large" />
          ) : qrCodeUrl ? (
            <div>
              <QRCode value={qrCodeUrl} size={200} />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">请使用微信扫描二维码</Text>
              </div>
              <div style={{ marginTop: 16 }}>
                <Button onClick={generateQRCode} loading={loading}>
                  刷新二维码
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Text type="secondary">二维码生成失败</Text>
              <div style={{ marginTop: 16 }}>
                <Button type="primary" onClick={generateQRCode} loading={loading}>
                  重新生成
                </Button>
              </div>
            </div>
          )}
        </div>

        <Alert
          message="注意事项"
          description={
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>二维码有效期为7天</li>
              <li>每个员工账号只能绑定一个微信</li>
              <li>如需更换绑定，请联系管理员</li>
            </ul>
          }
          type="warning"
          showIcon
          style={{ marginTop: 24 }}
        />
      </Card>
    </div>
  );
};

export default WeChatBind;
