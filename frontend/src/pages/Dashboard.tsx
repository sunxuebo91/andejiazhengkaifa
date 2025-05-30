import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, Statistic, Spin, App } from 'antd';
import { UserOutlined, FileAddOutlined, CheckCircleOutlined, CloseCircleOutlined, HomeOutlined } from '@ant-design/icons';
import apiService from '../services/api';
import dayjs from 'dayjs';
import type { Resume } from '../services/resume.service';

// 定义统计数据接口
interface Stats {
  totalResumes: number;
  newTodayResumes: number;
  acceptingResumes: number;
  notAcceptingResumes: number;
  onServiceResumes: number;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<Stats>({
    totalResumes: 0,
    newTodayResumes: 0,
    acceptingResumes: 0,
    notAcceptingResumes: 0,
    onServiceResumes: 0
  });
  const { message: messageApi } = App.useApp();

  // 从后端获取统计数据
  const fetchStats = async () => {
    setLoading(true);
    try {
      // 获取所有简历，设置较大的pageSize以确保获取所有数据
      const response = await apiService.get('/api/resumes', {
        page: 1,
        pageSize: 1000 // 设置一个足够大的数值以获取所有数据
      }, {
        timeout: 10000
      });

      // 使用后端返回的新格式
      const { success, data: paginatedData } = response;
      if (!success || !paginatedData) {
        throw new Error('获取数据失败');
      }

      const { items: resumes = [], total } = paginatedData;

      // 如果返回的数据总数大于当前获取的数据量，说明还有更多数据
      if (total > resumes.length) {
        console.warn(`警告：简历总数(${total})大于当前获取的数据量(${resumes.length})，统计数据可能不准确`);
      }

      // 当天的起始时间（零点）
      const todayStart = dayjs().startOf('day');
      
      // 分类统计
      const totalResumes = total; // 使用后端返回的总数
      
      // 今日新增：创建时间在今天的简历
      const newTodayResumes = resumes.filter((resume: Resume) => 
        resume.createdAt && dayjs(resume.createdAt).isAfter(todayStart)
      ).length;
      
      // 按接单状态统计
      const acceptingResumes = resumes.filter((resume: Resume) => resume.orderStatus === 'accepting').length;
      const notAcceptingResumes = resumes.filter((resume: Resume) => resume.orderStatus === 'not-accepting').length;
      const onServiceResumes = resumes.filter((resume: Resume) => resume.orderStatus === 'on-service').length;

      // 更新统计数据
      setStats({
        totalResumes,
        newTodayResumes,
        acceptingResumes,
        notAcceptingResumes,
        onServiceResumes
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      messageApi.error('获取统计数据失败，请稍后重试');
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

  const content = (
    <Card style={{ marginBottom: 24 }}>
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
    >
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