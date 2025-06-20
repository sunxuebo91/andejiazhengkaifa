import React, { useState, useEffect } from 'react';
import { Card, List, Button, Space, Typography, Spin, message, Modal, Input, Form, Divider, Tag } from 'antd';
import { 
  FileTextOutlined, 
  EditOutlined, 
  EyeOutlined, 
  SendOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import esignService, { Contract, SignatureRequest, CreateContractRequest } from '../../services/esignService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ESignaturePage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [templateFields, setTemplateFields] = useState<any[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [form] = Form.useForm();
  const [signForm] = Form.useForm();

  // 模板标识 - 根据您提供的信息
  const TEMPLATE_IDENT = 'TNF606E6D81E2D49C99CC983F4D0412276-3387';

  // 加载合同数据
  useEffect(() => {
    loadContracts();
    loadTemplateFields();
  }, []);

  // 加载模板控件信息
  const loadTemplateFields = async () => {
    setTemplateLoading(true);
    try {
      const response = await esignService.getTemplateData(TEMPLATE_IDENT);
      setTemplateFields(response);
      console.log('模板控件信息:', response);
    } catch (error) {
      console.error('加载模板控件信息失败:', error);
      message.error('加载模板控件信息失败');
    } finally {
      setTemplateLoading(false);
    }
  };

  const loadContracts = async () => {
    setLoading(true);
    try {
      const contractList = await esignService.getContracts();
      if (contractList.length === 0) {
        // 如果没有合同，使用模拟数据
        const mockContracts: Contract[] = [
          {
            id: '1',
            title: '劳动合同 - 张三',
            content: '这是一份劳动合同的内容...',
            status: 'draft',
            createdAt: '2024-01-15',
            updatedAt: '2024-01-15',
            createdBy: 'admin',
          },
          {
            id: '2',
            title: '保密协议 - 李四',
            content: '保密协议的详细内容...',
            status: 'pending',
            createdAt: '2024-01-14',
            updatedAt: '2024-01-14',
            createdBy: 'admin',
            signerName: '李四',
            signerEmail: 'lisi@example.com',
          },
          {
            id: '3',
            title: '购销合同 - 王五公司',
            content: '购销合同的具体条款...',
            status: 'signed',
            createdAt: '2024-01-13',
            updatedAt: '2024-01-16',
            createdBy: 'admin',
            signedAt: '2024-01-16',
            signerName: '王五',
            signerEmail: 'wangwu@example.com',
          },
        ];
        setContracts(mockContracts);
        setSelectedContract(mockContracts[0]);
      } else {
        setContracts(contractList);
        setSelectedContract(contractList[0]);
      }
    } catch (error) {
      console.error('加载合同失败:', error);
      message.error('加载合同失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'draft': return 'default';
      case 'pending': return 'processing';
      case 'signed': return 'success';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: Contract['status']) => {
    switch (status) {
      case 'draft': return '草稿';
      case 'pending': return '待签名';
      case 'signed': return '已签名';
      case 'expired': return '已过期';
      default: return '未知';
    }
  };

  const getStatusIcon = (status: Contract['status']) => {
    switch (status) {
      case 'draft': return <EditOutlined />;
      case 'pending': return <ClockCircleOutlined />;
      case 'signed': return <CheckCircleOutlined />;
      case 'expired': return <ExclamationCircleOutlined />;
      default: return <FileTextOutlined />;
    }
  };

  const handleCreateContract = async (values: CreateContractRequest) => {
    setLoading(true);
    try {
      // 自动计算大写金额
      const processedValues = {
        ...values,
        合同金额大写: values.合同金额 ? esignService.convertToChineseAmount(values.合同金额) : '',
      };
      
      const newContract = await esignService.createContract(processedValues);
      message.success('合同创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      await loadContracts(); // 重新加载合同列表
      setSelectedContract(newContract);
    } catch (error) {
      console.error('创建合同失败:', error);
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 监听数字金额变化，自动计算大写
  const handleAmountChange = (field: string, value: string) => {
    if (value && !isNaN(parseFloat(value))) {
      const chineseAmount = esignService.convertToChineseAmount(value);
      form.setFieldValue(field, chineseAmount);
    }
  };

  // 根据控件信息动态生成表单项
  const generateFormItems = () => {
    if (!templateFields || templateFields.length === 0) {
      return <div>加载模板控件信息中...</div>;
    }

    // 过滤文本输入控件（dataType: 1文本, 8多行文本）
    const textFields = templateFields.filter(field => field.dataType === 1 || field.dataType === 8);
    
    // 按页面分组
    const fieldsByPage = textFields.reduce((acc, field) => {
      if (!acc[field.page]) {
        acc[field.page] = [];
      }
      acc[field.page].push(field);
      return acc;
    }, {} as Record<number, any[]>);

    return Object.keys(fieldsByPage).map(pageKey => {
      const pageNumber = parseInt(pageKey);
      const pageFields = fieldsByPage[pageNumber];
      
      return (
        <div key={pageNumber}>
          <Divider orientation="left">第{pageNumber}页字段</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {pageFields.map((field: any, index: number) => {
              // 为重复字段添加页面标识符，确保唯一性
              const uniqueFieldName = `${field.dataKey}_page${pageNumber}_${index}`;
              const displayLabel = `${field.dataKey}${pageFields.filter((f: any) => f.dataKey === field.dataKey).length > 1 ? ` (第${pageNumber}页)` : ''}`;
              
              return (
                <Form.Item
                  key={uniqueFieldName}
                  name={uniqueFieldName}
                  label={displayLabel}
                  rules={field.required === 1 ? [{ required: true, message: `请输入${field.dataKey}` }] : []}
                >
                  {field.dataType === 8 ? (
                    <TextArea rows={3} placeholder={`请输入${field.dataKey}`} />
                  ) : (
                    <Input 
                      placeholder={`请输入${field.dataKey}`}
                      onChange={field.dataKey.includes('费') && !field.dataKey.includes('大写') ? 
                        (e) => {
                          // 查找对应的大写字段
                          const chineseField = templateFields.find(f => 
                            f.dataKey.includes('大写') && f.dataKey.includes(field.dataKey.replace(/费$/, ''))
                          );
                          if (chineseField) {
                            handleAmountChange(chineseField.dataKey, e.target.value);
                          }
                        } : undefined
                      }
                    />
                  )}
                </Form.Item>
              );
            })}
          </div>
        </div>
      );
    });
  };

  const handleSendSignature = async (values: SignatureRequest) => {
    setLoading(true);
    try {
      await esignService.sendSignatureRequest(values);
      message.success('签名请求已发送');
      setSignModalVisible(false);
      signForm.resetFields();
      await loadContracts(); // 重新加载合同列表
    } catch (error) {
      console.error('发送签名请求失败:', error);
      message.error('发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewContract = (contract: Contract) => {
    // 预览合同内容
    Modal.info({
      title: contract.title,
      content: (
        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          <Paragraph>{contract.content}</Paragraph>
        </div>
      ),
      width: 600,
    });
  };



  return (
    <div style={{ height: '100vh', display: 'flex', gap: '16px', padding: '16px' }}>
      {/* 左侧面板 - 合同列表 */}
      <div style={{ width: '400px', display: 'flex', flexDirection: 'column' }}>
        <Card 
          title="合同管理" 
          extra={
            <Button 
              type="primary" 
              onClick={() => setCreateModalVisible(true)}
            >
              新建合同
            </Button>
          }
          style={{ flex: 1, overflow: 'hidden' }}
          bodyStyle={{ padding: 0, height: 'calc(100% - 57px)', overflow: 'auto' }}
        >
          <List
            dataSource={contracts}
            renderItem={(contract) => (
              <List.Item
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: selectedContract?.id === contract.id ? '#f0f8ff' : 'transparent',
                  padding: '12px 16px',
                  borderLeft: selectedContract?.id === contract.id ? '3px solid #1890ff' : 'none'
                }}
                onClick={() => setSelectedContract(contract)}
              >
                <List.Item.Meta
                  avatar={getStatusIcon(contract.status)}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{contract.title}</Text>
                      <Tag color={getStatusColor(contract.status)}>
                        {getStatusText(contract.status)}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Text type="secondary">创建时间: {contract.createdAt}</Text>
                      {contract.signedAt && (
                        <div>
                          <Text type="secondary">签名时间: {contract.signedAt}</Text>
                        </div>
                      )}
                      {contract.signerName && (
                        <div>
                          <Text type="secondary">签名人: {contract.signerName}</Text>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </div>

      {/* 右侧面板 - 合同详情和操作 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedContract ? (
          <Card 
            title={selectedContract.title}
            extra={
              <Space>
                <Button 
                  icon={<EyeOutlined />}
                  onClick={() => handlePreviewContract(selectedContract)}
                >
                  预览
                </Button>
                {selectedContract.status === 'draft' && (
                  <Button 
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => setSignModalVisible(true)}
                  >
                    发送签名
                  </Button>
                )}
              </Space>
            }
            style={{ flex: 1, overflow: 'hidden' }}
            bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'auto' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* 合同基本信息 */}
              <div style={{ marginBottom: '16px' }}>
                <Title level={4}>合同信息</Title>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <Text strong>状态：</Text>
                    <Tag color={getStatusColor(selectedContract.status)} style={{ marginLeft: '8px' }}>
                      {getStatusIcon(selectedContract.status)} {getStatusText(selectedContract.status)}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>创建时间：</Text>
                    <Text style={{ marginLeft: '8px' }}>{selectedContract.createdAt}</Text>
                  </div>
                  {selectedContract.signerName && (
                    <>
                      <div>
                        <Text strong>签名人：</Text>
                        <Text style={{ marginLeft: '8px' }}>{selectedContract.signerName}</Text>
                      </div>
                      <div>
                        <Text strong>邮箱：</Text>
                        <Text style={{ marginLeft: '8px' }}>{selectedContract.signerEmail}</Text>
                      </div>
                    </>
                  )}
                  {selectedContract.signedAt && (
                    <div>
                      <Text strong>签名时间：</Text>
                      <Text style={{ marginLeft: '8px' }}>{selectedContract.signedAt}</Text>
                    </div>
                  )}
                </div>
              </div>

              <Divider />

              {/* 合同内容预览 */}
              <div style={{ flex: 1 }}>
                <Title level={4}>合同内容</Title>
                <div 
                  style={{ 
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    padding: '16px',
                    backgroundColor: '#fafafa',
                    height: '300px',
                    overflow: 'auto'
                  }}
                >
                  <Paragraph>{selectedContract.content}</Paragraph>
                </div>
              </div>

              {/* 操作按钮区域 */}
              {selectedContract.status === 'draft' && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                  <Title level={5}>操作</Title>
                  <Space>
                    <Button type="primary" icon={<SendOutlined />} onClick={() => setSignModalVisible(true)}>
                      发送签名请求
                    </Button>
                    <Button icon={<EditOutlined />}>
                      编辑合同
                    </Button>
                  </Space>
                </div>
              )}

              {selectedContract.status === 'pending' && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fff7e6', borderRadius: '6px' }}>
                  <Title level={5}>签名状态</Title>
                  <Text>签名请求已发送给 <Text strong>{selectedContract.signerName}</Text>，等待签名确认。</Text>
                </div>
              )}

              {selectedContract.status === 'signed' && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f6ffed', borderRadius: '6px' }}>
                  <Title level={5}>签名完成</Title>
                  <Text>合同已于 <Text strong>{selectedContract.signedAt}</Text> 完成签名。</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Button type="link">下载已签名合同</Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
              <Title level={4} type="secondary">请选择一个合同</Title>
              <Text type="secondary">从左侧列表中选择一个合同来查看详情</Text>
            </div>
          </Card>
        )}
      </div>

      {/* 创建合同弹窗 */}
      <Modal
        title="创建新合同"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={900}
        style={{ top: 20 }}
      >
        <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateContract}
          >
            {templateLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px' }}>加载模板控件信息中...</div>
              </div>
            ) : (
              <>
                <div style={{ 
                  backgroundColor: '#e6f7ff', 
                  border: '1px solid #91d5ff',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '24px'
                }}>
                  <Text strong>📋 模板控件说明</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Text type="secondary">
                      以下表单字段基于爱签模板 <Text code>{TEMPLATE_IDENT}</Text> 自动生成，
                      共加载到 {templateFields.length} 个控件信息。
                    </Text>
                  </div>
                </div>
                
                {generateFormItems()}
              </>
            )}

            <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
              <Space>
                <Button onClick={() => setCreateModalVisible(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  创建合同
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* 发送签名弹窗 */}
      <Modal
        title="发送签名请求"
        open={signModalVisible}
        onCancel={() => setSignModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={signForm}
          layout="vertical"
          onFinish={handleSendSignature}
          initialValues={{ contractId: selectedContract?.id }}
        >
          <Form.Item
            name="contractId"
            hidden
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="signerName"
            label="签名人姓名"
            rules={[{ required: true, message: '请输入签名人姓名' }]}
          >
            <Input placeholder="请输入签名人姓名" />
          </Form.Item>

          <Form.Item
            name="signerEmail"
            label="签名人邮箱"
            rules={[
              { required: true, message: '请输入签名人邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入签名人邮箱" />
          </Form.Item>

          <Form.Item
            name="message"
            label="附加消息"
          >
            <TextArea rows={3} placeholder="可选：给签名人的附加消息" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setSignModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                发送
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ESignaturePage; 