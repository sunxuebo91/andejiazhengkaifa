import React, { useEffect, useState } from 'react';
import { Card, Steps, Button, Spin, message, Result } from 'antd';
import { CheckCircleOutlined, CreditCardOutlined, FileTextOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';

const { Step } = Steps;

interface ContractInfo {
  contractId: string;
  customerName: string;
  amount: number;
  serviceFee: number;
  contractStatus: string;
}

const PaymentGuide: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (contractId) {
      fetchContractInfo();
    }
  }, [contractId]);

  const fetchContractInfo = async () => {
    try {
      setLoading(true);
      // 这里调用您的合同API获取合同信息
      const response = await fetch(`/api/contracts/${contractId}`);
      const data = await response.json();
      
      if (data.success) {
        setContractInfo(data.data);
        // 检查合同状态，如果已签约则进入支付步骤
        if (data.data.contractStatus === '已签约') {
          setCurrentStep(2);
        }
      } else {
        message.error('获取合同信息失败');
      }
    } catch (error) {
      console.error('获取合同信息失败:', error);
      message.error('获取合同信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (contractInfo) {
      // 跳转到支付页面
      navigate(`/payment/${contractInfo.contractId}`);
    }
  };

  const handleBackToContract = () => {
    if (contractInfo) {
      navigate(`/contract-detail/${contractInfo.contractId}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!contractInfo) {
    return (
      <Result
        status="error"
        title="合同信息获取失败"
        subTitle="请检查合同ID是否正确"
        extra={<Button type="primary" onClick={() => navigate('/contracts')}>返回合同列表</Button>}
      />
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card title="签约完成 - 支付引导" bordered={false}>
        <Steps current={currentStep} style={{ marginBottom: '32px' }}>
          <Step 
            title="合同签署" 
            description="电子合同签署"
            icon={<FileTextOutlined />}
          />
          <Step 
            title="签约完成" 
            description="合同生效"
            icon={<CheckCircleOutlined />}
          />
          <Step 
            title="支付服务费" 
            description="完成支付"
            icon={<CreditCardOutlined />}
          />
        </Steps>

        <div style={{ background: '#f5f5f5', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3>🎉 恭喜！合同签署成功</h3>
          <div style={{ marginTop: '16px' }}>
            <p><strong>客户姓名：</strong>{contractInfo.customerName}</p>
            <p><strong>合同编号：</strong>{contractInfo.contractId}</p>
            <p><strong>服务金额：</strong>¥{contractInfo.amount.toFixed(2)}</p>
            <p><strong>服务费：</strong><span style={{ color: '#ff4d4f', fontSize: '18px', fontWeight: 'bold' }}>¥{contractInfo.serviceFee.toFixed(2)}</span></p>
          </div>
        </div>

        <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', padding: '16px', borderRadius: '6px', marginBottom: '24px' }}>
          <h4 style={{ color: '#1890ff', margin: '0 0 8px 0' }}>💡 支付说明</h4>
          <p style={{ margin: 0, color: '#666' }}>
            为了确保服务质量，请在合同签署后24小时内完成服务费支付。支付完成后，我们将立即为您安排服务人员。
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Button 
            type="primary" 
            size="large" 
            onClick={handlePayment}
            style={{ marginRight: '16px', minWidth: '120px' }}
          >
            立即支付 ¥{contractInfo.serviceFee.toFixed(2)}
          </Button>
          <Button 
            size="large" 
            onClick={handleBackToContract}
            style={{ minWidth: '120px' }}
          >
            查看合同详情
          </Button>
        </div>

        <div style={{ marginTop: '32px', padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
          <h4>支持的支付方式：</h4>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', background: '#52c41a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', margin: '0 auto 8px' }}>
                微
              </div>
              <span>微信支付</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', background: '#1890ff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', margin: '0 auto 8px' }}>
                支
              </div>
              <span>支付宝</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', background: '#722ed1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', margin: '0 auto 8px' }}>
                银
              </div>
              <span>银行卡</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentGuide; 