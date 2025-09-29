import React, { useState } from 'react';
import { Card, Button, Form, Input, message, Typography, Space, Divider } from 'antd';
import { WechatOutlined, SendOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const WeChatTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const testNotification = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/wechat/test-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openId: values.openId,
          templateData: {
            name: values.customerName,
            phone: values.customerPhone,
            leadSource: values.leadSource,
            serviceCategory: values.serviceCategory,
            assignedAt: new Date().toLocaleString('zh-CN'),
            assignmentReason: values.assignmentReason
          },
          url: `https://crm.andejiazheng.com/customers/detail/${values.customerId || 'test123'}`
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        message.success('微信通知发送成功！');
      } else {
        message.error(`发送失败: ${result.message}`);
      }
    } catch (error) {
      console.error('发送微信通知失败:', error);
      message.error('发送失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <WechatOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={2}>微信通知测试</Title>
          <Text type="secondary">测试线索分配微信通知功能</Text>
        </div>

        <Divider />

        <Form
          form={form}
          layout="vertical"
          onFinish={testNotification}
          initialValues={{
            customerName: '张三',
            customerPhone: '138****1234',
            leadSource: '美团',
            serviceCategory: '月嫂服务',
            assignmentReason: '客户所在区域匹配',
            customerId: 'test123'
          }}
        >
          <Form.Item
            label="微信OpenID"
            name="openId"
            rules={[{ required: true, message: '请输入微信OpenID' }]}
            extra="需要员工先关注服务号并绑定账号才能获得OpenID"
          >
            <Input placeholder="请输入微信OpenID" />
          </Form.Item>

          <Form.Item
            label="客户姓名"
            name="customerName"
            rules={[{ required: true, message: '请输入客户姓名' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="客户电话"
            name="customerPhone"
            rules={[{ required: true, message: '请输入客户电话' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="线索来源"
            name="leadSource"
            rules={[{ required: true, message: '请输入线索来源' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="服务类别"
            name="serviceCategory"
            rules={[{ required: true, message: '请输入服务类别' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="分配原因"
            name="assignmentReason"
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="客户ID"
            name="customerId"
          >
            <Input placeholder="用于生成详情页链接" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SendOutlined />}
              >
                发送测试通知
              </Button>
              <Button onClick={() => form.resetFields()}>
                重置表单
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Divider />

        <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '6px' }}>
          <Title level={4}>使用说明：</Title>
          <ol>
            <li>员工需要先关注"安得家政"微信服务号</li>
            <li>在CRM中访问 <Text code>/wechat/bind</Text> 页面进行账号绑定</li>
            <li>绑定成功后，在用户信息中可以看到微信OpenID</li>
            <li>将OpenID填入上方表单进行测试</li>
            <li>成功发送后，员工微信会收到线索分配通知</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};

export default WeChatTest;
