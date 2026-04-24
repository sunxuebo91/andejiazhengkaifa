import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  App, Button, Card, Drawer, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Upload,
  Descriptions, Image as AntImage,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { PlusOutlined, SearchOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { ImageService } from '../../services/imageService';
import {
  listBlacklist,
  getBlacklistDetail,
  createBlacklist,
  updateBlacklist,
  releaseBlacklist,
  BLACKLIST_REASON_TYPE_LABELS,
  BLACKLIST_SOURCE_TYPE_LABELS,
  BLACKLIST_STATUS_LABELS,
  type AuntBlacklist,
  type BlacklistReasonType,
  type BlacklistStatus,
  type BlacklistEvidence,
} from '../../services/auntBlacklistService';

const { Option } = Select;
const { TextArea } = Input;

const REASON_TYPE_COLORS: Record<BlacklistReasonType, string> = {
  fraud: 'red',
  serious_complaint: 'volcano',
  work_quality: 'orange',
  contract_breach: 'magenta',
  other: 'default',
};

// —— 新建 Modal ——
function renderCreateModal(p: {
  createOpen: boolean; setCreateOpen: (v: boolean) => void;
  createForm: any; createLoading: boolean;
  createEvidence: BlacklistEvidence[]; setCreateEvidence: (v: BlacklistEvidence[]) => void;
  handleEvidenceUpload: UploadProps['customRequest'];
  handleCreate: () => void;
}) {
  const fileList: UploadFile[] = p.createEvidence.map((ev, idx) => ({
    uid: `${idx}-${ev.url}`, name: ev.filename || `证据${idx + 1}`, status: 'done', url: ev.url,
  }));
  return (
    <Modal
      title="加入黑名单"
      open={p.createOpen}
      onOk={p.handleCreate}
      onCancel={() => { p.setCreateOpen(false); p.createForm.resetFields(); p.setCreateEvidence([]); }}
      confirmLoading={p.createLoading}
      width={640}
      destroyOnClose
    >
      <Form form={p.createForm} layout="vertical" preserve={false}>
        <Form.Item name="name" label="阿姨姓名" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="请输入阿姨姓名" maxLength={20} />
        </Form.Item>
        <Form.Item name="phone" label="手机号（phone / idCard 至少填一个）">
          <Input placeholder="请输入手机号" maxLength={11} />
        </Form.Item>
        <Form.Item name="idCard" label="身份证号">
          <Input placeholder="请输入身份证号" maxLength={18} />
        </Form.Item>
        <Form.Item name="reasonType" label="原因类型" rules={[{ required: true, message: '请选择原因类型' }]}>
          <Select placeholder="请选择原因类型">
            {Object.entries(BLACKLIST_REASON_TYPE_LABELS).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="reason" label="拉黑原因说明" rules={[{ required: true, message: '请填写拉黑原因', min: 2 }]}>
          <TextArea rows={3} maxLength={500} showCount placeholder="请详细描述拉黑原因" />
        </Form.Item>
        <Form.Item label="证据材料（可选，最多 10 张）">
          <Upload
            accept="image/*"
            listType="picture"
            customRequest={p.handleEvidenceUpload}
            fileList={fileList}
            onRemove={(f) => { p.setCreateEvidence(p.createEvidence.filter(ev => ev.url !== f.url)); }}
            maxCount={10}
          >
            <Button icon={<UploadOutlined />}>上传证据</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="remarks" label="备注">
          <TextArea rows={2} maxLength={200} placeholder="内部备注，选填" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// —— 编辑 Modal ——
function renderEditModal(p: {
  editModal: { open: boolean; record: AuntBlacklist | null };
  setEditModal: (v: { open: boolean; record: AuntBlacklist | null }) => void;
  editForm: any; editLoading: boolean; handleEdit: () => void;
}) {
  return (
    <Modal
      title="编辑黑名单"
      open={p.editModal.open}
      onOk={p.handleEdit}
      onCancel={() => p.setEditModal({ open: false, record: null })}
      confirmLoading={p.editLoading}
      width={560}
      destroyOnClose
    >
      <Form form={p.editForm} layout="vertical" preserve={false}>
        <Form.Item name="reasonType" label="原因类型" rules={[{ required: true }]}>
          <Select>
            {Object.entries(BLACKLIST_REASON_TYPE_LABELS).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="reason" label="拉黑原因说明" rules={[{ required: true, min: 2 }]}>
          <TextArea rows={3} maxLength={500} showCount />
        </Form.Item>
        <Form.Item name="remarks" label="备注">
          <TextArea rows={2} maxLength={200} />
        </Form.Item>
        <div style={{ color: '#999', fontSize: 12 }}>注：手机号 / 身份证号不可修改，如需调整请先释放后重建。</div>
      </Form>
    </Modal>
  );
}

// —— 释放 Modal ——
function renderReleaseModal(p: {
  releaseModal: { open: boolean; record: AuntBlacklist | null };
  setReleaseModal: (v: { open: boolean; record: AuntBlacklist | null }) => void;
  releaseForm: any; releaseLoading: boolean; handleRelease: () => void;
}) {
  return (
    <Modal
      title={`释放黑名单${p.releaseModal.record ? ` - ${p.releaseModal.record.name}` : ''}`}
      open={p.releaseModal.open}
      onOk={p.handleRelease}
      onCancel={() => { p.setReleaseModal({ open: false, record: null }); p.releaseForm.resetFields(); }}
      confirmLoading={p.releaseLoading}
      okText="确认释放"
      okButtonProps={{ danger: true }}
      destroyOnClose
    >
      <Form form={p.releaseForm} layout="vertical" preserve={false}>
        <Form.Item name="releaseReason" label="释放原因" rules={[{ required: true, min: 2, message: '请填写释放原因' }]}>
          <TextArea rows={3} maxLength={300} showCount placeholder="释放后该阿姨即可重新发起合同/录入简历，请谨慎操作" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// —— 详情 Drawer ——
function renderDetailDrawer(p: {
  detailDrawer: { open: boolean; record: AuntBlacklist | null };
  setDetailDrawer: (v: { open: boolean; record: AuntBlacklist | null }) => void;
  canRelease: boolean;
  setReleaseModal: (v: { open: boolean; record: AuntBlacklist | null }) => void;
}) {
  const r = p.detailDrawer.record;
  return (
    <Drawer
      title="黑名单详情"
      open={p.detailDrawer.open}
      onClose={() => p.setDetailDrawer({ open: false, record: null })}
      width={640}
      extra={p.canRelease && r?.status === 'active' && (
        <Button danger onClick={() => { p.setReleaseModal({ open: true, record: r }); }}>释放</Button>
      )}
    >
      {r && (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="姓名">{r.name}</Descriptions.Item>
          <Descriptions.Item label="手机号">{r.phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="身份证号">{r.idCard || '—'}</Descriptions.Item>
          <Descriptions.Item label="原因类型"><Tag color={REASON_TYPE_COLORS[r.reasonType]}>{BLACKLIST_REASON_TYPE_LABELS[r.reasonType]}</Tag></Descriptions.Item>
          <Descriptions.Item label="拉黑原因">{r.reason}</Descriptions.Item>
          <Descriptions.Item label="来源">{BLACKLIST_SOURCE_TYPE_LABELS[r.sourceType]}</Descriptions.Item>
          <Descriptions.Item label="证据材料">
            {r.evidence && r.evidence.length > 0 ? (
              <Space wrap>
                {r.evidence.map((ev, idx) => (
                  ev.mimetype?.startsWith('image/')
                    ? <AntImage key={idx} src={ev.url} width={80} height={80} style={{ objectFit: 'cover' }} />
                    : <a key={idx} href={ev.url} target="_blank" rel="noreferrer">{ev.filename || `证据${idx + 1}`}</a>
                ))}
              </Space>
            ) : '无'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {r.status === 'active' ? <Tag color="red">{BLACKLIST_STATUS_LABELS.active}</Tag> : <Tag>{BLACKLIST_STATUS_LABELS.released}</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="操作人">{r.operatorName || r.operatorId}</Descriptions.Item>
          <Descriptions.Item label="加入时间">{r.createdAt ? dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : '—'}</Descriptions.Item>
          {r.status === 'released' && (
            <>
              <Descriptions.Item label="释放人">{r.releasedByName || r.releasedBy || '—'}</Descriptions.Item>
              <Descriptions.Item label="释放时间">{r.releasedAt ? dayjs(r.releasedAt).format('YYYY-MM-DD HH:mm:ss') : '—'}</Descriptions.Item>
              <Descriptions.Item label="释放原因">{r.releaseReason || '—'}</Descriptions.Item>
            </>
          )}
          {r.remarks && <Descriptions.Item label="备注">{r.remarks}</Descriptions.Item>}
        </Descriptions>
      )}
    </Drawer>
  );
}

const BlacklistList: React.FC = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const canCreate = hasPermission('blacklist:create');
  const canEdit = hasPermission('blacklist:edit');
  const canRelease = hasRole('admin');

  const [list, setList] = useState<AuntBlacklist[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BlacklistStatus | undefined>();

  // 详情 Drawer
  const [detailDrawer, setDetailDrawer] = useState<{ open: boolean; record: AuntBlacklist | null }>({ open: false, record: null });

  // 新建 Modal
  const [createForm] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createEvidence, setCreateEvidence] = useState<BlacklistEvidence[]>([]);

  // 编辑 Modal
  const [editForm] = Form.useForm();
  const [editModal, setEditModal] = useState<{ open: boolean; record: AuntBlacklist | null }>({ open: false, record: null });
  const [editLoading, setEditLoading] = useState(false);

  // 释放 Modal
  const [releaseForm] = Form.useForm();
  const [releaseModal, setReleaseModal] = useState<{ open: boolean; record: AuntBlacklist | null }>({ open: false, record: null });
  const [releaseLoading, setReleaseLoading] = useState(false);

  const fetchList = async (p = 1, kw = keyword, status = statusFilter) => {
    setLoading(true);
    try {
      const res = await listBlacklist({ keyword: kw || undefined, status, page: p, pageSize });
      if (res.success && res.data) {
        setList(res.data.items);
        setTotal(res.data.total);
        setPage(p);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || '获取黑名单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // —— 脱敏展示 ——
  const maskPhone = (p?: string) => p ? p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '—';
  const maskIdCard = (n?: string) => n ? (n.length >= 10 ? `${n.slice(0, 6)}********${n.slice(-4)}` : n) : '—';

  // —— 证据上传 ——
  const handleEvidenceUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options as any;
    try {
      const url = await ImageService.uploadImage(file as File);
      const ev: BlacklistEvidence = { url, filename: (file as File).name, size: (file as File).size, mimetype: (file as File).type };
      setCreateEvidence(prev => [...prev, ev]);
      onSuccess?.(ev);
    } catch (err: any) {
      message.error(err?.message || '证据上传失败');
      onError?.(err);
    }
  };

  const openDetail = async (record: AuntBlacklist) => {
    try {
      const res = await getBlacklistDetail(record._id);
      if (res.success && res.data) setDetailDrawer({ open: true, record: res.data });
    } catch {
      setDetailDrawer({ open: true, record });
    }
  };

  const handleCreate = async () => {
    setCreateLoading(true);
    try {
      const values = await createForm.validateFields();
      if (!values.phone && !values.idCard) {
        message.error('手机号和身份证号至少填写一个');
        setCreateLoading(false);
        return;
      }
      const res = await createBlacklist({ ...values, evidence: createEvidence, sourceType: 'manual' });
      if (res.success) {
        message.success('已加入黑名单');
        setCreateOpen(false);
        createForm.resetFields();
        setCreateEvidence([]);
        fetchList(1, keyword, statusFilter);
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || '加入黑名单失败');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editModal.record) return;
    setEditLoading(true);
    try {
      const values = await editForm.validateFields();
      const res = await updateBlacklist(editModal.record._id, values);
      if (res.success) {
        message.success('更新成功');
        setEditModal({ open: false, record: null });
        fetchList(page, keyword, statusFilter);
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || '更新失败');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!releaseModal.record) return;
    setReleaseLoading(true);
    try {
      const values = await releaseForm.validateFields();
      const res = await releaseBlacklist(releaseModal.record._id, values);
      if (res.success) {
        message.success('已释放');
        setReleaseModal({ open: false, record: null });
        releaseForm.resetFields();
        fetchList(page, keyword, statusFilter);
        setDetailDrawer({ open: false, record: null });
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || '释放失败');
    } finally {
      setReleaseLoading(false);
    }
  };

  const columns: ColumnsType<AuntBlacklist> = [
    { title: '姓名', dataIndex: 'name', width: 110, fixed: 'left' },
    { title: '手机号', dataIndex: 'phone', width: 140, render: maskPhone },
    { title: '身份证号', dataIndex: 'idCard', width: 180, render: maskIdCard },
    {
      title: '原因类型', dataIndex: 'reasonType', width: 120,
      render: (v: BlacklistReasonType) => <Tag color={REASON_TYPE_COLORS[v]}>{BLACKLIST_REASON_TYPE_LABELS[v]}</Tag>,
    },
    {
      title: '拉黑原因', dataIndex: 'reason', ellipsis: true,
      render: (v: string) => <Tooltip title={v}><span>{v}</span></Tooltip>,
    },
    { title: '来源', dataIndex: 'sourceType', width: 100, render: (v) => BLACKLIST_SOURCE_TYPE_LABELS[v as keyof typeof BLACKLIST_SOURCE_TYPE_LABELS] || v },
    { title: '操作人', dataIndex: 'operatorName', width: 110, render: (v, r) => v || r.operatorId },
    { title: '加入时间', dataIndex: 'createdAt', width: 170, render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: BlacklistStatus) => v === 'active'
        ? <Tag color="red">{BLACKLIST_STATUS_LABELS[v]}</Tag>
        : <Tag>{BLACKLIST_STATUS_LABELS[v]}</Tag>,
    },
    {
      title: '操作', key: 'ops', width: 220, fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openDetail(record)}>详情</Button>
          {canEdit && record.status === 'active' && (
            <Button type="link" size="small" onClick={() => {
              editForm.setFieldsValue({
                reason: record.reason, reasonType: record.reasonType, remarks: record.remarks,
              });
              setEditModal({ open: true, record });
            }}>编辑</Button>
          )}
          {canRelease && record.status === 'active' && (
            <Button type="link" size="small" danger onClick={() => setReleaseModal({ open: true, record })}>释放</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="阿姨黑名单">
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索姓名/手机号/身份证号"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 260 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => fetchList(1, keyword, statusFilter)}
          />
          <Select
            placeholder="状态"
            style={{ width: 140 }}
            allowClear
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); fetchList(1, keyword, v); }}
          >
            <Option value="active">生效中</Option>
            <Option value="released">已释放</Option>
          </Select>
          <Button icon={<SearchOutlined />} onClick={() => fetchList(1, keyword, statusFilter)}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setStatusFilter(undefined); fetchList(1, '', undefined); }}>重置</Button>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>加入黑名单</Button>
          )}
        </Space>

        <Table
          rowKey="_id"
          loading={loading}
          dataSource={list}
          columns={columns}
          scroll={{ x: 1400 }}
          pagination={{
            current: page, pageSize, total,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => fetchList(p, keyword, statusFilter),
          }}
        />
      </Card>

      {renderCreateModal({ createOpen, setCreateOpen, createForm, createLoading, createEvidence, setCreateEvidence, handleEvidenceUpload, handleCreate })}
      {renderEditModal({ editModal, setEditModal, editForm, editLoading, handleEdit })}
      {renderReleaseModal({ releaseModal, setReleaseModal, releaseForm, releaseLoading, handleRelease })}
      {renderDetailDrawer({ detailDrawer, setDetailDrawer, canRelease, setReleaseModal })}
    </PageContainer>
  );
};

export default BlacklistList;
