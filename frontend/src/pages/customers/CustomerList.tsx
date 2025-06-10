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
  Pagination,
  message,
  Popconfirm
} from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import { 
  Customer, 
  CustomerQuery, 
  LEAD_SOURCES, 
  SERVICE_CATEGORIES, 
  CONTRACT_STATUSES,
  LEAD_LEVELS 
} from '../../types/customer.types';

const { Search } = Input;
const { Option } = Select;

const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState<CustomerQuery>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // 获取客户列表
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customerService.getCustomers(searchQuery);
      setCustomers(response.customers);
      setPagination({
        current: response.page,
        pageSize: response.limit,
        total: response.total,
      });
    } catch (error) {
      message.error('获取客户列表失败');
      console.error('获取客户列表错误:', error);
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchQuery(prev => ({
      ...prev,
      search: value,
      page: 1,
    }));
  };

  // 处理筛选
  const handleFilter = (field: string, value: string | undefined) => {
    setSearchQuery(prev => ({
      ...prev,
      [field]: value,
      page: 1,
    }));
  };

  // 处理分页
  const handlePageChange = (page: number, pageSize?: number) => {
    setSearchQuery(prev => ({
      ...prev,
      page,
      limit: pageSize || prev.limit,
    }));
  };

  // 删除客户
  const handleDelete = async (id: string) => {
    try {
      await customerService.deleteCustomer(id);
      message.success('客户删除成功');
      fetchCustomers();
    } catch (error) {
      message.error('客户删除失败');
      console.error('删除客户错误:', error);
    }
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
      title: '客户ID',
      dataIndex: 'customerId',
      key: 'customerId',
      width: 120,
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
      render: (source: string) => <Tag>{source}</Tag>,
    },
    {
      title: '需求品类',
      dataIndex: 'serviceCategory',
      key: 'serviceCategory',
      width: 120,
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '线索等级',
      dataIndex: 'leadLevel',
      key: 'leadLevel',
      width: 80,
      render: (level: string) => <Tag color={getLeadLevelColor(level)}>{level}</Tag>,
    },
    {
      title: '签约状态',
      dataIndex: 'contractStatus',
      key: 'contractStatus',
      width: 100,
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: '薪资预算',
      dataIndex: 'salaryBudget',
      key: 'salaryBudget',
      width: 100,
      render: (budget: number) => `¥${budget}`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Customer) => (
        <Space>
          <Button 
            type="link" 
            size="small"
            onClick={() => navigate(`/customers/${record._id}`)}
          >
            查看
          </Button>
          <Popconfirm
            title="确定要删除这个客户吗？"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              size="small" 
              danger
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
    <div style={{ padding: '24px' }}>
      <Card title="客户管理" style={{ marginBottom: '24px' }}>
        {/* 搜索和筛选区域 */}
        <div style={{ marginBottom: '16px' }}>
          <Space wrap size="middle">
            <Search
              placeholder="搜索客户姓名或手机号"
              allowClear
              style={{ width: 250 }}
              onSearch={handleSearch}
              prefix={<SearchOutlined />}
            />
            
            <Select
              placeholder="线索来源"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => handleFilter('leadSource', value)}
            >
              {LEAD_SOURCES.map(source => (
                <Option key={source} value={source}>{source}</Option>
              ))}
            </Select>

            <Select
              placeholder="需求品类"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => handleFilter('serviceCategory', value)}
            >
              {SERVICE_CATEGORIES.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>

            <Select
              placeholder="签约状态"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilter('contractStatus', value)}
            >
              {CONTRACT_STATUSES.map(status => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>

            <Select
              placeholder="线索等级"
              allowClear
              style={{ width: 100 }}
              onChange={(value) => handleFilter('leadLevel', value)}
            >
              {LEAD_LEVELS.map(level => (
                <Option key={level} value={level}>{level}</Option>
              ))}
            </Select>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/customers/create')}
            >
              创建客户
            </Button>
          </Space>
        </div>

        {/* 客户列表表格 */}
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="_id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
          size="middle"
        />

        {/* 分页组件 */}
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={handlePageChange}
            onShowSizeChange={handlePageChange}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
            pageSizeOptions={['10', '20', '50', '100']}
          />
        </div>
      </Card>
    </div>
  );
};

export default CustomerList; 