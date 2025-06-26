import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Row, Col, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import esignService from '../services/esignService';

export interface ContractStatusInfo {
  contractNo: string;
  contractName?: string;
  status: number;
  statusText: string;
  statusColor: string;
  statusDescription: string;
  rawData?: any;
}

interface ContractStatusCardProps {
  contractNo: string;
  contractName?: string;
  showRefreshButton?: boolean;
  autoRefresh?: boolean;
  autoRefreshInterval?: number; // 自动刷新间隔（毫秒）
  size?: 'small' | 'default';
  style?: React.CSSProperties;
  onStatusChange?: (statusInfo: ContractStatusInfo | null) => void;
  showTitle?: boolean;
  title?: string;
}

export const ContractStatusCard: React.FC<ContractStatusCardProps> = ({
  contractNo,
  contractName,
  showRefreshButton = true,
  autoRefresh = false,
  autoRefreshInterval = 30000, // 默认30秒
  size = 'small',
  style,
  onStatusChange,
  showTitle = true,
  title = '合同状态信息'
}) => {
  const [contractStatus, setContractStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 状态映射函数
  const getStatusColor = (status: number): string => {
    const colorMap: { [key: number]: string } = {
      0: 'orange',  // 等待签约
      1: 'blue',    // 签约中
      2: 'green',   // 已签约
      3: 'red',     // 过期
      4: 'red',     // 拒签
      6: 'gray',    // 作废
      7: 'gray'     // 撤销
    };
    return colorMap[status] || 'gray';
  };

  const getStatusText = (status: number): string => {
    const textMap: { [key: number]: string } = {
      0: '等待签约',
      1: '签约中',
      2: '已签约',
      3: '过期',
      4: '拒签',
      6: '作废',
      7: '撤销'
    };
    return textMap[status] || '未知状态';
  };

  const getStatusDescription = (status: number): string => {
    const descMap: { [key: number]: string } = {
      0: '合同已创建，等待签署方签约',
      1: '合同正在签署过程中',
      2: '合同已完成签署',
      3: '合同已过期',
      4: '签署方拒绝签署合同',
      6: '合同已作废',
      7: '合同已撤销'
    };
    return descMap[status] || '无法获取合同状态信息';
  };

  // 查询合同状态的核心函数
  const checkContractStatus = async (showMessage = true) => {
    if (!contractNo) {
      if (showMessage) {
        message.error('合同编号不存在，无法查询状态');
      }
      return null;
    }

    console.log(`🔍 开始查询合同状态，合同编号: ${contractNo}`);
    setLoading(true);
    
    try {
      // 调用后端API
      const response = await esignService.getContractStatus(contractNo);
      console.log('📦 API响应 (原始):', response);
      console.log('📦 响应类型:', typeof response);
      
      // 🔥 重写：简化响应处理逻辑
      let apiResult = response;
      
      // 如果是字符串，尝试解析
      if (typeof response === 'string') {
        try {
          apiResult = JSON.parse(response);
          console.log('✅ JSON解析成功:', apiResult);
        } catch (e) {
          console.error('❌ JSON解析失败:', e);
          if (showMessage) {
            message.error('服务器响应格式错误');
          }
          return null;
        }
      }
      
      console.log('🔍 处理后的结果:', apiResult);
      console.log('🔍 检查字段:');
      console.log('  - success:', apiResult.success);
      console.log('  - message:', apiResult.message);
      console.log('  - data:', apiResult.data);
      console.log('  - statusInfo:', apiResult.statusInfo);
      
      // 🔥 重写：统一判断成功条件
      let isSuccess = false;
      let contractData = null;
      let statusValue = null;
      
      // 方式1：直接爱签API格式 {code: 100000, msg: '成功', data: {...}}
      if (((apiResult as any).code === 100000 || (apiResult as any).code === '100000') && (apiResult as any).data) {
        isSuccess = true;
        contractData = apiResult;
        statusValue = (apiResult as any).data?.status;
        console.log('✅ 识别为直接爱签API格式');
        console.log('📊 提取的状态值:', statusValue);
      }
      // 方式2：后端包装格式 {success: true, data: {...}, statusInfo: {...}}
      else if (apiResult.success === true && apiResult.data) {
        isSuccess = true;
        contractData = apiResult;
        statusValue = apiResult.data?.status || apiResult.statusInfo?.status;
        console.log('✅ 识别为后端包装格式');
        console.log('📊 提取的状态值:', statusValue);
      }
      // 方式3：嵌套的爱签API格式（如果data中包含code字段）
      else if (apiResult.data && typeof apiResult.data === 'object' && 
              'code' in apiResult.data && 
              (apiResult.data.code === 100000 || apiResult.data.code === '100000')) {
        isSuccess = true;
        contractData = apiResult.data;
        statusValue = apiResult.data.data?.status;
        console.log('✅ 识别为嵌套的爱签API格式');
        console.log('📊 提取的状态值:', statusValue);
      }
      
      if (isSuccess && contractData && statusValue !== undefined && statusValue !== null) {
        // 🎉 成功获取合同状态
        console.log('🎉 合同状态查询成功！状态值:', statusValue);
        
        setContractStatus(contractData);
        console.log('📋 设置的contractStatus:', contractData);
        console.log('📋 contractStatus.data.status:', contractData.data.status);
        
        // 创建状态信息对象
        const statusInfo: ContractStatusInfo = {
          contractNo,
          contractName: contractData.data?.contractName || contractName,
          status: statusValue,
          statusText: getStatusText(statusValue),
          statusColor: getStatusColor(statusValue),
          statusDescription: getStatusDescription(statusValue),
          rawData: contractData
        };

        // 通知父组件状态变化
        if (onStatusChange) {
          onStatusChange(statusInfo);
        }
        
        // 状态映射
        const statusMap: { [key: number]: { text: string; type: 'success' | 'info' | 'warning' | 'error' } } = {
          0: { text: '等待签约', type: 'warning' },
          1: { text: '签约中', type: 'info' },
          2: { text: '已签约', type: 'success' },
          3: { text: '过期', type: 'error' },
          4: { text: '拒签', type: 'error' },
          6: { text: '作废', type: 'warning' },
          7: { text: '撤销', type: 'warning' }
        };
        
        const statusInfo2 = statusMap[statusValue] || { text: '未知状态', type: 'info' };
        
        // 显示成功消息
        if (showMessage) {
          if (statusInfo2.type === 'success') {
            message.success(`合同状态：${statusInfo2.text}`);
          } else if (statusInfo2.type === 'error') {
            message.error(`合同状态：${statusInfo2.text}`);
          } else if (statusInfo2.type === 'warning') {
            message.warning(`合同状态：${statusInfo2.text}`);
          } else {
            message.info(`合同状态：${statusInfo2.text}`);
          }
        }

        return statusInfo;
        
      } else {
        // 🚨 查询失败
        console.log('❌ 合同状态查询失败');
        console.log('  - isSuccess:', isSuccess);
        console.log('  - contractData:', contractData);
        console.log('  - statusValue:', statusValue);
        
        setContractStatus(null);
        
        if (onStatusChange) {
          onStatusChange(null);
        }
        
        // 错误处理
        let errorMessage = '合同状态查询失败';
        let errorCode = null;
        
        // 获取错误码和错误信息
        if (apiResult.success === false) {
          errorCode = apiResult.errorCode;
          errorMessage = apiResult.message || errorMessage;
        } else if ((apiResult as any).code && (apiResult as any).code !== 100000) {
          errorCode = (apiResult as any).code;
          errorMessage = (apiResult as any).msg || errorMessage;
        } else if (apiResult.data && typeof apiResult.data === 'object' && 
                  'code' in apiResult.data && apiResult.data.code !== 100000) {
          errorCode = apiResult.data.code;
          errorMessage = (apiResult.data as any).msg || errorMessage;
        }
        
        // 根据错误码显示具体错误
        if (errorCode) {
          switch (Number(errorCode)) {
            case 100056:
              errorMessage = '参数错误：合同编号为空或格式错误';
              break;
            case 100066:
              errorMessage = '合同不存在，请检查合同编号是否正确';
              break;
            case 100613:
              errorMessage = '合同已被删除';
              break;
            default:
              errorMessage = `查询失败 (错误码: ${errorCode}): ${errorMessage}`;
          }
        }
        
        if (showMessage) {
          message.error(errorMessage);
        }

        return null;
      }
      
    } catch (error: any) {
      console.error('🚨 查询合同状态异常:', error);
      setContractStatus(null);
      
      if (onStatusChange) {
        onStatusChange(null);
      }
      
      // 网络或系统错误处理
      if (showMessage) {
        if (error?.response?.status === 404) {
          message.error('合同查询服务不可用，请稍后重试');
        } else if (error?.response?.status >= 500) {
          message.error('服务器内部错误，请联系管理员');
        } else if (error?.message?.includes('Network Error')) {
          message.error('网络连接失败，请检查网络');
        } else {
          message.error('查询合同状态失败，请重试');
        }
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  // 自动查询逻辑
  useEffect(() => {
    if (contractNo) {
      // 初始查询（不显示消息）
      checkContractStatus(false);
    }
  }, [contractNo]);

  // 自动刷新逻辑
  useEffect(() => {
    if (autoRefresh && contractNo) {
      const interval = setInterval(() => {
        checkContractStatus(false); // 自动刷新时不显示消息
      }, autoRefreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, contractNo, autoRefreshInterval]);

  // 手动刷新
  const handleRefresh = () => {
    checkContractStatus(true); // 手动刷新时显示消息
  };

  // 如果没有合同编号，不显示组件
  if (!contractNo) {
    return null;
  }

  // 如果没有状态数据且不在加载中，显示空状态
  if (!contractStatus && !loading) {
    return (
      <Card 
        title={showTitle ? title : undefined}
        size={size} 
        style={{ background: '#fafafa', ...style }}
        extra={showRefreshButton ? (
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
          >
            重新查询
          </Button>
        ) : undefined}
      >
        <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
          <p>暂无合同状态信息</p>
          <Button 
            type="primary" 
            size="small" 
            icon={<SearchOutlined />} 
            onClick={handleRefresh}
            loading={loading}
          >
            查询状态
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={showTitle ? title : undefined}
      size={size} 
      style={{ background: '#f0f9ff', ...style }}
      loading={loading}
      extra={showRefreshButton ? (
        <Button 
          size="small" 
          icon={<ReloadOutlined />} 
          onClick={handleRefresh}
          loading={loading}
        >
          刷新状态
        </Button>
      ) : undefined}
    >
      {contractStatus && (
        <>
          <Row gutter={16}>
            <Col span={8}>
              <p><strong>合同编号：</strong>{contractStatus.data?.contractNo || contractNo}</p>
            </Col>
            <Col span={8}>
              <p><strong>合同名称：</strong>{contractStatus.data?.contractName || contractName || '未知'}</p>
            </Col>
            <Col span={8}>
              <p><strong>当前状态：</strong>
                <Tag color={getStatusColor(contractStatus.data?.status)}>
                  {getStatusText(contractStatus.data?.status)}
                </Tag>
              </p>
            </Col>
          </Row>
          <p><strong>状态说明：</strong>{getStatusDescription(contractStatus.data?.status)}</p>
          
          {/* 如果有签署方信息，也显示出来 */}
          {contractStatus.data?.signers && contractStatus.data.signers.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p><strong>签署方状态：</strong></p>
              <Row gutter={[8, 8]}>
                {contractStatus.data.signers.map((signer: any, index: number) => (
                  <Col key={index} span={8}>
                    <div style={{ 
                      padding: '8px 12px', 
                      background: '#f9f9f9', 
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <div><strong>{signer.name || `签署方${index + 1}`}</strong></div>
                      <div>
                        <Tag 
                          color={signer.status === 2 ? 'green' : signer.status === 1 ? 'orange' : 'gray'}
                        >
                          {signer.status === 2 ? '已签署' : signer.status === 1 ? '待签署' : '未签署'}
                        </Tag>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default ContractStatusCard; 