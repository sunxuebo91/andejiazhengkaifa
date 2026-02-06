import React, { useState, useEffect, useRef } from 'react';
import {
  Layout,
  Form,
  Input,
  Button,
  Card,
  Space,
  Select,
  DatePicker,
  Switch,
  message,
  Divider,
  Empty,
  Typography,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SaveOutlined,
  CopyOutlined,
  UploadOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createForm,
  updateForm,
  getFormDetail,
  FormConfig,
  FormField,
  FieldOption,
} from '../../services/form.service';
import { apiService } from '../../services/api';
import dayjs from 'dayjs';
import './FormEditor.css';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Sider, Content } = Layout;
const { Text } = Typography;

type PaletteItem = {
  type: FormField['fieldType'];
  label: string;
  preset?: Partial<FormField>;
};

const FIELD_TYPES = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'phone', label: '手机号' },
  { value: 'email', label: '邮箱' },
  { value: 'date', label: '日期' },
  { value: 'radio', label: '单选' },
  { value: 'checkbox', label: '多选' },
  { value: 'select', label: '下拉选择' },
];

const PALETTE_GROUPS: { title: string; items: PaletteItem[] }[] = [
  {
    title: '基础题型',
    items: [
      { type: 'text', label: '单行文本' },
      { type: 'textarea', label: '多行文本' },
      { type: 'radio', label: '单选' },
      { type: 'checkbox', label: '多选' },
      { type: 'select', label: '下拉选择' },
      { type: 'date', label: '日期' },
    ],
  },
  {
    title: '常用字段',
    items: [
      {
        type: 'text',
        label: '姓名',
        preset: {
          label: '姓名',
          fieldName: 'name',
          placeholder: '请输入姓名',
          required: true,
        },
      },
      {
        type: 'phone',
        label: '手机号',
        preset: {
          label: '手机号',
          fieldName: 'phone',
          placeholder: '请输入手机号',
          required: true,
        },
      },
      {
        type: 'email',
        label: '邮箱',
        preset: {
          label: '邮箱',
          fieldName: 'email',
          placeholder: '请输入邮箱',
        },
      },
    ],
  },
];

const FormEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string>('');
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [fields, setFields] = useState<FormField[]>([
    {
      label: '姓名',
      fieldName: 'name',
      fieldType: 'text',
      required: true,
      placeholder: '请输入姓名',
      order: 0,
    },
  ]);

  useEffect(() => {
    if (id) {
      fetchFormDetail();
    }
  }, [id]);

  useEffect(() => {
    if (selectedFieldIndex === null) return;
    const node = fieldRefs.current[selectedFieldIndex];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedFieldIndex, fields.length]);

  const fetchFormDetail = async () => {
    try {
      const data = await getFormDetail(id!);
      form.setFieldsValue({
        title: data.title,
        description: data.description,
        bannerUrl: data.bannerUrl,
        status: data.status,
        timeRange: data.startTime && data.endTime ? [dayjs(data.startTime), dayjs(data.endTime)] : undefined,
        successMessage: data.successMessage,
        allowMultipleSubmissions: data.allowMultipleSubmissions,
      });
      setBannerUrl(data.bannerUrl || '');
      if (data.fields && data.fields.length > 0) {
        setFields(data.fields);
      }
    } catch (error: any) {
      message.error(error.message || '获取表单详情失败');
    }
  };

  const handleSubmit = async (values: any) => {
    if (fields.length === 0) {
      message.error('至少需要添加一个字段');
      return;
    }

    setLoading(true);
    try {
      const formData: FormConfig = {
        title: values.title,
        description: values.description,
        bannerUrl: values.bannerUrl,
        status: values.status || 'active',
        startTime: values.timeRange ? values.timeRange[0].toISOString() : undefined,
        endTime: values.timeRange ? values.timeRange[1].toISOString() : undefined,
        successMessage: values.successMessage || '提交成功！感谢您的参与。',
        allowMultipleSubmissions: values.allowMultipleSubmissions || false,
        fields: fields.map((field, index) => ({
          ...field,
          order: index,
        })),
      };

      if (id) {
        await updateForm(id, formData);
        message.success('更新成功');
      } else {
        await createForm(formData);
        message.success('创建成功');
      }
      navigate('/forms');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const needsOptions = (fieldType: string) => {
    return ['radio', 'checkbox', 'select'].includes(fieldType);
  };

  const buildFieldFromType = (fieldType: FormField['fieldType']): FormField => {
    const base = {
      label: FIELD_TYPES.find((item) => item.value === fieldType)?.label || '未命名字段',
      fieldName: `field_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      fieldType,
      required: false,
      order: fields.length,
      placeholder: fieldType === 'text' ? '请输入内容' : undefined,
    } as FormField;

    if (needsOptions(fieldType)) {
      base.options = [
        { value: 'option_1', label: '选项1' },
        { value: 'option_2', label: '选项2' },
      ];
    }
    return base;
  };

  const insertFieldAt = (field: FormField, index: number) => {
    const nextFields = [...fields];
    const targetIndex = Math.max(0, Math.min(index, nextFields.length));
    nextFields.splice(targetIndex, 0, field);
    setFields(nextFields);
    setSelectedFieldIndex(targetIndex);
  };

  const addFieldFromPaletteAt = (item: PaletteItem, index: number) => {
    const newField = buildFieldFromType(item.type);
    const finalField: FormField = {
      ...newField,
      label: item.label,
      ...item.preset,
      fieldType: item.type,
      order: fields.length,
    };
    insertFieldAt(finalField, index);
  };

  const addFieldFromPalette = (item: PaletteItem) => {
    addFieldFromPaletteAt(item, fields.length);
  };

  const copyField = (index: number) => {
    const sourceField = fields[index];
    const clonedField: FormField = {
      ...sourceField,
      fieldName: `${sourceField.fieldName || 'field'}_${Date.now()}`,
    };
    insertFieldAt(clonedField, index + 1);
  };

  const moveFieldTo = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const nextFields = [...fields];
    const [removed] = nextFields.splice(fromIndex, 1);
    let targetIndex = toIndex;
    if (fromIndex < toIndex) {
      targetIndex = toIndex - 1;
    }
    targetIndex = Math.max(0, Math.min(targetIndex, nextFields.length));
    nextFields.splice(targetIndex, 0, removed);
    setFields(nextFields);
    setSelectedFieldIndex(targetIndex);
  };

  const parseDragData = (event: React.DragEvent) => {
    const raw = event.dataTransfer.getData('application/x-form-field');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  };

  const handlePaletteDragStart = (event: React.DragEvent, item: PaletteItem) => {
    event.dataTransfer.setData('application/x-form-field', JSON.stringify({ source: 'palette', item }));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleFieldDragStart = (event: React.DragEvent, index: number) => {
    event.dataTransfer.setData('application/x-form-field', JSON.stringify({ source: 'field', index }));
    event.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDropIndex(null);
    setDraggedIndex(null);
  };

  const handleCanvasDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = draggedIndex === null ? 'copy' : 'move';
    if (fields.length === 0) {
      setDropIndex(0);
    }
  };

  const handleCanvasDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const payload = parseDragData(event);
    if (!payload) return;
    const targetIndex = dropIndex !== null ? dropIndex : fields.length;
    if (payload.source === 'palette') {
      addFieldFromPaletteAt(payload.item as PaletteItem, targetIndex);
    }
    if (payload.source === 'field') {
      moveFieldTo(payload.index as number, targetIndex);
    }
    setDropIndex(null);
    setDraggedIndex(null);
  };

  const handleFieldDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = draggedIndex === null ? 'copy' : 'move';
    setDropIndex(index);
  };

  const handleFieldDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    const payload = parseDragData(event);
    if (!payload) return;
    if (payload.source === 'palette') {
      addFieldFromPaletteAt(payload.item as PaletteItem, index);
    }
    if (payload.source === 'field') {
      moveFieldTo(payload.index as number, index);
    }
    setDropIndex(null);
    setDraggedIndex(null);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    if (selectedFieldIndex === index) {
      setSelectedFieldIndex(null);
    } else if (selectedFieldIndex !== null && selectedFieldIndex > index) {
      setSelectedFieldIndex(selectedFieldIndex - 1);
    }
    if (draggedIndex !== null && draggedIndex >= newFields.length) {
      setDraggedIndex(null);
    }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFields(newFields);
    if (selectedFieldIndex === index) {
      setSelectedFieldIndex(targetIndex);
    } else if (selectedFieldIndex === targetIndex) {
      setSelectedFieldIndex(index);
    }
  };

  const updateField = (index: number, key: keyof FormField, value: any) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const handleFieldTypeChange = (index: number, fieldType: FormField['fieldType']) => {
    const newFields = [...fields];
    const nextField = { ...newFields[index], fieldType };
    if (needsOptions(fieldType)) {
      if (!nextField.options || nextField.options.length === 0) {
        nextField.options = [
          { value: 'option_1', label: '选项1' },
          { value: 'option_2', label: '选项2' },
        ];
      }
    } else {
      delete nextField.options;
    }
    newFields[index] = nextField;
    setFields(newFields);
  };

  const addOption = (fieldIndex: number) => {
    const newFields = [...fields];
    if (!newFields[fieldIndex].options) {
      newFields[fieldIndex].options = [];
    }
    const optionCount = newFields[fieldIndex].options!.length + 1;
    newFields[fieldIndex].options!.push({
      value: `option_${optionCount}`,
      label: `选项${optionCount}`,
    });
    setFields(newFields);
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const newFields = [...fields];
    newFields[fieldIndex].options = newFields[fieldIndex].options!.filter((_, i) => i !== optionIndex);
    setFields(newFields);
  };

  const updateOption = (fieldIndex: number, optionIndex: number, key: keyof FieldOption, value: string) => {
    const newFields = [...fields];
    newFields[fieldIndex].options![optionIndex] = {
      ...newFields[fieldIndex].options![optionIndex],
      [key]: value,
    };
    setFields(newFields);
  };

  // 处理Banner图片上传
  const handleBannerUpload = async (file: File) => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'banner');

      const result = await apiService.upload<{ fileUrl: string }>('/api/upload/file', formData);

      if (result.success && result.data?.fileUrl) {
        form.setFieldsValue({ bannerUrl: result.data.fileUrl });
        setBannerUrl(result.data.fileUrl);
        message.success('图片上传成功');
      } else {
        message.error(result.message || '图片上传失败');
      }
    } catch (error: any) {
      console.error('图片上传失败:', error);
      message.error(error.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const selectedField = selectedFieldIndex !== null ? fields[selectedFieldIndex] : null;

  return (
    <Card
      title={id ? '编辑表单' : '创建表单'}
      className="form-editor-shell"
      extra={
        <Space>
          <Button onClick={() => navigate('/forms')}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} form="form-editor">
            保存
          </Button>
        </Space>
      }
    >
      <Form
        id="form-editor"
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          status: 'active',
          successMessage: '提交成功！感谢您的参与。',
          allowMultipleSubmissions: false,
        }}
      >
        <Layout className="form-editor-layout">
          <Sider width={260} className="form-editor-sider">
            <div className="palette-header">题型库</div>
            {PALETTE_GROUPS.map((group) => (
              <div key={group.title} className="palette-group">
                <div className="palette-group-title">{group.title}</div>
                <div className="palette-group-items">
                  {group.items.map((item) => (
                    <button
                      type="button"
                      key={`${group.title}-${item.label}`}
                      className="palette-item"
                      draggable
                      onDragStart={(event) => handlePaletteDragStart(event, item)}
                      onDragEnd={handleDragEnd}
                      onClick={() => addFieldFromPalette(item)}
                    >
                      <span className="palette-item-label">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Sider>

          <Content className="form-editor-canvas-wrapper">
            <div
              ref={canvasRef}
              className="form-canvas"
              onClick={() => {
                setSelectedFieldIndex(null);
              }}
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
            >
              {/* Banner图片预览 */}
              {bannerUrl && (
                <div style={{
                  width: '100%',
                  marginBottom: 16,
                  border: '2px dashed #d9d9d9',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <img
                    src={bannerUrl}
                    alt="Banner预览"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="form-canvas-header">
                <Form.Item
                  label="表单标题"
                  name="title"
                  rules={[{ required: true, message: '请输入表单标题' }]}
                >
                  <Input placeholder="请输入表单标题" />
                </Form.Item>
                <Form.Item label="表单描述" name="description">
                  <TextArea rows={3} placeholder="请输入表单描述" />
                </Form.Item>
              </div>

              <div
                className="form-canvas-body"
                onDragOver={(event) => {
                  handleCanvasDragOver(event);
                  if (fields.length > 0) {
                    setDropIndex(fields.length);
                  }
                }}
              >
                {fields.length === 0 ? (
                  <div className="form-canvas-empty">
                    <Empty description="请从左侧拖拽或点击添加题型" />
                  </div>
                ) : (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {fields.map((field, index) => (
                      <div
                        key={field.fieldName || index}
                        ref={(element) => {
                          fieldRefs.current[index] = element;
                        }}
                        className={`field-card ${selectedFieldIndex === index ? 'field-card-selected' : ''} ${
                          dropIndex === index ? 'field-card-drop-target' : ''
                        } ${draggedIndex === index ? 'field-card-dragging' : ''}`}
                        draggable
                        onDragStart={(event) => handleFieldDragStart(event, index)}
                        onDragOver={(event) => handleFieldDragOver(event, index)}
                        onDrop={(event) => handleFieldDrop(event, index)}
                        onDragEnd={handleDragEnd}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedFieldIndex(index);
                        }}
                      >
                        <div className="field-card-header">
                          <div className="field-card-title">
                            <span className="field-card-label">{field.label || '未命名字段'}</span>
                            {field.required && <span className="field-card-required">*</span>}
                          </div>
                          <Space size={4}>
                            <Button
                              size="small"
                              type="text"
                              icon={<ArrowUpOutlined />}
                              disabled={index === 0}
                              onClick={(event) => {
                                event.stopPropagation();
                                moveField(index, 'up');
                              }}
                            />
                            <Button
                              size="small"
                              type="text"
                              icon={<ArrowDownOutlined />}
                              disabled={index === fields.length - 1}
                              onClick={(event) => {
                                event.stopPropagation();
                                moveField(index, 'down');
                              }}
                            />
                            <Button
                              size="small"
                              type="text"
                              icon={<CopyOutlined />}
                              onClick={(event) => {
                                event.stopPropagation();
                                copyField(index);
                              }}
                            />
                            <Button
                              size="small"
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(event) => {
                                event.stopPropagation();
                                removeField(index);
                              }}
                            />
                          </Space>
                        </div>
                        <div className="field-card-body">
                          {field.fieldType === 'textarea' && (
                            <TextArea rows={3} placeholder={field.placeholder} disabled />
                          )}
                          {field.fieldType === 'text' && <Input placeholder={field.placeholder} disabled />}
                          {field.fieldType === 'phone' && <Input placeholder={field.placeholder || '请输入手机号'} disabled />}
                          {field.fieldType === 'email' && <Input placeholder={field.placeholder || '请输入邮箱'} disabled />}
                          {field.fieldType === 'date' && <DatePicker style={{ width: '100%' }} disabled />}
                          {['radio', 'checkbox', 'select'].includes(field.fieldType) && (
                            <div className="field-card-options">
                              <Text type="secondary">
                                {field.options && field.options.length > 0
                                  ? field.options.map((option) => option.label || option.value).join(' / ')
                                  : '请在右侧配置选项'}
                              </Text>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div
                      className={`field-drop-line ${dropIndex === fields.length ? 'field-drop-line-active' : ''}`}
                      onDragOver={(event) => handleFieldDragOver(event, fields.length)}
                      onDrop={(event) => handleFieldDrop(event, fields.length)}
                    />
                  </Space>
                )}
              </div>

              <div className="form-canvas-footer">
                <Button type="primary" disabled>
                  提交
                </Button>
                <div className="form-canvas-success">
                  <Text type="secondary">提交成功提示将在右侧设置</Text>
                </div>
              </div>
            </div>
          </Content>

          <Sider width={320} className="form-editor-panel">
            <div className="panel-header">属性设置</div>
            <div className="panel-content">
              {!selectedField ? (
                <div className="panel-section">
                  <div className="panel-section-title">表单设置</div>
                  <Form.Item label="状态" name="status">
                    <Select>
                      <Option value="active">启用</Option>
                      <Option value="inactive">禁用</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="页面图片" name="bannerUrl">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Upload
                        accept="image/*"
                        showUploadList={false}
                        beforeUpload={(file) => {
                          // 验证文件类型
                          if (!file.type.startsWith('image/')) {
                            message.error('请选择图片文件');
                            return false;
                          }
                          // 验证文件大小（5MB）
                          if (file.size > 5 * 1024 * 1024) {
                            message.error('图片大小不能超过5MB');
                            return false;
                          }
                          handleBannerUpload(file);
                          return false; // 阻止默认上传
                        }}
                      >
                        <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} loading={uploading}>
                          {uploading ? '上传中...' : '上传图片'}
                        </Button>
                      </Upload>
                      <Input
                        placeholder="或直接输入图片URL"
                        value={bannerUrl}
                        onChange={(e) => {
                          const url = e.target.value;
                          form.setFieldsValue({ bannerUrl: url });
                          setBannerUrl(url);
                        }}
                      />
                      {bannerUrl && (
                        <div style={{ marginTop: 8 }}>
                          <img
                            src={bannerUrl}
                            alt="Banner预览"
                            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4 }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </Space>
                  </Form.Item>
                  <Form.Item label="生效时间" name="timeRange">
                    <RangePicker showTime style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label="提交成功提示语" name="successMessage">
                    <Input placeholder="提交成功！感谢您的参与。" />
                  </Form.Item>
                  <Form.Item label="允许重复提交" name="allowMultipleSubmissions" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </div>
              ) : (
                <div className="panel-section">
                  <div className="panel-section-title">字段设置</div>
                  <Text type="secondary" className="panel-selected-label">
                    正在编辑：{selectedField.label || '未命名字段'}
                  </Text>
                  <Form.Item label="字段标签" required>
                    <Input
                      value={selectedField.label}
                      placeholder="例如：姓名"
                      onChange={(event) => updateField(selectedFieldIndex!, 'label', event.target.value)}
                    />
                  </Form.Item>
                  <Form.Item label="字段类型" required>
                    <Select
                      value={selectedField.fieldType}
                      onChange={(value) => handleFieldTypeChange(selectedFieldIndex!, value)}
                    >
                      {FIELD_TYPES.map((type) => (
                        <Option key={type.value} value={type.value}>
                          {type.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item label="占位符提示">
                    <Input
                      value={selectedField.placeholder}
                      placeholder="例如：请输入姓名"
                      onChange={(event) => updateField(selectedFieldIndex!, 'placeholder', event.target.value)}
                    />
                  </Form.Item>
                  <Form.Item label="是否必填">
                    <Switch
                      checked={selectedField.required}
                      onChange={(checked) => updateField(selectedFieldIndex!, 'required', checked)}
                    />
                  </Form.Item>
                  {needsOptions(selectedField.fieldType) && (
                    <div className="panel-options">
                      <Divider orientation="left">选项配置</Divider>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {selectedField.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="panel-option-row">
                            <Input
                              className="panel-option-input"
                              placeholder="选项标签"
                              value={option.label}
                              onChange={(event) =>
                                updateOption(selectedFieldIndex!, optionIndex, 'label', event.target.value)
                              }
                            />
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeOption(selectedFieldIndex!, optionIndex)}
                            />
                          </div>
                        ))}
                        <Button type="dashed" icon={<PlusOutlined />} onClick={() => addOption(selectedFieldIndex!)} block>
                          添加选项
                        </Button>
                      </Space>
                    </div>
                  )}
                  <Divider />
                  <Button danger block onClick={() => removeField(selectedFieldIndex!)}>
                    删除字段
                  </Button>
                </div>
              )}
            </div>
          </Sider>
        </Layout>
      </Form>
    </Card>
  );
};

export default FormEditor;

