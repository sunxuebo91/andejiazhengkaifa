import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Image, message, Popconfirm, Switch, Modal, Form, Input, InputNumber, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload';
import bannerService, { Banner } from '../../services/banner.service';
import dayjs from 'dayjs';

const BannerList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<Banner[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await bannerService.getList({ page: 1, pageSize: 100 });
      setDataSource(result.data?.list || []);
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 删除
  const handleDelete = async (id: string) => {
    try {
      await bannerService.remove(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  // 切换状态
  const handleStatusChange = async (id: string, checked: boolean) => {
    try {
      await bannerService.updateStatus(id, checked ? 'active' : 'inactive');
      message.success('状态更新成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '状态更新失败');
    }
  };

  // 打开新建/编辑弹窗
  const openModal = (banner?: Banner) => {
    setEditingBanner(banner || null);
    if (banner) {
      form.setFieldsValue({
        title: banner.title,
        order: banner.order,
      });
      setImageUrl(banner.imageUrl);
      setFileList([{
        uid: '-1',
        name: 'banner.jpg',
        status: 'done',
        url: banner.imageUrl,
      }]);
    } else {
      form.resetFields();
      setImageUrl('');
      setFileList([]);
    }
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!imageUrl) {
        message.error('请上传Banner图片');
        return;
      }
      const submitData = { ...values, imageUrl };
      if (editingBanner) {
        await bannerService.update(editingBanner._id, submitData);
        message.success('更新成功');
      } else {
        await bannerService.create(submitData);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || '操作失败');
    }
  };

  // 图片上传到COS
  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'personalPhoto'); // 使用已有的类型
      const response = await fetch('/api/upload/file', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const result = await response.json();
      if (result.success && result.data?.fileUrl) {
        setImageUrl(result.data.fileUrl);
        setFileList([{
          uid: file.uid,
          name: file.name,
          status: 'done',
          url: result.data.fileUrl,
        }]);
        message.success('上传成功');
        onSuccess(result, file);
      } else {
        message.error(result.message || '上传失败');
        onError(new Error(result.message || '上传失败'));
      }
    } catch (error: any) {
      message.error('上传失败');
      onError(error);
    } finally {
      setUploading(false);
    }
  };

  const columns: ColumnsType<Banner> = [
    {
      title: '图片',
      dataIndex: 'imageUrl',
      width: 120,
      render: (url) => <Image src={url} width={100} height={60} style={{ objectFit: 'cover' }} />,
    },
    { title: '标题', dataIndex: 'title', width: 200 },
    { title: '排序', dataIndex: 'order', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status, record) => (
        <Switch
          checked={status === 'active'}
          onChange={(checked) => handleStatusChange(record._id, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>编辑</Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record._id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Banner管理"
      extra={[
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新建Banner
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
        />
      </Card>

      <Modal
        title={editingBanner ? '编辑Banner' : '新建Banner'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
        confirmLoading={uploading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入Banner标题" />
          </Form.Item>
          <Form.Item label="Banner图片" required>
            <Upload
              listType="picture-card"
              fileList={fileList}
              customRequest={handleUpload}
              accept="image/*"
              maxCount={1}
              onRemove={() => {
                setImageUrl('');
                setFileList([]);
              }}
            >
              {fileList.length === 0 && (
                <div>
                  {uploading ? <UploadOutlined spin /> : <PlusOutlined />}
                  <div style={{ marginTop: 8 }}>{uploading ? '上传中...' : '上传图片'}</div>
                </div>
              )}
            </Upload>
            <div style={{ color: '#999', fontSize: 12 }}>建议尺寸：750 x 300 像素</div>
          </Form.Item>
          <Form.Item name="order" label="排序" initialValue={0}>
            <InputNumber min={0} placeholder="数字越小越靠前" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default BannerList;
