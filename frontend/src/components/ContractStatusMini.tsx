import React, { useState, useEffect } from 'react';
import { Tag, Tooltip, Spin } from 'antd';
import esignService from '../services/esignService';

interface ContractStatusMiniProps {
  contractNo: string;
  onStatusChange?: (status: number | null) => void;
}

export const ContractStatusMini: React.FC<ContractStatusMiniProps> = ({
  contractNo,
  onStatusChange
}) => {
  const [status, setStatus] = useState<number | null>(null);
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
    return textMap[status] || '未知';
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

  // 查询合同状态
  const checkContractStatus = async () => {
    if (!contractNo) return;

    setLoading(true);
    try {
      const response = await esignService.getContractStatus(contractNo);
      
      let apiResult = response;
      if (typeof response === 'string') {
        try {
          apiResult = JSON.parse(response);
        } catch (e) {
          console.error('JSON解析失败:', e);
          return;
        }
      }

      let statusValue = null;
      
      // 直接爱签API格式 {code: 100000, msg: '成功', data: {...}}
      if (((apiResult as any).code === 100000 || (apiResult as any).code === '100000') && (apiResult as any).data) {
        statusValue = (apiResult as any).data?.status;
      }
      // 后端包装格式
      else if (apiResult.success === true && apiResult.data) {
        statusValue = apiResult.data?.status || apiResult.statusInfo?.status;
      }
      // 嵌套的爱签API格式
      else if (apiResult.data && typeof apiResult.data === 'object' && 
              'code' in apiResult.data && 
              (apiResult.data.code === 100000 || apiResult.data.code === '100000')) {
        statusValue = apiResult.data.data?.status;
      }

      if (statusValue !== undefined && statusValue !== null) {
        setStatus(statusValue);
        if (onStatusChange) {
          onStatusChange(statusValue);
        }
      }
    } catch (error) {
      console.error('查询合同状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkContractStatus();
  }, [contractNo]);

  if (loading) {
    return <Spin size="small" />;
  }

  if (status === null) {
    return <Tag color="default">查询中</Tag>;
  }

  return (
    <Tooltip title={getStatusDescription(status)}>
      <Tag color={getStatusColor(status)} style={{ cursor: 'help' }}>
        {getStatusText(status)}
      </Tag>
    </Tooltip>
  );
};

export default ContractStatusMini; 