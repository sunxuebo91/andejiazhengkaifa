import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Spin, 
  message, 
  Steps, 
  Result,
  Descriptions,
  Alert,
  Form,
  Input,
  Checkbox
} from 'antd';
import { 
  FileTextOutlined, 
  SafetyOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import esignService from '../../services/esignService';

const { Title, Paragraph } = Typography;
const { Step } = Steps;

interface ContractInfo {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  signerName?: string;
  signerEmail?: string;
}

const SignContractPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [signLoading, setSignLoading] = useState(false);
  const [signForm] = Form.useForm();
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (contractId) {
      loadContractInfo();
    }
  }, [contractId]);

  const loadContractInfo = async () => {
    setLoading(true);
    try {
      // 这里应该调用实际的API获取合同信息
      // const contractInfo = await esignService.getContractById(contractId);
      
      // 模拟合同数据
      const mockContract: ContractInfo = {
        id: contractId || '1',
        title: '服务合同 - 张三',
        content: `合同编号: CONTRACT_${contractId}
甲方: 某某公司
乙方: 张三
服务内容: 软件开发服务
合同金额: 50000元
合同期限: 2024年1月1日至2024年12月31日

详细条款:
1. 服务范围：乙方为甲方提供软件开发服务
2. 服务期限：自合同签署之日起12个月
3. 服务费用：总计人民币伍万元整
4. 付款方式：项目完成后一次性支付
5. 违约责任：如一方违约，应承担相应法律责任

本合同一式两份，甲乙双方各执一份，具有同等法律效力。`,
        status: 'pending',
        createdAt: '2024-01-15',
        signerName: '张三',
        signerEmail: 'zhangsan@example.com'
      };
      
      setContract(mockContract);
    } catch (error) {
      console.error('加载合同信息失败:', error);
      message.error('加载合同信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (values: any) => {
    setSignLoading(true);
    try {
      // 调用签署API
      const signResult = await esignService.signContract({
        contractId: contractId!,
        signerName: values.signerName,
        signerIdCard: values.signerIdCard,
        signatureMethod: 'SMS' // 短信验证码签署
      });

      if (signResult.success) {
        setCurrentStep(2); // 跳转到完成步骤
        message.success('合同签署成功！');
      } else {
        throw new Error(signResult.message || '签署失败');
      }
    } catch (error) {
      console.error('签署失败:', error);
      message.error((error as Error)?.message || '签署失败');
    } finally {
      setSignLoading(false);
    }
  };

  const handleBackToList = () => {
    navigate('/esign');
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!contract) {
    return (
      <Result
        status="404"
        title="合同不存在"
        subTitle="抱歉，您访问的合同不存在或已被删除。"
        extra={
          <Button type="primary" onClick={handleBackToList}>
            返回合同列表
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* 头部导航 */}
        <div style={{ marginBottom: '24px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBackToList}
            style={{ marginBottom: '16px' }}
          >
            返回合同列表
          </Button>
          <Title level={2}>
            <Space>
              <FileTextOutlined />
              在线签署合同
            </Space>
          </Title>
        </div>

        {/* 步骤指示器 */}
        <Card style={{ marginBottom: '24px' }}>
          <Steps current={currentStep}>
            <Step title="查看合同" description="仔细阅读合同内容" />
            <Step title="确认签署" description="填写签署信息" />
            <Step title="签署完成" description="合同签署成功" />
          </Steps>
        </Card>

        {/* 步骤内容 */}
        {currentStep === 0 && (
          <Card title="合同详情" style={{ marginBottom: '24px' }}>
            <Descriptions bordered column={2} style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="合同标题" span={2}>
                {contract.title}
              </Descriptions.Item>
              <Descriptions.Item label="合同编号">
                {contract.id}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {contract.createdAt}
              </Descriptions.Item>
              <Descriptions.Item label="签署人">
                {contract.signerName}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                {contract.signerEmail}
              </Descriptions.Item>
            </Descriptions>

            <Alert
              message="请仔细阅读合同内容"
              description="请认真阅读以下合同条款，确认无误后方可进行签署。"
              type="info"
              style={{ marginBottom: '16px' }}
            />

            <div style={{ 
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              padding: '16px',
              backgroundColor: '#fafafa',
              maxHeight: '400px',
              overflow: 'auto',
              marginBottom: '24px'
            }}>
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                {contract.content}
              </Paragraph>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Space>
                <Checkbox 
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                >
                  我已仔细阅读并同意上述合同条款
                </Checkbox>
              </Space>
              <div style={{ marginTop: '16px' }}>
                <Button 
                  type="primary" 
                  size="large"
                  disabled={!agreed}
                  onClick={() => setCurrentStep(1)}
                >
                  确认并继续签署
                </Button>
              </div>
            </div>
          </Card>
        )}

        {currentStep === 1 && (
          <Card title="签署确认" style={{ marginBottom: '24px' }}>
            <Alert
              message="身份验证"
              description="请填写您的真实信息进行身份验证，确保签署的法律有效性。"
              type="warning"
              style={{ marginBottom: '24px' }}
            />

            <Form
              form={signForm}
              layout="vertical"
              onFinish={handleSign}
              initialValues={{
                signerName: contract.signerName,
                contractTitle: contract.title
              }}
            >
              <Form.Item
                name="contractTitle"
                label="合同标题"
              >
                <Input disabled />
              </Form.Item>

              <Form.Item
                name="signerName"
                label="签署人姓名"
                rules={[{ required: true, message: '请输入签署人姓名' }]}
              >
                <Input placeholder="请输入您的真实姓名" />
              </Form.Item>

              <Form.Item
                name="signerIdCard"
                label="身份证号码"
                rules={[
                  { required: true, message: '请输入身份证号码' },
                  { 
                    pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
                    message: '请输入正确的身份证号码格式'
                  }
                ]}
              >
                <Input placeholder="请输入18位身份证号码" />
              </Form.Item>

              <Alert
                message="签署说明"
                                 description="点击立即签署后，系统将发送短信验证码到您的注册手机号进行身份验证，验证通过后合同即签署成功。"
                type="info"
                style={{ marginBottom: '24px' }}
              />

              <div style={{ textAlign: 'center' }}>
                <Space>
                  <Button onClick={() => setCurrentStep(0)}>
                    返回上一步
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    size="large"
                    loading={signLoading}
                    icon={<SafetyOutlined />}
                  >
                    立即签署
                  </Button>
                </Space>
              </div>
            </Form>
          </Card>
        )}

        {currentStep === 2 && (
          <Result
            status="success"
            title="合同签署成功！"
            subTitle={`合同《${contract.title}》已成功签署，具有法律效力。`}
            extra={[
              <Button type="primary" key="download">
                下载已签署合同
              </Button>,
              <Button key="back" onClick={handleBackToList}>
                返回合同列表
              </Button>,
            ]}
          >
            <div style={{ backgroundColor: '#fafafa', padding: '16px', borderRadius: '6px' }}>
              <Descriptions title="签署信息" size="small">
                <Descriptions.Item label="签署时间">
                  {new Date().toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="签署人">
                  {contract.signerName}
                </Descriptions.Item>
                <Descriptions.Item label="签署方式">
                  短信验证码签署
                </Descriptions.Item>
                <Descriptions.Item label="合同状态">
                  已签署
                </Descriptions.Item>
              </Descriptions>
            </div>
          </Result>
        )}
      </div>
    </div>
  );
};

export default SignContractPage; 