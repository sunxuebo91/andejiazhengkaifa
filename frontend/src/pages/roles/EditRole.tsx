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
import roleService, { UpdateRoleDto, CreateRoleDto, PermissionCatalogGroup } from '../../services/role.service';

const { TextArea } = Input;
const { Title } = Typography;

const EditRole: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialValues, setInitialValues] = useState<any>(null);
  const [permissionGroups, setPermissionGroups] = useState<PermissionCatalogGroup[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new';
  const { message } = App.useApp();

  // 拉取权限目录（后端 PERMISSION_CATALOG）
  const fetchPermissionCatalog = async () => {
    try {
      setCatalogLoading(true);
      const response = await roleService.getPermissionCatalog();
      if (response.success && Array.isArray(response.data)) {
        setPermissionGroups(response.data);
      } else {
        setError('获取权限目录失败');
      }
    } catch (err: any) {
      console.error('获取权限目录失败:', err);
      setError('获取权限目录失败：' + (err.message || '未知错误'));
    } finally {
      setCatalogLoading(false);
    }
  };

  // 获取角色详情
  const fetchRoleDetail = async (roleId: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await roleService.getOne(roleId);
      if (response.success && response.data) {
        setInitialValues({
          name: response.data.name,
          description: response.data.description,
          permissions: response.data.permissions || []
        });
        // 设置表单初始值
        form.setFieldsValue({
          name: response.data.name,
          description: response.data.description,
          permissions: response.data.permissions || []
        });
      } else {
        setError('获取角色详情失败');
      }
    } catch (err: any) {
      console.error('获取角色详情失败:', err);
      setError('获取角色详情失败：' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 保存角色
  const saveRole = async (values: any) => {
    console.log('保存角色:', values);
    if (id) {
      // 更新角色
      const updateData: UpdateRoleDto = {
        name: values.name,
        description: values.description,
        permissions: values.permissions || []
      };
      const response = await roleService.update(id, updateData);
      if (!response.success) {
        throw new Error(response.message || '更新角色失败');
      }
    } else {
      // 创建角色
      const createData: CreateRoleDto = {
        name: values.name,
        description: values.description,
        permissions: values.permissions || [],
        active: true
      };
      const response = await roleService.create(createData);
      if (!response.success) {
        throw new Error(response.message || '创建角色失败');
      }
    }
  };

  useEffect(() => {
    fetchPermissionCatalog();
  }, []);

  useEffect(() => {
    // id 为 'new' 时是创建模式，不需要请求后端
    if (id && id !== 'new') {
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
  if ((loading && !initialValues) || catalogLoading) {
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
