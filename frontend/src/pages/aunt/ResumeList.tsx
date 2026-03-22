import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, App, Modal, Button, Select, Input, Table, Space, Tag, Tooltip, InputNumber, Upload } from 'antd';
import type { TablePaginationConfig, UploadProps } from 'antd';
import { SearchOutlined, ReloadOutlined, CommentOutlined, PlusOutlined, UploadOutlined, InboxOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiService from '../../services/api';
import { createFollowUp } from '@/services/followUp.service';
import { useAuth } from '@/contexts/AuthContext';

const { TextArea } = Input;
const { Option } = Select;

// 接单状态映射
const orderStatusMap: Record<string, { text: string; color: string; icon: string }> = {
  accepting: { text: '想接单', color: '#52c41a', icon: '🟢' },
  'not-accepting': { text: '不接单', color: '#ff4d4f', icon: '🔴' },
  signed: { text: '已签约', color: '#fa8c16', icon: '🟠' },
  'on-service': { text: '已上户', color: '#1890ff', icon: '🔵' }
};

// 工种映射
const jobTypeMap: Record<string, string> = {
  yuesao: '月嫂',
  'zhujia-yuer': '住家育儿嫂',
  'baiban-yuer': '白班育儿',
  baojie: '保洁',
  'baiban-baomu': '白班保姆',
  'zhujia-baomu': '住家保姆',
  yangchong: '养宠',
  xiaoshi: '小时工',
  'zhujia-hulao': '住家护老'
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
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

const ResumeList = () => {
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const canAssign = hasPermission('resume:assign');

  // 分配阿姨弹窗状态
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignTargetResume, setAssignTargetResume] = useState<ResumeData | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ _id: string; name: string; username: string; role: string }>>([]);
  const [assignedToId, setAssignedToId] = useState<string | undefined>(undefined);
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
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    fail: number;
    errors: string[];
  } | null>(null);

  const navigate = useNavigate();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 打开分配弹窗
  const handleOpenAssign = async (record: ResumeData) => {
    setAssignTargetResume(record);
    setAssignedToId(record.assignedTo || undefined);
    setAssignModalVisible(true);
    if (assignableUsers.length === 0) {
      try {
        const res = await apiService.get('/api/resumes/assignable-users');
        if (res.success) setAssignableUsers(res.data || []);
      } catch (e) {
        console.error('获取员工列表失败', e);
      }
    }
  };

  // 确认分配
  const handleConfirmAssign = async () => {
    if (!assignTargetResume || !assignedToId) {
      messageApi.warning('请选择要分配的员工');
      return;
    }
    setAssignLoading(true);
    try {
      const res = await apiService.patch(`/api/resumes/${assignTargetResume._id}/assign`, { assignedTo: assignedToId });
      if (res.success) {
        messageApi.success('分配成功');
        setAssignModalVisible(false);
        fetchResumeList({ ...searchParams, page: currentPage, pageSize });
      } else {
        messageApi.error(res.message || '分配失败');
      }
    } catch (e: any) {
      messageApi.error(e.message || '分配失败');
    } finally {
      setAssignLoading(false);
    }
  };

  // 获取筛选选项
  const fetchFilterOptions = async () => {
    try {
      const response = await apiService.get('/api/resumes/options');

      if (response.success && response.data) {
        setNativePlaceOptions(response.data.nativePlaces || []);
        setEthnicityOptions(response.data.ethnicities || []);
        // console.log('获取筛选选项成功:', response.data);
      } else {
        console.error('获取筛选选项失败:', response.message);
      }
    } catch (error) {
      console.error('获取筛选选项失败:', error);
    }
  };

  // 组件加载时获取筛选选项
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // 监听页面可见性，当从其他页面返回时刷新列表
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('页面变为可见，检查是否需要刷新列表');
        // 页面变为可见时，检查是否需要刷新
        const shouldRefresh = localStorage.getItem('shouldRefreshResumeList');
        console.log('shouldRefresh标记:', shouldRefresh);
        if (shouldRefresh === 'true') {
          console.log('检测到需要刷新，开始刷新列表');
          localStorage.removeItem('shouldRefreshResumeList');
          // 刷新列表数据
          fetchResumeList({
            ...searchParams,
            page: currentPage,
            pageSize,
            _t: Date.now()
          });
        }
      }
    };

    // 立即检查是否需要刷新（用于页面刷新或直接导航的情况）
    const checkImmediate = () => {
      const shouldRefresh = localStorage.getItem('shouldRefreshResumeList');
      if (shouldRefresh === 'true') {
        console.log('页面加载时检测到需要刷新列表');
        localStorage.removeItem('shouldRefreshResumeList');
        // 延迟一小会确保数据已更新
        setTimeout(() => {
          fetchResumeList({
            ...searchParams,
            page: currentPage,
            pageSize,
            _t: Date.now()
          });
        }, 100);
      }
    };

    // 页面加载时立即检查
    checkImmediate();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [searchParams, currentPage, pageSize]);

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

      // console.log('开始请求简历列表，参数:', apiParams);
      // 使用正确的API路径和参数格式
      const response = await apiService.get('/api/resumes', apiParams, {
        timeout: 30000 // 增加超时时间到30秒
      });

      // 清除超时计时器
      clearTimeout(timeoutId);

      // console.log('API响应数据:', response);

      // 检查响应格式
      if (!response || !response.data) {
        throw new Error('服务器返回数据为空');
      }

      // 直接从响应数据中提取 items（因为 axios 拦截器已经处理过）
      const { items: resumes = [], total: totalCount = 0 } = response.data;

      // console.log('解析后的简历数据:', { resumesCount: resumes.length, totalCount, sampleResume: resumes[0] });

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

      console.log('🔥 后端返回的数据（前10条记录）:');
      formattedData.slice(0, 10).forEach((item, index) => {
        const updateTime = item.updatedAt || item.createdAt || '未知';
        console.log(`  ${index + 1}. ${item.name} - 更新时间: ${updateTime}`);
      });

      // 🔥 使用强制排序后的数据
      let filteredData = [...formattedData]; // 创建副本，避免引用问题

      console.log('🔥 最终设置到state的数据（前3条）- 强制排序:');
      filteredData.slice(0, 3).forEach((item, index) => {
        const updateTime = item.updatedAt || item.createdAt || '未知';
        console.log(`  最终${index + 1}. ${item.name} - 更新时间: ${updateTime}`);
      });

      // 直接设置数据，不做任何前端排序
      setResumeList(filteredData);
      setTotal(totalCount); // 使用后端返回的总记录数，而不是前端筛选后的数据长度

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
      // console.log('启动定时检查新简历...');
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

  // 处理Excel导入
  const handleExcelImport: UploadProps['customRequest'] = async (options) => {
    setImportLoading(true);
    setImportResult(null);

    try {
      const { file } = options;
      const uploadFile = file as File;

      // 验证文件类型
      const isExcel =
        uploadFile.name.endsWith('.xlsx') ||
        uploadFile.name.endsWith('.xls') ||
        uploadFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        uploadFile.type === 'application/vnd.ms-excel';

      if (!isExcel) {
        messageApi.error('只支持Excel文件(.xlsx, .xls)');
        setImportLoading(false);
        return;
      }

      // 准备表单数据
      const formData = new FormData();
      formData.append('file', uploadFile);

      // 发送请求
      const response = await apiService.upload('/api/resumes/import-excel', formData);

      if (response.success) {
        messageApi.success(response.message || '导入成功');
        setImportResult(response.data);

        // 刷新列表
        fetchResumeList({
          ...searchParams,
          page: 1,
          pageSize,
          _t: Date.now() // 添加时间戳防止缓存
        });

        // 如果导入全部成功且没有错误，自动关闭弹窗
        if (response.data.success > 0 && response.data.fail === 0) {
          setTimeout(() => {
            setImportModalVisible(false);
          }, 2000);
        }
      } else {
        messageApi.error(response.message || '导入失败');
      }
    } catch (error) {
      console.error('导入Excel失败:', error);
      messageApi.error('导入失败，请检查文件格式或网络连接');
    } finally {
      setImportLoading(false);
    }
  };

  // 下载Excel导入模板
  const downloadExcelTemplate = () => {
    const columns = ['姓名', '手机号', '工种', '性别', '年龄', '籍贯', '民族', '期望薪资', '工作经验', '学历', '接单状态', '身份证号', '微信'];
    const data = [
      ['张三', '13800138000', '月嫂', '女', '35', '四川成都', '汉族', '8000', '5', '高中', '想接单', '', 'wx123'],
      ['李四', '13900139000', '住家育儿嫂', '女', '42', '湖南长沙', '汉族', '9000', '8', '初中', '想接单', '', '']
    ];

    // 创建CSV内容
    let csv = columns.join(',') + '\n';
    data.forEach(row => {
      csv += row.join(',') + '\n';
    });

    // 创建Blob并下载
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '简历导入模板.csv');
    link.style.visibility = 'hidden';

    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 关闭导入结果并重置状态
  const handleCloseImport = () => {
    setImportModalVisible(false);
    setImportResult(null);
  };

  // 表格列定义
  const columns = [
    {
      title: '简历ID',
      dataIndex: 'formattedId',
      key: 'formattedId',
      width: 120,
      render: (text: string, record: ResumeData) => {
        const id = record.id || record._id || '';
        return (
          <Tooltip title={`完整ID: ${id || '未知'}`}>
            <a onClick={() => {
              if (!id) {
                messageApi.warning('简历ID不存在');
                return;
              }
              window.open(`/standalone/aunt/resumes/detail/${id}`, '_blank');
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
      title: '创建来源',
      dataIndex: 'userId',
      key: 'userId',
      render: (userId: string) => {
        if (!userId) {
          return <Tag color="blue">自助注册</Tag>;
        } else {
          return <Tag color="orange">员工创建</Tag>;
        }
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
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (updatedAt: string) => (
        updatedAt ? dayjs(updatedAt).format('YYYY-MM-DD HH:mm') : '-'
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
          {canAssign && (
            <Tooltip title="分配给员工">
              <Button
                icon={<UserSwitchOutlined />}
                size="small"
                onClick={() => handleOpenAssign(record)}
              />
            </Tooltip>
          )}
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
            key="import"
            icon={<UploadOutlined />}
            onClick={() => setImportModalVisible(true)}
            style={{ marginRight: 8 }}
          >
            批量导入
          </Button>,
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

      {/* Excel导入弹窗 */}
      <Modal
        title="批量导入简历"
        open={importModalVisible}
        onCancel={handleCloseImport}
        footer={[
          <Button key="download" onClick={downloadExcelTemplate}>
            下载模板
          </Button>,
          <Button key="cancel" onClick={handleCloseImport}>
            关闭
          </Button>,
        ]}
        destroyOnHidden
      >
        {!importResult ? (
          <div>
            <p>请上传Excel文件，文件第一行必须包含以下列：姓名、手机号、工种</p>
            <p>其他可选列：年龄、性别、期望薪资、工作经验、学历、籍贯、民族、接单状态等</p>
            <p><a onClick={downloadExcelTemplate} style={{ color: '#1890ff', cursor: 'pointer' }}>点击下载模板</a></p>

            <Upload.Dragger
              name="file"
              multiple={false}
              showUploadList={false}
              customRequest={handleExcelImport}
              disabled={importLoading}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 .xlsx, .xls 格式
              </p>
            </Upload.Dragger>
          </div>
        ) : (
          <div>
            <h3>导入结果</h3>
            <p>成功导入: <span style={{ color: 'green', fontWeight: 'bold' }}>{importResult.success}</span> 条</p>
            <p>导入失败: <span style={{ color: 'red', fontWeight: 'bold' }}>{importResult.fail}</span> 条</p>

            {importResult.errors.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>错误信息:</h4>
                <ul style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {importResult.errors.map((error, index) => (
                    <li key={index} style={{ color: 'red' }}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Button onClick={() => setImportResult(null)} style={{ marginRight: 8 }}>
                再次上传
              </Button>
              <Button type="primary" onClick={() => fetchResumeList({ ...searchParams, _t: Date.now() })}>
                刷新列表
              </Button>
            </div>
          </div>
        )}

        {importLoading && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <p>正在导入，请稍候...</p>
          </div>
        )}
      </Modal>

      {/* 分配阿姨弹窗 */}
      <Modal
        title={`分配阿姨：${assignTargetResume?.name || ''}`}
        open={assignModalVisible}
        onOk={handleConfirmAssign}
        onCancel={() => setAssignModalVisible(false)}
        confirmLoading={assignLoading}
        okText="确认分配"
        cancelText="取消"
      >
        <div style={{ marginBottom: 8 }}>选择负责员工：</div>
        <Select
          style={{ width: '100%' }}
          placeholder="请选择员工"
          value={assignedToId}
          onChange={(val) => setAssignedToId(val)}
          showSearch
          optionFilterProp="children"
        >
          {assignableUsers.map(u => (
            <Option key={u._id} value={u._id}>
              {u.name}（{u.username}）
            </Option>
          ))}
        </Select>
      </Modal>
    </PageContainer>
  );
};

export default ResumeList;