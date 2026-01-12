import React from 'react';
import { Card, Result, Button } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';

const BannerForm: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer title="Banner表单">
      <Card>
        <Result
          status="info"
          title="请使用列表页面的弹窗进行操作"
          subTitle="Banner的新建和编辑功能已集成到列表页面中"
          extra={
            <Button type="primary" onClick={() => navigate('/baobei/banner')}>
              返回Banner列表
            </Button>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default BannerForm;
