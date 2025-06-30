import React, { useState, useEffect } from 'react';
import { Card, Button, Radio, message, Spin, Result, Divider, Modal } from 'antd';
import { WechatOutlined, AlipayOutlined, BankOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentInfo {
  contractId: string;
  customerName: string;
  serviceFee: number;
  paymentStatus: string;
}

interface PaymentMethod {
  key: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const Payment: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('wechat');
  const [processing, setProcessing] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [countdown, setCountdown] = useState(300); // 5分钟倒计时

  const paymentMethods: PaymentMethod[] = [
    {
      key: 'wechat',
      name: '微信支付',
      icon: <WechatOutlined style={{ color: '#52c41a', fontSize: '24px' }} />,
      description: '使用微信扫码支付，安全便捷'
    },
    {
      key: 'alipay',
      name: '支付宝',
      icon: <AlipayOutlined style={{ color: '#1890ff', fontSize: '24px' }} />,
      description: '支付宝扫码支付，快速到账'
    },
    {
      key: 'bank',
      name: '银行卡支付',
      icon: <BankOutlined style={{ color: '#722ed1', fontSize: '24px' }} />,
      description: '支持各大银行储蓄卡和信用卡'
    }
  ];

  useEffect(() => {
    if (contractId) {
      fetchPaymentInfo();
    }
  }, [contractId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (paymentModal && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      message.warning('支付超时，请重新发起支付');
      setPaymentModal(false);
      setCountdown(300);
    }
    return () => clearTimeout(timer);
  }, [paymentModal, countdown]);

  const fetchPaymentInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}/payment-info`);
      const data = await response.json();
      
      if (data.success) {
        setPaymentInfo(data.data);
      } else {
        message.error('获取支付信息失败');
      }
    } catch (error) {
      console.error('获取支付信息失败:', error);
      message.error('获取支付信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentInfo) return;

    try {
      setProcessing(true);
      
      // 调用支付API
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId: paymentInfo.contractId,
          amount: paymentInfo.serviceFee,
          paymentMethod: selectedMethod,
          returnUrl: `${window.location.origin}/payment-result/${contractId}`,
          notifyUrl: `${window.location.origin}/api/payments/notify`
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        if (selectedMethod === 'wechat' || selectedMethod === 'alipay') {
          // 显示二维码支付
          setQrCodeUrl(data.data.qrCodeUrl);
          setPaymentModal(true);
          setCountdown(300);
          // 开始轮询支付状态
          startPaymentPolling(data.data.paymentId);
        } else if (selectedMethod === 'bank') {
          // 跳转到银行支付页面
          window.location.href = data.data.paymentUrl;
        }
      } else {
        message.error(data.message || '发起支付失败');
      }
    } catch (error) {
      console.error('支付失败:', error);
      message.error('支付失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const startPaymentPolling = (paymentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/${paymentId}/status`);
        const data = await response.json();
        
        if (data.success && data.data.status === 'paid') {
          clearInterval(pollInterval);
          setPaymentModal(false);
          message.success('支付成功！');
          navigate(`/payment-result/${contractId}?status=success`);
        }
      } catch (error) {
        console.error('查询支付状态失败:', error);
      }
    }, 2000);

    // 5分钟后停止轮询
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!paymentInfo) {
    return (
      <Result
        status="error"
        title="支付信息获取失败"
        subTitle="请检查合同ID是否正确"
        extra={<Button type="primary" onClick={() => navigate('/contracts')}>返回合同列表</Button>}
      />
    );
  }

  if (paymentInfo.paymentStatus === 'paid') {
    return (
      <Result
        status="success"
        title="支付已完成"
        subTitle="该合同的服务费已支付完成"
        extra={<Button type="primary" onClick={() => navigate(`/contract-detail/${contractId}`)}>查看合同详情</Button>}
      />
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <Card title="支付服务费" bordered={false}>
        <div style={{ marginBottom: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 12px 0' }}>订单信息</h3>
          <p><strong>客户姓名：</strong>{paymentInfo.customerName}</p>
          <p><strong>合同编号：</strong>{paymentInfo.contractId}</p>
          <p style={{ margin: '0' }}>
            <strong>应付金额：</strong>
            <span style={{ color: '#ff4d4f', fontSize: '24px', fontWeight: 'bold' }}>
              ¥{paymentInfo.serviceFee.toFixed(2)}
            </span>
          </p>
        </div>

        <Divider>选择支付方式</Divider>

        <Radio.Group 
          value={selectedMethod} 
          onChange={(e) => setSelectedMethod(e.target.value)}
          style={{ width: '100%' }}
        >
          {paymentMethods.map(method => (
            <Card 
              key={method.key}
              size="small" 
              style={{ 
                marginBottom: '12px', 
                cursor: 'pointer',
                border: selectedMethod === method.key ? '2px solid #1890ff' : '1px solid #d9d9d9'
              }}
              onClick={() => setSelectedMethod(method.key)}
            >
              <Radio value={method.key} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {method.icon}
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{method.name}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>{method.description}</div>
                  </div>
                </div>
              </Radio>
            </Card>
          ))}
        </Radio.Group>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <Button 
            type="primary" 
            size="large" 
            loading={processing}
            onClick={handlePayment}
            style={{ minWidth: '200px' }}
          >
            确认支付 ¥{paymentInfo.serviceFee.toFixed(2)}
          </Button>
        </div>

        <div style={{ marginTop: '24px', padding: '16px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '6px' }}>
          <h4 style={{ color: '#fa8c16', margin: '0 0 8px 0' }}>⚠️ 支付提醒</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
            <li>请在24小时内完成支付，逾期将取消订单</li>
            <li>支付完成后，我们将在1个工作日内安排服务人员</li>
            <li>如有疑问，请联系客服：400-xxx-xxxx</li>
          </ul>
        </div>
      </Card>

      {/* 二维码支付模态框 */}
      <Modal
        title={`${selectedMethod === 'wechat' ? '微信' : '支付宝'}扫码支付`}
        open={paymentModal}
        footer={null}
        onCancel={() => setPaymentModal(false)}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <QRCodeSVG value={qrCodeUrl} size={200} />
          </div>
          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff4d4f' }}>
            支付金额：¥{paymentInfo.serviceFee.toFixed(2)}
          </p>
          <p style={{ color: '#666' }}>
            请使用{selectedMethod === 'wechat' ? '微信' : '支付宝'}扫描上方二维码完成支付
          </p>
          <p style={{ color: '#fa8c16' }}>
            剩余时间：{formatTime(countdown)}
          </p>
          <div style={{ marginTop: '20px' }}>
            <Button onClick={() => setPaymentModal(false)}>取消支付</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Payment; 