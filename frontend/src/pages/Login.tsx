import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText, ProFormCheckbox } from '@ant-design/pro-form';
import { login as authLogin } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import styles from './Login.module.css';

const LoginPage: React.FC = () => {
  const [loginError, setLoginError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { login: setUserAuth } = useAuth();
  const { message } = App.useApp();

  const handleSubmit = async (values: { username: string; password: string; remember: boolean }) => {
    try {
      setLoading(true);
      setLoginError('');
      
      // 调用登录API，authLogin 内部会处理 token 和用户信息的存储
      const response = await authLogin(values.username, values.password);
      
      // 更新 AuthContext
      setUserAuth(response.user);
      
      // 显示成功消息
      message.success('登录成功');
      
      // 跳转到仪表板
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('登录失败:', error);
      // 显示具体的错误消息
      setLoginError(error.message || '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.top}>
        <h1 className={styles.title}>安得家政管理系统</h1>
        </div>
        <div className={styles.loginCard}>
        {loginError && (
          <Alert
            message="登录失败"
            description={loginError}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}
        <LoginForm
          onFinish={handleSubmit}
          submitter={{
            searchConfig: {
              submitText: '登录',
            },
            submitButtonProps: {
              loading: loading,
              style: {
                width: '100%',
              },
            },
          }}
            style={{
              resize: 'none',
              overflow: 'hidden',
              userSelect: 'none',
            }}
            className={styles.noResizeForm}
        >
          <ProFormText
            name="username"
            fieldProps={{
              size: 'large',
              prefix: <UserOutlined />,
            }}
            placeholder="用户名"
            rules={[
              {
                required: true,
                message: '请输入用户名',
              },
            ]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined />,
            }}
            placeholder="密码"
            rules={[
              {
                required: true,
                message: '请输入密码',
              },
            ]}
          />
          <ProFormCheckbox name="remember" valuePropName="checked">
            记住我
          </ProFormCheckbox>
        </LoginForm>
        </div>
      </div>
      <div className={styles.footer}>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.icpLink}
        >
          津ICP备2025030189号-1
        </a>
      </div>
    </div>
  );
};

export default LoginPage;