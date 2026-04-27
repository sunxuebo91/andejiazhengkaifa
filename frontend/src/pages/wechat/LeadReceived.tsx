import React, { useEffect, useState } from 'react';
import { Card, Spin, Alert, Tag, Space, Descriptions, Button, message } from 'antd';
import { UserOutlined, BellOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { isLoggedIn, setToken } from '../../services/auth';
import { getSubscribeCredit, isInWechat, CreditInfo } from '../../services/wechat-subscribe';
import SubscribeButton from '../../components/wechat/SubscribeButton';

const LeadReceived: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CreditInfo | null>(null);

  const cid = searchParams.get('cid') || '';
  const name = searchParams.get('name') || '客户';
  const assignedAt = searchParams.get('assignedAt') || '';
  const assignedBy = searchParams.get('by') || '';

  useEffect(() => {
    const handoffToken = searchParams.get('token');
    if (handoffToken) {
      setToken(handoffToken);
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
    }
    if (!isLoggedIn()) {
      const target = `${window.location.pathname}${window.location.search}`;
      navigate(`/login?redirect=${encodeURIComponent(target)}`);
      return;
    }
    getSubscribeCredit()
      .then((resp) => {
        if (resp.success && resp.data) setInfo(resp.data);
      })
      .catch((e: any) => message.error(e?.message || '加载额度失败'))
      .finally(() => setLoading(false));
  }, [searchParams, navigate]);

  const goDetail = () => {
    if (cid) navigate(`/customers/${cid}`);
  };

  const closeOrBack = () => {
    if ((window as any).WeixinJSBridge) {
      (window as any).WeixinJSBridge.invoke('closeWindow', {});
      return;
    }
    if (window.history.length > 1) window.history.back();
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 16 }}>
      <Card
        title={
          <Space>
            <BellOutlined style={{ color: '#07C160' }} />
            <span>新分配提醒</span>
          </Space>
        }
        bordered={false}
        style={{ maxWidth: 480, margin: '0 auto', borderRadius: 8 }}
      >
        <Alert
          type="success"
          showIcon
          message="您收到一条新分配的客户线索"
          description="点击下方任意按钮，即可顺手补充 5 条通知额度，确保后续不漏单。"
          style={{ marginBottom: 16 }}
        />

        <Card type="inner" style={{ marginBottom: 16 }}>
          <Descriptions column={1} size="small" labelStyle={{ width: 80, color: '#888' }}>
            <Descriptions.Item label="客户姓名">
              <Space>
                <UserOutlined />
                <strong>{decodeURIComponent(name)}</strong>
              </Space>
            </Descriptions.Item>
            {assignedAt && (
              <Descriptions.Item label="分配时间">{decodeURIComponent(assignedAt)}</Descriptions.Item>
            )}
            {assignedBy && (
              <Descriptions.Item label="分配人">{decodeURIComponent(assignedBy)}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {info?.bound && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Tag color={info.remaining > 0 ? 'green' : 'orange'}>
              当前剩余额度：{info.remaining}
            </Tag>
          </div>
        )}

        {!isInWechat() ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button type="primary" block size="large" onClick={goDetail} disabled={!cid}>
              查看客户详情
            </Button>
            <Button block size="large" onClick={closeOrBack}>
              我已知晓
            </Button>
          </Space>
        ) : !info?.bound || !info?.templateId ? (
          <Alert
            type="warning"
            showIcon
            message="尚未绑定服务号"
            description={
              <Button type="link" onClick={() => navigate('/wechat/subscribe')}>
                去绑定 →
              </Button>
            }
          />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <SubscribeButton
              templateId={info.templateId}
              count={5}
              buttonText="🔍 查看客户详情（+5 条额度）"
              onAfterSubscribe={goDetail}
              fallbackOnClick={goDetail}
            />
            <SubscribeButton
              templateId={info.templateId}
              count={5}
              buttonText="✅ 我已知晓（+5 条额度）"
              buttonStyle="width:100%;height:48px;background:#fff;color:#07C160;border:1px solid #07C160;border-radius:6px;font-size:16px;font-weight:500;cursor:pointer;"
              onAfterSubscribe={closeOrBack}
              fallbackOnClick={closeOrBack}
            />
          </Space>
        )}

        <div style={{ color: '#888', fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
          说明：点击任意按钮都会先弹出微信订阅授权框，点"允许"即可一次性补充 5 条额度。
        </div>
      </Card>
    </div>
  );
};

export default LeadReceived;
