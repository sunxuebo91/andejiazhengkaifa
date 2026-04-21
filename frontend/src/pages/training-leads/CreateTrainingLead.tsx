import React, { useState, useEffect, useCallback } from 'react';
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
  Switch,
  Divider,
  Modal,
  Upload,
  Spin
} from 'antd';
import type { UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import {
  SaveOutlined,
  RollbackOutlined,
  UserOutlined,
  BookOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  RobotOutlined,
  ScanOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { trainingLeadService } from '../../services/trainingLeadService';
import apiService from '../../services/api';
import { ImageService } from '../../services/imageService';
import {
  CreateTrainingLeadDto,
  LEAD_SOURCE_OPTIONS,
  TRAINING_TYPE_OPTIONS,
  INTENDED_COURSES_OPTIONS,
  INTENTION_LEVEL_OPTIONS,
  LEAD_GRADE_OPTIONS
} from '../../types/training-lead.types';
import { useAuth } from '../../contexts/AuthContext';

const { Option } = Select;
const { TextArea } = Input;

const CreateTrainingLead: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const canViewUsers = hasPermission('user:view');

  // AI识别相关状态
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiImageMimeType, setAiImageMimeType] = useState<string>('image/png');
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);

  // OCR身份证识别
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // 将 AI/OCR 解析结果映射到学员线索表单字段
  const mapParsedToLead = useCallback((p: any): Record<string, any> => {
    const values: Record<string, any> = {};
    if (p.name) values.name = p.name;
    if (p.phone) values.phone = p.phone;
    if (p.wechat) values.wechatId = p.wechat;
    if (p.age) values.age = p.age;
    if (p.gender) {
      if (p.gender === 'male' || p.gender === '男') values.gender = '男';
      else if (p.gender === 'female' || p.gender === '女') values.gender = '女';
    }
    // OCR 返回 idNumber；AI 可能返回 idNumber 或 idCardNumber
    if (p.idNumber) values.idCardNumber = p.idNumber;
    if (p.idCardNumber) values.idCardNumber = p.idCardNumber;
    // 地址：优先使用当前地址，否则使用户籍地址
    if (p.currentAddress) values.address = p.currentAddress;
    else if (p.hukouAddress) values.address = p.hukouAddress;
    return values;
  }, []);

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

  // AI弹窗粘贴处理：读取剪贴板图片作为AI识别图片
  const handleAiModalPaste = useCallback((e: ClipboardEvent | React.ClipboardEvent) => {
    const clipboardData = (e as ClipboardEvent).clipboardData || (e as React.ClipboardEvent).clipboardData;
    if (!clipboardData) return;
    const items = clipboardData.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const mimeMatch = dataUrl.match(/^data:(image\/[^;]+);base64,/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const base64 = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
          setAiImage(base64);
          setAiImageMimeType(mime);
          setAiImagePreview(dataUrl);
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  }, []);

  // 弹窗打开时监听 window 级粘贴（焦点在 textarea 时也能捕获图片）
  useEffect(() => {
    if (!aiModalVisible) return;
    const listener = (e: ClipboardEvent) => handleAiModalPaste(e);
    window.addEventListener('paste', listener);
    return () => window.removeEventListener('paste', listener);
  }, [aiModalVisible, handleAiModalPaste]);

  // AI识别：文本或图片 → 表单字段
  const handleAIParse = async () => {
    const isImageMode = !!aiImage;
    if (!isImageMode) {
      const cleaned = aiText
        .replace(/\[图片\]/g, '')
        .replace(/\[表情\]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (!cleaned || cleaned.length < 10) {
        message.warning('请粘贴学员信息文本（至少10个字符）');
        return;
      }
    }
    setAiLoading(true);
    try {
      let res: any;
      if (isImageMode) {
        res = await apiService.post('/api/ai/parse-resume-image', {
          image: aiImage,
          mimeType: aiImageMimeType,
        });
      } else {
        const cleaned = aiText
          .replace(/\[图片\]/g, '')
          .replace(/\[表情\]/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        res = await apiService.post('/api/ai/parse-resume', { text: cleaned });
      }
      if (!res.success || !res.data) {
        message.error(res.message || 'AI识别失败');
        return;
      }
      const formValues = mapParsedToLead(res.data);
      const filled = Object.keys(formValues).length;
      if (filled === 0) {
        message.warning('未从内容中识别到学员信息');
        return;
      }
      form.setFieldsValue(formValues);
      message.success(`AI识别完成，已填充 ${filled} 个字段`);
      setAiModalVisible(false);
      setAiText('');
      setAiImage(null);
      setAiImagePreview(null);
      setAiImageMimeType('image/png');
    } catch (err: any) {
      message.error(err?.message || 'AI识别请求失败');
    } finally {
      setAiLoading(false);
    }
  };

  // OCR身份证识别：上传身份证正面 → 填充姓名/性别/身份证号/年龄
  const handleIdCardScan: UploadProps['beforeUpload'] = async (file: RcFile) => {
    try {
      setIsOcrProcessing(true);
      const ocrResult = await ImageService.ocrIdCard(file, 'front');
      const formValues = mapParsedToLead(ImageService.extractIdCardInfo(ocrResult));
      if (Object.keys(formValues).length > 0) {
        form.setFieldsValue(formValues);
        message.success('身份证识别成功');
      } else {
        message.warning('未能识别到身份证信息，请手动填写');
      }
    } catch (error: any) {
      console.error('OCR识别失败:', error);
      message.error(error?.message || '身份证识别失败，请手动填写');
    } finally {
      setIsOcrProcessing(false);
    }
    // 返回 false 阻止 antd 默认上传
    return false;
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // 验证手机号和微信号至少填一个
      if (!values.phone && !values.wechatId) {
        message.error('手机号和微信号至少填写一个');
        setLoading(false);
        return;
      }

      const data: CreateTrainingLeadDto = {
        ...values,
        expectedStartDate: values.expectedStartDate
          ? values.expectedStartDate.format('YYYY-MM-DD')
          : undefined
      };

      console.log('📤 提交学员线索 payload:', data);
      await trainingLeadService.createTrainingLead(data);
      message.success('培训线索创建成功');
      navigate('/training-leads');
    } catch (error: any) {
      const resp = error?.response?.data;
      const msg = resp?.message;
      // class-validator 校验错误时 message 是字符串数组
      const msgs: string[] = Array.isArray(msg) ? msg : (msg ? [msg] : ['创建失败']);
      console.error('❌ 学员线索创建失败，后端返回:', msgs.join(' | '));
      Modal.error({
        title: '创建失败',
        content: (
          <div>
            {msgs.map((m, i) => (
              <div key={i} style={{ marginBottom: 4 }}>• {m}</div>
            ))}
          </div>
        ),
        width: 480,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <PlusOutlined />
            <span>新建学员线索</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={() => setAiModalVisible(true)}
            >
              AI识别填充
            </Button>
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
          initialValues={{
            isReported: false
          }}
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
                  <Input
                    placeholder="请输入身份证号"
                    maxLength={18}
                    addonAfter={
                      <Upload
                        accept="image/*"
                        showUploadList={false}
                        beforeUpload={handleIdCardScan}
                        disabled={isOcrProcessing}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={isOcrProcessing ? <LoadingOutlined /> : <ScanOutlined />}
                          style={{ border: 0, padding: '0 4px', height: 22 }}
                        >
                          {isOcrProcessing ? '识别中' : '扫描身份证'}
                        </Button>
                      </Upload>
                    }
                  />
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
                创建
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

      {/* AI识别填充弹窗 */}
      <Modal
        title={<Space><RobotOutlined />AI识别学员信息</Space>}
        open={aiModalVisible}
        onCancel={() => {
          setAiModalVisible(false);
          setAiText('');
          setAiImage(null);
          setAiImagePreview(null);
        }}
        width={640}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setAiModalVisible(false);
              setAiText('');
              setAiImage(null);
              setAiImagePreview(null);
            }}
          >
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={aiLoading}
            onClick={handleAIParse}
            disabled={!aiImage && (!aiText || aiText.trim().length < 10)}
          >
            {aiImage ? '识别图片并填充' : '识别并填充'}
          </Button>,
        ]}
      >
        <Spin spinning={aiLoading} tip="AI识别中...">
          <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
            粘贴学员的聊天记录、名片或资料文本，或直接 <b>Ctrl+V</b> 粘贴截图，AI 将自动识别并填充姓名、电话、微信、性别、年龄、身份证号等字段。
          </div>
          {aiImagePreview && (
            <div style={{ marginBottom: 12, border: '1px solid #eee', borderRadius: 4, padding: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#666' }}>📷 已粘贴图片（将用于AI识别）</span>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setAiImage(null);
                    setAiImagePreview(null);
                  }}
                >
                  移除
                </Button>
              </div>
              <img
                src={aiImagePreview}
                alt="AI识别图片"
                style={{ maxWidth: '100%', maxHeight: 200, display: 'block' }}
              />
            </div>
          )}
          <Input.TextArea
            rows={aiImagePreview ? 5 : 12}
            placeholder={'粘贴学员信息文本，或直接 Ctrl+V 粘贴截图\n\n例如：\n姓名：张三\n性别：女\n年龄：35\n手机：13800138000\n身份证：110101199001011234\n意向课程：母婴护理师'}
            value={aiText}
            onChange={e => setAiText(
              e.target.value
                .replace(/\[图片\]/g, '')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
            )}
            onPaste={handleAiModalPaste}
            maxLength={5000}
            showCount
          />
        </Spin>
      </Modal>
    </div>
  );
};

export default CreateTrainingLead;
