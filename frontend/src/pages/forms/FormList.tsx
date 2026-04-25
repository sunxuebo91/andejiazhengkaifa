import React, { useState, useEffect, useRef } from 'react';
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
  Typography
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
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { getFormList, deleteForm, FormConfig, generateShareToken } from '../../services/form.service';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Text, Link } = Typography;

const FormList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<FormConfig[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [selectedFormUrl, setSelectedFormUrl] = useState('');
  const [selectedFormTitle, setSelectedFormTitle] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

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

  const showQRCode = async (record: FormConfig) => {
    try {
      setShareLoading(true);
      const response = await generateShareToken(record._id!);
      setSelectedFormTitle(record.title || '表单');
      setSelectedFormUrl(response.shareUrl);
      setPosterUrl('');
      setQrCodeModalVisible(true);
    } catch (error: any) {
      message.error(error.message || '生成二维码失败');
    } finally {
      setShareLoading(false);
    }
  };

  // 在 canvas 上按最大宽度对中文文本做换行
  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string[] => {
    const chars = Array.from(text);
    const lines: string[] = [];
    let line = '';
    for (const ch of chars) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  // 合成"表单标题 + 二维码 + 推荐人姓名"的海报图，输出 PNG dataURL
  const composePoster = () => {
    const qrCanvas = qrCanvasRef.current;
    if (!qrCanvas) return;

    const employeeName = user?.name || user?.username || '';
    const title = selectedFormTitle || '表单分享';

    const padding = 32;
    const qrSize = 320;
    const titleFontSize = 22;
    const titleLineHeight = Math.round(titleFontSize * 1.45);
    const nameFontSize = 16;
    const tipFontSize = 12;
    const width = qrSize + padding * 2;

    // 先用一个临时 ctx 测量标题换行
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d')!;
    measureCtx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
    const titleLines = wrapText(measureCtx, title, qrSize);
    const titleHeight = titleLines.length * titleLineHeight;

    const height =
      padding + titleHeight + 20 + qrSize + 20 + nameFontSize + 10 + tipFontSize + padding;

    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // 白底
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 标题
    ctx.fillStyle = '#1f1f1f';
    ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let curY = padding;
    titleLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, curY + idx * titleLineHeight);
    });
    curY += titleHeight + 20;

    // 二维码
    ctx.drawImage(qrCanvas, padding, curY, qrSize, qrSize);
    curY += qrSize + 20;

    // 推荐人姓名
    ctx.fillStyle = '#262626';
    ctx.font = `${nameFontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText(`推荐人：${employeeName || '—'}`, width / 2, curY);
    curY += nameFontSize + 10;

    // 底部提示
    ctx.fillStyle = '#999999';
    ctx.font = `${tipFontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText('微信扫一扫，填写表单', width / 2, curY);

    setPosterUrl(canvas.toDataURL('image/png'));
  };

  // 弹窗打开 / URL / 标题 / 用户变化时，等待 QR canvas 渲染完成后合成海报
  useEffect(() => {
    if (!qrCodeModalVisible || !selectedFormUrl) return;
    const timer = setTimeout(() => {
      composePoster();
    }, 80);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrCodeModalVisible, selectedFormUrl, selectedFormTitle, user]);

  const downloadQRCode = () => {
    if (!posterUrl) {
      message.warning('二维码生成中，请稍候');
      return;
    }
    const a = document.createElement('a');
    a.download = `${selectedFormTitle || 'form'}-二维码.png`;
    a.href = posterUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    message.success('二维码已下载');
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
              onClick={() => showQRCode(record)}
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
        width={440}
      >
        {/* 隐藏的 QRCodeCanvas，仅用于绘制海报 */}
        <div style={{ position: 'absolute', left: -99999, top: -99999, opacity: 0, pointerEvents: 'none' }}>
          {selectedFormUrl && (
            <QRCodeCanvas
              ref={qrCanvasRef}
              value={selectedFormUrl}
              size={320}
              level="H"
              marginSize={4}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          )}
        </div>

        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          {posterUrl ? (
            <img
              src={posterUrl}
              alt="表单二维码"
              style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
            />
          ) : (
            <div style={{ height: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              二维码生成中...
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12, wordBreak: 'break-all' }}>
              {selectedFormUrl}
            </Text>
          </div>
          <div style={{ marginTop: 12 }}>
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

