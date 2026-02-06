import React, { useState, useEffect } from 'react';
import { Modal, Result, Spin, Button, QRCode, Typography, Alert, message } from 'antd';
import { WechatOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import insuranceService from '../services/insuranceService';

const { Text, Title } = Typography;

interface WechatPayModalProps {
  visible: boolean;
  policyNo: string;
  agencyPolicyRef: string;
  totalPremium: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const WechatPayModal: React.FC<WechatPayModalProps> = ({
  visible,
  policyNo,
  agencyPolicyRef,
  totalPremium,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'success' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);

  // 创建支付订单
  const createPaymentOrder = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // 如果没有保单号，使用流水号
      const policyRef = policyNo || agencyPolicyRef;
      if (!policyRef) {
        throw new Error('保单号或流水号不能为空');
      }

      // 使用NATIVE（二维码支付场景）获取支付二维码
      const result = await insuranceService.createPaymentOrder(policyRef, 'NATIVE');
      
      if (result.Success === 'true') {
        setPaymentInfo(result);
        setPaymentStatus('checking');
        // 开始轮询支付状态
        startCheckingPaymentStatus(policyRef);
      } else {
        setErrorMessage(result.Message || '创建支付订单失败');
        setPaymentStatus('failed');
      }
    } catch (error: any) {
      setErrorMessage(error.message || '创建支付订单失败');
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  // 手动同步保单状态
  const syncPaymentStatus = async (policyRef: string) => {
    try {
      console.log('🔄 手动同步保单状态，商户单号:', policyRef);
      // 调用同步接口，从大树保同步最新状态
      const policy = await insuranceService.syncPolicyStatus(policyRef);
      console.log('📥 同步后的保单状态:', policy?.status);

      if (policy && policy.status === 'active') {
        console.log('✅ 支付成功！保单已生效');
        setPaymentStatus('success');
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        setTimeout(() => {
          onSuccess();
        }, 2000);
        return true;
      }
      return false;
    } catch (error) {
      console.error('同步支付状态失败:', error);
      return false;
    }
  };

  // 轮询检查支付状态
  const startCheckingPaymentStatus = (policyRef: string) => {
    // 清除之前的定时器
    if (checkInterval) {
      clearInterval(checkInterval);
    }

    console.log('🔄 开始轮询支付状态，商户单号:', policyRef);

    // 每1秒检查一次支付状态（优化：从3秒改为1秒，提升用户体验）
    const interval = setInterval(async () => {
      try {
        // 使用商户单号查询保单
        const policy = await insuranceService.getPolicyByPolicyRef(policyRef);
        console.log('📥 查询到保单状态:', policy?.status);

        if (policy && policy.status === 'active') {
          console.log('✅ 支付成功！保单已生效');
          setPaymentStatus('success');
          clearInterval(interval);
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } catch (error) {
        console.error('检查支付状态失败:', error);
      }
    }, 1000); // 改为1秒轮询一次

    setCheckInterval(interval);
  };

  // 组件挂载时创建支付订单
  useEffect(() => {
    if (visible && !paymentInfo) {
      createPaymentOrder();
    }
  }, [visible]);

  // 单独的 effect 用于清理定时器
  useEffect(() => {
    // 组件卸载时清除定时器
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [checkInterval]);

  // 渲染支付二维码
  const renderPaymentQRCode = () => {
    if (!paymentInfo || !paymentInfo.WeChatWebUrl) {
      return null;
    }

    const policyRef = policyNo || agencyPolicyRef;

    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Title level={4}>
          <WechatOutlined style={{ color: '#07c160', marginRight: 8 }} />
          微信扫码支付
        </Title>
        <div style={{ margin: '20px 0' }}>
          <QRCode
            value={paymentInfo.WeChatWebUrl}
            size={200}
            icon="/wechat-icon.png"
            iconSize={40}
          />
        </div>
        <Alert
          message="请使用微信扫描二维码完成支付"
          description={
            <div>
              <Text>支付金额：</Text>
              <Text strong style={{ fontSize: 20, color: '#f5222d' }}>¥{totalPremium}</Text>
            </div>
          }
          type="info"
          showIcon
        />
        <div style={{ marginTop: 16 }}>
          <Spin spinning={paymentStatus === 'checking'}>
            <Text type="secondary">
              {paymentStatus === 'checking' ? '等待支付中...' : ''}
            </Text>
          </Spin>
        </div>
        <div style={{ marginTop: 16 }}>
          <Button
            type="link"
            icon={<ReloadOutlined />}
            onClick={async () => {
              const success = await syncPaymentStatus(policyRef);
              if (!success) {
                message.warning('支付尚未完成，请完成支付后再试');
              }
            }}
          >
            已完成支付？点击刷新
          </Button>
        </div>
      </div>
    );
  };

  // 渲染支付成功
  const renderSuccess = () => (
    <Result
      status="success"
      title="支付成功！"
      subTitle="保单已生效，您可以在保单列表中查看详情"
      icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
    />
  );

  // 渲染支付失败
  const renderFailed = () => (
    <Result
      status="error"
      title="支付失败"
      subTitle={errorMessage || '创建支付订单失败，请重试'}
      extra={
        <Button type="primary" onClick={createPaymentOrder}>
          <ReloadOutlined /> 重新支付
        </Button>
      }
    />
  );

  return (
    <Modal
      title="微信支付"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={500}
      centered
    >
      <Spin spinning={loading} tip="正在创建支付订单...">
        {paymentStatus === 'pending' && <div style={{ height: 200 }} />}
        {paymentStatus === 'checking' && renderPaymentQRCode()}
        {paymentStatus === 'success' && renderSuccess()}
        {paymentStatus === 'failed' && renderFailed()}
      </Spin>
    </Modal>
  );
};

export default WechatPayModal;

