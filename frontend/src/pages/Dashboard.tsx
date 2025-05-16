import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, Statistic, Spin, message, Space, Alert, Button } from 'antd';
import { UserOutlined, FileAddOutlined, CheckCircleOutlined, CloseCircleOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalResumes: 0,
    newTodayResumes: 0,
    acceptingResumes: 0,
    notAcceptingResumes: 0,
    onServiceResumes: 0
  });
  const [messageApi, contextHolder] = message.useMessage();

  // 从后端获取统计数据
  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('正在获取简历数据...');
      // 获取所有简历
      const response = await axios.get('/api/resumes', {
        timeout: 10000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      console.log('获取到简历数据:', response.data ? response.data.length : 0, '条记录');

      // 当天的起始时间（零点）
      const todayStart = dayjs().startOf('day');
      
      // 分类统计
      const resumes = response.data || [];
      const totalResumes = resumes.length;
      
      // 今日新增：创建时间在今天的简历
      const newTodayResumes = resumes.filter(resume => 
        resume.createdAt && dayjs(resume.createdAt).isAfter(todayStart)
      ).length;
      
      // 按接单状态统计
      const acceptingResumes = resumes.filter(resume => resume.orderStatus === 'accepting').length;
      const notAcceptingResumes = resumes.filter(resume => resume.orderStatus === 'not-accepting').length;
      const onServiceResumes = resumes.filter(resume => resume.orderStatus === 'on-service').length;
      
      setStats({
        totalResumes,
        newTodayResumes,
        acceptingResumes,
        notAcceptingResumes,
        onServiceResumes
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      setError('获取统计数据失败，请稍后重试');
      messageApi.error('获取统计数据失败，请稍后刷新页面');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // 每分钟刷新一次数据
    const intervalId = setInterval(() => {
      fetchStats();
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleRetry = () => {
    fetchStats();
  };

  const content = (
    <Card style={{ marginBottom: 24 }}>
      {error && (
        <Alert
          message="数据加载错误"
          description={error}
          type="error"
          showIcon
          action={
            <Button 
              size="small" 
              type="primary" 
              onClick={handleRetry}
              icon={<ReloadOutlined />}
            >
              重试
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <Card variant="outlined">
            <Statistic
              title="简历总量"
              value={stats.totalResumes}
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <Card variant="outlined">
            <Statistic
              title="今日新增"
              value={stats.newTodayResumes}
              valueStyle={{ color: '#52c41a' }}
              prefix={<FileAddOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <Card variant="outlined">
            <Statistic
              title="想接单阿姨"
              value={stats.acceptingResumes}
              valueStyle={{ color: '#faad14' }}
              prefix={<CheckCircleOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <Card variant="outlined">
            <Statistic
              title="不接单阿姨"
              value={stats.notAcceptingResumes}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <Card variant="outlined">
            <Statistic
              title="已上户阿姨"
              value={stats.onServiceResumes}
              valueStyle={{ color: '#13c2c2' }}
              prefix={<HomeOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>
    </Card>
  );

  return (
    <PageContainer
      header={{
        title: '驾驶舱',
      }}
      extra={[
        <Button 
          key="refresh" 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={handleRetry}
          loading={loading}
        >
          刷新数据
        </Button>
      ]}
    >
      {contextHolder}
      
      <div style={{ position: 'relative', minHeight: '200px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', position: 'absolute', width: '100%', zIndex: 1 }}>
            <Spin size="large" />
          </div>
        ) : null}
        <div style={{ opacity: loading ? 0.5 : 1 }}>
          {content}
        </div>
      </div>
    </PageContainer>
  );
};

export default Dashboard; 