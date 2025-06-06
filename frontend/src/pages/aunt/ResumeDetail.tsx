import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Image,
  Button,
  Modal,
  Form,
  Input,
  Table,
  Tag,
  Typography,
  App,
  Tooltip,
  Select,
  Spin
} from 'antd';
import {
  EditOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import apiService from '../../services/api';
import { getCurrentUser } from '@/services/auth';
import { createFollowUp, getFollowUpsByResumeId, deleteFollowUp, followUpTypeMap, type FollowUpRecord } from '@/services/followUp.service';
import { isPdfFile } from '../../utils/uploadHelper';
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
// const { Option } = Select;

// 中国省份/地区常量数据
// const provinces = [
//   // 23个省
//   '河北省', '山西省', '辽宁省', '吉林省', '黑龙江省', '江苏省', '浙江省', '安徽省', 
//   '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省', '广东省', '海南省', 
//   '四川省', '贵州省', '云南省', '陕西省', '甘肃省', '青海省', '台湾省',
//   // 4个直辖市
//   '北京市', '天津市', '上海市', '重庆市',
//   // 5个自治区
//   '广西壮族自治区', '内蒙古自治区', '西藏自治区', '宁夏回族自治区', '新疆维吾尔自治区',
//   // 2个特别行政区
//   '香港特别行政区', '澳门特别行政区'
// ];

// 中国56个民族常量数据
// const ethnicities = [
//   '汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族', '布依族', '朝鲜族',
//   '满族', '侗族', '瑶族', '白族', '土家族', '哈尼族', '哈萨克族', '傣族', '黎族', '傈僳族',
//   '佤族', '畲族', '高山族', '拉祜族', '水族', '东乡族', '纳西族', '景颇族', '柯尔克孜族', '土族',
//   '达斡尔族', '仫佬族', '羌族', '布朗族', '撒拉族', '毛南族', '仡佬族', '锡伯族', '阿昌族', '普米族',
//   '塔吉克族', '怒族', '乌孜别克族', '俄罗斯族', '鄂温克族', '德昂族', '保安族', '裕固族', '京族', '塔塔尔族',
//   '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族', '基诺族'
// ];

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
  'zhujia-hulao': string;
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
  muying: string;
  cuiru: string;
  yuezican: string;
  yingyang: string;
  'liliao-kangfu': string;
  'shuangtai-huli': string;
  'yanglao-huli': string;
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
  xiaoshi: '小时工',
  'zhujia-hulao': '住家护老'
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
  shouyi: '整理收纳',
  muying: '母婴护理师',
  cuiru: '催乳',
  yuezican: '月子餐',
  yingyang: '营养师',
  'liliao-kangfu': '理疗康复',
  'shuangtai-huli': '双胎护理',
  'yanglao-huli': '养老护理'
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

// 添加类型定义
type FileUrl = string;
type FileInfo = {
  url: string;
  filename: string;
  size: number;
  mimetype?: string;
  mimeType?: string;
  fileId?: string; // 添加fileId属性
};

// 添加工具函数来检查URL是否在新格式数据中
const isUrlInNewFormat = (url: FileUrl, newFormatData: FileInfo | FileInfo[] | undefined): boolean => {
  if (!newFormatData) return false;
  
  if (Array.isArray(newFormatData)) {
    return newFormatData.some(file => file.url === url);
  }
  
  return newFormatData.url === url;
};

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
  const { message: messageApi } = App.useApp();

  // 跟进记录相关状态
  const [followUpRecords, setFollowUpRecords] = useState<any[]>([]);
  const [isAddFollowUpVisible, setIsAddFollowUpVisible] = useState(false);
  const [followUpForm] = Form.useForm();
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // 更新日期格式化函数
  const formatDateToChinese = (dateStr: string): string => {
    if (!dateStr || dateStr === '-') return '-';
    try {
      // 处理 ISO 格式的日期字符串
      const date = dayjs(dateStr);
      if (!date.isValid()) {
        console.warn('Invalid date:', dateStr);
        return '-';
      }
      return `${date.year()}年${date.month() + 1}月`;
    } catch (e) {
      console.error('日期格式化失败:', e, '原始日期:', dateStr);
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
      console.log('=== 开始获取简历详情 ===');
      console.log('简历ID:', shortId);
      
      const response = await apiService.get<ResumeData>(`/api/resumes/${shortId}`);
      const resumeData = response.data;
      
      console.log('简历详情API响应:', {
        success: response.success,
        hasData: !!resumeData,
        resumeId: resumeData?._id,
        resumeName: resumeData?.name
      });
      
      if (response.success && resumeData) {
        console.log('设置简历数据:', resumeData);
        setResume(resumeData);
        console.log('简历数据设置完成，_id:', resumeData._id);
      } else {
        throw new Error(response.message || '获取简历详情失败');
      }
    } catch (error) {
      console.error('获取简历详情失败:', error);
      setError('获取简历详情失败');
      messageApi.error('获取简历详情失败');
    } finally {
      setLoading(false);
      console.log('=== 获取简历详情完成 ===');
    }
  };

  useEffect(() => {
    if (shortId) {
      fetchResumeDetail();
    }
  }, [shortId]);

  // 组件加载时获取跟进记录
  useEffect(() => {
    if (resume?._id) {
      fetchFollowUpRecords();
    }
  }, [resume?._id]);

  // 处理编辑操作
  const handleEdit = () => {
    if (resume) {
      console.log('准备编辑的原始数据:', resume);
      
      const formattedResume = {
        ...resume,
        workExperiences: resume.workExperiences?.map((exp: any) => {
          console.log('处理工作经历:', exp);
          // 确保日期格式正确
          const startDate = exp.startDate ? dayjs(exp.startDate).format('YYYY-MM') : null;
          const endDate = exp.endDate ? dayjs(exp.endDate).format('YYYY-MM') : null;
          console.log('格式化后的日期:', { startDate, endDate });
          
          return {
            ...exp,
            startDate,
            endDate,
            description: exp.description || ''
          };
        }) || [],
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
      
      console.log('准备保存到localStorage的数据:', formattedResume);
      localStorage.setItem('editingResume', JSON.stringify(formattedResume));
      navigate(`/aunt/create-resume?edit=true&id=${resume._id}`);
    } else {
      messageApi.error('无法获取简历数据');
    }
  };

  // 改进的文件预览渲染函数
  const renderFilePreview = (file: FileInfo | string, index: number, context: string = 'file') => {
    if (typeof file === 'string') {
      return renderLegacyFilePreview(file, index, context);
    }

    // 处理FileInfo对象，使用url字段而不是fileId
    const fileUrl = file.url || (file.fileId ? `/api/upload/file/${file.fileId}` : null);
    // 兼容两种字段名：mimeType 和 mimetype
    const isPdf = isPdfFile(file);
    const uniqueKey = `file-${file.fileId || index}-${index}`;

    // 如果 fileUrl 为空或无效，则显示错误提示
    if (!fileUrl) {
      console.log('文件URL无效，显示错误提示:', file);
      return (
        <div key={uniqueKey} style={{ 
          display: 'inline-block', 
          margin: '8px', 
          padding: '20px',
          border: '1px dashed #ff4d4f',
          borderRadius: '6px',
          color: '#ff4d4f',
          textAlign: 'center',
          minWidth: '150px'
        }}>
          <p>文件URL无效</p>
          <small>{file.filename || '未知文件'}</small>
        </div>
      );
    }

    // 根据上下文生成PDF文件名
    const getPdfDisplayName = (context: string) => {
      switch (context) {
        case 'certificate':
          return '证书PDF文件';
        case 'report':
          return '体检报告PDF文件';
        case 'idCard':
          return '身份证PDF文件';
        default:
          return 'PDF文件';
      }
    };

    // 处理文件下载
    const handleDownload = (url: string, filename?: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div key={uniqueKey} style={{ display: 'inline-block', margin: '8px', position: 'relative' }}>
        {isPdf ? (
          <div style={{ 
            position: 'relative',
            width: '200px',
            height: '200px',
            border: '2px dashed #1890ff',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => handleDownload(fileUrl, file.filename)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#40a9ff';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1890ff';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <FilePdfOutlined style={{ 
              fontSize: '48px', 
              color: '#1890ff',
              marginBottom: '12px'
            }} />
            <div style={{
              textAlign: 'center',
              color: '#1890ff',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              wordBreak: 'break-all',
              padding: '0 8px'
            }}>
              {getPdfDisplayName(context)}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'center'
            }}>
              点击下载
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <Image
              src={fileUrl}
              alt={file.filename || `文件 ${index + 1}`}
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
              fallback="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              onError={(e) => {
                console.error('图片加载失败:', fileUrl, e);
                // 替换为错误提示图片
                const imgElement = e.target as HTMLImageElement;
                if (imgElement) {
                  const errorDiv = document.createElement('div');
                  errorDiv.style.cssText = 'background: #fff2f0; border: 1px dashed #ff4d4f; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; color: #ff4d4f; flex-direction: column; font-size: 12px;';
                  errorDiv.innerHTML = `<p>图片加载失败</p><small style="word-break: break-all;">${file.filename || '未知文件'}</small><br><small style="word-break: break-all; color: #999;">${fileUrl}</small>`;
                  imgElement.parentNode?.replaceChild(errorDiv, imgElement);
                }
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // 更新渲染旧版文件预览的函数
  const renderLegacyFilePreview = (url: string, index: number, context: string = 'file') => {
    // 如果URL为空或无效，显示错误提示
    if (!url || url === '/api/upload/file/' || url === '/api/upload/file') {
      console.log('无效的文件URL，显示错误提示:', url);
      return (
        <div key={`legacy-error-${index}`} style={{ 
          display: 'inline-block', 
          margin: '8px', 
          padding: '20px',
          border: '1px dashed #ff4d4f',
          borderRadius: '6px',
          color: '#ff4d4f',
          textAlign: 'center',
          minWidth: '150px'
        }}>
          <p>文件URL无效</p>
          <small>{url || '空URL'}</small>
        </div>
      );
    }

    // 修复URL处理逻辑：如果是完整的HTTPS URL，直接使用；否则构造本地API路径
    let fileUrl: string;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // 已经是完整的URL（如COS URL），直接使用
      fileUrl = url;
      console.log('使用完整URL:', fileUrl);
    } else if (url.startsWith('/api/upload/file/')) {
      // 已经是本地API路径，直接使用
      fileUrl = url;
    } else {
      // 只是文件ID，需要构造本地API路径
      fileUrl = `/api/upload/file/${url}`;
    }
    
    const uniqueKey = `legacy-file-${index}`;
    const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');

    // 根据上下文生成PDF文件名
    const getPdfDisplayName = (context: string) => {
      switch (context) {
        case 'certificate':
          return '证书PDF文件';
        case 'report':
          return '体检报告PDF文件';
        case 'idCard':
          return '身份证PDF文件';
        default:
          return 'PDF文件';
      }
    };

    // 处理文件下载
    const handleDownload = (url: string, filename?: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div key={uniqueKey} style={{ display: 'inline-block', margin: '8px', position: 'relative' }}>
        {isPdf ? (
          <div style={{ 
            position: 'relative',
            width: '200px',
            height: '200px',
            border: '2px dashed #1890ff',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => handleDownload(fileUrl, url.split('/').pop()?.split('?')[0])}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#40a9ff';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1890ff';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <FilePdfOutlined style={{ 
              fontSize: '48px', 
              color: '#1890ff',
              marginBottom: '12px'
            }} />
            <div style={{
              textAlign: 'center',
              color: '#1890ff',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              wordBreak: 'break-all',
              padding: '0 8px'
            }}>
              {getPdfDisplayName(context)}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'center'
            }}>
              点击下载
            </div>
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
              fallback="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              onError={(e) => {
                console.error('旧版图片加载失败:', fileUrl, e);
                // 替换为错误提示图片
                const imgElement = e.target as HTMLImageElement;
                if (imgElement) {
                  const errorDiv = document.createElement('div');
                  errorDiv.style.cssText = 'background: #fff2f0; border: 1px dashed #ff4d4f; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; color: #ff4d4f; flex-direction: column; font-size: 12px;';
                  errorDiv.innerHTML = `<p>图片加载失败</p><small style="word-break: break-all;">${fileUrl}</small>`;
                  imgElement.parentNode?.replaceChild(errorDiv, imgElement);
                }
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
      if (!exp) {
        console.warn(`工作经历 ${index + 1} 数据无效:`, exp);
        return null;
      }
      
      const logData = {
        original: exp,
        startDate: exp.startDate,
        endDate: exp.endDate,
        formattedStartDate: formatDateToChinese(exp.startDate),
        formattedEndDate: formatDateToChinese(exp.endDate)
      };
      console.log(`渲染工作经历 ${index + 1}:`, logData);
      
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
              {exp.startDate ? formatDateToChinese(exp.startDate) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {exp.endDate ? formatDateToChinese(exp.endDate) : '-'}
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
    if (!resume?._id) {
      console.warn('无法获取跟进记录：简历ID不存在');
      return;
    }
    
    try {
      console.log('=== 开始获取跟进记录 ===');
      console.log('简历ID:', resume._id);
      
      const response = await getFollowUpsByResumeId(resume._id, 1, 50);
      
      console.log('跟进记录API响应:', response);
      
      if (response.success && response.data) {
        const { items } = response.data;
        console.log('跟进记录列表:', items);
        setFollowUpRecords(items || []);
        
        if (items && items.length > 0) {
          const firstRecord = items[0];
          console.log('第一条跟进记录详情:', {
            id: firstRecord._id,
            type: firstRecord.type,
            content: firstRecord.content,
            createdAt: firstRecord.createdAt,
            createdBy: firstRecord.createdBy
          });
        } else {
          console.log('没有找到跟进记录');
        }
      } else {
        console.warn('跟进记录响应格式异常:', response);
        setFollowUpRecords([]);
      }
      
      console.log('=== 获取跟进记录完成 ===');
    } catch (error) {
      console.error('获取跟进记录失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      messageApi.error(error instanceof Error ? error.message : '获取跟进记录失败');
      setFollowUpRecords([]);
    }
  };
  
  // 添加跟进记录
  const handleAddFollowUp = async (values: any) => {
    try {
      setFollowUpLoading(true);
      
      if (!resume?._id) {
        messageApi.error('简历ID不存在');
        return;
      }
      
      console.log('准备创建跟进记录:', {
        resumeId: resume._id,
        type: values.type,
        content: values.content
      });
      
      // 调用API创建跟进记录
      const response = await createFollowUp({
        resumeId: resume._id,
        type: values.type,
        content: values.content,
      });
      
      console.log('跟进记录创建成功:', response);
      
      messageApi.success('添加跟进记录成功');
      setIsAddFollowUpVisible(false);
      followUpForm.resetFields();
      
      // 刷新跟进记录列表
      await fetchFollowUpRecords();
      
      // 验证刷新后的数据
      console.log('刷新后的跟进记录列表:', followUpRecords);
    } catch (error) {
      console.error('添加跟进记录失败:', error);
      messageApi.error(error instanceof Error ? error.message : '添加跟进记录失败');
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
      dataIndex: ['createdBy', 'name'],
      key: 'createdBy',
      render: (_: string, record: FollowUpRecord) => {
        if (!record.createdBy) return '-';
        return record.createdBy.name || record.createdBy.username || '-';
      },
    },
    {
      title: '跟进类型',
      dataIndex: 'type',
      key: 'type',
      render: (text: string) => followUpTypeMap[text as keyof typeof followUpTypeMap] || text,
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
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: FollowUpRecord) => {
        const currentUser = getCurrentUser();
        const canDelete = currentUser?.role === 'admin' || record.createdBy._id === currentUser?.id;
        
        return canDelete ? (
          <Button 
            type="link" 
            danger
            size="small"
            onClick={() => handleDeleteFollowUp(record._id)}
          >
            删除
          </Button>
        ) : null;
      },
    },
  ];

  // 删除跟进记录
  const handleDeleteFollowUp = async (id: string) => {
    try {
      await deleteFollowUp(id);
      messageApi.success('删除跟进记录成功');
      fetchFollowUpRecords(); // 刷新列表
    } catch (error) {
      console.error('删除跟进记录失败:', error);
      messageApi.error('删除跟进记录失败');
    }
  };

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
          <Input.TextArea rows={4} placeholder="请输入跟进内容" maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );

  // 在组件加载时打印图片URL信息
  useEffect(() => {
    if (resume) {
      console.log('=== 简历图片URL详细信息 ===');
      console.log('简历ID:', resume._id);
      console.log('简历姓名:', resume.name);
      
      // 检查新格式文件信息
      console.log('新格式文件信息:');
      console.log('  - idCardFront:', resume.idCardFront);
      console.log('  - idCardBack:', resume.idCardBack);
      console.log('  - personalPhoto:', resume.personalPhoto);
      console.log('  - certificates:', resume.certificates);
      console.log('  - reports:', resume.reports);
      
      // 检查旧格式URL数组
      console.log('旧格式URL数组:');
      console.log('  - idCardFrontUrl:', resume.idCardFrontUrl);
      console.log('  - idCardBackUrl:', resume.idCardBackUrl);
      console.log('  - photoUrls:', resume.photoUrls);
      console.log('  - certificateUrls:', resume.certificateUrls);
      console.log('  - medicalReportUrls:', resume.medicalReportUrls);
      
      // 统计文件数量
      const fileCounts = {
        idCard: (resume.idCardFront ? 1 : 0) + (resume.idCardBack ? 1 : 0),
        photos: (resume.personalPhoto ? (Array.isArray(resume.personalPhoto) ? resume.personalPhoto.length : 1) : 0) + 
                (resume.photoUrls ? resume.photoUrls.filter(Boolean).length : 0),
        certificates: (resume.certificates ? resume.certificates.length : 0) + 
                     (resume.certificateUrls ? resume.certificateUrls.filter(Boolean).length : 0),
        reports: (resume.reports ? resume.reports.length : 0) + 
                (resume.medicalReportUrls ? resume.medicalReportUrls.filter(Boolean).length : 0)
      };
      
      console.log('文件统计:', fileCounts);
      
      const totalFiles = Object.values(fileCounts).reduce((sum, count) => sum + count, 0);
      if (totalFiles === 0) {
        console.warn('⚠️ 该简历没有任何文件，这可能是因为:');
        console.warn('1. 创建简历时没有上传任何文件');
        console.warn('2. 文件上传过程中出现错误');
        console.warn('3. 这是一个测试简历');
        console.warn('建议: 可以通过编辑简历功能重新上传文件');
      } else {
        console.log(`✅ 找到 ${totalFiles} 个文件`);
      }
      
      console.log('=== 简历图片URL信息结束 ===');
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
              { path: '/aunt/list', title: '阿姨简历库' },
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
                <Tooltip title={`完整ID: ${resume?._id || '未知'}`}>
                  <span>{resume?._id ? resume._id.substring(0, 8).padEnd(8, '0') : '-'}</span>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {resume?.idCardFront ? (
                renderFilePreview(resume.idCardFront, 0, 'idCard')
              ) : (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  border: '1px dashed #d9d9d9', 
                  borderRadius: '6px',
                  color: '#999',
                  minWidth: '200px'
                }}>
                  <p>未上传身份证正面</p>
                </div>
              )}
              {resume?.idCardBack ? (
                renderFilePreview(resume.idCardBack, 1, 'idCard')
              ) : (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  border: '1px dashed #d9d9d9', 
                  borderRadius: '6px',
                  color: '#999',
                  minWidth: '200px'
                }}>
                  <p>未上传身份证背面</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="个人照片" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {/* 优先使用新格式的 personalPhoto */}
              {resume?.personalPhoto && (
                Array.isArray(resume.personalPhoto) 
                  ? resume.personalPhoto.map((photo: FileInfo, index: number) => (
                      <div key={`photo-${photo.url}-${index}`}>
                        {renderFilePreview(photo, index, 'photo')}
                      </div>
                    ))
                  : renderFilePreview(resume.personalPhoto, 0, 'photo')
              )}
              {/* 处理旧版 photoUrls，但排除已经在新格式中显示过的 URL */}
              {resume?.photoUrls?.filter(Boolean).filter((url: FileUrl) => 
                !isUrlInNewFormat(url, resume.personalPhoto)
              ).map((url: FileUrl, index: number) => (
                <div key={`photo-legacy-${url}-${index}`}>
                  {renderFilePreview(url, index, 'photo')}
                </div>
              ))}
              {/* 如果没有任何照片，显示提示信息 */}
              {(!resume?.personalPhoto || (Array.isArray(resume.personalPhoto) && resume.personalPhoto.length === 0)) && 
               (!resume?.photoUrls || resume.photoUrls.length === 0) && (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  border: '1px dashed #d9d9d9', 
                  borderRadius: '6px',
                  color: '#999',
                  width: '100%'
                }}>
                  <p>未上传个人照片</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="证书照片" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {/* 优先使用新格式的 certificates */}
              {resume?.certificates?.map((cert: FileInfo, index: number) => (
                <div key={`cert-${cert.url}-${index}`}>
                  {renderFilePreview(cert, index, 'certificate')}
                </div>
              ))}
              {/* 处理旧版 certificateUrls，但排除已经在新格式中显示过的 URL */}
              {resume?.certificateUrls?.filter(Boolean).filter((url: FileUrl) => 
                !isUrlInNewFormat(url, resume.certificates)
              ).map((url: FileUrl, index: number) => (
                <div key={`cert-legacy-${url}-${index}`}>
                  {renderFilePreview(url, index, 'certificate')}
                </div>
              ))}
              {/* 如果没有任何证书，显示提示信息 */}
              {(!resume?.certificates || resume.certificates.length === 0) && 
               (!resume?.certificateUrls || resume.certificateUrls.length === 0) && (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  border: '1px dashed #d9d9d9', 
                  borderRadius: '6px',
                  color: '#999',
                  width: '100%'
                }}>
                  <p>未上传证书照片</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="体检报告" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {/* 优先使用新格式的 reports */}
              {resume?.reports?.map((report: FileInfo, index: number) => (
                <div key={`report-${report.url}-${index}`}>
                  {renderFilePreview(report, index, 'report')}
                </div>
              ))}
              {/* 处理旧版 medicalReportUrls，但排除已经在新格式中显示过的 URL */}
              {resume?.medicalReportUrls?.filter(Boolean).filter((url: FileUrl) => 
                !isUrlInNewFormat(url, resume.reports)
              ).map((url: FileUrl, index: number) => (
                <div key={`report-legacy-${url}-${index}`}>
                  {renderFilePreview(url, index, 'report')}
                </div>
              ))}
              {/* 如果没有任何体检报告，显示提示信息 */}
              {(!resume?.reports || resume.reports.length === 0) && 
               (!resume?.medicalReportUrls || resume.medicalReportUrls.length === 0) && (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  border: '1px dashed #d9d9d9', 
                  borderRadius: '6px',
                  color: '#999',
                  width: '100%'
                }}>
                  <p>未上传体检报告</p>
                </div>
              )}
            </div>
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
              rowKey="_id"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Card>

        {/* 添加跟进记录弹窗 */}
        <AddFollowUpModal />
      </div>
    </>
  );
};

export default ResumeDetail;