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
  Descriptions,
  Modal,
  Input,
  Form,
  Popconfirm,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  getAllFormSubmissions,
  FormSubmission,
  getFormDetail,
  updateSubmission,
  deleteFormSubmission,
} from '../../services/form.service';
import dayjs from 'dayjs';
import Authorized from '../../components/Authorized';
import { useAuth } from '../../contexts/AuthContext';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const FormSubmissionList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<FormSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [followUpStatus, setFollowUpStatus] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [fieldOptions, setFieldOptions] = useState<Record<string, Record<string, string>>>({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, followUpStatus, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getAllFormSubmissions({
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

  const handleReset = () => {
    setFollowUpStatus(undefined);
    setDateRange(null);
    setCurrentPage(1);
  };

  // 删除提交记录
  const handleDelete = async (submissionId: string) => {
    try {
      await deleteFormSubmission(submissionId);
      message.success('删除成功');
      fetchData(); // 刷新列表
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const showDetail = async (record: FormSubmission) => {
    setSelectedSubmission(record);
    setDetailModalVisible(true);

    // 设置表单初始值
    form.setFieldsValue({
      followUpStatus: record.followUpStatus,
      followUpNote: record.followUpNote || '',
    });

    // 获取表单字段配置以显示中文标签和选项映射
    try {
      const formId = typeof record.formId === 'string' ? record.formId : (record.formId as any)?._id;
      if (formId) {
        const formDetail = await getFormDetail(formId);
        const labels: Record<string, string> = {};
        const options: Record<string, Record<string, string>> = {};

        formDetail.fields?.forEach((field: any) => {
          labels[field.fieldName] = field.label;

          // 如果字段有选项（radio、checkbox、select），建立 value -> label 的映射
          if (field.options && Array.isArray(field.options)) {
            const optionMap: Record<string, string> = {};
            field.options.forEach((opt: any) => {
              optionMap[opt.value] = opt.label;
            });
            options[field.fieldName] = optionMap;
          }
        });

        setFieldLabels(labels);
        setFieldOptions(options);
      }
    } catch (error) {
      console.error('获取表单字段配置失败:', error);
    }
  };

  const handleUpdateSubmission = async () => {
    try {
      const values = await form.validateFields();
      setUpdateLoading(true);

      await updateSubmission(selectedSubmission!._id, {
        followUpStatus: values.followUpStatus,
        followUpNote: values.followUpNote,
      });

      message.success('更新成功');
      setDetailModalVisible(false);
      fetchData(); // 刷新列表
    } catch (error: any) {
      message.error(error.message || '更新失败');
    } finally {
      setUpdateLoading(false);
    }
  };

  // 从提交数据中提取姓名
  const getName = (data: Record<string, any>) => {
    // 尝试多个可能的字段名
    return data['姓名'] || data['name'] || data['名字'] || data['联系人'] || '-';
  };

  // 从提交数据中提取手机号
  const getPhone = (data: Record<string, any>) => {
    // 尝试多个可能的字段名
    return data['手机号'] || data['phone'] || data['电话'] || data['联系电话'] || data['手机'] || '-';
  };

  // 格式化字段值显示
  const formatFieldValue = (fieldName: string, value: any): string => {
    if (value === null || value === undefined) {
      return '-';
    }

    // 如果该字段有选项映射，尝试转换 value 为 label
    if (fieldOptions[fieldName]) {
      // 处理数组类型（checkbox）
      if (Array.isArray(value)) {
        return value
          .map(v => fieldOptions[fieldName][v] || v)
          .join('、');
      }
      // 处理单个值（radio、select）
      return fieldOptions[fieldName][value] || String(value);
    }

    // 处理数组类型
    if (Array.isArray(value)) {
      return value.join('、');
    }

    return String(value);
  };

  const columns = [
    {
      title: '表单名称',
      dataIndex: 'formId',
      key: 'formId',
      width: 150,
      render: (formId: any) => formId?.title || '-',
    },
    {
      title: '姓名',
      dataIndex: 'data',
      key: 'name',
      width: 120,
      render: (data: Record<string, any>) => getName(data),
    },
    {
      title: '手机号',
      dataIndex: 'data',
      key: 'phone',
      width: 130,
      render: (data: Record<string, any>) => getPhone(data),
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '跟进状态',
      dataIndex: 'followUpStatus',
      key: 'followUpStatus',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          pending: { text: '待跟进', color: 'orange' },
          contacted: { text: '已联系', color: 'blue' },
          completed: { text: '已完成', color: 'green' },
          invalid: { text: '无效', color: 'red' },
        };
        const config = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '用户归属',
      dataIndex: 'referredBy',
      key: 'referredBy',
      width: 100,
      render: (referredBy: any) => {
        if (!referredBy) return '-';
        return typeof referredBy === 'object' ? referredBy.name : '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: FormSubmission) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            查看详情
          </Button>
          {/* 删除按钮（仅管理员可见） */}
          <Authorized role={['admin', '系统管理员']} noMatch={null}>
            <Popconfirm
              title="确定要删除这条提交记录吗？"
              description="删除后将无法恢复"
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
          </Authorized>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="表单列表"
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 筛选区域 */}
          <Space wrap>
            <Select
              placeholder="跟进状态"
              value={followUpStatus}
              onChange={setFollowUpStatus}
              style={{ width: 120 }}
              allowClear
            >
              <Option value="pending">待跟进</Option>
              <Option value="contacted">已联系</Option>
              <Option value="completed">已完成</Option>
              <Option value="invalid">无效</Option>
            </Select>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['开始日期', '结束日期']}
            />
            <Button onClick={handleReset}>重置</Button>
          </Space>

          {/* 表格 */}
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="_id"
            loading={loading}
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
            scroll={{ x: 1000 }}
          />
        </Space>
      </Card>

      {/* 详情模态框 */}
      <Modal
        title="提交详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        onOk={handleUpdateSubmission}
        okText="保存"
        cancelText="取消"
        confirmLoading={updateLoading}
        width={800}
      >
        {selectedSubmission && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 提交信息 */}
            <Descriptions column={1} bordered>
              <Descriptions.Item label="表单名称">
                {(selectedSubmission.formId as any)?.title || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {dayjs(selectedSubmission.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {Object.entries(selectedSubmission.data).map(([key, value]) => (
                <Descriptions.Item label={fieldLabels[key] || key} key={key}>
                  {formatFieldValue(key, value)}
                </Descriptions.Item>
              ))}
            </Descriptions>

            {/* 跟进信息表单 */}
            <Card title="跟进信息" size="small">
              <Form form={form} layout="vertical">
                <Form.Item
                  label="跟进状态"
                  name="followUpStatus"
                  rules={[{ required: true, message: '请选择跟进状态' }]}
                >
                  <Select placeholder="请选择跟进状态">
                    <Option value="pending">待跟进</Option>
                    <Option value="contacted">已联系</Option>
                    <Option value="completed">已完成</Option>
                    <Option value="invalid">无效</Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  label="跟进备注"
                  name="followUpNote"
                >
                  <TextArea
                    rows={4}
                    placeholder="请输入跟进备注"
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              </Form>
            </Card>
          </Space>
        )}
      </Modal>
    </>
  );
};

export default FormSubmissionList;

