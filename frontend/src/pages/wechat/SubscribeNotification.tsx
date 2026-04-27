import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Result, Spin, Alert, message, Tag, Space } from 'antd';
import { WechatOutlined, CheckCircleOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { isLoggedIn, setToken } from '../../services/auth';
import {
  getSubscribeCredit,
  getOAuthAuthorizeUrl,
  confirmSubscribe,
  isInWechat,
  issueHandoffToken,
  CreditInfo,
} from '../../services/wechat-subscribe';
import SubscribeButton from '../../components/wechat/SubscribeButton';

const SubscribeNotification: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CreditInfo | null>(null);
  const [binding, setBinding] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [generatingQr, setGeneratingQr] = useState(false);

  const loadCredit = useCallback(async () => {
    try {
      const resp = await getSubscribeCredit();
      if (resp.success && resp.data) setInfo(resp.data);
    } catch (e: any) {
      message.error(e?.message || '加载额度失败');
    }
  }, []);

  // 初始化：消费 ?token=（PC 扫码 handoff）→ 登录态写入；处理 ?action=（订阅 URL 回调）；加载额度
  useEffect(() => {
    // 1. 优先消费 handoff token（来自 PC 扫码二维码进入微信）
    const handoffToken = searchParams.get('token');
    if (handoffToken) {
      setToken(handoffToken);
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
    }

    if (!isLoggedIn()) {
      navigate(`/login?redirect=${encodeURIComponent('/wechat/subscribe')}`);
      return;
    }

    // 2. 处理服务号订阅 URL 跳转回来后的 action 参数
    //    微信回调格式: ?action=confirm|cancel&template_id=&scene=&openid=&reserved=
    const action = searchParams.get('action');
    const cbTemplateId = searchParams.get('template_id');
    if (action === 'confirm' && cbTemplateId) {
      confirmSubscribe('accept', cbTemplateId, 1)
        .then((resp) => {
          if (resp.success) {
            message.success('订阅成功，已增加 1 条额度');
          } else {
            message.error(resp.message || '订阅确认失败');
          }
        })
        .catch((e: any) => message.error(e?.message || '订阅确认失败'))
        .finally(() => {
          // 清掉 URL 上的回调参数
          const url = new URL(window.location.href);
          ['action', 'template_id', 'scene', 'openid', 'reserved'].forEach((k) => url.searchParams.delete(k));
          window.history.replaceState({}, '', url.toString());
        });
    } else if (action === 'cancel') {
      message.info('您已取消订阅');
      const url = new URL(window.location.href);
      ['action', 'template_id', 'scene', 'openid', 'reserved'].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, '', url.toString());
    }

    const bound = searchParams.get('bound');
    const bindError = searchParams.get('bind_error');
    if (bound === '1') message.success('服务号绑定成功');
    if (bindError) message.error(`绑定失败: ${bindError}`);
    loadCredit().finally(() => setLoading(false));
  }, [searchParams, navigate, loadCredit]);

  // 绑定服务号
  const handleBind = async () => {
    setBinding(true);
    try {
      const resp = await getOAuthAuthorizeUrl();
      if (resp.success && resp.data?.url) {
        window.location.href = resp.data.url;
      } else {
        throw new Error(resp.message || '获取授权 URL 失败');
      }
    } catch (e: any) {
      message.error(e?.message || '绑定失败');
      setBinding(false);
    }
  };

  // PC 上生成扫码二维码：拿一个 10 分钟的 handoff JWT，编入 URL
  const handleGenerateQr = async () => {
    setGeneratingQr(true);
    try {
      const resp = await issueHandoffToken();
      if (resp.success && resp.data?.token) {
        const target = `${window.location.origin}/wechat/subscribe?token=${encodeURIComponent(resp.data.token)}`;
        setQrUrl(target);
      } else {
        throw new Error(resp.message || '生成二维码失败');
      }
    } catch (e: any) {
      message.error(e?.message || '生成二维码失败');
    } finally {
      setGeneratingQr(false);
    }
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
        title={<Space><WechatOutlined style={{ color: '#07C160' }} /><span>微信通知订阅</span></Space>}
        bordered={false}
        style={{ maxWidth: 480, margin: '0 auto', borderRadius: 8 }}
      >
        {!isInWechat() && (
          <div style={{ marginBottom: 16 }}>
            <Alert
              type="info"
              showIcon
              message="请用手机微信扫码完成订阅"
              description="订阅授权需要在微信内完成。点击下方按钮生成专属二维码，用手机微信扫码后会自动登录并打开订阅页。"
              style={{ marginBottom: 12 }}
            />
            {qrUrl ? (
              <Card type="inner" style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: 12, background: '#fff', border: '1px solid #eee', borderRadius: 8 }}>
                  <QRCodeSVG value={qrUrl} size={220} level="M" includeMargin />
                </div>
                <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
                  二维码 10 分钟内有效。扫码后在手机微信里点击「订阅通知」即可。
                </div>
                <Button size="small" style={{ marginTop: 8 }} onClick={handleGenerateQr} loading={generatingQr}>
                  重新生成
                </Button>
              </Card>
            ) : (
              <Button
                type="primary"
                block
                size="large"
                icon={<QrcodeOutlined />}
                loading={generatingQr}
                onClick={handleGenerateQr}
                style={{ background: '#07C160', borderColor: '#07C160' }}
              >
                生成扫码二维码
              </Button>
            )}
          </div>
        )}

        {!info?.bound ? (
          <Result
            icon={<WechatOutlined style={{ color: '#07C160' }} />}
            title="尚未绑定服务号"
            subTitle="绑定后才能接收线索分配等微信通知"
            extra={
              <Button
                type="primary"
                size="large"
                loading={binding}
                disabled={!isInWechat()}
                onClick={handleBind}
                icon={<WechatOutlined />}
                style={{ background: '#07C160', borderColor: '#07C160' }}
              >
                立即绑定服务号
              </Button>
            }
          />
        ) : (
          <>
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message="已绑定服务号"
              description={<span style={{ fontSize: 12, color: '#888' }}>OpenID: {info.openid?.slice(0, 8)}…{info.openid?.slice(-4)}</span>}
              style={{ marginBottom: 16 }}
            />
            <Card type="inner" title="通知额度" style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 36, fontWeight: 600, color: info.remaining > 0 ? '#52c41a' : '#999' }}>
                  {info.remaining}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>剩余可发送条数</div>
                {info.remaining === 0 && (
                  <Tag color="orange" style={{ marginTop: 8 }}>额度用完，分配新客户时不会收到通知</Tag>
                )}
              </div>
            </Card>
            {!isInWechat() ? (
              <Button
                type="primary"
                size="large"
                block
                disabled
                style={{ background: '#07C160', borderColor: '#07C160', height: 48, opacity: 0.6 }}
              >
                请在微信中打开此页面
              </Button>
            ) : (
              <SubscribeButton
                templateId={info.templateId}
                count={5}
                buttonText="点击订阅通知（+5 条额度）"
                onAfterSubscribe={() => loadCredit()}
              />
            )}
            <div style={{ color: '#888', fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
              说明：每点击一次订阅可一次性获得 5 条发送额度。点开此页面里的任何按钮都会先弹出订阅授权框，方便随时补充额度。
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default SubscribeNotification;
