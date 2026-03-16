import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  FloatButton,
  Alert,
  Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  BugOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import crawlerSourceService, { CrawlerSource, AICommandResult } from '../../services/crawlerSource.service';

const { Text } = Typography;

const CrawlerSourceList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<CrawlerSource[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CrawlerSource | null>(null);
  const [form] = Form.useForm();
  const [sourceType, setSourceType] = useState<'html' | 'rss'>('rss');

  // AI 命令窗口状态
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiCommand, setAiCommand] = useState('');
  const [aiExecuting, setAiExecuting] = useState(false);
  const [aiResult, setAiResult] = useState<AICommandResult | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await crawlerSourceService.getList();
      setDataSource(res.data || []);
    } catch (err: any) {
      message.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const res = await crawlerSourceService.getAIStatus();
      setAiEnabled(res.data?.aiEnabled || false);
    } catch (err) {
      console.error('Failed to check AI status:', err);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await crawlerSourceService.runNow();
      message.success(res.message || '抓取完成');
      loadData();
    } catch (err: any) {
      message.error(err.message || '抓取失败');
    } finally {
      setRunning(false);
    }
  };

  const handleTestSource = async (id: string) => {
    setTestingId(id);
    try {
      const res = await crawlerSourceService.testSource(id);
      message.success(res.message || '测试完成');
      loadData();
    } catch (err: any) {
      message.error(err.message || '测试失败');
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleEnabled = async (record: CrawlerSource, checked: boolean) => {
    try {
      await crawlerSourceService.update(record._id, { isEnabled: checked });
      message.success(checked ? '已启用' : '已禁用');
      loadData();
    } catch (err: any) {
      message.error(err.message || '更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await crawlerSourceService.remove(id);
      message.success('删除成功');
      loadData();
    } catch (err: any) {
      message.error(err.message || '删除失败');
    }
  };

  const openDrawer = (record?: CrawlerSource) => {
    setEditingRecord(record || null);
    const type = record?.type || 'rss';
    setSourceType(type);
    form.setFieldsValue(
      record
        ? {
            name: record.name,
            url: record.url,
            type: record.type,
            maxPerCrawl: record.maxPerCrawl,
            sourceLabel: record.sourceLabel,
            selectors: record.selectors,
          }
        : { type: 'rss', maxPerCrawl: 10 },
    );
    setDrawerVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRecord) {
        await crawlerSourceService.update(editingRecord._id, values);
        message.success('更新成功');
      } else {
        await crawlerSourceService.create(values);
        message.success('创建成功');
      }
      setDrawerVisible(false);
      loadData();
    } catch (err: any) {
      if (err.errorFields) return; // 表单校验错误，不提示
      message.error(err.message || '保存失败');
    }
  };

  const handleAICommand = async () => {
    if (!aiCommand.trim()) {
      message.warning('请输入指令');
      return;
    }

    setAiExecuting(true);
    setAiResult(null);

    try {
      const res = await crawlerSourceService.executeAICommand(aiCommand);
      setAiResult(res.data || null);
      message.success(res.message || '执行成功');
      loadData(); // 刷新列表
    } catch (err: any) {
      message.error(err.message || 'AI 指令执行失败');
    } finally {
      setAiExecuting(false);
    }
  };

  const openAIModal = () => {
    setAiModalVisible(true);
    setAiCommand('');
    setAiResult(null);
  };

  const columns: ColumnsType<CrawlerSource> = [
    {
      title: '来源名称',
      dataIndex: 'name',
      render: (val, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{val}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.sourceLabel || '—'}
          </Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (t) => (
        <Tag color={t === 'rss' ? 'blue' : 'purple'}>{t.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      ellipsis: true,
      render: (url) => (
        <Tooltip title={url}>
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        </Tooltip>
      ),
    },
    {
      title: '每次上限',
      dataIndex: 'maxPerCrawl',
      width: 90,
      render: (v) => `${v} 篇`,
    },
    {
      title: '最近抓取',
      dataIndex: 'lastCrawledAt',
      width: 160,
      render: (v, record) =>
        v ? (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12 }}>{dayjs(v).format('MM-DD HH:mm')}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              +{record.lastCrawlCount} 篇 / 共 {record.totalCrawlCount} 篇
            </Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '启用',
      dataIndex: 'isEnabled',
      width: 80,
      render: (val, record) => (
        <Switch
          checked={val}
          size="small"
          onChange={(checked) => handleToggleEnabled(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right' as const,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="手动触发此来源抓取">
            <Button
              type="link"
              size="small"
              icon={<BugOutlined />}
              loading={testingId === record._id}
              onClick={() => handleTestSource(record._id)}
            >
              测试
            </Button>
          </Tooltip>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openDrawer(record)}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record._id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="爬虫来源管理"
      subTitle="每30分钟自动抓取，存为草稿等待审核"
      extra={[
        <Button
          key="run"
          icon={<PlayCircleOutlined />}
          loading={running}
          onClick={handleRunNow}
        >
          立即全量抓取
        </Button>,
        <Button
          key="add"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openDrawer()}
        >
          新增来源
        </Button>,
      ]}
    >
      <Card>
        <Table
          loading={loading}
          dataSource={dataSource}
          columns={columns}
          rowKey="_id"
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Drawer
        title={editingRecord ? '编辑来源' : '新增来源'}
        width={560}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        destroyOnClose
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="来源名称" rules={[{ required: true }]}>
            <Input placeholder="如：今日头条-家政资讯" />
          </Form.Item>

          <Form.Item name="type" label="解析方式" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'rss', label: 'RSS（推荐，简单稳定）' },
                { value: 'html', label: 'HTML（需配置选择器）' },
              ]}
              onChange={(v) => setSourceType(v)}
            />
          </Form.Item>

          <Form.Item
            name="url"
            label={sourceType === 'rss' ? 'RSS Feed 地址' : '列表页 URL'}
            rules={[{ required: true }, { type: 'url', message: '请输入有效的URL' }]}
          >
            <Input placeholder="https://" />
          </Form.Item>

          <Form.Item name="sourceLabel" label="来源标签（显示在文章来源字段）">
            <Input placeholder="不填则使用来源名称" />
          </Form.Item>

          <Form.Item name="maxPerCrawl" label="每次最多抓取条数">
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>

          {sourceType === 'html' && (
            <>
              <Form.Item label="CSS 选择器配置" style={{ marginBottom: 0 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  用于从列表页和详情页提取内容的 CSS 选择器
                </Text>
              </Form.Item>
              <Form.Item name={['selectors', 'articleList']} label="文章列表容器" rules={[{ required: true }]}>
                <Input placeholder=".news-list li" />
              </Form.Item>
              <Form.Item name={['selectors', 'articleLink']} label="列表中的链接" rules={[{ required: true }]}>
                <Input placeholder="a" />
              </Form.Item>
              <Form.Item name={['selectors', 'title']} label="详情页标题" rules={[{ required: true }]}>
                <Input placeholder="h1.title" />
              </Form.Item>
              <Form.Item name={['selectors', 'content']} label="详情页正文容器" rules={[{ required: true }]}>
                <Input placeholder=".article-body" />
              </Form.Item>
              <Form.Item name={['selectors', 'author']} label="作者（可选）">
                <Input placeholder=".author-name" />
              </Form.Item>
            </>
          )}
        </Form>
      </Drawer>

      {/* AI 智能指令窗口 */}
      <Modal
        title={
          <Space>
            <RobotOutlined style={{ color: '#1890ff' }} />
            <span>AI 智能爬虫指令</span>
            {aiEnabled && <Tag color="success">AI 已启用</Tag>}
            {!aiEnabled && <Tag color="warning">规则模式</Tag>}
          </Space>
        }
        open={aiModalVisible}
        onCancel={() => setAiModalVisible(false)}
        width={700}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="一句话指令，智能抓取"
            description={
              <div>
                <p>示例指令：</p>
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>每天更新30篇育儿相关的家政知识</li>
                  <li>抓取50篇月嫂培训相关的文章</li>
                  <li>获取最新的产后护理知识</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
          />

          <Input.TextArea
            value={aiCommand}
            onChange={(e) => setAiCommand(e.target.value)}
            placeholder="输入你的指令，例如：每天更新30篇育儿相关的家政知识"
            rows={3}
            disabled={aiExecuting}
            onPressEnter={(e) => {
              if (e.ctrlKey || e.metaKey) {
                handleAICommand();
              }
            }}
          />

          <Button
            type="primary"
            size="large"
            block
            icon={<ThunderboltOutlined />}
            loading={aiExecuting}
            onClick={handleAICommand}
          >
            {aiExecuting ? '执行中...' : '执行指令'}
          </Button>

          {aiResult && (
            <>
              <Divider />
              <Card
                size="small"
                title={
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>执行结果</span>
                  </Space>
                }
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>AI 理解的意图：</Text>
                    <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                      <Space direction="vertical" size="small">
                        <div>
                          <Text type="secondary">主题：</Text>
                          <Tag color="blue">{aiResult.intent.topic}</Tag>
                        </div>
                        <div>
                          <Text type="secondary">关键词：</Text>
                          {aiResult.intent.keywords.map((kw) => (
                            <Tag key={kw}>{kw}</Tag>
                          ))}
                        </div>
                        <div>
                          <Text type="secondary">数量：</Text>
                          <Text>{aiResult.intent.count} 篇</Text>
                        </div>
                        <div>
                          <Text type="secondary">频率：</Text>
                          <Tag color="green">{aiResult.intent.frequency === 'daily' ? '每日' : aiResult.intent.frequency}</Tag>
                        </div>
                      </Space>
                    </div>
                  </div>

                  <div>
                    <Text strong>抓取统计：</Text>
                    <div style={{ marginTop: 8 }}>
                      <Space size="large">
                        <div>
                          <Text type="secondary">发现：</Text>
                          <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                            {aiResult.articlesFound}
                          </Text>
                          <Text type="secondary"> 篇</Text>
                        </div>
                        <div>
                          <Text type="secondary">保存：</Text>
                          <Text strong style={{ fontSize: 18, color: '#52c41a' }}>
                            {aiResult.articlesSaved}
                          </Text>
                          <Text type="secondary"> 篇</Text>
                        </div>
                        <div>
                          <Text type="secondary">跳过：</Text>
                          <Text strong style={{ fontSize: 18, color: '#faad14' }}>
                            {aiResult.duplicatesSkipped}
                          </Text>
                          <Text type="secondary"> 篇</Text>
                        </div>
                      </Space>
                    </div>
                  </div>

                  {aiResult.sources.length > 0 && (
                    <div>
                      <Text type="secondary">来源：</Text>
                      {aiResult.sources.map((src) => (
                        <Tag key={src} color="purple">
                          {src}
                        </Tag>
                      ))}
                    </div>
                  )}
                </Space>
              </Card>
            </>
          )}
        </Space>
      </Modal>

      {/* 浮动 AI 按钮 */}
      <FloatButton
        icon={<RobotOutlined />}
        type="primary"
        tooltip="AI 智能指令"
        onClick={openAIModal}
        style={{ right: 24, bottom: 24 }}
      />
    </PageContainer>
  );
};

export default CrawlerSourceList;
