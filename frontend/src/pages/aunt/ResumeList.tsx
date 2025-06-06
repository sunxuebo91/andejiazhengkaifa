import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, App, Modal, Button, Select, Input, Table, Space, Tag, Tooltip, InputNumber } from 'antd';
import type { TablePaginationConfig } from 'antd';
import { SearchOutlined, ReloadOutlined, CommentOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import { createFollowUp } from '@/services/followUp.service';

const { TextArea } = Input;
const { Option } = Select;

// 接单状态映射
const orderStatusMap: Record<string, { text: string; color: string; icon: string }> = {
  accepting: { text: '想接单', color: '#52c41a', icon: '🟢' },
  'not-accepting': { text: '不接单', color: '#ff4d4f', icon: '🔴' },
  'on-service': { text: '已上户', color: '#1890ff', icon: '🔵' }
};

// 工种映射
const jobTypeMap: Record<string, string> = {
  yuexin: '月嫂',
  'zhujia-yuer': '住家育儿嫂',
  'baiban-yuer': '白班育儿',
  baojie: '保洁',
  'baiban-baomu': '白班保姆',
  'zhujia-baomu': '住家保姆',
  yangchong: '养宠',
  xiaoshi: '小时工'
};

// 类型定义
interface SearchParams {
  keyword?: string;
  jobType?: string;
  maxAge?: number;
  nativePlace?: string;
  ethnicity?: string;
  orderStatus?: keyof typeof orderStatusMap;
}

interface ResumeData {
  _id: string;
  id: string;
  formattedId: string;
  name: string;
  phone: string;
  age: number;
  gender: 'male' | 'female';
  nativePlace: string;
  orderStatus: keyof typeof orderStatusMap;
  jobType: string;
  hasMedicalReport: boolean;
  [key: string]: any;
}

const ResumeList = () => {
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpVisible, setFollowUpVisible] = useState(false);
  const [followUpForm] = Form.useForm();
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState<SearchParams>({});
  const [loading, setLoading] = useState(false);
  const [resumeList, setResumeList] = useState<ResumeData[]>([]);
  const [total, setTotal] = useState(0);
  const [nativePlaceOptions, setNativePlaceOptions] = useState<string[]>([]);
  const [ethnicityOptions, setEthnicityOptions] = useState<string[]>([]);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  
  const navigate = useNavigate();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 获取简历列表
  const fetchResumeList = async (params: SearchParams & { page?: number; pageSize?: number; _t?: number } = {}) => {
    setLoading(true);
    
    // 添加超时控制
    const timeoutId = setTimeout(() => {
      setLoading(false);
      messageApi.error('请求超时，请重试');
    }, 10000); // 10秒超时
    
    try {
      // 将所有筛选参数传递给后端API
      const apiParams = { ...params };
      
      console.log('开始请求简历列表，参数:', apiParams);
      // 使用正确的API路径和参数格式
      const response = await apiService.get('/api/resumes', apiParams, {
        timeout: 30000 // 增加超时时间到30秒
      });
      
      // 清除超时计时器
      clearTimeout(timeoutId);
      
      console.log('API响应数据:', response);
      
      // 检查响应格式
      if (!response || !response.data) {
        throw new Error('服务器返回数据为空');
      }
      
      // 直接从响应数据中提取 items（因为 axios 拦截器已经处理过）
      const { items: resumes = [], total: totalCount = 0 } = response.data;
      
      console.log('解析后的简历数据:', { resumesCount: resumes.length, totalCount, sampleResume: resumes[0] });
      
      // 格式化数据
      let formattedData: ResumeData[] = resumes.map((resume: any) => {
        // 确保id存在且为字符串
        if (!resume._id) {
          console.error('简历数据缺少ID字段:', resume);
          return null;
        }
        
        const resumeId = resume._id.toString();
        
        // 格式化ID显示
        const formattedId = resumeId.substring(0, 8).padEnd(8, '0');
        
        return {
          ...resume,
          id: resumeId, // 使用 _id 作为 id
          formattedId,
          hasMedicalReport: resume.medicalReportUrls && resume.medicalReportUrls.length > 0
        };
      }).filter(Boolean);
      
      // 收集所有不同的籍贯和民族选项，用于下拉列表
      const nativePlaces = new Set<string>();
      const ethnicities = new Set<string>();
      
      formattedData.forEach((resume) => {
        if (resume.nativePlace) nativePlaces.add(resume.nativePlace);
        if (resume.ethnicity) ethnicities.add(resume.ethnicity);
      });
      
      setNativePlaceOptions(Array.from(nativePlaces).sort());
      setEthnicityOptions(Array.from(ethnicities).sort());
      
      // 应用前端筛选
      let filteredData = [...formattedData]; // 创建副本，避免引用问题
      
      // 1. 关键词筛选已经在后端处理，这里只进行额外的前端筛选
      
      // 2. 工种筛选
      if (params.jobType) {
        filteredData = filteredData.filter(resume => 
          resume.jobType === params.jobType
        );
      }
      
      // 3. 年龄筛选 (≤X岁)
      if (params.maxAge !== undefined && params.maxAge !== null) {
        filteredData = filteredData.filter(resume => 
          resume.age !== undefined && resume.age <= params.maxAge!
        );
      }
      
      // 4. 籍贯筛选
      if (params.nativePlace) {
        filteredData = filteredData.filter(resume => 
          resume.nativePlace === params.nativePlace
        );
      }
      
      // 5. 民族筛选
      if (params.ethnicity) {
        filteredData = filteredData.filter(resume => 
          resume.ethnicity === params.ethnicity
        );
      }
      
      // 6. 接单状态筛选
      if (params.orderStatus) {
        filteredData = filteredData.filter(resume => 
          resume.orderStatus === params.orderStatus
        );
      }
      
      if (formattedData.length > 0 && filteredData.length === 0) {
        messageApi.info('没有找到匹配的简历');
      }
      
      console.log('最终处理后的数据:', filteredData.slice(0, 2)); // 只打印前两条记录用于调试
      setResumeList(filteredData);
      setTotal(filteredData.length); // 只显示筛选后的总数
      
      // 保存原始简历列表到localStorage
      localStorage.setItem('resumeList', JSON.stringify(formattedData));
    } catch (error) {
      // 清除超时计时器
      clearTimeout(timeoutId);
      
      console.error('获取简历列表失败:', error);
      messageApi.error('获取简历列表失败，请稍后重试');
      setResumeList([]);
      setTotal(0);
    } finally {
      // 清除超时计时器
      clearTimeout(timeoutId);
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
    }, 500); // 增加到500ms的防抖时间
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchParams, currentPage, pageSize]);

  // 添加定时刷新功能
  useEffect(() => {
    // 清除之前的定时器
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
    
    // 只有在启用自动刷新且没有筛选条件时才设置定时器
    if (autoRefreshEnabled && Object.keys(searchParams).length === 0) {
      console.log('启动定时检查新简历...');
      // 设置定时器，每60秒刷新一次数据，检查是否有新简历
      autoRefreshIntervalRef.current = setInterval(() => {
        console.log('定时检查新简历...');
        // 只使用分页参数，不带筛选条件
        fetchResumeList({
          page: currentPage,
          pageSize,
          _t: Date.now() // 添加时间戳防止缓存
        });
      }, 60000); // 1分钟刷新一次
    }
    
    // 组件卸载时清除定时器
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled, searchParams, currentPage, pageSize]);

  // 切换自动刷新
  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(prev => !prev);
  };

  // 处理搜索
  const handleSearch = (values: {
    keyword?: string;
    jobType?: string;
    maxAge?: number;
    nativePlace?: string;
    ethnicity?: string;
    orderStatus?: keyof typeof orderStatusMap;
  }) => {
    // 如果正在加载，不处理
    if (loading) return;
    
    const { keyword, jobType, maxAge, nativePlace, ethnicity, orderStatus } = values;
    
    // 构建搜索参数
    const searchQuery: SearchParams = {};
    
    if (keyword) searchQuery.keyword = keyword;
    if (jobType) searchQuery.jobType = jobType;
    if (maxAge !== undefined && maxAge !== null) searchQuery.maxAge = maxAge;
    if (nativePlace) searchQuery.nativePlace = nativePlace;
    if (ethnicity) searchQuery.ethnicity = ethnicity;
    if (orderStatus) searchQuery.orderStatus = orderStatus;
    
    // 如果有筛选条件，自动禁用自动刷新
    if (Object.keys(searchQuery).length > 0 && autoRefreshEnabled) {
      setAutoRefreshEnabled(false);
      messageApi.info('已应用筛选条件，自动刷新已暂停');
    }
    
    console.log('搜索参数:', searchQuery);
    
    setSearchParams(searchQuery);
    setCurrentPage(1); // 重置到第一页
  };

  // 重置搜索
  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
    setCurrentPage(1);
    
    // 恢复自动刷新
    if (!autoRefreshEnabled) {
      setAutoRefreshEnabled(true);
      messageApi.success('已重置筛选条件，自动刷新已恢复');
    } else {
      messageApi.success('已重置筛选条件');
    }
  };

  // 处理分页变化
  const handleTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) {
      setCurrentPage(pagination.current);
    }
    if (pagination.pageSize) {
      setPageSize(pagination.pageSize);
    }
  };

  // 打开跟进记录弹窗
  const handleFollowUp = (resumeId: string) => {
    setCurrentResumeId(resumeId);
    setFollowUpVisible(true);
    followUpForm.resetFields();
  };

  // 提交跟进记录 - 使用API代替localStorage
  const handleFollowUpSubmit = async () => {
    try {
      setFollowUpLoading(true);
      const values = await followUpForm.validateFields();
      
      if (!currentResumeId) {
        messageApi.error('简历ID不存在');
        return;
      }
      
      // 调用API创建跟进记录
      await createFollowUp({
        resumeId: currentResumeId,
        type: values.type,
        content: values.content,
      });
      
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
      width: 120,
      render: (text: string, record: ResumeData) => {
        console.log('渲染简历ID:', { text, record });
        const id = record.id || record._id || '';
        return (
          <Tooltip title={`完整ID: ${id || '未知'}`}>
            <a onClick={() => {
              if (!id) {
                messageApi.warning('简历ID不存在');
                return;
              }
              console.log('导航到简历详情:', { formattedId: record.formattedId, fullId: id });
              navigate(`/aunt/resumes/detail/${id}`); // 使用完整ID
            }}>
              {text || '未知ID'}
            </a>
          </Tooltip>
        );
      },
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '工种',
      dataIndex: 'jobType',
      key: 'jobType',
      render: (jobType: string) => jobTypeMap[jobType] || jobType || '-',
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
      render: (gender: 'male' | 'female') => gender === 'male' ? '男' : gender === 'female' ? '女' : gender || '-',
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
      render: (status: keyof typeof orderStatusMap) => {
        const statusInfo = orderStatusMap[status] || { text: '未知', color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '体检报告',
      dataIndex: 'hasMedicalReport',
      key: 'hasMedicalReport',
      render: (hasMedicalReport: boolean) => (
        hasMedicalReport ? 
          <Tag color="green">有</Tag> : 
          <Tag color="red">无</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ResumeData) => (
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
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, alignItems: 'center' }}>
      <Button 
        type={autoRefreshEnabled ? "primary" : "default"}
        size="small"
        icon={<ReloadOutlined spin={autoRefreshEnabled} />}
        onClick={toggleAutoRefresh}
        style={{ marginRight: 8 }}
      >
        {autoRefreshEnabled ? '自动刷新已开启' : '自动刷新已关闭'}
      </Button>
      {autoRefreshEnabled && (
        <Tag color="processing" icon={<ReloadOutlined spin />}>
          每60秒自动检查新简历
        </Tag>
      )}
      {Object.keys(searchParams).length > 0 && (
        <Tag color="warning" icon={<SearchOutlined />}>
          已应用筛选条件
        </Tag>
      )}
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
            onClick={() => {
              localStorage.removeItem('editingResume');
              navigate('/aunt/create-resume');
            }}
          >
            新建简历
          </Button>
        ],
      }}
    >
      {/* 查询表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={form}
          onFinish={handleSearch}
          style={{ marginBottom: 8 }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <Form.Item name="keyword" style={{ marginBottom: 0 }}>
              <Input
                placeholder="关键词(姓名/手机号)"
                prefix={<SearchOutlined />}
                allowClear
                style={{ width: '180px' }}
              />
            </Form.Item>
            
            <Form.Item name="jobType" style={{ marginBottom: 0 }}>
              <Select 
                placeholder="工种" 
                allowClear
                options={Object.entries(jobTypeMap).map(([value, label]) => ({ value, label }))}
                style={{ width: '140px' }}
              />
            </Form.Item>
            
            <Form.Item name="maxAge" style={{ marginBottom: 0 }}>
              <InputNumber
                placeholder="≤年龄"
                min={0}
                max={100}
                style={{ width: '100px' }}
              />
            </Form.Item>
            
            <Form.Item name="nativePlace" style={{ marginBottom: 0 }}>
              <Select 
                placeholder="籍贯" 
                allowClear
                options={nativePlaceOptions.map(value => ({ value, label: value }))}
                style={{ width: '140px' }}
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string).toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
            
            <Form.Item name="ethnicity" style={{ marginBottom: 0 }}>
              <Select 
                placeholder="民族" 
                allowClear
                options={ethnicityOptions.map(value => ({ value, label: value }))}
                style={{ width: '120px' }}
              />
            </Form.Item>
            
            <Form.Item name="orderStatus" style={{ marginBottom: 0 }}>
              <Select 
                placeholder="接单状态" 
                allowClear
                options={Object.entries(orderStatusMap).map(([value, { text }]) => ({ value, label: text }))}
                style={{ width: '120px' }}
              />
            </Form.Item>
            
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                查询
              </Button>
            </Form.Item>
            
            <Form.Item style={{ marginBottom: 0 }}>
              <Button onClick={handleReset} icon={<ReloadOutlined />} disabled={loading}>
                重置
              </Button>
            </Form.Item>
          </div>
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
              <Option value="wechat">微信沟通</Option>
              <Option value="visit">到店沟通</Option>
              <Option value="interview">面试沟通</Option>
              <Option value="signed">已签单</Option>
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