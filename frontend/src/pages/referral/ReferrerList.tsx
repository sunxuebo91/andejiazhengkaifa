import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card, Table, Button, Space, Tag, Input, App, Select,
  Modal, Form, Tooltip, Descriptions, Drawer,
} from 'antd';
import { SearchOutlined, EditOutlined, EyeOutlined, PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../../contexts/AuthContext';
import * as referralService from '../../services/referralService';
import type { Referrer } from '../../services/referralService';
import { REFERRER_APPROVAL_MAP as APPROVAL_MAP } from './constants';

const { Option } = Select;
const { TextArea } = Input;

const ReferrerList: React.FC = () => {
  const { message } = App.useApp();
  const { user } = useAuth();

  const [list, setList] = useState<Referrer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  // 详情弹窗
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: Referrer | null }>({ open: false, record: null });

  // 编辑银行/身份证弹窗
  const [editForm] = Form.useForm();
  const [editModal, setEditModal] = useState<{ open: boolean; record: Referrer | null }>({ open: false, record: null });
  const [editLoading, setEditLoading] = useState(false);

  // 创建推荐人 Drawer
  const [createForm] = Form.useForm();
  const [createDrawer, setCreateDrawer] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // 审批操作（合并自推荐人审批页）
  const [rejectModal, setRejectModal] = useState<{ open: boolean; referrerId: string; referrerName: string }>({ open: false, referrerId: '', referrerName: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const fetchList = async (p = 1, s = search, status = filterStatus) => {
    setLoading(true);
    try {
      const res = await referralService.listReferrers({ search: s || undefined, approvalStatus: status, page: p, pageSize: 20 });
      if (res.success && res.data) {
        setList(res.data.list);
        setTotal(res.data.total);
        setPage(p);
      }
    } catch { message.error('获取推荐人列表失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, []);

  const handleSearch = (val: string) => { setSearch(val); fetchList(1, val, filterStatus); };
  const handleStatusChange = (val: string) => { setFilterStatus(val); fetchList(1, search, val); };

  const handleEditSave = async () => {
    if (!editModal.record) return;
    setEditLoading(true);
    try {
      const values = await editForm.validateFields();
      const res = await referralService.updateReferrerInfo(editModal.record._id, values);
      if (res.success) {
        message.success('更新成功');
        setEditModal({ open: false, record: null });
        fetchList(page);
      } else { message.error(res.message || '更新失败'); }
    } catch (e: any) { if (!e.errorFields) message.error(e.response?.data?.message || '更新失败'); }
    finally { setEditLoading(false); }
  };

  const handleCreateSave = async () => {
    setCreateLoading(true);
    try {
      const values = await createForm.validateFields();
      const res = await referralService.adminCreateReferrer(user!.id, values);
      if (res.success) {
        message.success('创建成功');
        setCreateDrawer(false);
        createForm.resetFields();
        fetchList(1);
      } else { message.error(res.message || '创建失败'); }
    } catch (e: any) { if (!e.errorFields) message.error(e.response?.data?.message || '创建失败'); }
    finally { setCreateLoading(false); }
  };

  // 通过审批
  const handleApprove = (referrerId: string, referrerName: string) => {
    Modal.confirm({
      title: `确认通过 "${referrerName}" 的推荐人申请？`,
      content: '通过后，该用户将获得推荐人权限，可开始录入推荐阿姨信息。',
      okText: '确认通过',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await referralService.approveReferrer(user!.id, referrerId);
          if (res.success) { message.success('审批通过'); fetchList(page); }
          else message.error(res.message || '操作失败');
        } catch (e: any) { message.error(e.response?.data?.message || '操作失败'); }
      },
    });
  };

  // 拒绝审批
  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) { message.error('请填写拒绝原因'); return; }
    setRejectLoading(true);
    try {
      const res = await referralService.rejectReferrer(rejectModal.referrerId, rejectReason.trim());
      if (res.success) {
        message.success('已拒绝并通知申请人');
        setRejectModal({ open: false, referrerId: '', referrerName: '' });
        setRejectReason('');
        fetchList(page);
      } else message.error(res.message || '操作失败');
    } catch (e: any) { message.error(e.response?.data?.message || '操作失败'); }
    finally { setRejectLoading(false); }
  };

  const columns: ColumnsType<Referrer> = [
    { title: '姓名', dataIndex: 'name', width: 90, fixed: 'left' },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    {
      title: '身份证号', dataIndex: 'idCard', width: 180,
      render: (v?: string) => v || <span style={{ color: '#bbb' }}>未填写</span>,
    },
    {
      title: '银行卡号', dataIndex: 'bankCardNumber', width: 190,
      render: (v?: string) => v || <span style={{ color: '#bbb' }}>未填写</span>,
    },
    {
      title: '开户行', dataIndex: 'bankName', width: 150,
      render: (v?: string) => v || <span style={{ color: '#bbb' }}>未填写</span>,
    },
    { title: '推荐数量', dataIndex: 'totalReferrals', width: 90, align: 'center' },
    {
      title: '成功上户量', dataIndex: 'onboardedCount', width: 100, align: 'center',
      render: (v?: number) => <span style={{ color: '#52c41a', fontWeight: 600 }}>{v ?? 0}</span>,
    },
    {
      title: '累计返费(元)', dataIndex: 'totalRewardAmount', width: 120, align: 'right',
      render: (v: number) => `¥${(v ?? 0).toFixed(2)}`,
    },
    {
      title: '最近登录', dataIndex: 'lastLoginAt', width: 160,
      render: (v?: string) => v ? new Date(v).toLocaleString('zh-CN') : <span style={{ color: '#bbb' }}>暂无记录</span>,
    },
    {
      title: '审批状态', dataIndex: 'approvalStatus', width: 90,
      render: (v: string) => {
        const item = APPROVAL_MAP[v] || { color: 'default', label: v };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    { title: '注册时间', dataIndex: 'createdAt', width: 160, render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    {
      title: '操作', width: 180, fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="查看详情">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailModal({ open: true, record })} />
          </Tooltip>
          <Tooltip title="编辑收款信息">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditModal({ open: true, record });
                editForm.setFieldsValue({ idCard: record.idCard, bankCardNumber: record.bankCardNumber, bankName: record.bankName });
              }}
            />
          </Tooltip>
          {record.approvalStatus === 'pending_approval' && (
            <>
              <Tooltip title="通过审批">
                <Button type="primary" size="small" icon={<CheckOutlined />}
                  onClick={() => handleApprove(record._id, record.name)} />
              </Tooltip>
              <Tooltip title="拒绝审批">
                <Button danger size="small" icon={<CloseOutlined />}
                  onClick={() => { setRejectModal({ open: true, referrerId: record._id, referrerName: record.name }); setRejectReason(''); }} />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  const r = detailModal.record;

  return (
    <PageContainer
      title="推荐人列表"
      subTitle={`共 ${total} 名推荐人`}
      extra={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setCreateDrawer(true); createForm.resetFields(); }}
        >
          创建推荐人
        </Button>,
      ]}
    >
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索姓名/手机号"
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: 240 }}
            onSearch={handleSearch}
          />
          <Select
            allowClear
            placeholder="审批状态筛选"
            style={{ width: 150 }}
            value={filterStatus}
            onChange={handleStatusChange}
          >
            <Option value="pending_approval">待审批</Option>
            <Option value="approved">已通过</Option>
            <Option value="rejected">已拒绝</Option>
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
          scroll={{ x: 1500 }}
          pagination={{
            total,
            pageSize: 20,
            current: page,
            onChange: (p: number) => fetchList(p),
            showTotal: t => `共 ${t} 条`,
            showSizeChanger: false,
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={`推荐人详情 — ${r?.name ?? ''}`}
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={null}
        width={640}
      >
        {r && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="姓名">{r.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{r.phone}</Descriptions.Item>
            <Descriptions.Item label="微信号">{r.wechatId}</Descriptions.Item>
            <Descriptions.Item label="审批状态">
              <Tag color={APPROVAL_MAP[r.approvalStatus]?.color}>{APPROVAL_MAP[r.approvalStatus]?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="身份证号" span={2}>{r.idCard || '未填写'}</Descriptions.Item>
            <Descriptions.Item label="银行卡号" span={2}>{r.bankCardNumber || '未填写'}</Descriptions.Item>
            <Descriptions.Item label="开户行" span={2}>{r.bankName || '未填写'}</Descriptions.Item>
            <Descriptions.Item label="推荐数量">{r.totalReferrals}</Descriptions.Item>
            <Descriptions.Item label="成功上户量">{r.onboardedCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="累计返费">¥{(r.totalRewardAmount ?? 0).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="最近登录">{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString('zh-CN') : '暂无'}</Descriptions.Item>
            <Descriptions.Item label="注册时间" span={2}>{new Date(r.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
            {r.rejectedReason && <Descriptions.Item label="拒绝原因" span={2} ><span style={{ color: 'red' }}>{r.rejectedReason}</span></Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>

      {/* 编辑银行/身份证弹窗 */}
      <Modal
        title={`编辑「${editModal.record?.name ?? ''}」的收款信息`}
        open={editModal.open}
        onOk={handleEditSave}
        onCancel={() => setEditModal({ open: false, record: null })}
        okText="保存"
        okButtonProps={{ loading: editLoading }}
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="身份证号" name="idCard">
            <Input placeholder="请输入身份证号" maxLength={18} />
          </Form.Item>
          <Form.Item label="银行卡号" name="bankCardNumber">
            <Input placeholder="请输入银行卡号" maxLength={25} />
          </Form.Item>
          <Form.Item label="开户行" name="bankName">
            <Input placeholder="如：中国工商银行北京朝阳支行" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 拒绝审批弹窗 */}
      <Modal
        title={`拒绝 "${rejectModal.referrerName}" 的推荐人申请`}
        open={rejectModal.open}
        onOk={handleRejectSubmit}
        onCancel={() => setRejectModal({ open: false, referrerId: '', referrerName: '' })}
        okText="确认拒绝"
        okButtonProps={{ danger: true, loading: rejectLoading }}
        cancelText="取消"
      >
        <TextArea
          placeholder="请填写拒绝原因（必填），申请人将收到通知"
          rows={4}
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
        />
      </Modal>

      {/* 创建推荐人 Drawer */}
      <Drawer
        title="创建推荐人"
        open={createDrawer}
        onClose={() => { setCreateDrawer(false); createForm.resetFields(); }}
        width={480}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => { setCreateDrawer(false); createForm.resetFields(); }}>取消</Button>
            <Button type="primary" loading={createLoading} onClick={handleCreateSave}>创建</Button>
          </Space>
        }
      >
        <Form form={createForm} layout="vertical" requiredMark>
          <Form.Item
            label="姓名"
            name="name"
            rules={[{ required: true, message: '请输入推荐人姓名' }, { max: 20, message: '姓名不超过20个字符' }]}
          >
            <Input placeholder="请输入真实姓名" />
          </Form.Item>

          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9][0-9]{9}$/, message: '请输入正确的手机号格式' },
            ]}
          >
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>

          <Form.Item
            label="微信号"
            name="wechatId"
          >
            <Input placeholder="请输入微信号（用于接收返费，可留空）" />
          </Form.Item>

          <Form.Item
            label="身份证号"
            name="idCard"
            rules={[{ pattern: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/, message: '请输入正确的身份证号格式' }]}
          >
            <Input placeholder="请输入18位身份证号" maxLength={18} />
          </Form.Item>

          <Form.Item label="银行卡号" name="bankCardNumber">
            <Input placeholder="请输入银行卡号" maxLength={25} />
          </Form.Item>

          <Form.Item label="开户行" name="bankName">
            <Input placeholder="如：中国工商银行北京朝阳支行" />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  );
};

export default ReferrerList;
