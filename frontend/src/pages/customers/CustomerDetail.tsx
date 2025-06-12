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
  Divider,
  Timeline,
  Empty,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, MessageOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import { Customer } from '../../types/customer.types';
import { FOLLOW_UP_TYPE_OPTIONS } from '../../types/customer-follow-up.types';
import CustomerFollowUpModal from '../../components/CustomerFollowUpModal';
import CreateContractModal from '../../components/CreateContractModal';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [followUpModal, setFollowUpModal] = useState({
    visible: false,
    customerId: '',
    customerName: ''
  });
  const [contractModal, setContractModal] = useState(false);

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

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

  // 返回客户列表
  const handleBack = () => {
    navigate('/customers');
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

  // 处理发起合同
  const handleCreateContract = () => {
    setContractModal(true);
  };

  // 处理合同创建成功
  const handleContractSuccess = (contractId: string) => {
    setContractModal(false);
    message.success('合同创建成功！');
    // 可以跳转到合同详情页
    navigate(`/contracts/${contractId}`);
  };

  // 获取跟进方式的中文标签
  const getFollowUpTypeLabel = (type: string) => {
    const option = FOLLOW_UP_TYPE_OPTIONS.find(opt => opt.value === type);
    return option ? option.label : type;
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
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => navigate(`/customers/edit/${customer._id}`)}
          >
            编辑客户
          </Button>
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
                  <Tag>{customer.leadSource}</Tag>
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
                
                <Descriptions.Item label="客户地址" span={1}>
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
                  {customer.createdByUser ? customer.createdByUser.name : customer.createdBy}
                </Descriptions.Item>
                
                <Descriptions.Item label="创建时间" span={1}>
                  {formatDateTime(customer.createdAt)}
                </Descriptions.Item>
                
                <Descriptions.Item label="最后更新时间" span={2}>
                  {formatDateTime(customer.updatedAt)}
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
            >
              {customer.followUps && customer.followUps.length > 0 ? (
                <Timeline mode="left">
                  {customer.followUps.map((followUp, index) => (
                    <Timeline.Item
                      key={followUp._id}
                      color={index === 0 ? 'green' : 'blue'}
                      label={formatDateTime(followUp.createdAt)}
                    >
                      <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Space>
                            <Tag color="blue">{getFollowUpTypeLabel(followUp.type)}</Tag>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              by {followUp.createdBy.name}
                            </span>
                          </Space>
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                            {followUp.content}
                          </div>
                        </Space>
                      </Card>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Empty 
                  description="暂无跟进记录" 
                  style={{ padding: '40px 0' }}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* 操作按钮 */}
        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Space size="large">
            <Button size="large" onClick={handleBack}>
              返回客户列表
            </Button>
            <Button 
              type="primary" 
              size="large" 
              icon={<EditOutlined />}
              onClick={() => navigate(`/customers/edit/${customer._id}`)}
            >
              编辑客户信息
            </Button>
            <Button 
              type="primary" 
              size="large" 
              icon={<FileTextOutlined />}
              onClick={handleCreateContract}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              发起合同
            </Button>
          </Space>
        </div>
      </Card>

      {/* 添加跟进记录弹窗 */}
      <CustomerFollowUpModal
        visible={followUpModal.visible}
        customerId={followUpModal.customerId}
        customerName={followUpModal.customerName}
        onCancel={() => setFollowUpModal({ visible: false, customerId: '', customerName: '' })}
        onSuccess={handleFollowUpSuccess}
      />

      {/* 创建合同弹窗 */}
      {customer && (
        <CreateContractModal
          visible={contractModal}
          customer={customer}
          onCancel={() => setContractModal(false)}
          onSuccess={handleContractSuccess}
        />
      )}
    </div>
  );
};

export default CustomerDetail; 