import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  InputNumber,
  message,
  Card,
  Result,
  Spin,
} from 'antd';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { trainingLeadService } from '../../services/trainingLeadService';
import {
  LEAD_LEVEL_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  TRAINING_TYPE_OPTIONS,
  INTENDED_COURSES_OPTIONS,
  INTENTION_LEVEL_OPTIONS
} from '../../types/training-lead.types';
import './PublicForm.css';

const { TextArea } = Input;
const { Option } = Select;

const PublicTrainingLeadForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError(true);
    }
  }, [token]);

  const handleSubmit = async (values: any) => {
    if (!token) {
      message.error('缺少分享令牌');
      return;
    }

    setSubmitting(true);
    try {
      // 处理日期字段
      const submitData = {
        ...values,
        expectedStartDate: values.expectedStartDate 
          ? dayjs(values.expectedStartDate).format('YYYY-MM-DD')
          : undefined
      };

      await trainingLeadService.submitPublicForm(token, submitData);
      setSubmitted(true);
      message.success('提交成功！我们会尽快与您联系。');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || '提交失败，请重试';
      message.error(errorMsg);
      
      // 如果是令牌错误，显示错误状态
      if (errorMsg.includes('令牌') || errorMsg.includes('token') || errorMsg.includes('过期')) {
        setTokenError(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenError) {
    return (
      <div className="public-form-container">
        <Result
          status="error"
          title="链接无效或已过期"
          subTitle="请联系工作人员获取新的分享链接"
        />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="public-form-container">
        <Result
          status="success"
          title="提交成功！"
          subTitle="感谢您的报名，我们会尽快与您联系。"
        />
      </div>
    );
  }

  return (
    <div className="public-form-container">
      <div className="public-form-wrapper">
        <Card className="public-form-card">
          <div className="public-form-header">
            <h1 className="public-form-title">培训报名表</h1>
            <p className="public-form-description">请填写您的基本信息，我们会尽快与您联系</p>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="public-form"
          >
            <Form.Item
              label="姓名"
              name="name"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="请输入您的姓名" size="large" />
            </Form.Item>

            <Form.Item
              label="手机号"
              name="phone"
              rules={[
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
              ]}
            >
              <Input placeholder="请输入手机号" maxLength={11} size="large" />
            </Form.Item>

            <Form.Item
              label="微信号"
              name="wechatId"
            >
              <Input placeholder="请输入微信号" size="large" />
            </Form.Item>

            <Form.Item
              label="客户分级"
              name="leadLevel"
              rules={[{ required: true, message: '请选择客户分级' }]}
              initialValue="C类"
            >
              <Select placeholder="请选择客户分级" size="large">
                {LEAD_LEVEL_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="线索来源"
              name="leadSource"
            >
              <Select placeholder="请选择线索来源" size="large" allowClear>
                {LEAD_SOURCE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="培训类型"
              name="trainingType"
            >
              <Select placeholder="请选择培训类型" size="large" allowClear>
                {TRAINING_TYPE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="意向课程"
              name="intendedCourses"
            >
              <Select
                mode="multiple"
                placeholder="请选择意向课程（可多选）"
                size="large"
                allowClear
              >
                {INTENDED_COURSES_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="意向程度"
              name="intentionLevel"
            >
              <Select placeholder="请选择意向程度" size="large" allowClear>
                {INTENTION_LEVEL_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="期望开始日期"
              name="expectedStartDate"
            >
              <DatePicker style={{ width: '100%' }} size="large" placeholder="请选择期望开始日期" />
            </Form.Item>

            <Form.Item
              label="预算（元）"
              name="budget"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入预算金额"
                min={0}
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="地址"
              name="address"
            >
              <Input placeholder="请输入地址" size="large" />
            </Form.Item>

            <Form.Item
              label="备注"
              name="remarks"
            >
              <TextArea rows={4} placeholder="请输入备注信息" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                block
                size="large"
                className="public-form-submit"
              >
                提交报名
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default PublicTrainingLeadForm;

