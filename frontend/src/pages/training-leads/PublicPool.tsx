import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from 'antd';
import { SearchOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { trainingLeadService } from '../../services/trainingLeadService';
import { TrainingLead, TRAINING_TYPE_OPTIONS } from '../../types/training-lead.types';

const { Search } = Input;
const { Option } = Select;

const POOL_REASON_MAP: Record<string, { label: string; color: string }> = {
  manual: { label: '手动释放', color: '#faad14' },
  invalid: { label: '标记无效', color: '#d9d9d9' },
};

const PublicPool: React.FC = () => {
  const [leads, setLeads] = useState<TrainingLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [trainingType, setTrainingType] = useState<string | undefined>(undefined);

  const fetchLeads = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const response = await trainingLeadService.getTrainingLeads({
        page,
        pageSize: size,
        search: search || undefined,
        trainingType,
        inPublicPool: true,
      } as any);
      setLeads(response.items);
      setTotal(response.total);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '获取公海池失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLeads(1, pageSize);
  };

  const handleReset = () => {
    setSearch('');
    setTrainingType(undefined);
    setCurrentPage(1);
    setTimeout(() => fetchLeads(1, pageSize), 0);
  };

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    try {
      await trainingLeadService.claimLead(id);
      message.success('认领成功，线索已转入我的线索');
      fetchLeads(currentPage, pageSize);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '认领失败');
    } finally {
      setClaimingId(null);
    }
  };

  const columns = [
    {
      title: '学员编号',
      dataIndex: 'studentId',
      key: 'studentId',
      width: 120,
      render: (text: string, record: TrainingLead) => (
        <Link to={`/standalone/training-leads/${record._id}`} target="_blank" rel="noopener noreferrer">
          {text}
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
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (text: string) => text || '-',
    },
    {
      title: '培训类型',
      dataIndex: 'trainingType',
      key: 'trainingType',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: '入池原因',
      dataIndex: 'publicPoolReason',
      key: 'publicPoolReason',
      width: 110,
      render: (reason: string) => {
        const info = POOL_REASON_MAP[reason];
        if (!info) return '-';
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '入池时间',
      dataIndex: 'publicPoolAt',
      key: 'publicPoolAt',
      width: 160,
      sorter: false,
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: TrainingLead) => (
        <Button
          type="primary"
          size="small"
          icon={<ThunderboltOutlined />}
          loading={claimingId === record._id}
          onClick={() => handleClaim(record._id)}
        >
          认领
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={[12, 12]}>
            <Col span={6}>
              <Search
                placeholder="搜索姓名、手机号、学员编号"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onSearch={handleSearch}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="培训类型"
                value={trainingType}
                onChange={setTrainingType}
                allowClear
                style={{ width: '100%' }}
              >
                {TRAINING_TYPE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Col>
            <Col span={14} style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={handleReset}>重置</Button>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  搜索
                </Button>
              </Space>
            </Col>
          </Row>

          <Table
            columns={columns}
            dataSource={leads}
            rowKey="_id"
            loading={loading}
            scroll={{ x: 800 }}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (t) => `共 ${t} 条`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default PublicPool;
