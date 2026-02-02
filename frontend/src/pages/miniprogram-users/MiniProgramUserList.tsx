import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Space, Tag, Input, App, Avatar, Statistic, Row, Col } from 'antd';
import { UserOutlined, PhoneOutlined, ClockCircleOutlined } from '@ant-design/icons';
import apiService from '../../services/api';
import dayjs from 'dayjs';

interface MiniProgramUser {
  _id: string;
  phone?: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  avatarFile?: string;
  openid: string;
  status: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  loginCount: number;
  gender?: number;
  city?: string;
  province?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserListData {
  list: MiniProgramUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Statistics {
  total: number;
  todayRegistered: number;
  todayActive: number;
}

const MiniProgramUserList: React.FC = () => {
  const [users, setUsers] = useState<MiniProgramUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [statistics, setStatistics] = useState<Statistics>({ total: 0, todayRegistered: 0, todayActive: 0 });
  const { message } = App.useApp();

  // 获取统计信息
  const fetchStatistics = async () => {
    try {
      const response = await apiService.get<Statistics>('/api/miniprogram-users/statistics');
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error: any) {
      console.error('获取统计信息失败:', error);
    }
  };

  // 获取用户列表
  const fetchUsers = async (page: number = 1, size: number = 20, search?: string) => {
    try {
      setLoading(true);
      const response = await apiService.get<UserListData>('/api/miniprogram-users', {
        page,
        pageSize: size,
        search
      });

      if (response.success && response.data) {
        setUsers(response.data.list);
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

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    fetchUsers(1, pageSize, value);
  };

  // 处理分页变化
  const handleTableChange = (pagination: any) => {
    fetchUsers(pagination.current, pagination.pageSize, searchText);
  };

  // 初始加载
  useEffect(() => {
    fetchUsers(currentPage, pageSize, searchText);
    fetchStatistics();
  }, []);

  // 性别映射
  const getGenderText = (gender?: number) => {
    if (gender === 1) return '男';
    if (gender === 2) return '女';
    return '未知';
  };

  // 状态映射
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: 'success', text: '活跃' },
      inactive: { color: 'default', text: '不活跃' },
      blocked: { color: 'error', text: '已封禁' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '用户信息',
      key: 'userInfo',
      width: 280,
      fixed: 'left' as const,
      render: (_: any, record: MiniProgramUser) => (
        <Space>
          <Avatar src={record.avatarFile || record.avatar} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.nickname || '未设置昵称'}</div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {record.phone ? (
                <>
                  <PhoneOutlined /> {record.phone}
                </>
              ) : (
                <span style={{ color: '#ccc' }}>未绑定手机号</span>
              )}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '账号',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username?: string) => username || '-',
    },
    {
      title: 'OpenID',
      dataIndex: 'openid',
      key: 'openid',
      width: 180,
      ellipsis: true,
      render: (openid: string) => (
        <span style={{ fontSize: 12, fontFamily: 'monospace' }} title={openid}>
          {openid}
        </span>
      ),
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (gender?: number) => getGenderText(gender),
    },
    {
      title: '地区',
      key: 'location',
      width: 150,
      render: (_: any, record: MiniProgramUser) => {
        if (record.province || record.city) {
          return `${record.province || ''} ${record.city || ''}`.trim();
        }
        return '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '登录次数',
      dataIndex: 'loginCount',
      key: 'loginCount',
      width: 100,
      align: 'center' as const,
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 180,
      render: (date?: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <PageContainer
      title="小程序用户管理"
      content="管理小程序端注册的用户信息"
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总用户数"
              value={statistics.total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="今日新增"
              value={statistics.todayRegistered}
              valueStyle={{ color: '#3f8600' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="今日活跃"
              value={statistics.todayActive}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 用户列表 */}
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索手机号、昵称或账号"
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
        </Space>

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
          scroll={{ x: 1500 }}
        />
      </Card>
    </PageContainer>
  );
};

export default MiniProgramUserList;

