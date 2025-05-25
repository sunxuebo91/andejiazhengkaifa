import React, { useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, Input, Button, Select, Space, Alert, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined, IdcardOutlined, PhoneOutlined } from '@ant-design/icons';
import { addUserToList } from './UserList';

const { Option } = Select;

const CreateUser: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { message } = App.useApp();

  // 添加用户的API调用
  const addUser = async (values: any) => {
    // 从values中删除confirmPassword
    const { confirmPassword, ...userData } = values;
    
    // 调用UserList中的全局函数添加用户
    addUserToList(userData);
    
    console.log('添加用户:', values, '添加员工后员工列表将显示更新该员工');
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 500);
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      setError('');
      await addUser(values);
      message.success('员工创建成功！');
      // 带上refresh状态跳转回列表页
      navigate('/users/list', { state: { refresh: true } });
    } catch (err: any) {
      console.error('创建员工失败:', err);
      setError('创建员工失败：' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      header={{
        title: '创建员工',
        onBack: () => navigate(-1),
      }}
    >
      <Card variant="outlined">
        {error && (
          <Alert 
            message={error} 
            type="error" 
            showIcon 
            style={{ marginBottom: 24 }} 
          />
        )}
        
        <Form
          form={form}
          name="createUser"
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ role: 'employee' }}
          style={{ maxWidth: 600, margin: '0 auto' }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名长度不能小于3个字符' },
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="请输入用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度不能小于6个字符' },
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="请输入密码" 
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="请再次输入密码" 
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input 
              prefix={<IdcardOutlined />} 
              placeholder="请输入真实姓名" 
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }
            ]}
          >
            <Input 
              prefix={<PhoneOutlined />} 
              placeholder="请输入手机号" 
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">管理员</Option>
              <Option value="manager">经理</Option>
              <Option value="employee">普通员工</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建员工
              </Button>
              <Button onClick={() => navigate('/users/list')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default CreateUser; 