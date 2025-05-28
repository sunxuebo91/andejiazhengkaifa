import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Descriptions, Button, Spin, message, Image, Tag, Modal, Form, Input, Select, DatePicker, Upload, Typography, Tooltip, Table } from 'antd';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { EditOutlined, SaveOutlined, FilePdfOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
// 添加dayjs插件
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import customParseFormat from 'dayjs/plugin/customParseFormat';
// 注册插件
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

dayjs.extend(customParseFormat);
// import apiService from '../../services/api';
// import type { UploadFile } from 'antd/es/upload/interface';
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

// interface FollowUpRecord {
//   id: string;
//   content: string;
//   timestamp: string;
// }

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
// const processImageUrl = (url: string): string => {
//   if (!url) return '';
//   return url.startsWith('http') ? url : `/api/upload/file/${url}`;
// };

const ResumeDetail = () => {
  const { id: shortId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewVisible, setPreviewVisible] = useState(false);

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
      // const generateImageUrls = (fileIds: string[]): string[] => {
      //   if (!Array.isArray(fileIds)) return [];
      //   return fileIds.map(fileId => fileId);
      // };

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

  // 处理编辑操作
  const handleEdit = () => {
    if (resume) {
      const formattedResume = {
        ...resume,
        workExperiences: resume.workExperiences?.map((exp: any) => ({
          ...exp,
          startDate: exp.startDate ? dayjs(exp.startDate).format('YYYY-MM') : null,
          endDate: exp.endDate ? dayjs(exp.endDate).format('YYYY-MM') : null,
          description: exp.description || ''
        })) || [],
        birthDate: resume.birthDate ? dayjs(resume.birthDate).format('YYYY-MM-DD') : null,
        medicalExamDate: resume.medicalExamDate ? dayjs(resume.medicalExamDate).format('YYYY-MM-DD') : null,
        skills: Array.isArray(resume.skills) ? resume.skills : [],
        serviceArea: Array.isArray(resume.serviceArea) ? resume.serviceArea : 
          (resume.serviceArea ? [resume.serviceArea] : []),
        photoUrls: Array.isArray(resume.photoUrls) ? resume.photoUrls : [],
        certificateUrls: Array.isArray(resume.certificateUrls) ? resume.certificateUrls : [],
        medicalReportUrls: Array.isArray(resume.medicalReportUrls) ? resume.medicalReportUrls : [],
        idCardFrontUrl: resume.idCardFront?.url || resume.idCardFrontUrl || '',
        idCardBackUrl: resume.idCardBack?.url || resume.idCardBackUrl || '',
        currentAddress: resume.currentAddress || '',
        hukouAddress: resume.hukouAddress || '',
        nativePlace: resume.nativePlace || ''
      };
      
      localStorage.setItem('editingResume', JSON.stringify(formattedResume));
      navigate(`/aunt/create-resume?edit=true&id=${resume.id}`);
    } else {
      message.error('无法获取简历数据');
    }
  };

  // 处理图片预览
  const handlePreview = (url: string) => {
    console.log(`处理预览:`, url);
    if (!url) {
      console.warn('预览URL为空');
      return;
    }
    // 判断是否为 PDF 文件（例如，通过 isPdfFile 或检查 url 是否包含"pdf"）
    const isPdf = isPdfFile({ url });
    if (isPdf) {
      // 使用 Modal 打开 PDF 预览，例如使用 iframe 加载 PDF
      setPreviewImage(url);
      setPreviewVisible(true);
    } else {
      // 原有逻辑，预览图片
      setPreviewImage(url);
      setPreviewVisible(true);
    }
  };

  // 改进的文件预览渲染函数
  const renderFilePreview = (file: FileInfo | string, index: number) => {
    if (typeof file === 'string') {
      return renderLegacyFilePreview(file, index);
    }

    // 处理FileInfo对象，使用url字段而不是fileId
    const fileUrl = file.url || `/api/upload/file/${file.fileId}`;
    // 兼容两种字段名：mimeType 和 mimetype
    const mimeType = file.mimeType || file.mimetype || '';
    const isPdf = isPdfFile(file);
    const uniqueKey = `file-${file.fileId || index}-${index}`;

    console.log('渲染文件预览:', {
      filename: file.filename,
      mimeType: mimeType,
      isPdf: isPdf,
      fileUrl: fileUrl
    });

    // 如果 fileUrl 为空或无效，则直接不渲染任何内容
    if (!fileUrl) {
      return null;
    }

    return (
      <div key={uniqueKey} style={{ display: 'inline-block', margin: '8px', position: 'relative' }}>
        {isPdf ? (
          <div style={{ position: 'relative' }}>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() => handlePreview(fileUrl)}
              style={{ height: '60px', width: '120px' }}
            >
              已有报告
            </Button>

          </div>
        ) : (
          <div style={{ position: 'relative' }}>
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
              fallback="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" // 使用一个1x1的透明GIF作为fallback
              // 或者 fallback={null} 如果组件支持
            />

          </div>
        )}
      </div>
    );
  };

  // 更新渲染旧版文件预览的函数
  const renderLegacyFilePreview = (url: string, index: number) => {
    const fileUrl = url.startsWith('/api/upload/file/') ? url : `/api/upload/file/${url}`;
    const uniqueKey = `legacy-file-${index}`;
    
    const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');

    // 如果 fileUrl 为空或无效，则直接不渲染任何内容
    if (!fileUrl || fileUrl === '/api/upload/file/') { // 额外判断一下是否只有前缀
      return null;
    }
    
    return (
      <div key={uniqueKey} style={{ display: 'inline-block', margin: '8px', position: 'relative' }}>
        {isPdf ? (
          <div style={{ position: 'relative' }}>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() => handlePreview(fileUrl)}
              style={{ height: '60px', width: '120px' }}
            >
              已有报告
            </Button>

          </div>
        ) : (
          <div style={{ position: 'relative' }}>
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
              fallback="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" // 使用一个1x1的透明GIF作为fallback
              // 或者 fallback={null} 如果组件支持
              onError={(e) => {
                // 确保图片加载失败时，其占位符或自身不显示
                // (e.target as HTMLImageElement).style.display = 'none'; // 这是一个更强的隐藏方式，但fallback可能已经处理了
                console.log('图片加载失败，将不显示:', fileUrl);
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

      // 2. 上传图片
      const uploadFormData = new FormData();
      uploadFormData.append('file', compressedFile);
      
      const uploadResponse = await axios.post(`/api/upload/id-card/${type}`, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.message || '图片上传失败');
      }

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
            <Button 
              key="edit" 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={handleEdit}
            >
              编辑
            </Button>
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
            ) : null}
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
        </Card>

        {/* 添加跟进记录弹窗 */}
        <AddFollowUpModal />

        <Modal
          open={previewVisible}
          title={previewImage ? (isPdfFile({ url: previewImage }) ? 'PDF 预览' : '图片预览') : ''}
          footer={null}
          onCancel={() => setPreviewVisible(false)}
        >
          {isPdfFile({ url: previewImage }) ? (
            <React.Fragment>
              <iframe src={previewImage} style={{ width: '100%', height: '80vh' }} />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <img alt="预览" style={{ width: '100%' }} src={previewImage} />
            </React.Fragment>
          )}
        </Modal>
      </div>
    </>
  );
};

export default ResumeDetail;