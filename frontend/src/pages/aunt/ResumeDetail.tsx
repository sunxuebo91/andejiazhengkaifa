import { PageContainer } from '@ant-design/pro-components';
import { Card, Descriptions, Button, Spin, message, Image, Tag, Modal, Form, Input, Select, DatePicker, Upload, Typography, Divider, Row, Col, Tooltip, Table, Space } from 'antd';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { EditOutlined, SaveOutlined, ArrowLeftOutlined, FilePdfOutlined, EyeOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
// 添加dayjs插件
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import customParseFormat from 'dayjs/plugin/customParseFormat';
// 注册插件
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

dayjs.extend(customParseFormat);
const { Option } = Select;

// 中国省份/地区常量数据
const provinces = [
  // 23个省
  '河北省', '山西省', '辽宁省', '吉林省', '黑龙江省', '江苏省', '浙江省', '安徽省', 
  '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省', '广东省', '海南省', 
  '四川省', '贵州省', '云南省', '陕西省', '甘肃省', '青海省', '台湾省',
  // 4个直辖市
  '北京市', '天津市', '上海市', '重庆市',
  // 5个自治区
  '广西壮族自治区', '内蒙古自治区', '西藏自治区', '宁夏回族自治区', '新疆维吾尔自治区',
  // 2个特别行政区
  '香港特别行政区', '澳门特别行政区'
];

// 中国56个民族常量数据
const ethnicities = [
  '汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族', '布依族', '朝鲜族',
  '满族', '侗族', '瑶族', '白族', '土家族', '哈尼族', '哈萨克族', '傣族', '黎族', '傈僳族',
  '佤族', '畲族', '高山族', '拉祜族', '水族', '东乡族', '纳西族', '景颇族', '柯尔克孜族', '土族',
  '达斡尔族', '仫佬族', '羌族', '布朗族', '撒拉族', '毛南族', '仡佬族', '锡伯族', '阿昌族', '普米族',
  '塔吉克族', '怒族', '乌孜别克族', '俄罗斯族', '鄂温克族', '德昂族', '保安族', '裕固族', '京族', '塔塔尔族',
  '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族', '基诺族'
];

// 教育程度映射
const educationMap = {
  no: '无学历',
  primary: '小学',
  middle: '初中',
  secondary: '中专',
  vocational: '职高',
  high: '高中',
  college: '大专',
  bachelor: '本科',
  graduate: '研究生及以上'
};

// 婚姻状况映射
const maritalStatusMap = {
  single: '未婚',
  married: '已婚',
  divorced: '离异',
  widowed: '丧偶'
};

// 宗教信仰映射
const religionMap = {
  none: '无',
  buddhism: '佛教',
  christianity: '基督教',
  islam: '伊斯兰教',
  catholicism: '天主教',
  hinduism: '印度教',
  taoism: '道教',
  protestantism: '新教',
  orthodoxy: '东正教'
};

// 性别映射
const genderMap = {
  male: '男',
  female: '女',
  '男': '男',
  '女': '女'
};

// 生肖映射
const zodiacMap = {
  rat: '鼠',
  ox: '牛',
  tiger: '虎',
  rabbit: '兔',
  dragon: '龙',
  snake: '蛇',
  horse: '马',
  goat: '羊',
  monkey: '猴',
  rooster: '鸡',
  dog: '狗',
  pig: '猪'
};

// 星座映射
const zodiacSignMap = {
  capricorn: '摩羯座',
  aquarius: '水瓶座',
  pisces: '双鱼座',
  aries: '白羊座',
  taurus: '金牛座',
  gemini: '双子座',
  cancer: '巨蟹座',
  leo: '狮子座',
  virgo: '处女座',
  libra: '天秤座',
  scorpio: '天蝎座',
  sagittarius: '射手座'
};

// 工种映射
const jobTypeMap = {
  yuexin: '月嫂',
  'zhujia-yuer': '住家育儿嫂',
  'baiban-yuer': '白班育儿',
  baojie: '保洁',
  'baiban-baomu': '白班保姆',
  'zhujia-baomu': '住家保姆',
  yangchong: '养宠',
  xiaoshi: '小时工'
};

// 接单状态映射
const orderStatusMap = {
  accepting: '想接单',
  'not-accepting': '不接单',
  'on-service': '已上户'
};

// 技能标签映射
const skillsMap = {
  chanhou: '产后修复',
  'teshu-yinger': '特殊婴儿护理',
  yiliaobackground: '医疗背景',
  yuying: '育婴师',
  zaojiao: '早教',
  fushi: '辅食',
  ertui: '儿推',
  waiyu: '外语',
  zhongcan: '中餐',
  xican: '西餐',
  mianshi: '面食',
  jiashi: '驾驶',
  shouyi: '整理收纳'
};

// 线索来源映射
const leadSourceMap = {
  referral: '转介绍',
  'paid-lead': '付费线索',
  community: '社群线索',
  'door-to-door': '地推',
  'shared-order': '合单',
  other: '其他'
};

const ResumeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [form] = Form.useForm();

  // 跟进记录相关状态
  const [followUpRecords, setFollowUpRecords] = useState<any[]>([]);
  const [isAddFollowUpVisible, setIsAddFollowUpVisible] = useState(false);
  const [followUpForm] = Form.useForm();
  const [followUpLoading, setFollowUpLoading] = useState(false);
  
  // 使用React Query获取简历详情
  const { 
    data: resumeQueryData,
    isLoading: isLoadingResume,
    error: resumeError,
    refetch: refetchResume
  } = useResumeDetail(id || '');

  // 添加跟进记录
  const addFollowUpMutation = useAddFollowUp(id || '');
  
  // 当React Query数据变化时设置简历数据
  useEffect(() => {
    if (resumeQueryData) {
      console.log('React Query获取的简历数据:', resumeQueryData);
      let resumeData = resumeQueryData;
      
      // 处理工作经验数据
      const formattedWorkExperience = formatWorkExperiences(resumeData);
      
      // 更新简历数据，确保统一使用workExperiences字段
      const updatedResumeData = {
        ...resumeData,
        workExperiences: formattedWorkExperience
      };
      
      // 确保生日字段格式化
      if (updatedResumeData.birthDate) {
        updatedResumeData.birthDate = dayjs(updatedResumeData.birthDate);
      }
      
      setResume(updatedResumeData);
      setLoading(false);
    } else if (!isLoadingResume) {
      setLoading(false);
    }
  }, [resumeQueryData, isLoadingResume]);
  
  // 处理React Query错误
  useEffect(() => {
    if (resumeError) {
      console.error('获取简历详情失败:', resumeError);
      message.error('获取简历详情失败');
      setLoading(false);
    }
  }, [resumeError]);

  // 在组件内部处理数据前的函数，处理工作经历的日期格式
  const formatWorkExperiences = (data) => {
    // 获取工作经历数据，支持两种字段名
    const workExps = data.workExperiences || data.workExperience || [];
    
    // 确保是数组
    const workExpsArray = Array.isArray(workExps) ? workExps : [workExps].filter(Boolean);
    
    console.log("处理工作经历前的数据:", workExpsArray);
    
    if (!workExpsArray || workExpsArray.length === 0) {
      return [];
    }
    
    return workExpsArray
      .filter(exp => exp !== null && exp !== undefined)
      .map(exp => {
        // 查看完整的工作经历对象
        console.log("工作经历完整对象:", JSON.stringify(exp));
        
        // 更健壮的检查，确保startDate和endDate即使是空字符串也显示为'-'
        const startDate = exp.startDate && String(exp.startDate).trim() !== '' ? String(exp.startDate) : '-';
        const endDate = exp.endDate && String(exp.endDate).trim() !== '' ? String(exp.endDate) : '-';
        const description = exp.description || '-';
        
        console.log("格式化后的日期:", {startDate, endDate});
        
        return {
          ...exp,
          startDate,
          endDate,
          description
        };
      });
  };

  // 获取简历详情 - 保留原始方法作为备份
  const fetchResumeDetail = async () => {
    setLoading(true);
    try {
      console.log('正在获取简历详情，ID:', id);
      const response = await axios.get(`/api/resumes/${id}`);
      console.log('原始API响应:', response);

      // 获取简历数据
      let resumeData = response.data;
      if (typeof resumeData === 'string') {
        resumeData = JSON.parse(resumeData);
      }
      
      // 处理API返回的嵌套结构
      if (resumeData && resumeData.code === 0 && resumeData.data) {
        resumeData = resumeData.data;
      }

      // 处理工作经验数据
      const formattedWorkExperience = formatWorkExperiences(resumeData);
      console.log('格式化后的工作经历:', formattedWorkExperience);

      // 更新简历数据，确保统一使用workExperiences字段
      const updatedResumeData = {
        ...resumeData,
        workExperiences: formattedWorkExperience
      };
      
      // 确保生日字段格式化
      if (updatedResumeData.birthDate) {
        updatedResumeData.birthDate = dayjs(updatedResumeData.birthDate);
      }

      // 设置简历数据到状态
      console.log('处理后的简历数据:', updatedResumeData);
      setResume(updatedResumeData);
    } catch (error) {
      console.error('获取简历详情失败:', error);
      message.error('获取简历详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 使用React Query代替直接API调用
  useEffect(() => {
    if (id) {
      // 删除以下注释，使用传统方法
      // fetchResumeDetail();
    }
  }, [id]);

  // 处理编辑操作 - 将数据存储到localStorage并跳转到创建页面
  const handleEdit = () => {
    if (resume) {
      console.log('保存简历数据到localStorage以便编辑:', resume);
      // 将简历数据存储到localStorage
      localStorage.setItem('editingResume', JSON.stringify(resume));
      // 导航到创建简历页面，带上edit=true参数
      navigate('/aunt/create-resume?edit=true');
      message.success('已进入编辑模式');
    } else {
      message.error('无法获取简历数据');
    }
  };

  // 处理保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      console.log('验证通过，表单数据:', values);
      
      // 准备提交数据：处理日期字段
      const formData = {
        ...values,
        birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : undefined,
        // 处理工作经验的日期格式化
        workExperiences: values.workExperience?.map(item => {
          console.log('处理工作经历项:', item);
          // 确保每个对象都是有效的
          if (!item) return null;
          
          return {
            ...item,
            // 如果有日期对象，则格式化为字符串；如果无效则使用空字符串
            startDate: item.startDate && typeof item.startDate.format === 'function' 
              ? item.startDate.format('YYYY-MM') 
              : (item.startDate || ''),
            endDate: item.endDate && typeof item.endDate.format === 'function' 
              ? item.endDate.format('YYYY-MM') 
              : (item.endDate || ''),
          };
        }).filter(item => item !== null) || [],
      };
      
      console.log('准备提交的数据:', formData);
      
      // 提交更新的简历数据
      await axios.put(`/api/resumes/${id}`, formData);
      message.success('简历更新成功');
      
      // 刷新数据
      fetchResumeDetail();
      setIsEditing(false);
      setEditModalVisible(false);
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败，请检查表单填写是否正确');
    }
  };

  // 处理取消编辑
  const handleCancel = () => {
    setIsEditing(false);
    setEditModalVisible(false);
    form.resetFields();
  };

  // 处理图片预览
  const handlePreview = (url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };

  // 渲染文件预览
  const renderFilePreview = (url: string, index: number) => {
    if (!url) return null;

    console.log(`渲染文件预览，URL: ${url}, 索引: ${index}`);
    const isPdf = url.toLowerCase().endsWith('.pdf');
    
    // 使用原始URL，不做任何编码/解码处理
    return (
      <div key={index} style={{ display: 'inline-block', margin: '0 8px 8px 0' }}>
        {isPdf ? (
          <div style={{ 
            width: 100, 
            height: 100, 
            border: '1px solid #d9d9d9', 
            borderRadius: 2, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            background: '#f5f5f5'
          }}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
            </a>
          </div>
        ) : (
          <div style={{ 
            width: 100, 
            height: 100, 
            border: '1px solid #d9d9d9', 
            borderRadius: 2, 
            overflow: 'hidden',
            position: 'relative'
          }}>
            <img 
              src={url} 
              alt={`文件预览-${index}`} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onClick={() => handlePreview(url)}
              onError={(e) => {
                console.error(`图片加载失败: ${url}`);
                // 设置为默认占位图
                e.currentTarget.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // 处理工作经历显示卡片
  const renderWorkExperiences = () => {
    console.log("工作经历数据状态:", resume?.workExperiences);
    
    if (!resume?.workExperiences || !Array.isArray(resume.workExperiences) || resume.workExperiences.length === 0) {
      console.log("无工作经历数据，显示空状态");
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>暂无工作经历</div>
      );
    }

    console.log("渲染工作经历列表:", resume.workExperiences);
    
    return resume.workExperiences.map((exp, index) => {
      if (!exp) return null; // 跳过无效的工作经历
      
      console.log(`渲染工作经历 ${index+1}:`, exp);
      
      return (
        <Card 
          key={index} 
          type="inner" 
          title={`工作经历 ${index + 1}`} 
          style={{ marginBottom: 16 }}
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label="开始时间">
              {exp.startDate || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {exp.endDate || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="工作简介" span={2}>
              {exp.description || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      );
    });
  };

  // 获取跟进记录
  const fetchFollowUpRecords = async () => {
    try {
      // 从localStorage获取所有跟进记录
      const allRecords = JSON.parse(localStorage.getItem('followUpRecords') || '[]');
      
      // 筛选出当前简历的跟进记录
      const resumeRecords = allRecords.filter(record => record.resumeId === id);
      
      console.log('从localStorage获取跟进记录:', resumeRecords);
      setFollowUpRecords(resumeRecords);
    } catch (error) {
      console.error('获取跟进记录失败:', error);
      message.error('获取跟进记录失败');
    }
  };
  
  // 组件加载时获取跟进记录
  useEffect(() => {
    if (id) {
      fetchFollowUpRecords();
    }
  }, [id]);
  
  // 添加跟进记录
  const handleAddFollowUp = async (values: any) => {
    try {
      setFollowUpLoading(true);
      
      // 创建新的跟进记录
      const followUpData = {
        id: Date.now().toString(), // 生成临时ID
        resumeId: id,
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
      
      message.success('添加跟进记录成功');
      setIsAddFollowUpVisible(false);
      followUpForm.resetFields();
      fetchFollowUpRecords(); // 刷新跟进记录列表
    } catch (error) {
      console.error('添加跟进记录失败:', error);
      message.error('添加跟进记录失败');
    } finally {
      setFollowUpLoading(false);
    }
  };
  
  // 跟进记录表格列定义
  const followUpColumns = [
    {
      title: '跟进时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '跟进人员',
      dataIndex: 'createdBy',
      key: 'createdBy',
    },
    {
      title: '跟进类型',
      dataIndex: 'type',
      key: 'type',
      render: (text: string) => {
        const typeMap: any = {
          'phone': '电话沟通',
          'wechat': '微信沟通',
          'visit': '到店沟通',
          'interview': '面试沟通',
          'signed': '已签单',
          'other': '其他'
        };
        return typeMap[text] || text;
      }
    },
    {
      title: '跟进内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: {
        showTitle: false,
      },
      render: (content: string) => (
        <Tooltip placement="topLeft" title={content}>
          {content}
        </Tooltip>
      ),
    },
  ];

  // 添加跟进记录表单
  const AddFollowUpModal = () => {
    return (
      <Modal
        title="添加跟进记录"
        open={isAddFollowUpVisible}
        onCancel={() => setIsAddFollowUpVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsAddFollowUpVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={followUpLoading}
            onClick={() => {
              followUpForm
                .validateFields()
                .then(values => {
                  handleAddFollowUp(values);
                })
                .catch(info => {
                  console.log('表单验证失败:', info);
                });
            }}
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
              <Select.Option value="phone">电话沟通</Select.Option>
              <Select.Option value="wechat">微信沟通</Select.Option>
              <Select.Option value="visit">到店沟通</Select.Option>
              <Select.Option value="interview">面试沟通</Select.Option>
              <Select.Option value="signed">已签单</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="跟进内容"
            rules={[{ required: true, message: '请输入跟进内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入跟进内容" />
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  if (loading) {
    return (
      <PageContainer
        header={{
          title: '简历详情',
          breadcrumb: {
            items: [
              { path: '/aunt/resume-list', title: '阿姨简历库' },
              { title: '简历详情' },
            ],
          },
          extra: [
            !isEditing ? (
              <Button 
                key="edit" 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={handleEdit}
              >
                编辑
              </Button>
            ) : (
              <Button 
                key="save" 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSave}
              >
                保存
              </Button>
            )
          ],
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
          <Spin size="large">
            <div style={{ padding: '30px', textAlign: 'center' }}>
              加载中...
            </div>
          </Spin>
        </div>
      </PageContainer>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center">
              <Typography.Title level={4} style={{ margin: 0 }}>
                {resume?.name || '简历详情'}
              </Typography.Title>
            </div>
            <div>
              <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={handleEdit}
                style={{ marginRight: '8px' }}
              >
                编辑简历
              </Button>
            </div>
          </div>
        }
      >
        {!resume ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Typography.Text type="secondary">暂无简历数据</Typography.Text>
          </div>
        ) : (
          <>
            <Card title="基本信息" style={{ marginBottom: 24 }}>
              <Descriptions bordered column={3}>
                <Descriptions.Item label="简历ID">{resume?.id || '-'}</Descriptions.Item>
                <Descriptions.Item label="姓名">{resume?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="年龄">{resume?.age || '-'}</Descriptions.Item>
                <Descriptions.Item label="体检时间">{resume?.medicalExamDate ? dayjs(resume.medicalExamDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
                <Descriptions.Item label="手机号">{resume?.phone || '-'}</Descriptions.Item>
                <Descriptions.Item label="微信号">{resume?.wechat || '-'}</Descriptions.Item>
                <Descriptions.Item label="身份证号">{resume?.idNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="学历">{resume?.education ? educationMap[resume.education] : '-'}</Descriptions.Item>
                <Descriptions.Item label="婚姻状况">{resume?.maritalStatus ? maritalStatusMap[resume.maritalStatus] : '-'}</Descriptions.Item>
                <Descriptions.Item label="宗教信仰">{resume?.religion ? religionMap[resume.religion] : '-'}</Descriptions.Item>
                <Descriptions.Item label="现居住地址">{resume?.currentAddress || '-'}</Descriptions.Item>
                <Descriptions.Item label="籍贯">{resume?.nativePlace || '-'}</Descriptions.Item>
                <Descriptions.Item label="户籍地址">{resume?.hukouAddress || '-'}</Descriptions.Item>
                <Descriptions.Item label="生日">
                  {resume?.birthDate ? (typeof resume.birthDate.format === 'function' ? resume.birthDate.format('YYYY-MM-DD') : resume.birthDate) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="民族">{resume?.ethnicity || '-'}</Descriptions.Item>
                <Descriptions.Item label="性别">{resume?.gender ? genderMap[resume.gender] : '-'}</Descriptions.Item>
                <Descriptions.Item label="生肖">{resume?.zodiac ? zodiacMap[resume.zodiac] : '-'}</Descriptions.Item>
                <Descriptions.Item label="星座">{resume?.zodiacSign ? zodiacSignMap[resume.zodiacSign] : '-'}</Descriptions.Item>
                <Descriptions.Item label="紧急联系人">{resume?.emergencyContactName || '-'}</Descriptions.Item>
                <Descriptions.Item label="紧急联系人电话">{resume?.emergencyContactPhone || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="工作信息" style={{ marginBottom: 24 }}>
              <Descriptions bordered column={3}>
                <Descriptions.Item label="工种">{resume?.jobType ? jobTypeMap[resume.jobType] : '-'}</Descriptions.Item>
                <Descriptions.Item label="期望薪资">
                  {resume?.expectedSalary ? `¥ ${resume.expectedSalary}` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="接单地址">{resume?.serviceArea || '-'}</Descriptions.Item>
                <Descriptions.Item label="接单状态">
                  {resume?.orderStatus ? orderStatusMap[resume.orderStatus] : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="工作经验">
                  {resume?.experienceYears ? `${resume.experienceYears}年` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="线索来源">
                  {resume?.leadSource ? leadSourceMap[resume.leadSource] : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="技能标签" span={3}>
                  {resume?.skills?.length > 0 ? (
                    resume.skills.map((skill: string) => (
                      <Tag key={skill}>{skillsMap[skill] || skill}</Tag>
                    ))
                  ) : '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="工作经历" style={{ marginBottom: 24 }}>
              {renderWorkExperiences()}
            </Card>

            <Card title="身份证照片" style={{ marginBottom: 24 }}>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="身份证正面" span={1}>
                  {resume?.idCardFrontUrl ? (
                    <div style={{ display: 'inline-block', margin: '8px' }}>
                      <img 
                        src={resume.idCardFrontUrl} 
                        alt="身份证正面" 
                        style={{ maxWidth: '100%', maxHeight: '200px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                        onClick={() => handlePreview(resume.idCardFrontUrl)}
                        onError={(e) => {
                          console.error(`图片加载失败: ${resume.idCardFrontUrl}`);
                          e.currentTarget.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
                        }}
                      />
                    </div>
                  ) : '未上传'}
                </Descriptions.Item>
                <Descriptions.Item label="身份证反面" span={1}>
                  {resume?.idCardBackUrl ? (
                    <div style={{ display: 'inline-block', margin: '8px' }}>
                      <img 
                        src={resume.idCardBackUrl} 
                        alt="身份证反面" 
                        style={{ maxWidth: '100%', maxHeight: '200px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                        onClick={() => handlePreview(resume.idCardBackUrl)}
                        onError={(e) => {
                          console.error(`图片加载失败: ${resume.idCardBackUrl}`);
                          e.currentTarget.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
                        }}
                      />
                    </div>
                  ) : '未上传'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="个人照片" style={{ marginBottom: 24 }}>
              {resume?.photoUrls?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {resume.photoUrls.map((url: string, index: number) => renderFilePreview(url, index))}
                </div>
              ) : (
                '未上传'
              )}
            </Card>

            <Card title="证书照片" style={{ marginBottom: 24 }}>
              {resume?.certificateUrls?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {resume.certificateUrls.map((url: string, index: number) => renderFilePreview(url, index))}
                </div>
              ) : (
                '未上传'
              )}
            </Card>

            <Card title="体检报告" style={{ marginBottom: 24 }}>
              {resume?.medicalReportUrls?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {resume.medicalReportUrls.map((url: string, index: number) => renderFilePreview(url, index))}
                </div>
              ) : (
                '未上传'
              )}
            </Card>

            <Card
              title="跟进记录"
              style={{ marginBottom: 24 }}
              extra={
                <Button
                  type="primary"
                  onClick={() => setIsAddFollowUpVisible(true)}
                >
                  添加跟进记录
                </Button>
              }
            >
              <Table
                columns={followUpColumns}
                dataSource={followUpRecords}
                rowKey="id"
                pagination={{ pageSize: 5 }}
              />
            </Card>
          </>
        )}

        <AddFollowUpModal />
        
        <Modal
          open={previewVisible}
          title="预览"
          footer={null}
          onCancel={handleCancel}
        >
          <img alt="预览" style={{ width: '100%' }} src={previewImage} />
        </Modal>
      </Card>
    </div>
  );
};

export default ResumeDetail; 