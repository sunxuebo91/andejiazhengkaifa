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
  Upload
} from 'antd';
import type { UploadProps } from 'antd';
import { SearchOutlined, PlusOutlined, MessageOutlined, EditOutlined, DeleteOutlined, UploadOutlined, InboxOutlined, ShareAltOutlined, QrcodeOutlined, CopyOutlined } from '@ant-design/icons';
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

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TrainingLeadList: React.FC = () => {
  const navigate = useNavigate();
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

  // 批量导入状态
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

  // 搜索条件
  const [searchFilters, setSearchFilters] = useState<TrainingLeadQuery>({
    search: '',
    status: undefined,
    leadSource: undefined,
    trainingType: undefined,
    startDate: undefined,
    endDate: undefined,
    isReported: undefined,
    studentOwner: undefined
  });

  // 加载用户列表
  const fetchUsers = async () => {
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
    fetchUsers();
  }, [currentPage, pageSize]);

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
      studentOwner: undefined
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

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const option = LEAD_STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.color || '#8c8c8c';
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
      title: '微信号',
      dataIndex: 'wechatId',
      key: 'wechatId',
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (text: string) => (
        <Tag color={getStatusColor(text)}>{text}</Tag>
      )
    },
    {
      title: '跟进状态',
      dataIndex: 'followUpStatus',
      key: 'followUpStatus',
      width: 110,
      render: (followUpStatus: string | null) => {
        if (!followUpStatus) return null;

        // 根据不同状态显示不同颜色
        let color = '#52c41a'; // 默认绿色（已跟进）
        if (followUpStatus === '新客未跟进') {
          color = '#ff4d4f'; // 红色
        } else if (followUpStatus === '流转未跟进') {
          color = '#faad14'; // 橙色
        }

        return <Tag color={color}>{followUpStatus}</Tag>;
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
      title: '学员归属',
      dataIndex: 'studentOwner',
      key: 'studentOwner',
      width: 100,
      render: (studentOwner: any) => {
        if (!studentOwner) return '-';
        return typeof studentOwner === 'object' ? studentOwner.name : '-';
      }
    },
    {
      title: '最后跟进',
      dataIndex: 'lastFollowUpAt',
      key: 'lastFollowUpAt',
      width: 150,
      render: (text: string) => {
        if (!text) return '-';
        return dayjs(text).format('YYYY-MM-DD HH:mm');
      }
    },
    {
      title: '用户归属',
      dataIndex: 'referredBy',
      key: 'referredBy',
      width: 100,
      render: (referredBy: any) => {
        if (!referredBy) return '-';
        return typeof referredBy === 'object' ? referredBy.name : '-';
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
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 搜索筛选区域 */}
          <Row gutter={[16, 16]}>
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
              <Select
                placeholder="状态"
                value={searchFilters.status}
                onChange={(value) => setSearchFilters({ ...searchFilters, status: value })}
                allowClear
                style={{ width: '100%' }}
              >
                {LEAD_STATUS_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="线索来源"
                value={searchFilters.leadSource}
                onChange={(value) => setSearchFilters({ ...searchFilters, leadSource: value })}
                allowClear
                style={{ width: '100%' }}
              >
                {LEAD_SOURCE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="培训类型"
                value={searchFilters.trainingType}
                onChange={(value) => setSearchFilters({ ...searchFilters, trainingType: value })}
                allowClear
                style={{ width: '100%' }}
              >
                {TRAINING_TYPE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="是否报征"
                value={searchFilters.isReported}
                onChange={(value) => setSearchFilters({ ...searchFilters, isReported: value })}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value={true}>是</Option>
                <Option value={false}>否</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="学员归属"
                value={searchFilters.studentOwner}
                onChange={(value) => setSearchFilters({ ...searchFilters, studentOwner: value })}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: '100%' }}
              >
                {users.map(user => (
                  <Option key={user._id} value={user._id}>{user.name}</Option>
                ))}
              </Select>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={8}>
              <RangePicker
                placeholder={['创建开始日期', '创建结束日期']}
                onChange={handleDateRangeChange}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={16} style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={handleReset}>重置</Button>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  搜索
                </Button>
                <Button
                  icon={<ShareAltOutlined />}
                  onClick={handleGenerateShare}
                  loading={shareLoading}
                >
                  生成分享链接
                </Button>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => setImportModalVisible(true)}
                >
                  批量导入
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/training-leads/create')}
                >
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

      {/* Excel导入弹窗 */}
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
                <li>您可以在列表的"用户归属"列查看归属信息</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TrainingLeadList;

