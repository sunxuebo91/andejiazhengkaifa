import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card, Table, Button, Space, Tag, Modal, Input, App,
  Select, Form, Descriptions, Drawer, Timeline, Tooltip, Spin, Divider,
} from 'antd';
import { SwapOutlined, EyeOutlined, DollarOutlined, HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../../contexts/AuthContext';
import * as referralService from '../../services/referralService';
import type { ReferralResume, BindingLog } from '../../services/referralService';
import apiService from '../../services/api';

import { RESUME_STATUS_MAP as STATUS_MAP, REWARD_STATUS_MAP } from './constants';
import { JOB_TYPE_MAP } from '../../constants/jobTypes';

const { TextArea } = Input;
const { Option } = Select;

interface Staff { _id: string; name: string; phone?: string; isActive?: boolean; }

const ReferralManage: React.FC = () => {
  const { user } = useAuth();
  const { message } = App.useApp();

  const [list, setList] = useState<ReferralResume[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterStaff, setFilterStaff] = useState<string | undefined>();
  const [staffList, setStaffList] = useState<Staff[]>([]);

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

  // 重新分配弹窗
  const [reassignForm] = Form.useForm();
  const [reassignModal, setReassignModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [reassignLoading, setReassignLoading] = useState(false);

  // 绑定日志 Drawer
  const [logDrawer, setLogDrawer] = useState<{ open: boolean; id: string; logs: BindingLog[] }>({ open: false, id: '', logs: [] });
  const [logLoading, setLogLoading] = useState(false);

  // 返费打款弹窗
  const [rewardModal, setRewardModal] = useState<{
    open: boolean; id: string; action: string; resumeName: string;
    payeeName?: string; payeePhone?: string; bankCard?: string; bankName?: string;
    rewardAmount?: number;
  }>({ open: false, id: '', action: '', resumeName: '' });
  const [rewardRemark, setRewardRemark] = useState('');
  const [rewardLoading, setRewardLoading] = useState(false);

  const fetchStaff = async () => {
    try {
      const res = await apiService.get<{ items: Staff[] }>('/api/users', { pageSize: 100 });
      if (res.success && res.data) setStaffList(res.data.items || []);
    } catch {}
  };

  const fetchList = async (p = 1) => {
    setLoading(true);
    try {
      const res = await referralService.listAllReferrals({ assignedStaffId: filterStaff, status: filterStatus, page: p, pageSize: 20 });
      if (res.success && res.data) { setList(res.data.list); setTotal(res.data.total); setPage(p); }
    } catch { message.error('获取列表失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStaff(); fetchList(); }, []);
  useEffect(() => { fetchList(1); }, [filterStatus, filterStaff]);

  const handleReassign = async () => {
    try {
      const values = await reassignForm.validateFields();
      setReassignLoading(true);
      const res = await referralService.reassignBinding(user!.id, reassignModal.id, values.newStaffId, values.reason);
      if (res.success) {
        message.success('重新分配成功，已通知相关员工');
        setReassignModal({ open: false, id: '', name: '' });
        reassignForm.resetFields();
        fetchList(page);
      } else { message.error(res.message || '操作失败'); }
    } catch (e: any) { if (e.errorFields) return; message.error(e.response?.data?.message || '操作失败'); }
    finally { setReassignLoading(false); }
  };

  const handleViewLogs = async (id: string) => {
    setLogLoading(true);
    setLogDrawer({ open: true, id, logs: [] });
    try {
      const res = await referralService.getBindingLogs(id);
      if (res.success && Array.isArray(res.data)) setLogDrawer(prev => ({ ...prev, logs: res.data as BindingLog[] }));
    } catch { message.error('获取日志失败'); }
    finally { setLogLoading(false); }
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
          const isAdmin = (user as any)?.role === 'admin' || (user as any)?.isAdmin === true;
          const res = await referralService.releaseToResumeLibrary(user!.id, isAdmin, record._id);
          if (res.success) {
            message.success('已释放到简历库');
            fetchList(page);
          } else {
            message.error((res as any).message || '释放失败');
          }
        } catch (e: any) {
          message.error(e.response?.data?.message || '释放失败');
        }
      },
    });
  };

  const handleDelete = (record: ReferralResume) => {
    Modal.confirm({
      title: '确认删除推荐记录',
      content: (
        <span>
          确定要删除 <strong>{record.name}</strong> 的推荐记录吗？<br />
          <span style={{ color: '#ff4d4f' }}>此操作不可恢复，请谨慎操作。</span>
        </span>
      ),
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await referralService.deleteReferralResume(user!.id, record._id);
          if (res.success) {
            message.success('已删除');
            fetchList();
          } else {
            message.error((res as any).message || '删除失败');
          }
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleRewardSubmit = async () => {
    setRewardLoading(true);
    try {
      const res = await referralService.adminProcessReward(user!.id, rewardModal.id, rewardModal.action, rewardRemark || undefined);
      if (res.success) {
        message.success('操作成功');
        setRewardModal({ open: false, id: '', action: '', resumeName: '' });

        setRewardRemark('');
        fetchList(page);
      } else { message.error(res.message || '操作失败'); }
    } catch (e: any) { message.error(e.response?.data?.message || '操作失败'); }
    finally { setRewardLoading(false); }
  };

  const staffName = (id: string) => staffList.find(s => s._id === id)?.name || id;

  const columns: ColumnsType<ReferralResume> = [
    { title: '阿姨姓名', dataIndex: 'name', width: 90, fixed: 'left' },
    { title: '阿姨工种', dataIndex: 'serviceType', width: 100, render: (v: string) => (JOB_TYPE_MAP as any)[v] || v },
    { title: '阿姨电话', dataIndex: 'phone', width: 130, render: (v?: string) => v || <span style={{ color: '#bbb' }}>未填写</span> },
    { title: '推荐人姓名', dataIndex: 'referrerName', width: 100, render: (v?: string) => v || '-' },
    { title: '推荐人电话', dataIndex: 'referrerPhone', width: 130 },
    {
      title: '来源员工', dataIndex: 'referrerSourceStaffName', width: 100,
      render: (v?: string | null) => v
        ? <span>{v}</span>
        : <span style={{ color: '#bbb' }}>-</span>,
    },
    {
      title: '归属员工', dataIndex: 'assignedStaffName', width: 100,
      render: (v?: string | null, record?: any) => v || staffName(record?.assignedStaffId || ''),
    },
    {
      title: '返费归属', dataIndex: 'rewardOwnerStaffName', width: 100,
      render: (v?: string | null) => v || <span style={{ color: '#bbb' }}>-</span>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => { const i = STATUS_MAP[v]; return <Tag color={i?.color}>{i?.label || v}</Tag>; },
    },
    { title: '预计返费', dataIndex: 'rewardAmount', width: 90, render: (v?: number) => v != null ? `¥${v}` : '-' },
    { title: '提交时间', dataIndex: 'createdAt', width: 150, render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
    {
      title: '操作', width: 260, fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="查看详情"><Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} /></Tooltip>
          <Tooltip title="重新分配员工"><Button size="small" icon={<SwapOutlined />} onClick={() => { setReassignModal({ open: true, id: record._id, name: record.name }); reassignForm.resetFields(); }}>分配</Button></Tooltip>
          <Tooltip title="绑定变更日志"><Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewLogs(record._id)} /></Tooltip>
          {['approved', 'following_up'].includes(record.status) && !record.linkedResumeId && (
            <Tooltip title="释放到简历库">
              <Button size="small" icon={<ExportOutlined />} onClick={() => handleRelease(record)}>释放</Button>
            </Tooltip>
          )}
          {record.status === 'reward_pending' && <>
            <Tooltip title="审核通过，进入待打款">
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                onClick={() => { setRewardModal({ open: true, id: record._id, action: 'approve', resumeName: record.name, payeeName: record.payeeName, payeePhone: record.payeePhone, bankCard: record.bankCard, bankName: record.bankName, rewardAmount: record.rewardAmount }); setRewardRemark(''); }}>
                审核通过
              </Button>
            </Tooltip>
            <Tooltip title="驳回返费申请">
              <Button size="small" danger icon={<CloseCircleOutlined />}
                onClick={() => { setRewardModal({ open: true, id: record._id, action: 'reject', resumeName: record.name, payeeName: record.payeeName, payeePhone: record.payeePhone, bankCard: record.bankCard, bankName: record.bankName, rewardAmount: record.rewardAmount }); setRewardRemark(''); }}>
                驳回
              </Button>
            </Tooltip>
          </>}
          {record.status === 'reward_approved' && (
            <Tooltip title="确认已完成转账">
              <Button size="small" type="primary" icon={<DollarOutlined />}
                onClick={() => { setRewardModal({ open: true, id: record._id, action: 'markPaid', resumeName: record.name, payeeName: record.payeeName, payeePhone: record.payeePhone, bankCard: record.bankCard, bankName: record.bankName, rewardAmount: record.rewardAmount }); setRewardRemark(''); }}>
                打款
              </Button>
            </Tooltip>
          )}
          <Tooltip title="删除记录">
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const r = detailModal.record;

  return (
    <PageContainer title="全量推荐管理" subTitle="查看并管理所有推荐记录（仅管理员）">
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 12 }}>
        <Space wrap>
          <span>状态筛选：</span>
          <Select allowClear placeholder="全部状态" style={{ width: 140 }} value={filterStatus} onChange={setFilterStatus}>
            {Object.entries(STATUS_MAP).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
          </Select>
          <span>绑定员工：</span>
          <Select allowClear placeholder="全部员工" style={{ width: 140 }} value={filterStaff} onChange={setFilterStaff} showSearch optionFilterProp="children">
            {staffList.map(s => <Option key={s._id} value={s._id}>{s.name}</Option>)}
          </Select>
          <Button onClick={() => fetchList(1)}>刷新</Button>
        </Space>
      </Card>

      <Card>
        <style>{`.referral-row-urgent td { background: #fff9e6 !important; }`}</style>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={list}
          loading={loading}
          scroll={{ x: 1230 }}
          rowClassName={(record) =>
            ['reward_pending', 'reward_approved'].includes(record.status) ? 'referral-row-urgent' : ''
          }
          pagination={{ total, pageSize: 20, current: page, onChange: fetchList, showTotal: t => `共 ${t} 条` }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal title="推荐记录详情" open={detailModal.open} onCancel={() => setDetailModal({ open: false, record: null })} footer={null} width={720}>
        <Spin spinning={detailLoading}>
        {r && (() => {
          const onboardedDays = r.onboardedAt ? Math.floor((Date.now() - new Date(r.onboardedAt).getTime()) / 86400000) : null;
          const remainDays = r.rewardExpectedAt ? Math.ceil((new Date(r.rewardExpectedAt).getTime() - Date.now()) / 86400000) : null;
          return (<>
            <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13 }}>推荐信息</Divider>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="阿姨姓名">{r.name}</Descriptions.Item>
              <Descriptions.Item label="阿姨工种">{(JOB_TYPE_MAP as any)[r.serviceType] || r.serviceType}</Descriptions.Item>
              <Descriptions.Item label="阿姨电话">{r.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="身份证号">{r.idCard || '-'}</Descriptions.Item>
              <Descriptions.Item label="从业经验" span={2}>{r.experience || '-'}</Descriptions.Item>
              <Descriptions.Item label="推荐人备注" span={2}>{r.remark || '-'}</Descriptions.Item>
              <Descriptions.Item label="推荐人姓名">{(r as any).referrerName || '-'}</Descriptions.Item>
              <Descriptions.Item label="推荐人电话">{r.referrerPhone}</Descriptions.Item>
              <Descriptions.Item label="来源员工">{r.referrerSourceStaffName || '-'}</Descriptions.Item>
              <Descriptions.Item label="归属员工">{r.assignedStaffName || staffName(r.assignedStaffId)}</Descriptions.Item>
              <Descriptions.Item label="返费归属">{r.rewardOwnerStaffName || (r.rewardOwnerStaffId ? staffName(r.rewardOwnerStaffId) : '-')}</Descriptions.Item>
              <Descriptions.Item label="整体状态"><Tag color={STATUS_MAP[r.status]?.color}>{STATUS_MAP[r.status]?.label || r.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="审核备注">{r.reviewNote || '-'}</Descriptions.Item>
              <Descriptions.Item label="审核截止">{r.reviewDeadlineAt ? new Date(r.reviewDeadlineAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
              <Descriptions.Item label="提交时间" span={2}>{new Date(r.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
            </Descriptions>

            {r.contractSignedAt && <>
              <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, marginTop: 12 }}>签单信息</Divider>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="签单时间">{new Date(r.contractSignedAt).toLocaleDateString('zh-CN')}</Descriptions.Item>
                <Descriptions.Item label="上户时间">{r.onboardedAt ? new Date(r.onboardedAt).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
                {onboardedDays !== null && <Descriptions.Item label="上户已满" span={2}>
                  <span style={{ color: onboardedDays >= 30 ? '#52c41a' : '#fa8c16' }}>{onboardedDays} 天</span>
                  {remainDays !== null && remainDays > 0 && <span style={{ color: '#999', marginLeft: 8 }}>（还需 {remainDays} 天）</span>}
                  {remainDays !== null && remainDays <= 0 && <span style={{ color: '#52c41a', marginLeft: 8 }}>✅ 已满足结算条件</span>}
                </Descriptions.Item>}
                <Descriptions.Item label="客户服务费">¥{r.serviceFee ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="预计返费"><span style={{ color: '#52c41a', fontWeight: 600 }}>¥{r.rewardAmount ?? '-'}</span></Descriptions.Item>
                <Descriptions.Item label="预计到账">{r.rewardExpectedAt ? new Date(r.rewardExpectedAt).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
                <Descriptions.Item label="到账状态">
                  {(() => { const item = REWARD_STATUS_MAP[r.rewardStatus]; return item ? <Tag color={item.color}>{item.label}</Tag> : <Tag>{r.rewardStatus || '-'}</Tag>; })()}
                </Descriptions.Item>
                {r.rewardPaidAt && <Descriptions.Item label="实际打款时间" span={2}>{new Date(r.rewardPaidAt).toLocaleDateString('zh-CN')}</Descriptions.Item>}
              </Descriptions>
            </>}

            {r.contract && <>
              <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, marginTop: 12 }}>合同记录</Divider>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="订单编号" span={2}><span style={{ color: '#1677ff', wordBreak: 'break-all' }}>{r.contract.orderNumber || '-'}</span></Descriptions.Item>
                <Descriptions.Item label="订单类型">{r.contract.orderType || '-'}</Descriptions.Item>
                <Descriptions.Item label="服务费金额"><span style={{ color: '#fa8c16', fontWeight: 600 }}>¥{r.contract.serviceFee ?? '-'}</span></Descriptions.Item>
                <Descriptions.Item label="阿姨工资">¥{r.contract.nannySalary ?? '-'}/月</Descriptions.Item>
                <Descriptions.Item label="上户时间">{r.contract.onboardDate ? new Date(r.contract.onboardDate).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
                <Descriptions.Item label="合同周期" span={2}>
                  {r.contract.contractStartDate && r.contract.contractEndDate
                    ? `${new Date(r.contract.contractStartDate).toLocaleDateString('zh-CN')} 至 ${new Date(r.contract.contractEndDate).toLocaleDateString('zh-CN')}`
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="合同创建人">{r.contract.createdByName || '-'}</Descriptions.Item>
              </Descriptions>
            </>}

            {['reward_pending', 'reward_approved', 'reward_paid'].includes(r.status) && (r.payeeName || r.bankCard) && <>
              <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, marginTop: 12 }}>收款信息</Divider>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="收款人">{r.payeeName || '-'}</Descriptions.Item>
                <Descriptions.Item label="收款手机">{r.payeePhone || '-'}</Descriptions.Item>
                <Descriptions.Item label="银行卡号">{r.bankCard || '-'}</Descriptions.Item>
                <Descriptions.Item label="开户行">{r.bankName || '-'}</Descriptions.Item>
              </Descriptions>
            </>}
          </>);
        })()}
        </Spin>
      </Modal>

      {/* 重新分配弹窗 */}
      <Modal
        title={`重新分配「${reassignModal.name}」的绑定员工`}
        open={reassignModal.open}
        onOk={handleReassign}
        onCancel={() => setReassignModal({ open: false, id: '', name: '' })}
        okText="确认分配"
        okButtonProps={{ loading: reassignLoading }}
        cancelText="取消"
      >
        <Form form={reassignForm} layout="vertical">
          <Form.Item label="新绑定员工" name="newStaffId" rules={[{ required: true, message: '请选择员工' }]}>
            <Select placeholder="选择员工" showSearch optionFilterProp="children">
              {staffList.filter(s => s.isActive !== false).map(s => <Option key={s._id} value={s._id}>{s.name}{s.phone ? `（${s.phone}）` : ''}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="干预原因" name="reason" rules={[{ required: true, message: '干预原因不能为空' }]}>
            <TextArea rows={3} placeholder="请填写重新分配的原因（必填），将记录在日志中" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 绑定日志 Drawer */}
      <Drawer title="绑定变更日志" open={logDrawer.open} onClose={() => setLogDrawer(prev => ({ ...prev, open: false }))} width={500}>
        {logLoading ? <p>加载中...</p> : logDrawer.logs.length === 0 ? <p>暂无变更记录</p> : (
          <Timeline items={logDrawer.logs.map(log => ({
            color: log.reassignType === 'manual' ? 'blue' : log.reassignType === 'departure' ? 'red' : 'orange',
            children: (
              <div>
                <div><strong>{log.reassignType === 'manual' ? '手动分配' : log.reassignType === 'departure' ? '员工离职' : '24h超时'}</strong></div>
                <div style={{ fontSize: 12, color: '#888' }}>{new Date(log.createdAt).toLocaleString('zh-CN')}</div>
                <div style={{ fontSize: 12 }}>原员工：{staffName(log.fromStaffId)} → 新员工：{staffName(log.toStaffId)}</div>
                {log.reason && <div style={{ fontSize: 12, color: '#666' }}>原因：{log.reason}</div>}
              </div>
            ),
          }))} />
        )}
      </Drawer>

      {/* 返费操作弹窗（审核通过 / 驳回 / 打款） */}
      <Modal
        title={
          rewardModal.action === 'approve' ? `审核通过返费申请 — ${rewardModal.resumeName}` :
          rewardModal.action === 'reject'  ? `驳回返费申请 — ${rewardModal.resumeName}` :
                                             `确认返费已打款 — ${rewardModal.resumeName}`
        }
        open={rewardModal.open}
        onOk={handleRewardSubmit}
        onCancel={() => setRewardModal({ open: false, id: '', action: '', resumeName: '' })}
        okText={rewardModal.action === 'approve' ? '确认通过' : rewardModal.action === 'reject' ? '确认驳回' : '确认已打款'}
        okButtonProps={{ loading: rewardLoading, danger: rewardModal.action === 'reject' }}
        cancelText="取消"
      >
        {rewardModal.action === 'markPaid' && (
          (rewardModal.payeeName || rewardModal.bankCard) ? (
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="打款金额">
                <span style={{ color: '#52c41a', fontWeight: 600, fontSize: 16 }}>
                  {rewardModal.rewardAmount != null ? `¥${rewardModal.rewardAmount}` : '-'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="收款人">{rewardModal.payeeName || '-'}</Descriptions.Item>
              <Descriptions.Item label="收款手机">{rewardModal.payeePhone || '-'}</Descriptions.Item>
              <Descriptions.Item label="银行卡号">{rewardModal.bankCard || '-'}</Descriptions.Item>
              <Descriptions.Item label="开户行">{rewardModal.bankName || '-'}</Descriptions.Item>
            </Descriptions>
          ) : (
            <p style={{ color: '#faad14' }}>⚠️ 推荐人尚未提交收款信息，请通过其他方式确认打款账户后再操作。</p>
          )
        )}
        {rewardModal.action === 'approve' && (
          <p style={{ color: '#52c41a', marginBottom: 8 }}>✅ 审核通过后，记录状态将变为「返费待打款」，可继续执行打款操作。</p>
        )}
        {rewardModal.action === 'reject' && (
          <p style={{ color: '#ff4d4f', marginBottom: 8 }}>⚠️ 驳回后，记录退回「返费待审核」状态，推荐人可重新申请。</p>
        )}
        <TextArea
          placeholder={rewardModal.action === 'reject' ? '请填写驳回原因（推荐人可见）' : '备注（可选）'}
          rows={3}
          value={rewardRemark}
          onChange={e => setRewardRemark(e.target.value)}
        />
      </Modal>
    </PageContainer>
  );
};

export default ReferralManage;
