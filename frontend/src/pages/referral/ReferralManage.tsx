import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card, Table, Button, Space, Tag, Modal, Input, App,
  Select, Form, Descriptions, Drawer, Timeline, Tooltip,
} from 'antd';
import { SwapOutlined, EyeOutlined, DollarOutlined, HistoryOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../../contexts/AuthContext';
import * as referralService from '../../services/referralService';
import type { ReferralResume, BindingLog } from '../../services/referralService';
import apiService from '../../services/api';

import { RESUME_STATUS_MAP as STATUS_MAP } from './constants';

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

  // 重新分配弹窗
  const [reassignForm] = Form.useForm();
  const [reassignModal, setReassignModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [reassignLoading, setReassignLoading] = useState(false);

  // 绑定日志 Drawer
  const [logDrawer, setLogDrawer] = useState<{ open: boolean; id: string; logs: BindingLog[] }>({ open: false, id: '', logs: [] });
  const [logLoading, setLogLoading] = useState(false);

  // 返费打款弹窗
  const [rewardModal, setRewardModal] = useState<{ open: boolean; id: string; action: string; resumeName: string }>({ open: false, id: '', action: '', resumeName: '' });
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
    { title: '阿姨工种', dataIndex: 'serviceType', width: 90 },
    { title: '推荐人姓名', dataIndex: 'referrerName', width: 100, render: (v?: string) => v || '-' },
    { title: '推荐人电话', dataIndex: 'referrerPhone', width: 130 },
    { title: '绑定员工', dataIndex: 'assignedStaffId', width: 100, render: staffName },
    { title: '返费归属', dataIndex: 'rewardOwnerStaffId', width: 100, render: (v: string) => v ? staffName(v) : '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => { const i = STATUS_MAP[v]; return <Tag color={i?.color}>{i?.label || v}</Tag>; },
    },
    { title: '预计返费', dataIndex: 'rewardAmount', width: 90, render: (v?: number) => v != null ? `¥${v}` : '-' },
    { title: '提交时间', dataIndex: 'createdAt', width: 150, render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
    {
      title: '操作', width: 220, fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="查看详情"><Button size="small" icon={<EyeOutlined />} onClick={() => setDetailModal({ open: true, record })} /></Tooltip>
          <Tooltip title="重新分配员工"><Button size="small" icon={<SwapOutlined />} onClick={() => { setReassignModal({ open: true, id: record._id, name: record.name }); reassignForm.resetFields(); }}>分配</Button></Tooltip>
          <Tooltip title="绑定变更日志"><Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewLogs(record._id)} /></Tooltip>
          {['reward_pending', 'onboarded'].includes(record.status) && (
            <Tooltip title="返费打款">
              <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => { setRewardModal({ open: true, id: record._id, action: 'markPaid', resumeName: record.name }); setRewardRemark(''); }}>打款</Button>
            </Tooltip>
          )}
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
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={list}
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{ total, pageSize: 20, current: page, onChange: fetchList, showTotal: t => `共 ${t} 条` }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal title="推荐记录详情" open={detailModal.open} onCancel={() => setDetailModal({ open: false, record: null })} footer={null} width={700}>
        {r && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="阿姨姓名">{r.name}</Descriptions.Item>
            <Descriptions.Item label="阿姨工种">{r.serviceType}</Descriptions.Item>
            <Descriptions.Item label="阿姨电话">{r.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="身份证号">{r.idCard || '-'}</Descriptions.Item>
            <Descriptions.Item label="从业经验" span={2}>{r.experience || '-'}</Descriptions.Item>
            <Descriptions.Item label="推荐人备注" span={2}>{r.remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="推荐人姓名">{(r as any).referrerName || '-'}</Descriptions.Item>
            <Descriptions.Item label="推荐人电话">{r.referrerPhone}</Descriptions.Item>
            <Descriptions.Item label="绑定员工">{staffName(r.assignedStaffId)}</Descriptions.Item>
            <Descriptions.Item label="返费归属">{r.rewardOwnerStaffId ? staffName(r.rewardOwnerStaffId) : '-'}</Descriptions.Item>
            <Descriptions.Item label="整体状态"><Tag color={STATUS_MAP[r.status]?.color}>{STATUS_MAP[r.status]?.label || r.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="审核备注">{r.reviewNote || '-'}</Descriptions.Item>
            <Descriptions.Item label="审核截止">{r.reviewDeadlineAt ? new Date(r.reviewDeadlineAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
            {r.contractSignedAt && <>
              <Descriptions.Item label="签单时间">{new Date(r.contractSignedAt).toLocaleDateString('zh-CN')}</Descriptions.Item>
              <Descriptions.Item label="服务费">¥{r.serviceFee ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="预计返费">¥{r.rewardAmount ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="预计到账">{r.rewardExpectedAt ? new Date(r.rewardExpectedAt).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
            </>}
            {r.rewardPaidAt && <Descriptions.Item label="实际打款">{new Date(r.rewardPaidAt).toLocaleDateString('zh-CN')}</Descriptions.Item>}
          </Descriptions>
        )}
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

      {/* 返费打款弹窗 */}
      <Modal
        title={`确认返费已打款 — ${rewardModal.resumeName}`}
        open={rewardModal.open}
        onOk={handleRewardSubmit}
        onCancel={() => setRewardModal({ open: false, id: '', action: '', resumeName: '' })}
        okText="确认已打款"
        okButtonProps={{ loading: rewardLoading }}
        cancelText="取消"
      >
        <p>请确认已通过微信转账给推荐人，操作后不可撤销。</p>
        <TextArea placeholder="备注（可选）" rows={3} value={rewardRemark} onChange={e => setRewardRemark(e.target.value)} />
      </Modal>
    </PageContainer>
  );
};

export default ReferralManage;
