import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './H5Login.css';

interface LoginFormValues {
  username: string;
  password: string;
}

const H5Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      console.log('📱 移动端视频面试登录...', values);

      const response = await axios.post('/api/auth/login', {
        username: values.username,
        password: values.password,
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // 保存token和用户信息
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        message.success('登录成功！');

        // 跳转到视频面试页面
        navigate('/interview/video');
      } else {
        message.error(response.data.message || '登录失败');
      }
    } catch (error: any) {
      console.error('登录失败:', error);
      message.error(error.response?.data?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h5-login-container">
      <div className="h5-login-content">
        {/* Logo和标题 */}
        <div className="h5-login-header">
          <div className="h5-login-logo">📹</div>
          <h1 className="h5-login-title">视频面试</h1>
          <p className="h5-login-subtitle">移动端主持人登录</p>
        </div>

        {/* 登录表单 */}
        <Form
          name="h5-login"
          onFinish={handleLogin}
          autoComplete="off"
          size="large"
          className="h5-login-form"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="h5-login-button"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        {/* 提示信息 */}
        <div className="h5-login-tips">
          <p>💡 温馨提示：</p>
          <ul>
            <li>请使用您的CRM账号登录</li>
            <li>登录后可创建和管理视频面试</li>
            <li>建议使用微信内置浏览器打开</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default H5Login;

