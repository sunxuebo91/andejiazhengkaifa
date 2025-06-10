import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Card,
  message,
  Row,
  Col,
  Space,
  Divider,
  Spin,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import {
  CreateCustomerData,
  Customer,
  LEAD_SOURCES,
  SERVICE_CATEGORIES,
  LEAD_LEVELS,
  REST_SCHEDULES,
  CONTRACT_STATUSES,
  EDUCATION_REQUIREMENTS,
} from '../../types/customer.types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const EditCustomer: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);

  // 获取客户信息
  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    if (!id) {
      message.error('无效的客户ID');
      navigate('/customers');
      return;
    }

    try {
      setInitialLoading(true);
      const customerData = await customerService.getCustomerById(id);
      setCustomer(customerData);
      
      // 填充表单数据
      const formData = {
        ...customerData,
        expectedStartDate: customerData.expectedStartDate 
          ? dayjs(customerData.expectedStartDate) 
          : undefined,
        expectedDeliveryDate: customerData.expectedDeliveryDate 
          ? dayjs(customerData.expectedDeliveryDate) 
          : undefined,
      };
      
      form.setFieldsValue(formData);
    } catch (error: any) {
      message.error('获取客户信息失败');
      console.error('获取客户信息错误:', error);
      navigate('/customers');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!id) return;

    setLoading(true);
    try {
      const formattedData: Partial<CreateCustomerData> = {
        ...values,
        expectedStartDate: values.expectedStartDate 
          ? values.expectedStartDate.format('YYYY-MM-DD') 
          : undefined,
        expectedDeliveryDate: values.expectedDeliveryDate 
          ? values.expectedDeliveryDate.format('YYYY-MM-DD') 
          : undefined,
      };

      await customerService.updateCustomer(id, formattedData);
      message.success('客户信息更新成功！');
      navigate(`/customers/${id}`);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '客户信息更新失败');
      console.error('更新客户信息错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/customers/${id}`);
  };

  if (initialLoading) {
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
            <Button type="primary" onClick={() => navigate('/customers')}>
              返回客户列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
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
            编辑客户 - {customer.name}
          </Space>
        }
        style={{ width: '100%', maxWidth: '1400px' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: '1400px', margin: '0 auto' }}
        >
          {/* 基础信息区域 */}
          <Divider orientation="left">基础信息</Divider>
          <Row gutter={24} justify="center">
            <Col span={8}>
              <Form.Item
                label="客户姓名"
                name="name"
                rules={[
                  { required: true, message: '请输入客户姓名' },
                  { min: 2, message: '姓名至少2个字符' },
                  { max: 20, message: '姓名不能超过20个字符' },
                ]}
              >
                <Input placeholder="请输入客户姓名" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="客户电话"
                name="phone"
                rules={[
                  { required: true, message: '请输入客户电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' },
                ]}
              >
                <Input placeholder="请输入客户电话" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="线索来源"
                name="leadSource"
                rules={[{ required: true, message: '请选择线索来源' }]}
              >
                <Select placeholder="请选择线索来源" style={{ width: '100%' }}>
                  {LEAD_SOURCES.map(source => (
                    <Option key={source} value={source}>{source}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24} justify="center">
            <Col span={8}>
              <Form.Item
                label="微信号 (可选)"
                name="wechatId"
              >
                <Input placeholder="请输入微信号" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="身份证号 (可选)"
                name="idCardNumber"
                rules={[
                  { 
                    pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, 
                    message: '请输入有效的身份证号码' 
                  }
                ]}
              >
                <Input placeholder="请输入身份证号" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="客户状态"
                name="contractStatus"
                rules={[{ required: true, message: '请选择客户状态' }]}
              >
                <Select placeholder="请选择客户状态" style={{ width: '100%' }}>
                  {CONTRACT_STATUSES.map(status => (
                    <Option key={status} value={status}>{status}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 需求信息区域 */}
          <Divider orientation="left">需求信息</Divider>
          <Row gutter={24} justify="center">
            <Col span={8}>
              <Form.Item
                label="需求品类 (可选)"
                name="serviceCategory"
              >
                <Select placeholder="请选择需求品类" style={{ width: '100%' }}>
                  {SERVICE_CATEGORIES.map(category => (
                    <Option key={category} value={category}>{category}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="线索等级 (可选)"
                name="leadLevel"
              >
                <Select placeholder="请选择线索等级" style={{ width: '100%' }}>
                  {LEAD_LEVELS.map(level => (
                    <Option key={level} value={level}>{level}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="薪资预算 (可选)"
                name="salaryBudget"
              >
                <InputNumber
                  placeholder="请输入薪资预算"
                  min={0}
                  max={50000}
                  formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value?.replace(/¥\s?|(,*)/g, '') as any}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24} justify="center">
            <Col span={8}>
              <Form.Item
                label="期望上户日期 (可选)"
                name="expectedStartDate"
              >
                <DatePicker 
                  placeholder="请选择期望上户日期" 
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="休息方式 (可选)"
                name="restSchedule"
              >
                <Select placeholder="请选择休息方式" style={{ width: '100%' }}>
                  {REST_SCHEDULES.map(schedule => (
                    <Option key={schedule} value={schedule}>{schedule}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="预产期 (可选)"
                name="expectedDeliveryDate"
              >
                <DatePicker 
                  placeholder="请选择预产期" 
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 家庭信息区域 */}
          <Divider orientation="left">家庭信息</Divider>
          <Row gutter={24} justify="center">
            <Col span={8}>
              <Form.Item
                label="家庭面积 (可选)"
                name="homeArea"
              >
                <InputNumber
                  placeholder="请输入家庭面积"
                  min={0}
                  max={1000}
                  addonAfter="平方米"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="家庭人口 (可选)"
                name="familySize"
              >
                <InputNumber
                  placeholder="请输入家庭人口"
                  min={1}
                  max={20}
                  addonAfter="人"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="客户地址 (可选)"
                name="address"
              >
                <Input placeholder="请输入客户地址" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 附加要求区域 */}
          <Divider orientation="left">附加要求</Divider>
          <Row gutter={24} justify="center">
            <Col span={8}>
              <Form.Item
                label="年龄要求 (可选)"
                name="ageRequirement"
              >
                <Input placeholder="例：25-40岁" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="性别要求 (可选)"
                name="genderRequirement"
              >
                <Select placeholder="请选择性别要求" style={{ width: '100%' }}>
                  <Option value="男">男</Option>
                  <Option value="女">女</Option>
                  <Option value="不限">不限</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="籍贯要求 (可选)"
                name="originRequirement"
              >
                <Input placeholder="例：山东、河南等" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24} justify="center">
            <Col span={8}>
              <Form.Item
                label="学历要求 (可选)"
                name="educationRequirement"
              >
                <Select placeholder="请选择学历要求" style={{ width: '100%' }}>
                  {EDUCATION_REQUIREMENTS.map(education => (
                    <Option key={education} value={education}>{education}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 备注信息区域 */}
          <Divider orientation="left">备注信息</Divider>
          <Row gutter={24} justify="center">
            <Col span={24}>
              <Form.Item
                label="备注 (可选)"
                name="remarks"
              >
                <TextArea 
                  placeholder="请输入备注信息..." 
                  rows={4}
                  showCount
                  maxLength={1000}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 提交按钮 */}
          <Divider />
          <Row justify="center">
            <Col>
              <Space size="large">
                <Button size="large" onClick={handleBack}>
                  取消
                </Button>
                <Button 
                  type="primary" 
                  size="large" 
                  htmlType="submit" 
                  loading={loading}
                  icon={<SaveOutlined />}
                >
                  保存修改
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default EditCustomer; 