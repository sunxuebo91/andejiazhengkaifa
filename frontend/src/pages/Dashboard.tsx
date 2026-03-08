import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, Statistic, Spin, App, Progress, Typography, Alert, DatePicker, Select, Space, Button, Table, Tag, InputNumber, Tooltip } from 'antd';
import {
  UserOutlined,
  FileAddOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HomeOutlined,
  TeamOutlined,
  ContainerOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  MoneyCollectOutlined,
  LineChartOutlined,
  BankOutlined,
  PercentageOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  SmileOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  FunnelPlotOutlined,
  TrophyOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import dashboardService from '../services/dashboardService';
import { apiService } from '../services/api';
import type { DashboardStats, SalesFunnelItem } from '../types/dashboard.types';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// 时间筛选选项
const TIME_RANGE_OPTIONS = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'thisWeek' },
  { label: '上周', value: 'lastWeek' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
  { label: '近7天', value: 'last7Days' },
  { label: '近30天', value: 'last30Days' },
  { label: '自定义', value: 'custom' }
];

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { message: messageApi } = App.useApp();

  // 本月任务编辑状态
  const [editingTaskUserId, setEditingTaskUserId] = useState<string | null>(null);
  const [editingTaskValue, setEditingTaskValue] = useState<number>(0);
  const [savingTask, setSavingTask] = useState(false);

  // 更新员工本月任务
  const handleUpdateMonthlyTask = async (userId: string, newValue: number) => {
    setSavingTask(true);
    try {
      const response = await apiService.patch(`/api/users/${userId}/monthly-task`, { monthlyTask: newValue });
      if (response.success) {
        messageApi.success('本月任务更新成功');
        // 更新本地状态
        if (stats) {
          const updatedList = stats.salesFunnel.salesFunnelList.map((item: SalesFunnelItem) =>
            item.userId === userId ? { ...item, monthlyTask: newValue } : item
          );
          setStats({
            ...stats,
            salesFunnel: {
              ...stats.salesFunnel,
              salesFunnelList: updatedList
            }
          });
        }
        setEditingTaskUserId(null);
      } else {
        messageApi.error(response.message || '更新失败');
      }
    } catch (err: any) {
      messageApi.error(err.message || '更新本月任务失败');
    } finally {
      setSavingTask(false);
    }
  };

  // 获取时间范围的开始和结束日期
  const getDateRange = (range: string): [string, string] => {
    const now = dayjs();

    switch (range) {
      case 'today':
        return [now.startOf('day').toISOString(), now.endOf('day').toISOString()];
      case 'yesterday':
        const yesterday = now.subtract(1, 'day');
        return [yesterday.startOf('day').toISOString(), yesterday.endOf('day').toISOString()];
      case 'thisWeek':
        return [now.startOf('week').toISOString(), now.endOf('week').toISOString()];
      case 'lastWeek':
        const lastWeekStart = now.subtract(1, 'week').startOf('week');
        const lastWeekEnd = now.subtract(1, 'week').endOf('week');
        return [lastWeekStart.toISOString(), lastWeekEnd.toISOString()];
      case 'thisMonth':
        return [now.startOf('month').toISOString(), now.endOf('month').toISOString()];
      case 'lastMonth':
        const lastMonthStart = now.subtract(1, 'month').startOf('month');
        const lastMonthEnd = now.subtract(1, 'month').endOf('month');
        return [lastMonthStart.toISOString(), lastMonthEnd.toISOString()];
      case 'last7Days':
        return [now.subtract(7, 'day').startOf('day').toISOString(), now.endOf('day').toISOString()];
      case 'last30Days':
        return [now.subtract(30, 'day').startOf('day').toISOString(), now.endOf('day').toISOString()];
      case 'custom':
        if (customDateRange) {
          return [customDateRange[0].startOf('day').toISOString(), customDateRange[1].endOf('day').toISOString()];
        }
        return [now.startOf('month').toISOString(), now.endOf('month').toISOString()];
      default:
        return [now.startOf('month').toISOString(), now.endOf('month').toISOString()];
    }
  };

  // 根据时间范围获取动态标题
  const getTimeRangeLabel = (range: string): string => {
    switch (range) {
      case 'today':
        return '今日';
      case 'yesterday':
        return '昨日';
      case 'thisWeek':
        return '本周';
      case 'lastWeek':
        return '上周';
      case 'thisMonth':
        return '本月';
      case 'lastMonth':
        return '上月';
      case 'last7Days':
        return '近7天';
      case 'last30Days':
        return '近30天';
      case 'custom':
        return '时间段内';
      default:
        return '本月';
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [startDate, endDate] = getDateRange(timeRange);
      const data = await dashboardService.getDashboardStats({
        startDate,
        endDate
      });
      setStats(data);
    } catch (error: any) {
      console.error('获取驾驶舱统计数据失败:', error);
      messageApi.error(error.message || '获取统计数据失败，请稍后重试');
      setError('获取数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 手动刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardStats();
    setRefreshing(false);
  };

  // 时间范围变化处理
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    if (value !== 'custom') {
      setCustomDateRange(null);
    }
  };

  // 自定义日期范围变化处理
  const handleCustomDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setCustomDateRange([dates[0], dates[1]]);
      if (timeRange === 'custom') {
        // 如果选择了自定义日期且当前是自定义模式，立即刷新数据
        setTimeout(fetchDashboardStats, 100);
      }
    } else {
      setCustomDateRange(null);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  // 自动刷新（每分钟）
  useEffect(() => {
    const intervalId = setInterval(fetchDashboardStats, 60000);
    return () => clearInterval(intervalId);
  }, [timeRange]);

  // 渲染OABCD分类总量统计
  const renderLeadLevelDistribution = () => {
    if (!stats?.leadQuality.leadLevelDistribution) return null;

    const { oLevel, aLevel, bLevel, cLevel, dLevel, total } = stats.leadQuality.leadLevelDistribution;

    return (
      <div style={{ marginTop: 16 }}>
        <Text strong style={{ marginBottom: 8, display: 'block' }}>OABCD分类总量</Text>
        <Row gutter={[8, 8]}>
          <Col span={4}>
            <Statistic
              title="O类"
              value={oLevel}
              valueStyle={{ color: '#722ed1', fontSize: 18 }}
              suffix="个"
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="A类"
              value={aLevel}
              valueStyle={{ color: '#52c41a', fontSize: 18 }}
              suffix="个"
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="B类"
              value={bLevel}
              valueStyle={{ color: '#1890ff', fontSize: 18 }}
              suffix="个"
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="C类"
              value={cLevel}
              valueStyle={{ color: '#faad14', fontSize: 18 }}
              suffix="个"
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="D类"
              value={dLevel}
              valueStyle={{ color: '#ff4d4f', fontSize: 18 }}
              suffix="个"
            />
          </Col>
        </Row>
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <Text type="secondary">总计: {total} 个</Text>
        </div>
      </div>
    );
  };

  // 渲染线索来源分布
  const renderLeadSourceDistribution = () => {
    if (!stats?.leadQuality.leadSourceDistribution) return null;

    const sources = Object.entries(stats.leadQuality.leadSourceDistribution)
      .sort(([,a], [,b]) => b - a);

    const totalLeads = sources.reduce((sum, [,count]) => sum + count, 0);

    return (
      <div style={{ marginTop: 16 }}>
        <Text strong style={{ marginBottom: 8, display: 'block' }}>线索来源分布</Text>
        {sources.map(([source, count], index) => {
          const percentage = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : '0';
          const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96'];
          return (
            <div key={source} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>{source}</Text>
                <Text strong>{count}个 ({percentage}%)</Text>
              </div>
              <Progress
                percent={parseFloat(percentage)}
                showInfo={false}
                strokeColor={colors[index % colors.length]}
                size="small"
              />
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染每个线索渠道的OABCD分类
  const renderLeadSourceLevelDetail = () => {
    if (!stats?.leadQuality.leadSourceLevelDetail) return null;

    const sources = Object.entries(stats.leadQuality.leadSourceLevelDetail)
      .sort(([,a], [,b]) => b.total - a.total);

    return (
      <div style={{ marginTop: 16 }}>
        <Text strong style={{ marginBottom: 8, display: 'block' }}>每个线索渠道的OABCD分类</Text>
        {sources.map(([source, detail]) => {
          const oPercent = detail.total > 0 ? ((detail.oLevel / detail.total) * 100).toFixed(1) : '0';
          const aPercent = detail.total > 0 ? ((detail.aLevel / detail.total) * 100).toFixed(1) : '0';
          const bPercent = detail.total > 0 ? ((detail.bLevel / detail.total) * 100).toFixed(1) : '0';
          const cPercent = detail.total > 0 ? ((detail.cLevel / detail.total) * 100).toFixed(1) : '0';
          const dPercent = detail.total > 0 ? ((detail.dLevel / detail.total) * 100).toFixed(1) : '0';

          return (
            <div key={source} style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 4 }}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>{source}</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>（总计: {detail.total}）</Text>
              </div>
              <Row gutter={8}>
                <Col span={4}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: '#722ed1', fontSize: 16, fontWeight: 'bold' }}>{detail.oLevel}</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>O类 ({oPercent}%)</Text></div>
                  </div>
                </Col>
                <Col span={5}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: '#52c41a', fontSize: 16, fontWeight: 'bold' }}>{detail.aLevel}</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>A类 ({aPercent}%)</Text></div>
                  </div>
                </Col>
                <Col span={5}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: '#1890ff', fontSize: 16, fontWeight: 'bold' }}>{detail.bLevel}</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>B类 ({bPercent}%)</Text></div>
                  </div>
                </Col>
                <Col span={5}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: '#faad14', fontSize: 16, fontWeight: 'bold' }}>{detail.cLevel}</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>C类 ({cPercent}%)</Text></div>
                  </div>
                </Col>
                <Col span={5}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: '#ff4d4f', fontSize: 16, fontWeight: 'bold' }}>{detail.dLevel}</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>D类 ({dPercent}%)</Text></div>
                  </div>
                </Col>
              </Row>
            </div>
          );
        })}
      </div>
    );
  };

  const content = (
    <div>
      {/* 顶部时间筛选器 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <Select
              defaultValue="thisMonth"
              style={{ width: 120 }}
              onChange={handleTimeRangeChange}
              options={TIME_RANGE_OPTIONS}
            />
            {timeRange === 'custom' && (
              <RangePicker
                value={customDateRange}
                onChange={handleCustomDateChange}
                style={{ width: 250 }}
              />
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
              disabled={loading}
            >
              刷新
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 第一行：人员资源指标（简历相关）*/}
      <Card title={<Title level={4}>👥 人员资源概览</Title>} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="简历总量"
                value={stats?.resumes.totalResumes || 0}
                valueStyle={{ color: '#1890ff' }}
                prefix={<UserOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title={`${getTimeRangeLabel(timeRange)}新增简历`}
                value={stats?.resumes.newTodayResumes || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<FileAddOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="想接单阿姨"
                value={stats?.resumes.acceptingResumes || 0}
                valueStyle={{ color: '#faad14' }}
                prefix={<CheckCircleOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="不接单阿姨"
                value={stats?.resumes.notAcceptingResumes || 0}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="已上户阿姨"
                value={stats?.resumes.onServiceResumes || 0}
                valueStyle={{ color: '#13c2c2' }}
                prefix={<HomeOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 第二行：客户业务指标 */}
      <Card title={<Title level={4}>🎯 客户业务指标</Title>} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="客户总量"
                value={stats?.customerBusiness.totalCustomers || 0}
                valueStyle={{ color: '#1890ff' }}
                prefix={<TeamOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title={`${getTimeRangeLabel(timeRange)}新增客户`}
                value={stats?.customerBusiness.newTodayCustomers || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<UserOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="待匹配客户"
                value={stats?.customerBusiness.pendingMatchCustomers || 0}
                valueStyle={{ color: '#faad14' }}
                prefix={<RiseOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="已签约客户"
                value={stats?.customerBusiness.signedCustomers || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="流失客户"
                value={stats?.customerBusiness.lostCustomers || 0}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 第三行：线索质量分析 */}
      <Card title={<Title level={4}>📊 线索质量分析</Title>} style={{ marginBottom: 24 }}>
        <Statistic
          title="A类线索占比"
          value={stats?.leadQuality.aLevelLeadsRatio || 0}
          precision={2}
          valueStyle={{ color: '#52c41a' }}
          prefix={<RiseOutlined />}
          suffix="%"
        />
        {renderLeadLevelDistribution()}
        {renderLeadSourceDistribution()}
        {renderLeadSourceLevelDetail()}
      </Card>

      {/* 第四行：合同签约指标 */}
      <Card title={<Title level={4}>📋 合同签约指标</Title>} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Card variant="outlined">
              <Statistic
                title="合同总量"
                value={stats?.contracts.totalContracts || 0}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ContainerOutlined />}
                suffix="份"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Card variant="outlined">
              <Statistic
                title={`${getTimeRangeLabel(timeRange)}新签合同`}
                value={stats?.contracts.newThisMonthContracts || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<FileAddOutlined />}
                suffix="份"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Card variant="outlined">
              <Statistic
                title="签约中合同"
                value={stats?.contracts.signingContracts || 0}
                valueStyle={{ color: '#faad14' }}
                prefix={<ShoppingCartOutlined />}
                suffix="份"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Card variant="outlined">
              <Statistic
                title="换人合同数"
                value={stats?.contracts.changeWorkerContracts || 0}
                valueStyle={{ color: '#ff7a45' }}
                prefix={<RiseOutlined />}
                suffix="份"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Card variant="outlined">
              <Statistic
                title="签约转化率"
                value={stats?.contracts.signConversionRate || 0}
                precision={2}
                valueStyle={{ color: '#13c2c2' }}
                prefix={<DollarOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 第五行：财务营收指标 */}
      <Card title={<Title level={4}>💰 财务营收指标</Title>} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title={`${getTimeRangeLabel(timeRange)}服务费收入`}
                value={stats?.financial.monthlyServiceFeeIncome || 0}
                valueStyle={{ color: '#1890ff' }}
                prefix={<MoneyCollectOutlined />}
                suffix="元"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title={`${getTimeRangeLabel(timeRange)}工资支出`}
                value={stats?.financial.monthlyWageExpenditure || 0}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<BankOutlined />}
                suffix="元"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="毛利润率"
                value={stats?.financial.grossProfitMargin || 0}
                precision={2}
                valueStyle={{ color: '#52c41a' }}
                prefix={<PercentageOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="环比增长率"
                value={stats?.financial.monthOverMonthGrowthRate || 0}
                precision={2}
                valueStyle={{
                  color: (stats?.financial.monthOverMonthGrowthRate || 0) >= 0 ? '#52c41a' : '#ff4d4f'
                }}
                prefix={<LineChartOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="生效中合同"
                value={stats?.financial.totalActiveContracts || 0}
                valueStyle={{ color: '#722ed1' }}
                prefix={<ContainerOutlined />}
                suffix="份"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="平均服务费"
                value={stats?.financial.averageServiceFee || 0}
                valueStyle={{ color: '#13c2c2' }}
                prefix={<DollarOutlined />}
                suffix="元"
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 第六行：运营效率指标 */}
      <Card title={<Title level={4}>⚡ 运营效率指标</Title>} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="平均匹配时长"
                value={stats?.efficiency.averageMatchingDays || 0}
                precision={1}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ClockCircleOutlined />}
                suffix="天"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="换人率"
                value={stats?.efficiency.workerChangeRate || 0}
                precision={2}
                valueStyle={{
                  color: (stats?.efficiency.workerChangeRate || 0) > 10 ? '#ff4d4f' : '#52c41a'
                }}
                prefix={<SwapOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="客户满意度"
                value={stats?.efficiency.customerSatisfactionRate || 0}
                precision={1}
                valueStyle={{ color: '#52c41a' }}
                prefix={<SmileOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="合同签署率"
                value={stats?.efficiency.contractSigningRate || 0}
                precision={2}
                valueStyle={{ color: '#13c2c2' }}
                prefix={<CheckCircleOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="平均服务时长"
                value={stats?.efficiency.averageServiceDuration || 0}
                valueStyle={{ color: '#722ed1' }}
                prefix={<ClockCircleOutlined />}
                suffix="天"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <Card variant="outlined">
              <Statistic
                title="快速匹配率"
                value={stats?.efficiency.quickMatchingRate || 0}
                precision={2}
                valueStyle={{ color: '#faad14' }}
                prefix={<ThunderboltOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 第七行：销售个人漏斗 */}
      <Card
        title={<Title level={4}><FunnelPlotOutlined /> 销售个人漏斗</Title>}
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            <Statistic
              title="总线索量"
              value={stats?.salesFunnel.totalLeads || 0}
              valueStyle={{ fontSize: 16 }}
            />
            <Statistic
              title="总成交金额"
              value={stats?.salesFunnel.totalDealAmount || 0}
              precision={2}
              prefix="¥"
              valueStyle={{ fontSize: 16, color: '#52c41a' }}
            />
            <Statistic
              title="平均成交率"
              value={stats?.salesFunnel.averageConversionRate || 0}
              precision={2}
              suffix="%"
              valueStyle={{ fontSize: 16, color: '#1890ff' }}
            />
          </Space>
        }
      >
        <Table
          dataSource={stats?.salesFunnel.salesFunnelList || []}
          rowKey="userId"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
          showSorterTooltip={{ title: '点击排序' }}
          columns={[
            {
              title: '排名',
              key: 'rank',
              width: 60,
              align: 'center',
              render: (_, __, index) => {
                if (index === 0) return <TrophyOutlined style={{ color: '#faad14', fontSize: 18 }} />;
                if (index === 1) return <TrophyOutlined style={{ color: '#d9d9d9', fontSize: 18 }} />;
                if (index === 2) return <TrophyOutlined style={{ color: '#cd7f32', fontSize: 18 }} />;
                return index + 1;
              }
            },
            {
              title: '姓名',
              dataIndex: 'userName',
              key: 'userName',
              width: 100,
              fixed: 'left',
              render: (text) => <Text strong>{text}</Text>
            },
            {
              title: '本月任务',
              dataIndex: 'monthlyTask',
              key: 'monthlyTask',
              width: 150,
              align: 'right',
              sorter: (a, b) => (a.monthlyTask || 0) - (b.monthlyTask || 0),
              render: (value: number, record: SalesFunnelItem) => {
                const isEditing = editingTaskUserId === record.userId;
                if (isEditing) {
                  return (
                    <Space size="small">
                      <InputNumber
                        size="small"
                        value={editingTaskValue}
                        onChange={(val) => setEditingTaskValue(val || 0)}
                        min={0}
                        step={10000}
                        formatter={(val) => `¥ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(val) => Number(val?.replace(/¥\s?|(,*)/g, '') || 0)}
                        style={{ width: 120 }}
                        disabled={savingTask}
                      />
                      <Tooltip title="保存">
                        <Button
                          type="link"
                          size="small"
                          icon={<CheckOutlined />}
                          loading={savingTask}
                          onClick={() => handleUpdateMonthlyTask(record.userId, editingTaskValue)}
                          style={{ color: '#52c41a', padding: 0 }}
                        />
                      </Tooltip>
                      <Tooltip title="取消">
                        <Button
                          type="link"
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={() => setEditingTaskUserId(null)}
                          disabled={savingTask}
                          style={{ color: '#ff4d4f', padding: 0 }}
                        />
                      </Tooltip>
                    </Space>
                  );
                }
                return (
                  <Space size="small">
                    <Text style={{ color: '#1890ff' }}>
                      ¥{(value || 0).toLocaleString('zh-CN')}
                    </Text>
                    <Tooltip title="编辑本月任务">
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditingTaskUserId(record.userId);
                          setEditingTaskValue(value || 0);
                        }}
                        style={{ padding: 0 }}
                      />
                    </Tooltip>
                  </Space>
                );
              }
            },
            {
              title: '主要渠道',
              dataIndex: 'mainLeadSource',
              key: 'mainLeadSource',
              width: 120,
              render: (text) => <Tag color="blue">{text}</Tag>
            },
            {
              title: '线索量',
              dataIndex: 'totalLeads',
              key: 'totalLeads',
              width: 80,
              align: 'center',
              sorter: (a, b) => a.totalLeads - b.totalLeads,
              render: (value) => <Text strong>{value}</Text>
            },
            {
              title: 'OABCD分布',
              key: 'levelDistribution',
              width: 250,
              render: (_, record) => (
                <Space size="small">
                  <Tag color="purple">O: {record.oLevel}</Tag>
                  <Tag color="green">A: {record.aLevel}</Tag>
                  <Tag color="blue">B: {record.bLevel}</Tag>
                  <Tag color="orange">C: {record.cLevel}</Tag>
                  <Tag color="red">D: {record.dLevel}</Tag>
                </Space>
              )
            },
            {
              title: '成交率',
              dataIndex: 'conversionRate',
              key: 'conversionRate',
              width: 100,
              align: 'center',
              sorter: (a, b) => a.conversionRate - b.conversionRate,
              render: (value) => (
                <Text style={{
                  color: value >= 20 ? '#52c41a' : value >= 10 ? '#faad14' : '#ff4d4f',
                  fontWeight: 'bold'
                }}>
                  {value}%
                </Text>
              )
            },
            {
              title: '成交金额',
              dataIndex: 'totalDealAmount',
              key: 'totalDealAmount',
              width: 120,
              align: 'right',
              sorter: (a, b) => a.totalDealAmount - b.totalDealAmount,
              defaultSortOrder: 'descend',
              render: (value) => (
                <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  ¥{value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </Text>
              )
            },
            {
              title: '客单价',
              dataIndex: 'averageDealAmount',
              key: 'averageDealAmount',
              width: 120,
              align: 'right',
              sorter: (a, b) => a.averageDealAmount - b.averageDealAmount,
              render: (value) => (
                <Text>
                  ¥{value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </Text>
              )
            }
          ]}
        />
      </Card>

      {/* 更新时间显示 */}
      {stats?.updateTime && (
        <Card size="small">
          <Text type="secondary">
            数据更新时间：{dayjs(stats.updateTime).format('YYYY-MM-DD HH:mm:ss')}
          </Text>
        </Card>
      )}
    </div>
  );

  return (
    <PageContainer
      header={{
        title: '📊 业务驾驶舱',
        subTitle: '实时监控核心业务指标',
      }}
    >
      <Spin
        spinning={loading || refreshing}
        tip="加载驾驶舱数据..."
        size="large"
      >
        <div style={{ minHeight: '400px' }}>
          {error && (
            <Alert
              message="错误"
              description={error}
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}
          {content}
        </div>
      </Spin>
    </PageContainer>
  );
};

export default Dashboard;