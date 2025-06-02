import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, App, Modal, Button, Select, Input, Table, Space, Tag, Tooltip } from 'antd';
import type { TablePaginationConfig } from 'antd';
import { SearchOutlined, ReloadOutlined, CommentOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { TextArea } = Input;
const { Option } = Select;

// 接单状态映射
const orderStatusMap: Record<string, { text: string; color: string; icon: string }> = {
  accepting: { text: '想接单', color: '#52c41a', icon: '🟢' },
  'not-accepting': { text: '不接单', color: '#ff4d4f', icon: '🔴' },
  'on-service': { text: '已上户', color: '#1890ff', icon: '🔵' }
};

// 类型定义
interface SearchParams {
  keyword?: string;
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
  hasMedicalReport: boolean;
  [key: string]: any;
}

const ResumeList = () => {
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();
  const { user } = useAuth();  // 获取当前登录用户信息
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
  const [activeStatusFilter, setActiveStatusFilter] = useState<keyof typeof orderStatusMap | undefined>(undefined);
  
  const navigate = useNavigate();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 获取简历列表
  const fetchResumeList = async (params: SearchParams & { page?: number; pageSize?: number; _t?: number } = {}) => {
    setLoading(true);
    try {
      // 将关键词参数转换为后端API所需的格式
      const apiParams = { ...params };
      
      // 记录搜索关键词用于前端过滤
      const searchKeyword = apiParams.keyword ? apiParams.keyword.toLowerCase() : '';
      
      // 确保orderStatus参数被正确传递
      if (apiParams.orderStatus) {
        // orderStatus已经是正确的值，无需额外处理
      }
      
      console.log('开始请求简历列表，参数:', apiParams);
      // 使用正确的API路径和参数格式
      const response = await apiService.get('/api/resumes', apiParams, {
        timeout: 30000 // 增加超时时间到30秒
      });
      
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
        console.log('处理简历数据:', resume);
        // 确保id存在且为字符串
        if (!resume._id) {
          console.error('简历数据缺少ID字段:', resume);
          return null;
        }
        
        const resumeId = resume._id.toString();
        console.log('简历ID:', resumeId);
        
        // 格式化ID显示
        const formattedId = resumeId.substring(0, 8).padEnd(8, '0');
        
        console.log('格式化后的ID:', formattedId);
        
        return {
          ...resume,
          id: resumeId, // 使用 _id 作为 id
          formattedId,
          hasMedicalReport: resume.medicalReportUrls && resume.medicalReportUrls.length > 0
        };
      }).filter(Boolean);
      
      // 如果有搜索关键词，在前端进行过滤
      if (searchKeyword) {
        formattedData = formattedData.filter((resume: ResumeData) => {
          const searchFields = [
            resume.name,
            resume.phone,
            resume.idNumber,
            resume.id,
            resume.formattedId
          ].map(field => (field || '').toLowerCase());
          
          return searchFields.some(field => field.includes(searchKeyword));
        });
        
        if (formattedData.length === 0) {
          messageApi.info('没有找到匹配的简历');
        }
      }
      
      console.log('最终处理后的数据:', formattedData.slice(0, 2)); // 只打印前两条记录用于调试
      setResumeList(formattedData);
      setTotal(totalCount);
      
      // 保存完整的简历列表到localStorage
      localStorage.setItem('resumeList', JSON.stringify(formattedData));
    } catch (error) {
      console.error('获取简历列表失败:', error);
      messageApi.error('获取简历列表失败，请稍后重试');
      setResumeList([]);
      setTotal(0);
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
  const handleSearch = (values: { keyword?: string }) => {
    const { keyword } = values;
    // 使用一个统一关键词搜索多个字段
    const searchQuery: SearchParams = keyword ? { keyword } : {};
    setSearchParams(searchQuery);
    setCurrentPage(1); // 重置到第一页
  };

  // 处理状态筛选
  const handleStatusFilter = (status: keyof typeof orderStatusMap | undefined) => {
    setActiveStatusFilter(status);
    setSearchParams(prev => ({
      ...prev,
      orderStatus: status
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // 重置搜索
  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
    setActiveStatusFilter(undefined);
    setCurrentPage(1);
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

  // 提交跟进记录 - 使用localStorage代替API
  const handleFollowUpSubmit = async () => {
    try {
      setFollowUpLoading(true);
      const values = await followUpForm.validateFields();
      
      if (!user?.name) {
        messageApi.error('无法获取当前用户信息，请重新登录');
        return;
      }
      
      // 构建跟进记录数据，使用当前登录用户的名字
      const followUpData = {
        id: Date.now().toString(), // 生成临时ID
        resumeId: currentResumeId,
        type: values.type,
        content: values.content,
        createdAt: new Date().toISOString(),
        createdBy: user.name, // 直接使用用户名，不再使用默认值
      };
      
      // 从localStorage获取现有记录
      const existingRecords = JSON.parse(localStorage.getItem('followUpRecords') || '[]');
      
      // 更新旧记录中的 createdBy 字段（如果存在）
      const updatedExistingRecords = existingRecords.map((record: any) => {
        if (record.createdBy === 'current_user') {
          return { ...record, createdBy: user.name };
        }
        return record;
      });
      
      // 添加新记录
      const updatedRecords = [...updatedExistingRecords, followUpData];
      
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
          name="resumeSearch"
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="请输入姓名、手机号、身份证号或简历ID" allowClear />
          </Form.Item>

          <Form.Item label="接单状态" style={{ marginBottom: 0 }}>
            <Select
              style={{ 
                width: 140,
                borderRadius: '6px'
              }}
              placeholder={
                <span style={{ color: '#666' }}>
                  <span style={{ marginRight: 8 }}>📋</span>
                  选择状态
                </span>
              }
              value={activeStatusFilter}
              onChange={handleStatusFilter}
              allowClear
              dropdownStyle={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
              options={[
                { 
                  value: undefined, 
                  label: (
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      padding: '4px 0'
                    }}>
                      <span style={{ marginRight: 8 }}>📋</span>
                      全部状态
                    </span>
                  )
                },
                ...Object.entries(orderStatusMap).map(([status, { text, color, icon }]) => ({
                  value: status,
                  label: (
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      padding: '4px 0',
                      color: activeStatusFilter === status ? color : 'inherit'
                    }}>
                      <span style={{ 
                        marginRight: 8,
                        fontSize: '14px'
                      }}>
                        {icon}
                      </span>
                      {text}
                    </span>
                  )
                }))
              ]}
              optionLabelProp="label"
              dropdownRender={menu => (
                <div>
                  <div style={{ 
                    padding: '8px 12px', 
                    borderBottom: '1px solid #f0f0f0',
                    color: '#666',
                    fontSize: '12px'
                  }}>
                    选择接单状态进行筛选
                  </div>
                  {menu}
                </div>
              )}
            />
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