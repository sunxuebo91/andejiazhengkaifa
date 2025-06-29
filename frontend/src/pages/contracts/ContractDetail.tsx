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
  Timeline,

  Tooltip,
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  EyeOutlined,
  DownloadOutlined,
  FileTextOutlined,
  CopyOutlined,
  LinkOutlined,
  UserSwitchOutlined,
  HistoryOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { contractService } from '../../services/contractService';
import { Contract, ContractType } from '../../types/contract.types';
import EditContractModal from '../../components/EditContractModal';
import ContractStatusCard, { ContractStatusInfo } from '../../components/ContractStatusCard';
import dayjs from 'dayjs';



const ContractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { modal, message: messageApi } = App.useApp();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // 爱签相关状态

  const [downloadLoading, setDownloadLoading] = useState(false);
  
  // 新增：合同状态信息
  const [contractStatusInfo, setContractStatusInfo] = useState<ContractStatusInfo | null>(null);
  
  // 🆕 新增：客户合同历史记录
  const [contractHistory, setContractHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 处理合同状态变化
  const handleStatusChange = (statusInfo: ContractStatusInfo | null) => {
    console.log('🔄 ContractDetail 收到状态变化:', statusInfo);
    if (statusInfo?.isDetailedStatus) {
      console.log('🎯 ContractDetail 检测到精准状态:', statusInfo.statusText);
    } else {
      console.log('⚠️ ContractDetail 收到基础状态:', statusInfo?.statusText);
    }
    setContractStatusInfo(statusInfo);
  };

  useEffect(() => {
    fetchContractDetail();
  }, [id]);

  useEffect(() => {
    if (contract?.esignContractNo) {
      fetchEsignInfo();
    }
    // 🆕 获取客户合同历史
    if (contract?.customerPhone) {
      fetchContractHistory();
    }
  }, [contract]);

  const fetchContractDetail = async () => {
    if (!id) {
      messageApi.error('无效的合同ID');
      navigate('/contracts');
      return;
    }

    try {
      setLoading(true);
      const response = await contractService.getContractById(id);
      setContract(response);
    } catch (error) {
      console.error('获取合同详情失败:', error);
      messageApi.error('获取合同详情失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchEsignInfo = async () => {
    if (!id) return;
    
    try {
      await contractService.getEsignInfo(id);
      // TODO: 处理爱签信息响应
    } catch (error) {
      console.error('获取爱签信息失败:', error);
    }
  };

  // 🆕 获取客户合同历史记录
  const fetchContractHistory = async () => {
    if (!contract?.customerPhone) {
      console.log('⚠️ 缺少客户手机号，跳过历史记录获取');
      return;
    }
    
    try {
      setHistoryLoading(true);
      console.log('🔍 开始获取客户合同历史:', contract.customerPhone);
      console.log('🔍 当前合同信息:', {
        id: contract._id,
        customerName: contract.customerName,
        customerPhone: contract.customerPhone,
        workerName: contract.workerName
      });
      
      const response = await contractService.getCustomerHistory(contract.customerPhone);
      
      console.log('📡 API完整响应:', JSON.stringify(response, null, 2));
      
      if (response && response.success) {
        setContractHistory(response.data);
        console.log('✅ 客户合同历史获取成功:', response.data);
        console.log('📊 总服务人员数:', response.data?.totalWorkers);
        console.log('📊 合同记录数:', response.data?.contracts?.length);
      } else {
        console.log('📝 API返回失败或无数据:', response);
        setContractHistory(null);
      }
    } catch (error: any) {
      console.error('❌ 获取客户合同历史失败:', error);
      console.error('❌ 错误详情:', error.response || error.message);
      setContractHistory(null);
      // 不显示错误消息，因为新客户可能没有历史记录
    } finally {
      setHistoryLoading(false);
      console.log('🏁 合同历史获取流程结束');
    }
  };

  const handlePreviewContract = async () => {
    if (!contract?.esignContractNo) {
      messageApi.warning('该合同暂无爱签合同编号，无法预览');
      return;
    }

    try {
      messageApi.loading({ content: '正在生成合同预览...', key: 'preview' });
      
      // 调用预览合同API
      const response = await contractService.previewContract(contract.esignContractNo);
      
      messageApi.destroy('preview');
      
      // 强制应用内预览 - 无论返回什么都在应用内显示
      if (response.success) {
        // 根据爱签官方文档，预览API返回的data字段就是预览链接URL
        if (response.previewData || response.previewUrl) {
          const previewLink = response.previewData || response.previewUrl;
          if (previewLink) {
            // 爱签返回的是预览链接，直接作为URL使用
            showInAppPreview(previewLink, response.contractNo, response.statusText, response);
            return;
          }
        }
        
        // 根据合同状态处理其他逻辑
        if (response.shouldDownload || response.contractStatus === 2) {
          // 签约完成状态：优先尝试获取预览，如果没有则提示下载
          modal.confirm({
            title: '✅ 合同已签约完成',
            width: 600,
            content: (
              <div>
                <Alert 
                  type="success" 
                  message="合同签署完成" 
                  description="合同已完成所有签署，具有法律效力。可以下载查看完整版本。"
                  style={{ marginBottom: 16 }}
                />
                <p><strong>合同编号:</strong> {response.contractNo}</p>
                <p><strong>状态:</strong> {response.statusText || '已签约'}</p>
              </div>
            ),
            okText: '下载合同',
            cancelText: '取消',
            onOk: () => {
              handleDownloadContract();
            },
          });
        } else if (response.contractStatus === 1) {
          // 签约中状态：提示当前状态
          modal.info({
            title: '📝 合同签约中',
            width: 600,
            content: (
              <div>
                <Alert 
                  type="info" 
                  message="合同正在签署中" 
                  description="合同尚未完成所有签署。可以尝试下载查看当前版本。"
                  style={{ marginBottom: 16 }}
                />
                <p><strong>合同编号:</strong> {response.contractNo}</p>
                <p><strong>状态:</strong> {response.statusText || '签约中'}</p>
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Button type="primary" onClick={handleDownloadContract}>
                    下载当前版本
                  </Button>
                </div>
              </div>
            ),
          });
        } else {
          messageApi.info(response.message || '暂无可用的预览内容');
        }
      } else {
        // 失败情况的处理
        modal.warning({
          title: '预览合同失败',
          width: 600,
          content: (
            <div>
              <p><strong>合同编号:</strong> {contract.esignContractNo}</p>
              <p><strong>错误信息:</strong> {response.message}</p>
              <Alert 
                type="warning" 
                message="预览功能暂时不可用" 
                description="您可以尝试下载合同文件查看内容。"
                style={{ marginTop: 16 }}
              />
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Button 
                  type="primary" 
                  onClick={() => {
                    handleDownloadContract();
                  }}
                >
                  下载合同文件
                </Button>
              </div>
            </div>
          ),
        });
      }
    } catch (error) {
      messageApi.destroy('preview');
      console.error('预览合同失败:', error);
      
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
  };

  // 统一的应用内预览方法
  const showInAppPreview = (source: string, contractNo: string, statusText?: string, previewData?: any) => {
    // 根据爱签官方文档，预览API返回的就是完整的预览链接URL，直接使用
    const previewUrl = source;
    
    Modal.info({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          🏠 应用内预览 - {contractNo}
        </div>
      ),
      width: '95vw',
      style: { 
        top: 10, 
        maxWidth: '1400px',
        margin: '0 auto'
      },
      maskClosable: true,
      centered: false,
      closable: true,
      content: (
        <div style={{ 
          height: '88vh', 
          padding: 0, 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* 显示详细的合同状态信息 */}
          {contract?.esignContractNo && (
            <div style={{ marginBottom: 12, flexShrink: 0 }}>
              <ContractStatusCard
                contractNo={contract.esignContractNo}
                contractName={contractNo}
                showRefreshButton={true}
                autoRefresh={false}
                size="small"
                style={{ marginBottom: 0 }}
                onStatusChange={handleStatusChange}
                title="电子合同状态信息"
              />
            </div>
          )}
          

          
          {/* 备用状态显示（如果ContractStatusCard无法正常工作） */}
          {statusText && !contract?.esignContractNo && (
            <Alert 
              type="info" 
              message={`合同状态：${statusText}`} 
              description="您正在使用应用内预览功能"
              style={{ marginBottom: 12, flexShrink: 0 }}
              showIcon
            />
          )}
          
          {/* PDF预览区域 */}
          <div style={{ 
            width: '100%', 
            flex: 1,
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            overflow: 'hidden',
            backgroundColor: '#f5f5f5',
            marginBottom: '12px'
          }}>
            <iframe
              src={previewUrl}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none'
              }}
              title="合同预览"
              frameBorder="0"
            />
          </div>
          
          {/* 底部按钮区域 - 水平布局 */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            padding: '8px 0',
            backgroundColor: '#fafafa',
            borderTop: '1px solid #e8e8e8',
            borderRadius: '0 0 6px 6px',
            flexShrink: 0
          }}>
            <Button 
              size="middle"
              icon={<DownloadOutlined />}
              onClick={() => {
                console.log('🔄 底部按钮：下载合同被点击');
                Modal.destroyAll();
                handleDownloadContract();
              }}
              style={{ 
                minWidth: '100px'
              }}
            >
              下载合同
            </Button>
            <Button 
              size="middle"
              onClick={() => {
                console.log('🔄 底部按钮：关闭被点击');
                Modal.destroyAll();
              }}
              style={{ 
                minWidth: '80px'
              }}
            >
              关闭
            </Button>
            <Button 
              type="primary" 
              size="middle"
              icon={<LinkOutlined />}
              onClick={() => {
                console.log('🔄 底部按钮：新窗口打开被点击');
                window.open(previewUrl, '_blank');
                Modal.destroyAll();
              }}
              style={{ 
                minWidth: '120px'
              }}
            >
              新窗口打开
            </Button>
          </div>
        </div>
      ),
      footer: null,
      okButtonProps: { style: { display: 'none' } },
      cancelButtonProps: { style: { display: 'none' } },
    });
    
    messageApi.success('📱 应用内预览已加载');
  };

  const handleDownloadContract = async () => {
    if (!contract?.esignContractNo) {
      messageApi.warning('该合同暂无爱签合同编号，无法下载');
      return;
    }

    try {
      setDownloadLoading(true);
      
      console.log('🔄 开始下载合同:', contract.esignContractNo);
      
      // 根据官方文档调用下载API
      const response = await contractService.downloadContract(id!, {
        force: 1, // 强制下载，无论什么状态都下载
        downloadFileType: 1 // PDF文件
      });

      console.log('📊 下载响应:', response);

      if (response.success && response.data) {
        // 根据官方文档，响应格式为：
        // {
        //   fileName: "test001.pdf",
        //   md5: "83caefdc55884a13d44504c78adcafd5", 
        //   size: 449565,
        //   data: "{base64字符串}",
        //   fileType: 0 // 0：PDF，1：ZIP
        // }
        
        const downloadData = response.data;
        
        if (downloadData.data) {
          // 处理base64数据下载
          try {
            const fileName = downloadData.fileName || `${contract.esignContractNo}.pdf`;
            const base64Data = downloadData.data;
            
            console.log('📄 准备下载文件:', {
              fileName,
              size: downloadData.size,
              fileType: downloadData.fileType,
              md5: downloadData.md5
            });
            
            // 将base64转换为Blob
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            
            // 根据文件类型设置MIME类型
            const mimeType = downloadData.fileType === 1 ? 'application/zip' : 'application/pdf';
            const blob = new Blob([byteArray], { type: mimeType });
            
            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL对象
            window.URL.revokeObjectURL(url);
            
            messageApi.success(`合同下载成功：${fileName} (${(downloadData.size / 1024).toFixed(1)}KB)`);
            console.log('✅ 合同下载完成');
            
          } catch (base64Error) {
            console.error('❌ Base64数据处理失败:', base64Error);
            messageApi.error('文件数据处理失败，请联系管理员');
          }
        } else {
          console.error('❌ 响应中缺少文件数据');
          messageApi.error('下载响应中缺少文件数据');
        }
      } else {
        // 处理API错误
        const errorMsg = response.message || '合同下载失败';
        console.error('❌ 下载API返回错误:', errorMsg);
        
        // 根据常见错误码提供友好提示
        if (errorMsg.includes('100056')) {
          messageApi.error('合同编号为空，请刷新页面重试');
        } else if (errorMsg.includes('100066')) {
          messageApi.error('合同不存在，可能已被删除');
        } else if (errorMsg.includes('100067')) {
          messageApi.warning('合同尚未签署完成，是否强制下载？');
        } else {
          messageApi.error(errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ 下载合同请求失败:', error);
      
      // 处理网络错误
      if ((error as any).response?.status === 401) {
        messageApi.error('登录已过期，请重新登录');
      } else if ((error as any).response?.status === 404) {
        messageApi.error('下载接口不存在，请联系管理员');
      } else if ((error as any).response?.status >= 500) {
        messageApi.error('服务器错误，请稍后重试');
      } else {
        messageApi.error('网络请求失败，请检查网络连接');
      }
    } finally {
      setDownloadLoading(false);
    }
  };

  const [signUrlModalVisible, setSignUrlModalVisible] = useState(false);
  const [signUrls] = useState<any[]>([]);
  const [signUrlLoading] = useState(false);









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
                    contractStatusInfo.isDetailedStatus ? (
                      <Tooltip title={contractStatusInfo.detailedStatus?.summary || contractStatusInfo.statusDescription}>
                        <Tag 
                          color={contractStatusInfo.statusColor}
                          icon={<TeamOutlined />}
                          style={{ fontSize: '12px' }}
                        >
                          {contractStatusInfo.statusText}
                        </Tag>
                      </Tooltip>
                    ) : (
                      <Tag color={contractStatusInfo.statusColor}>
                        {contractStatusInfo.statusText}
                      </Tag>
                    )
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

          {/* 🆕 客户合同历史记录 - 固定显示 */}
          {contract && (
            <Col span={24}>
              <Card 
                type="inner" 
                title={
                  <Space>
                    <HistoryOutlined style={{ color: '#1890ff' }} />
                    <span>换人历史记录</span>
                    <Tag color="blue">
                      {contractHistory && contractHistory.totalWorkers > 1 
                        ? `共${contractHistory.totalWorkers}任阿姨` 
                        : '首任阿姨'
                      }
                    </Tag>
                  </Space>
                } 
                style={{ marginBottom: '16px' }}
                loading={historyLoading}
              >
                <Alert
                  message="换人记录"
                  description={
                    contractHistory && contractHistory.totalWorkers > 1
                      ? `客户 ${contract.customerName} 共更换过 ${contractHistory.totalWorkers} 任阿姨，以下为详细记录`
                      : `客户 ${contract.customerName} 的首任阿姨服务记录`
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <Timeline>
                  {contractHistory?.contracts && contractHistory.contracts.length > 0 ? (
                    contractHistory.contracts
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((historyContract: any) => (
                        <Timeline.Item 
                          key={historyContract.contractId}
                          color={historyContract.status === 'active' ? 'green' : 'gray'}
                        >
                          <div style={{ paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ 
                                fontWeight: 'bold', 
                                fontSize: '16px',
                                color: historyContract.status === 'active' ? '#52c41a' : '#8c8c8c'
                              }}>
                                第{historyContract.order}任：{historyContract.workerName}
                              </span>
                              <Tag 
                                color={historyContract.status === 'active' ? 'green' : 'default'}
                                style={{ marginLeft: '8px' }}
                              >
                                {historyContract.status === 'active' ? '当前服务' : '已更换'}
                              </Tag>
                              {historyContract.contractId === contract._id && (
                                <Tag color="blue" style={{ marginLeft: '4px' }}>当前查看</Tag>
                              )}
                            </div>
                            
                            <div style={{ color: '#666', lineHeight: '1.6' }}>
                              <div>
                                <strong>联系电话：</strong>{historyContract.workerPhone} | 
                                <strong> 月薪：</strong>¥{historyContract.workerSalary?.toLocaleString()}
                              </div>
                              <div>
                                <strong>服务期间：</strong>
                                {formatDate(historyContract.startDate)} 至 {formatDate(historyContract.endDate)}
                              </div>
                              {historyContract.serviceDays && (
                                <div>
                                  <strong>实际服务：</strong>
                                  <span style={{ color: historyContract.status === 'active' ? '#52c41a' : '#fa8c16' }}>
                                    {historyContract.serviceDays} 天
                                  </span>
                                  {historyContract.terminationDate && (
                                    <span style={{ color: '#8c8c8c', marginLeft: '8px' }}>
                                      (于 {formatDate(historyContract.terminationDate)} 结束)
                                    </span>
                                  )}
                                </div>
                              )}
                              {historyContract.terminationReason && (
                                <div>
                                  <strong>更换原因：</strong>
                                  <span style={{ color: '#fa541c' }}>{historyContract.terminationReason}</span>
                                </div>
                              )}
                              <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                                合同编号：{historyContract.contractNumber} | 
                                爱签状态：{historyContract.esignStatus || '未知'}
                              </div>
                            </div>
                          </div>
                        </Timeline.Item>
                      ))
                  ) : (
                    <Timeline.Item color="green">
                      <div style={{ paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ 
                            fontWeight: 'bold', 
                            fontSize: '16px',
                            color: '#52c41a'
                          }}>
                            第1任：{contract.workerName}
                          </span>
                          <Tag color="green" style={{ marginLeft: '8px' }}>
                            当前服务
                          </Tag>
                          <Tag color="blue" style={{ marginLeft: '4px' }}>当前查看</Tag>
                        </div>
                        
                        <div style={{ color: '#666', lineHeight: '1.6' }}>
                          <div>
                            <strong>联系电话：</strong>{contract.workerPhone} | 
                            <strong> 月薪：</strong>¥{contract.workerSalary?.toLocaleString()}
                          </div>
                          <div>
                            <strong>服务期间：</strong>
                            {formatDate(contract.startDate)} 至 {formatDate(contract.endDate)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                            合同编号：{contract.contractNumber} | 
                            爱签状态：{contract.esignContractNo ? '已创建' : '未创建'}
                          </div>
                        </div>
                      </div>
                    </Timeline.Item>
                  )}
                </Timeline>
                
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  backgroundColor: '#f6f6f6', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  <strong>说明：</strong>
                  {contractHistory && contractHistory.totalWorkers > 1 ? (
                    <>
                      • 每次换人都会创建新的合同记录，保证服务的连续性<br/>
                      • 实际服务天数根据换人日期自动计算<br/>
                      • 新合同的开始时间会自动衔接上一任的结束时间
                    </>
                  ) : (
                    <>
                      • 这是该客户的首任阿姨服务记录<br/>
                      • 如需更换阿姨，可使用下方"为该客户换人"功能<br/>
                      • 换人后会自动记录服务历史，保证服务连续性
                    </>
                  )}
                </div>
              </Card>
            </Col>
          )}

          {/* 🆕 换人操作按钮 - 固定显示 */}
          {contract && (
            <Col span={24}>
                             <Card 
                 type="inner" 
                 title={
                   <Space>
                     <UserSwitchOutlined style={{ color: '#722ed1' }} />
                     <span>合同操作</span>
                   </Space>
                 } 
                 style={{ marginBottom: '16px' }}
               >
                 <Space>
                   <Button 
                     type="primary"
                     icon={<UserSwitchOutlined />}
                     onClick={() => navigate(`/contracts/create?mode=change&phone=${contract.customerPhone}`)}
                     style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                   >
                     为该客户换人
                   </Button>
                  <Button 
                    onClick={() => {
                      Modal.info({
                        title: '换人说明',
                        width: 600,
                        content: (
                          <div>
                            <p><strong>换人流程：</strong></p>
                            <ol>
                              <li>点击"为该客户换人"按钮</li>
                              <li>系统自动进入换人模式，计算服务时间</li>
                              <li>选择新的服务人员</li>
                              <li>确认新合同信息并创建</li>
                              <li>发起爱签电子签约</li>
                              <li>完成签约后自动处理原合同状态</li>
                            </ol>
                            <Alert 
                              type="info" 
                              message="时间自动计算" 
                              description="新合同的开始时间为换人当日，结束时间保持与原合同相同，确保服务时间无缝衔接。"
                              style={{ marginTop: 12 }}
                            />
                          </div>
                        )
                      });
                    }}
                  >
                    换人说明
                  </Button>
                </Space>
              </Card>
            </Col>
          )}
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