import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, message, Alert } from 'antd';
import { customerService } from '../services/customerService';

interface BatchAssignCustomerModalProps {
  visible: boolean;
  customerIds: string[];
  onCancel: () => void;
  onSuccess: () => void;
}

const { TextArea } = Input;

const BatchAssignCustomerModal: React.FC<BatchAssignCustomerModalProps> = ({ 
  visible, 
  customerIds, 
  onCancel, 
  onSuccess 
}) => {
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
      if (!customerIds || customerIds.length === 0) {
        message.warning('请先选择要分配的客户');
        return;
      }
      
      const values = await form.validateFields();
      setLoading(true);
      
      const result = await customerService.batchAssignCustomers(
        customerIds, 
        values.assignedTo, 
        values.assignmentReason
      );
      
      if (result.success > 0) {
        message.success(`批量分配完成：成功 ${result.success} 个，失败 ${result.failed} 个`);
        
        // 如果有失败的，显示详细错误信息
        if (result.failed > 0 && result.errors && result.errors.length > 0) {
          Modal.warning({
            title: '部分客户分配失败',
            content: (
              <div>
                <p>以下客户分配失败：</p>
                <ul>
                  {result.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>{err.error}</li>
                  ))}
                  {result.errors.length > 5 && <li>...还有 {result.errors.length - 5} 个错误</li>}
                </ul>
              </div>
            ),
            width: 500,
          });
        }
        
        form.resetFields();
        onSuccess();
      } else {
        message.error('批量分配失败，请重试');
      }
    } catch (e: any) {
      if (e?.errorFields) return; // 表单校验错误
      message.error(e?.response?.data?.message || '批量分配失败');
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
      title="批量分配客户"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okButtonProps={{ loading }}
      cancelButtonProps={{ disabled: loading }}
      destroyOnClose
      maskClosable={!loading}
      okText="确认分配"
      cancelText="取消"
      width={600}
    >
      <Alert
        message={`已选择 ${customerIds.length} 个客户`}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
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
              label: `${String(u.name || u.username)} (${String(u.role || 'unknown')})${u.department ? ` - ${u.department}` : ''}`
            })) : []}
          />
        </Form.Item>
        <Form.Item name="assignmentReason" label="分配备注（可选）">
          <TextArea 
            maxLength={200} 
            showCount 
            rows={3} 
            placeholder="请输入批量分配的原因或备注" 
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BatchAssignCustomerModal;

