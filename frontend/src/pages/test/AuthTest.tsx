import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Alert, Descriptions } from 'antd';
import { getToken, getCurrentUser, isLoggedIn, isTokenExpired } from '../../services/auth';
import { customerService } from '../../services/customerService';

const { Title, Text, Paragraph } = Typography;

const AuthTest: React.FC = () => {
  const [authInfo, setAuthInfo] = useState<any>({});
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const token = getToken();
    const user = getCurrentUser();
    const loggedIn = isLoggedIn();
    const tokenExpired = isTokenExpired();

    setAuthInfo({
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token',
      user,
      loggedIn,
      tokenExpired,
    });
  };

  const testAssignableUsers = async () => {
    setLoading(true);
    setTestResult('');
    try {
      const users = await customerService.getAssignableUsers();
      setTestResult(`✅ 成功获取 ${users.length} 个可分配用户: ${JSON.stringify(users, null, 2)}`);
    } catch (error: any) {
      setTestResult(`❌ 获取可分配用户失败: ${error.message}\n详细错误: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>认证状态测试</Title>
      
      <Card title="当前认证状态" style={{ marginBottom: '16px' }}>
        <Descriptions column={1}>
          <Descriptions.Item label="是否有Token">{authInfo.hasToken ? '✅ 是' : '❌ 否'}</Descriptions.Item>
          <Descriptions.Item label="Token预览">{authInfo.tokenPreview}</Descriptions.Item>
          <Descriptions.Item label="是否已登录">{authInfo.loggedIn ? '✅ 是' : '❌ 否'}</Descriptions.Item>
          <Descriptions.Item label="Token是否过期">{authInfo.tokenExpired ? '❌ 是' : '✅ 否'}</Descriptions.Item>
          <Descriptions.Item label="用户信息">
            {authInfo.user ? (
              <pre>{JSON.stringify(authInfo.user, null, 2)}</pre>
            ) : (
              '无用户信息'
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="接口测试" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            type="primary" 
            onClick={testAssignableUsers} 
            loading={loading}
          >
            测试获取可分配用户接口
          </Button>
          
          <Button onClick={checkAuthStatus}>
            刷新认证状态
          </Button>
          
          {testResult && (
            <Alert
              message="测试结果"
              description={<pre style={{ whiteSpace: 'pre-wrap' }}>{testResult}</pre>}
              type={testResult.startsWith('✅') ? 'success' : 'error'}
              showIcon
            />
          )}
        </Space>
      </Card>

      <Card title="说明">
        <Paragraph>
          这个页面用于测试认证状态和接口调用。如果Token过期或无效，需要重新登录。
        </Paragraph>
        <Paragraph>
          <Text strong>常见问题：</Text>
          <ul>
            <li>Token过期：需要重新登录</li>
            <li>Token格式错误：清除浏览器存储并重新登录</li>
            <li>后端服务未启动：检查后端服务状态</li>
          </ul>
        </Paragraph>
      </Card>
    </div>
  );
};

export default AuthTest;
