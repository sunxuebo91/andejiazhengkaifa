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
  Divider,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import {
  CreateCustomerData,
  LEAD_SOURCES,
  SERVICE_CATEGORIES,
  LEAD_LEVELS,
  REST_SCHEDULES,
  CONTRACT_STATUSES,
  EDUCATION_REQUIREMENTS,
} from '../../types/customer.types';
import dayjs from 'dayjs';
import { customerService as cs } from '../../services/customerService';

const { Option } = Select;
const { TextArea } = Input;

const CreateCustomer: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [assignableUsers, setAssignableUsers] = useState<Array<{ _id: string; name: string; username: string; role: string }>>([]);

  // 加载可分配用户（创建时可指定负责人）
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const list = await cs.getAssignableUsers();
        setAssignableUsers(list || []);
      } catch (e) {
        // 静默失败，不影响创建流程
      }
    };
    fetchUsers();
  }, []);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const formattedData: CreateCustomerData = {
        ...values,
        expectedStartDate: values.expectedStartDate
          ? values.expectedStartDate.format('YYYY-MM-DD')
          : undefined,
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
            创建客户
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
                label="微信号"
                name="wechatId"
              >
                <Input placeholder="请输入微信号（可选）" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="身份证号"
                name="idCardNumber"
                rules={[
                  {
                    pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
                    message: '请输入有效的身份证号码'
                  },
                ]}
              >
                <Input placeholder="请输入身份证号（可选）" style={{ width: '100%' }} />
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
            {/* 指定负责人（可选） */}
            <Col span={8}>
              <Form.Item label="指定负责人（可选）" name="assignedTo">
                <Select allowClear placeholder="请选择负责人">
                  {assignableUsers.map(u => (
                    <Option key={u._id} value={u._id}>{u.name || u.username} ({u.role})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 分配信息行 - 靠左对齐 */}
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="分配备注（可选）" name="assignmentReason">
                <Input placeholder="请输入分配原因或备注" />
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
                label="需求品类"
                name="serviceCategory"
              >
                <Select placeholder="请选择需求品类（可选）" style={{ width: '100%' }}>
                  {SERVICE_CATEGORIES.map(category => (
                    <Option key={category} value={category}>{category}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="线索等级"
                name="leadLevel"
              >
                <Select placeholder="请选择线索等级（可选）" style={{ width: '100%' }}>
                  {LEAD_LEVELS.map(level => (
                    <Option key={level} value={level}>{level}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="薪资预算（元）"
                name="salaryBudget"
                rules={[
                  { type: 'number', min: 1000, message: '薪资预算不能低于1000元' },
                  { type: 'number', max: 50000, message: '薪资预算不能高于50000元' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入薪资预算（可选）"
                  min={1000}
                  max={50000}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="期望上户日期"
                name="expectedStartDate"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择期望上户日期（可选）"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
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

            <Col span={8}>
              <Form.Item
                label="休息方式"
                name="restSchedule"
              >
                <Select placeholder="请选择休息方式（可选）" style={{ width: '100%' }}>
                  {REST_SCHEDULES.map(schedule => (
                    <Option key={schedule} value={schedule}>{schedule}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 家庭信息区域 */}
          <Divider orientation="left">家庭信息</Divider>
          <Row gutter={24} justify="center">
            <Col span={8}>
              <Form.Item
                label="家庭面积（平方米）"
                name="homeArea"
                rules={[
                  { type: 'number', min: 10, message: '家庭面积不能小于10平方米' },
                  { type: 'number', max: 1000, message: '家庭面积不能大于1000平方米' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入家庭面积（可选）"
                  min={10}
                  max={1000}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="家庭人口（人）"
                name="familySize"
                rules={[
                  { type: 'number', min: 1, message: '家庭人口不能少于1人' },
                  { type: 'number', max: 20, message: '家庭人口不能超过20人' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入家庭人口（可选）"
                  min={1}
                  max={20}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="客户地址"
                name="address"
                rules={[
                  { min: 5, message: '地址至少5个字符' },
                  { max: 200, message: '地址不能超过200个字符' },
                ]}
              >
                <Input placeholder="请输入详细地址（可选）" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 需求要求区域 */}
          <Divider orientation="left">需求要求</Divider>
          <Row gutter={24} justify="center">
            <Col span={8}>
              <Form.Item
                label="年龄要求"
                name="ageRequirement"
              >
                <Input placeholder="如：25-45岁（可选）" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="性别要求"
                name="genderRequirement"
              >
                <Select placeholder="请选择性别要求（可选）" allowClear style={{ width: '100%' }}>
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
                <Input placeholder="如：四川、湖南等（可选）" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                label="学历要求"
                name="educationRequirement"
              >
                <Select placeholder="请选择学历要求（可选）" allowClear style={{ width: '100%' }}>
                  {EDUCATION_REQUIREMENTS.map(education => (
                    <Option key={education} value={education}>{education}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 备注区域 */}
          <Divider orientation="left">备注信息</Divider>
          <Row gutter={24} justify="center">
            <Col span={12}>
              <Form.Item
                label="成交金额"
                name="dealAmount"
                rules={[
                  {
                    type: 'number',
                    min: 0,
                    max: 10000000,
                    message: '成交金额必须在0-10000000之间',
                  },
                ]}
              >
                <InputNumber
                  placeholder="请输入成交金额（可选）"
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="¥"
                  formatter={(value: any) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value: any) => {
                    const parsed = parseFloat(value!.replace(/¥\s?|(,*)/g, ''));
                    return isNaN(parsed) ? 0 : parsed;
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="备注"
                name="remarks"
              >
                <TextArea
                  rows={4}
                  placeholder="请输入备注信息（可选）"
                  style={{ width: '100%' }}
                  maxLength={500}
                  showCount
                />
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