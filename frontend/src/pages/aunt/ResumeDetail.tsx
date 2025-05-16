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
        console.log("处理单个工作经历:", exp);
        
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

  // 获取简历详情
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

  useEffect(() => {
    if (id) {
      fetchResumeDetail();
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

  // 工作经历显示卡片
  const renderWorkExperiences = () => {
    if (!resume?.workExperiences || !Array.isArray(resume.workExperiences) || resume.workExperiences.length === 0) {
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
  const AddFollowUpModal = () => (
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

  if (loading) {
    return (
      <PageContainer
        header={{
          title: '简历详情',
          breadcrumb: {
            routes: [
              { path: '/aunt/resume-list', breadcrumbName: '阿姨简历库' },
              { breadcrumbName: '简历详情' },
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

        <Modal
          open={previewVisible}
          title={previewImage ? '图片预览' : ''}
          footer={null}
          onCancel={() => setPreviewVisible(false)}
        >
          <img alt="预览" style={{ width: '100%' }} src={previewImage} />
        </Modal>

        <Modal
          title="编辑简历"
          open={editModalVisible}
          onOk={handleSave}
          onCancel={handleCancel}
          width={800}
          footer={[
            <Button key="cancel" onClick={handleCancel}>取消</Button>,
            <Button key="save" type="primary" onClick={handleSave}>保存</Button>
          ]}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              ...resume,
              workExperience: resume?.workExperiences?.map((exp: any) => ({
                ...exp,
                startDate: exp.startDate && exp.startDate !== '-' ? dayjs(exp.startDate) : null,
                endDate: exp.endDate && exp.endDate !== '-' ? dayjs(exp.endDate) : null,
              })) || [],
            }}
          >
            <h3>基本信息</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="请输入姓名" />
              </Form.Item>
              <Form.Item name="age" label="年龄" rules={[{ required: true, message: '请输入年龄' }]}>
                <Input type="number" placeholder="请输入年龄" />
              </Form.Item>
              <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input placeholder="请输入手机号" />
              </Form.Item>
              <Form.Item name="wechat" label="微信号">
                <Input placeholder="请输入微信号" />
              </Form.Item>
              <Form.Item name="idNumber" label="身份证号" rules={[{ required: true, message: '请输入身份证号' }]}>
                <Input placeholder="请输入身份证号" />
              </Form.Item>
              <Form.Item name="education" label="学历">
                <Select placeholder="请选择学历">
                  <Option value="primary">小学</Option>
                  <Option value="junior">初中</Option>
                  <Option value="high">高中</Option>
                  <Option value="associate">大专</Option>
                  <Option value="bachelor">本科</Option>
                  <Option value="master">硕士</Option>
                  <Option value="doctor">博士</Option>
                </Select>
              </Form.Item>
              <Form.Item name="maritalStatus" label="婚姻状况">
                <Select placeholder="请选择婚姻状况">
                  <Option value="unmarried">未婚</Option>
                  <Option value="married">已婚</Option>
                  <Option value="divorced">离异</Option>
                  <Option value="widowed">丧偶</Option>
                </Select>
              </Form.Item>
              <Form.Item name="religion" label="宗教信仰">
                <Select placeholder="请选择宗教信仰">
                  <Option value="none">无</Option>
                  <Option value="buddhism">佛教</Option>
                  <Option value="taoism">道教</Option>
                  <Option value="christianity">基督教</Option>
                  <Option value="catholicism">天主教</Option>
                  <Option value="islam">伊斯兰教</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
              <Form.Item name="currentAddress" label="现居住地址">
                <Input placeholder="请输入现居住地址" />
              </Form.Item>
              <Form.Item name="nativePlace" label="籍贯">
                <Select placeholder="请选择籍贯">
                  {provinces.map(province => (
                    <Option key={province} value={province}>{province}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="hukouAddress" label="户籍地址">
                <Input placeholder="请输入户籍地址" />
              </Form.Item>
              <Form.Item name="birthDate" label="生日">
                <Input placeholder="请输入生日" />
              </Form.Item>
              <Form.Item name="ethnicity" label="民族">
                <Select placeholder="请选择民族">
                  {ethnicities.map(ethnicity => (
                    <Option key={ethnicity} value={ethnicity}>{ethnicity}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="gender" label="性别">
                <Select placeholder="请选择性别">
                  <Option value="male">男</Option>
                  <Option value="female">女</Option>
                </Select>
              </Form.Item>
              <Form.Item name="zodiac" label="生肖">
                <Select placeholder="请选择生肖">
                  <Option value="rat">鼠</Option>
                  <Option value="ox">牛</Option>
                  <Option value="tiger">虎</Option>
                  <Option value="rabbit">兔</Option>
                  <Option value="dragon">龙</Option>
                  <Option value="snake">蛇</Option>
                  <Option value="horse">马</Option>
                  <Option value="goat">羊</Option>
                  <Option value="monkey">猴</Option>
                  <Option value="rooster">鸡</Option>
                  <Option value="dog">狗</Option>
                  <Option value="pig">猪</Option>
                </Select>
              </Form.Item>
              <Form.Item name="zodiacSign" label="星座">
                <Select placeholder="请选择星座">
                  <Option value="aries">白羊座</Option>
                  <Option value="taurus">金牛座</Option>
                  <Option value="gemini">双子座</Option>
                  <Option value="cancer">巨蟹座</Option>
                  <Option value="leo">狮子座</Option>
                  <Option value="virgo">处女座</Option>
                  <Option value="libra">天秤座</Option>
                  <Option value="scorpio">天蝎座</Option>
                  <Option value="sagittarius">射手座</Option>
                  <Option value="capricorn">摩羯座</Option>
                  <Option value="aquarius">水瓶座</Option>
                  <Option value="pisces">双鱼座</Option>
                </Select>
              </Form.Item>
            </div>
            
            <h3 style={{ marginTop: 24 }}>工作信息</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item name="jobType" label="工种" rules={[{ required: true, message: '请选择工种' }]}>
                <Select placeholder="请选择工种">
                  <Option value="yuexin">月嫂</Option>
                  <Option value="zhujia-yuer">住家育儿嫂</Option>
                  <Option value="baiban-yuer">白班育儿</Option>
                  <Option value="baojie">保洁</Option>
                  <Option value="baiban-baomu">白班保姆</Option>
                  <Option value="zhujia-baomu">住家保姆</Option>
                  <Option value="yangchong">养宠</Option>
                  <Option value="xiaoshi">小时工</Option>
                </Select>
              </Form.Item>
              <Form.Item name="expectedSalary" label="期望薪资" rules={[{ required: true, message: '请输入期望薪资' }]}>
                <Input type="number" placeholder="请输入期望薪资" />
              </Form.Item>
              <Form.Item name="serviceArea" label="接单地址">
                <Input placeholder="请输入接单地址" />
              </Form.Item>
              <Form.Item name="orderStatus" label="接单状态">
                <Select placeholder="请选择接单状态">
                  <Option value="accepting">想接单</Option>
                  <Option value="not-accepting">不接单</Option>
                  <Option value="on-service">已上户</Option>
                </Select>
              </Form.Item>
              <Form.Item name="experienceYears" label="工作经验（年）" rules={[{ required: true, message: '请输入工作经验年数' }]}>
                <Input type="number" placeholder="请输入工作经验年数" />
              </Form.Item>
              <Form.Item name="leadSource" label="线索来源">
                <Select placeholder="请选择线索来源">
                  <Option value="referral">转介绍</Option>
                  <Option value="paid-lead">付费线索</Option>
                  <Option value="community">社群线索</Option>
                  <Option value="door-to-door">地推</Option>
                  <Option value="shared-order">合单</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
              <Form.Item name="skills" label="技能标签" style={{ gridColumn: 'span 2' }}>
                <Select mode="multiple" placeholder="请选择技能标签">
                  <Option value="chanhou">产后修复</Option>
                  <Option value="teshu-yinger">特殊婴儿护理</Option>
                  <Option value="yiliaobackground">医疗背景</Option>
                  <Option value="yuying">育婴师</Option>
                  <Option value="zaojiao">早教</Option>
                  <Option value="fushi">辅食</Option>
                  <Option value="ertui">儿推</Option>
                  <Option value="waiyu">外语</Option>
                  <Option value="zhongcan">中餐</Option>
                  <Option value="xican">西餐</Option>
                  <Option value="mianshi">面食</Option>
                  <Option value="jiashi">驾驶</Option>
                  <Option value="shouyi">整理收纳</Option>
                </Select>
              </Form.Item>
            </div>

            {/* 工作经历编辑区域 */}
            <h3 style={{ marginTop: 24 }}>工作经历</h3>
            <Form.List name="workExperience">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card 
                      key={key} 
                      style={{ marginBottom: 16 }} 
                      title={`工作经历 ${name + 1}`}
                      extra={
                        <Button 
                          type="text" 
                          danger 
                          onClick={() => remove(name)}
                          icon={<EditOutlined />}
                        >
                          删除
                        </Button>
                      }
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Form.Item
                          {...restField}
                          name={[name, 'startDate']}
                          label="开始时间"
                        >
                          <DatePicker 
                            format="YYYY-MM" 
                            picker="month" 
                            placeholder="选择开始时间" 
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'endDate']}
                          label="结束时间"
                        >
                          <DatePicker 
                            format="YYYY-MM" 
                            picker="month" 
                            placeholder="选择结束时间" 
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'description']}
                          label="工作描述"
                          style={{ gridColumn: 'span 2' }}
                        >
                          <Input.TextArea rows={4} placeholder="请描述工作内容和职责" />
                        </Form.Item>
                      </div>
                    </Card>
                  ))}
                  <Form.Item>
                    <Button 
                      type="dashed" 
                      onClick={() => {
                        console.log('添加新工作经历');
                        add({ 
                          startDate: null, 
                          endDate: null, 
                          description: '' 
                        });
                      }} 
                      block 
                      icon={<EditOutlined />}
                    >
                      添加工作经历
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

            {/* 身份证照片 */}
            <h3 style={{ marginTop: 24 }}>身份证照片</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item name="idCardFrontUrl" label="身份证正面" rules={[{ required: true, message: '请上传身份证正面照片' }]}>
                <Upload
                  name="file"
                  listType="picture-card"
                  showUploadList={false}
                  action="/api/upload/id-card/front"
                  beforeUpload={(file) => {
                    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                    if (!isJpgOrPng) {
                      message.error('只能上传JPG/PNG格式的图片!');
                    }
                    const isLt2M = file.size / 1024 / 1024 < 2;
                    if (!isLt2M) {
                      message.error('图片大小不能超过2MB!');
                    }
                    return isJpgOrPng && isLt2M;
                  }}
                  onChange={(info) => {
                    if (info.file.status === 'done') {
                      message.success('身份证正面上传成功');
                      form.setFieldsValue({ idCardFrontUrl: info.file.response.url });
                    } else if (info.file.status === 'error') {
                      message.error('身份证正面上传失败');
                    }
                  }}
                >
                  {form.getFieldValue('idCardFrontUrl') ? (
                    <img 
                      src={form.getFieldValue('idCardFrontUrl')} 
                      alt="身份证正面" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>上传</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
              <Form.Item name="idCardBackUrl" label="身份证反面" rules={[{ required: true, message: '请上传身份证反面照片' }]}>
                <Upload
                  name="file"
                  listType="picture-card"
                  showUploadList={false}
                  action="/api/upload/id-card/back"
                  beforeUpload={(file) => {
                    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                    if (!isJpgOrPng) {
                      message.error('只能上传JPG/PNG格式的图片!');
                    }
                    const isLt2M = file.size / 1024 / 1024 < 2;
                    if (!isLt2M) {
                      message.error('图片大小不能超过2MB!');
                    }
                    return isJpgOrPng && isLt2M;
                  }}
                  onChange={(info) => {
                    if (info.file.status === 'done') {
                      message.success('身份证反面上传成功');
                      form.setFieldsValue({ idCardBackUrl: info.file.response.url });
                    } else if (info.file.status === 'error') {
                      message.error('身份证反面上传失败');
                    }
                  }}
                >
                  {form.getFieldValue('idCardBackUrl') ? (
                    <img 
                      src={form.getFieldValue('idCardBackUrl')} 
                      alt="身份证反面" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>上传</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
            </div>

            {/* 个人照片 */}
            <h3 style={{ marginTop: 24 }}>个人照片</h3>
            <Form.Item name="photoUrls" label="个人照片">
              <Upload
                name="file"
                listType="picture-card"
                fileList={(form.getFieldValue('photoUrls') || []).map((url: string, index: number) => ({
                  uid: `-${index}`,
                  name: `photo-${index}.jpg`,
                  status: 'done',
                  url: url
                }))}
                action="/api/upload/file/photo"
                beforeUpload={(file) => {
                  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                  if (!isJpgOrPng) {
                    message.error('只能上传JPG/PNG格式的图片!');
                  }
                  const isLt2M = file.size / 1024 / 1024 < 2;
                  if (!isLt2M) {
                    message.error('图片大小不能超过2MB!');
                  }
                  return isJpgOrPng && isLt2M;
                }}
                onChange={(info) => {
                  const fileList = [...info.fileList];
                  // 只保留已上传成功的和正在上传的文件
                  const filteredList = fileList.filter(file => !!file.status);
                  
                  // 更新photoUrls字段，只包含已上传成功的文件URL
                  const urls = filteredList
                    .filter(file => file.status === 'done')
                    .map(file => file.url || (file.response && file.response.url))
                    .filter(url => !!url);
                  
                  form.setFieldsValue({ photoUrls: urls });
                  
                  // 显示上传成功或失败的消息
                  const { file } = info;
                  if (file.status === 'done') {
                    message.success(`${file.name} 上传成功`);
                  } else if (file.status === 'error') {
                    message.error(`${file.name} 上传失败`);
                  }
                }}
                onPreview={(file) => {
                  const previewUrl = file.url || (file.response && file.response.url);
                  if (previewUrl) {
                    handlePreview(previewUrl);
                  }
                }}
              >
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              </Upload>
            </Form.Item>

            {/* 证书照片 */}
            <h3 style={{ marginTop: 24 }}>证书照片</h3>
            <Form.Item name="certificateUrls" label="证书照片">
              <Upload
                name="file"
                listType="picture-card"
                fileList={(form.getFieldValue('certificateUrls') || []).map((url: string, index: number) => ({
                  uid: `-${index}`,
                  name: `certificate-${index}.jpg`,
                  status: 'done',
                  url: url
                }))}
                action="/api/upload/file/certificate"
                beforeUpload={(file) => {
                  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                  if (!isJpgOrPng) {
                    message.error('只能上传JPG/PNG格式的图片!');
                  }
                  const isLt2M = file.size / 1024 / 1024 < 2;
                  if (!isLt2M) {
                    message.error('图片大小不能超过2MB!');
                  }
                  return isJpgOrPng && isLt2M;
                }}
                onChange={(info) => {
                  const fileList = [...info.fileList];
                  // 只保留已上传成功的和正在上传的文件
                  const filteredList = fileList.filter(file => !!file.status);
                  
                  // 更新certificateUrls字段，只包含已上传成功的文件URL
                  const urls = filteredList
                    .filter(file => file.status === 'done')
                    .map(file => file.url || (file.response && file.response.url))
                    .filter(url => !!url);
                  
                  form.setFieldsValue({ certificateUrls: urls });
                  
                  // 显示上传成功或失败的消息
                  const { file } = info;
                  if (file.status === 'done') {
                    message.success(`${file.name} 上传成功`);
                  } else if (file.status === 'error') {
                    message.error(`${file.name} 上传失败`);
                  }
                }}
                onPreview={(file) => {
                  const previewUrl = file.url || (file.response && file.response.url);
                  if (previewUrl) {
                    handlePreview(previewUrl);
                  }
                }}
              >
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              </Upload>
            </Form.Item>

            {/* 体检报告 */}
            <h3 style={{ marginTop: 24 }}>体检报告</h3>
            <Form.Item name="medicalReportUrls" label="体检报告">
              <Upload
                name="file"
                listType="picture-card"
                fileList={(form.getFieldValue('medicalReportUrls') || []).map((url: string, index: number) => {
                  const isPdf = url.toLowerCase().endsWith('.pdf');
                  return {
                    uid: `-${index}`,
                    name: isPdf ? `report-${index}.pdf` : `report-${index}.jpg`,
                    status: 'done',
                    url: url,
                    type: isPdf ? 'application/pdf' : 'image/jpeg'
                  };
                })}
                action="/api/upload/file/medical-report"
                beforeUpload={(file) => {
                  const isValidType = 
                    file.type === 'image/jpeg' || 
                    file.type === 'image/png' || 
                    file.type === 'application/pdf';
                  if (!isValidType) {
                    message.error('只能上传JPG/PNG格式的图片或PDF文件!');
                  }
                  const isLt5M = file.size / 1024 / 1024 < 5;
                  if (!isLt5M) {
                    message.error('文件大小不能超过5MB!');
                  }
                  return isValidType && isLt5M;
                }}
                onChange={(info) => {
                  const fileList = [...info.fileList];
                  // 只保留已上传成功的和正在上传的文件
                  const filteredList = fileList.filter(file => !!file.status);
                  
                  // 更新medicalReportUrls字段，只包含已上传成功的文件URL
                  const urls = filteredList
                    .filter(file => file.status === 'done')
                    .map(file => file.url || (file.response && file.response.url))
                    .filter(url => !!url);
                  
                  form.setFieldsValue({ medicalReportUrls: urls });
                  
                  // 显示上传成功或失败的消息
                  const { file } = info;
                  if (file.status === 'done') {
                    message.success(`${file.name} 上传成功`);
                  } else if (file.status === 'error') {
                    message.error(`${file.name} 上传失败`);
                  }
                }}
                onPreview={(file) => {
                  const previewUrl = file.url || (file.response && file.response.url);
                  if (previewUrl) {
                    handlePreview(previewUrl);
                  }
                }}
                itemRender={(originNode, file) => {
                  if (file.type === 'application/pdf' || 
                      file.url?.toLowerCase().endsWith('.pdf') || 
                      (file.response && file.response.url?.toLowerCase().endsWith('.pdf'))) {
                    return (
                      <div style={{ 
                        position: 'relative',
                        width: '100%', 
                        height: '100%',
                        display: 'flex', 
                        flexDirection: 'column',
                        justifyContent: 'center', 
                        alignItems: 'center',
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #d9d9d9'
                      }}>
                        <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
                        <div style={{ marginTop: 8, fontSize: 12 }}>PDF文档</div>
                        {file.status === 'uploading' && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Spin size="small" />
                          </div>
                        )}
                      </div>
                    );
                  }
                  return originNode;
                }}
              >
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              </Upload>
            </Form.Item>
          </Form>
        </Modal>
      </Card>

      {/* 添加跟进记录弹窗 */}
      <AddFollowUpModal />
    </div>
  );
};

export default ResumeDetail; 