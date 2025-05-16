import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Alert, App, Form } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText, ProFormCheckbox } from '@ant-design/pro-form';
import { login as authLogin, setToken } from '../services/auth';
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
      // 调用登录API
      const response = await authLogin(values.username, values.password);
      if (response.token) {
        // 保存token
        setToken(response.token, values.remember);
        // 保存用户信息
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // 更新AuthContext
        setUserAuth(response.user);
        
        // 使用App.useApp()获取的message
        message.success('登录成功');
        
        // 使用直接跳转
        console.log('准备跳转到: /dashboard');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      } else {
        setLoginError('登录失败，请检查用户名和密码');
      }
    } catch (error) {
      console.error('登录失败:', error);
      setLoginError('登录失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.top}>
          <div className={styles.header}>
            <Link to="/">
              <h1 className={styles.title}>安得家政CRM</h1>
            </Link>
          </div>
          <div className={styles.desc}>企业级家政服务管理系统</div>
        </div>

        <div className={styles.main}>
          <LoginForm
            containerStyle={{ height: 'auto', resize: 'none', overflow: 'hidden', padding: 0 }}
            contentStyle={{ minHeight: 'auto', resize: 'none', overflow: 'hidden', width: '100%' }}
            style={{ resize: 'none', overflow: 'hidden', width: '100%' }}
            resizeCallbacks={false}
            submitter={{
              searchConfig: {
                submitText: '登 录'
              },
              submitButtonProps: {
                size: 'large',
                style: {
                  width: '100%',
                  borderRadius: '4px',
                  marginTop: '20px',
                  height: '40px'
                }
              }
            }}
            loading={loading}
            onFinish={async (values) => {
              await handleSubmit(values as { username: string; password: string; remember: boolean });
            }}
            className={styles.noResizeBar}
          >
            {loginError && (
              <div style={{ marginBottom: 20 }}>
                <Alert message={loginError} type="error" showIcon />
              </div>
            )}

            <div className={styles.formControls}>
              <ProFormText
                name="username"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined className={styles.prefixIcon} />,
                }}
                placeholder="用户名"
                rules={[
                  {
                    required: true,
                    message: '请输入用户名!',
                  },
                ]}
              />
              <div style={{ height: 20 }} />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined className={styles.prefixIcon} />,
                }}
                placeholder="密码"
                rules={[
                  {
                    required: true,
                    message: '请输入密码!',
                  },
                ]}
              />
              <div style={{ height: 20 }} />
              <div className={styles.rememberMe} style={{ marginBottom: 0, marginTop: 0, alignSelf: 'flex-start' }}>
                <ProFormCheckbox noStyle name="remember">
                  记住我
                </ProFormCheckbox>
              </div>
            </div>
          </LoginForm>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 