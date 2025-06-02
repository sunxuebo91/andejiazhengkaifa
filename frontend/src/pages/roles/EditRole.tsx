import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Space, 
  Alert, 
  Checkbox, 
  Divider,
  Typography,
  App
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

const { TextArea } = Input;
const { Title } = Typography;

interface Permission {
  key: string;
  label: string;
  description: string;
}

// 模拟权限数据
const permissionsData: Permission[] = [
  // 阿姨管理权限
  { key: 'resume:view', label: '查看阿姨简历', description: '允许查看阿姨简历列表和详情' },
  { key: 'resume:create', label: '创建阿姨简历', description: '允许创建新的阿姨简历' },
  { key: 'resume:edit', label: '编辑阿姨简历', description: '允许编辑阿姨简历' },
  { key: 'resume:delete', label: '删除阿姨简历', description: '允许删除阿姨简历' },
  { key: 'resume:all', label: '阿姨管理(全部)', description: '阿姨管理全部权限，包含查看、创建、编辑、删除' },
  
  // 用户管理权限
  { key: 'user:view', label: '查看用户', description: '允许查看用户列表' },
  { key: 'user:create', label: '创建用户', description: '允许创建新用户' },
  { key: 'user:edit', label: '编辑用户', description: '允许编辑用户信息' },
  { key: 'user:delete', label: '删除用户', description: '允许删除用户' },
  { key: 'user:all', label: '用户管理(全部)', description: '用户管理全部权限，包含查看、创建、编辑、删除' },
  
  // 系统管理权限
  { key: 'admin:roles', label: '角色管理', description: '允许管理角色和权限' },
  { key: 'admin:settings', label: '系统设置', description: '允许修改系统设置' },
  { key: 'admin:all', label: '系统管理(全部)', description: '系统管理全部权限，包含角色管理和系统设置' },
];

// 按类别分组权限
const permissionGroups = [
  { 
    title: '阿姨管理', 
    permissions: permissionsData.filter(p => p.key.startsWith('resume:')) 
  },
  { 
    title: '用户管理', 
    permissions: permissionsData.filter(p => p.key.startsWith('user:')) 
  },
  { 
    title: '系统管理', 
    permissions: permissionsData.filter(p => p.key.startsWith('admin:')) 
  },
];

const EditRole: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialValues, setInitialValues] = useState<any>(null);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new';
  const { message } = App.useApp();

  // 模拟获取角色详情
  const fetchRoleDetail = async (roleId: string) => {
    setLoading(true);
    // 模拟后端API调用
    setTimeout(() => {
      // 模拟数据
      if (roleId === '1') {
        // 系统管理员
        setInitialValues({
          name: '系统管理员',
          description: '拥有系统所有权限',
          permissions: ['admin:all', 'resume:all', 'user:all']
        });
      } else if (roleId === '2') {
        // 经理
        setInitialValues({
          name: '经理',
          description: '可以管理团队和阿姨资源',
          permissions: ['resume:all', 'user:view']
        });
      } else if (roleId === '3') {
        // 普通员工
        setInitialValues({
          name: '普通员工',
          description: '只能管理自己创建的阿姨资源',
          permissions: ['resume:view', 'resume:create']
        });
      } else {
        // 新建角色
        setInitialValues({
          name: '',
          description: '',
          permissions: []
        });
      }
      setLoading(false);
    }, 500);
  };

  // 模拟保存角色
  const saveRole = async (values: any) => {
    console.log('保存角色:', values);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 500);
    });
  };

  useEffect(() => {
    if (id) {
      fetchRoleDetail(id);
    } else {
      setInitialValues({
        name: '',
        description: '',
        permissions: []
      });
    }
  }, [id]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      setError('');
      await saveRole(values);
      message.success(`角色${isEdit ? '更新' : '创建'}成功！`);
      navigate('/roles/list');
    } catch (err: any) {
      console.error(`${isEdit ? '更新' : '创建'}角色失败:`, err);
      setError(`${isEdit ? '更新' : '创建'}角色失败：` + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 如果数据还在加载中，显示加载状态
  if (loading && !initialValues) {
    return (
      <PageContainer header={{ title: isEdit ? '编辑角色' : '创建角色', onBack: () => navigate(-1) }}>
        <Card loading={true} variant="outlined" />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={{
        title: isEdit ? '编辑角色' : '创建角色',
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
        
        {initialValues && (
          <Form
            form={form}
            name="editRole"
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={initialValues}
            style={{ maxWidth: 800, margin: '0 auto' }}
          >
            <Form.Item
              name="name"
              label="角色名称"
              rules={[
                { required: true, message: '请输入角色名称' },
                { max: 50, message: '角色名称不能超过50个字符' }
              ]}
            >
              <Input placeholder="请输入角色名称" disabled={id === '1'} />
            </Form.Item>

            <Form.Item
              name="description"
              label="角色描述"
              rules={[
                { max: 200, message: '角色描述不能超过200个字符' }
              ]}
            >
              <TextArea 
                placeholder="请输入角色描述" 
                rows={4} 
                showCount 
                maxLength={200} 
              />
            </Form.Item>

            <Divider />
            
            <Title level={5}>权限设置</Title>
            
            <Form.Item name="permissions">
              <Checkbox.Group style={{ width: '100%' }}>
                {permissionGroups.map(group => (
                  <div key={group.title} style={{ marginBottom: 24 }}>
                    <Title level={5} style={{ fontSize: 16, marginBottom: 16 }}>
                      {group.title}
                    </Title>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {group.permissions.map(permission => (
                        <Checkbox 
                          key={permission.key} 
                          value={permission.key}
                          disabled={id === '1' && permission.key.includes(':all')} // 系统管理员的全部权限不可取消
                        >
                          <div>
                            <div><strong>{permission.label}</strong></div>
                            <div style={{ color: '#777', fontSize: 12 }}>{permission.description}</div>
                          </div>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                ))}
              </Checkbox.Group>
            </Form.Item>

            <Divider />

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading} disabled={id === '1' && initialValues.name === '系统管理员'}>
                  {isEdit ? '更新角色' : '创建角色'}
                </Button>
                <Button onClick={() => navigate('/roles/list')}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Card>
    </PageContainer>
  );
};

export default EditRole; 