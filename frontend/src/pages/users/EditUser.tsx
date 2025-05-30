import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, Input, Button, Select, Space, Alert, App } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { UserOutlined, LockOutlined, IdcardOutlined, PhoneOutlined } from '@ant-design/icons';
import apiService from '../../services/api';

const { Option } = Select;

interface User {
  _id: string;
  username: string;
  name: string;
  phone?: string;
  role: string;
  permissions: string[];
  active: boolean;
}

const EditUser: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<User | null>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  // 获取用户数据
  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const response = await apiService.get(`/api/users/${id}`);

        if (response.success && response.data) {
          const user = response.data;
          setUserData(user);
          // 设置表单初始值，密码字段不回显
          form.setFieldsValue({
            username: user.username,
            name: user.name,
            phone: user.phone,
            role: user.role
          });
        } else {
          setError(response.message || '获取用户信息失败');
        }
      } catch (err: any) {
        console.error('获取用户信息失败:', err);
        setError(err.response?.data?.message || '获取用户信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, form]);

  // 更新用户
  const updateUser = async (values: any) => {
    if (!id) return Promise.reject(new Error('用户ID不存在'));
    
    try {
      const response = await apiService.patch(`/api/users/${id}`, values);

      if (response.success) {
        console.log('更新用户成功:', response);
        return response.data;
      } else {
        throw new Error(response.message || '更新用户失败');
      }
    } catch (err: any) {
      console.error('更新用户失败:', err);
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw err;
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      setError('');
      
      // 如果没有输入新密码，则从提交数据中删除密码相关字段
      if (!values.password) {
        delete values.password;
        delete values.confirmPassword;
      }
      
      await updateUser(values);
      message.success('员工信息更新成功！');
      // 带上refresh状态跳转回列表页
      navigate('/users/list', { state: { refresh: true } });
    } catch (err: any) {
      console.error('更新员工失败:', err);
      setError('更新员工失败：' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      header={{
        title: '编辑员工',
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
          name="editUser"
          layout="vertical"
          onFinish={handleSubmit}
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
              disabled // 不允许修改用户名
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { min: 6, message: '密码长度不能小于6个字符' },
            ]}
            extra="不修改密码请留空"
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="请输入新密码，不修改请留空" 
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!getFieldValue('password') || !value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="请再次输入新密码" 
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
                保存修改
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

export default EditUser; 