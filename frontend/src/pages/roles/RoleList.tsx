import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Button, Space, Tag, Popconfirm, Input, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  usersCount: number;
}

// 权限映射表
const permissionMap: Record<string, { text: string; color: string }> = {
  'admin:all': { text: '系统管理(全部)', color: 'red' },
  'resume:all': { text: '阿姨管理(全部)', color: 'orange' },
  'user:all': { text: '用户管理(全部)', color: 'green' },
  'resume:view': { text: '查看阿姨简历', color: 'blue' },
  'resume:create': { text: '创建阿姨简历', color: 'green' },
  'resume:edit': { text: '编辑阿姨简历', color: 'cyan' },
  'resume:delete': { text: '删除阿姨简历', color: 'red' },
  'user:view': { text: '查看用户', color: 'blue' },
  'user:create': { text: '创建用户', color: 'green' },
  'user:edit': { text: '编辑用户', color: 'cyan' },
  'user:delete': { text: '删除用户', color: 'red' },
  'admin:roles': { text: '角色管理', color: 'purple' },
  'admin:settings': { text: '系统设置', color: 'red' },
};

// 获取权限的颜色和文本
const getPermissionInfo = (permission: string) => {
  return permissionMap[permission] || { text: permission, color: 'default' };
};

const RoleList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const navigate = useNavigate();
  const { message } = App.useApp();

  // 模拟获取角色列表
  const fetchRoles = () => {
    setLoading(true);
    // 模拟后端数据
    const mockRoles = [
      {
        id: '1',
        name: '系统管理员',
        description: '拥有系统所有权限',
        permissions: ['admin:all', 'resume:all', 'user:all'],
        createdAt: '2023-01-01 12:00:00',
        usersCount: 1
      },
      {
        id: '2',
        name: '经理',
        description: '可以管理团队和阿姨资源',
        permissions: ['resume:all', 'user:view'],
        createdAt: '2023-01-02 10:00:00',
        usersCount: 3
      },
      {
        id: '3',
        name: '普通员工',
        description: '只能管理自己创建的阿姨资源',
        permissions: ['resume:view', 'resume:create'],
        createdAt: '2023-01-03 09:00:00',
        usersCount: 10
      }
    ];

    setTimeout(() => {
      setRoles(mockRoles);
      setLoading(false);
    }, 500);
  };

  // 模拟删除角色
  const handleDelete = (id: string) => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setRoles(roles.filter(role => role.id !== id));
      message.success('角色删除成功');
      setLoading(false);
    }, 500);
  };

  // 搜索角色
  const handleSearch = (value: string) => {
    setKeyword(value);
  };

  // 过滤角色
  const filteredRoles = roles.filter(role => 
    role.name.includes(keyword) || 
    role.description.includes(keyword)
  );

  useEffect(() => {
    fetchRoles();
  }, []);

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '权限',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => (
        <Space size={[0, 4]} wrap>
          {permissions.map(perm => {
            const permInfo = getPermissionInfo(perm);
            return (
              <Tag color={permInfo.color} key={perm}>
                {permInfo.text}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: '关联用户数',
      dataIndex: 'usersCount',
      key: 'usersCount',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Role) => (
        <Space size="middle">
          <Button 
            type="primary" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/roles/edit/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此角色吗？"
            description="关联的用户将失去此角色权限。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              size="small"
              icon={<DeleteOutlined />}
              disabled={record.id === '1'} // 防止删除系统管理员角色
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '角色管理',
      }}
    >
      <Card variant="outlined">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="搜索角色名称/描述"
            onSearch={handleSearch}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 300 }}
            allowClear
            enterButton={<SearchOutlined />}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/roles/edit/new')}
          >
            新建角色
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={filteredRoles}
          rowKey="id"
          loading={loading}
          pagination={{ 
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>
    </PageContainer>
  );
};

export default RoleList; 