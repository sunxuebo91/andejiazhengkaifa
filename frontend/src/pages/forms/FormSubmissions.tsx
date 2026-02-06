import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  message,
  Card,
  Select,
  DatePicker,
  Modal,
  Form,
  Input,
  Descriptions,
  Tooltip,
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import {
  getFormSubmissions,
  getFormDetail,
  updateSubmission,
  exportFormToExcel,
  FormSubmission,
  FormConfig,
} from '../../services/form.service';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const FormSubmissions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<FormSubmission[]>([]);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [followUpStatus, setFollowUpStatus] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [followUpModalVisible, setFollowUpModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [followUpForm] = Form.useForm();

  useEffect(() => {
    if (id) {
      fetchFormConfig();
      fetchData();
    }
  }, [id, currentPage, pageSize, followUpStatus, dateRange]);

  const fetchFormConfig = async () => {
    try {
      const data = await getFormDetail(id!);
      setFormConfig(data);
    } catch (error: any) {
      message.error(error.message || '获取表单配置失败');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getFormSubmissions(id!, {
        page: currentPage,
        pageSize,
        followUpStatus,
        startDate: dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined,
        endDate: dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined,
      });
      setDataSource(response.list);
      setTotal(response.total);
    } catch (error: any) {
      message.error(error.message || '获取提交数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      message.loading('正在导出...', 0);
      const blob = await exportFormToExcel(id!);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formConfig?.title}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.destroy();
      message.success('导出成功');
    } catch (error: any) {
      message.destroy();
      message.error(error.message || '导出失败');
    }
  };

  const showDetail = (record: FormSubmission) => {
    setSelectedSubmission(record);
    setDetailModalVisible(true);
  };

  const showFollowUp = (record: FormSubmission) => {
    setSelectedSubmission(record);
    followUpForm.setFieldsValue({
      followUpStatus: record.followUpStatus,
      followUpNote: record.followUpNote,
    });
    setFollowUpModalVisible(true);
  };

  const handleFollowUp = async (values: any) => {
    try {
      await updateSubmission(selectedSubmission!._id, values);
      message.success('更新成功');
      setFollowUpModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    }
  };

  const getFollowUpStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '待跟进' },
      contacted: { color: 'processing', text: '已联系' },
      completed: { color: 'success', text: '已完成' },
    };
    const config = statusMap[status] || statusMap.pending;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getSourceTag = (source: string) => {
    const sourceMap: Record<string, { color: string; text: string }> = {
      h5: { color: 'blue', text: 'H5' },
      miniprogram: { color: 'green', text: '小程序' },
      web: { color: 'purple', text: 'Web' },
    };
    const config = sourceMap[source] || sourceMap.h5;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '提交数据',
      key: 'data',
      width: 300,
      render: (_: any, record: FormSubmission) => {
        const dataPreview = Object.entries(record.data)
          .slice(0, 2)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        return (
          <Tooltip title="点击查看详情">
            <span style={{ cursor: 'pointer' }} onClick={() => showDetail(record)}>
              {dataPreview}...
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (source: string) => getSourceTag(source),
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 150,
    },
    {
      title: '跟进状态',
      dataIndex: 'followUpStatus',
      key: 'followUpStatus',
      width: 120,
      render: (status: string) => getFollowUpStatusTag(status),
    },
    {
      title: '跟进人',
      key: 'followUpBy',
      width: 120,
      render: (_: any, record: FormSubmission) => {
        return record.followUpBy ? (record.followUpBy as any).name : '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: FormSubmission) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showDetail(record)}
            />
          </Tooltip>
          <Tooltip title="跟进">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => showFollowUp(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card title={`${formConfig?.title || '表单'} - 提交数据`}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Select
              placeholder="跟进状态"
              allowClear
              style={{ width: 120 }}
              value={followUpStatus}
              onChange={(value) => {
                setFollowUpStatus(value);
                setCurrentPage(1);
              }}
            >
              <Option value="pending">待跟进</Option>
              <Option value="contacted">已联系</Option>
              <Option value="completed">已完成</Option>
            </Select>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates);
                setCurrentPage(1);
              }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              刷新
            </Button>
          </Space>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            导出Excel
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

      {/* 详情Modal */}
      <Modal
        title="提交详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedSubmission && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="提交时间">
              {dayjs(selectedSubmission.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="来源">{getSourceTag(selectedSubmission.source)}</Descriptions.Item>
            <Descriptions.Item label="IP地址">{selectedSubmission.ipAddress || '-'}</Descriptions.Item>
            <Descriptions.Item label="跟进状态">
              {getFollowUpStatusTag(selectedSubmission.followUpStatus)}
            </Descriptions.Item>
            {Object.entries(selectedSubmission.data).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Modal>

      {/* 跟进Modal */}
      <Modal
        title="跟进记录"
        open={followUpModalVisible}
        onCancel={() => setFollowUpModalVisible(false)}
        onOk={() => followUpForm.submit()}
      >
        <Form form={followUpForm} layout="vertical" onFinish={handleFollowUp}>
          <Form.Item label="跟进状态" name="followUpStatus">
            <Select>
              <Option value="pending">待跟进</Option>
              <Option value="contacted">已联系</Option>
              <Option value="completed">已完成</Option>
            </Select>
          </Form.Item>
          <Form.Item label="跟进备注" name="followUpNote">
            <TextArea rows={4} placeholder="请输入跟进备注" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default FormSubmissions;

