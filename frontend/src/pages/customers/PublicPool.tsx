import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Select, Input, Row, Col, Tag, Modal, Form, Card, Statistic } from 'antd';
import { ReloadOutlined, UserAddOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import { Customer } from '../../types/customer.types';
import { LEAD_SOURCES, SERVICE_CATEGORIES, LEAD_LEVELS } from '../../types/customer.types';
import { useAuth } from '../../contexts/AuthContext';

const { Option } = Select;

const PublicPool: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [myCustomerCount, setMyCustomerCount] = useState({ count: 0, limit: 50 });
  const [users, setUsers] = useState<Array<{ _id: string; name: string; username: string }>>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignForm] = Form.useForm();

  // 筛选条件
  const [filters, setFilters] = useState<{
    search: string;
    leadSource: string | undefined;
    serviceCategory: string | undefined;
    leadLevel: string | undefined;
    minBudget: number | undefined;
    maxBudget: number | undefined;
  }>({
    search: '',
    leadSource: undefined,
    serviceCategory: undefined,
    leadLevel: undefined,
    minBudget: undefined,
    maxBudget: undefined,
  });

  useEffect(() => {
    loadCustomers();
    loadMyCustomerCount();
    if (user?.role === 'admin' || user?.role === 'manager') {
      loadUsers();
    }
  }, [currentPage, pageSize]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await customerService.getPublicPoolCustomers({
        page: currentPage,
        limit: pageSize,
        ...filters,
      });
      setCustomers(response.customers);
      setTotal(response.total);
    } catch (error: any) {
      console.error('加载公海客户失败:', error);
      if (error.message?.includes('Unauthorized') || error.response?.status === 401) {
        message.error('登录已过期，请重新登录');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        message.error(error.message || '加载公海客户失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMyCustomerCount = async () => {
    try {
      const data = await customerService.getMyCustomerCount();
      setMyCustomerCount(data);
    } catch (error: any) {
      console.error('获取客户数量失败:', error);
      // 如果是认证错误，不显示错误消息，因为loadCustomers会处理
      if (!error.message?.includes('Unauthorized') && error.response?.status !== 401) {
        message.warning('无法获取客户数量统计');
      }
    }
  };

  const loadUsers = async () => {
    try {
      const userList = await customerService.getAssignableUsers();
      setUsers(userList);
    } catch (error: any) {
      console.error('获取用户列表失败:', error);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadCustomers();
  };

  const handleReset = () => {
    setFilters({
      search: '',
      leadSource: undefined,
      serviceCategory: undefined,
      leadLevel: undefined,
      minBudget: undefined,
      maxBudget: undefined,
    });
    setCurrentPage(1);
    setTimeout(() => loadCustomers(), 0);
  };

  const handleClaim = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要领取的客户');
      return;
    }

    const availableSlots = myCustomerCount.limit - myCustomerCount.count;
    if (selectedRowKeys.length > availableSlots) {
      message.error(`您最多还可以领取 ${availableSlots} 个客户`);
      return;
    }

    Modal.confirm({
      title: '确认领取',
      content: `确定要领取选中的 ${selectedRowKeys.length} 个客户吗？`,
      onOk: async () => {
        try {
          const result = await customerService.claimCustomers(selectedRowKeys as string[]);
          if (result.success > 0) {
            message.success(`成功领取 ${result.success} 个客户`);
            setSelectedRowKeys([]);
            loadCustomers();
            loadMyCustomerCount();
          }
          if (result.failed > 0) {
            message.warning(`${result.failed} 个客户领取失败`);
          }
        } catch (error: any) {
          message.error(error.message || '领取失败');
        }
      },
    });
  };

  const handleAssign = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要分配的客户');
      return;
    }
    setAssignModalVisible(true);
  };

  const handleAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields();
      const result = await customerService.assignFromPool(
        selectedRowKeys as string[],
        values.assignedTo,
        values.reason
      );
      if (result.success > 0) {
        message.success(`成功分配 ${result.success} 个客户`);
        setSelectedRowKeys([]);
        setAssignModalVisible(false);
        assignForm.resetFields();
        loadCustomers();
      }
      if (result.failed > 0) {
        message.warning(`${result.failed} 个客户分配失败`);
      }
    } catch (error: any) {
      message.error(error.message || '分配失败');
    }
  };

  const columns = [
    {
      title: '客户姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (text: string, record: Customer) => (
        <a onClick={() => navigate(`/customers/${record._id}`)}>{text}</a>
      ),
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (phone: string) => {
        // 公海中的电话号码脱敏：中间4位用*号隐藏
        if (phone && phone.length === 11) {
          return `${phone.substring(0, 3)}****${phone.substring(7)}`;
        }
        return phone;
      },
    },
    {
      title: '线索来源',
      dataIndex: 'leadSource',
      key: 'leadSource',
      width: 100,
    },
    {
      title: '服务类别',
      dataIndex: 'serviceCategory',
      key: 'serviceCategory',
      width: 120,
    },
    {
      title: '线索等级',
      dataIndex: 'leadLevel',
      key: 'leadLevel',
      width: 80,
      render: (level: string) => {
        const colorMap: Record<string, string> = {
          'A类': 'red',
          'B类': 'orange',
          'C类': 'blue',
          'D类': 'default',
          '流失': 'default',
        };
        return <Tag color={colorMap[level] || 'default'}>{level}</Tag>;
      },
    },
    {
      title: '薪资预算',
      dataIndex: 'salaryBudget',
      key: 'salaryBudget',
      width: 100,
      render: (budget: number) => budget ? `¥${budget}` : '-',
    },
    {
      title: '进入公海时间',
      dataIndex: 'publicPoolEntryTime',
      key: 'publicPoolEntryTime',
      width: 150,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-',
    },
    {
      title: '进入原因',
      dataIndex: 'publicPoolEntryReason',
      key: 'publicPoolEntryReason',
      width: 150,
      ellipsis: true,
    },
    {
      title: '被领取次数',
      dataIndex: 'claimCount',
      key: 'claimCount',
      width: 100,
      render: (count: number) => count || 0,
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="公海客户总数" value={total} />
          </Col>
          <Col span={6}>
            <Statistic
              title="我的客户数量"
              value={myCustomerCount.count}
              suffix={`/ ${myCustomerCount.limit}`}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="可领取数量"
              value={myCustomerCount.limit - myCustomerCount.count}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 筛选条件 */}
          <Row gutter={16}>
            <Col span={6}>
              <Input
                placeholder="搜索客户姓名或电话"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onPressEnter={handleSearch}
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="线索来源"
                value={filters.leadSource}
                onChange={(value) => setFilters({ ...filters, leadSource: value })}
                allowClear
                style={{ width: '100%' }}
              >
                {LEAD_SOURCES.map((source) => (
                  <Option key={source} value={source}>{source}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="服务类别"
                value={filters.serviceCategory}
                onChange={(value) => setFilters({ ...filters, serviceCategory: value })}
                allowClear
                style={{ width: '100%' }}
              >
                {SERVICE_CATEGORIES.map((category) => (
                  <Option key={category} value={category}>{category}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="线索等级"
                value={filters.leadLevel}
                onChange={(value) => setFilters({ ...filters, leadLevel: value })}
                allowClear
                style={{ width: '100%' }}
              >
                {LEAD_LEVELS.map((level) => (
                  <Option key={level} value={level}>{level}</Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Space>
                <Button type="primary" onClick={handleSearch}>搜索</Button>
                <Button onClick={handleReset}>重置</Button>
                <Button icon={<ReloadOutlined />} onClick={loadCustomers}>刷新</Button>
              </Space>
            </Col>
          </Row>

          {/* 操作按钮 */}
          <Row>
            <Space>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={handleClaim}
                disabled={selectedRowKeys.length === 0}
              >
                领取客户 ({selectedRowKeys.length})
              </Button>
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <Button
                  icon={<TeamOutlined />}
                  onClick={handleAssign}
                  disabled={selectedRowKeys.length === 0}
                >
                  分配客户 ({selectedRowKeys.length})
                </Button>
              )}
            </Space>
          </Row>

          {/* 表格 */}
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={customers}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
            scroll={{ x: 1200 }}
          />
        </Space>
      </Card>

      {/* 分配客户弹窗 */}
      <Modal
        title="分配客户"
        open={assignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={() => {
          setAssignModalVisible(false);
          assignForm.resetFields();
        }}
        okText="确认分配"
        cancelText="取消"
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            label="分配给"
            name="assignedTo"
            rules={[{ required: true, message: '请选择负责人' }]}
          >
            <Select placeholder="请选择负责人">
              {users.map((u) => (
                <Option key={u._id} value={u._id}>
                  {u.name} ({u.username})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="分配原因"
            name="reason"
          >
            <Input.TextArea rows={3} placeholder="请输入分配原因（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PublicPool;

