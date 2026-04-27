import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Tag, App, Button, Space, Typography, Tooltip } from 'antd';
import { ReloadOutlined, WechatOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { listSubscribers, SubscriberRow } from '../../services/wechat-subscribe';

const { Text } = Typography;

const WechatSubscribeList: React.FC = () => {
  const [list, setList] = useState<SubscriberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [appid, setAppid] = useState('');
  const { message } = App.useApp();

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await listSubscribers();
      if (resp.success && resp.data) {
        setList(resp.data.list);
        setTemplateId(resp.data.templateId);
        setAppid(resp.data.appid);
      } else {
        message.error(resp.message || '获取列表失败');
      }
    } catch (e: any) {
      console.error('获取订阅列表失败:', e);
      message.error(e?.response?.data?.message || '获取订阅列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    {
      title: '员工姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (name: string, r: SubscriberRow) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.username}</Text>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 110,
      render: (role: string) => <Tag color="blue">{role}</Tag>,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 120,
      render: (v?: string) => v || '-',
    },
    {
      title: '在职',
      dataIndex: 'active',
      key: 'active',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">在职</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '微信 OpenID',
      dataIndex: 'wechatOpenId',
      key: 'wechatOpenId',
      width: 260,
      render: (v: string) => (
        <Tooltip title={v}>
          <Text copyable={{ text: v }} style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {v}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '微信昵称',
      dataIndex: 'wechatNickname',
      key: 'wechatNickname',
      width: 140,
      render: (v?: string) => v || '-',
    },
    {
      title: '剩余额度',
      dataIndex: 'remaining',
      key: 'remaining',
      width: 100,
      render: (v: number) => (
        <Tag color={v > 0 ? 'green' : 'default'}>{v}</Tag>
      ),
    },
    {
      title: '累计订阅',
      dataIndex: 'totalSubscribed',
      key: 'totalSubscribed',
      width: 100,
    },
    {
      title: '累计发送',
      dataIndex: 'totalSent',
      key: 'totalSent',
      width: 100,
    },
    {
      title: '最后订阅时间',
      dataIndex: 'lastSubscribedAt',
      key: 'lastSubscribedAt',
      width: 170,
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '最后发送时间',
      dataIndex: 'lastSentAt',
      key: 'lastSentAt',
      width: 170,
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
  ];

  return (
    <PageContainer
      title="订阅消息列表"
      content={
        <Space direction="vertical" size={4}>
          <Text type="secondary">
            <WechatOutlined /> 服务号 AppID：<Text code>{appid || '-'}</Text>
          </Text>
          <Text type="secondary">
            模板 ID：<Text code>{templateId || '-'}</Text>
          </Text>
        </Space>
      }
      extra={[
        <Button key="reload" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
          刷新
        </Button>,
      ]}
    >
      <Card>
        <Table
          columns={columns}
          dataSource={list}
          rowKey="userId"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          scroll={{ x: 1500 }}
        />
      </Card>
    </PageContainer>
  );
};

export default WechatSubscribeList;
