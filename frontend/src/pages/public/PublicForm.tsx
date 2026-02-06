import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Radio,
  Checkbox,
  Select,
  DatePicker,
  message,
  Card,
  Space,
  Result,
  Spin,
} from 'antd';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import './PublicForm.css';

const { TextArea } = Input;
const { Option } = Select;

interface FieldOption {
  value: string;
  label: string;
}

interface FormField {
  _id: string;
  label: string;
  fieldName: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  options?: FieldOption[];
}

interface PublicFormConfig {
  id: string;
  title: string;
  description?: string;
  bannerUrl?: string;
  successMessage: string;
  fields: FormField[];
}

const PublicForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formConfig, setFormConfig] = useState<PublicFormConfig | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    fetchFormConfig();
  }, [id]);

  const fetchFormConfig = async () => {
    setLoading(true);
    try {
      console.log('Fetching form config for id:', id);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || '/api'}/forms/public/${id}`);
      console.log('Form config response:', response.data);

      // 处理后端返回的数据结构：{success: true, data: {...}}
      const formData = response.data.data || response.data;
      console.log('Form data:', formData);
      console.log('Fields:', formData.fields);
      console.log('Fields type:', typeof formData.fields);
      console.log('Fields is array:', Array.isArray(formData.fields));

      setFormConfig(formData);
    } catch (error: any) {
      console.error('Failed to fetch form config:', error);
      message.error(error.response?.data?.message || '获取表单失败');
    } finally {
      setLoading(false);
    }
  };

  const generateDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint', 2, 2);
    }
    const canvasData = canvas.toDataURL();
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvasData.substring(0, 100),
    };

    return btoa(JSON.stringify(fingerprint));
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      // 处理日期字段
      const processedData: Record<string, any> = {};
      formConfig?.fields.forEach((field) => {
        const value = values[field.fieldName];
        if (field.fieldType === 'date' && value) {
          processedData[field.fieldName] = dayjs(value).format('YYYY-MM-DD');
        } else {
          processedData[field.fieldName] = value;
        }
      });

      const submitData = {
        data: processedData,
        deviceFingerprint: generateDeviceFingerprint(),
        source: 'h5',
        token: token || undefined,
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || '/api'}/forms/public/${id}/submit`,
        submitData
      );

      setSuccessMessage(response.data.message || formConfig?.successMessage || '提交成功！');
      setSubmitted(true);
    } catch (error: any) {
      message.error(error.response?.data?.message || '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 检查手机号是否重复
  const checkPhoneDuplicate = async (phone: string) => {
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return; // 手机号格式不正确，不检查
    }

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || '/api'}/forms/public/${id}/check-phone`,
        { params: { phone } }
      );

      if (response.data.isDuplicate) {
        return Promise.reject(new Error('该手机号已提交过此表单'));
      }
    } catch (error: any) {
      if (error.message === '该手机号已提交过此表单') {
        throw error;
      }
      // 其他错误不影响提交
      console.error('检查手机号失败:', error);
    }
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      placeholder: field.placeholder,
    };

    switch (field.fieldType) {
      case 'text':
        return <Input {...commonProps} />;

      case 'textarea':
        return <TextArea rows={4} {...commonProps} />;

      case 'phone':
        return <Input {...commonProps} maxLength={11} />;

      case 'email':
        return <Input {...commonProps} type="email" />;
      
      case 'date':
        return <DatePicker style={{ width: '100%' }} />;
      
      case 'radio':
        return (
          <Radio.Group>
            <Space direction="vertical">
              {field.options?.map((option) => (
                <Radio key={option.value} value={option.value}>
                  {option.label}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        );

      case 'checkbox':
        return (
          <Checkbox.Group>
            <Space direction="vertical">
              {field.options?.map((option) => (
                <Checkbox key={option.value} value={option.value}>
                  {option.label}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        );

      case 'select':
        return (
          <Select {...commonProps} placeholder="请点击选择">
            {field.options?.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );

      default:
        return <Input {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <div className="public-form-container">
        <div className="public-form-loading">
          <Spin size="large" tip="加载中..." />
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="public-form-container">
        <Result
          status="success"
          title="提交成功！"
          subTitle={successMessage}
        />
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="public-form-container">
        <Result
          status="404"
          title="表单不存在"
          subTitle="该表单可能已被删除或不存在"
        />
      </div>
    );
  }

  return (
    <div className="public-form-container">
      <div className="public-form-wrapper">
        {formConfig.bannerUrl && (
          <div className="public-form-banner">
            <img src={formConfig.bannerUrl} alt="banner" />
          </div>
        )}

        <Card className="public-form-card">
          <div className="public-form-header">
            <h1 className="public-form-title">{formConfig.title}</h1>
            {formConfig.description && (
              <p className="public-form-description">{formConfig.description}</p>
            )}
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="public-form"
          >
            {formConfig.fields && formConfig.fields.length > 0 ? (
              formConfig.fields.map((field) => (
                <Form.Item
                  key={field._id}
                  label={field.label}
                  name={field.fieldName}
                  rules={[
                    {
                      required: field.required,
                      message: `请输入${field.label}`,
                    },
                    field.fieldType === 'phone'
                      ? {
                          pattern: /^1[3-9]\d{9}$/,
                          message: '请输入正确的手机号',
                        }
                      : {},
                    field.fieldType === 'email'
                      ? {
                          type: 'email',
                          message: '请输入正确的邮箱地址',
                        }
                      : {},
                    field.fieldType === 'phone'
                      ? {
                          validator: async (_, value) => {
                            if (value) {
                              await checkPhoneDuplicate(value);
                            }
                          },
                        }
                      : {},
                  ]}
                  validateTrigger={field.fieldType === 'phone' ? ['onBlur', 'onChange'] : 'onChange'}
                >
                  {renderField(field)}
                </Form.Item>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ color: '#999' }}>该表单暂无字段</p>
              </div>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                block
                size="large"
                className="public-form-submit"
              >
                提交
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default PublicForm;

