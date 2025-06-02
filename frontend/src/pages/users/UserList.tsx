import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Button, Space, Tag, Popconfirm, Input, App } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import apiService from '../../services/api';

interface User {
  _id: string;
  username: string;
  name: string;
  phone?: string;
  role: string;
  permissions: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserListData {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  // 获取用户列表
  const fetchUsers = async (page: number = 1, size: number = 10, search?: string) => {
    try {
      setLoading(true);
      const response = await apiService.get<UserListData>('/api/users', {
        page,
        pageSize: size,
        search
      });

      if (response.success && response.data) {
        setUsers(response.data.items);
        setTotal(response.data.total);
        setCurrentPage(response.data.page);
        setPageSize(response.data.pageSize);
      } else {
        message.error(response.message || '获取用户列表失败');
      }
    } catch (error: any) {
      console.error('获取用户列表失败:', error);
      message.error(error.response?.data?.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除用户
  const handleDelete = async (id: string) => {
    try {
      const response = await apiService.delete(`/api/users/${id}`);

      if (response.success) {
        message.success('删除用户成功');
        fetchUsers(currentPage, pageSize, searchText);
      } else {
        message.error(response.message || '删除用户失败');
      }
    } catch (error: any) {
      console.error('删除用户失败:', error);
      message.error(error.response?.data?.message || '删除用户失败');
    }
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    fetchUsers(1, pageSize, value);
  };

  // 处理分页变化
  const handleTableChange = (pagination: any) => {
    fetchUsers(pagination.current, pagination.pageSize, searchText);
  };

  // 初始加载和路由状态变化时刷新数据
  useEffect(() => {
    const shouldRefresh = location.state?.refresh;
    fetchUsers(currentPage, pageSize, searchText);
    // 清除路由状态
    if (shouldRefresh) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.refresh]);

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
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleMap: { [key: string]: { text: string; color: string } } = {
          admin: { text: '管理员', color: 'red' },
          manager: { text: '经理', color: 'blue' },
          employee: { text: '员工', color: 'green' },
        };
        const { text, color } = roleMap[role] || { text: role, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/users/edit/${record._id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
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
        extra: [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/users/create')}
          >
            创建员工
          </Button>,
        ],
      }}
    >
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索用户名、姓名、手机号"
            allowClear
            enterButton
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
        </div>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
        />
      </Card>
    </PageContainer>
  );
};

export default UserList; 