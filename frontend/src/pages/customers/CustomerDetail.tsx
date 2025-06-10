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
} from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import { Customer } from '../../types/customer.types';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取客户详情
  const fetchCustomerDetail = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const customerData = await customerService.getCustomerById(id);
      setCustomer(customerData);
    } catch (error) {
      message.error('获取客户详情失败');
      console.error('获取客户详情错误:', error);
      // 如果获取失败，返回列表页
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

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

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
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
                  <Tag color="blue">{customer.serviceCategory}</Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label="薪资预算" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                    ¥{customer.salaryBudget.toLocaleString()}
                  </span>
                </Descriptions.Item>
                
                <Descriptions.Item label="休息方式" span={1}>
                  {customer.restSchedule}
                </Descriptions.Item>
                
                <Descriptions.Item label="期望上户日期" span={1}>
                  {formatDate(customer.expectedStartDate)}
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
                  {customer.homeArea}平方米
                </Descriptions.Item>
                
                <Descriptions.Item label="家庭人口" span={1}>
                  {customer.familySize}人
                </Descriptions.Item>
                
                <Descriptions.Item label="客户地址" span={1}>
                  {customer.address}
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
              </Descriptions>
            </Card>
          </Col>

          {/* 系统信息 */}
          <Col span={24}>
            <Card type="inner" title="系统信息">
              <Descriptions column={2} bordered>
                <Descriptions.Item label="线索创建人" span={1}>
                  {customer.createdBy}
                </Descriptions.Item>
                
                <Descriptions.Item label="创建时间" span={1}>
                  {formatDate(customer.createdAt)}
                </Descriptions.Item>
                
                <Descriptions.Item label="最后更新时间" span={2}>
                  {formatDate(customer.updatedAt)}
                </Descriptions.Item>
              </Descriptions>
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
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default CustomerDetail; 