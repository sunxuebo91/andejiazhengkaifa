import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Button, Space, Tag, Popconfirm, Input, App } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';

interface User {
  id: string;
  username: string;
  name: string;
  phone: string;
  role: string;
  createdAt: string;
}

// 角色映射
const roleMap = {
  admin: { text: '管理员', color: 'red' },
  manager: { text: '经理', color: 'orange' },
  employee: { text: '普通员工', color: 'green' }
};

// 模拟用户数据存储
const mockUsersData = [
  {
    id: '1',
    username: 'admin',
    name: '管理员',
    phone: '13800000000',
    role: 'admin',
    createdAt: '2023-01-01 12:00:00'
  },
  {
    id: '2',
    username: 'manager',
    name: '张经理',
    phone: '13811111111',
    role: 'manager',
    createdAt: '2023-01-02 10:00:00'
  },
  {
    id: '3',
    username: 'employee1',
    name: '李员工',
    phone: '13822222222',
    role: 'employee',
    createdAt: '2023-01-03 09:00:00'
  },
  {
    id: '4',
    username: 'employee2',
    name: '王员工',
    phone: '13833333333',
    role: 'employee',
    createdAt: '2023-01-04 08:00:00'
  }
];

// 获取用户列表 - 全局函数，供其他组件调用
export const getUsersList = () => {
  return [...mockUsersData];
};

// 添加用户 - 全局函数，供其他组件调用
export const addUserToList = (user: Omit<User, 'id' | 'createdAt'>) => {
  const newUser = {
    ...user,
    id: String(mockUsersData.length + 1),
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  mockUsersData.push(newUser);
  return newUser;
};

// 更新用户 - 全局函数，供其他组件调用
export const updateUserInList = (userId: string, userData: Partial<User>) => {
  const index = mockUsersData.findIndex(user => user.id === userId);
  if (index !== -1) {
    mockUsersData[index] = { ...mockUsersData[index], ...userData };
    return true;
  }
  return false;
};

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  // 检查是否是从创建页面返回
  useEffect(() => {
    if (location.state && location.state.refresh) {
      fetchUsers();
    }
  }, [location]);

  // 获取用户列表
  const fetchUsers = () => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setUsers(getUsersList());
      setLoading(false);
    }, 500);
  };

  // 模拟删除用户
  const handleDelete = (id: string) => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      const index = mockUsersData.findIndex(user => user.id === id);
      if (index !== -1) {
        mockUsersData.splice(index, 1);
      }
      setUsers(getUsersList());
      message.success('用户删除成功');
      setLoading(false);
    }, 500);
  };

  // 搜索用户
  const handleSearch = (value: string) => {
    setKeyword(value);
  };

  // 过滤用户
  const filteredUsers = users.filter(user => 
    user.username.includes(keyword) || 
    user.name.includes(keyword) || 
    user.phone.includes(keyword)
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleInfo = roleMap[role as keyof typeof roleMap] || { text: '未知', color: 'default' };
        return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space size="middle">
          <Button 
            type="primary" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/users/edit/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              size="small"
              icon={<DeleteOutlined />}
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
        title: '员工管理',
      }}
    >
      <Card variant="outlined">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="搜索用户名/姓名/电话"
            onSearch={handleSearch}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 300 }}
            allowClear
            enterButton={<SearchOutlined />}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/users/create')}
          >
            新建员工
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={filteredUsers}
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

export default UserList; 