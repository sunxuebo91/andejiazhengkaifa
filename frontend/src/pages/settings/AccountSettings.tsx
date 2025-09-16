import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Tabs, Form, Input, Button, Switch, Select, App, Divider } from 'antd';
import { UserOutlined, LockOutlined, BellOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import AvatarUpload from '../../components/AvatarUpload';

const { TabPane } = Tabs;
const { Option } = Select;

const AccountSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user } = useAuth();
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const location = useLocation();

  // 从路由状态获取活动标签
  useEffect(() => {
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const handleSubmit = (values: any) => {
    console.log('提交表单:', values);
    message.success('设置已保存');
  };

  return (
    <PageContainer
      header={{
        title: '账户设置',
      }}
    >
      <Card variant="outlined">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <UserOutlined />
                个人信息
              </span>
            }
            key="profile"
          >
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              {/* 头像上传区域 */}
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <AvatarUpload size={120} />
                <div style={{ marginTop: 16, color: '#666', fontSize: '14px' }}>
                  点击头像可以更换
                  <br />
                  支持 JPG、PNG 格式，文件大小不超过 5MB
                </div>
              </div>

              <Divider />

              <Form
                layout="vertical"
                form={form}
                initialValues={{
                  username: user?.username || '',
                  name: user?.name || '',
                  email: user?.email || '',
                  phone: user?.phone || '',
                }}
                onFinish={handleSubmit}
              >
              <Form.Item label="用户名" name="username">
                <Input disabled prefix={<UserOutlined />} />
              </Form.Item>
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input prefix={<UserOutlined />} />
              </Form.Item>
              <Form.Item
                label="电子邮箱"
                name="email"
                rules={[
                  { type: 'email', message: '请输入有效的电子邮箱' },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="手机号码"
                name="phone"
                rules={[
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  保存变更
                </Button>
              </Form.Item>
            </Form>
            </div>
          </TabPane>
          
          <TabPane
            tab={
              <span>
                <LockOutlined />
                安全设置
              </span>
            }
            key="security"
          >
            <Form
              layout="vertical"
              style={{ maxWidth: 500, margin: '0 auto' }}
              onFinish={handleSubmit}
            >
              <Form.Item label="当前密码" name="currentPassword" rules={[{ required: true }]}>
                <Input.Password />
              </Form.Item>
              <Form.Item label="新密码" name="newPassword" rules={[{ required: true }]}>
                <Input.Password />
              </Form.Item>
              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  更新密码
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
          
          <TabPane
            tab={
              <span>
                <BellOutlined />
                通知设置
              </span>
            }
            key="notifications"
          >
            <Form
              layout="vertical"
              style={{ maxWidth: 500, margin: '0 auto' }}
              onFinish={handleSubmit}
              initialValues={{
                emailNotifications: true,
                smsNotifications: true,
              }}
            >
              <Form.Item label="电子邮件通知" name="emailNotifications" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item label="短信通知" name="smsNotifications" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item label="通知频率" name="notificationFrequency" initialValue="immediate">
                <Select>
                  <Option value="immediate">立即</Option>
                  <Option value="daily">每日摘要</Option>
                  <Option value="weekly">每周摘要</Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
          
          <TabPane
            tab={
              <span>
                <SettingOutlined />
                系统偏好
              </span>
            }
            key="preferences"
          >
            <Form
              layout="vertical"
              style={{ maxWidth: 500, margin: '0 auto' }}
              onFinish={handleSubmit}
              initialValues={{
                language: 'zh-CN',
                theme: 'light',
                timezone: 'Asia/Shanghai'
              }}
            >
              <Form.Item label="语言" name="language">
                <Select>
                  <Option value="zh_CN">简体中文</Option>
                  <Option value="en_US">English</Option>
                </Select>
              </Form.Item>
              <Form.Item label="主题" name="theme">
                <Select>
                  <Option value="light">浅色</Option>
                  <Option value="dark">深色</Option>
                  <Option value="system">跟随系统</Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  保存偏好
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </PageContainer>
  );
};

export default AccountSettings; 