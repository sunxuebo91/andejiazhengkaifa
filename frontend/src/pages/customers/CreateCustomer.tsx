import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import {
  CreateCustomerData,
  LEAD_SOURCES,
  SERVICE_CATEGORIES,
  LEAD_LEVELS,
  REST_SCHEDULES,
} from '../../types/customer.types';
import dayjs from 'dayjs';

const { Option } = Select;

const CreateCustomer: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const formattedData: CreateCustomerData = {
        ...values,
        expectedStartDate: values.expectedStartDate.format('YYYY-MM-DD'),
        expectedDeliveryDate: values.expectedDeliveryDate 
          ? values.expectedDeliveryDate.format('YYYY-MM-DD') 
          : undefined,
      };

      await customerService.createCustomer(formattedData);
      message.success('客户创建成功！');
      navigate('/customers');
    } catch (error: any) {
      message.error(error?.response?.data?.message || '客户创建失败');
      console.error('创建客户错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/customers');
  };

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
            创建客户
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: '800px' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="客户姓名"
                name="name"
                rules={[
                  { required: true, message: '请输入客户姓名' },
                  { min: 2, message: '姓名至少2个字符' },
                  { max: 20, message: '姓名不能超过20个字符' },
                ]}
              >
                <Input placeholder="请输入客户姓名" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="客户电话"
                name="phone"
                rules={[
                  { required: true, message: '请输入客户电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' },
                ]}
              >
                <Input placeholder="请输入客户电话" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="线索来源"
                name="leadSource"
                rules={[{ required: true, message: '请选择线索来源' }]}
              >
                <Select placeholder="请选择线索来源">
                  {LEAD_SOURCES.map(source => (
                    <Option key={source} value={source}>{source}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="线索等级"
                name="leadLevel"
                rules={[{ required: true, message: '请选择线索等级' }]}
              >
                <Select placeholder="请选择线索等级">
                  {LEAD_LEVELS.map(level => (
                    <Option key={level} value={level}>{level}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="需求品类"
                name="serviceCategory"
                rules={[{ required: true, message: '请选择需求品类' }]}
              >
                <Select placeholder="请选择需求品类">
                  {SERVICE_CATEGORIES.map(category => (
                    <Option key={category} value={category}>{category}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="薪资预算（元）"
                name="salaryBudget"
                rules={[
                  { required: true, message: '请输入薪资预算' },
                  { type: 'number', min: 1000, message: '薪资预算不能低于1000元' },
                  { type: 'number', max: 50000, message: '薪资预算不能高于50000元' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入薪资预算"
                  min={1000}
                  max={50000}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="期望上户日期"
                name="expectedStartDate"
                rules={[{ required: true, message: '请选择期望上户日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择期望上户日期"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="预产期"
                name="expectedDeliveryDate"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择预产期（可选）"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="家庭面积（平方米）"
                name="homeArea"
                rules={[
                  { required: true, message: '请输入家庭面积' },
                  { type: 'number', min: 10, message: '家庭面积不能小于10平方米' },
                  { type: 'number', max: 1000, message: '家庭面积不能大于1000平方米' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入家庭面积"
                  min={10}
                  max={1000}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="家庭人口（人）"
                name="familySize"
                rules={[
                  { required: true, message: '请输入家庭人口' },
                  { type: 'number', min: 1, message: '家庭人口不能少于1人' },
                  { type: 'number', max: 20, message: '家庭人口不能超过20人' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入家庭人口"
                  min={1}
                  max={20}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="休息方式"
                name="restSchedule"
                rules={[{ required: true, message: '请选择休息方式' }]}
              >
                <Select placeholder="请选择休息方式">
                  {REST_SCHEDULES.map(schedule => (
                    <Option key={schedule} value={schedule}>{schedule}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                label="客户地址"
                name="address"
                rules={[
                  { required: true, message: '请输入客户地址' },
                  { min: 5, message: '地址至少5个字符' },
                  { max: 200, message: '地址不能超过200个字符' },
                ]}
              >
                <Input placeholder="请输入详细地址" />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="年龄要求"
                name="ageRequirement"
              >
                <Input placeholder="如：25-45岁" />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="性别要求"
                name="genderRequirement"
              >
                <Select placeholder="请选择性别要求" allowClear>
                  <Option value="女">女</Option>
                  <Option value="男">男</Option>
                  <Option value="不限">不限</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="籍贯要求"
                name="originRequirement"
              >
                <Input placeholder="如：四川、湖南等" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: '32px' }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<SaveOutlined />}
                size="large"
              >
                创建客户
              </Button>
              <Button
                onClick={handleBack}
                size="large"
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateCustomer; 