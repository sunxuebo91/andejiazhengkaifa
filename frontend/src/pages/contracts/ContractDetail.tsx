import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  message,
  Spin,
  Row,
  Col,
  Divider,
  Alert,
  Modal,
  Typography,
  App,
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  EyeOutlined,
  DownloadOutlined,
  FileTextOutlined,
  CopyOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { contractService } from '../../services/contractService';
import { Contract, ContractType } from '../../types/contract.types';
import EditContractModal from '../../components/EditContractModal';
import ContractStatusCard, { ContractStatusInfo } from '../../components/ContractStatusCard';
import dayjs from 'dayjs';

interface EsignInfo {
  contractNo: string;
  templateNo?: string;
  status?: any;
  preview?: any;
  statusError?: string;
  previewError?: string;
}

const ContractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // 爱签相关状态
  const [esignInfo, setEsignInfo] = useState<EsignInfo | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  
  // 新增：合同状态信息
  const [contractStatusInfo, setContractStatusInfo] = useState<ContractStatusInfo | null>(null);

  // 处理合同状态变化
  const handleStatusChange = (statusInfo: ContractStatusInfo | null) => {
    setContractStatusInfo(statusInfo);
  };

  useEffect(() => {
    fetchContractDetail();
  }, [id]);

  useEffect(() => {
    if (contract?.esignContractNo) {
      fetchEsignInfo();
    }
  }, [contract]);

  const fetchContractDetail = async () => {
    if (!id) {
      message.error('无效的合同ID');
      navigate('/contracts');
      return;
    }

    try {
      setLoading(true);
      const response = await contractService.getContractById(id);
      setContract(response);
    } catch (error) {
      console.error('获取合同详情失败:', error);
      message.error('获取合同详情失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchEsignInfo = async () => {
    if (!id) return;
    
    try {
      const response = await contractService.getEsignInfo(id);
      setEsignInfo(response);
    } catch (error) {
      console.error('获取爱签信息失败:', error);
    }
  };

  const handlePreviewContract = async () => {
    if (!contract?.esignContractNo) {
      message.warning('该合同暂无爱签合同编号，无法预览');
      return;
    }

    try {
      message.loading({ content: '正在生成合同预览...', key: 'preview' });
      
      // 调用预览合同API
      const response = await contractService.previewContract(contract.esignContractNo);
      
      message.destroy('preview');
      
      if (response.success) {
        // 根据合同状态处理不同的预览逻辑
        if (response.shouldDownload || response.contractStatus === 2) {
          // 签约完成状态：显示下载提示
          modal.confirm({
            title: '✅ 合同已签约完成',
            width: 600,
            content: (
              <div>
                <Alert 
                  type="success" 
                  message="合同签署完成" 
                  description="合同已完成所有签署，具有法律效力。建议下载合同PDF文件进行查看和保存。"
                  style={{ marginBottom: 16 }}
                />
                <p><strong>合同编号:</strong> {response.contractNo}</p>
                <p><strong>状态:</strong> {response.statusText || '已签约'}</p>
                <p><strong>推荐格式:</strong> PDF文件（完整签署版本）</p>
                {response.previewInfo?.availableFormats && (
                  <div style={{ marginTop: 12 }}>
                    <p><strong>可用下载格式:</strong></p>
                    <ul>
                      {response.previewInfo.availableFormats.map((format: any, index: number) => (
                        <li key={index}>
                          {format.name} {format.recommended && <span style={{ color: '#52c41a' }}>(推荐)</span>}
                          {format.description && <span style={{ color: '#666' }}> - {format.description}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ),
            okText: '立即下载',
            cancelText: '稍后下载',
            onOk: () => {
              handleDownloadContract();
            },
          });
        } else if (response.contractStatus === 1) {
          // 签约中状态：可以预览当前签署进度
          if (response.previewData) {
            const previewUrl = `data:application/pdf;base64,${response.previewData}`;
            window.open(previewUrl, '_blank');
            message.success('合同预览已打开（当前签署状态）');
          } else {
            modal.info({
              title: '📝 合同签约中',
              width: 600,
              content: (
                <div>
                  <Alert 
                    type="info" 
                    message="合同正在签署中" 
                    description="合同尚未完成所有签署，可以预览当前签署进度。"
                    style={{ marginBottom: 16 }}
                  />
                  <p><strong>合同编号:</strong> {response.contractNo}</p>
                  <p><strong>状态:</strong> {response.statusText || '签约中'}</p>
                  <p><strong>说明:</strong> {response.previewInfo?.recommendation}</p>
                </div>
              ),
            });
          }
        } else if (response.previewUrl) {
          // 有预览链接，直接打开
          window.open(response.previewUrl, '_blank');
          message.success('合同预览已打开');
        } else if (response.previewData) {
          // 有预览数据，显示预览
          const previewUrl = `data:application/pdf;base64,${response.previewData}`;
          window.open(previewUrl, '_blank');
          message.success('合同预览已打开');
        } else if (response.fallbackMode) {
          // 回退模式：根据状态显示不同信息
          const statusText = response.statusText || '未知状态';
          const recommendation = response.previewInfo?.recommendation || '请联系管理员处理';
          
          modal.info({
            title: `合同状态：${statusText}`,
            width: 600,
            content: (
              <div>
                <p><strong>合同编号:</strong> {response.contractNo}</p>
                <p><strong>当前状态:</strong> {statusText}</p>
                <p><strong>建议:</strong> {recommendation}</p>
                
                {response.previewInfo?.canDownload && (
                  <div style={{ marginTop: 16 }}>
                    <Alert 
                      type="info" 
                      message="可以下载合同" 
                      description="虽然无法在线预览，但可以下载合同文件查看。"
                    />
                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                      <Button type="primary" onClick={handleDownloadContract}>
                        下载合同
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ),
          });
        } else {
          message.info(response.message || '预览生成成功，但无法显示');
        }
      } else {
        // 失败情况的处理
        const statusText = response.statusText || '未知状态';
        if (response.contractStatus === 2) {
          // 即使失败，如果是签约完成状态，仍然提示下载
          modal.confirm({
            title: '无法预览，建议下载',
            width: 600,
            content: (
              <div>
                <Alert 
                  type="warning" 
                  message="预览功能不可用" 
                  description="无法生成在线预览，但合同已签约完成，可以下载查看。"
                  style={{ marginBottom: 16 }}
                />
                <p><strong>合同状态:</strong> {statusText}</p>
                <p><strong>错误信息:</strong> {response.message}</p>
              </div>
            ),
            okText: '下载合同',
            cancelText: '取消',
            onOk: () => {
              handleDownloadContract();
            },
          });
        } else {
          // 其他状态的失败处理
          modal.warning({
            title: '预览合同',
            width: 600,
            content: (
              <div>
                <p><strong>合同编号:</strong> {contract.esignContractNo}</p>
                <p><strong>合同状态:</strong> {statusText}</p>
                <p><strong>预览失败原因:</strong> {response.message}</p>
                <Alert 
                  type="warning" 
                  message="预览功能暂时不可用" 
                  description="这通常是因为签署方尚未在爱签平台注册，或合同状态不支持预览。您可以稍后重试，或使用下载功能获取合同文件。"
                  style={{ marginTop: 16 }}
                />
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Button 
                    type="primary" 
                    onClick={() => {
                      handleDownloadContract();
                    }}
                  >
                    尝试下载合同
                  </Button>
                </div>
              </div>
            ),
          });
        }
      }
    } catch (error) {
      message.destroy('preview');
      console.error('预览合同失败:', error);
      
      // 检查错误响应中是否包含合同状态信息
      const errorResponse = (error as any).response?.data;
      
      if (errorResponse && errorResponse.contractStatus === 2) {
        // 如果是签约完成状态，即使出错也提示下载
        modal.confirm({
          title: '✅ 合同已签约完成',
          width: 600,
          content: (
            <div>
              <Alert 
                type="warning" 
                message="预览服务暂时不可用" 
                description="无法连接到预览服务，但合同已签约完成，具有法律效力。建议直接下载合同查看。"
                style={{ marginBottom: 16 }}
              />
              <p><strong>合同状态:</strong> {errorResponse.statusText || '已签约'}</p>
              <p><strong>建议:</strong> {errorResponse.previewInfo?.recommendation || '下载PDF文件查看完整签署版本'}</p>
            </div>
          ),
          okText: '立即下载',
          cancelText: '稍后下载',
          onOk: () => {
            handleDownloadContract();
          },
        });
      } else if (errorResponse && errorResponse.contractStatus) {
        // 其他状态的错误处理
        const statusText = errorResponse.statusText || '未知状态';
        modal.warning({
          title: '预览合同失败',
          width: 600,
          content: (
            <div>
              <p><strong>合同编号:</strong> {contract?.esignContractNo}</p>
              <p><strong>合同状态:</strong> {statusText}</p>
              <p><strong>错误原因:</strong> 无法连接到预览服务</p>
              <Alert 
                type="info" 
                message="建议操作" 
                description={errorResponse.previewInfo?.recommendation || '请稍后重试，或联系管理员处理'}
                style={{ marginTop: 16 }}
              />
              {errorResponse.previewInfo?.canDownload && (
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Button 
                    type="primary" 
                    onClick={() => {
                      handleDownloadContract();
                    }}
                  >
                    尝试下载合同
                  </Button>
                </div>
              )}
            </div>
          ),
        });
      } else {
        // 完全无法获取状态信息的情况
        modal.error({
          title: '预览合同失败',
          content: (
            <div>
              <p>无法连接到预览服务，请稍后重试。</p>
              <p>您也可以尝试下载合同文件查看内容。</p>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Button 
                  type="primary" 
                  onClick={() => {
                    handleDownloadContract();
                  }}
                >
                  下载合同
                </Button>
              </div>
            </div>
          ),
        });
      }
    }
  };

  const handleDownloadContract = async () => {
    if (!id) return;

    try {
      setDownloadLoading(true);
      const response = await contractService.downloadContract(id, {
        force: 1,
        downloadFileType: 1
      });

      if (response.success && response.data) {
        const downloadData = response.data.data;
        
        if (downloadData?.data && downloadData?.downloadInfo?.isBase64) {
          // 处理base64下载
          const fileName = downloadData.downloadInfo.fileName || `${esignInfo?.contractNo}.pdf`;
          const byteCharacters = atob(downloadData.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          window.URL.revokeObjectURL(url);
          
          message.success(`合同下载成功：${fileName}`);
        } else if (downloadData?.downloadUrl) {
          window.open(downloadData.downloadUrl, '_blank');
          message.success('合同下载链接已打开');
        } else {
          message.info('下载请求已提交，请稍候');
        }
      } else {
        message.error(response.message || '合同下载失败');
      }
    } catch (error) {
      console.error('下载合同失败:', error);
      message.error('下载合同失败');
    } finally {
      setDownloadLoading(false);
    }
  };

  const [signUrlModalVisible, setSignUrlModalVisible] = useState(false);
  const [signUrls, setSignUrls] = useState<any[]>([]);
  const [signUrlLoading, setSignUrlLoading] = useState(false);

  const getStatusText = (status: number): string => {
    const statusMap: Record<number, string> = {
      0: '等待签约',
      1: '签约中',
      2: '已签约',
      3: '过期',
      4: '拒签',
      6: '作废',
      7: '撤销'
    };
    return statusMap[status] || '未知状态';
  };

  const handleRefreshSignUrls = async () => {
    if (!contract) return;
    
    try {
      setSignUrlLoading(true);
      
      // 尝试重新添加签署方获取链接（会返回100074，但我们可以从错误中获取信息）
      const signersData = {
        contractNo: contract.esignContractNo,
        signers: [
          {
            account: contract.customerPhone,
            name: contract.customerName,
            mobile: contract.customerPhone,
            signType: 'manual',
            validateType: 'sms'
          },
          {
            account: contract.workerPhone,
            name: contract.workerName,
            mobile: contract.workerPhone,
            signType: 'manual',
            validateType: 'sms'
          }
        ],
        signOrder: 'parallel'
      };

      console.log('🔄 尝试重新获取签署链接:', signersData);
      
      // 调用爱签API
      const response = await fetch('/api/esign/add-signers-simple', {
        method: 'POST',
                 headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
         },
        body: JSON.stringify(signersData)
      });
      
      const result = await response.json();
      console.log('📊 重新添加签署方结果:', result);
      
      if (result.data?.signUser && result.data.signUser.length > 0) {
        // 成功获取到签署链接
        const realSignUrls = result.data.signUser.map((user: any, index: number) => ({
          name: user.name,
          mobile: user.account,
          role: index === 0 ? '甲方（客户）' : '乙方（服务人员）',
          signUrl: user.signUrl,
          account: user.account,
          signOrder: user.signOrder
        }));
        
        setSignUrls(realSignUrls);
        
        // 同时保存到本地数据库
        if (contract._id) {
          await contractService.updateContract(contract._id, {
            esignSignUrls: JSON.stringify(realSignUrls)
          });
        }
        
        message.success('签署链接获取成功');
        console.log('✅ 签署链接已获取并保存:', realSignUrls);
      } else {
        message.warning('无法获取签署链接，合同可能已完成签署或状态异常');
      }
    } catch (error) {
      console.error('❌ 刷新签署链接失败:', error);
      message.error('获取签署链接失败，请稍后重试');
    } finally {
      setSignUrlLoading(false);
    }
  };

  const handleOpenSignUrl = async () => {
    if (!contract) {
      message.error('合同信息不存在');
      return;
    }

    if (!contract.esignContractNo) {
      message.warning('该合同暂无爱签合同编号，无法获取签署链接');
      return;
    }

    setSignUrlModalVisible(true);
    setSignUrlLoading(true);

    try {
      // 🔥 直接使用本地保存的真实签署链接
      if (contract.esignSignUrls) {
        try {
          const realSignUrls = JSON.parse(contract.esignSignUrls);
          setSignUrls(realSignUrls);
          message.success('签署链接获取成功');
          console.log('✅ 使用本地保存的真实签署链接:', realSignUrls);
        } catch (parseError) {
          console.error('❌ 解析签署链接失败:', parseError);
          throw new Error('签署链接格式错误');
        }
      } else {
        // 如果没有保存的签署链接，尝试从爱签平台获取
        console.log('🔄 本地无签署链接，尝试从爱签平台获取...');
        try {
                     // 先查询合同状态
           const statusResponse = await contractService.getEsignInfo(contract.esignContractNo);
           console.log('📊 爱签合同状态查询结果:', statusResponse);
           
           if (statusResponse.status && statusResponse.status.success) {
             const statusInfo = statusResponse.status;
            
            // 根据合同状态判断
            if (statusInfo.data?.status === 2) {
              // 合同已签署完成
              message.info('该合同已签署完成，无需再次签署');
              setSignUrlModalVisible(false);
              return;
                         } else if (statusInfo.data?.status === 0 || statusInfo.data?.status === 1) {
               // 合同等待签署或签署中，尝试重新添加签署方获取链接
               message.info('正在尝试获取签署链接...');
               await handleRefreshSignUrls();
               return;
             } else {
               // 其他状态（过期、拒签、作废等）
               const statusText = getStatusText(statusInfo.data?.status);
               message.warning(`合同状态异常：${statusText}，无法获取签署链接`);
               setSignUrlModalVisible(false);
               return;
             }
          } else {
            // 合同状态查询失败，可能是合同不存在或已删除
            message.warning('该合同在爱签平台上不存在或已被删除，无法获取签署链接');
            setSignUrlModalVisible(false);
            return;
          }
        } catch (error) {
          console.error('❌ 查询爱签合同状态失败:', error);
          message.warning('该合同尚未生成签署链接，请先在爱签页面完成步骤3（添加签署方）');
          setSignUrlModalVisible(false);
          return;
        }
      }
    } catch (error) {
      console.error('获取签署链接失败:', error);
      message.error('获取签署链接失败，请稍后重试');
      setSignUrlModalVisible(false);
    } finally {
      setSignUrlLoading(false);
    }
  };



  const handleBack = () => {
    navigate('/contracts');
  };

  const handleEdit = () => {
    setEditModalVisible(true);
  };

  const handleEditSuccess = () => {
    setEditModalVisible(false);
    fetchContractDetail(); // 重新获取合同详情
  };

  const getContractTypeColor = (type: ContractType) => {
    const colors: Record<ContractType, string> = {
      [ContractType.YUEXIN]: 'purple',
      [ContractType.ZHUJIA_YUER]: 'green',
      [ContractType.BAOJIE]: 'blue',
      [ContractType.ZHUJIA_BAOMU]: 'orange',
      [ContractType.YANGCHONG]: 'cyan',
      [ContractType.XIAOSHI]: 'geekblue',
      [ContractType.BAIBAN_YUER]: 'lime',
      [ContractType.BAIBAN_BAOMU]: 'gold',
      [ContractType.ZHUJIA_HULAO]: 'magenta',
    };
    return colors[type] || 'default';
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('YYYY年MM月DD日');
  };

  const formatDateTime = (dateString: string) => {
    return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss');
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '24px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3>合同不存在</h3>
            <Button type="primary" onClick={handleBack}>
              返回合同列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
            >
              返回
            </Button>
            <span>合同详情 - {contract.contractNumber}</span>
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={<EyeOutlined />}
              onClick={handlePreviewContract}
              disabled={!contract.esignContractNo}
            >
              预览合同
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              onClick={handleDownloadContract}
              loading={downloadLoading}
              disabled={!contract.esignContractNo}
            >
              下载合同
            </Button>
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              编辑合同
            </Button>
          </Space>
        }
      >
        <Row gutter={24}>
          {/* 爱签状态信息卡片 - 使用共享组件 */}
          {contract.esignContractNo && (
            <Col span={24}>
              <ContractStatusCard
                contractNo={contract.esignContractNo}
                contractName={contract.contractNumber}
                showRefreshButton={true}
                autoRefresh={false}
                size="default"
                style={{ marginBottom: '16px' }}
                onStatusChange={handleStatusChange}
                title="电子合同状态信息"
              />
            </Col>
          )}



          {/* 合同基本信息 */}
          <Col span={24}>
            <Card type="inner" title="合同基本信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={3} bordered>
                <Descriptions.Item label="合同编号" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                    {contract.contractNumber}
                  </span>
                </Descriptions.Item>
                
                <Descriptions.Item label="合同类型" span={1}>
                  <Tag color={getContractTypeColor(contract.contractType)}>
                    {contract.contractType}
                  </Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label="合同状态" span={1}>
                  {contractStatusInfo ? (
                    <Tag color={contractStatusInfo.statusColor}>
                      {contractStatusInfo.statusText}
                    </Tag>
                  ) : (
                    <Tag color="default">查询中...</Tag>
                  )}
                </Descriptions.Item>
                
                <Descriptions.Item label="服务开始日期" span={1}>
                  <span style={{ fontWeight: 'bold' }}>
                    {formatDate(contract.startDate)}
                  </span>
                </Descriptions.Item>
                
                <Descriptions.Item label="服务结束日期" span={1}>
                  <span style={{ fontWeight: 'bold' }}>
                    {formatDate(contract.endDate)}
                  </span>
                </Descriptions.Item>
                
                <Descriptions.Item label="服务期限" span={1}>
                  <span style={{ color: '#52c41a' }}>
                    {dayjs(contract.endDate).diff(dayjs(contract.startDate), 'day') + 1} 天
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 客户信息 */}
          <Col span={12}>
            <Card type="inner" title="客户信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="客户姓名">
                  <span style={{ fontWeight: 'bold' }}>{contract.customerName}</span>
                </Descriptions.Item>
                
                <Descriptions.Item label="联系电话">
                  {contract.customerPhone}
                </Descriptions.Item>
                
                <Descriptions.Item label="身份证号">
                  {contract.customerIdCard ? 
                    `${contract.customerIdCard.slice(0, 6)}****${contract.customerIdCard.slice(-4)}` : 
                    '未提供'
                  }
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 服务人员信息 */}
          <Col span={12}>
            <Card type="inner" title="服务人员信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="服务人员姓名">
                  <span style={{ fontWeight: 'bold' }}>{contract.workerName}</span>
                </Descriptions.Item>
                
                <Descriptions.Item label="联系电话">
                  {contract.workerPhone}
                </Descriptions.Item>
                
                <Descriptions.Item label="身份证号">
                  {contract.workerIdCard ? 
                    `${contract.workerIdCard.slice(0, 6)}****${contract.workerIdCard.slice(-4)}` : 
                    '未提供'
                  }
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 费用信息 */}
          <Col span={24}>
            <Card type="inner" title="费用信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={3} bordered>
                <Descriptions.Item label="家政员工资" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#52c41a', fontSize: '16px' }}>
                    ¥{contract.workerSalary?.toLocaleString()}
                  </span>
                </Descriptions.Item>
                
                <Descriptions.Item label="客户服务费" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '16px' }}>
                    ¥{contract.customerServiceFee?.toLocaleString()}
                  </span>
                </Descriptions.Item>
                
                <Descriptions.Item label="家政员服务费" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#722ed1', fontSize: '16px' }}>
                    {contract.workerServiceFee ? 
                      `¥${contract.workerServiceFee.toLocaleString()}` : 
                      '无'
                    }
                  </span>
                </Descriptions.Item>
                
                {contract.deposit && (
                  <Descriptions.Item label="约定定金" span={1}>
                    <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>
                      ¥{contract.deposit.toLocaleString()}
                    </span>
                  </Descriptions.Item>
                )}
                
                {contract.finalPayment && (
                  <Descriptions.Item label="约定尾款" span={1}>
                    <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>
                      ¥{contract.finalPayment.toLocaleString()}
                    </span>
                  </Descriptions.Item>
                )}
                
                <Descriptions.Item label="费用总计" span={1}>
                  <span style={{ fontWeight: 'bold', color: '#f5222d', fontSize: '18px' }}>
                    ¥{(
                      contract.workerSalary + 
                      contract.customerServiceFee + 
                      (contract.workerServiceFee || 0)
                    ).toLocaleString()}
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 其他信息 */}
          <Col span={24}>
            <Card type="inner" title="其他信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={3} bordered>
                {contract.expectedDeliveryDate && (
                  <Descriptions.Item label="预产期" span={1}>
                    <span style={{ color: '#eb2f96' }}>
                      {formatDate(contract.expectedDeliveryDate)}
                    </span>
                  </Descriptions.Item>
                )}
                
                {contract.salaryPaymentDay && (
                  <Descriptions.Item label="工资发放日" span={1}>
                    每月 {contract.salaryPaymentDay} 日
                  </Descriptions.Item>
                )}
                
                {contract.monthlyWorkDays && (
                  <Descriptions.Item label="月工作天数" span={1}>
                    {contract.monthlyWorkDays} 天
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>

          {/* 备注信息 */}
          {contract.remarks && (
            <Col span={24}>
              <Card type="inner" title="备注信息" style={{ marginBottom: '16px' }}>
                <Descriptions column={1} bordered>
                  <Descriptions.Item label="备注">
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {contract.remarks}
                    </div>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          )}

          {/* 系统信息 */}
          <Col span={24}>
            <Card type="inner" title="系统信息" style={{ marginBottom: '16px' }}>
              <Descriptions column={2} bordered>
                <Descriptions.Item label="创建人" span={1}>
                  {typeof contract.createdBy === 'string' ? contract.createdBy : '未知'}
                </Descriptions.Item>
                
                <Descriptions.Item label="创建时间" span={1}>
                  {formatDateTime(contract.createdAt)}
                </Descriptions.Item>
                
                <Descriptions.Item label="最后更新时间" span={2}>
                  {formatDateTime(contract.updatedAt)}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        {/* 操作按钮 */}
        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Space size="large">
            <Button size="large" onClick={handleBack}>
              返回合同列表
            </Button>
            <Button 
              type="primary" 
              size="large" 
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              编辑合同
            </Button>
          </Space>
        </div>
      </Card>

      {/* 签署链接弹窗 - 复用爱签页面步骤4的UI */}
      <Modal
        title="合同签署链接"
        open={signUrlModalVisible}
        onCancel={() => setSignUrlModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSignUrlModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <Spin spinning={signUrlLoading}>
          <div style={{ padding: '20px 0' }}>
            <Alert
              message="签署链接已生成"
              description="请将相应的签署链接发送给对应的签署方进行合同签署"
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
            />
            
            <Row gutter={[16, 16]}>
              {signUrls.map((signUrl, index) => (
                <Col span={24} key={index}>
                  <Card
                    size="small"
                    title={
                      <Space>
                        <FileTextOutlined />
                        <Typography.Text strong>{signUrl.role}</Typography.Text>
                      </Space>
                    }
                    extra={
                      <Space>
                        <Button
                          type="primary"
                          icon={<LinkOutlined />}
                          onClick={() => {
                            window.open(signUrl.signUrl, '_blank');
                            message.success('签署链接已打开');
                          }}
                        >
                          打开签署链接
                        </Button>
                        <Button
                          icon={<CopyOutlined />}
                          onClick={() => {
                            navigator.clipboard.writeText(signUrl.signUrl);
                            message.success('签署链接已复制到剪贴板');
                          }}
                        >
                          复制链接
                        </Button>
                      </Space>
                    }
                  >
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="姓名">
                        {signUrl.name}
                      </Descriptions.Item>
                      <Descriptions.Item label="手机号">
                        {signUrl.mobile}
                      </Descriptions.Item>
                      <Descriptions.Item label="签署账号">
                        {signUrl.account}
                      </Descriptions.Item>
                      <Descriptions.Item label="签署链接">
                        <Typography.Text 
                          copyable={{ 
                            text: signUrl.signUrl,
                            onCopy: () => message.success('链接已复制')
                          }}
                          style={{ 
                            maxWidth: 300, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'inline-block'
                          }}
                        >
                          {signUrl.signUrl}
                        </Typography.Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              ))}
            </Row>

            {signUrls.length > 0 && (
              <Alert
                message="温馨提示"
                description={
                  <div>
                    <p>• 请确保签署方使用正确的手机号进行签署</p>
                    <p>• 签署链接有效期为30天，请及时完成签署</p>
                    <p>• 如有问题，请联系客服协助处理</p>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        </Spin>
      </Modal>

      {/* 编辑合同模态框 */}
      {contract && (
        <EditContractModal
          visible={editModalVisible}
          contract={contract}
          onCancel={() => setEditModalVisible(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default ContractDetail; 