import React, { useState } from 'react';
import { Modal, Form, Select, Input, Button, message, DatePicker } from 'antd';
import { trainingLeadService } from '../services/trainingLeadService';
import {
  CreateTrainingLeadFollowUpDto,
  FOLLOW_UP_TYPE_OPTIONS,
  FOLLOW_UP_RESULT_OPTIONS
} from '../types/training-lead.types';

const { Option } = Select;
const { TextArea } = Input;

interface TrainingLeadFollowUpModalProps {
  visible: boolean;
  leadId: string;
  leadName: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const TrainingLeadFollowUpModal: React.FC<TrainingLeadFollowUpModalProps> = ({
  visible,
  leadId,
  leadName,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('电话');

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const data: CreateTrainingLeadFollowUpDto = {
        type: values.type,
        followUpResult: values.followUpResult,
        content: values.content,
        nextFollowUpDate: values.nextFollowUpDate
          ? values.nextFollowUpDate.format('YYYY-MM-DD HH:mm:ss')
          : undefined
      };

      await trainingLeadService.createFollowUp(leadId, data);
      message.success('跟进记录添加成功');
      form.resetFields();
      setSelectedType('电话'); // 重置选中的类型
      onSuccess();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '添加跟进记录失败');
      console.error('添加跟进记录错误:', error);
    } finally {
      setLoading(false);
    }
  };

  // 跟进方式改变时，清空跟进结果
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    form.setFieldValue('followUpResult', undefined);
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={`添加跟进记录 - ${leadName}`}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="跟进方式"
          name="type"
          rules={[{ required: true, message: '请选择跟进方式' }]}
          initialValue="电话"
        >
          <Select
            placeholder="请选择跟进方式"
            onChange={handleTypeChange}
          >
            {FOLLOW_UP_TYPE_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="跟进结果"
          name="followUpResult"
          rules={[{ required: true, message: '请选择跟进结果' }]}
        >
          <Select placeholder="请选择跟进结果">
            {FOLLOW_UP_RESULT_OPTIONS[selectedType]?.map(option => (
              <Option key={option.value} value={option.value}>
                <span style={{ color: option.color }}>●</span> {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="跟进内容"
          name="content"
          rules={[
            { required: true, message: '请输入跟进内容' },
            { min: 5, message: '跟进内容至少5个字符' },
            { max: 1000, message: '跟进内容不能超过1000个字符' }
          ]}
        >
          <TextArea
            placeholder="请详细描述本次跟进情况..."
            rows={6}
            showCount
            maxLength={1000}
          />
        </Form.Item>

        <Form.Item
          label="下次跟进时间"
          name="nextFollowUpDate"
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            placeholder="请选择下次跟进时间（可选）"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={handleCancel} style={{ marginRight: 8 }}>
            取消
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            提交
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TrainingLeadFollowUpModal;

