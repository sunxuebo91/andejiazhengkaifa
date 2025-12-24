import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, message } from 'antd';
import { customerService } from '../services/customerService';
import { notifyMiniProgramAssignment } from '../utils/miniprogramUtils';

interface AssignCustomerModalProps {
  visible: boolean;
  customerId: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const { TextArea } = Input;

const AssignCustomerModal: React.FC<AssignCustomerModalProps> = ({ visible, customerId, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<{ _id: string; name: string; username: string; role: string; department?: string }>>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const fetchUsers = async () => {
      try {
        setFetching(true);
        const list = await customerService.getAssignableUsers();
        setUsers(list || []);
      } catch (e: any) {
        console.error('获取可分配用户失败:', e);
        message.error(e?.response?.data?.message || '获取可分配用户失败');
      } finally {
        setFetching(false);
      }
    };
    fetchUsers();
  }, [visible]);

  const handleOk = async () => {
    try {
      if (!customerId) return;
      const values = await form.validateFields();
      setLoading(true);
      const result = await customerService.assignCustomer(
        customerId,
        values.assignedTo,
        values.assignmentReason,
      );

      // 如果在小程序 web-view 中，并且后端返回了 notificationData，则通知小程序去发订阅消息
      const anyResult: any = result as any;
      if (anyResult && anyResult.notificationData) {
        notifyMiniProgramAssignment(anyResult.notificationData);
      }

      message.success('分配成功');
      form.resetFields();
      onSuccess();
    } catch (e: any) {
      if (e?.errorFields) return; // 表单校验错误
      message.error(e?.response?.data?.message || '分配失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="分配负责人"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okButtonProps={{ loading }}
      cancelButtonProps={{ disabled: loading }}
      destroyOnHidden
      maskClosable={!loading}
      okText="确认分配"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="assignedTo"
          label="选择负责人"
          rules={[{ required: true, message: '请选择负责人' }]}
        >
          <Select
            placeholder={fetching ? '正在加载可分配用户...' : '请选择负责人'}
            loading={fetching}
            allowClear
            showSearch
            optionFilterProp="label"
            options={Array.isArray(users) ? users.filter(u => u && u._id).map(u => ({
              value: String(u._id),
              label: `${String(u.name || u.username)} (${String(u.role || 'unknown')})`
            })) : []}
          />
        </Form.Item>
        <Form.Item name="assignmentReason" label="分配备注（可选）">
          <TextArea maxLength={200} showCount rows={3} placeholder="请输入分配原因或备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignCustomerModal;

