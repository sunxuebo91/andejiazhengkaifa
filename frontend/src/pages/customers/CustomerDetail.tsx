import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  message,
  Spin,
  Row,
  Col,
  Timeline,
  Empty,
  Alert,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, MessageOutlined, ClockCircleOutlined, FileTextOutlined, HistoryOutlined, DownOutlined, UpOutlined, AuditOutlined } from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import { contractService } from '../../services/contractService';
import { Customer } from '../../types/customer.types';
import { FOLLOW_UP_TYPE_OPTIONS } from '../../types/customer-follow-up.types';
import CustomerFollowUpModal from '../../components/CustomerFollowUpModal';
import AssignCustomerModal from '../../components/AssignCustomerModal';
import Authorized from '../../components/Authorized';
import { useAuth } from '../../contexts/AuthContext';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // 获取当前用户信息
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // 🆕 新增：客户换人记录相关状态（合同历史）
  const [customerHistory, setCustomerHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 🆕 新增：分配历史记录
  const [assignmentLogs, setAssignmentLogs] = useState<any[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // 最后更新人信息现在直接从后端返回，无需状态管理

  const [followUpModal, setFollowUpModal] = useState({
    visible: false,
    customerId: '',
    customerName: ''
  });

  // 分配弹窗
  const [assignModal, setAssignModal] = useState<{ visible: boolean; customerId: string | null }>({ visible: false, customerId: null });

  // 冻结操作状态
  const [freezeLoading, setFreezeLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleFreeze = async () => {
    if (!customer) return;
    const reason = window.prompt('请输入冻结原因（可选）：');
    if (reason === null) return; // 用户取消
    try {
      setFreezeLoading(true);
      await customerService.freezeCustomer(customer._id, reason || undefined);
      await fetchCustomerDetail();
      message.success('线索已冻结');
    } catch (e: any) {
      message.error(e?.response?.data?.message || '冻结失败');
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleUnfreeze = async () => {
    if (!customer) return;
    try {
      setFreezeLoading(true);
      await customerService.unfreezeCustomer(customer._id);
      await fetchCustomerDetail();
      message.success('线索已解冻');
    } catch (e: any) {
      message.error(e?.response?.data?.message || '解冻失败');
    } finally {
      setFreezeLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

  // 🆕 新增：当客户信息加载完成后，获取客户的换人历史
  useEffect(() => {
    if (customer?.phone) {
      fetchCustomerHistory();
    }
  }, [customer]);

  // 最后更新人信息现在直接从客户详情API返回，无需额外获取

  // 获取客户分配历史
  useEffect(() => {
    const fetchAssignmentLogs = async () => {
      if (!id) return;
      try {
        setAssignmentLoading(true);
        const logs = await customerService.getAssignmentLogs(id);
        setAssignmentLogs(Array.isArray(logs) ? logs : []);
      } catch (e) {
        console.error('获取分配历史失败', e);
        setAssignmentLogs([]);
      } finally {
        setAssignmentLoading(false);
      }
    };
    fetchAssignmentLogs();
  }, [id]);

  // 🆕 分配历史展开/折叠状态
  const [showAllAssignments, setShowAllAssignments] = useState(false);

  // 🆕 跟进记录展开/折叠状态
  const [showAllFollowUps, setShowAllFollowUps] = useState(false);

  // 🆕 操作日志状态（仅管理员可见）
  const [operationLogs, setOperationLogs] = useState<any[]>([]);
  const [operationLogsLoading, setOperationLogsLoading] = useState(false);
  const [showAllOperationLogs, setShowAllOperationLogs] = useState(false);

  // 🆕 获取操作日志（仅管理员）
  useEffect(() => {
    const fetchOperationLogs = async () => {
      if (!id || user?.role !== 'admin') return;
      try {
        setOperationLogsLoading(true);
        const logs = await customerService.getOperationLogs(id);
        setOperationLogs(Array.isArray(logs) ? logs : []);
      } catch (e) {
        console.error('获取操作日志失败', e);
        setOperationLogs([]);
      } finally {
        setOperationLogsLoading(false);
      }
    };
    fetchOperationLogs();
  }, [id, user?.role]);

  const fetchCustomerDetail = async () => {
    if (!id) {
      message.error('无效的客户ID');
      navigate('/customers');
      return;
    }

    try {
      setLoading(true);
      const response = await customerService.getCustomerById(id);
      setCustomer(response);
    } catch (error) {
      console.error('获取客户详情失败:', error);
      message.error('获取客户详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 新增：获取客户换人历史记录
  const fetchCustomerHistory = async () => {
    if (!customer?.phone) {
      console.log('⚠️ 缺少客户手机号，跳过历史记录获取');
      return;
    }

    try {
      setHistoryLoading(true);
      console.log('🔍 开始获取客户合同历史:', customer.phone);

      const response = await contractService.getCustomerHistory(customer.phone);

      console.log('📡 API完整响应:', JSON.stringify(response, null, 2));

      if (response && response.success) {
        setCustomerHistory(response.data);
        console.log('✅ 客户合同历史获取成功:', response.data);
        console.log('📊 总服务人员数:', response.data?.totalWorkers);
        console.log('📊 合同记录数:', response.data?.contracts?.length);

      } else {
        console.log('📝 API返回失败或无数据:', response);
        setCustomerHistory(null);
      }
    } catch (error: any) {
      console.error('❌ 获取客户合同历史失败:', error);
      console.error('❌ 错误详情:', error.response || error.message);
      setCustomerHistory(null);
      // 不显示错误消息，因为新客户可能没有历史记录
    } finally {
      setHistoryLoading(false);
      console.log('🏁 合同历史获取流程结束');
    }
  };

  // 返回客户列表
  const handleBack = () => {
    navigate('/customers');
  };

  // 🗑️ 删除复杂的动态状态计算逻辑，恢复简单的静态显示
  // 状态标签颜色
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      '已签约': 'green',
      '签约中': 'blue',
      '匹配中': 'orange',
      '已面试': 'cyan',
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
      '流失': 'default',
    };
    return colors[level] || 'default';
  };

  // 格式化日期（精确到分钟）
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化日期（仅日期）
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 处理添加跟进
  const handleAddFollowUp = () => {
    if (customer) {
      setFollowUpModal({
        visible: true,
        customerId: customer._id,
        customerName: customer.name
      });
    }
  };

  // 处理跟进成功
  const handleFollowUpSuccess = () => {
    setFollowUpModal({
      visible: false,
      customerId: '',
      customerName: ''
    });
    // 刷新客户数据
    fetchCustomerDetail();
  };

  // 获取跟进方式的中文标签
  const getFollowUpTypeLabel = (type: string) => {
    const option = FOLLOW_UP_TYPE_OPTIONS.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  // 处理发起合同
  const handleCreateContract = () => {
    if (customer) {
      navigate(`/contracts/create?customerId=${customer._id}`);
    }
  };

  // 查看合同详情
  const handleViewContract = (contractId: string) => {
    navigate(`/contracts/detail/${contractId}`);
  };

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3>客户不存在</h3>
            <Button type="primary" onClick={handleBack}>
              返回客户列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
            >
              返回
            </Button>
            <span>客户详情 - {customer.name}</span>
            {customer.isFrozen && (
              <Tag color="blue" style={{ marginLeft: 8 }}>已冻结</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Authorized role={["admin","manager"]} noMatch={null}>
              <Button onClick={() => setAssignModal({ visible: true, customerId: customer._id })}>
                分配负责人
              </Button>
            </Authorized>
            {isAdmin && (
              customer.isFrozen ? (
                <Button
                  danger
                  loading={freezeLoading}
                  onClick={handleUnfreeze}
                >
                  解冻
                </Button>
              ) : (
                <Button
                  loading={freezeLoading}
                  onClick={handleFreeze}
                >
                  冻结
                </Button>
              )
            )}
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/customers/edit/${customer._id}`)}
            >
              编辑客户
            </Button>
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={handleCreateContract}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              发起合同
            </Button>
          </Space>
        }
      >
        <Row gutter={24}>
          {/* 基本信息 */}
          <Col span={24}>
            <Card type="inner" title="基本信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={3} bordered>
                <Descriptions.Item label="客户ID" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                    {customer.customerId}
                  </span>
                </Descriptions.Item>

                <Descriptions.Item label="客户姓名" span={1}>
                  {customer.name}
                </Descriptions.Item>

                <Descriptions.Item label="客户电话" span={1}>
                  {customer.phone}
                </Descriptions.Item>

                <Descriptions.Item label="微信号" span={1}>
                  {customer.wechatId || '未设置'}
                </Descriptions.Item>

                <Descriptions.Item label="身份证号" span={1}>
                  {customer.idCardNumber || '未设置'}
                </Descriptions.Item>

                <Descriptions.Item label="线索来源" span={1}>
                  <Space>
                    <Tag>{customer.leadSource}</Tag>
                    {customer.followUpStatus && (
                      <Tag color={customer.followUpStatus === '新客未跟进' ? '#ff4d4f' : '#faad14'}>
                        {customer.followUpStatus}
                      </Tag>
                    )}
                  </Space>
                </Descriptions.Item>

                <Descriptions.Item label="线索等级" span={1}>
                  <Tag color={getLeadLevelColor(customer.leadLevel)}>
                    {customer.leadLevel}
                  </Tag>
                </Descriptions.Item>

                <Descriptions.Item label="签约状态" span={1}>
                  <Tag color={getStatusColor(customer.contractStatus)}>
                    {customer.contractStatus}
                  </Tag>
                </Descriptions.Item>

                {customer.followUpStatus && (() => {
                  const transferCount = customer.transferCount || 0;
                  const isTransferring = transferCount > 0 && customer.lastTransferredAt;
                  return (
                    <Descriptions.Item label="线索状态" span={1}>
                      <Tag color={isTransferring ? 'processing' : 'default'}>
                        {isTransferring ? '流转中' : '未流转'}
                      </Tag>
                    </Descriptions.Item>
                  );
                })()}
              </Descriptions>
            </Card>
          </Col>

          {/* 服务需求信息 */}
          <Col span={24}>
            <Card type="inner" title="服务需求" style={{ marginBottom: '16px' }}>
              <Descriptions column={3} bordered>
                <Descriptions.Item label="需求品类" span={1}>
                  {customer.serviceCategory ? (
                    <Tag color="blue">{customer.serviceCategory}</Tag>
                  ) : (
                    '未设置'
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="薪资预算" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                    {customer.salaryBudget ? `¥${customer.salaryBudget.toLocaleString()}` : '未设置'}
                  </span>
                </Descriptions.Item>

                <Descriptions.Item label="休息方式" span={1}>
                  {customer.restSchedule || '未设置'}
                </Descriptions.Item>

                <Descriptions.Item label="期望上户日期" span={1}>
                  {customer.expectedStartDate ? formatDate(customer.expectedStartDate) : '未设置'}
                </Descriptions.Item>

                <Descriptions.Item label="预产期" span={2}>
                  {customer.expectedDeliveryDate
                    ? formatDate(customer.expectedDeliveryDate)
                    : '无'
                  }
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 家庭信息 */}
          <Col span={24}>
            <Card type="inner" title="家庭信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={3} bordered>
                <Descriptions.Item label="家庭面积" span={1}>
                  {customer.homeArea ? `${customer.homeArea}平方米` : '未设置'}
                </Descriptions.Item>

                <Descriptions.Item label="家庭人口" span={1}>
                  {customer.familySize ? `${customer.familySize}人` : '未设置'}
                </Descriptions.Item>

                <Descriptions.Item label="服务地址" span={1}>
                  {customer.address || '未设置'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 附加要求 */}
          <Col span={24}>
            <Card type="inner" title="附加要求" style={{ marginBottom: '16px' }}>
              <Descriptions column={3} bordered>
                <Descriptions.Item label="年龄要求" span={1}>
                  {customer.ageRequirement || '无特殊要求'}
                </Descriptions.Item>

                <Descriptions.Item label="性别要求" span={1}>
                  {customer.genderRequirement || '无特殊要求'}
                </Descriptions.Item>

                <Descriptions.Item label="籍贯要求" span={1}>
                  {customer.originRequirement || '无特殊要求'}
                </Descriptions.Item>

                <Descriptions.Item label="学历要求" span={1}>
                  {customer.educationRequirement || '无特殊要求'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 成交金额 */}
          <Col span={24}>
            <Card type="inner" title="成交信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={2} bordered>
                <Descriptions.Item label="成交金额">
                  {customer.dealAmount !== undefined && customer.dealAmount !== null ? (
                    <span style={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}>
                      ¥{customer.dealAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span style={{ color: '#999' }}>未填写</span>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 备注信息 */}
          {customer.remarks && (
            <Col span={24}>
              <Card type="inner" title="备注信息" style={{ marginBottom: '16px' }}>
                <Descriptions column={1} bordered>
                  <Descriptions.Item label="备注">
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {customer.remarks}
                    </div>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          )}

          {/* 系统信息 */}
          <Col span={24}>
            <Card type="inner" title="系统信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={2} bordered>
                <Descriptions.Item label="线索创建人" span={1}>
                  {customer.createdByUser ? String(customer.createdByUser.name || customer.createdByUser.username || '未知') : String(customer.createdBy || '未知')}
                </Descriptions.Item>

                <Descriptions.Item label="创建时间" span={1}>
                  {formatDateTime(customer.createdAt)}
                </Descriptions.Item>

                <Descriptions.Item label="最后更新人" span={1}>
                  {(() => {
                    // 优先使用后端返回的用户对象
                    if (customer.lastUpdatedByUser) {
                      return String(customer.lastUpdatedByUser.name || customer.lastUpdatedByUser.username || '未知用户');
                    }
                    // 如果没有用户对象，显示ID或默认值
                    return String(customer.lastUpdatedBy || '-');
                  })()}
                </Descriptions.Item>

                <Descriptions.Item label="最后更新时间" span={1}>
                  {formatDateTime(customer.updatedAt)}
                </Descriptions.Item>

                <Descriptions.Item label="当前负责人" span={1}>
                  {(() => {
                    // 优先使用 assignedToUser 对象
                    if (customer.assignedToUser) {
                      return String(customer.assignedToUser.name || customer.assignedToUser.username || '未知用户');
                    }
                    // 兼容旧的对象格式
                    if (typeof customer.assignedTo === 'object' && customer.assignedTo) {
                      return String((customer.assignedTo as any).name || (customer.assignedTo as any).username || '未知用户');
                    }
                    // 如果是字符串ID，显示ID
                    return String(customer.assignedTo || '-');
                  })()}
                </Descriptions.Item>

                <Descriptions.Item label="分配时间" span={1}>
                  {customer.assignedAt ? formatDateTime(customer.assignedAt) : '-'}
                </Descriptions.Item>

                <Descriptions.Item label="分配人" span={1}>
                  {(() => {
                    // 优先使用 assignedByUser 对象
                    if (customer.assignedByUser) {
                      return String(customer.assignedByUser.name || customer.assignedByUser.username || '未知用户');
                    }
                    // 兼容旧的对象格式
                    if (typeof customer.assignedBy === 'object' && customer.assignedBy) {
                      return String((customer.assignedBy as any).name || (customer.assignedBy as any).username || '未知用户');
                    }
                    // 如果是字符串ID，显示ID
                    return String(customer.assignedBy || '-');
                  })()}
                </Descriptions.Item>

                <Descriptions.Item label="分配备注" span={1}>
                  {customer.assignmentReason || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 跟进记录 */}
          <Col span={24}>
            <Card
              type="inner"
              title={
                <Space>
                  <ClockCircleOutlined />
                  <span>跟进记录</span>
                  {customer.followUps && customer.followUps.length > 2 && (
                    <Tag color="blue">{customer.followUps.length} 条记录</Tag>
                  )}
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  size="small"
                  icon={<MessageOutlined />}
                  onClick={handleAddFollowUp}
                >
                  添加跟进记录
                </Button>
              }
              style={{ marginBottom: '16px' }}
            >
              {customer.followUps && customer.followUps.length > 0 ? (
                <>
                  <Timeline
                    mode="left"
                    items={(showAllFollowUps ? customer.followUps : customer.followUps.slice(0, 2)).map((followUp, index) => ({
                      key: followUp._id,
                      color: index === 0 ? 'green' : 'blue',
                      label: formatDateTime(followUp.createdAt),
                      children: (
                        <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Space>
                              <Tag color="blue">{getFollowUpTypeLabel(followUp.type)}</Tag>
                              <span style={{ fontSize: '12px', color: '#666' }}>
                                by {String(followUp.createdBy?.name || followUp.createdBy?.username || followUp.createdBy || '未知')}
                              </span>
                            </Space>
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                              {followUp.content}
                            </div>
                          </Space>
                        </Card>
                      )
                    }))}
                  />
                  {customer.followUps.length > 2 && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <Button
                        type="link"
                        onClick={() => setShowAllFollowUps(!showAllFollowUps)}
                        icon={showAllFollowUps ? <UpOutlined /> : <DownOutlined />}
                      >
                        {showAllFollowUps ? '收起记录' : `查看全部 ${customer.followUps.length} 条记录`}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Empty
                  description="暂无跟进记录"
                  style={{ padding: '40px 0' }}
                />
              )}
            </Card>
          </Col>

          {/* 换人历史记录 - 移至页面底部 */}
          {customer && (
            <Col span={24}>
              <Card
                type="inner"
                title={
                  <Space>
                    <HistoryOutlined style={{ color: '#1890ff' }} />
                    <span>换人历史记录</span>
                    <Tag color="blue">
                      {customerHistory && customerHistory.totalWorkers > 1
                        ? `共${customerHistory.totalWorkers}任阿姨`
                        : '首任阿姨'
                      }
                    </Tag>
                  </Space>
                }
                style={{ marginBottom: '16px' }}
                loading={historyLoading}
              >
                <Alert
                  message="换人记录"
                  description={
                    customerHistory && customerHistory.totalWorkers > 1
                      ? `客户 ${customer.name} 共更换过 ${customerHistory.totalWorkers} 任阿姨，以下为详细记录`
                      : `客户 ${customer.name} 的首任阿姨服务记录`
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <Timeline
                  items={
                    customerHistory?.contracts && customerHistory.contracts.length > 0 ?
                    customerHistory.contracts
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((historyContract: any) => ({
                        key: historyContract.contractId,
                        color: historyContract.status === 'active' ? 'green' : 'gray',
                        children: (
                          <div style={{ paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{
                                fontWeight: 'bold',
                                fontSize: '16px',
                                color: historyContract.status === 'active' ? '#52c41a' : '#8c8c8c'
                              }}>
                                第{historyContract.order}任：{historyContract.workerName}
                              </span>
                              <Tag
                                color={historyContract.status === 'active' ? 'green' : 'default'}
                                style={{ marginLeft: '8px' }}
                              >
                                {historyContract.status === 'active' ? '当前服务' : '已更换'}
                              </Tag>
                              <Button
                                type="link"
                                size="small"
                                onClick={() => handleViewContract(historyContract.contractId)}
                                style={{ marginLeft: '8px', padding: 0 }}
                              >
                                查看合同
                              </Button>
                            </div>

                            <div style={{ color: '#666', lineHeight: '1.6' }}>
                              <div>
                                <strong>联系电话：</strong>{historyContract.workerPhone} |
                                <strong> 月薪：</strong>¥{historyContract.workerSalary?.toLocaleString()}
                              </div>
                              <div>
                                <strong>服务期间：</strong>
                                {formatDate(historyContract.startDate)} 至 {formatDate(historyContract.endDate)}
                              </div>
                              {historyContract.serviceDays && (
                                <div>
                                  <strong>实际服务：</strong>
                                  <span style={{ color: historyContract.status === 'active' ? '#52c41a' : '#fa8c16' }}>
                                    {historyContract.serviceDays} 天
                                  </span>
                                  {historyContract.terminationDate && (
                                    <span style={{ color: '#8c8c8c', marginLeft: '8px' }}>
                                      (于 {formatDate(historyContract.terminationDate)} 结束)
                                    </span>
                                  )}
                                </div>
                              )}
                              {historyContract.terminationReason && (
                                <div>
                                  <strong>更换原因：</strong>
                                  <span style={{ color: '#fa541c' }}>{historyContract.terminationReason}</span>
                                </div>
                              )}
                              <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                                合同编号：{historyContract.contractNumber} |
                                爱签状态：{historyContract.esignStatus || '未知'}
                              </div>
                            </div>
                          </div>
                        )
                      }))
                    : []
                  }
                />

                {customerHistory?.contracts?.length > 0 && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: '#f6f6f6',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    <strong>说明：</strong>
                    {customerHistory && customerHistory.totalWorkers > 1 ? (
                      <>
                        • 每次换人都会创建新的合同记录，保证服务的连续性<br/>
                        • 实际服务天数根据换人日期自动计算<br/>
                        • 新合同的开始时间会自动衔接上一任的结束时间
                      </>
                    ) : (
                      <>
                        • 这是该客户的首任阿姨服务记录<br/>
                        • 如需更换阿姨，可在合同详情页使用"为该客户换人"功能<br/>
                        • 换人后会自动记录服务历史，保证服务连续性
                      </>
                    )}
                  </div>
                )}

                {!customerHistory?.contracts?.length && (
                  <Empty
                    description="该客户暂无服务记录"
                    style={{ padding: '40px 0' }}
                  >
                    <Button
                      type="primary"
                      icon={<FileTextOutlined />}
                      onClick={handleCreateContract}
                    >
                      立即发起合同
                    </Button>
                  </Empty>
                )}
              </Card>
            </Col>
          )}

          {/* 分配历史 - 移至最底部 */}
          <Col span={24}>
            <Card
              type="inner"
              title={
                <Space>
                  <HistoryOutlined />
                  <span>分配历史</span>
                  {assignmentLogs && assignmentLogs.length > 1 && (
                    <Tag color="blue">{assignmentLogs.length} 条记录</Tag>
                  )}
                </Space>
              }
              style={{ marginBottom: '16px' }}
              loading={assignmentLoading}
            >
              {assignmentLogs && assignmentLogs.length > 0 ? (
                <>
                  <Timeline
                    mode="left"
                    items={(showAllAssignments ? assignmentLogs : assignmentLogs.slice(0, 1)).map((log: any, idx: number) => {
                      const assignedAt = log.assignedAt || log.createdAt;
                      const oldUser = String(log.oldAssignedToUser?.name || log.oldAssignedToUser?.username || log.oldAssignedTo || '-');
                      // 如果是释放到公海操作，新负责人显示为"公海"
                      const isReleaseToPool = log.action === 'release' || (!log.newAssignedTo && !log.newAssignedToUser);
                      const newUser = isReleaseToPool ? '公海' : String(log.newAssignedToUser?.name || log.newAssignedToUser?.username || log.newAssignedTo || '-');
                      const byUser = String(log.assignedByUser?.name || log.assignedByUser?.username || log.assignedBy || '-');
                      return {
                        key: log._id || idx,
                        color: isReleaseToPool ? 'orange' : (idx === 0 ? 'green' : 'blue'),
                        label: assignedAt ? formatDateTime(assignedAt) : '-',
                        children: (
                          <Card size="small" style={{ backgroundColor: isReleaseToPool ? '#fff7e6' : '#fafafa' }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <div>
                                <strong>{isReleaseToPool ? '释放到公海：' : '负责人变更：'}</strong>{oldUser} → {newUser}
                              </div>
                              <div style={{ fontSize: 12, color: '#666' }}>
                                <span>执行人：{byUser}</span>
                                {log.reason && <span> ｜ 原因：{log.reason}</span>}
                              </div>
                            </Space>
                          </Card>
                        ),
                      };
                    })}
                  />
                  {assignmentLogs.length > 1 && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <Button
                        type="link"
                        onClick={() => setShowAllAssignments(!showAllAssignments)}
                        icon={showAllAssignments ? <UpOutlined /> : <DownOutlined />}
                      >
                        {showAllAssignments ? '收起历史记录' : `查看全部 ${assignmentLogs.length} 条记录`}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Empty description="暂无分配记录" style={{ padding: '40px 0' }} />
              )}
            </Card>
          </Col>

          {/* 🆕 操作日志 - 仅管理员可见 */}
          <Authorized role={["admin"]} noMatch={null}>
            <Col span={24}>
              <Card
                type="inner"
                title={
                  <Space>
                    <AuditOutlined />
                    <span>操作日志</span>
                    {operationLogs && operationLogs.length > 1 && (
                      <Tag color="purple">{operationLogs.length} 条记录</Tag>
                    )}
                  </Space>
                }
                style={{ marginBottom: '16px' }}
                loading={operationLogsLoading}
              >
                {operationLogs && operationLogs.length > 0 ? (
                  <>
                    <Timeline
                      mode="left"
                      items={(showAllOperationLogs ? operationLogs : operationLogs.slice(0, 1)).map((log: any, idx: number) => {
                        const operatedAt = log.operatedAt || log.createdAt;
                        const operatorName = log.operator?.name || log.operator?.username || '系统';
                        // 根据操作类型设置颜色
                        const colorMap: Record<string, string> = {
                          'create': 'green',
                          'update': 'blue',
                          'delete': 'red',
                          'assign': 'orange',
                          'release_to_pool': 'orange',
                          'create_contract': 'cyan',
                          'create_follow_up': 'purple',
                        };
                        const color = colorMap[log.operationType] || 'gray';
                        return {
                          key: log._id || idx,
                          color,
                          label: operatedAt ? formatDateTime(operatedAt) : '-',
                          children: (
                            <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <div>
                                  <strong>{log.operationName}</strong>
                                </div>
                                {log.details?.description && (
                                  <div style={{ fontSize: 12, color: '#666' }}>
                                    {log.details.description}
                                  </div>
                                )}
                                {/* 显示修改前后的详细内容 */}
                                {log.operationType === 'update' && log.details?.before && log.details?.after && (
                                  <div style={{ marginTop: 8, fontSize: 12 }}>
                                    {Object.keys(log.details.after).map((field) => {
                                      const beforeValue = log.details.before[field];
                                      const afterValue = log.details.after[field];
                                      // 字段名映射
                                      const fieldNameMap: Record<string, string> = {
                                        'name': '姓名',
                                        'phone': '电话',
                                        'wechatId': '微信号',
                                        'contractStatus': '客户状态',
                                        'leadLevel': '线索等级',
                                        'leadSource': '线索来源',
                                        'serviceCategory': '需求品类',
                                        'salaryBudget': '薪资预算',
                                        'serviceAddress': '服务地址',
                                        'remark': '备注',
                                        'notes': '备注',
                                        'remarks': '备注',
                                        'address': '地址',
                                        'familySize': '家庭人数',
                                        'genderRequirement': '性别要求',
                                        'ageRequirement': '年龄要求',
                                        'educationRequirement': '学历要求',
                                        'originRequirement': '籍贯要求',
                                        'expectedStartDate': '期望上岗时间',
                                        'expectedDeliveryDate': '预产期',
                                        'restSchedule': '休息安排',
                                        'idCardNumber': '身份证号',
                                        'assignedTo': '负责人',
                                        'inPublicPool': '公海状态'
                                      };
                                      const fieldLabel = fieldNameMap[field] || field;
                                      const displayBefore = beforeValue === null || beforeValue === undefined || beforeValue === '' ? '空' : String(beforeValue);
                                      const displayAfter = afterValue === null || afterValue === undefined || afterValue === '' ? '空' : String(afterValue);

                                      return (
                                        <div key={field} style={{ padding: '4px 0', borderBottom: '1px dashed #e8e8e8' }}>
                                          <span style={{ color: '#666', fontWeight: 500 }}>{fieldLabel}：</span>
                                          <span style={{ color: '#ff4d4f', textDecoration: 'line-through' }}>{displayBefore}</span>
                                          <span style={{ margin: '0 8px', color: '#999' }}>→</span>
                                          <span style={{ color: '#52c41a', fontWeight: 500 }}>{displayAfter}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <div style={{ fontSize: 12, color: '#999' }}>
                                  操作人：{operatorName}
                                </div>
                              </Space>
                            </Card>
                          ),
                        };
                      })}
                    />
                    {operationLogs.length > 1 && (
                      <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <Button
                          type="link"
                          onClick={() => setShowAllOperationLogs(!showAllOperationLogs)}
                          icon={showAllOperationLogs ? <UpOutlined /> : <DownOutlined />}
                        >
                          {showAllOperationLogs ? '收起日志' : `查看全部 ${operationLogs.length} 条日志`}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <Empty description="暂无操作日志" style={{ padding: '40px 0' }} />
                )}
              </Card>
            </Col>
          </Authorized>
        </Row>

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
        onCancel={() => setAssignModal({ visible: false, customerId: null })}
        onSuccess={() => {
          setAssignModal({ visible: false, customerId: null });
          fetchCustomerDetail();
          message.success('分配成功');
        }}
      />
    </div>
  );


};

export default CustomerDetail;
