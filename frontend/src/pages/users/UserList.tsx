import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Button, Space, Tag, Popconfirm, Input, App, Modal, DatePicker, Tooltip } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, PauseCircleOutlined, PlayCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiService from '../../services/api';
import { markStaffDeparted } from '../../services/referralService';

interface User {
  _id: string;
  username: string;
  name: string;
  phone?: string;
  role: string;
  permissions: string[];
  active: boolean;
  suspended?: boolean;
  wechatOpenId?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  leftAt?: string;
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

  // 标记离职弹窗
  const [departModal, setDepartModal] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' });
  const [departDate, setDepartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [departLoading, setDepartLoading] = useState(false);

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

  // 暂停用户
  const handleSuspend = async (id: string) => {
    try {
      const response = await apiService.patch(`/api/users/${id}/suspend`);

      if (response.success) {
        message.success('用户账号已暂停');
        fetchUsers(currentPage, pageSize, searchText);
      } else {
        message.error(response.message || '暂停用户失败');
      }
    } catch (error: any) {
      console.error('暂停用户失败:', error);
      message.error(error.response?.data?.message || '暂停用户失败');
    }
  };

  // 恢复用户
  const handleResume = async (id: string) => {
    try {
      const response = await apiService.patch(`/api/users/${id}/resume`);

      if (response.success) {
        message.success('用户账号已恢复');
        fetchUsers(currentPage, pageSize, searchText);
      } else {
        message.error(response.message || '恢复用户失败');
      }
    } catch (error: any) {
      console.error('恢复用户失败:', error);
      message.error(error.response?.data?.message || '恢复用户失败');
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
    if (shouldRefresh) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.refresh]);

  // 标记离职处理
  const handleDepartureSubmit = async () => {
    if (!departDate) { message.error('请选择离职日期'); return; }
    setDepartLoading(true);
    try {
      // 用第一个管理员ID作为操作人（实际应从 auth 获取当前登录用户ID）
      const adminRes = await apiService.get<any>('/api/users', { pageSize: 1 });
      const adminId = adminRes.data?.items?.[0]?._id || 'system';
      const res = await markStaffDeparted(adminId, departModal.userId, departDate.format('YYYY-MM-DD'));
      if (res.success) {
        message.success(`离职处理完成，共流转 ${res.data?.transferredCount ?? 0} 条推荐记录`);
        setDepartModal({ open: false, userId: '', userName: '' });
        fetchUsers(currentPage, pageSize, searchText);
      } else {
        message.error(res.message || '操作失败');
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    } finally {
      setDepartLoading(false);
    }
  };

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
      title: 'OpenID',
      dataIndex: 'wechatOpenId',
      key: 'wechatOpenId',
      width: 180,
      ellipsis: true,
      render: (openId?: string) => openId ? (
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#52c41a' }} title={openId}>
          {openId.substring(0, 10)}...
        </span>
      ) : (
        <span style={{ color: '#ccc' }}>未绑定</span>
      ),
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
          operator: { text: '运营', color: 'purple' },
          admissions: { text: '招生老师', color: 'cyan' },
          dispatch: { text: '派单老师', color: 'orange' },
        };
        const { text, color } = roleMap[role] || { text: role, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '权限标记',
      key: 'flags',
      width: 120,
      render: (_: any, record: User) => (
        <Space size={4} wrap>
          {record.isAdmin && <Tag color="volcano">管理员</Tag>}
          {record.isActive === false
            ? <Tooltip title={record.leftAt ? `离职日期：${new Date(record.leftAt).toLocaleDateString('zh-CN')}` : '已离职'}><Tag color="red">已离职</Tag></Tooltip>
            : <Tag color="green">在职</Tag>
          }
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean, record: User) => (
        <Space>
          <Tag color={active ? 'green' : 'red'}>
            {active ? '启用' : '禁用'}
          </Tag>
          {record.suspended && (
            <Tag color="orange">已暂停</Tag>
          )}
        </Space>
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
      width: 220,
      fixed: 'right' as const,
      render: (_: any, record: User) => (
        <Space size="small" wrap>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/users/edit/${record._id}`)}
          >
            编辑
          </Button>
          {record.suspended ? (
            <Popconfirm
              title="确定要恢复这个用户吗？"
              description="恢复后用户可以正常使用系统"
              onConfirm={() => handleResume(record._id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<PlayCircleOutlined />} style={{ color: '#52c41a' }}>
                恢复
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="确定要暂停这个用户吗？"
              description="暂停后用户将无法登录和使用系统"
              onConfirm={() => handleSuspend(record._id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<PauseCircleOutlined />} style={{ color: '#faad14' }}>
                暂停
              </Button>
            </Popconfirm>
          )}
          {record.isActive !== false && (
            <Popconfirm
              title={`确定要标记「${record.name}」为离职吗？`}
              description="操作后将批量流转该员工名下的推荐记录，不可撤销。"
              onConfirm={() => { setDepartModal({ open: true, userId: record._id, userName: record.name }); setDepartDate(dayjs()); }}
              okText="填写离职日期"
              cancelText="取消"
            >
              <Button type="link" icon={<LogoutOutlined />} style={{ color: '#ff7a45' }}>
                标记离职
              </Button>
            </Popconfirm>
          )}
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
          scroll={{ x: 1200 }}
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

      {/* 标记离职弹窗 */}
      <Modal
        title={`标记「${departModal.userName}」离职`}
        open={departModal.open}
        onOk={handleDepartureSubmit}
        onCancel={() => setDepartModal({ open: false, userId: '', userName: '' })}
        okText="确认标记离职"
        okButtonProps={{ danger: true, loading: departLoading }}
        cancelText="取消"
      >
        <p style={{ color: '#ff4d4f', fontWeight: 500 }}>⚠️ 操作不可撤销：将自动流转该员工名下所有「待审核/跟进中」推荐记录给管理员。</p>
        <div style={{ marginTop: 12 }}>
          <span>离职日期：</span>
          <DatePicker
            value={departDate}
            onChange={setDepartDate}
            style={{ marginLeft: 8 }}
            disabledDate={d => d && d > dayjs()}
            format="YYYY-MM-DD"
          />
        </div>
      </Modal>
    </PageContainer>
  );
};

export default UserList;