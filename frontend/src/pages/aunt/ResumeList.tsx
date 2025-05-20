import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, message, Modal, Button, Select, Input, Table, Space, Tag, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, CommentOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

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
  const [messageApi, contextHolder] = message.useMessage();
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpVisible, setFollowUpVisible] = useState(false);
  const [followUpForm] = Form.useForm();
  const [currentResumeId, setCurrentResumeId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState({});
  const [loading, setLoading] = useState(false);
  const [resumeList, setResumeList] = useState([]);
  const [total, setTotal] = useState(0);
  
  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);

  // 获取简历列表
  const fetchResumeList = async (params = {}) => {
    setLoading(true);
    try {
      // 将关键词参数转换为后端API所需的格式
      const apiParams = { ...params };
      
      // 记录搜索关键词用于前端过滤
      const searchKeyword = apiParams.keyword ? apiParams.keyword.toLowerCase() : '';
      
      console.log('尝试连接API: /api/resumes');
      // 使用相对路径，让Vite代理处理
      const response = await axios.get('/api/resumes', { 
        params: apiParams,
        timeout: 30000, // 增加超时时间到30秒
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log('获取简历列表:', response.data);
      
      // 适配API返回的新格式
      const resumes = response.data.success && response.data.data ? 
        (response.data.data.items || []) : 
        (Array.isArray(response.data) ? response.data : []);
      
      const totalCount = response.data.success && response.data.data ? 
        (response.data.data.total || 0) : 
        (resumes.length);
      
      // 格式化数据
      let formattedData = resumes.map(resume => ({
        ...resume,
        // 使用ID的前8位字符
        formattedId: resume.id ? 
          resume.id.substring(0, 8).padEnd(8, '0') : 
          '未知ID',
        // 检查是否有体检报告
        hasMedicalReport: resume.medicalReportUrls && resume.medicalReportUrls.length > 0
      }));
      
      // 如果有搜索关键词，在前端进行过滤
      if (searchKeyword) {
        formattedData = formattedData.filter(resume => {
          // 在多个字段中搜索关键词
          return (
            (resume.name && resume.name.toLowerCase().includes(searchKeyword)) ||
            (resume.phone && resume.phone.includes(searchKeyword)) ||
            (resume.idCard && resume.idCard.includes(searchKeyword)) ||
            (resume.id && resume.id.toLowerCase().includes(searchKeyword)) ||
            (resume.formattedId && resume.formattedId.toLowerCase().includes(searchKeyword))
          );
        });
        
        if (formattedData.length === 0) {
          messageApi.info('没有找到匹配的简历');
        }
      }
      
      setResumeList(formattedData);
      setTotal(totalCount); // 使用API返回的总数
    } catch (error) {
      console.error('获取简历列表失败:', error);
      messageApi.error('获取简历列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和搜索参数变化时获取数据
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // 延迟执行搜索，防止频繁请求
    searchTimeoutRef.current = setTimeout(() => {
      fetchResumeList({
        ...searchParams,
        page: currentPage,
        pageSize
      });
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchParams, currentPage, pageSize]);

  // 添加定时刷新功能
  useEffect(() => {
    // 设置定时器，每60秒刷新一次数据，检查是否有新简历
    const intervalId = setInterval(() => {
      console.log('定时检查新简历...');
      fetchResumeList({
        ...searchParams,
        page: currentPage,
        pageSize,
        _t: Date.now() // 添加时间戳防止缓存
      });
    }, 60000); // 1分钟刷新一次
    
    // 组件卸载时清除定时器
    return () => {
      clearInterval(intervalId);
    };
  }, [searchParams, currentPage, pageSize]);

  // 处理搜索
  const handleSearch = (values) => {
    const { keyword } = values;
    // 使用一个统一关键词搜索多个字段
    const searchQuery = keyword ? { keyword } : {};
    setSearchParams(searchQuery);
    setCurrentPage(1); // 重置到第一页
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

  // 提交跟进记录 - 使用localStorage代替API
  const handleFollowUpSubmit = async () => {
    try {
      setFollowUpLoading(true);
      const values = await followUpForm.validateFields();
      
      // 构建跟进记录数据
      const followUpData = {
        id: Date.now().toString(), // 生成临时ID
        resumeId: currentResumeId,
        type: values.type,
        content: values.content,
        createdAt: new Date().toISOString(),
        createdBy: 'current_user', // 应当从登录信息中获取
      };
      
      // 从localStorage获取现有记录
      const existingRecords = JSON.parse(localStorage.getItem('followUpRecords') || '[]');
      
      // 添加新记录
      const updatedRecords = [...existingRecords, followUpData];
      
      // 保存回localStorage
      localStorage.setItem('followUpRecords', JSON.stringify(updatedRecords));
      
      messageApi.success('添加跟进记录成功');
      setFollowUpVisible(false);
      followUpForm.resetFields();
      
      // 刷新列表
      fetchResumeList({
        ...searchParams,
        page: currentPage,
        pageSize
      });
    } catch (error) {
      console.error('添加跟进记录失败:', error);
      messageApi.error('添加跟进记录失败，请重试');
    } finally {
      setFollowUpLoading(false);
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
        const statusInfo = orderStatusMap[status] || { text: '未知', color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '体检报告',
      dataIndex: 'hasMedicalReport',
      key: 'hasMedicalReport',
      render: (hasMedicalReport) => (
        hasMedicalReport ? 
          <Tag color="green">有</Tag> : 
          <Tag color="red">无</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="添加跟进记录">
            <Button 
              type="primary" 
              icon={<CommentOutlined />} 
              size="small" 
              onClick={() => handleFollowUp(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 显示自动刷新状态的组件
  const AutoRefreshIndicator = () => (
    <div style={{ textAlign: 'right', marginBottom: 8 }}>
      <Tag color="processing" icon={<ReloadOutlined spin />}>
        自动检查新简历
      </Tag>
    </div>
  );

  return (
    <PageContainer
      header={{
        title: '简历列表',
        extra: [
          <Button 
            key="add" 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/aunt/create-resume')}
          >
            新建简历
          </Button>
        ],
      }}
    >
      {contextHolder}
      
      {/* 查询表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={form}
          name="resumeSearch"
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="请输入姓名、手机号、身份证号或简历ID" allowClear />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      
      {/* 数据表格 */}
      <Card>
        <AutoRefreshIndicator />
        <Table
          columns={columns}
          dataSource={resumeList}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* 跟进记录弹窗 */}
      <Modal
        title="添加跟进记录"
        open={followUpVisible}
        onCancel={() => setFollowUpVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setFollowUpVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={followUpLoading}
            onClick={handleFollowUpSubmit}
          >
            提交
          </Button>,
        ]}
        destroyOnClose
      >
        <Form
          form={followUpForm}
          layout="vertical"
          initialValues={{ type: 'phone' }}
        >
          <Form.Item
            name="type"
            label="跟进类型"
            rules={[{ required: true, message: '请选择跟进类型' }]}
          >
            <Select>
              <Option value="phone">电话沟通</Option>
              <Option value="interview">面试</Option>
              <Option value="offer">录用</Option>
              <Option value="reject">拒绝</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="跟进内容"
            rules={[{ required: true, message: '请输入跟进内容' }]}
          >
            <TextArea rows={4} placeholder="请输入跟进内容" maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ResumeList;