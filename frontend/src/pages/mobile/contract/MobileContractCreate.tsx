import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Steps,
  Select,
  message,
  Spin,
  Result,
  Space,
  Alert,
  Divider,
  Tag,
  Card
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  IdcardOutlined,
  HomeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CopyOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import MobileLayout from './MobileLayout';
import { apiService } from '../../../services/api';
import './mobile.css';

const { TextArea } = Input;
const { Option } = Select;

// 服务类型选项
const SERVICE_TYPE_OPTIONS = [
  '月嫂', '住家育儿嫂', '保洁', '住家保姆', 
  '养宠', '小时工', '白班育儿', '白班保姆', '住家护老'
];

interface TemplateField {
  key: string;
  label: string;
  type: number;
  required: boolean;
}

interface Template {
  templateNo: string;
  templateName: string;
  fields?: TemplateField[];
}

const MobileContractCreate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // 表单实例
  const [partyForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  
  // 数据状态
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  
  // 结果状态
  const [createResult, setCreateResult] = useState<{
    success: boolean;
    contractId?: string;
    contractNumber?: string;
    signUrls?: { role: string; signUrl: string }[];
    message?: string;
  } | null>(null);

  // 步骤配置
  const steps = [
    { title: '甲乙方信息', description: '填写双方信息' },
    { title: '选择模板', description: '选择合同模板' },
    { title: '填写合同', description: '填写合同参数' },
    { title: '完成', description: '获取签署链接' }
  ];

  // 获取模板列表
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setTemplateLoading(true);
    try {
      const response = await apiService.get('/api/esign/templates');
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error('获取模板列表失败:', error);
      message.error('获取模板列表失败');
    } finally {
      setTemplateLoading(false);
    }
  };

  // 获取模板字段
  const fetchTemplateFields = async (templateNo: string) => {
    setTemplateLoading(true);
    try {
      const response: any = await apiService.post('/api/esign/template/data', {
        templateIdent: templateNo
      });
      // 爱签API桥接返回的是 code: 100000，CRM API返回的是 success: true
      const isSuccess = response.code === 100000 || response.success;
      const fieldData = response.data;

      if (isSuccess && fieldData) {
        const template = templates.find(t => t.templateNo === templateNo);
        if (template) {
          setSelectedTemplate({
            ...template,
            fields: Array.isArray(fieldData) ? fieldData : []
          });
        }
      }
    } catch (error) {
      console.error('获取模板字段失败:', error);
      message.error('获取模板字段失败');
    } finally {
      setTemplateLoading(false);
    }
  };

  // 下一步
  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await partyForm.validateFields();
      } else if (currentStep === 1) {
        if (!selectedTemplate) {
          message.warning('请选择合同模板');
          return;
        }
      } else if (currentStep === 2) {
        await templateForm.validateFields();
        // 提交合同
        await handleSubmit();
        return;
      }
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 上一步
  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  // 提交合同
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const partyData = partyForm.getFieldsValue();
      const templateData = templateForm.getFieldsValue();
      
      // 构建请求数据
      const requestData = {
        templateNo: selectedTemplate?.templateNo,
        customerName: partyData.partyAName,
        customerPhone: partyData.partyAMobile,
        customerIdCard: partyData.partyAIdCard,
        customerAddress: partyData.partyAAddress,
        workerName: partyData.partyBName,
        workerPhone: partyData.partyBMobile,
        workerIdCard: partyData.partyBIdCard,
        workerAddress: partyData.partyBAddress,
        contractType: partyData.contractType,
        ...templateData
      };

      console.log('📤 提交合同数据:', requestData);

      const response = await apiService.post('/api/contracts/miniprogram/create', requestData);

      if (response.success) {
        // 解析签署链接
        let signUrls: { role: string; signUrl: string }[] = [];
        if (response.data?.esignSignUrls) {
          try {
            const parsed = JSON.parse(response.data.esignSignUrls);
            if (Array.isArray(parsed)) {
              signUrls = parsed;
            }
          } catch (e) {
            console.error('解析签署链接失败:', e);
          }
        }

        setCreateResult({
          success: true,
          contractId: response.data?._id,
          contractNumber: response.data?.contractNumber,
          signUrls,
          message: '合同创建成功'
        });
        setCurrentStep(3);
        message.success('合同创建成功！');
      } else {
        setCreateResult({
          success: false,
          message: response.message || '合同创建失败'
        });
        message.error(response.message || '合同创建失败');
      }
    } catch (error: any) {
      console.error('提交合同失败:', error);
      setCreateResult({
        success: false,
        message: error.message || '提交失败，请重试'
      });
      message.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 复制链接
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('链接已复制');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 渲染步骤1：甲乙方信息
  const renderStep1 = () => (
    <div className="mobile-card">
      <div className="mobile-card-title">
        <UserOutlined style={{ marginRight: 8 }} />
        甲乙双方信息
      </div>
      <Form
        form={partyForm}
        layout="vertical"
        className="mobile-form"
      >
        {/* 甲方（客户）信息 */}
        <Alert
          type="info"
          message="甲方信息（客户）"
          style={{ marginBottom: 16 }}
          showIcon
        />
        <Form.Item
          name="partyAName"
          label="客户姓名"
          rules={[{ required: true, message: '请输入客户姓名' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="请输入客户姓名" />
        </Form.Item>
        <Form.Item
          name="partyAMobile"
          label="手机号（用户唯一识别码）"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' }
          ]}
        >
          <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" />
        </Form.Item>
        <Form.Item name="partyAIdCard" label="身份证号（可选）">
          <Input prefix={<IdcardOutlined />} placeholder="请输入身份证号" />
        </Form.Item>
        <Form.Item name="partyAAddress" label="服务地址">
          <Input prefix={<HomeOutlined />} placeholder="请输入服务地址" />
        </Form.Item>

        <Divider />

        {/* 乙方（阿姨）信息 */}
        <Alert
          type="success"
          message="乙方信息（阿姨）"
          style={{ marginBottom: 16 }}
          showIcon
        />
        <Form.Item
          name="partyBName"
          label="阿姨姓名"
          rules={[{ required: true, message: '请输入阿姨姓名' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="请输入阿姨姓名" />
        </Form.Item>
        <Form.Item
          name="partyBMobile"
          label="手机号（用户唯一识别码）"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' }
          ]}
        >
          <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" />
        </Form.Item>
        <Form.Item name="partyBIdCard" label="身份证号（可选）">
          <Input prefix={<IdcardOutlined />} placeholder="请输入身份证号" />
        </Form.Item>
        <Form.Item name="partyBAddress" label="联系地址">
          <Input prefix={<HomeOutlined />} placeholder="请输入联系地址" />
        </Form.Item>

        <Divider />

        {/* 合同类型 */}
        <Form.Item
          name="contractType"
          label="服务类型"
          rules={[{ required: true, message: '请选择服务类型' }]}
        >
          <Select placeholder="请选择服务类型">
            {SERVICE_TYPE_OPTIONS.map(type => (
              <Option key={type} value={type}>{type}</Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </div>
  );

  // 渲染步骤2：选择模板
  const renderStep2 = () => (
    <div className="mobile-card">
      <div className="mobile-card-title">
        <FileTextOutlined style={{ marginRight: 8 }} />
        选择合同模板
      </div>
      {templateLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin indicator={<LoadingOutlined spin />} />
          <p style={{ marginTop: 16, color: '#999' }}>加载模板中...</p>
        </div>
      ) : (
        <div>
          {templates.map(template => (
            <div
              key={template.templateNo}
              className={`mobile-user-card ${selectedTemplate?.templateNo === template.templateNo ? 'selected' : ''}`}
              onClick={() => {
                setSelectedTemplate(template);
                fetchTemplateFields(template.templateNo);
              }}
            >
              <div className="mobile-user-card-name">
                <FileTextOutlined style={{ marginRight: 8 }} />
                {template.templateName}
              </div>
              <div className="mobile-user-card-info">
                模板编号：{template.templateNo}
              </div>
              {selectedTemplate?.templateNo === template.templateNo && (
                <Tag color="blue" style={{ marginTop: 8 }}>已选择</Tag>
              )}
            </div>
          ))}
          {templates.length === 0 && (
            <Result
              status="warning"
              title="暂无可用模板"
              subTitle="请联系管理员配置合同模板"
            />
          )}
        </div>
      )}
    </div>
  );

  // 渲染步骤3：填写合同参数
  const renderStep3 = () => (
    <div className="mobile-card">
      <div className="mobile-card-title">
        <FileTextOutlined style={{ marginRight: 8 }} />
        填写合同参数
      </div>
      {templateLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin indicator={<LoadingOutlined spin />} />
          <p style={{ marginTop: 16, color: '#999' }}>加载字段中...</p>
        </div>
      ) : (
        <Form form={templateForm} layout="vertical" className="mobile-form">
          {selectedTemplate?.fields?.map((field: TemplateField) => (
            <Form.Item
              key={field.key}
              name={field.key}
              label={field.label || field.key}
              rules={field.required ? [{ required: true, message: `请填写${field.label || field.key}` }] : []}
            >
              {field.type === 2 ? (
                <TextArea rows={3} placeholder={`请输入${field.label || field.key}`} />
              ) : (
                <Input placeholder={`请输入${field.label || field.key}`} />
              )}
            </Form.Item>
          ))}
          {(!selectedTemplate?.fields || selectedTemplate.fields.length === 0) && (
            <Alert
              type="info"
              message="该模板无需填写额外参数"
              description="点击下一步直接提交合同"
            />
          )}
        </Form>
      )}
    </div>
  );

  // 渲染步骤4：完成
  const renderStep4 = () => (
    <div className="mobile-card">
      {createResult?.success ? (
        <Result
          status="success"
          title="合同创建成功！"
          subTitle={`合同编号：${createResult.contractNumber || '-'}`}
          extra={
            <div style={{ textAlign: 'left', width: '100%' }}>
              <Alert
                type="info"
                message="签署链接"
                description="请将以下链接发送给对应签署人进行签署"
                style={{ marginBottom: 16 }}
              />
              {createResult.signUrls && createResult.signUrls.length > 0 ? (
                createResult.signUrls.map((item, index) => (
                  <Card
                    key={index}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={
                      <Space>
                        <Tag color={item.role.includes('客户') || item.role.includes('甲方') ? 'blue' : 'green'}>
                          {item.role}
                        </Tag>
                      </Space>
                    }
                    extra={
                      <Button
                        type="link"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(item.signUrl)}
                      >
                        复制
                      </Button>
                    }
                  >
                    <div style={{
                      fontSize: 12,
                      color: '#666',
                      wordBreak: 'break-all',
                      maxHeight: 60,
                      overflow: 'hidden'
                    }}>
                      {item.signUrl}
                    </div>
                    <Button
                      type="primary"
                      block
                      style={{ marginTop: 12 }}
                      onClick={() => window.open(item.signUrl, '_blank')}
                    >
                      打开签署页面
                    </Button>
                  </Card>
                ))
              ) : (
                <Alert
                  type="warning"
                  message="暂无签署链接"
                  description="签署链接将在合同完成处理后生成，请稍后刷新查看"
                />
              )}
            </div>
          }
        />
      ) : (
        <Result
          status="error"
          title="合同创建失败"
          subTitle={createResult?.message || '请检查填写的信息后重试'}
          extra={
            <Button type="primary" onClick={() => setCurrentStep(0)}>
              返回重新填写
            </Button>
          }
        />
      )}
    </div>
  );

  // 渲染当前步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderStep1();
      case 1:
        return renderStep2();
      case 2:
        return renderStep3();
      case 3:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <MobileLayout title="创建电子合同">
      {/* 步骤条 */}
      <div className="mobile-steps">
        <Steps
          current={currentStep}
          size="small"
          items={steps.map(s => ({ title: s.title }))}
        />
      </div>

      {/* 步骤内容 */}
      {renderStepContent()}

      {/* 底部按钮 */}
      {currentStep < 3 && (
        <div className="mobile-footer">
          {currentStep > 0 && (
            <Button size="large" onClick={handlePrev} disabled={submitting}>
              上一步
            </Button>
          )}
          <Button
            type="primary"
            size="large"
            onClick={handleNext}
            loading={submitting}
            style={{ flex: currentStep === 0 ? 1 : undefined }}
          >
            {currentStep === 2 ? '提交合同' : '下一步'}
          </Button>
        </div>
      )}

      {/* 完成后的按钮 */}
      {currentStep === 3 && createResult?.success && (
        <div className="mobile-footer">
          <Button
            size="large"
            onClick={() => {
              setCurrentStep(0);
              setCreateResult(null);
              partyForm.resetFields();
              templateForm.resetFields();
              setSelectedTemplate(null);
            }}
          >
            创建新合同
          </Button>
        </div>
      )}
    </MobileLayout>
  );
};

export default MobileContractCreate;
