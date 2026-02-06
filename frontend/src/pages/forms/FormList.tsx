import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  message,
  Modal,
  Input,
  Select,
  Card,
  Tooltip,
  Typography,
  QRCode
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  BarChartOutlined,
  DownloadOutlined,
  CopyOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getFormList, deleteForm, FormConfig, generateShareToken } from '../../services/form.service';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Text, Link } = Typography;

const FormList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<FormConfig[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [selectedFormUrl, setSelectedFormUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getFormList({
        page: currentPage,
        pageSize,
        keyword,
        status,
      });
      console.log('Form list response:', response);
      setDataSource(response?.list || []);
      setTotal(response?.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch form list:', error);
      message.error(error.message || '获取表单列表失败');
      setDataSource([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchData();
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这个表单吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteForm(id);
          message.success('删除成功');
          fetchData();
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  const copyFormLink = async (id: string) => {
    try {
      setShareLoading(true);
      const response = await generateShareToken(id);
      navigator.clipboard.writeText(response.shareUrl);
      message.success('链接已复制到剪贴板');
    } catch (error: any) {
      message.error(error.message || '生成分享链接失败');
    } finally {
      setShareLoading(false);
    }
  };

  const showQRCode = async (id: string) => {
    try {
      setShareLoading(true);
      const response = await generateShareToken(id);
      setSelectedFormUrl(response.shareUrl);
      setQrCodeModalVisible(true);
    } catch (error: any) {
      message.error(error.message || '生成二维码失败');
    } finally {
      setShareLoading(false);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('qrcode-canvas')?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL();
      const a = document.createElement('a');
      a.download = 'form-qrcode.png';
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success('二维码已下载');
    }
  };

  const columns = [
    {
      title: '表单标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '浏览/提交',
      key: 'stats',
      width: 120,
      render: (_: any, record: FormConfig) => (
        <Space>
          <Tooltip title="浏览次数">
            <Tag color="blue">{record.viewCount || 0}</Tag>
          </Tooltip>
          <Tooltip title="提交次数">
            <Tag color="green">{record.submissionCount || 0}</Tag>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '生效时间',
      key: 'time',
      width: 200,
      render: (_: any, record: FormConfig) => {
        if (!record.startTime && !record.endTime) {
          return <Text type="secondary">永久有效</Text>;
        }
        return (
          <div>
            {record.startTime && <div>开始: {dayjs(record.startTime).format('YYYY-MM-DD HH:mm')}</div>}
            {record.endTime && <div>结束: {dayjs(record.endTime).format('YYYY-MM-DD HH:mm')}</div>}
          </div>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 320,
      fixed: 'right' as const,
      render: (_: any, record: FormConfig) => (
        <Space size="small">
          <Tooltip title="查看数据">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/forms/${record._id}/submissions`)}
            />
          </Tooltip>
          <Tooltip title="统计">
            <Button
              type="link"
              size="small"
              icon={<BarChartOutlined />}
              onClick={() => navigate(`/forms/${record._id}/stats`)}
            />
          </Tooltip>
          <Tooltip title="生成二维码">
            <Button
              type="link"
              size="small"
              icon={<QrcodeOutlined />}
              onClick={() => showQRCode(record._id!)}
            />
          </Tooltip>
          <Tooltip title="复制链接">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyFormLink(record._id!)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/forms/edit/${record._id}`)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record._id!)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Search
              placeholder="搜索表单标题"
              allowClear
              style={{ width: 300 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={handleSearch}
            />
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 120 }}
              value={status}
              onChange={(value) => {
                setStatus(value);
                setCurrentPage(1);
              }}
            >
              <Option value="active">启用</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/forms/create')}
          >
            创建表单
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1200 }}
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
            },
          }}
        />
      </Space>

      {/* 二维码模态框 */}
      <Modal
        title="表单二维码"
        open={qrCodeModalVisible}
        onCancel={() => setQrCodeModalVisible(false)}
        footer={[
          <Button key="copy" onClick={() => {
            navigator.clipboard.writeText(selectedFormUrl);
            message.success('链接已复制到剪贴板');
          }}>
            复制链接
          </Button>,
          <Button key="download" type="primary" onClick={downloadQRCode}>
            下载二维码
          </Button>,
        ]}
        centered
        width={400}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div id="qrcode-canvas" style={{ display: 'inline-block' }}>
            <QRCode
              value={selectedFormUrl || 'loading...'}
              size={256}
              style={{ marginBottom: 16 }}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12, wordBreak: 'break-all' }}>
              {selectedFormUrl}
            </Text>
          </div>
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">
              扫描二维码或复制链接分享表单
            </Text>
          </div>
          <div style={{ marginTop: 8 }}>
            <Text type="warning" style={{ fontSize: 12 }}>
              💡 通过此链接提交的表单将自动归属于您
            </Text>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default FormList;

