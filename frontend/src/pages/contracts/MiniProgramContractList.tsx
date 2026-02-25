import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  message,
  Row,
  Col,
  Statistic,
  Tabs,
  QRCode,
  Typography,
  Divider,
  Alert,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  MobileOutlined,
  QrcodeOutlined,
  CopyOutlined,
  LinkOutlined,
  FileAddOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiService } from '../../services/api';

const { Text, Paragraph, Title } = Typography;

interface MiniProgramContract {
  _id: string;
  contractNumber: string;
  customerName: string;
  customerPhone: string;
  workerName: string;
  workerPhone: string;
  contractType: string;
  contractStatus: string;
  esignStatus: string;
  esignStatusText: string;
  createdAt: string;
}

const MiniProgramContractList: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [contracts, setContracts] = useState<MiniProgramContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [statistics, setStatistics] = useState({
    total: 0,
    signing: 0,
    signed: 0,
    other: 0,
  });

  useEffect(() => {
    fetchContracts();
  }, [pagination.current, pagination.pageSize]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/contracts/miniprogram/list', {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
      });

      if (response.success) {
        setContracts(response.data.contracts);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
        }));

        // 计算统计数据
        const total = response.data.total;
        const signing = response.data.contracts.filter((c: MiniProgramContract) => c.esignStatus === '1').length;
        const signed = response.data.contracts.filter((c: MiniProgramContract) => c.esignStatus === '2').length;
        const other = total - signing - signed;

        setStatistics({ total, signing, signed, other });
      }
    } catch (error) {
      console.error('获取小程序合同列表失败:', error);
      message.error('获取合同列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchContracts();
  };

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
      total: pagination.total,
    });
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      '0': 'default',
      '1': 'processing',
      '2': 'success',
      '3': 'error',
      '4': 'warning',
      '5': 'default',
    };
    return statusMap[status] || 'default';
  };

  const columns = [
    {
      title: '合同编号',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      width: 200,
    },
    {
      title: '客户姓名',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 120,
    },
    {
      title: '客户电话',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      width: 130,
    },
    {
      title: '服务人员',
      dataIndex: 'workerName',
      key: 'workerName',
      width: 120,
    },
    {
      title: '服务人员电话',
      dataIndex: 'workerPhone',
      key: 'workerPhone',
      width: 130,
    },
    {
      title: '合同类型',
      dataIndex: 'contractType',
      key: 'contractType',
      width: 120,
    },
    {
      title: '签署状态',
      key: 'esignStatus',
      width: 120,
      render: (_: any, record: MiniProgramContract) => (
        <Tag color={getStatusColor(record.esignStatus)}>
          {record.esignStatusText || '未知'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: MiniProgramContract) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => window.open(`/standalone/contracts/${record._id}`, '_blank')}
          >
            查看
          </Button>
        </Space>
      ),
    },
  ];

  // H5 链接地址
  const h5CreateUrl = `${window.location.origin}/mobile/contract/create`;

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('链接已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 渲染合同列表Tab内容
  const renderContractListTab = () => (
    <>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="合同总数"
              value={statistics.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="签约中"
              value={statistics.signing}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已签约"
              value={statistics.signed}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="其他状态"
              value={statistics.other}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchContracts}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        {/* 搜索栏 */}
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col span={8}>
            <Input
              placeholder="搜索合同编号、客户姓名或电话"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              搜索
            </Button>
          </Col>
        </Row>

        {/* 合同列表 */}
        <Table
          columns={columns}
          dataSource={contracts}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
    </>
  );

  // 渲染H5入口Tab内容
  const renderH5EntryTab = () => (
    <Row gutter={24}>
      <Col span={12}>
        <Card title={<><QrcodeOutlined /> H5 合同创建入口</>}>
          <Alert
            type="info"
            message="小程序 WebView 内嵌使用"
            description="在小程序中使用 <web-view> 组件打开此链接，可直接在小程序内完成合同创建和签署流程。"
            style={{ marginBottom: 24 }}
            showIcon
          />

          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <QRCode
              value={h5CreateUrl}
              size={200}
              style={{ margin: '0 auto' }}
            />
            <div style={{ marginTop: 12, color: '#999' }}>扫码预览 H5 页面</div>
          </div>

          <Divider />

          <div style={{ marginBottom: 16 }}>
            <Text strong>H5 创建合同链接：</Text>
            <Paragraph
              copyable={{
                text: h5CreateUrl,
                onCopy: () => message.success('链接已复制')
              }}
              style={{
                background: '#f5f5f5',
                padding: '8px 12px',
                borderRadius: 4,
                marginTop: 8,
                wordBreak: 'break-all'
              }}
            >
              {h5CreateUrl}
            </Paragraph>
          </div>

          <Space>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={() => window.open(h5CreateUrl, '_blank')}
            >
              在新标签页打开
            </Button>
            <Button
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(h5CreateUrl)}
            >
              复制链接
            </Button>
          </Space>
        </Card>
      </Col>

      <Col span={12}>
        <Card title={<><MobileOutlined /> 小程序调用示例</>}>
          <Alert
            type="success"
            message="无需登录，公开访问"
            description="H5 页面为公开页面，不需要 CRM 登录认证，可直接在小程序 WebView 中使用。"
            style={{ marginBottom: 24 }}
            showIcon
          />

          <Title level={5}>小程序 WXML 代码：</Title>
          <Paragraph
            code
            copyable
            style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: 4,
              fontSize: 13
            }}
          >
{`<web-view src="${h5CreateUrl}" />`}
          </Paragraph>

          <Divider />

          <Title level={5}>小程序 JS 代码（带参数）：</Title>
          <Paragraph
            code
            copyable
            style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: 4,
              fontSize: 13,
              whiteSpace: 'pre-wrap'
            }}
          >
{`Page({
  data: {
    webviewUrl: '${h5CreateUrl}?source=miniprogram'
  },
  onLoad() {
    // 可添加其他参数
    // 如预填客户信息等
  }
})`}
          </Paragraph>

          <Divider />

          <Title level={5}>功能说明：</Title>
          <ul style={{ paddingLeft: 20, color: '#666' }}>
            <li>支持 4 步骤创建合同（甲乙方信息 → 选择模板 → 填写参数 → 获取签署链接）</li>
            <li>自动调用后端 API 创建爱签电子合同</li>
            <li>创建完成后显示签署二维码和链接</li>
            <li>支持直接在 WebView 内打开签署页面</li>
          </ul>
        </Card>
      </Col>
    </Row>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: (
                <span>
                  <EyeOutlined />
                  合同列表
                </span>
              ),
              children: renderContractListTab(),
            },
            {
              key: 'h5',
              label: (
                <span>
                  <MobileOutlined />
                  H5 创建入口
                </span>
              ),
              children: renderH5EntryTab(),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default MiniProgramContractList;

