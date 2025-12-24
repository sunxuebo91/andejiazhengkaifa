import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Space,
  message,
  Tag,
  DatePicker,
  Select,
  Button,
  Row,
  Col,
  Statistic,
} from 'antd';
import { ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import leadTransferService, { LeadTransferRecord, LeadTransferStatistics } from '../../services/leadTransfer';
import apiService from '../../services/api';

const { RangePicker } = DatePicker;
const { Option } = Select;

const LeadTransferRecords: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<LeadTransferRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [users, setUsers] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<LeadTransferStatistics | null>(null);

  // 筛选条件
  const [filters, setFilters] = useState<{
    status?: 'success' | 'failed';
    fromUserId?: string;
    toUserId?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // 加载记录列表
  const loadRecords = async (page = 1, size = 10) => {
    setLoading(true);
    try {
      const response = await leadTransferService.getRecords({
        page,
        limit: size,
        ...filters,
      });
      setRecords(response.records);
      setTotal(response.total);
      setCurrentPage(page);
      setPageSize(size);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '获取记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStatistics = async () => {
    try {
      const data = await leadTransferService.getStatistics();
      setStatistics(data);
    } catch (error: any) {
      message.error('获取统计信息失败');
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const response = await apiService.get('/api/users', { page: 1, pageSize: 1000 });
      setUsers(response.data?.items || []);
    } catch (error: any) {
      message.error('获取用户列表失败');
    }
  };

  useEffect(() => {
    loadRecords();
    loadStatistics();
    loadUsers();
  }, []);

  // 筛选条件变化时重新加载
  useEffect(() => {
    loadRecords(1, pageSize);
  }, [filters]);

  // 处理日期范围变化
  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      setFilters({
        ...filters,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
      });
    } else {
      const { startDate, endDate, ...rest } = filters;
      setFilters(rest);
    }
  };

  // 表格列定义
  const columns: ColumnsType<LeadTransferRecord> = [
    {
      title: '流转时间',
      dataIndex: 'transferredAt',
      key: 'transferredAt',
      width: 160,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '客户编号',
      dataIndex: 'customerNumber',
      key: 'customerNumber',
      width: 130,
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 100,
    },
    {
      title: '流出人员',
      dataIndex: 'fromUserName',
      key: 'fromUserName',
      width: 100,
    },
    {
      title: '流入人员',
      dataIndex: 'toUserName',
      key: 'toUserName',
      width: 100,
    },
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      key: 'ruleName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={status === 'success' ? 'success' : 'error'} icon={status === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '客户状态',
      dataIndex: ['snapshot', 'contractStatus'],
      key: 'contractStatus',
      width: 90,
    },
    {
      title: '无活动时长',
      dataIndex: ['snapshot', 'inactiveHours'],
      key: 'inactiveHours',
      width: 110,
      render: (hours) => `${hours}小时`,
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      {statistics && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="总流转数" value={statistics.totalCount} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="成功数"
                value={statistics.successCount}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="失败数"
                value={statistics.failedCount}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="成功率"
                value={statistics.successRate}
                suffix="%"
                precision={2}
                valueStyle={{ color: parseFloat(statistics.successRate) >= 95 ? '#3f8600' : '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 筛选和列表 */}
      <Card
        title="流转记录"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => loadRecords(currentPage, pageSize)}>
            刷新
          </Button>
        }
      >
        {/* 筛选条件 */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="流转状态"
            style={{ width: 120 }}
            allowClear
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
          >
            <Option value="success">成功</Option>
            <Option value="failed">失败</Option>
          </Select>

          <Select
            placeholder="流出人员"
            style={{ width: 150 }}
            allowClear
            showSearch
            value={filters.fromUserId}
            onChange={(value) => setFilters({ ...filters, fromUserId: value })}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={users.map((user) => ({
              label: user.name,
              value: user._id,
            }))}
          />

          <Select
            placeholder="流入人员"
            style={{ width: 150 }}
            allowClear
            showSearch
            value={filters.toUserId}
            onChange={(value) => setFilters({ ...filters, toUserId: value })}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={users.map((user) => ({
              label: user.name,
              value: user._id,
            }))}
          />

          <RangePicker onChange={handleDateRangeChange} />
        </Space>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={records}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1150 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, size) => {
              loadRecords(page, size);
            },
          }}
        />
      </Card>
    </div>
  );
};

export default LeadTransferRecords;

