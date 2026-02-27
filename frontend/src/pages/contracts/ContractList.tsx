import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Tag,
  message,
  Row,
  Col,
  Statistic,
  Modal,
  Badge,
} from 'antd';
import { SearchOutlined, EyeOutlined, PlusOutlined, DeleteOutlined, AuditOutlined } from '@ant-design/icons';
import { contractService } from '../../services/contractService';
import { Contract, ContractType, CONTRACT_TYPES } from '../../types/contract.types';
import ContractStatusMini from '../../components/ContractStatusMini';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const ContractList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    contractType: '',
    status: '',
    dateRange: null as any,
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  });

  // 权限检查 - 支持多种管理员角色标识
  const isAdmin = user?.role === '系统管理员' || user?.role === 'admin' || user?.role === '管理员';

  useEffect(() => {
    fetchContracts();
    fetchStatistics();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: filters.search || undefined,
        contractType: filters.contractType || undefined,
        status: filters.status || undefined,
        startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
      };

      // 只获取真实的爱签合同数据
      const response = await contractService.getContracts(params);
      setContracts(response.contracts);
      setPagination(prev => ({
        ...prev,
        total: response.total,
      }));
    } catch (error) {
      console.error('获取合同列表失败:', error);
      message.error('获取合同列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const stats = await contractService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchContracts();
  };

  const handleReset = () => {
    setFilters({
      search: '',
      contractType: '',
      status: '',
      dateRange: null,
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (paginationConfig: any) => {
    setPagination({
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
      total: pagination.total,
    });
  };

  // 删除合同处理
  const handleDeleteContract = (record: Contract) => {
    Modal.confirm({
      title: isAdmin ? '确认删除合同' : '申请删除合同',
      content: (
        <div>
          <p>合同编号：{record.contractNumber}</p>
          <p>客户姓名：{record.customerName}</p>
          <p>服务人员：{record.workerName}</p>
          {isAdmin ? (
            <p style={{ color: 'red', marginTop: 16 }}>
              <strong>警告：</strong>删除后无法恢复，请谨慎操作！
            </p>
          ) : (
            <p style={{ marginTop: 16 }}>
              提交后需要等待管理员审批
            </p>
          )}
        </div>
      ),
      okText: isAdmin ? '确认删除' : '提交申请',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await contractService.deleteContract(
            record._id!,
            '从合同列表申请删除',
            isAdmin // 传递管理员标识
          );

          if (response.success) {
            message.success(
              isAdmin ? '合同删除成功' : '删除申请已提交，等待审批'
            );
            fetchContracts(); // 刷新列表
          } else {
            message.error(response.message || '操作失败');
          }
        } catch (error: any) {
          message.error(error.message || '操作失败');
        }
      },
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      '进行中': 'green',
      '已完成': 'blue',
      '已取消': 'red',
      '暂停': 'orange',
    };
    return colors[status] || 'default';
  };

  const getContractTypeColor = (type: ContractType) => {
    const colors: Record<ContractType, string> = {
      [ContractType.YUEXIN]: 'purple',
      [ContractType.ZHUJIA_YUER]: 'green',
      [ContractType.BAOJIE]: 'blue',
      [ContractType.ZHUJIA_BAOMU]: 'cyan',
      [ContractType.YANGCHONG]: 'orange',
      [ContractType.XIAOSHI]: 'geekblue',
      [ContractType.BAIBAN_YUER]: 'lime',
      [ContractType.BAIBAN_BAOMU]: 'magenta',
      [ContractType.ZHUJIA_HULAO]: 'gold',
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: '合同编号',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      width: 150,
      render: (text: string) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
      ),
    },
    {
      title: '客户信息',
      key: 'customer',
      width: 200,
      render: (_: any, record: Contract) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.customerName}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.customerPhone}</div>
        </div>
      ),
    },
    {
      title: '服务人员',
      key: 'worker',
      width: 200,
      render: (_: any, record: Contract) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.workerName}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.workerPhone}</div>
        </div>
      ),
    },
    {
      title: '合同类型',
      dataIndex: 'contractType',
      key: 'contractType',
      width: 100,
      render: (type: ContractType) => (
        <Tag color={getContractTypeColor(type)}>{type}</Tag>
      ),
    },
    {
      title: '服务期间',
      key: 'period',
      width: 200,
      render: (_: any, record: Contract) => {
        // 优先使用 templateParams 中的合同时间
        const startDateStr = record.templateParams?.['合同开始时间'] || record.templateParams?.['服务开始时间'];
        const endDateStr = record.templateParams?.['合同结束时间'] || record.templateParams?.['服务结束时间'];

        // 统一格式化日期为 YYYY-MM-DD
        const formatDateUnified = (dateStr: string | undefined, fallback: string) => {
          if (dateStr) {
            // 尝试解析中文日期格式 "2026年02月27日"
            const chineseMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
            if (chineseMatch) {
              const [, year, month, day] = chineseMatch;
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            // 尝试标准日期解析
            const parsed = dayjs(dateStr);
            if (parsed.isValid()) {
              return parsed.format('YYYY-MM-DD');
            }
            return dateStr;
          }
          return dayjs(fallback).format('YYYY-MM-DD');
        };

        const displayStart = formatDateUnified(startDateStr, record.startDate);
        const displayEnd = formatDateUnified(endDateStr, record.endDate);

        return (
          <div>
            <div>{displayStart}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              至 {displayEnd}
            </div>
          </div>
        );
      },
    },
    {
      title: '工资',
      dataIndex: 'workerSalary',
      key: 'workerSalary',
      width: 120,
      render: (salary: number) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          ¥{salary?.toLocaleString()}
        </span>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 150,
      render: (_: any, record: Contract) => {
        // 如果有爱签合同编号，显示爱签状态组件（迷你版）
        if (record.esignContractNo) {
          return (
            <ContractStatusMini
              contractNo={record.esignContractNo}
              onStatusChange={(status) => {
                // 可以在这里更新列表中的状态信息
                console.log(`合同 ${record.contractNumber} 状态更新:`, status);
              }}
            />
          );
        }
        
        // 否则显示本地状态（如果有esignStatus则显示，否则显示默认状态）
        const statusText = record.esignStatus || '未知状态';
        return (
          <Tag color={getStatusColor(statusText)}>{statusText}</Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Contract) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => window.open(`/standalone/contracts/${record._id}`, '_blank')}
          >
            查看
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteContract(record)}
          >
            {isAdmin ? '删除' : '申请删除'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="合同总数"
              value={statistics.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="签约中"
              value={statistics.active}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已签约"
              value={statistics.completed}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="其他状态"
              value={statistics.cancelled}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="合同管理"
        extra={
          <Space>
            {isAdmin && (
              <Button
                icon={<AuditOutlined />}
                onClick={() => navigate('/contracts/approvals')}
              >
                审批管理
              </Button>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/contracts/create')}
            >
              新建合同
            </Button>
          </Space>
        }
      >
        {/* 搜索筛选 */}
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Input
              placeholder="搜索合同编号、客户姓名、手机号"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="合同类型"
              value={filters.contractType}
              onChange={(value) => setFilters(prev => ({ ...prev, contractType: value }))}
              allowClear
              style={{ width: '100%' }}
            >
              {CONTRACT_TYPES.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="合同状态"
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="等待签约">等待签约</Option>
              <Option value="签约中">签约中</Option>
              <Option value="已签约">已签约</Option>
              <Option value="过期">过期</Option>
              <Option value="拒签">拒签</Option>
              <Option value="作废">作废</Option>
              <Option value="撤销">撤销</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 合同列表 */}
        <Table
          columns={columns}
          dataSource={contracts}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default ContractList; 