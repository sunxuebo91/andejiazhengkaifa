import React from 'react';
import { Card, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';

const ContractCreate: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Result
          status="info"
          title="创建合同功能"
          subTitle="此功能正在开发中，敬请期待"
          extra={[
            <Button 
              type="primary" 
              key="back"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/contracts/list')}
            >
              返回合同列表
            </Button>
          ]}
        />
      </Card>
    </div>
  );
};

export default ContractCreate;

