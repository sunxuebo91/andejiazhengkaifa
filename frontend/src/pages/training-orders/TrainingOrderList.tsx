import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Button, Space, Input, Tag, message } from 'antd';
import { SearchOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { contractService } from '../../services/contractService';
import { Contract } from '../../types/contract.types';
import ContractStatusMini from '../../components/ContractStatusMini';

// 职培订单列表：复用 Contract 模型（orderCategory='training'），字段沿用合同表
const TrainingOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contractService.getContracts({
        page: pagination.current,
        limit: pagination.pageSize,
        search: search || undefined,
        orderCategory: 'training',
      });
      setOrders(res.contracts);
      setPagination(prev => ({ ...prev, total: res.total }));
    } catch (err) {
      console.error('获取职培订单列表失败:', err);
      message.error('获取职培订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 解析报名课程：优先取 templateParams['多选1']（步骤2实际勾选），回退到 intendedCourses
  const resolveEnrolledCourses = (record: Contract): string[] => {
    const raw = record.templateParams?.['多选1'];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split(/[；;,，]/).map(s => s.trim()).filter(Boolean);
    }
    return Array.isArray(record.intendedCourses) ? record.intendedCourses : [];
  };

  const renderCourses = (courses: string[]) => {
    if (!courses || courses.length === 0) return '-';
    return (
      <Space size={4} wrap>
        {courses.map(c => <Tag key={c} color="blue" style={{ fontSize: 11 }}>{c}</Tag>)}
      </Space>
    );
  };

  const columns = [
    {
      title: '订单编号',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <span style={{ fontWeight: 600, color: '#1890ff', fontSize: 12 }}>{text}</span>
      ),
    },
    {
      title: '学员信息',
      key: 'student',
      width: 140,
      render: (_: any, record: Contract) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{record.customerName}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{record.customerPhone}</div>
        </div>
      ),
    },
    {
      title: '报名课程',
      key: 'enrolledCourses',
      width: 280,
      render: (_: any, record: Contract) => renderCourses(resolveEnrolledCourses(record)),
    },
    {
      title: '报课金额',
      key: 'courseAmount',
      width: 110,
      render: (_: any, record: Contract) => {
        const v = record.courseAmount ?? Number(record.templateParams?.['报课金额']) ?? undefined;
        return (
          <span style={{ fontWeight: 600, color: '#1890ff', fontSize: 13 }}>
            {v ? `¥${Number(v).toLocaleString()}` : '-'}
          </span>
        );
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: Contract) => {
        if (record.esignContractNo) {
          return <ContractStatusMini contractNo={record.esignContractNo} />;
        }
        return <Tag>{record.contractStatus || 'draft'}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => <span style={{ fontSize: 12 }}>{dayjs(date).format('YYYY-MM-DD HH:mm')}</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      fixed: 'right' as const,
      render: (_: any, record: Contract) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => window.open(`/standalone/contracts/${record._id}`, '_blank')}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '职培订单列表' }}>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="搜索学员姓名/手机号/订单号"
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => setPagination(prev => ({ ...prev, current: 1 }))}
              style={{ width: 280 }}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" onClick={() => setPagination(prev => ({ ...prev, current: 1 }))}>
              搜索
            </Button>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/training-orders/create')}>
            新建职培订单
          </Button>
        </Space>
        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={orders}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
          onChange={(p) => setPagination({ current: p.current || 1, pageSize: p.pageSize || 10, total: pagination.total })}
          size="middle"
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </PageContainer>
  );
};

export default TrainingOrderList;

