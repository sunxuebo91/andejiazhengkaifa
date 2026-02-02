import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  Image,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import articleService, { Article } from '../../services/article.service';
import ArticleForm from './ArticleForm';
import './ArticleList.css';

const ArticleList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  const [filtersForm] = Form.useForm();

  const loadData = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    try {
      const values = filtersForm.getFieldsValue();
      const result = await articleService.getList({
        page: nextPage,
        pageSize: nextPageSize,
        status: values.status,
        keyword: values.keyword,
      });
      setDataSource(result.data?.list || []);
      setTotal(result.data?.total || 0);
      setPage(result.data?.page || nextPage);
      setPageSize(result.data?.pageSize || nextPageSize);
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await articleService.remove(id);
      message.success('删除成功');
      loadData(1, pageSize);
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleStatusChange = async (id: string, checked: boolean) => {
    try {
      await articleService.updateStatus(id, checked ? 'published' : 'draft');
      message.success('状态更新成功');
      loadData(page, pageSize);
    } catch (error: any) {
      message.error(error.message || '状态更新失败');
    }
  };

  const columns: ColumnsType<Article> = [
    {
      title: '标题',
      dataIndex: 'title',
      render: (val, record) => <span>{val || record._id}</span>,
    },
    { title: '作者', dataIndex: 'author', width: 140, render: (v) => v || '-' },
    {
      title: '图片',
      dataIndex: 'imageUrls',
      width: 120,
      render: (urls: string[] | undefined) => {
        const list = Array.isArray(urls) ? urls : [];
        if (list.length === 0) return <span style={{ color: '#999' }}>0</span>;
        return (
          <Space>
            <Image src={list[0]} width={60} height={40} style={{ objectFit: 'cover', borderRadius: 6 }} />
            <Tag>{list.length}张</Tag>
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status, record) => (
        <Switch
          checked={status === 'published'}
          onChange={(checked) => handleStatusChange(record._id, checked)}
          checkedChildren="发布"
          unCheckedChildren="草稿"
        />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingId(record._id);
              setDrawerVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record._id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setEditingId(undefined);
  };

  const handleFormSuccess = () => {
    handleDrawerClose();
    loadData(page, pageSize);
  };

  return (
    <PageContainer
      title="文章内容管理"
      extra={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingId(undefined);
            setDrawerVisible(true);
          }}
        >
          新增文章
        </Button>,
      ]}
    >
      <Card style={{ marginBottom: 10 }}>
        <Form
          form={filtersForm}
          layout="inline"
          initialValues={{ status: undefined, keyword: '' }}
          onValuesChange={() => loadData(1, pageSize)}
        >
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="标题/正文/作者/来源" allowClear style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 140 }}
              options={[
                { value: 'draft', label: '草稿' },
                { value: 'published', label: '已发布' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button onClick={() => loadData(1, pageSize)}>刷新</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Table
          loading={loading}
          dataSource={dataSource}
          columns={columns}
          rowKey="_id"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => loadData(p, ps),
          }}
        />
      </Card>

      <Drawer
        title={editingId ? '编辑文章' : '新增文章'}
        width="100%"
        open={drawerVisible}
        onClose={handleDrawerClose}
        destroyOnClose
        styles={{
          body: { padding: 0 }
        }}
      >
        <ArticleForm
          id={editingId}
          onSuccess={handleFormSuccess}
          onCancel={handleDrawerClose}
        />
      </Drawer>
    </PageContainer>
  );
};

export default ArticleList;

