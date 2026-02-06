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
  Spin
} from 'antd';
import { SaveOutlined, RollbackOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { trainingLeadService } from '../../services/trainingLeadService';
import {
  UpdateTrainingLeadDto,
  LEAD_LEVEL_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  TRAINING_TYPE_OPTIONS,
  INTENDED_COURSES_OPTIONS,
  INTENTION_LEVEL_OPTIONS
} from '../../types/training-lead.types';

const { Option } = Select;
const { TextArea } = Input;

const EditTrainingLead: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // 加载线索数据
  useEffect(() => {
    const fetchLead = async () => {
      if (!id) return;
      
      setFetching(true);
      try {
        const lead = await trainingLeadService.getTrainingLeadById(id);
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
    <div style={{ padding: '24px' }}>
      <Card title="编辑培训线索">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={24}>
            {/* 基本信息 */}
            <Col span={24}>
              <h3 style={{ marginBottom: 16 }}>基本信息</h3>
            </Col>

            <Col span={8}>
              <Form.Item
                label="客户姓名"
                name="name"
                rules={[
                  { required: true, message: '请输入客户姓名' },
                  { max: 50, message: '客户姓名不能超过50个字符' }
                ]}
              >
                <Input placeholder="请输入客户姓名" />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="手机号"
                name="phone"
                rules={[
                  { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }
                ]}
              >
                <Input placeholder="与微信号二选一" />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="微信号"
                name="wechatId"
                rules={[
                  { max: 50, message: '微信号不能超过50个字符' }
                ]}
              >
                <Input placeholder="与手机号二选一" />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="客户分级"
                name="leadLevel"
                rules={[{ required: true, message: '请选择客户分级' }]}
              >
                <Select placeholder="请选择客户分级">
                  {LEAD_LEVEL_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* 培训信息 */}
            <Col span={24}>
              <h3 style={{ marginTop: 16, marginBottom: 16 }}>培训信息</h3>
            </Col>

            <Col span={8}>
              <Form.Item label="培训类型" name="trainingType">
                <Select placeholder="请选择培训类型" allowClear>
                  {TRAINING_TYPE_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={16}>
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

            <Col span={8}>
              <Form.Item label="意向程度" name="intentionLevel">
                <Select placeholder="请选择意向程度" allowClear>
                  {INTENTION_LEVEL_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item label="期望开课时间" name="expectedStartDate">
                <DatePicker style={{ width: '100%' }} placeholder="请选择期望开课时间" />
              </Form.Item>
            </Col>

            <Col span={8}>
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

            {/* 其他信息 */}
            <Col span={24}>
              <h3 style={{ marginTop: 16, marginBottom: 16 }}>其他信息</h3>
            </Col>

            <Col span={8}>
              <Form.Item label="线索来源" name="leadSource">
                <Select placeholder="请选择线索来源" allowClear>
                  {LEAD_SOURCE_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={16}>
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

            <Col span={24}>
              <Form.Item
                label="备注信息"
                name="remarks"
                rules={[
                  { max: 500, message: '备注信息不能超过500个字符' }
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="请输入备注信息"
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </Col>

            {/* 按钮 */}
            <Col span={24}>
              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={loading}
                  >
                    保存
                  </Button>
                  <Button
                    icon={<RollbackOutlined />}
                    onClick={() => navigate('/training-leads')}
                  >
                    返回
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default EditTrainingLead;

