import React, { useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, Input, Button, Alert, App } from 'antd';
import { useNavigate } from 'react-router-dom';

const CreateResumePage: React.FC = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      console.log('创建简历:', values);
      message.success('简历创建成功');
      navigate('/aunt/list');
    } catch (error) {
      console.error('创建简历失败:', error);
      message.error('创建简历失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      header={{
        title: '创建简历',
        onBack: () => navigate(-1),
      }}
    >
      <Card>
        <Alert
          message="此页面正在开发中"
          description="请使用新的简历创建页面"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              创建简历
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default CreateResumePage;
