import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  message,
  Spin,
  Row,
  Col,
  Timeline,
  Empty
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, MessageOutlined, AuditOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { trainingLeadService } from '../../services/trainingLeadService';
import {
  TrainingLead,
  TrainingLeadFollowUp,
  LEAD_STATUS_OPTIONS,
  FOLLOW_UP_TYPE_OPTIONS,
  FOLLOW_UP_RESULT_OPTIONS,
  LEAD_GRADE_OPTIONS
} from '../../types/training-lead.types';
import TrainingLeadFollowUpModal from '../../components/TrainingLeadFollowUpModal';
import Authorized from '../../components/Authorized';
import { useAuth } from '../../contexts/AuthContext';

const TrainingLeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState<TrainingLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [followUpModal, setFollowUpModal] = useState({
    visible: false,
    leadId: '',
    leadName: ''
  });

  // 操作日志（仅管理员可见）
  const [operationLogs, setOperationLogs] = useState<any[]>([]);
  const [operationLogsLoading, setOperationLogsLoading] = useState(false);
  const [showAllOperationLogs, setShowAllOperationLogs] = useState(false);

  useEffect(() => {
    fetchLeadDetail();
  }, [id]);

  // 获取操作日志（仅管理员）
  useEffect(() => {
    const fetchOperationLogs = async () => {
      if (!id || user?.role !== 'admin') return;
      try {
        setOperationLogsLoading(true);
        const logs = await trainingLeadService.getOperationLogs(id);
        setOperationLogs(Array.isArray(logs) ? logs : []);
      } catch (e) {
        console.error('获取操作日志失败', e);
        setOperationLogs([]);
      } finally {
        setOperationLogsLoading(false);
      }
    };
    fetchOperationLogs();
  }, [id, user?.role]);

  const fetchLeadDetail = async () => {
    if (!id) {
      message.error('无效的线索ID');
      navigate('/training-leads');
      return;
    }

    try {
      setLoading(true);
      const response = await trainingLeadService.getTrainingLeadById(id);
      setLead(response);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '获取线索详情失败');
      navigate('/training-leads');
    } finally {
      setLoading(false);
    }
  };

  // 打开跟进弹窗
  const handleOpenFollowUp = () => {
    if (!lead) return;
    setFollowUpModal({
      visible: true,
      leadId: lead._id,
      leadName: lead.name
    });
  };

  // 关闭跟进弹窗
  const handleCloseFollowUp = () => {
    setFollowUpModal({
      visible: false,
      leadId: '',
      leadName: ''
    });
  };

  // 跟进成功回调
  const handleFollowUpSuccess = () => {
    handleCloseFollowUp();
    fetchLeadDetail();
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const option = LEAD_STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.color || '#8c8c8c';
  };

  // 获取跟进类型图标
  const getFollowUpIcon = (type: string) => {
    const option = FOLLOW_UP_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.icon || '📝';
  };

  // 获取跟进结果颜色
  const getFollowUpResultColor = (type: string, result: string) => {
    const options = FOLLOW_UP_RESULT_OPTIONS[type];
    if (!options) return '#8c8c8c';
    const option = options.find(opt => opt.value === result);
    return option?.color || '#8c8c8c';
  };

  // 格式化用户信息
  const formatUser = (user: any) => {
    if (!user) return '-';
    if (typeof user === 'string') return user;
    return user.name || user.username || '-';
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="线索不存在" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 头部操作栏 */}
        <Card>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/training-leads')}
            >
              返回列表
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/training-leads/edit/${lead._id}`)}
            >
              编辑
            </Button>
            <Button
              icon={<MessageOutlined />}
              onClick={handleOpenFollowUp}
            >
              添加跟进
            </Button>
          </Space>
        </Card>

        {/* 基本信息 */}
        <Card title="基本信息">
          <Descriptions bordered column={2}>
            <Descriptions.Item label="学员编号">{lead.studentId}</Descriptions.Item>
            <Descriptions.Item label="客户姓名">{lead.name}</Descriptions.Item>
            <Descriptions.Item label="性别">{lead.gender || '-'}</Descriptions.Item>
            <Descriptions.Item label="年龄">{lead.age != null ? `${lead.age}岁` : '-'}</Descriptions.Item>
            <Descriptions.Item label="电话号码">{lead.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="微信">{lead.wechatId || '-'}</Descriptions.Item>
            <Descriptions.Item label="渠道来源">{lead.leadSource || '-'}</Descriptions.Item>
            <Descriptions.Item label="咨询职位">{lead.consultPosition || '-'}</Descriptions.Item>
            <Descriptions.Item label="意向程度">{lead.intentionLevel || '-'}</Descriptions.Item>
            <Descriptions.Item label="线索等级">
              {lead.leadGrade ? (
                <Tag color={LEAD_GRADE_OPTIONS.find(o => o.value === lead.leadGrade)?.color || 'default'}>
                  {lead.leadGrade}
                </Tag>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusColor((lead as any).leadStatus ?? lead.status)}>
                {(lead as any).leadStatus ?? lead.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="所在地区">{lead.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="意向课程" span={2}>
              {lead.intendedCourses && lead.intendedCourses.length > 0 ? (
                <Space wrap>
                  {lead.intendedCourses.map((course, index) => (
                    <Tag key={index} color="blue">{course}</Tag>
                  ))}
                </Space>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="已报证书" span={2}>
              {lead.reportedCertificates && lead.reportedCertificates.length > 0 ? (
                <Space wrap>
                  {lead.reportedCertificates.map((cert, index) => (
                    <Tag key={index} color="green">{cert}</Tag>
                  ))}
                </Space>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="期望开课时间">
              {lead.expectedStartDate ? dayjs(lead.expectedStartDate).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="预算金额">
              {lead.budget != null ? `¥${lead.budget}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="报课金额">
              {lead.courseAmount != null ? `¥${lead.courseAmount}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="服务费金额">
              {lead.serviceFeeAmount != null ? `¥${lead.serviceFeeAmount}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="是否报征">
              <Tag color={lead.isReported ? '#52c41a' : '#8c8c8c'}>
                {lead.isReported ? '是' : '否'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="录入人">{formatUser(lead.createdBy)}</Descriptions.Item>
            <Descriptions.Item label="跟进人">{formatUser(lead.assignedTo) !== '-' ? formatUser(lead.assignedTo) : formatUser(lead.studentOwner)}</Descriptions.Item>
            <Descriptions.Item label="学员归属">{formatUser(lead.studentOwner)}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(lead.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="最后跟进时间">
              {lead.lastFollowUpAt ? dayjs(lead.lastFollowUpAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="备注信息" span={2}>
              {lead.remarks || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 跟进记录 */}
        <Card title="跟进记录">
          {lead.followUps && lead.followUps.length > 0 ? (
            <Timeline mode="left">
              {lead.followUps.map((followUp: TrainingLeadFollowUp) => (
                <Timeline.Item
                  key={followUp._id}
                  label={dayjs(followUp.createdAt).format('YYYY-MM-DD HH:mm')}
                >
                  <Card size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Tag color="blue">{getFollowUpIcon(followUp.type)} {followUp.type}</Tag>
                        {followUp.followUpResult && (
                          <Tag color={getFollowUpResultColor(followUp.type, followUp.followUpResult)}>
                            {followUp.followUpResult}
                          </Tag>
                        )}
                        {followUp.contactSuccess !== undefined && (
                          <Tag color={followUp.contactSuccess ? '#52c41a' : '#ff4d4f'}>
                            {followUp.contactSuccess ? '✓ 联系成功' : '✗ 联系失败'}
                          </Tag>
                        )}
                        <span style={{ marginLeft: 8, color: '#666' }}>
                          跟进人：{formatUser(followUp.createdBy)}
                        </span>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{followUp.content}</div>
                      {followUp.nextFollowUpDate && (
                        <div style={{ color: '#999', fontSize: '12px' }}>
                          下次跟进时间：{dayjs(followUp.nextFollowUpDate).format('YYYY-MM-DD HH:mm')}
                        </div>
                      )}
                    </Space>
                  </Card>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Empty description="暂无跟进记录" />
          )}
        </Card>

        {/* 操作日志 - 仅管理员可见 */}
        <Authorized role={['admin']} noMatch={null}>
          <Card
            title={
              <Space>
                <AuditOutlined />
                <span>操作日志</span>
                {operationLogs && operationLogs.length > 1 && (
                  <Tag color="purple">{operationLogs.length} 条记录</Tag>
                )}
              </Space>
            }
            loading={operationLogsLoading}
          >
            {operationLogs && operationLogs.length > 0 ? (
              <>
                <Timeline
                  mode="left"
                  items={(showAllOperationLogs ? operationLogs : operationLogs.slice(0, 1)).map((log: any, idx: number) => {
                    const operatedAt = log.operatedAt || log.createdAt;
                    const operatorName = log.operator?.name || log.operator?.username || '系统';
                    const colorMap: Record<string, string> = {
                      'create': 'green',
                      'update': 'blue',
                      'delete': 'red',
                      'assign': 'orange',
                      'release_to_pool': 'orange',
                      'claim_from_pool': 'cyan',
                      'create_follow_up': 'purple',
                      'change_status': 'geekblue',
                    };
                    const color = colorMap[log.operationType] || 'gray';
                    const fieldNameMap: Record<string, string> = {
                      name: '客户姓名', gender: '性别', age: '年龄', consultPosition: '咨询职位',
                      phone: '手机号', wechatId: '微信号', leadSource: '线索来源',
                      trainingType: '培训类型', intendedCourses: '意向课程', reportedCertificates: '已报证书',
                      intentionLevel: '意向程度', leadGrade: '线索等级', expectedStartDate: '期望开课时间',
                      budget: '预算金额', courseAmount: '报课金额', serviceFeeAmount: '服务费金额',
                      isOnlineCourse: '网课', address: '所在地区', isReported: '是否报征',
                      remarks: '备注信息', status: '线索状态', studentOwner: '学员归属',
                    };
                    return {
                      key: log._id || idx,
                      color,
                      label: operatedAt ? dayjs(operatedAt).format('YYYY-MM-DD HH:mm:ss') : '-',
                      children: (
                        <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                              <strong>{log.operationName}</strong>
                            </div>
                            {log.details?.description && (
                              <div style={{ fontSize: 12, color: '#666' }}>
                                {log.details.description}
                              </div>
                            )}
                            {log.operationType === 'update' && log.details?.before && log.details?.after && (
                              <div style={{ marginTop: 8, fontSize: 12 }}>
                                {Object.keys(log.details.after).map((field) => {
                                  const beforeValue = log.details.before[field];
                                  const afterValue = log.details.after[field];
                                  const fieldLabel = fieldNameMap[field] || field;
                                  const fmt = (v: any) => {
                                    if (v === null || v === undefined || v === '') return '空';
                                    if (Array.isArray(v)) return v.length ? v.join('、') : '空';
                                    return String(v);
                                  };
                                  return (
                                    <div key={field} style={{ padding: '4px 0', borderBottom: '1px dashed #e8e8e8' }}>
                                      <span style={{ color: '#666', fontWeight: 500 }}>{fieldLabel}：</span>
                                      <span style={{ color: '#ff4d4f', textDecoration: 'line-through' }}>{fmt(beforeValue)}</span>
                                      <span style={{ margin: '0 8px', color: '#999' }}>→</span>
                                      <span style={{ color: '#52c41a', fontWeight: 500 }}>{fmt(afterValue)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div style={{ fontSize: 12, color: '#999' }}>
                              操作人：{operatorName}
                            </div>
                          </Space>
                        </Card>
                      ),
                    };
                  })}
                />
                {operationLogs.length > 1 && (
                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <Button
                      type="link"
                      onClick={() => setShowAllOperationLogs(!showAllOperationLogs)}
                      icon={showAllOperationLogs ? <UpOutlined /> : <DownOutlined />}
                    >
                      {showAllOperationLogs ? '收起日志' : `查看全部 ${operationLogs.length} 条日志`}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Empty description="暂无操作日志" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Authorized>
      </Space>

      {/* 跟进记录弹窗 */}
      <TrainingLeadFollowUpModal
        visible={followUpModal.visible}
        leadId={followUpModal.leadId}
        leadName={followUpModal.leadName}
        onCancel={handleCloseFollowUp}
        onSuccess={handleFollowUpSuccess}
      />
    </div>
  );
};

export default TrainingLeadDetail;
