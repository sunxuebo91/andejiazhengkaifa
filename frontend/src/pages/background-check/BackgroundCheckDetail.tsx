import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Space, Spin, Timeline,
  Typography, Row, Col, Statistic, Alert, Divider, message,
} from 'antd';
import {
  ArrowLeftOutlined, SafetyOutlined, ReloadOutlined,
  DownloadOutlined, EyeOutlined, FileImageOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { backgroundCheckService } from '../../services/backgroundCheckService';
import { BackgroundCheck, BG_STATUS_MAP } from '../../types/background-check.types';

const { Text } = Typography;

const PACKAGE_MAP: Record<string, string> = {
  '1': '基础查询（身份核实+社会不良信息+涉诉记录）',
  '2': '高级查询（基础+金融风险+失信被执行+限高名单）',
};

const NOTIFY_TYPE_MAP: Record<number, string> = {
  1: '授权通知',
  2: '报告完成通知',
  3: '报告阶段版通知',
  4: '报告终止通知',
};

// 风险等级 → 颜色
function riskColor(level: string): string {
  if (!level) return 'default';
  if (level === '无风险') return 'green';
  if (level === '一般风险' || level === '关注') return 'orange';
  if (level === '风险') return 'red';
  if (level === '核实中' || level === '待复核') return 'blue';
  return 'default';
}

// 风险维度配置
const RISK_DIMENSIONS = [
  { key: 'identityRiskLevel', label: '身份风险', icon: '🪪', packages: ['1', '2'] },
  { key: 'socialRiskLevel',   label: '社会风险', icon: '⚠️', packages: ['1', '2'] },
  { key: 'courtRiskLevel',    label: '涉诉风险', icon: '⚖️', packages: ['1', '2'] },
  { key: 'financeRiskLevel',  label: '金融风险', icon: '💰', packages: ['2'] },
] as const;

export default function BackgroundCheckDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<BackgroundCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await backgroundCheckService.getById(id);
      // 报告已完成但尚无风险数据，自动拉取
      if (data && [4, 16].includes(data.status) && !data.reportResult && data.reportId) {
        try {
          await backgroundCheckService.fetchReportResult(data.reportId);
          const updated = await backgroundCheckService.getById(id);
          setRecord(updated);
        } catch {
          setRecord(data); // 拉取失败仍展示基本信息
        }
      } else {
        setRecord(data);
      }
    } catch {
      message.error('加载背调详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleFetchResult = async () => {
    if (!record?.reportId) return;
    setFetching(true);
    try {
      await backgroundCheckService.fetchReportResult(record.reportId);
      message.success('数据拉取成功');
      await load();
    } catch {
      message.error('拉取失败，请确认报告是否已完成');
    } finally {
      setFetching(false);
    }
  };

  const handleDownload = async () => {
    if (!record?.reportId) return;
    try {
      const blob = await backgroundCheckService.downloadReport(record.reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `背调报告_${record.name}_${record.reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('下载报告失败');
    }
  };

  const handleViewReport = async () => {
    if (!record?.reportId) return;
    try {
      message.loading({ content: '正在加载报告…', key: 'view' });
      const blob = await backgroundCheckService.downloadReport(record.reportId);
      window.open(URL.createObjectURL(blob), '_blank');
      message.destroy('view');
    } catch {
      message.error({ content: '加载报告失败', key: 'view' });
    }
  };

  const handleDownloadAuthDoc = () => {
    if (!record?.stuffId) {
      message.warning('无授权书文件');
      return;
    }
    // 直接打开授权书下载链接（公开接口）
    window.open(`/api/zmdb/auth-doc/${record.stuffId}/download`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!record) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message="未找到背调记录" />
        <Button style={{ marginTop: 16 }} onClick={() => navigate('/background-check')}>返回列表</Button>
      </div>
    );
  }

  const isCompleted = [4, 16].includes(record.status);
  const hasResult = !!record.reportResult;
  const result = record.reportResult;
  const pkg = record.packageType || '1';
  const statusInfo = BG_STATUS_MAP[record.status] || { text: `状态${record.status}`, color: 'default' };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 顶部导航 */}
      <Card
        bordered={false}
        style={{ marginBottom: 24, borderRadius: 8 }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/background-check')}>
              返回列表
            </Button>
            <Divider type="vertical" style={{ height: 24, margin: '0 8px' }} />
            <span style={{ fontSize: 20, fontWeight: 600 }}>背调详情</span>
          </Space>
          <Space size="middle">
            {isCompleted && (
              <>
                <Button type="primary" ghost icon={<EyeOutlined />} onClick={handleViewReport}>
                  查看报告
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                  下载报告
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  loading={fetching}
                  onClick={handleFetchResult}
                >
                  刷新风险数据
                </Button>
              </>
            )}
          </Space>
        </div>
      </Card>

      {/* 基本信息区域 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        {/* 候选人信息 */}
        <Col span={record.contractId && typeof record.contractId === 'object' ? 14 : 24}>
          <Card
            title={<span style={{ fontSize: 16 }}>候选人基本信息</span>}
            bordered={false}
            style={{ borderRadius: 8, height: '100%' }}
            headStyle={{ borderBottom: '1px solid #f0f0f0' }}
          >
            <Row gutter={[24, 20]}>
              <Col span={8}>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>姓名</div>
                <Text strong style={{ fontSize: 15 }}>{record.name}</Text>
              </Col>
              <Col span={8}>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>手机号</div>
                <Text style={{ fontSize: 15 }}>{record.mobile}</Text>
              </Col>
              <Col span={8}>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>身份证号</div>
                <Text style={{ fontSize: 15 }}>
                  {record.idNo ? `${record.idNo.slice(0, 6)}****${record.idNo.slice(-4)}` : '-'}
                </Text>
              </Col>
              <Col span={8}>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>职位</div>
                <Text style={{ fontSize: 15 }}>{record.position || '-'}</Text>
              </Col>
              <Col span={16}>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>背调套餐</div>
                <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px' }}>{PACKAGE_MAP[pkg] || pkg}</Tag>
              </Col>
              <Col span={8}>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>当前状态</div>
                <Tag color={statusInfo.color} style={{ fontSize: 13, padding: '2px 10px' }}>{statusInfo.text}</Tag>
              </Col>
              <Col span={16}>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>报告 ID</div>
                <Text copyable={!!record.reportId} style={{ fontSize: 13 }}>{record.reportId || '未生成'}</Text>
              </Col>
              <Col span={8}>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>发起时间</div>
                <Text style={{ fontSize: 13 }}>{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
              </Col>
              <Col span={8}>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>更新时间</div>
                <Text style={{ fontSize: 13 }}>{dayjs(record.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
              </Col>
              <Col span={8}>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>授权书</div>
                {record.stuffId ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<FileImageOutlined />}
                    onClick={handleDownloadAuthDoc}
                    style={{ padding: 0, fontSize: 13 }}
                  >
                    查看/下载
                  </Button>
                ) : (
                  <Text type="secondary" style={{ fontSize: 13 }}>-</Text>
                )}
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 关联合同 - 右侧卡片 */}
        {record.contractId && typeof record.contractId === 'object' && (
          <Col span={10}>
            <Card
              title={<span style={{ fontSize: 16 }}>关联合同</span>}
              bordered={false}
              style={{ borderRadius: 8, height: '100%' }}
              headStyle={{ borderBottom: '1px solid #f0f0f0' }}
            >
              <Row gutter={[24, 20]}>
                <Col span={24}>
                  <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>合同编号</div>
                  <Text copyable style={{ fontSize: 15 }}>{record.contractId.contractNumber}</Text>
                </Col>
                <Col span={24}>
                  <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>客户姓名</div>
                  <Text style={{ fontSize: 15 }}>{record.contractId.customerName}</Text>
                </Col>
                <Col span={24}>
                  <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6 }}>服务人员</div>
                  <Text style={{ fontSize: 15 }}>{record.contractId.workerName}</Text>
                </Col>
              </Row>
            </Card>
          </Col>
        )}
      </Row>

      {/* 风险评估结果 */}
      <Card
        bordered={false}
        style={{ marginBottom: 24, borderRadius: 8 }}
        headStyle={{ borderBottom: '1px solid #f0f0f0' }}
        title={
          <Space size="middle">
            <SafetyOutlined style={{ fontSize: 18, color: '#52c41a' }} />
            <span style={{ fontSize: 16 }}>风险评估结果</span>
            {hasResult && result && (
              <Tag color={riskColor(result.riskLevel)} style={{ fontSize: 14, padding: '4px 12px' }}>
                {result.riskLevel || '-'}
              </Tag>
            )}
          </Space>
        }
        extra={
          hasResult && result?.fetchedAt && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              数据时间：{dayjs(result.fetchedAt).format('YYYY-MM-DD HH:mm')}
            </Text>
          )
        }
      >
        {!isCompleted && (
          <Alert
            type="info"
            message="背调尚未完成，风险数据暂不可用"
            description={'报告完成（状态变为"已完成"）后可查看风险评估结果。'}
            showIcon
            style={{ borderRadius: 8 }}
          />
        )}

        {isCompleted && !hasResult && (
          <Alert
            type="info"
            message="正在加载风险数据…"
            description={'如长时间未显示，可点击顶部"刷新风险数据"重试。'}
            showIcon
            style={{ borderRadius: 8 }}
          />
        )}

        {isCompleted && hasResult && result && (
          <>
            {/* 整体评分 - 使用更大的卡片样式 */}
            <Row gutter={24} style={{ marginBottom: 32 }}>
              <Col span={6}>
                <div style={{
                  background: result.riskLevel === '无风险' ? '#f6ffed' : '#fff2f0',
                  borderRadius: 12,
                  padding: '20px 16px',
                  textAlign: 'center',
                  border: `1px solid ${result.riskLevel === '无风险' ? '#b7eb8f' : '#ffccc7'}`
                }}>
                  <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 10 }}>整体风险等级</div>
                  <div style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: result.riskLevel === '无风险' ? '#52c41a' : '#f5222d'
                  }}>
                    {result.riskLevel || '-'}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{
                  background: '#f0f5ff',
                  borderRadius: 12,
                  padding: '20px 16px',
                  textAlign: 'center',
                  border: '1px solid #adc6ff'
                }}>
                  <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 10 }}>风险分数</div>
                  <div style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: (result.riskScore ?? 0) >= 80 ? '#52c41a' : '#f5222d'
                  }}>
                    {result.riskScore ?? '-'}
                    <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}> / 100</span>
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{
                  background: (result.failNum ?? 0) === 0 ? '#f6ffed' : '#fff7e6',
                  borderRadius: 12,
                  padding: '20px 16px',
                  textAlign: 'center',
                  border: `1px solid ${(result.failNum ?? 0) === 0 ? '#b7eb8f' : '#ffd591'}`
                }}>
                  <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 10 }}>异常项数量</div>
                  <div style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: (result.failNum ?? 0) === 0 ? '#52c41a' : '#fa8c16'
                  }}>
                    {result.failNum ?? 0}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{
                  background: result.summary === '无风险' ? '#f6ffed' : '#fff2f0',
                  borderRadius: 12,
                  padding: '20px 16px',
                  textAlign: 'center',
                  border: `1px solid ${result.summary === '无风险' ? '#b7eb8f' : '#ffccc7'}`
                }}>
                  <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 10 }}>报告总结</div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: result.summary === '无风险' ? '#52c41a' : '#f5222d'
                  }}>
                    {result.summary || '-'}
                  </div>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '0 0 24px 0' }}>
              <Text type="secondary" style={{ fontSize: 14 }}>各维度风险</Text>
            </Divider>

            {/* 各维度 - 更大的间距和更好的视觉效果 */}
            <Row gutter={20} style={{ marginBottom: 24 }}>
              {RISK_DIMENSIONS.filter(d => (d.packages as readonly string[]).includes(pkg)).map(dim => {
                const level = result[dim.key] || '';
                const isNoRisk = level === '无风险';
                return (
                  <Col key={dim.key} span={6}>
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '24px 16px',
                        borderRadius: 12,
                        background: isNoRisk ? '#f6ffed' : level ? '#fff7e6' : '#fafafa',
                        border: `1px solid ${isNoRisk ? '#b7eb8f' : level ? '#ffd591' : '#e8e8e8'}`,
                        transition: 'all 0.3s',
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 10 }}>{dim.icon}</div>
                      <div style={{ fontSize: 14, color: '#595959', marginBottom: 10 }}>{dim.label}</div>
                      <Tag
                        color={riskColor(level)}
                        style={{ margin: 0, fontSize: 13, padding: '2px 12px' }}
                      >
                        {level || '未查询'}
                      </Tag>
                    </div>
                  </Col>
                );
              })}
            </Row>

            {/* 明细列表 */}
            {result.digestList && result.digestList.length > 0 && (
              <>
                <Divider style={{ margin: '8px 0 24px 0' }}>
                  <Text type="secondary" style={{ fontSize: 14 }}>查询项明细</Text>
                </Divider>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.digestList.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 20px',
                        borderRadius: 10,
                        background: item.risk === '无风险' ? '#f6ffed' : '#fffbe6',
                        border: `1px solid ${item.risk === '无风险' ? '#d9f7be' : '#ffe58f'}`,
                      }}
                    >
                      <div>
                        <Text strong style={{ marginRight: 12, fontSize: 14 }}>{item.name}</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>{item.remark}</Text>
                      </div>
                      <Space size="middle">
                        <Text type="secondary" style={{ fontSize: 13 }}>{item.result}</Text>
                        <Tag color={riskColor(item.risk)} style={{ fontSize: 13, padding: '2px 10px' }}>
                          {item.risk || '-'}
                        </Tag>
                      </Space>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Card>

      {/* 回调历史 */}
      <Card
        title={<span style={{ fontSize: 16 }}>回调历史</span>}
        bordered={false}
        style={{ borderRadius: 8 }}
        headStyle={{ borderBottom: '1px solid #f0f0f0' }}
      >
        {(!record.callbackHistory || record.callbackHistory.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Text type="secondary" style={{ fontSize: 14 }}>暂无回调记录</Text>
          </div>
        ) : (
          <Timeline
            style={{ marginTop: 8 }}
            items={record.callbackHistory.map((cb, idx) => ({
              key: idx,
              color: [4, 16].includes(cb.status) ? 'green' : 'blue',
              children: (
                <div style={{ paddingBottom: 8 }}>
                  <Space size="middle">
                    <Tag style={{ fontSize: 13, padding: '2px 10px' }}>
                      {NOTIFY_TYPE_MAP[cb.notifyType] || `类型${cb.notifyType}`}
                    </Tag>
                    <Tag
                      color={BG_STATUS_MAP[cb.status]?.color || 'default'}
                      style={{ fontSize: 13, padding: '2px 10px' }}
                    >
                      {BG_STATUS_MAP[cb.status]?.text || `状态${cb.status}`}
                    </Tag>
                  </Space>
                  <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 6 }}>
                    {dayjs(cb.receivedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
}
