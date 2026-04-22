import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Button, Space, Input, Tag, message, Modal, Form, Select } from 'antd';
import { SearchOutlined, EyeOutlined, PlusOutlined, UserSwitchOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { trainingOrderService } from '../../services/trainingOrderService';
import { contractService } from '../../services/contractService';
import { Contract } from '../../types/contract.types';
import ContractStatusMini from '../../components/ContractStatusMini';
import { useAuth } from '../../contexts/AuthContext';

// 职培订单列表：复用 Contract 模型（orderCategory='training'），字段沿用合同表
const TrainingOrderList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // 权限：仅管理员可分配/删除
  const isAdmin = user?.role === '系统管理员' || user?.role === 'admin' || user?.role === '管理员';

  // 分配弹窗状态
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningOrder, setAssigningOrder] = useState<Contract | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ _id: string; name: string; username: string; role: string }>>([]);
  const [assignForm] = Form.useForm();
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trainingOrderService.list({
        page: pagination.current,
        limit: pagination.pageSize,
        search: search || undefined,
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

  // 打开分配弹窗
  const handleOpenAssignModal = async (record: Contract) => {
    setAssigningOrder(record);
    setAssignModalVisible(true);
    assignForm.resetFields();
    try {
      const response = await contractService.getAssignableUsers();
      if (response.success && response.data) {
        setAssignableUsers(response.data);
      } else {
        message.error(response.message || '获取员工列表失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '获取员工列表失败');
    }
  };

  // 提交分配
  const handleAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields();
      if (!assigningOrder?._id) return;
      setAssignLoading(true);
      const response = await contractService.assignContract(
        assigningOrder._id,
        values.assignedTo,
        values.reason,
      );
      if (response.success) {
        message.success('职培订单分配成功');
        setAssignModalVisible(false);
        setAssigningOrder(null);
        fetchOrders();
      } else {
        message.error(response.message || '分配失败');
      }
    } catch (error: any) {
      if (error?.errorFields) return; // 表单校验未通过
      message.error(error?.response?.data?.message || error?.message || '分配失败');
    } finally {
      setAssignLoading(false);
    }
  };

  // 删除订单（管理员直接删除）
  const handleDeleteOrder = (record: Contract) => {
    if (!record._id) return;
    Modal.confirm({
      title: '确认删除职培订单',
      content: (
        <div>
          <p>将永久删除此订单，删除后不可恢复。</p>
          <p><strong>订单编号：</strong>{record.contractNumber}</p>
          <p><strong>学员：</strong>{record.customerName}（{record.customerPhone}）</p>
          <p style={{ color: 'red' }}>是否确认删除？</p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await contractService.deleteContract(record._id!, undefined, true);
          if (response.success) {
            message.success('职培订单删除成功');
            fetchOrders();
          } else {
            message.error(response.message || '删除失败');
          }
        } catch (error: any) {
          message.error(error?.response?.data?.message || error?.message || '删除失败');
        }
      },
    });
  };

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
      title: '线索来源',
      key: 'leadSource',
      width: 100,
      render: (_: any, record: Contract) => {
        const lead = (record as any).trainingLeadId;
        const src = lead && typeof lead === 'object' ? lead.leadSource : undefined;
        return src ? <Tag color="geekblue">{src}</Tag> : <span style={{ color: '#bfbfbf' }}>-</span>;
      },
    },
    {
      title: '报名课程',
      key: 'enrolledCourses',
      width: 280,
      render: (_: any, record: Contract) => renderCourses(resolveEnrolledCourses(record)),
    },
    {
      title: '证书申报',
      key: 'graduated',
      width: 90,
      align: 'center' as const,
      render: (_: any, record: Contract) => {
        const isGraduated = record.contractStatus === 'graduated' || !!(record as any).graduatedAt;
        return (
          <Tag color={isGraduated ? 'green' : 'default'}>{isGraduated ? '是' : '否'}</Tag>
        );
      },
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
      title: '创建人',
      key: 'createdBy',
      width: 100,
      render: (_: any, record: Contract) => {
        const creator = record.createdBy as any;
        if (!creator) return <span style={{ color: '#999' }}>-</span>;
        if (typeof creator === 'string') {
          if (creator === 'temp' || /^[a-fA-F0-9]{24}$/.test(creator)) return <span style={{ color: '#999' }}>-</span>;
          return <span style={{ fontSize: 12 }}>{creator}</span>;
        }
        return <span style={{ fontSize: 12 }}>{creator.name || creator.username || '-'}</span>;
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: Contract) => {
        if (record.esignContractNo) {
          return <ContractStatusMini contractNo={record.esignContractNo} orderCategory="training" />;
        }
        // 职培对外五种状态：签约中 / 已签约 / 学习中 / 已毕业 / 已退款
        const statusMap: Record<string, { text: string; color: string }> = {
          signing: { text: '签约中', color: 'blue' },
          signed: { text: '已签约', color: 'cyan' },
          active: { text: '学习中', color: 'processing' },
          graduated: { text: '已毕业', color: 'green' },
          refunded: { text: '已退款', color: 'orange' },
        };
        const s = statusMap[record.contractStatus || 'signing'] || statusMap.signing;
        return <Tag color={s.color}>{s.text}</Tag>;
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
      width: isAdmin ? 230 : 90,
      fixed: 'right' as const,
      render: (_: any, record: Contract) => (
        <Space size={4}>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => window.open(`/standalone/contracts/${record._id}`, '_blank')}
          >
            查看
          </Button>
          {isAdmin && (
            <>
              <Button
                size="small"
                icon={<UserSwitchOutlined />}
                onClick={() => handleOpenAssignModal(record)}
              >
                分配
              </Button>
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteOrder(record)}
              >
                删除
              </Button>
            </>
          )}
        </Space>
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

      {/* 分配职培订单弹窗 */}
      <Modal
        title="分配职培订单"
        open={assignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={() => {
          setAssignModalVisible(false);
          setAssigningOrder(null);
        }}
        confirmLoading={assignLoading}
        okText="确认分配"
        cancelText="取消"
        destroyOnClose
      >
        {assigningOrder && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: 0 }}><strong>订单编号：</strong>{assigningOrder.contractNumber}</p>
            <p style={{ margin: 0 }}><strong>学员：</strong>{assigningOrder.customerName}（{assigningOrder.customerPhone}）</p>
          </div>
        )}
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="assignedTo"
            label="分配给"
            rules={[{ required: true, message: '请选择负责人' }]}
          >
            <Select
              placeholder="选择员工"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {assignableUsers.map(u => (
                <Select.Option key={u._id} value={u._id}>
                  {u.name}（{u.username}）- {u.role === 'admin' ? '管理员' : u.role === 'manager' ? '经理' : u.role === 'operator' ? '运营' : '员工'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="分配原因">
            <Input.TextArea rows={3} placeholder="请输入分配原因（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default TrainingOrderList;

