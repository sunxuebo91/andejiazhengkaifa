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
  Col,
  Upload,
  Modal,
  UploadProps
} from 'antd';
import { SearchOutlined, PlusOutlined, MessageOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import { apiService } from '../../services/api';
import {
  Customer,
  LEAD_SOURCES,
  SERVICE_CATEGORIES,
  CONTRACT_STATUSES,
  LEAD_LEVELS
} from '../../types/customer.types';
import CustomerFollowUpModal from '../../components/CustomerFollowUpModal';
import AssignCustomerModal from '../../components/AssignCustomerModal';
import BatchAssignCustomerModal from '../../components/BatchAssignCustomerModal';
import Authorized from '../../components/Authorized';

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

  // 分配弹窗状态
  const [assignModal, setAssignModal] = useState<{ visible: boolean; customerId: string | null; customerName: string }>(
    { visible: false, customerId: null, customerName: '' }
  );

  // 批量选择和批量分配状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchAssignModalVisible, setBatchAssignModalVisible] = useState(false);

  // 导入相关状态
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    fail: number;
    errors: string[];
  } | null>(null);

  // 搜索条件
  const [searchFilters, setSearchFilters] = useState<{
    search: string;
    leadSource: string | undefined;
    serviceCategory: string | undefined;
    contractStatus: string | undefined;
    leadLevel: string | undefined;
    assignedTo: string | undefined;
    startDate: string;
    endDate: string;
  }>({
    search: '',
    leadSource: undefined,
    serviceCategory: undefined,
    contractStatus: undefined,
    leadLevel: undefined,
    assignedTo: undefined,
    startDate: '',
    endDate: ''
  });

  // 用户列表（用于线索归属人筛选）
  const [users, setUsers] = useState<Array<{ _id: string; name: string; username: string; role: string; department?: string }>>([]);

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
    loadUsers();
  }, []);

  // 获取用户列表
  const loadUsers = async () => {
    try {
      const userList = await customerService.getAssignableUsers();
      setUsers(userList);
    } catch (error: any) {
      console.error('获取用户列表失败:', error);
    }
  };

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
      assignedTo: undefined,
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

  // 处理Excel导入
  const handleExcelImport: UploadProps['customRequest'] = async (options) => {
    setImportLoading(true);
    setImportResult(null);

    try {
      const { file } = options;
      const uploadFile = file as File;

      // 验证文件类型
      const isExcel =
        uploadFile.name.endsWith('.xlsx') ||
        uploadFile.name.endsWith('.xls') ||
        uploadFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        uploadFile.type === 'application/vnd.ms-excel';

      if (!isExcel) {
        message.error('只支持Excel文件(.xlsx, .xls)');
        setImportLoading(false);
        return;
      }

      // 准备表单数据
      const formData = new FormData();
      formData.append('file', uploadFile);

      // 发送请求
      const response = await apiService.upload('/api/customers/import-excel', formData);

      if (response.success) {
        message.success(response.message || '导入成功');
        setImportResult(response.data);

        // 刷新列表
        loadCustomers(1, pageSize);

        // 如果导入全部成功且没有错误，自动关闭弹窗
        if (response.data.success > 0 && response.data.fail === 0) {
          setTimeout(() => {
            setImportModalVisible(false);
          }, 2000);
        }
      } else {
        message.error(response.message || '导入失败');
      }
    } catch (error) {
      console.error('导入Excel失败:', error);
      message.error('导入失败，请检查文件格式或网络连接');
    } finally {
      setImportLoading(false);
    }
  };

  // 下载Excel导入模板
  const downloadExcelTemplate = () => {
    const columns = ['姓名', '电话', '线索来源', '微信号', '需求品类', '客户状态', '薪资预算', '地址', '备注'];
    const data = [
      ['张三', '13800138000', '美团', 'wx123', '月嫂', '待定', '8000', '北京市朝阳区', '备注信息'],
      ['李四', '13900139000', '抖音', '', '住家育儿嫂', '匹配中', '9000', '上海市浦东新区', '']
    ];

    // 创建CSV内容（添加BOM以支持中文）
    let csv = '\ufeff' + columns.join(',') + '\n';
    data.forEach(row => {
      csv += row.join(',') + '\n';
    });

    // 创建Blob并下载
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '客户导入模板.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 关闭导入结果并重置状态
  const handleCloseImport = () => {
    setImportModalVisible(false);
    setImportResult(null);
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
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
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
          {/* 分配按钮（仅管理员/经理可见） */}
          <Authorized role={["admin", "manager"]} noMatch={null}>
            <Button
              size="small"
              onClick={() => {
                setAssignModal({ visible: true, customerId: record._id, customerName: record.name });
              }}
            >
              分配
            </Button>
          </Authorized>
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
                placeholder="线索来源"
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
                placeholder="服务类别"
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
                placeholder="客户状态"
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
                placeholder="线索等级"
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
            <Col span={3}>
              <Select
                placeholder="线索归属人"
                allowClear
                style={{ width: '100%' }}
                value={searchFilters.assignedTo}
                onChange={(value) => setSearchFilters({ ...searchFilters, assignedTo: value })}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {users.map(user => (
                  <Option key={user._id} value={user._id}>
                    {user.name} ({user.username})
                  </Option>
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
          </Row>
          <Row gutter={[12, 8]} align="middle" style={{ marginTop: '8px' }}>
            <Col span={24}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/customers/create')}
                >
                  新增客户
                </Button>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => setImportModalVisible(true)}
                >
                  批量导入
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 批量操作区域 */}
        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#e6f7ff', borderRadius: 4 }}>
            <Space>
              <span>已选择 {selectedRowKeys.length} 个客户</span>
              <Authorized role={['admin', 'manager']}>
                <Button type="primary" onClick={() => setBatchAssignModalVisible(true)}>
                  批量分配
                </Button>
              </Authorized>
              <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
            </Space>
          </div>
        )}

        {/* 客户列表表格 */}
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1320 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            selections: [
              Table.SELECTION_ALL,
              Table.SELECTION_INVERT,
              Table.SELECTION_NONE,
            ],
          }}
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

      {/* 分配负责人弹窗 */}
      <AssignCustomerModal
        visible={assignModal.visible}
        customerId={assignModal.customerId}
        onCancel={() => setAssignModal({ visible: false, customerId: null, customerName: '' })}
        onSuccess={() => {
          setAssignModal({ visible: false, customerId: null, customerName: '' });
          loadCustomers(currentPage, pageSize);
        }}
      />

      {/* 批量分配弹窗 */}
      <BatchAssignCustomerModal
        visible={batchAssignModalVisible}
        customerIds={selectedRowKeys as string[]}
        onCancel={() => setBatchAssignModalVisible(false)}
        onSuccess={() => {
          setBatchAssignModalVisible(false);
          setSelectedRowKeys([]);
          loadCustomers(currentPage, pageSize);
        }}
      />

      {/* 批量导入弹窗 */}
      <Modal
        title="批量导入客户"
        open={importModalVisible}
        onCancel={handleCloseImport}
        footer={[
          <Button key="template" onClick={downloadExcelTemplate}>
            下载模板
          </Button>,
          <Button key="close" onClick={handleCloseImport}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ marginBottom: 8 }}>
            <strong>导入说明：</strong>
          </p>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li>支持 .xlsx 和 .xls 格式的Excel文件</li>
            <li>必填字段：姓名、电话、线索来源</li>
            <li>可选字段：微信号、需求品类、客户状态、薪资预算、地址、备注等</li>
            <li>线索来源可选值：美团、抖音、快手、小红书、转介绍、杭州同馨、握个手平台、线索购买、其他</li>
            <li>手机号重复的客户将导入失败</li>
          </ul>
        </div>

        <Upload.Dragger
          name="file"
          accept=".xlsx,.xls"
          customRequest={handleExcelImport}
          showUploadList={false}
          disabled={importLoading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            {importLoading ? '正在导入...' : '点击或拖拽Excel文件到此区域上传'}
          </p>
          <p className="ant-upload-hint">
            支持 .xlsx 和 .xls 格式
          </p>
        </Upload.Dragger>

        {/* 导入结果 */}
        {importResult && (
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <p style={{ marginBottom: 8 }}>
              <strong>导入结果：</strong>
            </p>
            <p style={{ marginBottom: 4 }}>
              成功导入：<span style={{ color: '#52c41a', fontWeight: 'bold' }}>{importResult.success}</span> 条
            </p>
            <p style={{ marginBottom: 8 }}>
              导入失败：<span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{importResult.fail}</span> 条
            </p>

            {importResult.errors && importResult.errors.length > 0 && (
              <div>
                <p style={{ marginBottom: 4, color: '#ff4d4f' }}>
                  <strong>错误详情：</strong>
                </p>
                <div style={{ maxHeight: 200, overflow: 'auto', background: '#fff', padding: 8, borderRadius: 4 }}>
                  {importResult.errors.map((error, index) => (
                    <p key={index} style={{ margin: 0, fontSize: 12, color: '#666' }}>
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerList;