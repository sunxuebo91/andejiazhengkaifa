import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card, Table, Button, Space, Tag, Modal, Input, App, Tabs,
  Descriptions, Select, Tooltip, Badge, Spin, Divider,
} from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, SwapOutlined, SyncOutlined, ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../../contexts/AuthContext';
import * as referralService from '../../services/referralService';
import type { ReferralResume } from '../../services/referralService';

const { TextArea } = Input;
const { Option } = Select;

import { RESUME_STATUS_MAP as STATUS_MAP, REVIEW_STATUS_MAP, REWARD_STATUS_MAP } from './constants';

/** 工种英文 key → 中文 label（兼容历史中文值直接透传） */
const JOB_TYPE_LABEL: Record<string, string> = {
  'yuesao':       '月嫂',
  'zhujia-yuer':  '住家育儿嫂',
  'baiban-yuer':  '白班育儿',
  'baojie':       '保洁',
  'baiban-baomu': '白班保姆',
  'zhujia-baomu': '住家保姆',
  'yangchong':    '养宠',
  'xiaoshi':      '小时工',
  'zhujia-hulao': '住家护老',
  'jiajiao':      '家教',
  'peiban':       '陪伴师',
};

const ReferralResumeReview: React.FC = () => {
  const { user } = useAuth();
  const { message } = App.useApp();
  const isAdmin = user?.role === 'admin';

  const [list, setList] = useState<ReferralResume[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // 详情弹窗
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: ReferralResume | null }>({ open: false, record: null });
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (base: ReferralResume) => {
    setDetailModal({ open: true, record: base });
    setDetailLoading(true);
    try {
      const res = await referralService.getReferralAdminDetail(base._id);
      if (res.success && res.data) setDetailModal({ open: true, record: res.data });
    } catch { /* 用列表数据兜底 */ } finally { setDetailLoading(false); }
  };

  // 审核弹窗
  const [reviewModal, setReviewModal] = useState<{ open: boolean; id: string; action: 'approve' | 'reject' | null }>({ open: false, id: '', action: null });
  const [reviewNote, setReviewNote] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // 更新状态弹窗
  const [statusModal, setStatusModal] = useState<{ open: boolean; id: string; current: string }>({ open: false, id: '', current: '' });
  const [newStatus, setNewStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // 返费操作弹窗
  const [rewardModal, setRewardModal] = useState<{ open: boolean; id: string; action: string }>({ open: false, id: '', action: '' });
  const [rewardRemark, setRewardRemark] = useState('');
  const [rewardLoading, setRewardLoading] = useState(false);

  // 同步小程序云数据库
  const [syncLoading, setSyncLoading] = useState(false);

  const fetchList = async (reviewStatus: string, p = 1) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await referralService.getAssignedReferrals(
        user.id, isAdmin,
        reviewStatus === 'all' ? undefined : reviewStatus,
        p, 20,
      );
      if (res.success && res.data) {
        setList(res.data.list);
        setTotal(res.data.total);
        setPage(p);
      }
    } catch { message.error('获取列表失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList('pending_review'); }, [user]);

  // 根据 Tab 映射请求的 reviewStatus 值
  const tabToReviewStatus = (tab: string) => {
    if (tab === 'pending')    return 'pending_review';
    if (tab === 'processed')  return 'processed';   // 后端支持 processed = approved+rejected
    if (tab === 'activated')  return 'activated';   // 简历已存在、推荐激活记录
    return undefined;
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
    fetchList(tabToReviewStatus(key) as string, 1);
  };

  const handleSyncFromCloud = async () => {
    if (!user?.id) return;
    setSyncLoading(true);
    try {
      const res = await referralService.syncFromCloudDb(user.id);
      if (res.success && res.data) {
        const { imported, activated = 0, skipped, errors } = res.data;
        if (imported > 0 || activated > 0) {
          const parts: string[] = [];
          if (imported > 0)  parts.push(`新导入 ${imported} 条待审核`);
          if (activated > 0) parts.push(`新激活 ${activated} 条`);
          if (skipped > 0)   parts.push(`跳过 ${skipped} 条`);
          if (errors > 0)    parts.push(`错误 ${errors} 条`);
          message.success(`同步完成：${parts.join('，')}`);
          fetchList(tabToReviewStatus(activeTab) as string, 1);
        } else if (skipped > 0 && errors === 0) {
          message.info(`同步完成：${skipped} 条已存在，无新数据`);
        } else {
          message.info('暂无待同步数据');
        }
      } else {
        message.error(res.message || '同步失败');
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || e.message || '';
      if (errMsg.includes('not exist') || errMsg.includes('云数据库')) {
        message.warning('云数据库暂不可访问，请在小程序云函数 submitReferral 中添加 CRM 同步代码');
      } else {
        message.error('同步失败：' + errMsg);
      }
    } finally {
      setSyncLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (reviewModal.action === 'reject' && !reviewNote.trim()) { message.error('拒绝时必须填写原因'); return; }
    setReviewLoading(true);
    try {
      const res = await referralService.reviewReferral(user!.id, isAdmin, reviewModal.id, reviewModal.action!, reviewNote || undefined);
      if (res.success) {
        message.success(reviewModal.action === 'approve' ? '已通过审核' : '已拒绝');
        setReviewModal({ open: false, id: '', action: null });
        setReviewNote('');
        fetchList(tabToReviewStatus(activeTab) as string, page);
      } else { message.error(res.message || '操作失败'); }
    } catch (e: any) { message.error(e.response?.data?.message || '操作失败'); }
    finally { setReviewLoading(false); }
  };

  const handleStatusSubmit = async () => {
    setStatusLoading(true);
    try {
      const res = await referralService.updateReferralStatus(user!.id, isAdmin, statusModal.id, newStatus);
      if (res.success) {
        message.success('状态更新成功');
        setStatusModal({ open: false, id: '', current: '' });
        fetchList(tabToReviewStatus(activeTab) as string, page);
      } else { message.error(res.message || '操作失败'); }
    } catch (e: any) { message.error(e.response?.data?.message || '操作失败'); }
    finally { setStatusLoading(false); }
  };

  const handleRewardSubmit = async () => {
    setRewardLoading(true);
    try {
      const res = await referralService.processReward(user!.id, isAdmin, rewardModal.id, rewardModal.action, rewardRemark || undefined);
      if (res.success) {
        message.success('返费操作成功');
        setRewardModal({ open: false, id: '', action: '' });
        setRewardRemark('');
        fetchList(tabToReviewStatus(activeTab) as string, page);
      } else { message.error(res.message || '操作失败'); }
    } catch (e: any) { message.error(e.response?.data?.message || '操作失败'); }
    finally { setRewardLoading(false); }
  };

  const handleRelease = (record: ReferralResume) => {
    Modal.confirm({
      title: '确认释放到简历库',
      content: (
        <span>
          确认将 <strong>{record.name}</strong> 释放到简历库吗？<br />
          释放后将自动在简历库创建一条记录（推荐人：{record.referrerName || '-'}），
          <br />
          后续签单/上户/返费流程仍通过本推荐记录跟踪，归属不变。
        </span>
      ),
      okText: '确认释放',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await referralService.releaseToResumeLibrary(user!.id, isAdmin, record._id);
          if (res.success) {
            message.success('已释放到简历库');
            fetchList(tabToReviewStatus(activeTab) as string, page);
          } else {
            message.error((res as any).message || '释放失败');
          }
        } catch (e: any) {
          message.error(e.response?.data?.message || '释放失败');
        }
      },
    });
  };

  const columns: ColumnsType<ReferralResume> = [
    {
      title: '阿姨姓名',
      dataIndex: 'name',
      width: 100,
      fixed: 'left',
    },
    {
      title: '阿姨电话',
      dataIndex: 'phone',
      width: 130,
      render: (v?: string) => v || <span style={{ color: '#bbb' }}>未填写</span>,
    },
    {
      title: '阿姨工种',
      dataIndex: 'serviceType',
      width: 100,
      render: (v: string) => JOB_TYPE_LABEL[v] || v || '-',
    },
    {
      title: '推荐人姓名',
      dataIndex: 'referrerName',
      width: 100,
      render: (v?: string) => v || <span style={{ color: '#bbb' }}>-</span>,
    },
    {
      title: '推荐人电话',
      dataIndex: 'referrerPhone',
      width: 130,
    },
    {
      title: '审核状态',
      dataIndex: 'reviewStatus',
      width: 90,
      render: (v: string) => {
        const item = REVIEW_STATUS_MAP[v] || { color: 'default', label: v };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: '整体状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => {
        const item = STATUS_MAP[v] || { color: 'default', label: v };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: '审核截止',
      dataIndex: 'reviewDeadlineAt',
      width: 155,
      render: (v: string) => {
        if (!v) return '-';
        const deadline = new Date(v);
        const isOverdue = deadline < new Date();
        return (
          <span style={{ color: isOverdue ? 'red' : undefined }}>
            {deadline.toLocaleString('zh-CN')}
            {isOverdue && ' ⚠️'}
          </span>
        );
      },
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      width: 155,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      width: 190,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>详情</Button>
          {record.reviewStatus === 'pending_review' && (
            <>
              <Button type="primary" size="small" icon={<CheckOutlined />}
                onClick={() => { setReviewModal({ open: true, id: record._id, action: 'approve' }); setReviewNote(''); }}>通过</Button>
              <Button danger size="small" icon={<CloseOutlined />}
                onClick={() => { setReviewModal({ open: true, id: record._id, action: 'reject' }); setReviewNote(''); }}>拒绝</Button>
            </>
          )}
          {record.reviewStatus === 'activated' && (record as any).linkedResumeId && (
            <Button size="small" type="link" icon={<EyeOutlined />}
              onClick={() => window.open(`/standalone/aunt/resumes/detail/${(record as any).linkedResumeId}`, '_blank')}>
              查看简历
            </Button>
          )}
          {record.reviewStatus === 'approved' && ['following_up', 'contracted', 'onboarded'].includes(record.status) && (
            <Button size="small" icon={<SwapOutlined />}
              onClick={() => { setStatusModal({ open: true, id: record._id, current: record.status }); setNewStatus(''); }}>更新状态</Button>
          )}
          {['approved', 'following_up'].includes(record.status) && !record.linkedResumeId && (
            <Button size="small" icon={<ExportOutlined />} onClick={() => handleRelease(record)}>释放</Button>
          )}
          {record.status === 'onboarded' && record.rewardStatus === 'pending' && (
            <Button size="small" type="link"
              onClick={() => { setRewardModal({ open: true, id: record._id, action: 'markPaid' }); setRewardRemark(''); }}>标记打款</Button>
          )}
        </Space>
      ),
    },
  ];

  const sharedTable = (
    <Table
      rowKey="_id"
      columns={columns}
      dataSource={list}
      loading={loading}
      scroll={{ x: 1200 }}
      pagination={{
        total,
        pageSize: 20,
        current: page,
        onChange: p => { setPage(p); fetchList(tabToReviewStatus(activeTab) as string, p); },
        showTotal: t => `共 ${t} 条`,
        showSizeChanger: false,
      }}
    />
  );

  const tabItems = [
    {
      key: 'pending',
      label: <Badge count={activeTab === 'pending' ? total : undefined} size="small" offset={[8, 0]}><span>待审核</span></Badge>,
      children: sharedTable,
    },
    {
      key: 'processed',
      label: '已处理',
      children: sharedTable,
    },
    {
      key: 'activated',
      label: <Badge count={activeTab === 'activated' ? total : undefined} size="small" offset={[8, 0]} color="volcano"><span>已激活</span></Badge>,
      children: sharedTable,
    },
  ];

  const record = detailModal.record;

  return (
    <PageContainer
      title="推荐简历审核"
      subTitle={isAdmin ? '管理员可查看全量推荐简历' : '仅显示分配给您的推荐简历'}
      extra={isAdmin ? [
        <Button
          key="sync"
          icon={<SyncOutlined />}
          loading={syncLoading}
          onClick={handleSyncFromCloud}
        >
          同步小程序数据
        </Button>,
      ] : []}
    >
      <Card>
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} />
      </Card>

      {/* 详情弹窗 */}
      <Modal title="推荐简历详情" open={detailModal.open} onCancel={() => setDetailModal({ open: false, record: null })} footer={null} width={680}>
        <Spin spinning={detailLoading}>
        {record && (() => {
          const onboardedDays = record.onboardedAt ? Math.floor((Date.now() - new Date(record.onboardedAt).getTime()) / 86400000) : null;
          const remainDays = record.rewardExpectedAt ? Math.ceil((new Date(record.rewardExpectedAt).getTime() - Date.now()) / 86400000) : null;
          return (
            <>
              <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13 }}>推荐信息</Divider>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="阿姨姓名">{record.name}</Descriptions.Item>
                <Descriptions.Item label="阿姨工种">{JOB_TYPE_LABEL[record.serviceType] || record.serviceType}</Descriptions.Item>
                <Descriptions.Item label="阿姨电话">{record.phone || '-'}</Descriptions.Item>
                <Descriptions.Item label="身份证号">{record.idCard || '-'}</Descriptions.Item>
                <Descriptions.Item label="从业经验" span={2}>{record.experience || '-'}</Descriptions.Item>
                <Descriptions.Item label="推荐人备注" span={2}>{record.remark || '-'}</Descriptions.Item>
                <Descriptions.Item label="推荐人姓名">{record.referrerName || '-'}</Descriptions.Item>
                <Descriptions.Item label="推荐人电话">{record.referrerPhone}</Descriptions.Item>
                <Descriptions.Item label="整体状态">
                  {(() => { const item = STATUS_MAP[record.status]; return <Tag color={item?.color}>{item?.label || record.status}</Tag>; })()}
                </Descriptions.Item>
                <Descriptions.Item label="简历审核">
                  {(() => { const item = REVIEW_STATUS_MAP[record.reviewStatus]; return <Tag color={item?.color}>{item?.label || record.reviewStatus}</Tag>; })()}
                </Descriptions.Item>
                <Descriptions.Item label="审核备注" span={2}>{record.reviewNote || '-'}</Descriptions.Item>
                <Descriptions.Item label="提交时间" span={2}>{new Date(record.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
              </Descriptions>

              {record.contractSignedAt && <>
                <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, marginTop: 12 }}>签单信息</Divider>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="签单时间">{new Date(record.contractSignedAt).toLocaleDateString('zh-CN')}</Descriptions.Item>
                  <Descriptions.Item label="上户时间">{record.onboardedAt ? new Date(record.onboardedAt).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
                  {onboardedDays !== null && <Descriptions.Item label="上户已满" span={2}>
                    <span style={{ color: onboardedDays >= 30 ? '#52c41a' : '#fa8c16' }}>{onboardedDays} 天</span>
                    {remainDays !== null && remainDays > 0 && <span style={{ color: '#999', marginLeft: 8 }}>（还需 {remainDays} 天）</span>}
                    {remainDays !== null && remainDays <= 0 && <span style={{ color: '#52c41a', marginLeft: 8 }}>✅ 已满足结算条件</span>}
                  </Descriptions.Item>}
                  <Descriptions.Item label="客户服务费">¥{record.serviceFee ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="预计返费" ><span style={{ color: '#52c41a', fontWeight: 600 }}>¥{record.rewardAmount ?? '-'}</span></Descriptions.Item>
                  <Descriptions.Item label="预计到账">{record.rewardExpectedAt ? new Date(record.rewardExpectedAt).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
                  <Descriptions.Item label="到账状态">
                    {(() => { const item = REWARD_STATUS_MAP[record.rewardStatus]; return item ? <Tag color={item.color}>{item.label}</Tag> : <Tag>{record.rewardStatus || '-'}</Tag>; })()}
                  </Descriptions.Item>
                </Descriptions>
              </>}

              {record.contract && <>
                <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, marginTop: 12 }}>合同记录</Divider>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="订单编号" span={2}><span style={{ color: '#1677ff', wordBreak: 'break-all' }}>{record.contract.orderNumber || '-'}</span></Descriptions.Item>
                  <Descriptions.Item label="订单类型">{record.contract.orderType || '-'}</Descriptions.Item>
                  <Descriptions.Item label="服务费金额"><span style={{ color: '#fa8c16', fontWeight: 600 }}>¥{record.contract.serviceFee ?? '-'}</span></Descriptions.Item>
                  <Descriptions.Item label="阿姨工资">¥{record.contract.nannySalary ?? '-'}/月</Descriptions.Item>
                  <Descriptions.Item label="上户时间">{record.contract.onboardDate ? new Date(record.contract.onboardDate).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
                  <Descriptions.Item label="合同周期" span={2}>
                    {record.contract.contractStartDate && record.contract.contractEndDate
                      ? `${new Date(record.contract.contractStartDate).toLocaleDateString('zh-CN')} 至 ${new Date(record.contract.contractEndDate).toLocaleDateString('zh-CN')}`
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="合同创建人">{record.contract.createdByName || '-'}</Descriptions.Item>
                </Descriptions>
              </>}

              {['reward_pending', 'reward_approved', 'reward_paid'].includes(record.status) && (record.payeeName || record.bankCard) && <>
                <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, marginTop: 12 }}>收款信息</Divider>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="收款人">{record.payeeName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="收款手机">{record.payeePhone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="银行卡号">{record.bankCard || '-'}</Descriptions.Item>
                  <Descriptions.Item label="开户行">{record.bankName || '-'}</Descriptions.Item>
                </Descriptions>
              </>}
            </>
          );
        })()}
        </Spin>
      </Modal>

      {/* 审核弹窗 */}
      <Modal
        title={reviewModal.action === 'approve' ? '确认通过审核' : '填写拒绝原因'}
        open={reviewModal.open}
        onOk={handleReviewSubmit}
        onCancel={() => setReviewModal({ open: false, id: '', action: null })}
        okText={reviewModal.action === 'approve' ? '确认通过' : '确认拒绝'}
        okButtonProps={{ danger: reviewModal.action === 'reject', loading: reviewLoading }}
        cancelText="取消"
      >
        {reviewModal.action === 'reject' && (
          <TextArea placeholder="请填写拒绝原因（必填）" rows={4} value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
        )}
        {reviewModal.action === 'approve' && <p>确认通过后，状态将变为「推荐中」，推荐人将收到通知。</p>}
      </Modal>

      {/* 更新状态弹窗 */}
      <Modal
        title="更新跟进状态"
        open={statusModal.open}
        onOk={handleStatusSubmit}
        onCancel={() => setStatusModal({ open: false, id: '', current: '' })}
        okText="确认更新"
        okButtonProps={{ loading: statusLoading }}
        cancelText="取消"
      >
        <p>当前状态：<Tag>{STATUS_MAP[statusModal.current]?.label || statusModal.current}</Tag></p>
        <Select style={{ width: '100%' }} placeholder="选择新状态" value={newStatus || undefined} onChange={setNewStatus}>
          {statusModal.current === 'following_up' && <Option value="invalid">标记为未录用</Option>}
          {statusModal.current === 'contracted' && <Option value="onboarded">标记为已上户</Option>}
          {statusModal.current === 'onboarded' && <Option value="reward_pending">发起返费审核</Option>}
        </Select>
      </Modal>

      {/* 返费打款弹窗 */}
      <Modal
        title="标记返费已打款"
        open={rewardModal.open}
        onOk={handleRewardSubmit}
        onCancel={() => setRewardModal({ open: false, id: '', action: '' })}
        okText="确认已打款"
        okButtonProps={{ loading: rewardLoading }}
        cancelText="取消"
      >
        <p>请确认已通过微信转账给推荐人，操作后无法撤销。</p>
        <TextArea placeholder="备注（可选）" rows={3} value={rewardRemark} onChange={e => setRewardRemark(e.target.value)} />
      </Modal>
    </PageContainer>
  );
};

export default ReferralResumeReview;
