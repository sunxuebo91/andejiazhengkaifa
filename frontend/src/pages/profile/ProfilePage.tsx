import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Descriptions, Avatar, Button, Space, Typography, Divider } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <div>请先登录</div>;
  }

  // 处理编辑个人信息按钮点击
  const handleEditProfile = () => {
    navigate('/settings/account', { state: { activeTab: 'profile' } });
  };

  // 处理修改密码按钮点击
  const handleChangePassword = () => {
    navigate('/settings/account', { state: { activeTab: 'security' } });
  };

  return (
    <PageContainer
      header={{
        title: '个人信息',
      }}
    >
      <Card variant="outlined" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <Avatar 
            size={80} 
            icon={<UserOutlined />} 
            style={{ backgroundColor: '#1890ff', marginRight: 24 }}
          />
          <div>
            <Title level={3} style={{ margin: 0 }}>{user.name}</Title>
            <Paragraph type="secondary">{user.role === 'admin' ? '管理员' : user.role === 'manager' ? '经理' : '普通员工'}</Paragraph>
          </div>
        </div>

        <Divider />

        <Descriptions title="基本信息" column={1} labelStyle={{ fontWeight: 'bold' }}>
          <Descriptions.Item label="用户名">
            <Space>
              <UserOutlined />
              {user.username}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="姓名">
            <Space>
              <UserOutlined />
              {user.name}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="电子邮箱">
            <Space>
              <MailOutlined />
              {user.email || '未设置'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="手机号码">
            <Space>
              <PhoneOutlined />
              {user.phone || '未设置'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="角色">
            <Space>
              <TeamOutlined />
              {user.role === 'admin' ? '管理员' : user.role === 'manager' ? '经理' : '普通员工'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="注册时间">
            <Space>
              <CalendarOutlined />
              {new Date().toLocaleDateString()}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Space>
            <Button type="primary" onClick={handleEditProfile}>编辑个人信息</Button>
            <Button onClick={handleChangePassword}>修改密码</Button>
          </Space>
        </div>
      </Card>
    </PageContainer>
  );
};

export default ProfilePage; 