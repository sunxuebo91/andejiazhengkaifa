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
import { ArrowLeftOutlined, EditOutlined, MessageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { trainingLeadService } from '../../services/trainingLeadService';
import {
  TrainingLead,
  TrainingLeadFollowUp,
  LEAD_LEVEL_OPTIONS,
  LEAD_STATUS_OPTIONS,
  FOLLOW_UP_TYPE_OPTIONS
} from '../../types/training-lead.types';
import TrainingLeadFollowUpModal from '../../components/TrainingLeadFollowUpModal';

const TrainingLeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<TrainingLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [followUpModal, setFollowUpModal] = useState({
    visible: false,
    leadId: '',
    leadName: ''
  });

  useEffect(() => {
    fetchLeadDetail();
  }, [id]);

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

  // 获取客户分级颜色
  const getLeadLevelColor = (level: string) => {
    const option = LEAD_LEVEL_OPTIONS.find(opt => opt.value === level);
    return option?.color || '#8c8c8c';
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
            <Descriptions.Item label="线索编号">{lead.leadId}</Descriptions.Item>
            <Descriptions.Item label="客户姓名">{lead.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{lead.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="微信号">{lead.wechatId || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户分级">
              <Tag color={getLeadLevelColor(lead.leadLevel)}>{lead.leadLevel}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusColor(lead.status)}>{lead.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="培训类型">{lead.trainingType || '-'}</Descriptions.Item>
            <Descriptions.Item label="意向课程" span={2}>
              {lead.intendedCourses && lead.intendedCourses.length > 0 ? (
                <Space wrap>
                  {lead.intendedCourses.map((course, index) => (
                    <Tag key={index} color="blue">{course}</Tag>
                  ))}
                </Space>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="意向程度">{lead.intentionLevel || '-'}</Descriptions.Item>
            <Descriptions.Item label="期望开课时间">
              {lead.expectedStartDate ? dayjs(lead.expectedStartDate).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="预算金额">
              {lead.budget ? `¥${lead.budget}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="线索来源">{lead.leadSource || '-'}</Descriptions.Item>
            <Descriptions.Item label="所在地区">{lead.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建人">{formatUser(lead.createdBy)}</Descriptions.Item>
            <Descriptions.Item label="分配给">{formatUser(lead.assignedTo)}</Descriptions.Item>
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

