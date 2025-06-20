import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Table, 
  Card, 
  Input, 
  Button, 
  Select, 
  Space, 
  Tag,
  message,
  Row,
  Col
} from 'antd';
import { SearchOutlined, PlusOutlined, MessageOutlined } from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import { 
  Customer, 
  LEAD_SOURCES, 
  SERVICE_CATEGORIES, 
  CONTRACT_STATUSES,
  LEAD_LEVELS 
} from '../../types/customer.types';
import CustomerFollowUpModal from '../../components/CustomerFollowUpModal';

const { Search } = Input;
const { Option } = Select;

const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [followUpModal, setFollowUpModal] = useState({
    visible: false,
    customerId: '',
    customerName: ''
  });

  // 搜索条件
  const [searchFilters, setSearchFilters] = useState<{
    search: string;
    leadSource: string | undefined;
    serviceCategory: string | undefined;
    contractStatus: string | undefined;
    leadLevel: string | undefined;
    startDate: string;
    endDate: string;
  }>({
    search: '',
    leadSource: undefined,
    serviceCategory: undefined,
    contractStatus: undefined,
    leadLevel: undefined,
    startDate: '',
    endDate: ''
  });

  // 获取客户列表
  const loadCustomers = async (page = 1, size = 10) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: size,
        ...Object.fromEntries(
          Object.entries(searchFilters).filter(([_, value]) => value !== '' && value !== undefined)
        )
      };
      
      const response = await customerService.getCustomers(params);
      setCustomers(response.customers);
      setTotal(response.total);
      setCurrentPage(page);
      setPageSize(size);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '获取客户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    loadCustomers();
  }, []);

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1);
    loadCustomers(1, pageSize);
  };

  // 处理重置
  const handleReset = () => {
    setSearchFilters({
      search: '',
      leadSource: undefined,
      serviceCategory: undefined,
      contractStatus: undefined,
      leadLevel: undefined,
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
    loadCustomers(1, pageSize);
  };

  // 处理添加跟进
  const handleAddFollowUp = (customer: Customer) => {
    setFollowUpModal({
      visible: true,
      customerId: customer._id,
      customerName: customer.name
    });
  };

  // 处理跟进成功
  const handleFollowUpSuccess = () => {
    setFollowUpModal({
      visible: false,
      customerId: '',
      customerName: ''
    });
    // 刷新当前页面数据
    loadCustomers(currentPage, pageSize);
  };

  // 状态标签颜色
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      '已签约': 'green',
      '匹配中': 'blue',
      '流失客户': 'red',
      '已退款': 'orange',
      '退款中': 'orange',
      '待定': 'default',
    };
    return colors[status] || 'default';
  };

  // 线索等级颜色
  const getLeadLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      'A类': 'red',
      'B类': 'orange',
      'C类': 'blue',
      'D类': 'default',
    };
    return colors[level] || 'default';
  };

  // 表格列定义
  const columns = [
    {
      title: '客户编号',
      dataIndex: 'customerId',
      key: 'customerId',
      width: 160,
      fixed: 'left' as const,
      render: (customerId: string, record: Customer) => (
        <Link 
          to={`/customers/${record._id}`}
          style={{ color: '#1890ff', fontWeight: 'bold' }}
        >
          {customerId}
        </Link>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      fixed: 'left' as const,
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: '线索来源',
      dataIndex: 'leadSource',
      key: 'leadSource',
      width: 120,
    },
    {
      title: '服务类别',
      dataIndex: 'serviceCategory',
      key: 'serviceCategory',
      width: 120,
    },
    {
      title: '客户状态',
      dataIndex: 'contractStatus',
      key: 'contractStatus',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: '线索等级',
      dataIndex: 'leadLevel',
      key: 'leadLevel',
      width: 100,
      render: (level: string) => (
        <Tag color={getLeadLevelColor(level)}>
          {level}
        </Tag>
      ),
    },
    {
      title: '薪资预算',
      dataIndex: 'salaryBudget',
      key: 'salaryBudget',
      width: 100,
      render: (budget: number) => budget ? `¥${budget.toLocaleString()}` : '-',
    },

    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Customer) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => navigate(`/contracts/create?customerId=${record._id}`)}
          >
            发起合同
          </Button>
          <Button
            size="small"
            icon={<MessageOutlined />}
            onClick={() => handleAddFollowUp(record)}
          >
            添加跟进
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="客户管理" style={{ marginBottom: '24px' }}>
        {/* 搜索筛选和操作区域 */}
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[12, 8]} align="middle">
            <Col span={5}>
              <Search
                placeholder="搜索客户姓名、电话"
                allowClear
                style={{ width: '100%' }}
                onSearch={handleSearch}
                prefix={<SearchOutlined />}
                value={searchFilters.search}
                onChange={(e) => setSearchFilters({ ...searchFilters, search: e.target.value })}
              />
            </Col>
            <Col span={3}>
              <Select
                placeholder="请选择线索来源"
                allowClear
                style={{ width: '100%' }}
                value={searchFilters.leadSource}
                onChange={(value) => setSearchFilters({ ...searchFilters, leadSource: value })}
              >
                {LEAD_SOURCES.map(source => (
                  <Option key={source} value={source}>{source}</Option>
                ))}
              </Select>
            </Col>
            <Col span={3}>
              <Select
                placeholder="请选择服务类别"
                allowClear
                style={{ width: '100%' }}
                value={searchFilters.serviceCategory}
                onChange={(value) => setSearchFilters({ ...searchFilters, serviceCategory: value })}
              >
                {SERVICE_CATEGORIES.map(category => (
                  <Option key={category} value={category}>{category}</Option>
                ))}
              </Select>
            </Col>
            <Col span={3}>
              <Select
                placeholder="请选择客户状态"
                allowClear
                style={{ width: '100%' }}
                value={searchFilters.contractStatus}
                onChange={(value) => setSearchFilters({ ...searchFilters, contractStatus: value })}
              >
                {CONTRACT_STATUSES.map(status => (
                  <Option key={status} value={status}>{status}</Option>
                ))}
              </Select>
            </Col>
            <Col span={3}>
              <Select
                placeholder="请选择线索等级"
                allowClear
                style={{ width: '100%' }}
                value={searchFilters.leadLevel}
                onChange={(value) => setSearchFilters({ ...searchFilters, leadLevel: value })}
              >
                {LEAD_LEVELS.map(level => (
                  <Option key={level} value={level}>{level}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Space>
                <Button type="primary" onClick={handleSearch}>
                  搜索
                </Button>
                <Button onClick={handleReset}>
                  重置
                </Button>
              </Space>
            </Col>
            <Col span={3}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/customers/create')}
              >
                新增客户
              </Button>
            </Col>
          </Row>
        </div>

        {/* 客户列表表格 */}
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1320 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, size) => {
              loadCustomers(page, size);
            },
          }}
        />
      </Card>

      {/* 添加跟进记录弹窗 */}
      <CustomerFollowUpModal
        visible={followUpModal.visible}
        customerId={followUpModal.customerId}
        customerName={followUpModal.customerName}
        onCancel={() => setFollowUpModal({ visible: false, customerId: '', customerName: '' })}
        onSuccess={handleFollowUpSuccess}
      />
    </div>
  );
};

export default CustomerList; 