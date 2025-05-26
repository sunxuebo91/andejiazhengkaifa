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
import apiService from '../../services/api';
import type { UploadFile } from 'antd/es/upload/interface';
import imageCompression from 'browser-image-compression';
import { extractFileUrl, extractFileId, isPdfFile } from '../../utils/uploadHelper';
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

// 添加映射对象的类型定义
type EducationMapType = {
  [key: string]: string;
  no: string;
  primary: string;
  middle: string;
  secondary: string;
  vocational: string;
  high: string;
  college: string;
  bachelor: string;
  graduate: string;
};

type MaritalStatusMapType = {
  [key: string]: string;
  single: string;
  married: string;
  divorced: string;
  widowed: string;
};

type ReligionMapType = {
  [key: string]: string;
  none: string;
  buddhism: string;
  taoism: string;
  christianity: string;
  catholicism: string;
  islam: string;
  other: string;
};

type GenderMapType = {
  [key: string]: string;
  male: string;
  female: string;
  男: string;
  女: string;
};

type ZodiacMapType = {
  [key: string]: string;
  rat: string;
  ox: string;
  tiger: string;
  rabbit: string;
  dragon: string;
  snake: string;
  horse: string;
  goat: string;
  monkey: string;
  rooster: string;
  dog: string;
  pig: string;
};

type ZodiacSignMapType = {
  [key: string]: string;
  capricorn: string;
  aquarius: string;
  pisces: string;
  aries: string;
  taurus: string;
  gemini: string;
  cancer: string;
  leo: string;
  virgo: string;
  libra: string;
  scorpio: string;
  sagittarius: string;
};

type JobTypeMapType = {
  [key: string]: string;
  yuexin: string;
  'zhujia-yuer': string;
  'baiban-yuer': string;
  baojie: string;
  'baiban-baomu': string;
  'zhujia-baomu': string;
  yangchong: string;
  xiaoshi: string;
};

type OrderStatusMapType = {
  [key: string]: string;
  accepting: string;
  'not-accepting': string;
  'on-service': string;
};

type LeadSourceMapType = {
  [key: string]: string;
  referral: string;
  'paid-lead': string;
  community: string;
  'door-to-door': string;
  'shared-order': string;
  other: string;
};

type SkillsMapType = {
  [key: string]: string;
  chanhou: string;
  'teshu-yinger': string;
  yiliaobackground: string;
  yuying: string;
  zaojiao: string;
  fushi: string;
  ertui: string;
  waiyu: string;
  zhongcan: string;
  xican: string;
  mianshi: string;
  jiashi: string;
  shouyi: string;
};

// 声明映射对象的类型
const educationMap: EducationMapType = {
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

const maritalStatusMap: MaritalStatusMapType = {
  single: '未婚',
  married: '已婚',
  divorced: '离异',
  widowed: '丧偶'
};

const religionMap: ReligionMapType = {
  none: '无',
  buddhism: '佛教',
  taoism: '道教',
  christianity: '基督教',
  catholicism: '天主教',
  islam: '伊斯兰教',
  other: '其他'
};

const genderMap: GenderMapType = {
  male: '男',
  female: '女',
  男: '男',
  女: '女'
};

const zodiacMap: ZodiacMapType = {
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
const zodiacSignMap: ZodiacSignMapType = {
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
const jobTypeMap: JobTypeMapType = {
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
const orderStatusMap: OrderStatusMapType = {
  accepting: '想接单',
  'not-accepting': '不接单',
  'on-service': '已上户'
};

// 技能标签映射
const skillsMap: SkillsMapType = {
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
const leadSourceMap: LeadSourceMapType = {
  referral: '转介绍',
  'paid-lead': '付费线索',
  community: '社群线索',
  'door-to-door': '地推',
  'shared-order': '合单',
  other: '其他'
};

// 添加类型定义
interface WorkExperience {
  startDate: string;
  endDate: string;
  description: string;
}

interface FileInfo {
  fileId: string;
  filename: string;  // 保持与后端一致的命名
  mimeType?: string;
  mimetype?: string;  // 兼容后端返回的字段名
  size: number;
  uploadTime: Date;
  url?: string;
}

interface FollowUpRecord {
  id: string;
  content: string;
  timestamp: string;
}

interface ResumeData {
  _id: string;
  name: string;
  phone: string;
  age: number;
  idNumber: string;
  education: keyof typeof educationMap;
  nativePlace: string;
  experienceYears: number;
  maritalStatus: keyof typeof maritalStatusMap;
  religion: keyof typeof religionMap;
  currentAddress: string;
  hukouAddress: string;
  birthDate: string;
  ethnicity: string;
  gender: keyof typeof genderMap;
  zodiac: keyof typeof zodiacMap;
  zodiacSign: keyof typeof zodiacSignMap;
  jobType: keyof typeof jobTypeMap;
  expectedSalary: number;
  serviceArea: string;
  orderStatus: keyof typeof orderStatusMap;
  skills: Array<keyof typeof skillsMap>;
  leadSource: keyof typeof leadSourceMap;
  workExperiences: WorkExperience[];
  // 文件ID数组
  fileIds?: string[];
  // 新的文件信息结构
  idCardFront?: FileInfo;
  idCardBack?: FileInfo;
  personalPhoto?: FileInfo[];  // 修改为数组，支持多张个人照片
  certificates?: FileInfo[];
  reports?: FileInfo[];
  // 保持向后兼容的旧字段
  photoUrls?: (string | null)[];
  certificateUrls?: (string | null)[];
  medicalReportUrls?: (string | null)[];
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalExamDate: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// 处理图片URL的工具函数
const processImageUrl = (url: string): string => {
  if (!url) return '';
  return url.startsWith('http') ? url : `/api/upload/file/${url}`;
};

const ResumeDetail = () => {
  const { id: shortId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // 跟进记录相关状态
  const [followUpRecords, setFollowUpRecords] = useState<any[]>([]);
  const [isAddFollowUpVisible, setIsAddFollowUpVisible] = useState(false);
  const [followUpForm] = Form.useForm();
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // 在组件内部处理数据前的函数，处理工作经历的日期格式
  const formatWorkExperiences = (data: Partial<ResumeData>) => {
    const workExps = data.workExperiences || [];
    return Array.isArray(workExps) ? workExps.map((exp: WorkExperience) => ({
      ...exp,
      startDate: formatDateToChinese(exp.startDate),
      endDate: formatDateToChinese(exp.endDate),
      description: exp.description || '-'
    })) : [];
  };

  // 更新日期格式化函数
  const formatDateToChinese = (dateStr: string): string => {
    if (!dateStr || dateStr === '-') return '-';
    try {
      const date = dayjs(dateStr);
      return date.isValid() ? `${date.year()}年${date.month() + 1}月` : '-';
    } catch (e) {
      console.error('日期格式化失败:', e);
      return '-';
    }
  };

  // 获取简历详情
  const fetchResumeDetail = async () => {
    if (!shortId) {
      setError('简历ID不存在');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('正在获取简历详情，ID:', shortId);
      const response = await axios.get<{ success: boolean; data: ResumeData; message?: string }>(`/api/resumes/${shortId}`);
      console.log('原始API响应:', response.data);

      if (!response.data.success) {
        console.error('API返回错误:', response.data.message);
        setError(response.data.message || '获取简历详情失败');
        setLoading(false);
        return;
      }

      const resumeData = response.data.data;
      console.log('获取到的简历数据:', JSON.stringify(resumeData, null, 2));
      
      // 专门打印文件相关信息
      console.log('文件分类信息:', {
        personalPhoto: resumeData.personalPhoto,
        certificates: resumeData.certificates,
        reports: resumeData.reports,
        idCardFront: resumeData.idCardFront,
        idCardBack: resumeData.idCardBack
      });

      // 打印原始图片URL信息
      console.log('原始图片URL信息:', {
        idCardFrontUrl: resumeData.idCardFrontUrl,
        idCardBackUrl: resumeData.idCardBackUrl,
        photoUrls: resumeData.photoUrls,
        certificateUrls: resumeData.certificateUrls,
        medicalReportUrls: resumeData.medicalReportUrls
      });

      // 处理工作经验数据
      const formattedWorkExperience = formatWorkExperiences(resumeData);

      // 处理图片URL
      const processImageUrl = (url: string | null | undefined): string | null => {
        if (!url) return null;
        if (typeof url !== 'string') return null;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        
        // 如果已经是完整的API路径，直接返回
        if (url.startsWith('/api/upload/file/')) return url;
        
        // 否则构建完整的API路径
        return `/api/upload/file/${url}`;
      };

      // 处理fileIds生成图片URL
      const generateImageUrls = (fileIds: string[]): string[] => {
        if (!Array.isArray(fileIds)) return [];
        return fileIds.map(fileId => fileId);
      };

      // 更新简历数据
      const updatedResumeData = {
        ...resumeData,
        workExperiences: formattedWorkExperience,
        id: resumeData._id.toString(),
        religion: resumeData.religion || null,
        medicalExamDate: resumeData.medicalExamDate ? dayjs(resumeData.medicalExamDate) : null,
        // 处理图片URL - 优先使用现有的URL，如果没有则从fileIds生成
        idCardFrontUrl: processImageUrl(resumeData.idCardFrontUrl),
        idCardBackUrl: processImageUrl(resumeData.idCardBackUrl),
        photoUrls: Array.isArray(resumeData.photoUrls) && resumeData.photoUrls.length > 0
          ? resumeData.photoUrls.map(processImageUrl).filter(Boolean) 
          : [],
        certificateUrls: Array.isArray(resumeData.certificateUrls) && resumeData.certificateUrls.length > 0
          ? resumeData.certificateUrls.map(processImageUrl).filter(Boolean) 
          : [],
        medicalReportUrls: Array.isArray(resumeData.medicalReportUrls) && resumeData.medicalReportUrls.length > 0
          ? resumeData.medicalReportUrls.map(processImageUrl).filter(Boolean) 
          : [],
      };

      // 打印处理后的图片URL信息
      console.log('处理后的图片URL信息:', {
        idCardFrontUrl: updatedResumeData.idCardFrontUrl,
        idCardBackUrl: updatedResumeData.idCardBackUrl,
        photoUrls: updatedResumeData.photoUrls,
        certificateUrls: updatedResumeData.certificateUrls,
        medicalReportUrls: updatedResumeData.medicalReportUrls,
        baseUrl: import.meta.env.VITE_API_BASE_URL
      });

      // 检查环境变量
      if (!import.meta.env.VITE_API_BASE_URL) {
        console.warn('警告: 未配置 VITE_API_BASE_URL 环境变量');
      }

      setResume(updatedResumeData);
    } catch (error) {
      console.error('获取简历详情失败:', error);
      setError('获取简历详情失败');
      message.error('获取简历详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shortId) {
      fetchResumeDetail();
    }
  }, [shortId]);

  // 处理编辑操作 - 将数据存储到localStorage并跳转到创建页面
  const handleEdit = () => {
    if (resume) {
      console.log('进入编辑模式，简历数据:', resume);
      setEditModalVisible(true);
      
      // 设置表单初始值
      const formValues = {
        ...resume,
        // 处理服务地址 - 如果是数组则取第一个，如果是字符串则直接使用
        serviceArea: Array.isArray(resume.serviceArea) 
          ? resume.serviceArea[0] 
          : resume.serviceArea,
        // 处理身份证照片URL
        idCardFrontUrl: resume.idCardFront?.url || resume.idCardFrontUrl,
        idCardBackUrl: resume.idCardBack?.url || resume.idCardBackUrl,
        // 处理工作经历日期
        workExperiences: resume.workExperiences?.map((exp: any) => {
          console.log('处理工作经历日期:', exp);
          
          let startDate = null;
          let endDate = null;
          
          // 处理开始日期
          if (exp.startDate && exp.startDate !== '-') {
            try {
              // 尝试多种日期格式
              if (exp.startDate.includes('年')) {
                // 格式：2024年1月
                startDate = dayjs(exp.startDate, 'YYYY年M月');
              } else if (exp.startDate.includes('-')) {
                // 格式：2024-01
                startDate = dayjs(exp.startDate, 'YYYY-MM');
              } else {
                // 其他格式
                startDate = dayjs(exp.startDate);
              }
              
              if (!startDate.isValid()) {
                startDate = null;
              }
            } catch (e) {
              console.error('解析开始日期失败:', exp.startDate, e);
              startDate = null;
            }
          }
          
          // 处理结束日期
          if (exp.endDate && exp.endDate !== '-') {
            try {
              // 尝试多种日期格式
              if (exp.endDate.includes('年')) {
                // 格式：2024年1月
                endDate = dayjs(exp.endDate, 'YYYY年M月');
              } else if (exp.endDate.includes('-')) {
                // 格式：2024-01
                endDate = dayjs(exp.endDate, 'YYYY-MM');
              } else {
                // 其他格式
                endDate = dayjs(exp.endDate);
              }
              
              if (!endDate.isValid()) {
                endDate = null;
              }
            } catch (e) {
              console.error('解析结束日期失败:', exp.endDate, e);
              endDate = null;
            }
          }
          
          console.log('解析后的日期:', { startDate, endDate });
          
          return {
            ...exp,
            startDate,
            endDate,
          };
        }) || [],
      };
      
      console.log('设置表单值:', formValues);
      form.setFieldsValue(formValues);
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
      
      // 检查必填字段是否已填写
      const requiredFields = [
        { key: 'name', label: '姓名' },
        { key: 'age', label: '年龄' },
        { key: 'phone', label: '手机号码' },
        { key: 'gender', label: '性别' },
        { key: 'nativePlace', label: '籍贯' },
        { key: 'jobType', label: '工种' },
        { key: 'education', label: '学历' },
        { key: 'experienceYears', label: '工作经验年限' }
      ];
      
      // 检查是否有未填写的必填字段
      const missingFields = requiredFields.filter(field => !values[field.key]);
      if (missingFields.length > 0) {
        const missingLabels = missingFields.map(field => field.label).join(', ');
        messageApi.error(`请填写以下必填字段: ${missingLabels}`);
        return;
      }

      // 转换性别字段为英文枚举值
      if (values.gender === '男') {
        values.gender = 'male';
      } else if (values.gender === '女') {
        values.gender = 'female';
      }
      
      // 准备提交数据：处理日期字段
      const formData = {
        ...values,
        birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : undefined,
        medicalExamDate: values.medicalExamDate ? values.medicalExamDate.format('YYYY-MM-DD') : undefined,
        // 处理工作经验的日期格式化
        workExperiences: values.workExperiences?.map((item: any) => {
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
        }).filter((item: any) => item !== null) || [],
      };
      
      console.log('准备提交的数据:', formData);
      
      // 提交更新的简历数据
      await axios.put(`/api/resumes/${resume.id}`, formData);
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
    console.log(`处理图片预览:`, url);
    if (!url) {
      console.warn('预览URL为空');
      return;
    }
    setPreviewImage(url);
    setPreviewVisible(true);
  };

  // 更新文件预览函数的类型
  const renderFilePreview = (file: FileInfo | string, index: number) => {
    if (typeof file === 'string') {
      return renderLegacyFilePreview(file, index);
    }

    // 处理FileInfo对象，使用url字段而不是fileId
    const fileUrl = file.url || `/api/upload/file/${file.fileId}`;
    // 兼容两种字段名：mimeType 和 mimetype
    const mimeType = file.mimeType || file.mimetype || '';
    const isPdf = mimeType === 'application/pdf';
    const uniqueKey = `file-${file.fileId || index}-${index}`;

    console.log('渲染文件预览:', {
      filename: file.filename,
      mimeType: mimeType,
      isPdf: isPdf,
      fileUrl: fileUrl
    });

    return (
      <div key={uniqueKey} style={{ display: 'inline-block', margin: '8px' }}>
        {isPdf ? (
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() => window.open(fileUrl, '_blank')}
            style={{ height: '60px', width: '120px' }}
          >
            查看PDF
          </Button>
        ) : (
          <Image
            src={fileUrl}
            alt={file.filename}
            style={{ maxWidth: '200px', maxHeight: '200px' }}
            placeholder={(
              <div style={{ 
                background: '#f5f5f5', 
                width: '200px', 
                height: '200px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                加载中...
              </div>
            )}
          />
        )}
      </div>
    );
  };

  // 更新渲染旧版文件预览的函数
  const renderLegacyFilePreview = (url: string, index: number) => {
    const fileUrl = url.startsWith('/api/upload/file/') ? url : `/api/upload/file/${url}`;
    const uniqueKey = `legacy-file-${index}`;
    
    // 检查是否为PDF文件（通过URL或文件扩展名判断）
    const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');
    
    return (
      <div key={uniqueKey} style={{ display: 'inline-block', margin: '8px' }}>
        {isPdf ? (
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() => window.open(fileUrl, '_blank')}
            style={{ height: '60px', width: '120px' }}
          >
            查看PDF
          </Button>
        ) : (
          <Image
            src={fileUrl}
            alt={`文件 ${index + 1}`}
            style={{ maxWidth: '200px', maxHeight: '200px' }}
            placeholder={(
              <div style={{ 
                background: '#f5f5f5', 
                width: '200px', 
                height: '200px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                加载中...
              </div>
            )}
            onError={() => {
              // 如果图片加载失败，可能是PDF文件，显示PDF按钮
              console.log('图片加载失败，可能是PDF文件:', fileUrl);
            }}
          />
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
    
    return resume.workExperiences.map((exp: WorkExperience, index: number) => {
      if (!exp) return null;
      
      console.log(`渲染工作经历 ${index+1}:`, exp);
      
      const uniqueKey = `${exp.startDate || ''}-${exp.endDate || ''}-${exp.description?.substring(0, 20) || ''}-${index}`;
      
      return (
        <Card 
          key={uniqueKey}
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
    if (!resume?.id) {
      console.log('简历ID不存在，跳过获取跟进记录');
      return;
    }

    try {
      // 从localStorage获取所有跟进记录
      const allRecords = JSON.parse(localStorage.getItem('followUpRecords') || '[]');
      
      // 筛选出当前简历的跟进记录
      const resumeRecords = allRecords.filter((record: any) => record.resumeId === resume.id);
      
      console.log('从localStorage获取跟进记录:', resumeRecords);
      setFollowUpRecords(resumeRecords);
    } catch (error) {
      console.error('获取跟进记录失败:', error);
      message.error('获取跟进记录失败');
    }
  };
  
  // 组件加载时获取跟进记录
  useEffect(() => {
    if (resume?.id) {
      fetchFollowUpRecords();
    }
  }, [resume?.id]);
  
  // 添加跟进记录
  const handleAddFollowUp = async (values: any) => {
    try {
      setFollowUpLoading(true);
      
      // 创建新的跟进记录
      const followUpData = {
        id: Date.now().toString(), // 生成临时ID
        resumeId: resume.id,
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

  // 处理身份证上传和OCR识别
  const handleIdCardUpload = async (type: 'front' | 'back', info: any) => {
    if (!info?.file) {
      messageApi.error(`未获取到文件信息`);
      return;
    }

    const file = info.file.originFileObj || info.file;
    if (!file) {
      messageApi.error(`未获取到文件对象`);
      return;
    }

    try {
      setLoading(true);

      // 压缩图片
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.05,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      });

      // 创建FormData对象
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('idCardSide', type);

      // 1. 先进行OCR识别
      const ocrResponse = await axios.post('/api/ocr/idcard', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      if (!ocrResponse.data.success) {
        throw new Error(ocrResponse.data.message || 'OCR识别失败');
      }

      messageApi.success('身份证识别成功');

      // 如果是正面，则处理识别结果并填充表单
      if (type === 'front' && ocrResponse.data.data.words_result) {
        const result = ocrResponse.data.data.words_result;
        const formValues: any = {};

        // 提取基本信息
        if (result.姓名?.words) {
          formValues.name = result.姓名.words;
        }
        if (result.民族?.words) {
          formValues.ethnicity = result.民族.words.replace(/族$/, '');
        }
        if (result.公民身份号码?.words) {
          const idCard = result.公民身份号码.words;
          formValues.idNumber = idCard;

          // 提取出生日期
          const birthYear = parseInt(idCard.substring(6, 10));
          const birthMonth = parseInt(idCard.substring(10, 12));
          const birthDay = parseInt(idCard.substring(12, 14));
          formValues.birthDate = dayjs(`${birthYear}-${birthMonth}-${birthDay}`);

          // 设置性别
          formValues.gender = parseInt(idCard.charAt(16)) % 2 === 1 ? '男' : '女';
        }
        if (result.住址?.words) {
          formValues.currentAddress = result.住址.words;
          formValues.hukouAddress = result.住址.words;
        }

        // 更新表单
        form.setFieldsValue(formValues);
      }

      // 2. 上传图片
      const uploadFormData = new FormData();
      uploadFormData.append('file', compressedFile);
      
      const uploadResponse = await axios.post(`/api/upload/id-card/${type}`, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.message || '图片上传失败');
      }

      // 更新表单中的URL字段
      form.setFieldsValue({
        [`idCard${type === 'front' ? 'Front' : 'Back'}Url`]: uploadResponse.data.data.url
      });

      messageApi.success('图片上传成功');

    } catch (error: any) {
      console.error('处理身份证失败:', error);
      messageApi.error(error.message || `身份证处理失败`);
    } finally {
      setLoading(false);
    }
  };

  // 在组件加载时打印图片URL信息
  useEffect(() => {
    if (resume) {
      console.log('简历图片URL信息:', {
        idCardFrontUrl: resume.idCardFrontUrl,
        idCardBackUrl: resume.idCardBackUrl,
        photoUrls: resume.photoUrls,
        certificateUrls: resume.certificateUrls,
        medicalReportUrls: resume.medicalReportUrls
      });
    }
  }, [resume]);

  if (error) {
    return (
      <PageContainer
        header={{
          title: '简历详情',
          breadcrumb: {
            items: [
              { path: '/aunt/list', title: '阿姨简历库' },
              { title: '简历详情' },
            ],
          },
        }}
      >
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Typography.Title level={4} type="danger">
              {error}
            </Typography.Title>
            <Button type="primary" onClick={() => navigate('/aunt/list')}>
              返回列表
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

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
        <div className="loading-container" style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large">
            <div style={{ padding: '50px', background: 'rgba(0, 0, 0, 0.05)' }}>
              加载中...
            </div>
          </Spin>
        </div>
      </PageContainer>
    );
  }

  if (!resume) {
    return (
      <PageContainer
        header={{
          title: '简历详情',
          breadcrumb: {
            items: [
              { path: '/aunt/list', title: '阿姨简历库' },
              { title: '简历详情' },
            ],
          },
        }}
      >
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Typography.Title level={4}>
              未找到简历数据
            </Typography.Title>
            <Button type="primary" onClick={() => navigate('/aunt/list')}>
              返回列表
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <>
      {contextHolder}
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
              <Descriptions.Item label="简历ID">
                <Tooltip title={`完整ID: ${resume?.id || '未知'}`}>
                  <span>{resume?.id ? resume.id.substring(0, 8).padEnd(8, '0') : '-'}</span>
                </Tooltip>
              </Descriptions.Item>
              <Descriptions.Item label="姓名">{resume?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="年龄">{resume?.age || '-'}</Descriptions.Item>
              <Descriptions.Item label="体检时间">{resume?.medicalExamDate ? dayjs(resume.medicalExamDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
              <Descriptions.Item label="手机号">{resume?.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="微信号">{resume?.wechat || '-'}</Descriptions.Item>
              <Descriptions.Item label="身份证号">{resume?.idNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="学历">{resume?.education ? educationMap[resume.education] : '-'}</Descriptions.Item>
              <Descriptions.Item label="婚姻状况">{resume?.maritalStatus ? maritalStatusMap[resume.maritalStatus] : '-'}</Descriptions.Item>
              <Descriptions.Item label="宗教信仰">
                {resume?.religion ? (
                  <span>{religionMap[resume.religion] || resume.religion}</span>
                ) : '-'}
              </Descriptions.Item>
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
                {resume?.idCardFront ? (
                  <div style={{ display: 'inline-block', margin: '8px' }}>
                    {renderFilePreview(resume.idCardFront, 0)}
                  </div>
                ) : resume?.idCardFrontUrl ? (
                  <div style={{ display: 'inline-block', margin: '8px' }}>
                    {renderFilePreview(resume.idCardFrontUrl, 0)}
                  </div>
                ) : '未上传'}
              </Descriptions.Item>
              <Descriptions.Item label="身份证反面" span={1}>
                {resume?.idCardBack ? (
                  <div style={{ display: 'inline-block', margin: '8px' }}>
                    {renderFilePreview(resume.idCardBack, 1)}
                  </div>
                ) : resume?.idCardBackUrl ? (
                  <div style={{ display: 'inline-block', margin: '8px' }}>
                    {renderFilePreview(resume.idCardBackUrl, 1)}
                  </div>
                ) : '未上传'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="个人照片" style={{ marginBottom: 24 }}>
            {resume?.personalPhoto?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {resume.personalPhoto.map((photo: FileInfo, index: number) => (
                  <div key={`personal-photo-${photo.fileId || index}`}>
                    {renderFilePreview(photo, index)}
                  </div>
                ))}
              </div>
            ) : resume?.photoUrls?.filter(Boolean).length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {resume.photoUrls.filter(Boolean).map((url: string, index: number) => (
                  <div key={`photo-${index}`}>
                    {renderFilePreview(url, index)}
                  </div>
                ))}
              </div>
            ) : (
              '未上传'
            )}
          </Card>

          <Card title="证书照片" style={{ marginBottom: 24 }}>
            {resume?.certificates?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {resume.certificates.map((cert: FileInfo, index: number) => (
                  <div key={`certificate-${cert.fileId || index}`}>
                    {renderFilePreview(cert, index)}
                  </div>
                ))}
              </div>
            ) : resume?.certificateUrls?.filter(Boolean).length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {resume.certificateUrls.filter(Boolean).map((url: string, index: number) => (
                  <div key={`certificate-legacy-${index}`}>
                    {renderFilePreview(url, index)}
                  </div>
                ))}
              </div>
            ) : (
              '未上传'
            )}
          </Card>

          <Card title="体检报告" style={{ marginBottom: 24 }}>
            {resume?.reports?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {resume.reports.map((report: FileInfo, index: number) => (
                  <div key={`report-${report.fileId || index}`}>
                    {renderFilePreview(report, index)}
                  </div>
                ))}
              </div>
            ) : resume?.medicalReportUrls?.filter(Boolean).length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {resume.medicalReportUrls.filter(Boolean).map((url: string, index: number) => (
                  <div key={`report-legacy-${index}`}>
                    {renderFilePreview(url, index)}
                  </div>
                ))}
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
                <Form.Item name="emergencyContactName" label="紧急联系人">
                  <Input placeholder="请输入紧急联系人姓名" />
                </Form.Item>
                <Form.Item name="emergencyContactPhone" label="紧急联系人电话">
                  <Input placeholder="请输入紧急联系人电话" />
                </Form.Item>
                <Form.Item name="medicalExamDate" label="体检时间">
                  <DatePicker style={{ width: '100%' }} placeholder="请选择体检时间" />
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
              <Form.List name="workExperiences">
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
                <Form.Item name="idCardFrontUrl" label="身份证正面">
                  <Upload
                    name="file"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={() => false}
                    onChange={(info) => handleIdCardUpload('front', info)}
                    accept=".jpg,.jpeg,.png"
                  >
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      {form.getFieldValue('idCardFrontUrl') ? (
                        <>
                          <img 
                            src={form.getFieldValue('idCardFrontUrl')} 
                            alt="身份证正面" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} 
                          />
                          {/* 预览和重新上传图标 */}
                          <div style={{ 
                            position: 'absolute', 
                            top: '8px', 
                            right: '8px', 
                            display: 'flex', 
                            gap: '8px' 
                          }}>
                            <Button
                              type="primary"
                              shape="circle"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(form.getFieldValue('idCardFrontUrl'));
                              }}
                              style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: 'none' }}
                            />
                            <Button
                              type="primary"
                              shape="circle"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                // 触发文件选择
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.jpg,.jpeg,.png';
                                input.onchange = (event) => {
                                  const file = (event.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    handleIdCardUpload('front', { file: { originFileObj: file } });
                                  }
                                };
                                input.click();
                              }}
                              style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: 'none' }}
                            />
                          </div>
                        </>
                      ) : (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          height: '100%',
                          color: '#999'
                        }}>
                          <PlusOutlined style={{ fontSize: '32px' }} />
                          <div style={{ marginTop: 8, fontSize: '14px' }}>上传身份证正面</div>
                        </div>
                      )}
                    </div>
                  </Upload>
                </Form.Item>
                <Form.Item name="idCardBackUrl" label="身份证反面">
                  <Upload
                    name="file"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={() => false}
                    onChange={(info) => handleIdCardUpload('back', info)}
                    accept=".jpg,.jpeg,.png"
                  >
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      {form.getFieldValue('idCardBackUrl') ? (
                        <>
                          <img 
                            src={form.getFieldValue('idCardBackUrl')} 
                            alt="身份证反面" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} 
                          />
                          {/* 预览和重新上传图标 */}
                          <div style={{ 
                            position: 'absolute', 
                            top: '8px', 
                            right: '8px', 
                            display: 'flex', 
                            gap: '8px' 
                          }}>
                            <Button
                              type="primary"
                              shape="circle"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(form.getFieldValue('idCardBackUrl'));
                              }}
                              style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: 'none' }}
                            />
                            <Button
                              type="primary"
                              shape="circle"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                // 触发文件选择
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.jpg,.jpeg,.png';
                                input.onchange = (event) => {
                                  const file = (event.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    handleIdCardUpload('back', { file: { originFileObj: file } });
                                  }
                                };
                                input.click();
                              }}
                              style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: 'none' }}
                            />
                          </div>
                        </>
                      ) : (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          height: '100%',
                          color: '#999'
                        }}>
                          <PlusOutlined style={{ fontSize: '32px' }} />
                          <div style={{ marginTop: 8, fontSize: '14px' }}>上传身份证反面</div>
                        </div>
                      )}
                    </div>
                  </Upload>
                </Form.Item>
              </div>

              {/* 个人照片 */}
              <h3 style={{ marginTop: 24 }}>个人照片</h3>
              <Form.Item name="photoUrls">
                <Upload
                  name="file"
                  listType="picture-card"
                  fileList={(form.getFieldValue('photoUrls') || []).map((url: string, index: number) => ({
                    uid: `-${index}`,
                    name: `photo-${index}.jpg`,
                    status: 'done',
                    url: url
                  }))}
                  action="/api/upload/file"
                  data={{ type: 'personalPhoto' }}
                  headers={{
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                  }}
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
                    const { status, name, response } = info.file;
                    
                    if (status === 'done') {
                      if (response && response.success && response.data) {
                        message.success(`${name} 上传成功`);
                        
                        // 更新表单字段
                        const currentUrls = form.getFieldValue('photoUrls') || [];
                        const fileUrl = `/api/upload/file/${response.data.fileId}`;
                        const newUrls = [...currentUrls, fileUrl];
                        form.setFieldsValue({ photoUrls: newUrls });
                      } else {
                        message.error(`${name} 上传失败: ${response?.message || '未知错误'}`);
                      }
                    } else if (status === 'error') {
                      message.error(`${name} 上传失败`);
                    }
                  }}
                  onRemove={async (file) => {
                    try {
                      const fileUrl = extractFileUrl(file);
                      if (!fileUrl) {
                        message.error('无法获取文件URL');
                        return false;
                      }

                      const fileId = extractFileId(fileUrl);
                      if (!fileId) {
                        message.error('无法获取文件ID');
                        return false;
                      }

                      const response = await axios.delete(`/api/upload/file/${fileId}`, {
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem('token')}`,
                        },
                      });

                      if (response.data.success) {
                        const currentUrls = form.getFieldValue('photoUrls') || [];
                        const newUrls = currentUrls.filter((url: string) => url !== fileUrl);
                        form.setFieldsValue({ photoUrls: newUrls });
                        
                        message.success('文件删除成功');
                        return true;
                      } else {
                        message.error(response.data.message || '删除失败');
                        return false;
                      }
                    } catch (error: any) {
                      console.error('删除文件失败:', error);
                      message.error(error.response?.data?.message || '删除文件失败');
                      return false;
                    }
                  }}
                  onPreview={(file) => {
                    const previewUrl = extractFileUrl(file);
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
              <h3 style={{ marginTop: 24 }}>技能证书</h3>
              <Form.Item name="certificateUrls">
                <Upload
                  name="file"
                  listType="picture-card"
                  fileList={(form.getFieldValue('certificateUrls') || []).map((url: string, index: number) => ({
                    uid: `-${index}`,
                    name: `certificate-${index}.jpg`,
                    status: 'done',
                    url: url
                  }))}
                  action="/api/upload/file"
                  data={{ type: 'certificate' }}
                  headers={{
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                  }}
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
                    const { status, name, response } = info.file;
                    
                    if (status === 'done') {
                      if (response && response.success && response.data) {
                        message.success(`${name} 上传成功`);
                        
                        // 更新表单字段
                        const currentUrls = form.getFieldValue('certificateUrls') || [];
                        const fileUrl = `/api/upload/file/${response.data.fileId}`;
                        const newUrls = [...currentUrls, fileUrl];
                        form.setFieldsValue({ certificateUrls: newUrls });
                      } else {
                        message.error(`${name} 上传失败: ${response?.message || '未知错误'}`);
                      }
                    } else if (status === 'error') {
                      message.error(`${name} 上传失败`);
                    }
                  }}
                  onRemove={async (file) => {
                    try {
                      const fileUrl = extractFileUrl(file);
                      if (!fileUrl) {
                        message.error('无法获取文件URL');
                        return false;
                      }

                      const fileId = extractFileId(fileUrl);
                      if (!fileId) {
                        message.error('无法获取文件ID');
                        return false;
                      }

                      const response = await axios.delete(`/api/upload/file/${fileId}`, {
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem('token')}`,
                        },
                      });

                      if (response.data.success) {
                        const currentUrls = form.getFieldValue('certificateUrls') || [];
                        const newUrls = currentUrls.filter((url: string) => url !== fileUrl);
                        form.setFieldsValue({ certificateUrls: newUrls });
                        
                        message.success('文件删除成功');
                        return true;
                      } else {
                        message.error(response.data.message || '删除失败');
                        return false;
                      }
                    } catch (error: any) {
                      console.error('删除文件失败:', error);
                      message.error(error.response?.data?.message || '删除文件失败');
                      return false;
                    }
                  }}
                  onPreview={(file) => {
                    const previewUrl = extractFileUrl(file);
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
              <Form.Item name="medicalReportUrls">
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
                  action="/api/upload/file"
                  data={{ type: 'medicalReport' }}
                  headers={{
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                  }}
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
                    const { status, name, response } = info.file;
                    
                    if (status === 'done') {
                      if (response && response.success && response.data) {
                        message.success(`${name} 上传成功`);
                        
                        // 更新表单字段
                        const currentUrls = form.getFieldValue('medicalReportUrls') || [];
                        const fileUrl = `/api/upload/file/${response.data.fileId}`;
                        const newUrls = [...currentUrls, fileUrl];
                        form.setFieldsValue({ medicalReportUrls: newUrls });
                      } else {
                        message.error(`${name} 上传失败: ${response?.message || '未知错误'}`);
                      }
                    } else if (status === 'error') {
                      message.error(`${name} 上传失败`);
                    }
                  }}
                  onRemove={async (file) => {
                    try {
                      const fileUrl = extractFileUrl(file);
                      if (!fileUrl) {
                        message.error('无法获取文件URL');
                        return false;
                      }

                      const fileId = extractFileId(fileUrl);
                      if (!fileId) {
                        message.error('无法获取文件ID');
                        return false;
                      }

                      const response = await axios.delete(`/api/upload/file/${fileId}`, {
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem('token')}`,
                        },
                      });

                      if (response.data.success) {
                        const currentUrls = form.getFieldValue('medicalReportUrls') || [];
                        const newUrls = currentUrls.filter((url: string) => url !== fileUrl);
                        form.setFieldsValue({ medicalReportUrls: newUrls });
                        
                        message.success('文件删除成功');
                        return true;
                      } else {
                        message.error(response.data.message || '删除失败');
                        return false;
                      }
                    } catch (error: any) {
                      console.error('删除文件失败:', error);
                      message.error(error.response?.data?.message || '删除文件失败');
                      return false;
                    }
                  }}
                  onPreview={(file) => {
                    const previewUrl = extractFileUrl(file);
                    if (previewUrl) {
                      if (isPdfFile(file)) {
                        window.open(previewUrl, '_blank', 'noopener,noreferrer');
                      } else {
                        handlePreview(previewUrl);
                      }
                    }
                  }}
                  itemRender={(originNode, file) => {
                    if (isPdfFile(file)) {
                      const previewUrl = extractFileUrl(file);
                      const fileName = file.name || previewUrl?.split('/').pop() || 'PDF文档';
                      return (
                        <div 
                          style={{ 
                            position: 'relative',
                            width: '100%', 
                            height: '100%',
                            display: 'flex', 
                            flexDirection: 'column',
                            justifyContent: 'center', 
                            alignItems: 'center',
                            backgroundColor: '#f5f5f5',
                            border: '1px solid #d9d9d9',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            overflow: 'hidden'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (previewUrl) {
                              window.open(previewUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
                          <div style={{ 
                            marginTop: 8, 
                            fontSize: 12, 
                            textAlign: 'center', 
                            padding: '0 4px', 
                            wordBreak: 'break-all',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {fileName}
                          </div>
                          <div style={{ 
                            fontSize: 12, 
                            color: '#999', 
                            marginTop: 4,
                            position: 'absolute',
                            bottom: 4,
                            left: 0,
                            right: 0,
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.8)',
                            padding: '2px 0'
                          }}>
                            点击查看PDF
                          </div>
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
    </>
  );
};

export default ResumeDetail;