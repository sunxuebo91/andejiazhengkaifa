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
  Empty,
  Collapse,
  Switch,
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
  StopOutlined,
  CloseCircleOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  SyncOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { contractService } from '../../services/contractService';
import { customerService } from '../../services/customerService';
import { resumeService } from '../../services/resume.service';
import { backgroundCheckService } from '../../services/backgroundCheckService';
import { Contract, ContractType } from '../../types/contract.types';
import { BackgroundCheck, BG_STATUS_MAP } from '../../types/background-check.types';
import EditContractModal from '../../components/EditContractModal';
import ContractStatusCard, { ContractStatusInfo } from '../../components/ContractStatusCard';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';



const ContractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { modal, message: messageApi } = App.useApp();
  const { user } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // 权限检查
  const isAdmin = user?.role === '系统管理员' || user?.role === 'admin';
  
  // 爱签相关状态

  const [downloadLoading, setDownloadLoading] = useState(false);

  // 新增：合同状态信息
  const [contractStatusInfo, setContractStatusInfo] = useState<ContractStatusInfo | null>(null);

  // 签署链接相关状态
  const [signUrls, setSignUrls] = useState<any[]>([]);
  const [signUrlsLoading, setSignUrlsLoading] = useState(false);
  
  // 🆕 新增：客户合同历史记录
  const [contractHistory, setContractHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 🆕 新增：客户服务地址
  const [customerAddress, setCustomerAddress] = useState<string | null>(null);

  // 🆕 新增：服务人员联系地址
  const [workerAddress, setWorkerAddress] = useState<string | null>(null);

  // 🆕 新增：保险同步状态
  const [syncInsuranceLoading, setSyncInsuranceLoading] = useState(false);
  // 爱签状态同步
  const [syncEsignLoading, setSyncEsignLoading] = useState(false);

  // 🆕 新增：背调信息
  const [backgroundCheck, setBackgroundCheck] = useState<BackgroundCheck | null>(null);
  const [bgCheckLoading, setBgCheckLoading] = useState(false);

  // 收款开关切换状态
  const [paymentToggleLoading, setPaymentToggleLoading] = useState(false);

  // 最后更新人信息已在fetchContractDetail中直接处理

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
    if (!contract) return;

    if (contract.esignContractNo) {
      fetchEsignInfo();
      // 如果有保存的签署链接，解析并显示
      if (contract.esignSignUrls) {
        try {
          const parsedUrls = JSON.parse(contract.esignSignUrls);
          setSignUrls(parsedUrls);
        } catch (error) {
          console.error('解析签署链接失败:', error);
        }
      }
    }

    // 🆕 获取客户合同历史（依赖手机号）
    if (contract.customerPhone) {
      fetchContractHistory();
    }

    // 🆕 获取客户服务地址（优先取合同已populate的数据，兜底再查）
    fetchCustomerAddress();

    // 🆕 获取服务人员联系地址
    fetchWorkerAddress();

    // 🆕 获取背调信息（依赖身份证号）
    if (contract.workerIdCard) {
      fetchBackgroundCheck();
    }
  }, [contract]);

  // 🆕 获取客户服务地址
  const fetchCustomerAddress = async () => {
    // 1) 优先使用合同详情里已populate的客户地址
    const customerObj = typeof contract?.customerId === 'object' ? contract.customerId : null;
    const addressFromContract = customerObj?.address?.trim();
    if (addressFromContract) {
      setCustomerAddress(addressFromContract);
      return;
    }

    // 2) 兜底：如果有 customerId._id，按ID再取一次客户详情（比手机号更可靠）
    if (customerObj?._id) {
      try {
        const customer = await customerService.getCustomerById(customerObj._id);
        const addressFromCustomer = customer?.address?.trim();
        if (addressFromCustomer) {
          setCustomerAddress(addressFromCustomer);
          return;
        }
      } catch (error) {
        console.warn('获取客户详情(用于地址兜底)失败:', error);
      }
    }

    // 3) 兜底：按手机号查地址
    const phone = contract?.customerPhone?.trim();
    if (!phone) return;

    try {
      const data = await customerService.getAddressByPhone(phone);
      const address = data?.address?.trim();
      if (address) {
        setCustomerAddress(address);
      }
    } catch (error) {
      // 客户不存在/手机号不匹配时会被拦截器抛错，这里不需要弹窗，只保留日志
      console.warn('获取客户服务地址失败(手机号兜底):', error);
    }
  };

  // 🆕 获取服务人员联系地址（首选合同字段，兜底简历户籍地址）
  const fetchWorkerAddress = async () => {
    // 1) 首选：从合同字段直接获取
    if (contract?.workerAddress?.trim()) {
      setWorkerAddress(contract.workerAddress.trim());
      return;
    }

    // 2) 获取 workerId
    const workerObj = typeof contract?.workerId === 'object' ? contract.workerId : null;
    const resumeId = workerObj?._id || (typeof contract?.workerId === 'string' ? contract.workerId : null);

    // 始终查询简历详情获取户籍地址
    if (resumeId) {
      try {
        const response = await resumeService.getById(resumeId);
        const resume = response as any;
        const hukouAddr = resume?.hukouAddress || resume?.data?.hukouAddress;
        if (hukouAddr?.trim()) {
          setWorkerAddress(hukouAddr.trim());
          return;
        }
      } catch (error) {
        console.warn('获取简历详情(用于地址兜底)失败:', error);
      }
    }

    // 未找到地址
    setWorkerAddress(null);
  };

  // 🆕 获取背调信息
  const fetchBackgroundCheck = async () => {
    if (!contract?.workerIdCard) {
      console.log('⚠️ 缺少服务人员身份证号，跳过背调信息获取');
      return;
    }

    try {
      setBgCheckLoading(true);
      console.log('🔍 开始获取背调信息:', contract.workerIdCard);

      const record = await backgroundCheckService.getByIdNo(contract.workerIdCard);

      if (record) {
        setBackgroundCheck(record);
        console.log('✅ 背调信息获取成功:', record);
      } else {
        setBackgroundCheck(null);
        console.log('📝 未找到背调记录');
      }
    } catch (error) {
      console.warn('获取背调信息失败:', error);
      setBackgroundCheck(null);
    } finally {
      setBgCheckLoading(false);
    }
  };

  // 不再需要独立的useEffect获取用户信息，已在fetchContractDetail中处理

  const fetchContractDetail = async () => {
    if (!id) {
      messageApi.error('无效的合同ID');
      navigate('/contracts');
      return;
    }

    try {
      setLoading(true);
      const response = await contractService.getContractById(id);
      console.log('📡 合同详情API响应:', response);
      console.log('🔍 lastUpdatedBy字段:', response.lastUpdatedBy);
      console.log('🔍 lastUpdatedBy类型:', typeof response.lastUpdatedBy);
      
      // 🔧 前端直接处理lastUpdatedBy用户信息获取（类似简历详情页）
      // ✅ 验证 lastUpdatedBy 是否是有效的 MongoDB ObjectId（24位十六进制字符串）
      const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);

      if (response.lastUpdatedBy && typeof response.lastUpdatedBy === 'string' && isValidObjectId(response.lastUpdatedBy)) {
        console.log('🔧 前端检测到lastUpdatedBy为有效ObjectId，准备获取用户信息');
        try {
          const userResponse = await fetch(`/api/users/${response.lastUpdatedBy}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            response.lastUpdatedBy = {
              _id: userData._id,
              username: userData.username,
              name: userData.name
            };
            console.log('🔧 前端成功获取用户信息:', response.lastUpdatedBy);
          }
        } catch (error) {
          console.warn('🔧 前端获取用户信息失败:', error);
        }
      } else if (response.lastUpdatedBy && typeof response.lastUpdatedBy === 'string') {
        // ⚠️ lastUpdatedBy 是无效的字符串（如 "batch-sync"），清空它
        console.warn('⚠️ lastUpdatedBy 不是有效的ObjectId:', response.lastUpdatedBy);
        response.lastUpdatedBy = undefined;
      }
      
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
      
      // 🔥 优先检查数据库中是否有保存的官方预览链接
      if (contract.esignPreviewUrl) {
        console.log('✅ 使用数据库中保存的官方预览链接:', contract.esignPreviewUrl);
        messageApi.destroy('preview');
        showInAppPreview(contract.esignPreviewUrl, contract.esignContractNo, '官方预览', {
          success: true,
          contractNo: contract.esignContractNo,
          previewUrl: contract.esignPreviewUrl,
          method: 'officialPreviewUrl',
          message: '使用官方预览链接'
        });
        return;
      }
      
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
                  message="合同已完成所有签署，具有法律效力。可以下载查看完整版本。"
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
        } else {
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
  const showInAppPreview = (source: string, contractNo: string, statusText?: string, _previewData?: any) => {
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

  // 切换收款开关
  const handleTogglePayment = async (checked: boolean) => {
    if (!contract?._id) return;
    setPaymentToggleLoading(true);
    try {
      await contractService.updateContract(contract._id, { paymentEnabled: checked } as any);
      messageApi.success(checked ? '已开启收款，客户可在小程序支付' : '已关闭收款');
      fetchContractDetail();
    } catch (error: any) {
      messageApi.error(error?.response?.data?.message || '操作失败');
    } finally {
      setPaymentToggleLoading(false);
    }
  };

  const handleWithdrawContract = async () => {
    if (!contract?.esignContractNo) {
      messageApi.warning('该合同暂无爱签合同编号，无法撤销');
      return;
    }

    const contractNo = contract.esignContractNo;

    modal.confirm({
      title: '确认撤销合同',
      content: (
        <div>
          <p>撤销后，此合同签署流程将终止，所有签署链接均失效。</p>
          <p><strong>合同编号:</strong> {contractNo}</p>
          <p style={{ color: 'red' }}>此操作不可恢复，是否确认撤销？</p>
        </div>
      ),
      okText: '确认撤销',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          messageApi.loading({ content: '正在撤销合同...', key: 'withdraw' });

          // Call API to withdraw contract
          const response = await contractService.withdrawContract(contractNo);

          messageApi.destroy('withdraw');

          if (response.success) {
            messageApi.success('合同撤销成功');
            fetchContractDetail(); // Refresh contract details
          } else {
            messageApi.error(response.message || '撤销合同失败');
          }
        } catch (error: any) {
          messageApi.destroy('withdraw');
          messageApi.error(error.message || '撤销合同失败');
        }
      },
    });
  };

  // 同步爱签状态到数据库
  const handleSyncEsignStatus = async () => {
    if (!contract?._id) return;
    setSyncEsignLoading(true);
    messageApi.loading({ content: '正在同步爱签状态...', key: 'syncEsign' });
    try {
      const response = await contractService.syncEsignStatus(contract._id);
      messageApi.destroy('syncEsign');
      if (response.success) {
        messageApi.success(response.message || '爱签状态同步成功');
        // 刷新页面数据
        window.location.reload();
      } else {
        messageApi.error(response.message || '同步失败');
      }
    } catch (error: any) {
      messageApi.destroy('syncEsign');
      messageApi.error(error.message || '同步失败');
    } finally {
      setSyncEsignLoading(false);
    }
  };

  // 🆕 手动触发保险同步
  const handleSyncInsurance = async () => {
    if (!contract?._id) {
      messageApi.warning('合同信息不完整，无法同步保险');
      return;
    }

    modal.confirm({
      title: '确认同步保险',
      content: (
        <div>
          <p>此操作将：</p>
          <ol>
            <li>查询爱签API确认合同真实状态</li>
            <li>如果合同已签约，更新本地状态</li>
            <li>触发保险同步逻辑（新合同创建保单，换人合同更新保单）</li>
          </ol>
          <Alert
            type="info"
            message="适用场景"
            description="当合同已签约但保险未自动同步时，可使用此功能手动触发同步。"
            style={{ marginTop: 12 }}
          />
        </div>
      ),
      okText: '确认同步',
      cancelText: '取消',
      onOk: async () => {
        try {
          setSyncInsuranceLoading(true);
          messageApi.loading({ content: '正在同步保险...', key: 'syncInsurance' });

          const response = await contractService.syncInsurance(contract._id!);

          messageApi.destroy('syncInsurance');

          if (response.success) {
            messageApi.success(response.message || '保险同步成功');

            // 显示同步结果
            modal.success({
              title: '保险同步成功',
              content: (
                <div>
                  <p><strong>合同状态:</strong> {response.data?.contractStatus}</p>
                  <p><strong>爱签状态:</strong> {response.data?.esignStatus === '2' ? '已签约' : response.data?.esignStatus}</p>
                  <p><strong>保险同步状态:</strong> {response.data?.insuranceSyncStatus || '未设置'}</p>
                  {response.data?.insuranceSyncError && (
                    <Alert
                      type="warning"
                      message="同步错误"
                      description={response.data.insuranceSyncError}
                      style={{ marginTop: 12 }}
                    />
                  )}
                </div>
              ),
            });

            // 刷新合同详情
            fetchContractDetail();
          } else {
            messageApi.error(response.message || '保险同步失败');
          }
        } catch (error: any) {
          messageApi.destroy('syncInsurance');
          messageApi.error(error.message || '保险同步失败');
        } finally {
          setSyncInsuranceLoading(false);
        }
      },
    });
  };

  // 作废合同（仅管理员）
  const handleInvalidateContract = async () => {
    if (!contract?.esignContractNo) {
      messageApi.warning('该合同暂无爱签合同编号，无法作废');
      return;
    }

    const contractNo = contract.esignContractNo;

    modal.confirm({
      title: '确认作废合同',
      content: (
        <div>
          <p><strong>合同编号:</strong> {contractNo}</p>
          <p><strong>客户姓名:</strong> {contract.customerName}</p>
          <p><strong>服务人员:</strong> {contract.workerName}</p>
          <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4 }}>
            <p style={{ margin: 0, color: '#d46b08' }}>
              <strong>⚠️ 重要说明：</strong>
            </p>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20, color: '#d46b08' }}>
              <li>没有签署方签署过的合同：作废后原签署流程将终止，所有签署链接均失效</li>
              <li>有签署方已签署过的合同：作废后此签署方需签署"作废"印章</li>
              <li>所有签署方都完成签署的合同：作废后需每个签署方都签署"作废"印章</li>
            </ul>
          </div>
          <p style={{ color: 'red', marginTop: 16 }}>
            <strong>此操作不可恢复，是否确认作废？</strong>
          </p>
        </div>
      ),
      okText: '确认作废',
      okType: 'danger',
      cancelText: '取消',
      width: 600,
      onOk: async () => {
        try {
          messageApi.loading({ content: '正在作废合同...', key: 'invalidate' });

          // 默认15天有效期
          const response = await contractService.invalidateContract(contractNo, 15);

          messageApi.destroy('invalidate');

          if (response.success) {
            messageApi.success(response.message || '合同作废成功');
            if (response.data?.signUser && response.data.signUser.length > 0) {
              messageApi.info('签署方需要签署作废印章，请通知相关人员', 5);
            }
            fetchContractDetail();
          } else {
            messageApi.error(response.message || '作废合同失败');
          }
        } catch (error: any) {
          messageApi.destroy('invalidate');
          messageApi.error(error.message || '作废合同失败');
        }
      },
    });
  };

  // 重新获取签署链接
  const handleResendSignUrls = async () => {
    if (!id) return;

    try {
      setSignUrlsLoading(true);
      messageApi.loading({ content: '正在获取签署链接...', key: 'resend' });

      console.log('🔄 开始调用 resendSignUrls API');
      const response = await contractService.resendSignUrls(id);
      console.log('📡 API响应:', response);
      console.log('📊 response.success:', response.success);
      console.log('📊 response.data:', response.data);

      messageApi.destroy('resend');

      if (response.success) {
        console.log('✅ 进入 success 分支');
        setSignUrls(response.data.signUrls);
        messageApi.success('签署链接获取成功');

        // 显示签署链接弹窗
        console.log('🎨 开始渲染弹窗');
        modal.success({
          title: '签署链接已获取',
          width: 800,
          content: (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <Alert
                message="请将相应的签署链接发送给对应的签署方"
                description="您可以复制链接发送给签署方，或直接打开链接进行签署"
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
              {response.data.signUrls.map((signUrl: any, index: number) => (
                <Card
                  key={index}
                  size="small"
                  style={{ marginBottom: 12 }}
                  title={
                    <Space>
                      <UserSwitchOutlined />
                      <span>{signUrl.role}</span>
                      {signUrl.status === 2 && <Tag color="success">已签署</Tag>}
                      {signUrl.status === 1 && <Tag color="warning">待签署</Tag>}
                    </Space>
                  }
                >
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="姓名">{signUrl.name}</Descriptions.Item>
                    <Descriptions.Item label="手机号">{signUrl.mobile}</Descriptions.Item>
                    <Descriptions.Item label="签署链接">
                      {signUrl.signUrl && signUrl.signUrl.startsWith('http') ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Typography.Text
                            copyable={{
                              text: signUrl.signUrl,
                              onCopy: () => messageApi.success('链接已复制')
                            }}
                            ellipsis
                            style={{ maxWidth: '500px' }}
                          >
                            {signUrl.signUrl}
                          </Typography.Text>
                          <Space>
                            <Button
                              type="primary"
                              size="small"
                              icon={<LinkOutlined />}
                              onClick={() => window.open(signUrl.signUrl, '_blank')}
                            >
                              打开链接
                            </Button>
                            <Button
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => {
                                navigator.clipboard.writeText(signUrl.signUrl);
                                messageApi.success('链接已复制');
                              }}
                            >
                              复制链接
                            </Button>
                          </Space>
                        </Space>
                      ) : (
                        <Typography.Text type="secondary">
                          {signUrl.signUrl || '无签署链接'}
                        </Typography.Text>
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              ))}
            </div>
          ),
        });
        console.log('✅ 弹窗渲染完成');
      } else {
        console.log('❌ 进入 else 分支，response.success 为 false');
        console.log('❌ response.message:', response.message);
        messageApi.error(response.message || '获取签署链接失败');
      }
    } catch (error: any) {
      console.error('❌ 捕获到异常:', error);
      console.error('❌ 异常消息:', error.message);
      console.error('❌ 异常堆栈:', error.stack);
      messageApi.destroy('resend');
      messageApi.error(error.message || '获取签署链接失败');
    } finally {
      console.log('🏁 handleResendSignUrls 执行完成');
      setSignUrlsLoading(false);
    }
  };

  const getContractTypeColor = (type: ContractType) => {
    const colors: Record<ContractType, string> = {
      [ContractType.YUESAO]: 'purple',
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

  // 从 templateParams 中获取合同开始日期（支持合并字段和分拆年月日字段）
  const getContractStartDate = (c: typeof contract) => {
    const tp = c?.templateParams;
    if (tp?.['合同开始时间']) return tp['合同开始时间'];
    if (tp?.['服务开始时间']) return tp['服务开始时间'];
    // 分拆年月日字段 fallback（小程序部分模板使用 开始年/开始月/开始日）
    if (tp?.['开始年'] && tp?.['开始月'] && tp?.['开始日']) {
      return `${tp['开始年']}年${String(tp['开始月']).padStart(2, '0')}月${String(tp['开始日']).padStart(2, '0')}日`;
    }
    return c?.startDate ? formatDate(c.startDate) : '-';
  };

  // 从 templateParams 中获取合同结束日期（支持合并字段和分拆年月日字段）
  const getContractEndDate = (c: typeof contract) => {
    const tp = c?.templateParams;
    if (tp?.['合同结束时间']) return tp['合同结束时间'];
    if (tp?.['服务结束时间']) return tp['服务结束时间'];
    // 分拆年月日字段 fallback
    if (tp?.['结束年'] && tp?.['结束月'] && tp?.['结束日']) {
      return `${tp['结束年']}年${String(tp['结束月']).padStart(2, '0')}月${String(tp['结束日']).padStart(2, '0')}日`;
    }
    return c?.endDate ? formatDate(c.endDate) : '-';
  };

  const renderHistoryItem = (historyContract: any) => ({
    key: historyContract.contractId,
    color: historyContract.status === 'active' ? 'green' : 'gray',
    children: (
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
          {historyContract.contractId === contract?._id && (
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
    )
  });

  const sortedHistoryContracts = contractHistory?.contracts && contractHistory.contracts.length > 0
    ? [...contractHistory.contracts]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];
  const latestHistoryContracts = sortedHistoryContracts.slice(0, 2);
  const olderHistoryContracts = sortedHistoryContracts.slice(2);

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
            <span style={{ marginLeft: 16, fontSize: 14, fontWeight: 'normal' }}>
              收款：
              <Switch
                checked={!!contract.paymentEnabled}
                onChange={handleTogglePayment}
                loading={paymentToggleLoading}
                checkedChildren="开"
                unCheckedChildren="关"
                size="small"
              />
            </span>
            {contract.paymentEnabled && (
              contract.paymentStatus === 'paid' ? (
                <Tag color="success">已收款</Tag>
              ) : contract.paymentStatus === 'refunded' ? (
                <Tag color="orange">已退款</Tag>
              ) : (
                <Tag color="warning">待收款</Tag>
              )
            )}
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
            <Button
              icon={<UserSwitchOutlined />}
              onClick={() => navigate(`/contracts/create?mode=change&phone=${contract.customerPhone}&contractId=${contract._id}`)}
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', color: '#fff' }}
            >
              为该客户换人
            </Button>
            <Button
              icon={<SyncOutlined />}
              onClick={handleSyncEsignStatus}
              loading={syncEsignLoading}
              disabled={!contract.esignContractNo}
              type="default"
              style={{ borderColor: '#1677ff', color: '#1677ff' }}
            >
              同步签约状态
            </Button>
            <Button
              icon={<SafetyOutlined />}
              onClick={handleSyncInsurance}
              loading={syncInsuranceLoading}
              type="default"
              style={{
                borderColor: '#52c41a',
                color: '#52c41a',
              }}
            >
              保险同步
            </Button>
            <Button
              icon={<StopOutlined />}
              onClick={handleWithdrawContract}
              disabled={!contract.esignContractNo}
              danger
            >
              撤销合同
            </Button>
            {isAdmin && (
              <Button
                icon={<CloseCircleOutlined />}
                onClick={handleInvalidateContract}
                disabled={!contract.esignContractNo}
                danger
              >
                作废合同
              </Button>
            )}
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

          {/* 签署链接管理 */}
          {contract.esignContractNo && (
            <Col span={24}>
              <Collapse
                defaultActiveKey={[]}
                style={{ marginBottom: '16px' }}
                items={[
                  {
                    key: 'sign-urls',
                    label: (
                      <Space>
                        <LinkOutlined />
                        <span style={{ fontWeight: 500 }}>签署链接管理</span>
                        {signUrls.length > 0 && (
                          <Tag color="blue">{signUrls.length}个签署方</Tag>
                        )}
                      </Space>
                    ),
                    extra: (
                      <Button
                        type="primary"
                        size="small"
                        icon={<LinkOutlined />}
                        loading={signUrlsLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResendSignUrls();
                        }}
                      >
                        获取签署链接
                      </Button>
                    ),
                    children: (
                      <div>
                        {signUrls.length > 0 ? (
                          <div>
                            <Alert
                              message="签署链接已保存"
                              description="以下是各签署方的签署链接，您可以复制发送给对应的签署方"
                              type="info"
                              showIcon
                              style={{ marginBottom: 16 }}
                            />
                            {signUrls.map((signUrl: any, index: number) => (
                              <Card
                                key={index}
                                size="small"
                                style={{ marginBottom: 12 }}
                                title={
                                  <Space>
                                    <UserSwitchOutlined />
                                    <span>{signUrl.role}</span>
                                    {signUrl.status === 2 && <Tag color="success">已签署</Tag>}
                                    {signUrl.status === 1 && <Tag color="warning">待签署</Tag>}
                                  </Space>
                                }
                              >
                                <Descriptions column={1} size="small">
                                  <Descriptions.Item label="姓名">{signUrl.name}</Descriptions.Item>
                                  <Descriptions.Item label="手机号">{signUrl.mobile}</Descriptions.Item>
                                  <Descriptions.Item label="签署链接">
                                    {signUrl.signUrl && signUrl.signUrl.startsWith('http') ? (
                                      <Space direction="vertical" style={{ width: '100%' }}>
                                        <Typography.Text
                                          copyable={{
                                            text: signUrl.signUrl,
                                            onCopy: () => messageApi.success('链接已复制')
                                          }}
                                          ellipsis
                                          style={{ maxWidth: '600px' }}
                                        >
                                          {signUrl.signUrl}
                                        </Typography.Text>
                                        <Space>
                                          <Button
                                            type="primary"
                                            size="small"
                                            icon={<LinkOutlined />}
                                            onClick={() => window.open(signUrl.signUrl, '_blank')}
                                          >
                                            打开链接
                                          </Button>
                                          <Button
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() => {
                                              navigator.clipboard.writeText(signUrl.signUrl);
                                              messageApi.success('链接已复制');
                                            }}
                                          >
                                            复制链接
                                          </Button>
                                        </Space>
                                      </Space>
                                    ) : (
                                      <Typography.Text type="secondary">
                                        {signUrl.signUrl || '无签署链接'}
                                      </Typography.Text>
                                    )}
                                  </Descriptions.Item>
                                </Descriptions>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Empty
                            description="暂无签署链接，请点击右上角按钮获取"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        )}
                      </div>
                    ),
                  },
                ]}
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
                
                {/* 上户状态：合同签约后才显示；not_started 时不展示 */}
                {(contract.onboardStatus === 'pending' || contract.onboardStatus === 'confirmed') && (
                  <Descriptions.Item label="上户状态" span={1}>
                    {contract.onboardStatus === 'confirmed' ? (
                      <Tooltip title={
                        contract.onboardConfirmedAt
                          ? `确认时间：${new Date(contract.onboardConfirmedAt).toLocaleString('zh-CN')}${contract.onboardConfirmedBy ? `  确认人：${contract.onboardConfirmedBy}` : ''}`
                          : '客户已确认上户'
                      }>
                        <Tag color="success">已上户</Tag>
                      </Tooltip>
                    ) : (
                      <Tag color="orange">待上户</Tag>
                    )}
                  </Descriptions.Item>
                )}

                <Descriptions.Item label="服务开始日期" span={1}>
                  <span style={{ fontWeight: 'bold' }}>
                    {/* 优先使用 templateParams 中的合同时间（支持合并格式和分拆年月日格式） */}
                    {getContractStartDate(contract)}
                  </span>
                </Descriptions.Item>

                <Descriptions.Item label="服务结束日期" span={1}>
                  <span style={{ fontWeight: 'bold' }}>
                    {getContractEndDate(contract)}
                  </span>
                </Descriptions.Item>

                <Descriptions.Item label="服务期限" span={1}>
                  <span style={{ color: '#52c41a' }}>
                    {(() => {
                      // 优先从 templateParams 计算服务期限（支持分拆年月日字段）
                      const startStr = getContractStartDate(contract);
                      const endStr = getContractEndDate(contract);
                      const start = dayjs(startStr, ['YYYY年MM月DD日', 'YYYY-MM-DD']);
                      const end = dayjs(endStr, ['YYYY年MM月DD日', 'YYYY-MM-DD']);
                      if (start.isValid() && end.isValid()) {
                        return end.diff(start, 'day') + 1;
                      }
                      return dayjs(contract.endDate).diff(dayjs(contract.startDate), 'day') + 1;
                    })()} 天
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

                <Descriptions.Item label="服务地址">
                  {customerAddress || (typeof contract.customerId === 'object' && contract.customerId?.address) || '未提供'}
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

                <Descriptions.Item label="联系地址">
                  {workerAddress || '未提供'}
                </Descriptions.Item>

                <Descriptions.Item label="背调信息">
                  {bgCheckLoading ? (
                    <Spin size="small" />
                  ) : backgroundCheck ? (
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <Tag color={BG_STATUS_MAP[backgroundCheck.status]?.color || 'default'}>
                          {BG_STATUS_MAP[backgroundCheck.status]?.text || '未知状态'}
                        </Tag>
                        {backgroundCheck.status === 4 || backgroundCheck.status === 16 ? (
                          <Tag color="success" icon={<CheckCircleOutlined />}>通过</Tag>
                        ) : backgroundCheck.status === 3 || backgroundCheck.status === 15 ? (
                          <Tag color="error" icon={<CloseOutlined />}>未通过</Tag>
                        ) : null}
                      </Space>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => navigate('/background-check')}
                        style={{ padding: 0 }}
                      >
                        查看详情 →
                      </Button>
                    </Space>
                  ) : (
                    <span style={{ color: '#999' }}>暂无背调记录</span>
                  )}
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

          {/* 收款信息 */}
          <Col span={24}>
            <Card
              type="inner"
              title={
                <Space>
                  <DollarOutlined />
                  <span>收款信息</span>
                </Space>
              }
              style={{ marginBottom: '16px' }}
            >
              <Descriptions column={3} bordered>
                <Descriptions.Item label="需要客户付费" span={1}>
                  <Switch
                    checked={!!contract.paymentEnabled}
                    onChange={handleTogglePayment}
                    loading={paymentToggleLoading}
                    checkedChildren="是"
                    unCheckedChildren="否"
                  />
                </Descriptions.Item>

                {contract.paymentEnabled && (
                  <Descriptions.Item label="支付状态" span={1}>
                    {contract.paymentStatus === 'paid' ? (
                      <Tag color="success">已支付</Tag>
                    ) : contract.paymentStatus === 'refunded' ? (
                      <Tag color="orange">已退款</Tag>
                    ) : (
                      <Tag color="default">未支付</Tag>
                    )}
                  </Descriptions.Item>
                )}

                {contract.paymentEnabled && contract.paymentStatus === 'paid' && (
                  <>
                    <Descriptions.Item label="实付金额" span={1}>
                      <span style={{ fontWeight: 'bold', color: '#52c41a', fontSize: '16px' }}>
                        ¥{((contract.paymentAmount || 0) / 100).toFixed(2)}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="支付时间" span={1}>
                      {contract.paidAt ? new Date(contract.paidAt).toLocaleString('zh-CN') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="收钱吧订单号" span={1}>
                      {contract.sqbSn || '-'}
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </Card>
          </Col>

          {/* 保险信息 */}
          <Col span={24}>
            <Card
              type="inner"
              title={
                <Space>
                  <SafetyOutlined />
                  <span>劳动者保险信息</span>
                </Space>
              }
              extra={
                !contract?.insuranceInfo?.hasInsurance && (
                  <Button
                    type="primary"
                    icon={<SafetyOutlined />}
                    onClick={() => {
                      // 跳转到保险购买页，传递劳动者信息
                      navigate(`/insurance/create?workerName=${encodeURIComponent(contract?.workerName || '')}&workerPhone=${encodeURIComponent(contract?.workerPhone || '')}&workerIdCard=${encodeURIComponent(contract?.workerIdCard || '')}`);
                    }}
                  >
                    购买保险
                  </Button>
                )
              }
              style={{ marginBottom: '16px' }}
            >
              {contract.insuranceInfo ? (
                contract.insuranceInfo.hasInsurance ? (
                  <>
                    <Alert
                      message={
                        <Space>
                          <CheckCircleOutlined />
                          <span>该劳动者已购买保险</span>
                        </Space>
                      }
                      description={`共有 ${contract.insuranceInfo.totalPolicies} 份有效保单`}
                      type="success"
                      showIcon={false}
                      style={{ marginBottom: 16 }}
                    />
                    <Descriptions column={1} bordered>
                      {contract.insuranceInfo.policies.map((policy, index) => (
                        <Descriptions.Item
                          key={policy.agencyPolicyRef}
                          label={`保单 ${index + 1}`}
                        >
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                              <strong>保单号：</strong>
                              {policy.policyNo || policy.agencyPolicyRef}
                            </div>
                            <div>
                              <strong>保险类型：</strong>
                              <Tag color="blue">{policy.planCode}</Tag>
                            </div>
                            <div>
                              <strong>保险期限：</strong>
                              {dayjs(policy.effectiveDate, 'YYYYMMDDHHmmss').format('YYYY-MM-DD')} 至{' '}
                              {dayjs(policy.expireDate, 'YYYYMMDDHHmmss').format('YYYY-MM-DD')}
                            </div>
                            <div>
                              <strong>保险金额：</strong>
                              <span style={{ fontWeight: 'bold', color: '#52c41a', fontSize: '16px' }}>
                                ¥{policy.totalPremium.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <strong>保单状态：</strong>
                              <Tag color={
                                policy.status === 'active' ? 'success' :
                                policy.status === 'processing' ? 'processing' :
                                'default'
                              }>
                                {policy.status === 'active' ? '已生效' :
                                 policy.status === 'processing' ? '处理中' :
                                 policy.status === 'pending' ? '待支付' :
                                 policy.status}
                              </Tag>
                            </div>
                            {policy.policyPdfUrl && (
                              <div>
                                <Button
                                  type="link"
                                  icon={<DownloadOutlined />}
                                  onClick={() => window.open(policy.policyPdfUrl, '_blank')}
                                >
                                  查看电子保单
                                </Button>
                              </div>
                            )}
                          </Space>
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  </>
                ) : (
                  <Alert
                    message={
                      <Space>
                        <CloseOutlined />
                        <span>该劳动者暂未购买保险</span>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>建议为劳动者购买相应的保险以保障双方权益</div>
                        <Button
                          type="primary"
                          icon={<SafetyOutlined />}
                          onClick={() => {
                            // 跳转到保险购买页，传递劳动者信息
                            navigate(`/insurance/create?workerName=${encodeURIComponent(contract?.workerName || '')}&workerPhone=${encodeURIComponent(contract?.workerPhone || '')}&workerIdCard=${encodeURIComponent(contract?.workerIdCard || '')}`);
                          }}
                        >
                          立即购买保险
                        </Button>
                      </Space>
                    }
                    type="warning"
                    showIcon={false}
                  />
                )
              ) : (
                <Spin tip="正在加载保险信息..." />
              )}
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
                  {(() => {
                    // 处理创建人信息的显示
                    if (typeof contract.createdBy === 'string') {
                      return contract.createdBy;
                    } else if (contract.createdBy && typeof contract.createdBy === 'object') {
                      // 如果是对象，优先显示 name，然后是 username
                      const creator = contract.createdBy as any;
                      return creator.name || creator.username || '系统';
                    } else {
                      return '未知';
                    }
                  })()}
                </Descriptions.Item>

                <Descriptions.Item label="创建时间" span={1}>
                  {formatDateTime(contract.createdAt)}
                </Descriptions.Item>

                <Descriptions.Item label="最后更新人" span={1}>
                  {(() => {
                    // 如果后端返回了用户对象，直接使用
                    if (contract.lastUpdatedBy && typeof contract.lastUpdatedBy === 'object') {
                      const updater = contract.lastUpdatedBy as any;
                      return updater.name || updater.username;
                    }

                    // 如果没有lastUpdatedBy或者仍然是字符串，显示默认值
                    return contract.lastUpdatedBy || '-';
                  })()}
                </Descriptions.Item>

                <Descriptions.Item label="最后更新时间" span={1}>
                  {formatDateTime(contract.updatedAt)}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 客户合同历史记录 - 固定显示 */}
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
                
                <Timeline
                  items={
                    latestHistoryContracts.length > 0
                      ? latestHistoryContracts.map(renderHistoryItem)
                      : [{
                          key: 'current',
                          color: 'green' as const,
                          children: (
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
                          )
                        }]
                  }
                />

                {olderHistoryContracts.length > 0 && (
                  <Collapse
                    defaultActiveKey={[]}
                    style={{ marginTop: '12px' }}
                    items={[
                      {
                        key: 'older-history',
                        label: (
                          <Space>
                            <HistoryOutlined />
                            <span>展开查看更早记录</span>
                            <Tag color="default">{olderHistoryContracts.length} 条</Tag>
                          </Space>
                        ),
                        children: (
                          <Timeline items={olderHistoryContracts.map(renderHistoryItem)} />
                        )
                      }
                    ]}
                  />
                )}
                
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