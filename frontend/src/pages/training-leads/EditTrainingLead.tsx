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
  Spin,
  Switch,
  Divider,
  Tag
} from 'antd';
import { SaveOutlined, RollbackOutlined, UserOutlined, BookOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { trainingLeadService } from '../../services/trainingLeadService';
import apiService from '../../services/api';
import {
  UpdateTrainingLeadDto,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_STATUS_MANUAL_OPTIONS,
  TRAINING_TYPE_OPTIONS,
  INTENDED_COURSES_OPTIONS,
  INTENTION_LEVEL_OPTIONS,
  LEAD_GRADE_OPTIONS
} from '../../types/training-lead.types';
import { useAuth } from '../../contexts/AuthContext';

const { Option } = Select;
const { TextArea } = Input;

const EditTrainingLead: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [leadStatus, setLeadStatus] = useState<string | null>(null);
  const canViewUsers = hasPermission('user:view');

  // 加载用户列表
  useEffect(() => {
    if (!canViewUsers) {
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await apiService.get('/api/users', { page: 1, pageSize: 1000 });
        if (response.success && response.data) {
          setUsers(response.data.items || []);
        }
      } catch (error: any) {
        console.error('获取用户列表失败:', error);
      }
    };
    fetchUsers();
  }, [canViewUsers]);

  // 加载线索数据
  useEffect(() => {
    const fetchLead = async () => {
      if (!id) return;
      
      setFetching(true);
      try {
        const lead = await trainingLeadService.getTrainingLeadById(id);
        setLeadStatus((lead as any).leadStatus || lead.followUpStatus || null);
        form.setFieldsValue({
          ...lead,
          expectedStartDate: lead.expectedStartDate ? dayjs(lead.expectedStartDate) : undefined
        });
      } catch (error: any) {
        message.error(error?.response?.data?.message || '获取线索信息失败');
        navigate('/training-leads');
      } finally {
        setFetching(false);
      }
    };

    fetchLead();
  }, [id]);

  const handleSubmit = async (values: any) => {
    if (!id) return;

    setLoading(true);
    try {
      // 验证手机号和微信号至少填一个
      if (!values.phone && !values.wechatId) {
        message.error('手机号和微信号至少填写一个');
        setLoading(false);
        return;
      }

      const data: UpdateTrainingLeadDto = {
        ...values,
        expectedStartDate: values.expectedStartDate
          ? values.expectedStartDate.format('YYYY-MM-DD')
          : undefined
      };

      await trainingLeadService.updateTrainingLead(id, data);
      message.success('培训线索更新成功');
      navigate('/training-leads');
    } catch (error: any) {
      message.error(error?.response?.data?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>编辑学员信息</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<RollbackOutlined />}
              onClick={() => navigate('/training-leads')}
            >
              返回列表
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {/* 基本信息 */}
          <div style={{ marginBottom: '24px' }}>
            <Divider orientation="left">
              <Space>
                <UserOutlined style={{ color: '#1890ff' }} />
                <span style={{ fontSize: '16px', fontWeight: 500 }}>基本信息</span>
              </Space>
            </Divider>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="客户姓名"
                  name="name"
                  rules={[
                    { required: true, message: '请输入客户姓名' },
                    { max: 50, message: '客户姓名不能超过50个字符' }
                  ]}
                >
                  <Input placeholder="请输入客户姓名" prefix={<UserOutlined />} />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="性别" name="gender">
                  <Select placeholder="请选择性别" allowClear>
                    <Option value="男">男</Option>
                    <Option value="女">女</Option>
                    <Option value="其他">其他</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="年龄" name="age">
                  <InputNumber style={{ width: '100%' }} placeholder="请输入年龄" min={0} max={120} precision={0} />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="电话号码"
                  name="phone"
                  rules={[
                    { required: true, message: '请输入手机号' },
                    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }
                  ]}
                >
                  <Input placeholder="请输入手机号" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="微信"
                  name="wechatId"
                  rules={[
                    { max: 50, message: '微信号不能超过50个字符' }
                  ]}
                >
                  <Input placeholder="请输入微信号" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="咨询职位" name="consultPosition">
                  <Select placeholder="请选择咨询职位" allowClear>
                    <Option value="育婴师">育婴师</Option>
                    <Option value="母婴护理师">母婴护理师</Option>
                    <Option value="养老护理员">养老护理员</Option>
                    <Option value="住家保姆">住家保姆</Option>
                    <Option value="其他">其他</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="身份证号"
                  name="idCardNumber"
                  rules={[
                    { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '身份证号格式不正确' }
                  ]}
                >
                  <Input placeholder="请输入身份证号" maxLength={18} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* 状态 & 培训信息 */}
          <div style={{ marginBottom: '24px' }}>
            <Divider orientation="left">
              <Space>
                <BookOutlined style={{ color: '#52c41a' }} />
                <span style={{ fontSize: '16px', fontWeight: 500 }}>状态 & 培训信息</span>
              </Space>
            </Divider>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="线索状态" name="status">
                  <Select placeholder="请选择状态" allowClear>
                    {LEAD_STATUS_MANUAL_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="意向程度" name="intentionLevel">
                  <Select placeholder="请选择意向程度" allowClear>
                    {INTENTION_LEVEL_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="线索等级" name="leadGrade">
                  <Select placeholder="请选择线索等级" allowClear>
                    {LEAD_GRADE_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="培训类型" name="trainingType">
                  <Select placeholder="请选择培训类型" allowClear>
                    {TRAINING_TYPE_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="期望开课时间" name="expectedStartDate">
                  <DatePicker style={{ width: '100%' }} placeholder="请选择期望开课时间" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="当前状态">
                  {leadStatus && (
                    <Tag
                      color={LEAD_STATUS_OPTIONS.find(o => o.value === leadStatus)?.color || '#8c8c8c'}
                      style={{ fontSize: '14px', padding: '4px 12px', lineHeight: '22px' }}
                    >
                      {leadStatus}
                    </Tag>
                  )}
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="意向课程" name="intendedCourses">
                  <Select
                    mode="multiple"
                    placeholder="请选择意向课程（可多选）"
                    allowClear
                    maxTagCount="responsive"
                  >
                    {INTENDED_COURSES_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="已报证书" name="reportedCertificates">
                  <Select
                    mode="multiple"
                    placeholder="请选择已报证书（可多选）"
                    allowClear
                    maxTagCount="responsive"
                  >
                    {INTENDED_COURSES_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="预算金额"
                  name="budget"
                  rules={[
                    { type: 'number', min: 0, message: '预算金额不能为负数' }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="请输入预算金额"
                    min={0}
                    precision={0}
                    addonAfter="元"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="报课金额"
                  name="courseAmount"
                  rules={[
                    { type: 'number', min: 0, message: '报课金额不能为负数' }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="请输入报课金额"
                    min={0}
                    precision={0}
                    addonAfter="元"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="服务费金额"
                  name="serviceFeeAmount"
                  rules={[
                    { type: 'number', min: 0, message: '服务费金额不能为负数' }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="请输入服务费金额"
                    min={0}
                    precision={0}
                    addonAfter="元"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="网课"
                  name="isOnlineCourse"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* 其他信息 */}
          <div style={{ marginBottom: '24px' }}>
            <Divider orientation="left">
              <Space>
                <InfoCircleOutlined style={{ color: '#faad14' }} />
                <span style={{ fontSize: '16px', fontWeight: 500 }}>其他信息</span>
              </Space>
            </Divider>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="线索来源" name="leadSource">
                  <Select placeholder="请选择线索来源" allowClear>
                    {LEAD_SOURCE_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="是否报征"
                  name="isReported"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  label="所在地区"
                  name="address"
                  rules={[
                    { max: 100, message: '所在地区不能超过100个字符' }
                  ]}
                >
                  <Input placeholder="请输入所在地区" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  label="备注信息"
                  name="remarks"
                  rules={[
                    { max: 500, message: '备注信息不能超过500个字符' }
                  ]}
                >
                  <TextArea
                    rows={3}
                    placeholder="请输入备注信息"
                    showCount
                    maxLength={500}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* 按钮区域 */}
          <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Space size="large">
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                size="large"
              >
                保存
              </Button>
              <Button
                icon={<RollbackOutlined />}
                onClick={() => navigate('/training-leads')}
                size="large"
              >
                取消
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default EditTrainingLead;
