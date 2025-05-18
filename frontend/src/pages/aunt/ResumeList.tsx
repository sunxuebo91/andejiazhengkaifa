import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, Modal, Button, Select, Input, Table, Space, Tag, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, CommentOutlined, PlusOutlined } from '@ant-design/icons';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useResumeList, useAddFollowUp } from '../../hooks/queries/useResumes';

const { TextArea } = Input;
const { Option } = Select;

// 接单状态映射
const orderStatusMap = {
  accepting: { text: '想接单', color: 'green' },
  'not-accepting': { text: '不接单', color: 'red' },
  'on-service': { text: '已上户', color: 'blue' }
};

// 性别映射
const genderMap = {
  male: '男',
  female: '女'
};

const ResumeList = () => {
  const [form] = Form.useForm();
  const [followUpVisible, setFollowUpVisible] = useState(false);
  const [followUpForm] = Form.useForm();
  const [currentResumeId, setCurrentResumeId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState({});
  
  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);

  // 使用React Query获取简历列表
  const { 
    data: resumeData,
    isLoading,
    refetch 
  } = useResumeList({
    ...searchParams,
    page: currentPage,
    pageSize,
  });

  // 添加跟进记录
  const addFollowUpMutation = useAddFollowUp(currentResumeId || '');

  // 格式化数据 - 增加额外的数据检查，确保resumeData是数组
  let dataItems = [];
  if (resumeData) {
    // 检查响应数据结构
    if (Array.isArray(resumeData)) {
      dataItems = resumeData;
    } else if (resumeData.items && Array.isArray(resumeData.items)) {
      dataItems = resumeData.items;
    }
  }

  const resumeList = dataItems.map(resume => ({
    ...resume,
    formattedId: resume.id ? 
      resume.id.substring(0, 8).padEnd(8, '0') : 
      '未知ID(请联系管理员)',
    hasMedicalReport: resume.medicalReportUrls && resume.medicalReportUrls.length > 0
  }));

  // 处理搜索
  const handleSearch = (values) => {
    const { keyword } = values;
    const searchQuery = keyword ? { keyword } : {};
    setSearchParams(searchQuery);
    setCurrentPage(1);
  };

  // 重置搜索
  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
    setCurrentPage(1);
  };

  // 处理分页变化
  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // 打开跟进记录弹窗
  const handleFollowUp = (resumeId) => {
    setCurrentResumeId(resumeId);
    setFollowUpVisible(true);
    followUpForm.resetFields();
  };

  // 提交跟进记录
  const handleFollowUpSubmit = async () => {
    try {
      const values = await followUpForm.validateFields();
      
      // 使用React Query的mutation提交
      await addFollowUpMutation.mutateAsync(values);
      
      setFollowUpVisible(false);
      followUpForm.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '简历ID',
      dataIndex: 'formattedId',
      key: 'formattedId',
      render: (text, record) => (
        <a onClick={() => navigate(`/aunt/resume/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span>{text}</span>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender) => gender === 'male' ? '男' : gender === 'female' ? '女' : gender || '-',
    },
    {
      title: '籍贯',
      dataIndex: 'nativePlace',
      key: 'nativePlace',
    },
    {
      title: '接单状态',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      render: (status) => {
        const statusInfo = orderStatusMap[status] || { text: status || '未知', color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '经验',
      dataIndex: 'experienceYears',
      key: 'experienceYears',
      render: (years) => years ? `${years}年` : '-',
    },
    {
      title: '体检',
      dataIndex: 'hasMedicalReport',
      key: 'hasMedicalReport',
      render: (has) => has ? <Tag color="green">有</Tag> : <Tag color="red">无</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <a onClick={() => navigate(`/aunt/resume/${record.id}`)}>查看</a>
          <a onClick={() => handleFollowUp(record.id)}>
            <Tooltip title="添加跟进记录">
              <CommentOutlined />
            </Tooltip>
          </a>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      {/* 搜索表单 */}
      <Card>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="keyword" style={{ width: '300px' }}>
            <Input 
              placeholder="搜索姓名、手机号、身份证或ID" 
              allowClear
              prefix={<SearchOutlined />}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              搜索
            </Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={handleReset}>
              重置
            </Button>
          </Form.Item>
          <Form.Item>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => refetch()}
            >
              刷新
            </Button>
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/aunt/create-resume')}
            >
              新建简历
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 表格 */}
      <Card style={{ marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={resumeList}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: resumeList.length,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* 跟进记录弹窗 */}
      <Modal
        title="添加跟进记录"
        open={followUpVisible}
        onOk={handleFollowUpSubmit}
        onCancel={() => setFollowUpVisible(false)}
        confirmLoading={addFollowUpMutation.isPending}
      >
        <Form form={followUpForm} layout="vertical">
          <Form.Item
            name="type"
            label="跟进类型"
            rules={[{ required: true, message: '请选择跟进类型' }]}
          >
            <Select placeholder="请选择跟进类型">
              <Option value="phone">电话跟进</Option>
              <Option value="visit">上门拜访</Option>
              <Option value="interview">面试</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="跟进内容"
            rules={[{ required: true, message: '请输入跟进内容' }]}
          >
            <TextArea rows={4} placeholder="请输入跟进内容" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ResumeList;