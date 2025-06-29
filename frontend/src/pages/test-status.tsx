import React from 'react';
import { Card, Typography } from 'antd';
import ContractStatusCard from '../components/ContractStatusCard';

const { Title } = Typography;

const TestStatusPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>合同状态测试页面</Title>
      
      <Card title="测试合同 - CONTRACT_1751007652612_53vpxu7sf">
        <ContractStatusCard
          contractNo="CONTRACT_1751007652612_53vpxu7sf"
          contractName="安得家政服务合同"
          showRefreshButton={true}
          autoRefresh={false}
          size="default"
          onStatusChange={(statusInfo) => {
            console.log('状态变化:', statusInfo);
            if (statusInfo?.isDetailedStatus) {
              console.log('🎯 检测到精准状态:', statusInfo.statusText);
            }
          }}
        />
      </Card>
    </div>
  );
};

export default TestStatusPage; 