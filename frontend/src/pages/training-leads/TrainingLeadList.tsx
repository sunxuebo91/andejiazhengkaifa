import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Table,
  Card,
  Input,
  Button,
  Select,
  Space,
  Tag,
  message,
  Row,
  Col,
  Popconfirm,
  DatePicker,
  Modal,
  Upload,
  Grid,
  List,
  Pagination
} from 'antd';
import type { UploadProps } from 'antd';

const { useBreakpoint } = Grid;
import { SearchOutlined, PlusOutlined, MessageOutlined, EditOutlined, DeleteOutlined, UploadOutlined, InboxOutlined, ShareAltOutlined, QrcodeOutlined, CopyOutlined, UserSwitchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { trainingLeadService } from '../../services/trainingLeadService';
import apiService from '../../services/api';
import {
  TrainingLead,
  TrainingLeadQuery,
  LEAD_STATUS_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  TRAINING_TYPE_OPTIONS
} from '../../types/training-lead.types';
import TrainingLeadFollowUpModal from '../../components/TrainingLeadFollowUpModal';
import AIBulkImportModal from '../../components/AIBulkImportModal';
import { useAuth } from '../../contexts/AuthContext';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TrainingLeadList: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isAdmin = hasPermission('*') || hasPermission('training-lead:all');
  const [leads, setLeads] = useState<TrainingLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // 跟进弹窗状态
  const [followUpModal, setFollowUpModal] = useState({
    visible: false,
    leadId: '',
    leadName: ''
  });

  // AI批量导入状态
  const [aiImportModalVisible, setAiImportModalVisible] = useState(false);

  // 分配功能状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignTargetUser, setAssignTargetUser] = useState<string | undefined>(undefined);
  const [assignLoading, setAssignLoading] = useState(false);

  // 旧版批量导入状态（保留兼容）
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    fail: number;
    errors: string[];
  } | null>(null);

  // 分享链接状态
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareData, setShareData] = useState<{
    shareUrl: string;
    qrCodeUrl: string;
    expireAt: string;
  } | null>(null);

  // 用户列表（用于学员归属筛选）
  const [users, setUsers] = useState<any[]>([]);
  const canViewUsers = hasPermission('user:view');

  // 搜索条件
  const [searchFilters, setSearchFilters] = useState<TrainingLeadQuery & { lastFollowUpResult?: string }>({
    search: '',
    status: undefined,
    leadSource: undefined,
    trainingType: undefined,
    startDate: undefined,
    endDate: undefined,
    isReported: undefined,
    studentOwner: undefined,
    lastFollowUpResult: undefined
  });

  // 加载用户列表
  const fetchUsers = async () => {
    if (!canViewUsers) {
      setUsers([]);
      return;
    }

    try {
      const response = await apiService.get('/api/users', { page: 1, pageSize: 1000 });
      if (response.success && response.data) {
        setUsers(response.data.items || []);
      }
    } catch (error: any) {
      console.error('获取用户列表失败:', error);
    }
  };

  // 加载数据
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await trainingLeadService.getTrainingLeads({
        page: currentPage,
        pageSize,
        ...searchFilters
      });
      setLeads(response.items);
      setTotal(response.total);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '获取培训线索列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    if (canViewUsers) {
      fetchUsers();
    }
  }, [currentPage, pageSize, canViewUsers]);

  // 搜索
  const handleSearch = () => {
    setCurrentPage(1);
    fetchLeads();
  };

  // 重置搜索
  const handleReset = () => {
    setSearchFilters({
      search: '',
      status: undefined,
      leadSource: undefined,
      trainingType: undefined,
      startDate: undefined,
      endDate: undefined,
      isReported: undefined,
      studentOwner: undefined,
      lastFollowUpResult: undefined
    });
    setCurrentPage(1);
    setTimeout(() => fetchLeads(), 0);
  };

  // 删除线索
  const handleDelete = async (id: string) => {
    try {
      await trainingLeadService.deleteTrainingLead(id);
      message.success('删除成功');
      fetchLeads();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '删除失败');
    }
  };

  // 释放线索到公海池
  const handleRelease = async (id: string) => {
    try {
      await trainingLeadService.releaseLead(id);
      message.success('已释放到公海池');
      fetchLeads();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '释放失败');
    }
  };

  // 批量分配
  const handleBatchAssign = async () => {
    if (!assignTargetUser) { message.warning('请选择跟进人'); return; }
    if (selectedRowKeys.length === 0) { message.warning('请先选择线索'); return; }
    setAssignLoading(true);
    try {
      let success = 0;
      for (const id of selectedRowKeys) {
        await trainingLeadService.updateTrainingLead(String(id), {
          assignedTo: assignTargetUser,
          studentOwner: assignTargetUser,
        } as any);
        success++;
      }
      message.success(`成功分配 ${success} 条线索`);
      setAssignModalVisible(false);
      setAssignTargetUser(undefined);
      setSelectedRowKeys([]);
      fetchLeads();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '分配失败');
    } finally {
      setAssignLoading(false);
    }
  };

  // 打开跟进弹窗
  const handleOpenFollowUp = (lead: TrainingLead) => {
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
    fetchLeads();
  };

  // 处理Excel导入
  const handleExcelImport: UploadProps['customRequest'] = async (options) => {
    setImportLoading(true);
    setImportResult(null);

    try {
      const { file } = options;
      const uploadFile = file as File;

      // 验证文件类型
      const isExcel =
        uploadFile.name.endsWith('.xlsx') ||
        uploadFile.name.endsWith('.xls') ||
        uploadFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        uploadFile.type === 'application/vnd.ms-excel';

      if (!isExcel) {
        message.error('只支持Excel文件(.xlsx, .xls)');
        setImportLoading(false);
        return;
      }

      // 准备表单数据
      const formData = new FormData();
      formData.append('file', uploadFile);

      // 发送请求
      const response = await apiService.upload('/api/training-leads/import-excel', formData);

      if (response.success) {
        message.success(response.message || '导入成功');
        setImportResult(response.data);

        // 刷新列表
        fetchLeads();

        // 如果导入全部成功且没有错误，自动关闭弹窗
        if (response.data.success > 0 && response.data.fail === 0) {
          setTimeout(() => {
            setImportModalVisible(false);
          }, 2000);
        }
      } else {
        message.error(response.message || '导入失败');
      }
    } catch (error) {
      console.error('导入Excel失败:', error);
      message.error('导入失败，请检查文件格式或网络连接');
    } finally {
      setImportLoading(false);
    }
  };

  // 下载Excel导入模板
  const downloadExcelTemplate = () => {
    const columns = ['姓名', '手机号', '微信号', '客户分级', '培训类型', '意向课程', '意向程度', '线索来源', '期望开课时间', '预算金额', '所在地区', '备注'];
    const data = [
      ['张三', '13800138000', 'wx123', 'A类', '月嫂', '高级母婴护理师,高级催乳师', '高', '美团', '2026-02-01', '8000', '北京朝阳区', '想尽快开课'],
      ['李四', '', 'wx456', 'B类', '育儿嫂', '高级育婴师', '中', '抖音', '', '6000', '北京海淀区', '']
    ];

    // 创建CSV内容
    let csv = columns.join(',') + '\n';
    data.forEach(row => {
      csv += row.join(',') + '\n';
    });

    // 创建Blob并下载
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '培训线索导入模板.csv');
    link.style.visibility = 'hidden';

    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 关闭导入结果并重置状态
  const handleCloseImport = () => {
    setImportModalVisible(false);
    setImportResult(null);
  };

  // 日期范围变化
  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      setSearchFilters({
        ...searchFilters,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD')
      });
    } else {
      setSearchFilters({
        ...searchFilters,
        startDate: undefined,
        endDate: undefined
      });
    }
  };

  // 生成分享链接
  const handleGenerateShare = async () => {
    setShareLoading(true);
    try {
      const result = await trainingLeadService.generateShareToken();
      setShareData({
        shareUrl: result.shareUrl,
        qrCodeUrl: result.qrCodeUrl,
        expireAt: result.expireAt
      });
      setShareModalVisible(true);
      message.success('分享链接生成成功');
    } catch (error: any) {
      message.error(error?.response?.data?.message || '生成分享链接失败');
    } finally {
      setShareLoading(false);
    }
  };

  // 复制链接
  const handleCopyLink = () => {
    if (shareData?.shareUrl) {
      navigator.clipboard.writeText(shareData.shareUrl);
      message.success('链接已复制到剪贴板');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '学员编号',
      dataIndex: 'studentId',
      key: 'studentId',
      width: 120,
      render: (text: string, record: TrainingLead) => (
        <Link to={`/standalone/training-leads/${record._id}`} target="_blank" rel="noopener noreferrer">{text}</Link>
      )
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (text: string) => text || '-'
    },

    {
      title: '培训类型',
      dataIndex: 'trainingType',
      key: 'trainingType',
      width: 100,
      render: (text: string) => text || '-'
    },
    {
      title: '线索状态',
      dataIndex: 'leadStatus',
      key: 'leadStatus',
      width: 120,
      render: (_: any, record: any) => {
        const { leadStatus, lastFollowUpResult } = record;

        // 统一线索状态颜色
        const statusColorMap: Record<string, string> = {
          '新客未跟进':  '#ff4d4f',
          '流转未跟进':  '#faad14',
          '7天未跟进':   '#fa8c16',
          '15天未跟进':  '#f5222d',
          '跟进中':      '#52c41a',
          '已报名':      '#1677ff',
          '已到店':      '#13c2c2',
          '已结业':      '#722ed1',
          '无效线索':    '#8c8c8c',
          '未跟进':      '#faad14',
        };

        // 最近跟进结果颜色
        const resultColorMap: Record<string, string> = {
          '已接通': '#52c41a', '已回复': '#52c41a', '已到店': '#52c41a', '成功': '#52c41a',
          '未接通': '#ff4d4f', '拒接': '#ff4d4f', '已拉黑': '#ff4d4f', '未到店': '#ff4d4f', '爽约': '#ff4d4f', '失败': '#ff4d4f',
          '关机': '#8c8c8c', '停机': '#8c8c8c', '忙线': '#faad14',
          '未回复': '#faad14', '已读未回': '#faad14',
        };

        const displayStatus = leadStatus || record.status;

        return (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <Tag style={{ margin: 0 }} color={statusColorMap[displayStatus] || '#8c8c8c'}>
              {displayStatus}
            </Tag>
            {/* 最近跟进结果 */}
            {lastFollowUpResult && (
              <Tag style={{ margin: 0 }} color={resultColorMap[lastFollowUpResult] || '#8c8c8c'}>{lastFollowUpResult}</Tag>
            )}
          </div>
        );
      }
    },
    {
      title: '是否报征',
      dataIndex: 'isReported',
      key: 'isReported',
      width: 100,
      render: (isReported: boolean) => (
        <Tag color={isReported ? '#52c41a' : '#8c8c8c'}>
          {isReported ? '是' : '否'}
        </Tag>
      )
    },
    {
      title: '跟进人',
      dataIndex: 'studentOwner',
      key: 'studentOwner',
      width: 100,
      render: (studentOwner: any) => {
        if (!studentOwner) return <span style={{ color: '#bfbfbf' }}>未分配</span>;
        return typeof studentOwner === 'object' ? studentOwner.name : <span style={{ color: '#bfbfbf' }}>未分配</span>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (text: string) => {
        if (!text) return <span style={{ color: '#bfbfbf' }}>-</span>;
        return dayjs(text).format('YYYY-MM-DD HH:mm');
      }
    },

    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: TrainingLead) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<MessageOutlined />}
            onClick={() => handleOpenFollowUp(record)}
          >
            添加跟进
          </Button>
          <Button
            type="link"
            size="small"
            icon={<UserSwitchOutlined />}
            onClick={() => { setSelectedRowKeys([record._id]); setAssignModalVisible(true); }}
          >
            分配
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/training-leads/edit/${record._id}`)}
          >
            编辑
          </Button>
          <Link to={`/standalone/training-leads/${record._id}`} target="_blank" rel="noopener noreferrer">
            <Button type="link" size="small">
              详情
            </Button>
          </Link>
          {(() => {
            // 与后端 releaseLead 逻辑保持一致：assignedTo 优先，无 assignedTo 时用 studentOwner
            const assignedId = record.assignedTo
              ? (typeof record.assignedTo === 'object' ? (record.assignedTo as any)._id : record.assignedTo)
              : null;
            const ownerId = record.studentOwner
              ? (typeof record.studentOwner === 'object' ? (record.studentOwner as any)._id : record.studentOwner)
              : null;
            const currentOwner = assignedId || ownerId;
            const canRelease = isAdmin || currentOwner === user?.id;
            if (!canRelease) return null;
            return (
              <Popconfirm
                title="确定要释放到公海池吗？释放后该线索将对所有人可见"
                onConfirm={() => handleRelease(record._id)}
                okText="确定释放"
                cancelText="取消"
              >
                <Button type="link" size="small" style={{ color: '#faad14' }}>
                  释放
                </Button>
              </Popconfirm>
            );
          })()}
          <Popconfirm
            title="确定要删除这条线索吗？"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: isMobile ? '12px' : '24px' }}>
      <Card bodyStyle={{ padding: isMobile ? 12 : 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 搜索筛选区域 - 第一行 */}
          <Row gutter={[12, 12]}>
            <Col span={6}>
              <Search
                placeholder="搜索姓名、手机号、微信号、学员编号"
                value={searchFilters.search}
                onChange={(e) => setSearchFilters({ ...searchFilters, search: e.target.value })}
                onSearch={handleSearch}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Select placeholder="状态" value={searchFilters.status}
                onChange={(value) => setSearchFilters({ ...searchFilters, status: value })}
                allowClear style={{ width: '100%' }}>
                {LEAD_STATUS_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select placeholder="线索来源" value={searchFilters.leadSource}
                onChange={(value) => setSearchFilters({ ...searchFilters, leadSource: value })}
                allowClear style={{ width: '100%' }}>
                {LEAD_SOURCE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select placeholder="培训类型" value={searchFilters.trainingType}
                onChange={(value) => setSearchFilters({ ...searchFilters, trainingType: value })}
                allowClear style={{ width: '100%' }}>
                {TRAINING_TYPE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Col>
            <Col span={3}>
              <Select placeholder="是否报征" value={searchFilters.isReported}
                onChange={(value) => setSearchFilters({ ...searchFilters, isReported: value })}
                allowClear style={{ width: '100%' }}>
                <Option value={true}>是</Option>
                <Option value={false}>否</Option>
              </Select>
            </Col>
            {canViewUsers && (
              <Col span={3}>
                <Select placeholder="跟进人" value={searchFilters.studentOwner}
                  onChange={(value) => setSearchFilters({ ...searchFilters, studentOwner: value })}
                  allowClear showSearch
                  filterOption={(input, option) =>
                    String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: '100%' }}>
                  <Option key="__unassigned__" value="__unassigned__">未分配</Option>
                  {users.map(user => (
                    <Option key={user._id} value={user._id}>{user.name}</Option>
                  ))}
                </Select>
              </Col>
            )}
          </Row>

          {/* 搜索筛选区域 - 第二行 */}
          <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
            <Col span={4}>
              <Select
                placeholder="最近跟进结果"
                value={(searchFilters as any).lastFollowUpResult}
                onChange={(value) => setSearchFilters({ ...searchFilters, lastFollowUpResult: value } as any)}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="已接通">📞 已接通</Option>
                <Option value="未接通">📵 未接通</Option>
                <Option value="关机">🔇 关机</Option>
                <Option value="停机">🔇 停机</Option>
                <Option value="拒接">🚫 拒接</Option>
                <Option value="忙线">⏳ 忙线</Option>
                <Option value="已回复">💬 已回复</Option>
                <Option value="未回复">💬 未回复</Option>
                <Option value="已读未回">👁 已读未回</Option>
                <Option value="已到店">🏠 已到店</Option>
                <Option value="未到店">🏠 未到店</Option>
                <Option value="爽约">❌ 爽约</Option>
                <Option value="成功">✅ 成功</Option>
                <Option value="失败">❌ 失败</Option>
              </Select>
            </Col>
            <Col span={7}>
              <RangePicker
                placeholder={['创建开始日期', '创建结束日期']}
                onChange={handleDateRangeChange}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={13} style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={handleReset}>重置</Button>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
                <Button icon={<ShareAltOutlined />} onClick={handleGenerateShare} loading={shareLoading}>
                  生成分享链接
                </Button>
                {selectedRowKeys.length > 0 && (
                  <Button icon={<UserSwitchOutlined />} onClick={() => setAssignModalVisible(true)} type="primary" ghost>
                    批量分配 ({selectedRowKeys.length})
                  </Button>
                )}
                <Button icon={<UploadOutlined />} onClick={() => setAiImportModalVisible(true)}>AI批量导入</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/training-leads/create')}>
                  新建线索
                </Button>
              </Space>
            </Col>
          </Row>

          {/* 表格 */}
          <Table
            columns={columns}
            dataSource={leads}
            rowKey="_id"
            loading={loading}
            scroll={{ x: 1500 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              }
            }}
          />
        </Space>
      </Card>

      {/* 跟进记录弹窗 */}
      <TrainingLeadFollowUpModal
        visible={followUpModal.visible}
        leadId={followUpModal.leadId}
        leadName={followUpModal.leadName}
        onCancel={handleCloseFollowUp}
        onSuccess={handleFollowUpSuccess}
      />

      {/* AI批量导入弹窗 */}
      <AIBulkImportModal
        open={aiImportModalVisible}
        onCancel={() => setAiImportModalVisible(false)}
        onSuccess={() => { fetchLeads(); }}
      />

      {/* 分配跟进人弹窗 */}
      <Modal
        title={`分配跟进人（${selectedRowKeys.length} 条线索）`}
        open={assignModalVisible}
        onCancel={() => { setAssignModalVisible(false); setAssignTargetUser(undefined); }}
        onOk={handleBatchAssign}
        confirmLoading={assignLoading}
        okText="确认分配"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <span>选择跟进人：</span>
        </div>
        <Select
          placeholder="请选择跟进人"
          value={assignTargetUser}
          onChange={setAssignTargetUser}
          style={{ width: '100%' }}
          showSearch
          filterOption={(input, option) =>
            String(option?.children || '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {users.map(user => (
            <Option key={user._id} value={user._id}>{user.name}</Option>
          ))}
        </Select>
      </Modal>

      {/* 旧版Excel导入弹窗（保留兼容） */}
      <Modal
        title="批量导入培训线索"
        open={importModalVisible}
        onCancel={handleCloseImport}
        footer={[
          <Button key="download" onClick={downloadExcelTemplate}>
            下载模板
          </Button>,
          <Button key="cancel" onClick={handleCloseImport}>
            关闭
          </Button>,
        ]}
        destroyOnClose
      >
        {!importResult ? (
          <div>
            <p>请上传Excel文件，文件第一行必须包含以下列：姓名</p>
            <p>手机号和微信号至少填写一个</p>
            <p>其他可选列：客户分级、培训类型、意向课程（多个课程用逗号分隔）、意向程度、线索来源、期望开课时间、预算金额、所在地区、备注</p>
            <p><a onClick={downloadExcelTemplate} style={{ color: '#1890ff', cursor: 'pointer' }}>点击下载模板</a></p>

            <Upload.Dragger
              name="file"
              multiple={false}
              showUploadList={false}
              customRequest={handleExcelImport}
              disabled={importLoading}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 .xlsx, .xls 格式
              </p>
            </Upload.Dragger>
          </div>
        ) : (
          <div>
            <h3>导入结果</h3>
            <p>成功导入: <span style={{ color: 'green', fontWeight: 'bold' }}>{importResult.success}</span> 条</p>
            <p>导入失败: <span style={{ color: 'red', fontWeight: 'bold' }}>{importResult.fail}</span> 条</p>

            {importResult.errors.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>错误信息:</h4>
                <ul style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {importResult.errors.map((error, index) => (
                    <li key={index} style={{ color: 'red' }}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Button onClick={() => setImportResult(null)} style={{ marginRight: 8 }}>
                再次上传
              </Button>
              <Button type="primary" onClick={() => fetchLeads()}>
                刷新列表
              </Button>
            </div>
          </div>
        )}

        {importLoading && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <p>正在导入，请稍候...</p>
          </div>
        )}
      </Modal>

      {/* 分享链接弹窗 */}
      <Modal
        title="分享链接和二维码"
        open={shareModalVisible}
        onCancel={() => setShareModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setShareModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {shareData && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 24 }}>
              <h3>扫描二维码或复制链接分享</h3>
              <p style={{ color: '#999', fontSize: 12 }}>
                有效期至：{dayjs(shareData.expireAt).format('YYYY-MM-DD HH:mm:ss')}
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <img
                src={shareData.qrCodeUrl}
                alt="二维码"
                style={{ width: 300, height: 300, border: '1px solid #d9d9d9', borderRadius: 8 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Input.TextArea
                value={shareData.shareUrl}
                readOnly
                rows={3}
                style={{ marginBottom: 8 }}
              />
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={handleCopyLink}
                block
              >
                复制链接
              </Button>
            </div>

            <div style={{ color: '#999', fontSize: 12, textAlign: 'left' }}>
              <p>💡 使用说明：</p>
              <ul style={{ paddingLeft: 20 }}>
                <li>将链接或二维码分享给阿姨</li>
                <li>阿姨通过您的链接提交的培训线索将自动归属于您</li>
                <li>您可以在列表的"学员归属"列查看归属信息</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TrainingLeadList;
