import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Modal,
  Input,
  Descriptions,
  Typography,
  Tabs,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { approvalService, ContractDeletionApproval } from '../../services/approvalService';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;

const ContractDeletionApprovals: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState<ContractDeletionApproval[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApproval, setSelectedApproval] = useState<ContractDeletionApproval | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');

  // 检查是否是孙学博
  const isSunXuebo = user?.username === 'sunxuebo' || user?.name === '孙学博';
  const isAdmin = user?.role === '系统管理员' || user?.role === 'admin' || user?.role === '管理员';

  // 调试信息
  useEffect(() => {
    console.log('🔍 审批管理页面 - 当前用户信息:', user);
    console.log('🔍 审批管理页面 - 用户角色:', user?.role);
    console.log('🔍 审批管理页面 - 是否管理员:', isAdmin);
    console.log('🔍 审批管理页面 - 是否孙学博:', isSunXuebo);
  }, [user, isAdmin, isSunXuebo]);

  useEffect(() => {
    if (!isAdmin) {
      console.error('❌ 权限检查失败 - 用户角色:', user?.role, '不是管理员');
      message.error('只有管理员可以访问此页面');
      navigate('/contracts');
      return;
    }
    console.log('✅ 权限检查通过 - 开始获取审批列表');
    fetchApprovals();
  }, [activeTab, currentPage, pageSize]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = await approvalService.getAll(activeTab, currentPage, pageSize);
      setApprovals(response.approvals);
      setTotal(response.total);
    } catch (error: any) {
      message.error(error.message || '获取审批列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (record: ContractDeletionApproval) => {
    setSelectedApproval(record);
    setModalVisible(true);
  };

  const handleApprove = (record: ContractDeletionApproval) => {
    if (!isSunXuebo) {
      message.error('只有孙学博可以审批删除请求');
      return;
    }
    setSelectedApproval(record);
    setActionType('approve');
    setComment('');
    setModalVisible(true);
  };

  const handleReject = (record: ContractDeletionApproval) => {
    if (!isSunXuebo) {
      message.error('只有孙学博可以审批删除请求');
      return;
    }
    setSelectedApproval(record);
    setActionType('reject');
    setComment('');
    setModalVisible(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedApproval) return;

    if (actionType === 'reject' && !comment.trim()) {
      message.error('拒绝时必须填写原因');
      return;
    }

    try {
      if (actionType === 'approve') {
        await approvalService.approve(selectedApproval._id, comment);
        message.success('已批准删除请求');
      } else {
        await approvalService.reject(selectedApproval._id, comment);
        message.success('已拒绝删除请求');
      }
      setModalVisible(false);
      setComment('');
      fetchApprovals();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'processing', text: '待审批' },
      approved: { color: 'success', text: '已批准' },
      rejected: { color: 'error', text: '已拒绝' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '合同编号',
      dataIndex: ['contractId', 'contractNumber'],
      key: 'contractNumber',
      render: (text: string, record: ContractDeletionApproval) => (
        <a onClick={() => navigate(`/contracts/${record.contractId._id}`)}>
          {text || record.contractNumber}
        </a>
      ),
    },
    {
      title: '客户姓名',
      dataIndex: ['contractId', 'customerName'],
      key: 'customerName',
    },
    {
      title: '阿姨姓名',
      dataIndex: ['contractId', 'workerName'],
      key: 'workerName',
    },
    {
      title: '申请人',
      dataIndex: 'requestedByName',
      key: 'requestedByName',
    },
    {
      title: '删除原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
  ];

  // 添加状态列和操作列（仅待审批标签页）
  if (activeTab === 'pending') {
    columns.push({
      title: '操作',
      key: 'action',
      render: (_: any, record: ContractDeletionApproval) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {isSunXuebo && (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record)}
                size="small"
              >
                批准
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => handleReject(record)}
                size="small"
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    } as any);
  } else {
    columns.push(
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => getStatusTag(status),
      } as any,
      {
        title: '审批人',
        dataIndex: 'approvedByName',
        key: 'approvedByName',
      } as any,
      {
        title: '审批时间',
        dataIndex: 'approvedAt',
        key: 'approvedAt',
        render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
      } as any,
    );
  }

  return (
    <Card
      title={
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/contracts')}
          />
          <Title level={4} style={{ margin: 0 }}>
            合同删除审批管理
          </Title>
        </Space>
      }
      extra={
        isSunXuebo ? (
          <Tag color="red">审批权限：孙学博</Tag>
        ) : (
          <Tag>仅查看权限</Tag>
        )
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'pending',
            label: `待审批 (${activeTab === 'pending' ? total : ''})`,
          },
          {
            key: 'approved',
            label: '已批准',
          },
          {
            key: 'rejected',
            label: '已拒绝',
          },
        ]}
      />

      <Table
        columns={columns}
        dataSource={approvals}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
        }}
      />

      <Modal
        title={
          actionType === 'approve'
            ? '批准删除请求'
            : actionType === 'reject'
            ? '拒绝删除请求'
            : '审批详情'
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setComment('');
        }}
        onOk={
          selectedApproval?.status === 'pending' && (actionType === 'approve' || actionType === 'reject')
            ? handleSubmitAction
            : undefined
        }
        okText={actionType === 'approve' ? '批准' : '拒绝'}
        okButtonProps={{
          danger: actionType === 'reject',
        }}
        width={700}
      >
        {selectedApproval && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="合同编号">
              {selectedApproval.contractId?.contractNumber || selectedApproval.contractNumber}
            </Descriptions.Item>
            <Descriptions.Item label="客户姓名">
              {selectedApproval.contractId?.customerName}
            </Descriptions.Item>
            <Descriptions.Item label="阿姨姓名">
              {selectedApproval.contractId?.workerName}
            </Descriptions.Item>
            <Descriptions.Item label="申请人">
              {selectedApproval.requestedByName}
            </Descriptions.Item>
            <Descriptions.Item label="删除原因">
              {selectedApproval.reason}
            </Descriptions.Item>
            <Descriptions.Item label="申请时间">
              {dayjs(selectedApproval.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {selectedApproval.status !== 'pending' && (
              <>
                <Descriptions.Item label="审批状态">
                  {getStatusTag(selectedApproval.status)}
                </Descriptions.Item>
                <Descriptions.Item label="审批人">
                  {selectedApproval.approvedByName}
                </Descriptions.Item>
                <Descriptions.Item label="审批时间">
                  {selectedApproval.approvedAt
                    ? dayjs(selectedApproval.approvedAt).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="审批意见">
                  {selectedApproval.approvalComment || '-'}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        )}

        {selectedApproval?.status === 'pending' && (actionType === 'approve' || actionType === 'reject') && (
          <div style={{ marginTop: 16 }}>
            <Text strong>
              {actionType === 'reject' ? '拒绝原因（必填）：' : '审批意见（选填）：'}
            </Text>
            <TextArea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                actionType === 'reject'
                  ? '请填写拒绝原因...'
                  : '请填写审批意见（可选）...'
              }
              style={{ marginTop: 8 }}
            />
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default ContractDeletionApprovals;

