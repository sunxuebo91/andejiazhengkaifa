import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, message,
  Steps, Spin, Typography, Empty, Select, Card, Row, Col,
} from 'antd';
import { SearchOutlined, DownloadOutlined, StopOutlined, PlusOutlined, CheckCircleOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

// 背调套餐配置
const BG_PACKAGE_OPTIONS = [
  { value: '1', label: '基础查询（身份核实+社会不良信息+涉诉记录）', price: '¥18' },
  { value: '2', label: '高级查询（基础+金融风险+失信被执行+限高名单）', price: '¥28' },
];
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { backgroundCheckService } from '../../services/backgroundCheckService';
import apiService from '../../services/api';
import { BackgroundCheck, BG_STATUS_MAP, CreateReportData } from '../../types/background-check.types';
import { JOB_TYPE_MAP } from '../../types/resume';

const { Text } = Typography;

// 简历数据接口
interface ResumeItem {
  _id: string;
  name: string;
  phone: string;
  idNumber?: string;
  jobType?: string;
  age?: number;
  gender?: string;
}

export default function BackgroundCheckPage() {
  // 列表状态
  const [records, setRecords] = useState<BackgroundCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(0);

  // 搜索状态
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<{ keyword?: string }>({});

  // 第一步：搜索简历
  const [resumeSearch, setResumeSearch] = useState('');
  const [resumeList, setResumeList] = useState<ResumeItem[]>([]);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [selectedResume, setSelectedResume] = useState<ResumeItem | null>(null);
  const [preparingAuth, setPreparingAuth] = useState(false);
  const [authReady, setAuthReady] = useState<{ stuffId: string; imageUrl: string; esignContractNo?: string } | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>('1'); // 默认选择第一个套餐

  // 第二步：候选人表单
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // ── 列表加载 ────────────────────────────────────────────────
  const fetchRecords = useCallback(async (page = 1, pageSize = 10, search?: { keyword?: string }) => {
    setLoading(true);
    try {
      const result = await backgroundCheckService.getReports({
        page,
        limit: pageSize,
        keyword: search?.keyword || searchParams.keyword,
      });
      setRecords(result.data || []);
      setPagination({ current: page, pageSize, total: result.total || 0 });
    } catch {
      message.error('加载背调列表失败');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── 搜索处理 ────────────────────────────────────────────────
  const handleSearch = (values: { keyword?: string }) => {
    const newParams = { keyword: values.keyword?.trim() };
    setSearchParams(newParams);
    fetchRecords(1, pagination.pageSize, newParams);
  };

  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams({});
    fetchRecords(1, pagination.pageSize, {});
  };

  // ── 取消背调 ─────────────────────────────────────────────────
  const handleCancel = (record: BackgroundCheck) => {
    Modal.confirm({
      title: '确认取消背调',
      content: `确定要取消 ${record.name} 的背调吗？`,
      okText: '确认取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await backgroundCheckService.cancelReport(record._id);
          message.success('已取消背调');
          fetchRecords(pagination.current, pagination.pageSize);
        } catch (e: any) {
          message.error(e?.message || '取消失败');
        }
      },
    });
  };

  // ── 下载报告 ─────────────────────────────────────────────────
  const handleDownload = async (record: BackgroundCheck) => {
    if (!record.reportId) return;
    try {
      const blob = await backgroundCheckService.downloadReport(record.reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `背调报告_${record.name}_${record.reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('下载报告失败（测试环境可能不支持下载，请联系芝麻背调确认）');
    }
  };

  // ── 查看报告（在新窗口打开PDF）─────────────────────────────────
  const handleViewReport = async (record: BackgroundCheck) => {
    if (!record.reportId) return;
    try {
      message.loading({ content: '正在加载报告...', key: 'viewReport' });
      const blob = await backgroundCheckService.downloadReport(record.reportId);
      const url = URL.createObjectURL(blob);
      // 在新窗口打开PDF
      window.open(url, '_blank');
      message.destroy('viewReport');
    } catch {
      message.error({ content: '加载报告失败', key: 'viewReport' });
    }
  };

  // ── Modal 打开 / 关闭 ─────────────────────────────────────────
  const openModal = () => {
    setStep(0);
    setResumeSearch('');
    setResumeList([]);
    setSelectedResume(null);
    setAuthReady(null);
    setSelectedPackage('1'); // 重置为默认套餐
    form.resetFields();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  // ── 第一步：搜索简历 ──────────────────────────────────────────
  const searchResumes = async () => {
    if (!resumeSearch.trim()) return;
    setResumeLoading(true);
    try {
      const result = await apiService.get('/api/resumes', {
        keyword: resumeSearch.trim(),
        page: 1,
        pageSize: 20,
      });
      const resumes = result.data?.items || [];
      setResumeList(resumes);
      if (resumes.length === 0) message.info('未找到简历，请确认搜索内容');
    } catch {
      message.error('搜索简历失败');
    } finally {
      setResumeLoading(false);
    }
  };

  const selectResume = async (resume: ResumeItem) => {
    if (!resume.name) {
      message.error('简历缺少姓名信息');
      return;
    }
    setSelectedResume(resume);
    setPreparingAuth(true);
    setAuthReady(null);
    try {
      // 使用姓名生成授权书（使用本地隐私协议文件）
      const result = await backgroundCheckService.prepareAuth(resume.name);
      setAuthReady(result);
      // 自动填充候选人信息
      form.setFieldsValue({
        name: resume.name || '',
        mobile: resume.phone || '',
        idNo: resume.idNumber || '',
        position: resume.jobType ? (JOB_TYPE_MAP[resume.jobType as keyof typeof JOB_TYPE_MAP] || resume.jobType) : '',
      });
      message.success('授权书准备完成，请填写候选人信息');
    } catch (e: any) {
      message.error(e?.message || '授权书准备失败，请重试');
      setSelectedResume(null);
    } finally {
      setPreparingAuth(false);
    }
  };

  const goToStep2 = () => {
    if (!authReady) { message.warning('请先选择简历并等待授权书准备完成'); return; }
    setStep(1);
  };

  // ── 第二步：发起背调 ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!authReady) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const data: CreateReportData = {
        stuffId: authReady.stuffId,
        imageUrl: authReady.imageUrl,
        esignContractNo: authReady.esignContractNo || `RESUME_${selectedResume?._id || Date.now()}`,
        name: values.name,
        mobile: values.mobile,
        idNo: values.idNo || undefined,
        position: values.position || undefined,
        packageType: selectedPackage, // 套餐类型
      };
      await backgroundCheckService.createReport(data);
      message.success('背调发起成功');
      closeModal();
      fetchRecords(1, pagination.pageSize);
    } catch (e: any) {
      if (e?.errorFields) return; // 表单校验错误，不提示
      message.error(e?.message || '发起背调失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 表格列定义 ────────────────────────────────────────────────
  const columns: ColumnsType<BackgroundCheck> = [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'mobile',
      width: 130,
    },
    {
      title: '身份证号',
      dataIndex: 'idNo',
      width: 150,
      render: (v) => v ? `${v.slice(0, 6)}****${v.slice(-4)}` : '-',
    },
    {
      title: '关联合同',
      dataIndex: 'contractId',
      width: 180,
      render: (contractId) => {
        if (!contractId || typeof contractId === 'string') return '-';
        return (
          <div>
            <div style={{ fontSize: 12 }}>
              <Text copyable={{ text: contractId.contractNumber }}>
                {contractId.contractNumber}
              </Text>
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {contractId.workerName}
            </div>
          </div>
        );
      },
    },
    {
      title: '职位',
      dataIndex: 'position',
      width: 100,
      render: (v) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: number) => {
        const s = BG_STATUS_MAP[status] || { text: `状态${status}`, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '背调结果',
      dataIndex: 'reportResult',
      width: 110,
      render: (reportResult: BackgroundCheck['reportResult'], record: BackgroundCheck) => {
        if (![4, 16].includes(record.status)) return <Tag color="default">-</Tag>;
        if (!reportResult?.riskLevel) return <Tag color="processing">待获取</Tag>;
        const level = reportResult.riskLevel;
        const colorMap: Record<string, string> = {
          '无风险': 'success',
          '一般风险': 'warning',
          '关注': 'warning',
          '风险': 'error',
        };
        return <Tag color={colorMap[level] || 'default'}>{level}</Tag>;
      },
    },
    {
      title: '发起时间',
      dataIndex: 'createdAt',
      width: 140,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/background-check/${record._id}`)}
          >
            详情
          </Button>
          {[4, 16].includes(record.status) && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewReport(record)}
              >
                查看报告
              </Button>
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record)}
              >
                下载报告
              </Button>
            </>
          )}
          {[1, 9].includes(record.status) && (
            <Button
              type="link"
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => handleCancel(record)}
            >
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // ── 简历选择表格 ───────────────────────────────────────────────
  const resumeColumns: ColumnsType<ResumeItem> = [
    { title: '姓名', dataIndex: 'name', width: 90 },
    { title: '手机号', dataIndex: 'phone', width: 120 },
    { title: '身份证号', dataIndex: 'idNumber', width: 160, render: (v) => v || '-' },
    { title: '工种', dataIndex: 'jobType', width: 100, render: (v) => (v ? JOB_TYPE_MAP[v as keyof typeof JOB_TYPE_MAP] || v : '-') },
    { title: '年龄', dataIndex: 'age', width: 60, render: (v) => v || '-' },
    {
      title: '操作',
      width: 90,
      render: (_, record) => {
        const isSelected = selectedResume?._id === record._id;
        return (
          <Button
            size="small"
            type={isSelected && authReady ? 'primary' : 'default'}
            icon={isSelected && authReady ? <CheckCircleOutlined /> : undefined}
            loading={isSelected && preparingAuth}
            onClick={() => !isSelected && selectResume(record)}
            disabled={isSelected && !!authReady}
          >
            {isSelected && authReady ? '已选择' : '选择'}
          </Button>
        );
      },
    },
  ];

  // ── 渲染 ──────────────────────────────────────────────────────
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>背调管理</span>
        <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
          发起背调
        </Button>
      </div>

      {/* 搜索表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} onFinish={handleSearch} layout="inline">
          <Row gutter={16} style={{ width: '100%' }}>
            <Col>
              <Form.Item name="keyword" style={{ marginBottom: 0 }}>
                <Input
                  placeholder="搜索姓名/手机号/身份证号"
                  prefix={<SearchOutlined />}
                  allowClear
                  style={{ width: 240 }}
                  onPressEnter={() => searchForm.submit()}
                />
              </Form.Item>
            </Col>
            <Col>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                  搜索
                </Button>
                <Button onClick={handleReset} icon={<ReloadOutlined />}>
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={records}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, size) => fetchRecords(page, size, searchParams),
        }}
      />

      {/* 发起背调 Modal */}
      <Modal
        title="发起背调"
        open={modalOpen}
        onCancel={closeModal}
        width={700}
        footer={null}
        destroyOnClose
      >
        <Steps
          current={step}
          items={[{ title: '选择简历' }, { title: '填写候选人信息' }]}
          style={{ marginBottom: 24 }}
        />

        {/* 第一步 */}
        {step === 0 && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Input
                placeholder="输入姓名/手机号搜索简历"
                value={resumeSearch}
                onChange={(e) => setResumeSearch(e.target.value)}
                onPressEnter={searchResumes}
                allowClear
                style={{ flex: 1 }}
              />
              <Button
                icon={<SearchOutlined />}
                onClick={searchResumes}
                loading={resumeLoading}
              >
                搜索
              </Button>
            </div>

            {preparingAuth && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin tip="正在准备授权书，请稍候…" />
              </div>
            )}

            {!preparingAuth && resumeList.length === 0 && !resumeLoading && (
              <Empty description="搜索简历以发起背调" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}

            {!preparingAuth && resumeList.length > 0 && (
              <Table
                rowKey="_id"
                size="small"
                columns={resumeColumns}
                dataSource={resumeList}
                pagination={false}
                scroll={{ y: 240 }}
              />
            )}

            {authReady && selectedResume && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: 6,
                }}
              >
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                <Text>
                  已选择简历：<Text strong>{selectedResume.name}</Text>
                  （手机：{selectedResume.phone}），授权书上传成功
                </Text>
              </div>
            )}

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Space>
                <Button onClick={closeModal}>取消</Button>
                <Button type="primary" onClick={goToStep2} disabled={!authReady}>
                  下一步
                </Button>
              </Space>
            </div>
          </div>
        )}

        {/* 第二步 */}
        {step === 1 && (
          <div>
            <Form form={form} layout="vertical">
              {/* 套餐选择 */}
              <Form.Item label="背调套餐" required>
                <Select
                  value={selectedPackage}
                  onChange={setSelectedPackage}
                  style={{ width: '100%' }}
                >
                  {BG_PACKAGE_OPTIONS.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{opt.label}</span>
                        <span style={{ color: '#f5222d', fontWeight: 600, marginLeft: 8 }}>{opt.price}</span>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: '请输入候选人姓名' }]}
              >
                <Input placeholder="候选人姓名" />
              </Form.Item>
              <Form.Item
                label="手机号"
                name="mobile"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
                ]}
              >
                <Input placeholder="候选人手机号" />
              </Form.Item>
              <Form.Item label="身份证号" name="idNo">
                <Input placeholder="选填" />
              </Form.Item>
              <Form.Item label="职位" name="position">
                <Input placeholder="如：住家保姆（选填）" />
              </Form.Item>
            </Form>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setStep(0)}>上一步</Button>
                <Button type="primary" loading={submitting} onClick={handleSubmit}>
                  确认发起
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>

      {/* 详情弹窗已迁移为独立页面 /background-check/:id */}
    </div>
  );
}
