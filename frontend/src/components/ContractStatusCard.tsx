import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Row, Col, message, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import esignService from '../services/esignService';
import { DetailedContractStatus, EnhancedContractStatusResponse } from '../types/contract.types';

export interface ContractStatusInfo {
  contractNo: string;
  contractName?: string;
  status: number;
  statusText: string;
  statusColor: string;
  statusDescription: string;
  rawData?: any;
  // 🎯 新增：精准状态信息
  detailedStatus?: DetailedContractStatus;
  isDetailedStatus?: boolean; // 是否为精准状态
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
  // 🔥 订单类别：用于区分家政/职培合同的签署方角色标签
  orderCategory?: 'housekeeping' | 'training';
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
  title = '合同状态信息',
  orderCategory,
}) => {
  const [contractStatus, setContractStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 状态映射函数
  const getStatusColor = (status: number): string => {
    const colorMap: { [key: number]: string } = {
      0: 'orange',    // 等待签约
      1: 'blue',      // 签约中
      2: '#5DBFB3',   // 已签约 - 使用主题色
      3: 'red',       // 过期
      4: 'red',       // 拒签
      6: 'gray',      // 作废
      7: 'gray'       // 撤销
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
      const response = await esignService.getContractStatus(contractNo, orderCategory);
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
        
        // 🎯 检查是否有精准状态解析结果
        // 首先检查API响应是否包含detailedStatus
        const apiResponse = response as any;
        let detailedStatus = apiResponse?.detailedStatus || (contractData as EnhancedContractStatusResponse)?.detailedStatus;
        let isDetailedStatus = detailedStatus?.detailed === true;
        
        console.log('🎯 精准状态检查:');
        console.log('- API响应:', apiResponse);
        console.log('- contractData:', contractData);
        console.log('- detailedStatus:', detailedStatus);
        console.log('- isDetailedStatus:', isDetailedStatus);
        console.log('- detailedStatus.text:', detailedStatus?.text);
        
        // 简化的日志记录
        console.log('🎯 精准状态检查:');
        console.log('- contractData:', contractData);
        console.log('- detailedStatus:', detailedStatus);
        console.log('- isDetailedStatus:', isDetailedStatus);
        console.log('- detailedStatus.text:', detailedStatus?.text);
        
        // 创建状态信息对象
        const statusInfo: ContractStatusInfo = {
          contractNo,
          contractName: contractData.data?.contractName || contractName,
          status: statusValue,
          // 🎯 优先使用精准状态文本
          statusText: isDetailedStatus ? detailedStatus.text : getStatusText(statusValue),
          statusColor: isDetailedStatus ? detailedStatus.color : getStatusColor(statusValue),
          statusDescription: isDetailedStatus ? detailedStatus.summary || getStatusDescription(statusValue) : getStatusDescription(statusValue),
          rawData: contractData,
          detailedStatus: detailedStatus,
          isDetailedStatus: isDetailedStatus
        };

        // 通知父组件状态变化
        if (onStatusChange) {
          onStatusChange(statusInfo);
        }
        
        // 🎯 精准状态的消息显示
        if (showMessage) {
          const displayText = isDetailedStatus ? detailedStatus.text : getStatusText(statusValue);
          const messageType = isDetailedStatus ? detailedStatus.type : 
            (statusValue === 2 ? 'success' : statusValue >= 3 ? 'error' : 'info');
          
                     if (messageType === 'success') {
             message.success(`合同状态：${displayText}`);
           } else if (messageType === 'error') {
             message.error(`合同状态：${displayText}`);
           } else if (messageType === 'warning') {
             message.warning(`合同状态：${displayText}`);
           } else {
             message.info(`合同状态：${displayText}`);
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
  }, [contractNo, orderCategory]);

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
                {/* 🎯 优先显示精准状态 */}
                {contractStatus.detailedStatus?.detailed ? (
                  <Tooltip title={contractStatus.detailedStatus.summary}>
                    <Tag 
                      color={contractStatus.detailedStatus.color}
                      icon={contractStatus.detailedStatus.detailed ? <TeamOutlined /> : undefined}
                    >
                      {contractStatus.detailedStatus.text}
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tag color={getStatusColor(contractStatus.data?.status)}>
                    {getStatusText(contractStatus.data?.status)}
                  </Tag>
                )}
              </p>
            </Col>
          </Row>
          
          {/* 🎯 精准状态说明 */}
          <p><strong>状态说明：</strong>
            {contractStatus.detailedStatus?.summary || getStatusDescription(contractStatus.data?.status)}
          </p>
          
          {/* 🎯 精准签署方状态显示 */}
          {contractStatus.detailedStatus?.detailed && contractStatus.detailedStatus.customer && contractStatus.detailedStatus.worker && (() => {
            const overallSt = Number(contractStatus.data?.status);
            const isTerminated = [3, 4, 5, 6, 7].includes(overallSt);
            const termTextMap: Record<number, string> = { 3: '已过期', 4: '已拒签', 5: '已过期', 6: '已作废', 7: '已撤销' };
            const termText = termTextMap[overallSt] || '已终止';

            const renderSigner = (label: string, name: string, signed: boolean) => {
              let tagColor: string;
              let tagText: string;
              let bg: string;
              let border: string;
              if (signed) {
                tagColor = 'green'; tagText = '已签约'; bg = '#f6ffed'; border = '#b7eb8f';
              } else if (isTerminated) {
                tagColor = 'default'; tagText = termText; bg = '#f5f5f5'; border = '#d9d9d9';
              } else {
                tagColor = 'orange'; tagText = '未签约'; bg = '#fff7e6'; border = '#ffd591';
              }
              return (
                <Col span={12}>
                  <div style={{ padding: '12px', background: bg, borderRadius: '6px', border: `1px solid ${border}` }}>
                    <div style={{ marginBottom: '8px' }}>
                      <UserOutlined style={{ marginRight: '6px' }} />
                      <strong>{label}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{name}</div>
                    <div style={{ marginTop: '4px' }}>
                      <Tag color={tagColor}>{tagText}</Tag>
                    </div>
                  </div>
                </Col>
              );
            };

            return (
              <div style={{ marginTop: 16 }}>
                <p><strong>详细签署状态：</strong></p>
                <Row gutter={[12, 8]}>
                  {orderCategory === 'training' ? (
                    <>
                      {renderSigner('甲方（企业）', contractStatus.detailedStatus.customer?.name || '北京安得家政有限公司', contractStatus.detailedStatus.customerSigned)}
                      {renderSigner('乙方（学员）', contractStatus.detailedStatus.worker?.name || '学员', contractStatus.detailedStatus.workerSigned)}
                    </>
                  ) : (
                    <>
                      {renderSigner('甲方（客户）', contractStatus.detailedStatus.customer.name || '客户', contractStatus.detailedStatus.customerSigned)}
                      {renderSigner('乙方（阿姨）', contractStatus.detailedStatus.worker.name || '阿姨', contractStatus.detailedStatus.workerSigned)}
                    </>
                  )}
                </Row>
              </div>
            );
          })()}
          
          {/* 🔥 显示签署方详细状态（支持signers和signUsers两种数据格式） */}
          {!contractStatus.detailedStatus?.detailed && (contractStatus.data?.signers?.length > 0 || contractStatus.data?.signUsers?.length > 0) && (
            <div style={{ marginTop: 16 }}>
              <p><strong>签署方状态：</strong></p>
              <Row gutter={[12, 8]}>
                {(contractStatus.data.signUsers || contractStatus.data.signers || []).map((signer: any, index: number) => {
                  // 🔥 统一使用 Number() 转换，避免字符串/数字类型不一致
                  const signStatus = Number(signer.signStatus ?? signer.status ?? 0);
                  const overallStatus = Number(contractStatus.data?.status);

                  // 🔥 判断合同整体是否已终止（撤销/作废/过期/拒签）
                  const isContractTerminated = [3, 4, 5, 6, 7].includes(overallStatus);
                  const terminatedTextMap: Record<number, string> = {
                    3: '已过期', 4: '已拒签', 5: '已过期', 6: '已作废', 7: '已撤销',
                  };

                  const isSigned = signStatus === 2;
                  const isPending = signStatus === 0 || signStatus === 1;
                  const isRejected = signStatus === 3 && !isContractTerminated;

                  // 🔥 核心修复：合同已终止时，未签约方应显示终止状态而非"签约中"
                  let statusColor: string;
                  let statusText: string;
                  let bgColor: string;
                  let borderColor: string;

                  if (isSigned) {
                    statusColor = 'green';
                    statusText = signer.signStatusText || '已签约';
                    bgColor = '#f6ffed';
                    borderColor = '#b7eb8f';
                  } else if (isContractTerminated) {
                    // 合同已终止，未签约方显示终止原因
                    statusColor = 'default';
                    statusText = terminatedTextMap[Number(overallStatus)] || '已终止';
                    bgColor = '#f5f5f5';
                    borderColor = '#d9d9d9';
                  } else if (isRejected) {
                    statusColor = 'red';
                    statusText = signer.signStatusText || '已拒签';
                    bgColor = '#fff2f0';
                    borderColor = '#ffccc7';
                  } else {
                    statusColor = 'orange';
                    statusText = signer.signStatusText || (isPending ? '待签约' : '未知');
                    bgColor = '#fff7e6';
                    borderColor = '#ffd591';
                  }

                  return (
                    <Col key={index} span={8}>
                      <div style={{
                        padding: '10px 12px',
                        background: bgColor,
                        borderRadius: '6px',
                        border: `1px solid ${borderColor}`,
                        fontSize: '12px'
                      }}>
                        <div style={{ marginBottom: '4px' }}>
                          <UserOutlined style={{ marginRight: '4px' }} />
                          <strong>{signer.role || signer.name || `签署方${index + 1}`}</strong>
                        </div>
                        {signer.name && signer.role && (
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                            {signer.name}
                          </div>
                        )}
                        <div>
                          <Tag color={statusColor}>
                            {statusText}
                          </Tag>
                        </div>
                        {signer.signTime && (
                          <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
                            签署时间: {signer.signTime}
                          </div>
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default ContractStatusCard; 