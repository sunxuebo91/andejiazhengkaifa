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
  Spin,
  Rate,
  List,
  Space,
  Divider,
  Timeline,
  Empty,
  Upload,
  Grid,
  Switch
} from 'antd';

const { useBreakpoint } = Grid;

// 响应式列数：移动端 1 列，小屏 2 列，桌面 3 列
const RESP_COL_3 = { xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 3 };
const RESP_COL_2 = { xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 };
import type { UploadProps } from 'antd';
import {
  EditOutlined,
  FilePdfOutlined,
  PlusOutlined,
  StarFilled,
  CheckCircleOutlined,
  CloseOutlined,
  DownloadOutlined,
  SafetyOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  AuditOutlined,
  UpOutlined,
  DownOutlined,
  StopOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import apiService from '../../services/api';
import { getCurrentUser, hasRole } from '@/services/auth';
import { useAuth } from '../../contexts/AuthContext';
import { resumeService } from '@/services/resume.service';
import { createFollowUp, getFollowUpsByResumeId, deleteFollowUp, followUpTypeMap, type FollowUpRecord } from '@/services/followUp.service';
import { backgroundCheckService } from '../../services/backgroundCheckService';
import { BackgroundCheck, BG_STATUS_MAP } from '../../types/background-check.types';
import { isPdfFile } from '../../utils/uploadHelper';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { getDistrictLabel } from '../../constants/beijingDistricts';
import Authorized from '../../components/Authorized';
import { ImageService } from '../../services/imageService';
import {
  createBlacklist,
  checkBlacklist,
  BLACKLIST_REASON_TYPE_LABELS,
  type BlacklistEvidence,
} from '../../services/auntBlacklistService';
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
  yuesao: string;
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
  signed: string;
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
  yuesao: '月嫂',
  'zhujia-yuer': '住家育儿嫂',
  'baiban-yuer': '白班育儿',
  baojie: '保洁',
  'baiban-baomu': '白班保姆',
  'zhujia-baomu': '住家保姆',
  yangchong: '养宠',
  xiaoshi: '小时工',
  'zhujia-hulao': '住家护老',
  jiajiao: '家教',
  peiban: '陪伴师'
};

// 接单状态映射
const orderStatusMap: OrderStatusMapType = {
  accepting: '想接单',
  'not-accepting': '不接单',
  signed: '已签约',
  'on-service': '已上户'
};

// 技能标签映射
const skillsMap: SkillsMapType = {
  chanhou: '产后修复师',
  'teshu-yinger': '特殊婴儿护理',
  yiliaobackground: '医疗背景',
  yuying: '高级育婴师',
  zaojiao: '早教师',
  fushi: '辅食营养师',
  ertui: '小儿推拿师',
  waiyu: '外语',
  zhongcan: '中餐',
  xican: '西餐',
  mianshi: '面食',
  jiashi: '驾驶',
  shouyi: '整理收纳',
  muying: '母婴护理师',
  cuiru: '高级催乳师',
  yuezican: '月子餐营养师',
  yingyang: '营养师',
  'liliao-kangfu': '理疗康复',
  'shuangtai-huli': '双胎护理',
  'yanglao-huli': '养老护理'
};

// 线索来源映射
const leadSourceMap: LeadSourceMapType = {
  referral: '转介绍',
  'referral-release': '推荐人录入',
  'paid-lead': '付费线索',
  community: '社群线索',
  'door-to-door': '地推',
  'shared-order': '合单',
  'self-registration': '自助注册',
  sales: '销售录入',
  other: '其他'
};

// 月嫂档位映射
const maternityNurseLevelMap: { [key: string]: string } = {
  'junior': '初级月嫂',
  'silver': '银牌月嫂',
  'gold': '金牌月嫂',
  'platinum': '铂金月嫂',
  'diamond': '钻石月嫂',
  'crown': '皇冠月嫂'
};

// 学习意向映射
const learningIntentionMap: { [key: string]: string } = {
  'yuesao': '月嫂',
  'yuersao': '育儿嫂',
  'baomu': '保姆',
  'hulao': '护老'
};

// 当前阶段映射
const currentStageMap: { [key: string]: string } = {
  'experienced-certified': '有经验有证书',
  'experienced-no-cert': '有经验无证书',
  'certified-no-exp': '有证书无经验',
  'beginner': '小白',
  'not-looking': '不找工作'
};

// 添加类型定义
interface WorkExperience {
  startDate: string;
  endDate: string;
  description: string;
  orderNumber?: string;
  district?: string;
  customerName?: string;
  customerReview?: string;
  photos?: FileInfo[];
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



// interface FollowUpRecord {
//   id: string;
//   content: string;
//   timestamp: string;
// }

interface EmployeeEvaluation {
  id: string;
  overallRating: number;
  comment: string;
  evaluatorName: string;
  evaluationDate: string;
  evaluationType?: string;
  tags?: string[];
  strengths?: string;
  improvements?: string;
}

interface RecommendationTag {
  tag: string;
  count: number;
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
  confinementMealPhotos?: FileInfo[];  // 月子餐照片
  cookingPhotos?: FileInfo[];  // 烹饪照片
  complementaryFoodPhotos?: FileInfo[];  // 辅食添加照片
  positiveReviewPhotos?: FileInfo[];  // 好评展示照片
  selfIntroductionVideo?: FileInfo;
  // 保持向后兼容的旧字段
  photoUrls?: (string | null)[];
  certificateUrls?: (string | null)[];
  medicalReportUrls?: (string | null)[];
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalExamDate: string;
  learningIntention?: keyof typeof learningIntentionMap;
  currentStage?: keyof typeof currentStageMap;
  internalEvaluation?: string;
  employeeEvaluations?: EmployeeEvaluation[];
  recommendationTags?: RecommendationTag[];
  createdAt: string;
  updatedAt: string;
  userId?: {
    _id: string;
    username: string;
    name: string;
  };
  lastUpdatedBy?: {
    _id: string;
    username: string;
    name: string;
  };
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
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { message: messageApi } = App.useApp();

  // 跟进记录相关状态
  const [followUpRecords, setFollowUpRecords] = useState<any[]>([]);
  const [isAddFollowUpVisible, setIsAddFollowUpVisible] = useState(false);
  const [followUpForm] = Form.useForm();
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // 员工评价相关状态
  const [isAddEvaluationVisible, setIsAddEvaluationVisible] = useState(false);
  const [evaluationForm] = Form.useForm();
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);

  // 背调信息相关状态
  const [backgroundCheck, setBackgroundCheck] = useState<BackgroundCheck | null>(null);
  const [bgCheckLoading, setBgCheckLoading] = useState(false);

  // 🆕 操作日志状态（仅管理员可见）
  const [operationLogs, setOperationLogs] = useState<any[]>([]);
  const [operationLogsLoading, setOperationLogsLoading] = useState(false);
  const [showAllOperationLogs, setShowAllOperationLogs] = useState(false);

  // 🔒 简历释放开关（创建人/管理员可操作）
  const [releaseSubmitting, setReleaseSubmitting] = useState(false);
  const [releaseLogs, setReleaseLogs] = useState<any[]>([]);
  const [releaseLogsLoading, setReleaseLogsLoading] = useState(false);

  // 加入黑名单
  const { hasPermission } = useAuth();
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const [blacklistSubmitting, setBlacklistSubmitting] = useState(false);
  const [blacklistEvidence, setBlacklistEvidence] = useState<BlacklistEvidence[]>([]);
  const [blacklistForm] = Form.useForm();

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
        console.log('🔍 检查lastUpdatedBy字段:', {
          lastUpdatedBy: resumeData.lastUpdatedBy,
          userId: resumeData.userId,
          createdAt: resumeData.createdAt,
          updatedAt: resumeData.updatedAt
        });
        
        // 🔧 前端直接处理lastUpdatedBy用户信息获取
        // ✅ 验证 lastUpdatedBy 是否是有效的 MongoDB ObjectId（24位十六进制字符串）
        const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);

        if (resumeData.lastUpdatedBy && typeof resumeData.lastUpdatedBy === 'string' && isValidObjectId(resumeData.lastUpdatedBy)) {
          console.log('🔧 前端检测到lastUpdatedBy为有效ObjectId，准备获取用户信息');
          try {
            const userResponse = await apiService.get(`/api/users/${resumeData.lastUpdatedBy}`);
            if (userResponse.success && userResponse.data) {
              resumeData.lastUpdatedBy = {
                _id: userResponse.data._id,
                username: userResponse.data.username,
                name: userResponse.data.name
              };
              console.log('🔧 前端成功获取用户信息:', resumeData.lastUpdatedBy);
            }
          } catch (error) {
            console.warn('🔧 前端获取用户信息失败:', error);
          }
        } else if (resumeData.lastUpdatedBy && typeof resumeData.lastUpdatedBy === 'string') {
          // ⚠️ lastUpdatedBy 是无效的字符串（如 "batch-sync"），清空它
          console.warn('⚠️ lastUpdatedBy 不是有效的ObjectId:', resumeData.lastUpdatedBy);
          resumeData.lastUpdatedBy = undefined;
        }
        
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

  // 组件加载时获取背调信息
  useEffect(() => {
    if (resume?.idNumber) {
      fetchBackgroundCheck();
    }
  }, [resume?.idNumber]);

  // 🆕 获取操作日志（仅管理员）
  useEffect(() => {
    const fetchOperationLogs = async () => {
      const user = getCurrentUser();
      if (!resume?._id || user?.role !== 'admin') return;
      try {
        setOperationLogsLoading(true);
        const logs = await resumeService.getOperationLogs(resume._id);
        setOperationLogs(Array.isArray(logs) ? logs : []);
      } catch (e) {
        console.error('获取操作日志失败', e);
        setOperationLogs([]);
      } finally {
        setOperationLogsLoading(false);
      }
    };
    fetchOperationLogs();
  }, [resume?._id]);

  // 🔒 拉取释放相关日志（后端按权限返回；非创建人/非 admin 仅返回自己被拦截记录）
  const loadReleaseLogs = async () => {
    if (!resume?._id) return;
    try {
      setReleaseLogsLoading(true);
      const logs = await resumeService.getReleaseLogs(resume._id);
      setReleaseLogs(Array.isArray(logs) ? logs : []);
    } catch (e) {
      console.error('获取释放日志失败', e);
      setReleaseLogs([]);
    } finally {
      setReleaseLogsLoading(false);
    }
  };
  useEffect(() => {
    loadReleaseLogs();
  }, [resume?._id]);

  // 释放开关：仅创建人或管理员可操作；单向开启
  const handleToggleRelease = async (checked: boolean) => {
    if (!resume?._id) return;
    if (!checked) {
      messageApi.info('释放开关为单向开启，开启后无法关闭');
      return;
    }
    Modal.confirm({
      title: '确认释放该简历用于签约？',
      content: '释放后该简历可被任意员工用于发起合同，操作不可撤销。',
      okText: '确认释放',
      cancelText: '取消',
      onOk: async () => {
        try {
          setReleaseSubmitting(true);
          const res = await resumeService.releaseForContract(resume._id!);
          if (res?.success) {
            messageApi.success(res?.data?.alreadyReleased ? '简历已是释放状态' : '释放成功');
            setResume((prev: any) => prev ? { ...prev, releasedForContract: true, releasedAt: res?.data?.releasedAt || new Date().toISOString() } : prev);
            loadReleaseLogs();
          } else {
            messageApi.error(res?.message || '释放失败');
          }
        } catch (err: any) {
          messageApi.error(err?.response?.data?.message || err?.message || '释放失败');
        } finally {
          setReleaseSubmitting(false);
        }
      },
    });
  };

  // 获取背调信息
  const fetchBackgroundCheck = async () => {
    if (!resume?.idNumber) {
      console.log('⚠️ 缺少身份证号，跳过背调信息获取');
      return;
    }

    try {
      setBgCheckLoading(true);
      console.log('🔍 开始获取背调信息:', resume.idNumber);

      const record = await backgroundCheckService.getByIdNo(resume.idNumber);

      if (record) {
        setBackgroundCheck(record);
        console.log('✅ 背调信息获取成功:', record);
      } else {
        setBackgroundCheck(null);
        console.log('📝 未找到背调记录');
      }
    } catch (error) {
      console.warn('获取背调信息失败:', error);
      setBackgroundCheck(null);
    } finally {
      setBgCheckLoading(false);
    }
  };

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

  // 处理删除操作（仅管理员可用）
  const handleDelete = () => {
    if (!resume?._id) {
      messageApi.error('无法获取简历ID');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要删除 <strong>{resume.name}</strong> 的简历吗？</p>
          <p style={{ color: '#ff4d4f' }}>此操作不可恢复！</p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await resumeService.delete(resume._id!);
          if (response.success) {
            messageApi.success('简历删除成功');
            // 设置刷新标记，让列表页面知道需要刷新
            localStorage.setItem('shouldRefreshResumeList', 'true');
            // 跳转回列表页
            setTimeout(() => {
              navigate('/aunt/list');
            }, 1000);
          } else {
            messageApi.error(response.message || '删除失败');
          }
        } catch (error: any) {
          console.error('删除简历失败:', error);
          const errorMsg = error.response?.data?.message || error.message || '删除失败，请重试';
          messageApi.error(errorMsg);
        }
      },
    });
  };

  // 打开加入黑名单弹窗（先反查是否已在黑名单）
  const handleOpenBlacklist = async () => {
    if (!resume) return;
    try {
      const res = await checkBlacklist({ phone: resume.phone, idCard: resume.idNumber });
      if (res.success && res.data?.hit) {
        Modal.warning({
          title: '该阿姨已在黑名单中',
          content: `原因：${res.data.reason}（${BLACKLIST_REASON_TYPE_LABELS[res.data.reasonType] || res.data.reasonType}）`,
        });
        return;
      }
    } catch (e) {
      console.error('黑名单预检失败:', e);
    }
    blacklistForm.setFieldsValue({
      name: resume.name || '',
      phone: resume.phone || '',
      idCard: resume.idNumber || '',
      reasonType: undefined,
      reason: '',
      remarks: '',
    });
    setBlacklistEvidence([]);
    setBlacklistModalOpen(true);
  };

  // 证据材料上传
  const handleBlacklistEvidenceUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options as any;
    try {
      const url = await ImageService.uploadImage(file as File);
      const ev: BlacklistEvidence = {
        url,
        filename: (file as File).name,
        size: (file as File).size,
        mimetype: (file as File).type,
      };
      setBlacklistEvidence(prev => [...prev, ev]);
      onSuccess?.(ev);
    } catch (err: any) {
      messageApi.error(err?.message || '证据上传失败');
      onError?.(err);
    }
  };

  // 提交加入黑名单
  const handleSubmitBlacklist = async () => {
    setBlacklistSubmitting(true);
    try {
      const values = await blacklistForm.validateFields();
      if (!values.phone && !values.idCard) {
        messageApi.error('手机号和身份证号至少填写一个');
        setBlacklistSubmitting(false);
        return;
      }
      const res = await createBlacklist({
        ...values,
        evidence: blacklistEvidence,
        sourceType: 'resume',
        sourceResumeId: resume?._id,
      });
      if (res.success) {
        messageApi.success('已加入黑名单');
        setBlacklistModalOpen(false);
        blacklistForm.resetFields();
        setBlacklistEvidence([]);
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      messageApi.error(err?.response?.data?.message || '加入黑名单失败');
    } finally {
      setBlacklistSubmitting(false);
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
          {/* 时间和基本信息 */}
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="开始时间">
              {exp.startDate ? formatDateToChinese(exp.startDate) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {exp.endDate ? formatDateToChinese(exp.endDate) : '-'}
            </Descriptions.Item>
          </Descriptions>

          {/* 工作简介 */}
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'rgba(0, 0, 0, 0.85)',
              marginBottom: 8,
              paddingLeft: 12,
              borderLeft: '3px solid #1890ff'
            }}>
              工作简介
            </div>
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fafafa',
              borderRadius: 4,
              lineHeight: '1.8',
              color: 'rgba(0, 0, 0, 0.85)'
            }}>
              {exp.description || '-'}
            </div>
          </div>

          {/* 详细信息（如果有任何一个字段存在才显示） */}
          {(exp.orderNumber || exp.district || exp.customerName) && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(0, 0, 0, 0.85)',
                marginBottom: 8,
                paddingLeft: 12,
                borderLeft: '3px solid #52c41a'
              }}>
                详细信息
              </div>
              <Descriptions bordered column={2} size="small">
                {exp.orderNumber && (
                  <Descriptions.Item label="订单号">
                    <span style={{ fontFamily: 'monospace', color: '#1890ff' }}>
                      {exp.orderNumber}
                    </span>
                  </Descriptions.Item>
                )}
                {exp.district && (
                  <Descriptions.Item label="服务区域">
                    <Tag color="blue">{getDistrictLabel(exp.district)}</Tag>
                  </Descriptions.Item>
                )}
                {exp.customerName && (
                  <Descriptions.Item label="客户姓名" span={2}>
                    {exp.customerName}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          )}

          {/* 客户评价（单独一个区块） */}
          {exp.customerReview && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(0, 0, 0, 0.85)',
                marginBottom: 8,
                paddingLeft: 12,
                borderLeft: '3px solid #ff7a45'
              }}>
                客户评价
              </div>
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: 4,
                lineHeight: '1.8',
                color: 'rgba(0, 0, 0, 0.85)',
                fontSize: '14px'
              }}>
                {exp.customerReview}
              </div>
            </div>
          )}

          {/* 工作照片 */}
          {exp.photos && exp.photos.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(0, 0, 0, 0.85)',
                marginBottom: 8,
                paddingLeft: 12,
                borderLeft: '3px solid #faad14'
              }}>
                工作照片
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                padding: '12px',
                backgroundColor: '#fafafa',
                borderRadius: 4
              }}>
                {exp.photos.map((photo, photoIndex) => (
                  <Image
                    key={photoIndex}
                    src={photo.url}
                    alt={`工作照片${photoIndex + 1}`}
                    width={120}
                    height={120}
                    style={{
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '1px solid #d9d9d9',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    preview={{
                      mask: '查看大图'
                    }}
                  />
                ))}
              </div>
            </div>
          )}
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

  // 添加/编辑员工评价
  const handleAddEvaluation = async (values: any) => {
    try {
      setEvaluationLoading(true);

      if (editingEvaluationId) {
        // 编辑模式
        await apiService.patch(`/api/employee-evaluations/${editingEvaluationId}`, {
          evaluationType: values.evaluationType,
          overallRating: values.overallRating,
          serviceAttitudeRating: values.overallRating,
          professionalSkillRating: values.overallRating,
          workEfficiencyRating: values.overallRating,
          communicationRating: values.overallRating,
          comment: values.comment,
        });
        messageApi.success('修改评价成功');
      } else {
        // 新增模式
        if (!resume?._id) {
          messageApi.error('简历ID不存在');
          return;
        }

        await apiService.post('/api/employee-evaluations', {
          employeeId: resume._id,
          employeeName: resume.name,
          evaluationType: values.evaluationType,
          overallRating: values.overallRating,
          serviceAttitudeRating: values.overallRating,
          professionalSkillRating: values.overallRating,
          workEfficiencyRating: values.overallRating,
          communicationRating: values.overallRating,
          comment: values.comment,
          isPublic: false,
          status: 'published'
        });
        messageApi.success('添加评价成功');
      }

      setIsAddEvaluationVisible(false);
      setEditingEvaluationId(null);
      evaluationForm.resetFields();
      await fetchResumeDetail();

    } catch (error) {
      console.error('保存员工评价失败:', error);
      messageApi.error(error instanceof Error ? error.message : '保存评价失败');
    } finally {
      setEvaluationLoading(false);
    }
  };

  // 编辑员工评价
  const handleEditEvaluation = (evaluation: EmployeeEvaluation) => {
    setEditingEvaluationId(evaluation.id);
    evaluationForm.setFieldsValue({
      evaluationType: evaluation.evaluationType || 'daily',
      overallRating: evaluation.overallRating,
      comment: evaluation.comment,
    });
    setIsAddEvaluationVisible(true);
  };

  // 删除员工评价
  const handleDeleteEvaluation = (evaluationId: string) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除这条评价吗？删除后不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await apiService.delete(`/api/employee-evaluations/${evaluationId}`);
          messageApi.success('删除评价成功');
          await fetchResumeDetail();
        } catch (error) {
          console.error('删除员工评价失败:', error);
          messageApi.error(error instanceof Error ? error.message : '删除评价失败');
        }
      },
    });
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

  // 添加/编辑员工评价表单
  const AddEvaluationModal = () => (
    <Modal
      title={editingEvaluationId ? "修改员工评价" : "添加员工评价"}
      open={isAddEvaluationVisible}
      onCancel={() => { setIsAddEvaluationVisible(false); setEditingEvaluationId(null); evaluationForm.resetFields(); }}
      width={600}
      footer={[
        <Button key="cancel" onClick={() => { setIsAddEvaluationVisible(false); setEditingEvaluationId(null); evaluationForm.resetFields(); }}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={evaluationLoading}
          onClick={() => {
            evaluationForm
              .validateFields()
              .then(values => {
                handleAddEvaluation(values);
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
        form={evaluationForm}
        layout="vertical"
        initialValues={{
          evaluationType: 'daily',
          overallRating: 5
        }}
      >
        <Form.Item
          name="evaluationType"
          label="评价类型"
          rules={[{ required: true, message: '请选择评价类型' }]}
        >
          <Select>
            <Select.Option value="daily">日常评价</Select.Option>
            <Select.Option value="monthly">月度评价</Select.Option>
            <Select.Option value="annual">年度评价</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="overallRating"
          label="综合评分"
          rules={[{ required: true, message: '请选择评分' }]}
        >
          <Rate allowHalf />
        </Form.Item>

        <Form.Item
          name="comment"
          label="评价内容"
          rules={[{ required: true, message: '请输入评价内容' }]}
        >
          <Input.TextArea
            rows={6}
            placeholder="请输入对该员工的评价..."
            maxLength={500}
            showCount
          />
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
      if (resume.certificates) {
        resume.certificates.forEach((cert: FileInfo, index: number) => {
          console.log(`    证书${index + 1}: ${cert.filename} (${cert.url})`);
        });
      }
      console.log('  - reports:', resume.reports);
      if (resume.reports) {
        resume.reports.forEach((report: FileInfo, index: number) => {
          console.log(`    体检报告${index + 1}: ${report.filename} (${report.url})`);
        });
      }
      
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
      <div style={{ padding: isMobile ? '12px' : '24px', background: isMobile ? '#f5f5f5' : undefined, minHeight: isMobile ? '100vh' : undefined }}>
        <Card
          bordered={!isMobile}
          style={isMobile ? { borderRadius: 8 } : undefined}
          bodyStyle={isMobile ? { padding: 12 } : undefined}
          title={
            isMobile ? (
              <Typography.Title level={5} style={{ margin: 0, fontSize: 15 }}>
                {resume?.name || '简历详情'}
              </Typography.Title>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="flex items-center">
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {resume?.name || '简历详情'}
                  </Typography.Title>
                </div>
                <Space>
                  {(() => {
                    const cu = getCurrentUser();
                    const creatorId = (resume as any)?.userId?._id || (resume as any)?.userId?.id || (typeof (resume as any)?.userId === 'string' ? (resume as any).userId : null);
                    const canRelease = hasRole('admin') || (cu?.id && creatorId && String(cu.id) === String(creatorId));
                    if (!canRelease) return null;
                    const released = !!(resume as any)?.releasedForContract;
                    return (
                      <Tooltip title={released ? '已释放：任何员工可用此简历发起合同（不可关闭）' : '未释放：仅创建人可用此简历发起合同；他人需先获得释放'}>
                        <Space size={4} style={{ marginRight: 4 }}>
                          <span style={{ fontSize: 13, color: released ? '#52c41a' : '#faad14' }}>{released ? '已释放' : '未释放'}</span>
                          <Switch checked={released} disabled={released} loading={releaseSubmitting} onChange={handleToggleRelease} />
                        </Space>
                      </Tooltip>
                    );
                  })()}
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                  >
                    编辑简历
                  </Button>
                  {hasPermission('blacklist:create') && (
                    <Button
                      danger
                      icon={<StopOutlined />}
                      onClick={handleOpenBlacklist}
                    >
                      加入黑名单
                    </Button>
                  )}
                  {hasRole('admin') && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={handleDelete}
                    >
                      删除简历
                    </Button>
                  )}
                </Space>
              </div>
            )
          }
        >
          {isMobile && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, alignItems: 'center' }}>
              {(() => {
                const cu = getCurrentUser();
                const creatorId = (resume as any)?.userId?._id || (resume as any)?.userId?.id || (typeof (resume as any)?.userId === 'string' ? (resume as any).userId : null);
                const canRelease = hasRole('admin') || (cu?.id && creatorId && String(cu.id) === String(creatorId));
                if (!canRelease) return null;
                const released = !!(resume as any)?.releasedForContract;
                return (
                  <Space size={4} style={{ marginRight: 4 }}>
                    <span style={{ fontSize: 12, color: released ? '#52c41a' : '#faad14' }}>{released ? '已释放' : '未释放'}</span>
                    <Switch size="small" checked={released} disabled={released} loading={releaseSubmitting} onChange={handleToggleRelease} />
                  </Space>
                );
              })()}
              <Button type="primary" icon={<EditOutlined />} onClick={handleEdit} size="small">编辑简历</Button>
              {hasPermission('blacklist:create') && (
                <Button danger icon={<StopOutlined />} onClick={handleOpenBlacklist} size="small">加入黑名单</Button>
              )}
              {hasRole('admin') && (
                <Button danger icon={<DeleteOutlined />} onClick={handleDelete} size="small">删除简历</Button>
              )}
            </div>
          )}
          <Card title="基本信息" style={{ marginBottom: isMobile ? 12 : 24 }} bodyStyle={isMobile ? { padding: 12 } : undefined}>
            <Descriptions bordered column={RESP_COL_3} size={isMobile ? 'small' : 'default'}>
              <Descriptions.Item label="简历ID">
                <Tooltip title={`完整ID: ${resume?._id || '未知'}`}>
                  <span>{resume?._id ? resume._id.substring(0, 8).padEnd(8, '0') : '-'}</span>
                </Tooltip>
              </Descriptions.Item>
              <Descriptions.Item label="姓名">{resume?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="年龄">{resume?.age || '-'}</Descriptions.Item>
              <Descriptions.Item label="体检时间">{resume?.medicalExamDate ? dayjs(resume.medicalExamDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
              <Descriptions.Item label="手机号">
                {resume?.phone ? (
                  <a href={`tel:${resume.phone}`} style={{ color: '#1890ff', textDecoration: 'none' }}>{resume.phone}</a>
                ) : '-'}
              </Descriptions.Item>
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
              <Descriptions.Item label="紧急联系人电话">
                {resume?.emergencyContactPhone ? (
                  <a href={`tel:${resume.emergencyContactPhone}`} style={{ color: '#1890ff', textDecoration: 'none' }}>{resume.emergencyContactPhone}</a>
                ) : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="工作信息" style={{ marginBottom: isMobile ? 12 : 24 }} bodyStyle={isMobile ? { padding: 12 } : undefined}>
            <Descriptions bordered column={RESP_COL_3} size={isMobile ? 'small' : 'default'}>
              <Descriptions.Item label="工种">{resume?.jobType ? jobTypeMap[resume.jobType] : '-'}</Descriptions.Item>
              <Descriptions.Item label="月嫂档位">
                {(resume as any)?.maternityNurseLevel ? maternityNurseLevelMap[(resume as any).maternityNurseLevel] : '-'}
              </Descriptions.Item>
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
              <Descriptions.Item label="创建来源">
                {resume?.userId ? (
                  <Tag color="orange">员工创建</Tag>
                ) : (
                  <Tag color="blue">自助注册</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="线索来源">
                {resume?.leadSource ? leadSourceMap[resume.leadSource] : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="技能证书" span={3}>
                {resume?.skills?.length > 0 ? (
                  resume.skills.map((skill: string) => (
                    <Tag key={skill}>{skillsMap[skill] || skill}</Tag>
                  ))
                ) : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 培训意向卡片 */}
          <Card title="培训意向" style={{ marginBottom: isMobile ? 12 : 24 }} bodyStyle={isMobile ? { padding: 12 } : undefined}>
            <Descriptions bordered column={RESP_COL_2} size={isMobile ? 'small' : 'default'}>
              <Descriptions.Item label="学习意向">
                {resume?.learningIntention ? learningIntentionMap[resume.learningIntention] : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="当前阶段">
                {resume?.currentStage ? currentStageMap[resume.currentStage] : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="工作经历" style={{ marginBottom: 24 }}>
            {renderWorkExperiences()}
          </Card>

          {/* 添加自我介绍卡片 */}
          <Card title="自我介绍" style={{ marginBottom: 24 }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#fafafa',
              borderRadius: '6px',
              minHeight: '80px'
            }}>
              {resume?.selfIntroduction ? (
                <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {resume.selfIntroduction}
                </Typography.Paragraph>
              ) : (
                <Typography.Text type="secondary">
                  暂无自我介绍
                </Typography.Text>
              )}
            </div>
          </Card>

          {/* 推荐理由卡片 */}
          <Card title="推荐理由" style={{ marginBottom: 24 }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#fafafa',
              borderRadius: '6px',
              minHeight: '60px'
            }}>
              {resume?.recommendationTags && resume.recommendationTags.length > 0 ? (
                <Space size={[8, 12]} wrap>
                  {resume.recommendationTags.map((item: RecommendationTag, index: number) => (
                    <Tag
                      key={index}
                      color="blue"
                      style={{
                        fontSize: '14px',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        margin: 0
                      }}
                    >
                      {item.tag}({item.count})
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Typography.Text type="secondary">
                  暂无推荐理由标签
                </Typography.Text>
              )}
            </div>
          </Card>

          {/* 添加内部员工评价卡片 */}
          <Card
            title="内部员工评价"
            style={{ marginBottom: 24 }}
            extra={
              <Space>
                <span style={{ color: '#999', fontSize: 12 }}>仅内部可见</span>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setIsAddEvaluationVisible(true);
                  }}
                >
                  添加评价
                </Button>
              </Space>
            }
          >
            {resume?.employeeEvaluations && resume.employeeEvaluations.length > 0 ? (
              <List
                dataSource={resume.employeeEvaluations}
                renderItem={(evaluation: EmployeeEvaluation, index: number) => (
                  <List.Item key={evaluation.id || index}>
                    <Card
                      style={{ width: '100%' }}
                      bodyStyle={{ padding: '16px' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        {/* 评分和评价人 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space>
                            <Rate disabled value={evaluation.overallRating} allowHalf style={{ fontSize: 16 }} />
                            <span style={{ color: '#faad14', fontWeight: 'bold' }}>
                              {evaluation.overallRating.toFixed(1)}
                            </span>
                          </Space>
                          <Space>
                            <Typography.Text type="secondary">评价人：</Typography.Text>
                            <Typography.Text strong>{evaluation.evaluatorName}</Typography.Text>
                          </Space>
                        </div>

                        {/* 评价内容 */}
                        <div>
                          <Typography.Paragraph
                            style={{
                              margin: '8px 0',
                              whiteSpace: 'pre-wrap',
                              backgroundColor: '#fafafa',
                              padding: '12px',
                              borderRadius: '4px'
                            }}
                          >
                            {evaluation.comment}
                          </Typography.Paragraph>
                        </div>

                        {/*
                          注意：不显示评价标签 (evaluation.tags)
                        */}

                        {/* 评价时间和操作按钮 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(evaluation.evaluationDate).format('YYYY-MM-DD HH:mm')}
                          </Typography.Text>
                          {getCurrentUser()?.role === 'admin' && (
                            <Space size="small">
                              <Button
                                type="link"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEditEvaluation(evaluation)}
                              >
                                修改
                              </Button>
                              <Button
                                type="link"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteEvaluation(evaluation.id)}
                              >
                                删除
                              </Button>
                            </Space>
                          )}
                        </div>
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                borderRadius: '6px'
              }}>
                <Typography.Text type="secondary">
                  暂无内部评价
                </Typography.Text>
              </div>
            )}
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
              {/* 去重显示：工装照排第一，然后新格式，最后旧格式去重 */}
              {(() => {
                const displayedUrls = new Set<string>();
                const photoElements: React.ReactNode[] = [];

                // 首先显示工装照（排在最前面）
                if (resume?.uniformPhoto?.url) {
                  displayedUrls.add(resume.uniformPhoto.url);
                  photoElements.push(
                    <div key={`photo-uniform-${resume.uniformPhoto.url}`}>
                      {renderFilePreview(resume.uniformPhoto, 0, 'photo')}
                    </div>
                  );
                }

                // 然后显示新格式个人照片
                if (resume?.personalPhoto) {
                  if (Array.isArray(resume.personalPhoto)) {
                    resume.personalPhoto.forEach((photo: FileInfo, index: number) => {
                      if (!displayedUrls.has(photo.url)) {
                        displayedUrls.add(photo.url);
                        photoElements.push(
                          <div key={`photo-new-${photo.url}-${index}`}>
                            {renderFilePreview(photo, index, 'photo')}
                          </div>
                        );
                      }
                    });
                  } else {
                    if (!displayedUrls.has(resume.personalPhoto.url)) {
                      displayedUrls.add(resume.personalPhoto.url);
                      photoElements.push(
                        <div key={`photo-new-${resume.personalPhoto.url}-0`}>
                          {renderFilePreview(resume.personalPhoto, 0, 'photo')}
                        </div>
                      );
                    }
                  }
                }

                // 最后显示旧格式中未重复的个人照片
                resume?.photoUrls?.filter(Boolean).forEach((url: FileUrl, index: number) => {
                  if (!displayedUrls.has(url)) {
                    displayedUrls.add(url);
                    photoElements.push(
                      <div key={`photo-legacy-${url}-${index}`}>
                        {renderFilePreview(url, index, 'photo')}
                      </div>
                    );
                  }
                });

                return photoElements;
              })()}

              {/* 如果没有任何照片，显示提示信息 */}
              {(!resume?.personalPhoto || (Array.isArray(resume.personalPhoto) && resume.personalPhoto.length === 0)) &&
               (!resume?.photoUrls || resume.photoUrls.length === 0) &&
               !resume?.uniformPhoto && (
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
              {/* 去重显示：优先新格式，排除旧格式重复 */}
              {(() => {
                const displayedUrls = new Set<string>();
                const certificateElements: React.ReactNode[] = [];
                
                // 首先显示新格式证书
                resume?.certificates?.forEach((cert: FileInfo, index: number) => {
                  displayedUrls.add(cert.url);
                  certificateElements.push(
                    <div key={`cert-new-${cert.url}-${index}`}>
                      {renderFilePreview(cert, index, 'certificate')}
                    </div>
                  );
                });
                
                // 然后显示旧格式中未重复的证书
                resume?.certificateUrls?.filter(Boolean).forEach((url: FileUrl, index: number) => {
                  if (!displayedUrls.has(url)) {
                    displayedUrls.add(url);
                    certificateElements.push(
                      <div key={`cert-legacy-${url}-${index}`}>
                        {renderFilePreview(url, index, 'certificate')}
                      </div>
                    );
                  }
                });
                
                return certificateElements;
              })()}
              
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
              {/* 去重显示：优先新格式，排除旧格式重复 */}
              {(() => {
                const displayedUrls = new Set<string>();
                const reportElements: React.ReactNode[] = [];

                // 首先显示新格式体检报告
                resume?.reports?.forEach((report: FileInfo, index: number) => {
                  displayedUrls.add(report.url);
                  reportElements.push(
                    <div key={`report-new-${report.url}-${index}`}>
                      {renderFilePreview(report, index, 'report')}
                    </div>
                  );
                });

                // 然后显示旧格式中未重复的体检报告
                resume?.medicalReportUrls?.filter(Boolean).forEach((url: FileUrl, index: number) => {
                  if (!displayedUrls.has(url)) {
                    displayedUrls.add(url);
                    reportElements.push(
                      <div key={`report-legacy-${url}-${index}`}>
                        {renderFilePreview(url, index, 'report')}
                      </div>
                    );
                  }
                });

                return reportElements;
              })()}

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

          {/* 背调报告 */}
          <Card
            title={
              <Space>
                <SafetyOutlined />
                <span>背调报告</span>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            {bgCheckLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin tip="加载背调信息中..." />
              </div>
            ) : backgroundCheck ? (
              <div>
                <Descriptions bordered column={RESP_COL_2} size="small">
                  <Descriptions.Item label="候选人姓名">
                    {backgroundCheck.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="手机号">
                    {backgroundCheck.mobile ? (
                      <a href={`tel:${backgroundCheck.mobile}`} style={{ color: '#1890ff', textDecoration: 'none' }}>{backgroundCheck.mobile}</a>
                    ) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="身份证号">
                    {backgroundCheck.idNo ?
                      `${backgroundCheck.idNo.slice(0, 6)}****${backgroundCheck.idNo.slice(-4)}` :
                      '-'
                    }
                  </Descriptions.Item>
                  <Descriptions.Item label="职位">
                    {backgroundCheck.position || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="背调状态">
                    <Space>
                      <Tag color={BG_STATUS_MAP[backgroundCheck.status]?.color || 'default'}>
                        {BG_STATUS_MAP[backgroundCheck.status]?.text || '未知状态'}
                      </Tag>
                      {backgroundCheck.status === 4 || backgroundCheck.status === 16 ? (
                        <Tag color="success" icon={<CheckCircleOutlined />}>通过</Tag>
                      ) : backgroundCheck.status === 3 || backgroundCheck.status === 15 ? (
                        <Tag color="error" icon={<CloseOutlined />}>未通过</Tag>
                      ) : null}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="芝麻报告ID">
                    {backgroundCheck.reportId || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="发起时间">
                    {backgroundCheck.createdAt ?
                      dayjs(backgroundCheck.createdAt).format('YYYY-MM-DD HH:mm:ss') :
                      '-'
                    }
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间">
                    {backgroundCheck.updatedAt ?
                      dayjs(backgroundCheck.updatedAt).format('YYYY-MM-DD HH:mm:ss') :
                      '-'
                    }
                  </Descriptions.Item>
                </Descriptions>

                {/* 操作按钮 */}
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Space>
                    {backgroundCheck.reportId && (backgroundCheck.status === 4 || backgroundCheck.status === 16) && (
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={async () => {
                          try {
                            const blob = await backgroundCheckService.downloadReport(backgroundCheck.reportId!);
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `背调报告_${backgroundCheck.name}_${backgroundCheck.reportId}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            messageApi.success('报告下载成功');
                          } catch (error) {
                            console.error('下载报告失败:', error);
                            messageApi.error('下载报告失败');
                          }
                        }}
                      >
                        下载报告
                      </Button>
                    )}
                    <Button onClick={() => navigate('/background-check')}>
                      查看详情
                    </Button>
                  </Space>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                border: '1px dashed #d9d9d9',
                borderRadius: '6px',
                color: '#999',
                width: '100%'
              }}>
                <SafetyOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                <p>暂无背调记录</p>
                <Button
                  type="link"
                  onClick={() => navigate('/background-check')}
                >
                  前往发起背调 →
                </Button>
              </div>
            )}
          </Card>

          {/* 月子餐照片 */}
          <Card title="月子餐照片" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {resume?.confinementMealPhotos && resume.confinementMealPhotos.length > 0 ? (
                resume.confinementMealPhotos.map((photo: FileInfo, index: number) => (
                  <div key={`confinementMeal-${photo.url}-${index}`}>
                    {renderFilePreview(photo, index, 'confinementMeal')}
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  border: '1px dashed #d9d9d9',
                  borderRadius: '6px',
                  color: '#999',
                  width: '100%'
                }}>
                  <p>未上传月子餐照片</p>
                </div>
              )}
            </div>
          </Card>

          {/* 烹饪照片 */}
          <Card title="烹饪照片" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {resume?.cookingPhotos && resume.cookingPhotos.length > 0 ? (
                resume.cookingPhotos.map((photo: FileInfo, index: number) => (
                  <div key={`cooking-${photo.url}-${index}`}>
                    {renderFilePreview(photo, index, 'cooking')}
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  border: '1px dashed #d9d9d9',
                  borderRadius: '6px',
                  color: '#999',
                  width: '100%'
                }}>
                  <p>未上传烹饪照片</p>
                </div>
              )}
            </div>
          </Card>

          {/* 辅食添加照片 */}
          <Card title="辅食添加照片" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {resume?.complementaryFoodPhotos && resume.complementaryFoodPhotos.length > 0 ? (
                resume.complementaryFoodPhotos.map((photo: FileInfo, index: number) => (
                  <div key={`complementaryFood-${photo.url}-${index}`}>
                    {renderFilePreview(photo, index, 'complementaryFood')}
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  border: '1px dashed #d9d9d9',
                  borderRadius: '6px',
                  color: '#999',
                  width: '100%'
                }}>
                  <p>未上传辅食添加照片</p>
                </div>
              )}
            </div>
          </Card>

          {/* 好评展示照片 */}
          <Card title="好评展示照片" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {resume?.positiveReviewPhotos && resume.positiveReviewPhotos.length > 0 ? (
                resume.positiveReviewPhotos.map((photo: FileInfo, index: number) => (
                  <div key={`positiveReview-${photo.url}-${index}`}>
                    {renderFilePreview(photo, index, 'positiveReview')}
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  border: '1px dashed #d9d9d9',
                  borderRadius: '6px',
                  color: '#999',
                  width: '100%'
                }}>
                  <p>未上传好评展示照片</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="自我介绍视频" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {resume?.selfIntroductionVideo ? (
                <div style={{ width: '100%' }}>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#fff7e6',
                    border: '1px solid #ffd591',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    color: '#d46b08'
                  }}>
                    <strong>提示：</strong>如果视频无法正常播放（只有声音没有画面），可能是视频编码格式不兼容。
                    建议下载后使用本地播放器观看，或重新上传H.264编码的MP4格式视频。
                  </div>

                  <div style={{ maxWidth: '800px' }}>
                    <video
                      controls
                      preload="auto"
                      playsInline
                      style={{
                        width: '100%',
                        maxHeight: '450px',
                        borderRadius: '8px',
                        backgroundColor: '#000'
                      }}
                      src={resume.selfIntroductionVideo.url}
                      onError={(e) => {
                        const videoEl = e.target as HTMLVideoElement;
                        console.error('视频加载失败:', e);
                        console.error('视频URL:', resume.selfIntroductionVideo?.url);
                        console.error('视频错误代码:', videoEl.error?.code, '消息:', videoEl.error?.message);
                        // 不显示toast，因为可能是source元素的错误
                      }}
                      onLoadedMetadata={(e) => {
                        const videoEl = e.target as HTMLVideoElement;
                        console.log('视频元数据加载成功', {
                          duration: videoEl.duration,
                          videoWidth: videoEl.videoWidth,
                          videoHeight: videoEl.videoHeight,
                          readyState: videoEl.readyState
                        });
                      }}
                      onCanPlay={() => {
                        console.log('视频可以播放');
                      }}
                    >
                      您的浏览器不支持视频播放
                    </video>

                    <div style={{ marginTop: '12px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ flex: 1, color: '#666', fontSize: '14px' }}>
                        <div>文件名: {resume.selfIntroductionVideo.filename || '未知'}</div>
                        {resume.selfIntroductionVideo.size && (
                          <div>大小: {(resume.selfIntroductionVideo.size / 1024 / 1024).toFixed(2)} MB</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          type="primary"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = resume.selfIntroductionVideo!.url;
                            link.download = resume.selfIntroductionVideo!.filename || 'video.mp4';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            messageApi.success('开始下载视频');
                          }}
                        >
                          下载视频
                        </Button>
                        <Button
                          onClick={() => {
                            window.open(resume.selfIntroductionVideo!.url, '_blank');
                          }}
                        >
                          新窗口打开
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  border: '1px dashed #d9d9d9',
                  borderRadius: '6px',
                  color: '#999',
                  width: '100%'
                }}>
                  <p>未上传自我介绍视频</p>
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

          {/* 档期日历卡片 - 仅月嫂显示 */}
          {resume?.jobType === 'yuesao' && (
            <Card title="月嫂档期" style={{ marginBottom: 24 }}>
              <AvailabilityCalendar
                resumeId={resume._id}
                editable={true}
                onUpdate={fetchResumeDetail}
              />
            </Card>
          )}

          {/* 🔒 释放记录（admin/创建人看全部，被拦截发起人仅看自己被拦截记录） */}
          {(releaseLogs.length > 0 || releaseLogsLoading) && (
            <Card
              title={
                <Space>
                  <SafetyOutlined />
                  <span>释放记录</span>
                  {releaseLogs.length > 0 && (
                    <Tag color="geekblue">{releaseLogs.length} 条记录</Tag>
                  )}
                </Space>
              }
              style={{ marginBottom: 24 }}
              loading={releaseLogsLoading}
            >
              {releaseLogs.length > 0 ? (
                <Timeline
                  mode="left"
                  items={releaseLogs.map((log: any, idx: number) => {
                    const operatedAt = log.operatedAt || log.createdAt;
                    const operatorName = log.operator?.name || log.operator?.username || '系统';
                    const dotColorMap: Record<string, string> = {
                      release_for_contract: 'green',
                      auto_release_first_contract: 'blue',
                      contract_blocked_by_release: 'orange',
                    };
                    const dotColor = dotColorMap[log.operationType] || 'gray';
                    return {
                      key: log._id || idx,
                      color: dotColor,
                      label: operatedAt ? dayjs(operatedAt).format('YYYY-MM-DD HH:mm:ss') : '-',
                      children: (
                        <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                          <div>
                            <Tag color={dotColor}>{log.operationName || log.operationType}</Tag>
                            <span style={{ color: '#666', marginLeft: 8 }}>
                              操作人: <strong>{operatorName}</strong>
                            </span>
                          </div>
                          {log.details?.description && (
                            <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
                              {log.details.description}
                            </div>
                          )}
                        </Card>
                      ),
                    };
                  })}
                />
              ) : (
                <Empty description="暂无释放相关记录" style={{ padding: '24px 0' }} />
              )}
            </Card>
          )}

          {/* 🆕 操作日志 - 仅管理员可见 */}
          <Authorized role={["admin"]} noMatch={null}>
            <Card
              title={
                <Space>
                  <AuditOutlined />
                  <span>操作日志</span>
                  {operationLogs && operationLogs.length > 1 && (
                    <Tag color="purple">{operationLogs.length} 条记录</Tag>
                  )}
                </Space>
              }
              style={{ marginBottom: 24 }}
              loading={operationLogsLoading}
            >
              {operationLogs && operationLogs.length > 0 ? (
                <>
                  <Timeline
                    mode="left"
                    items={(showAllOperationLogs ? operationLogs : operationLogs.slice(0, 1)).map((log: any, idx: number) => {
                      const operatedAt = log.operatedAt || log.createdAt;
                      const operatorName = log.operator?.name || log.operator?.username || '系统';
                      // 根据操作类型设置颜色
                      const colorMap: Record<string, string> = {
                        'create': 'green',
                        'update': 'blue',
                        'delete': 'red',
                        'assign': 'orange',
                        'upload_file': 'cyan',
                        'delete_file': 'magenta',
                        'generate_uniform': 'purple',
                        'change_status': 'gold',
                        'import': 'lime',
                      };
                      const dotColor = colorMap[log.operationType] || 'gray';

                      return {
                        key: log._id || idx,
                        color: dotColor,
                        label: operatedAt ? dayjs(operatedAt).format('YYYY-MM-DD HH:mm:ss') : '-',
                        children: (
                          <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                            <div>
                              <Tag color={dotColor}>{log.operationName || log.operationType}</Tag>
                              <span style={{ color: '#666', marginLeft: 8 }}>
                                操作人: <strong>{operatorName}</strong>
                              </span>
                            </div>
                            {log.details?.description && (
                              <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
                                {log.details.description}
                              </div>
                            )}
                            {log.details?.before && log.details?.after && (
                              <div style={{ marginTop: 8, fontSize: 12 }}>
                                <div style={{ color: '#999' }}>变更详情:</div>
                                <div style={{ color: '#f5222d' }}>
                                  - {JSON.stringify(log.details.before)}
                                </div>
                                <div style={{ color: '#52c41a' }}>
                                  + {JSON.stringify(log.details.after)}
                                </div>
                              </div>
                            )}
                          </Card>
                        ),
                      };
                    })}
                  />
                  {operationLogs.length > 1 && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <Button
                        type="link"
                        onClick={() => setShowAllOperationLogs(!showAllOperationLogs)}
                        icon={showAllOperationLogs ? <UpOutlined /> : <DownOutlined />}
                      >
                        {showAllOperationLogs ? '收起日志' : `查看全部 ${operationLogs.length} 条日志`}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Empty description="暂无操作日志" style={{ padding: '40px 0' }} />
              )}
            </Card>
          </Authorized>

          {/* 创建信息卡片 */}
          <Card title="创建信息" style={{ marginBottom: isMobile ? 12 : 24 }} bodyStyle={isMobile ? { padding: 12 } : undefined}>
            <Descriptions bordered column={RESP_COL_2} size={isMobile ? 'small' : 'default'}>
              <Descriptions.Item label="创建人">
                {resume?.userId?.name || resume?.userId?.username || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {resume?.createdAt ? dayjs(resume.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新人">
                {resume?.lastUpdatedBy?.name || resume?.lastUpdatedBy?.username || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新时间">
                {resume?.updatedAt ? dayjs(resume.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Card>

        {/* 添加跟进记录弹窗 */}
        <AddFollowUpModal />

        {/* 添加员工评价弹窗 */}
        <AddEvaluationModal />

        {/* 加入黑名单弹窗 */}
        <Modal
          title="加入黑名单"
          open={blacklistModalOpen}
          onOk={handleSubmitBlacklist}
          onCancel={() => {
            setBlacklistModalOpen(false);
            blacklistForm.resetFields();
            setBlacklistEvidence([]);
          }}
          confirmLoading={blacklistSubmitting}
          width={640}
          destroyOnClose
          okText="确认加入"
          okButtonProps={{ danger: true }}
          cancelText="取消"
        >
          <Form form={blacklistForm} layout="vertical" preserve={false}>
            <Form.Item name="name" label="阿姨姓名" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input placeholder="请输入阿姨姓名" maxLength={20} />
            </Form.Item>
            <Form.Item name="phone" label="手机号（phone / idCard 至少填一个）">
              <Input placeholder="请输入手机号" maxLength={11} />
            </Form.Item>
            <Form.Item name="idCard" label="身份证号">
              <Input placeholder="请输入身份证号" maxLength={18} />
            </Form.Item>
            <Form.Item name="reasonType" label="原因类型" rules={[{ required: true, message: '请选择原因类型' }]}>
              <Select placeholder="请选择原因类型">
                {Object.entries(BLACKLIST_REASON_TYPE_LABELS).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="reason" label="拉黑原因说明" rules={[{ required: true, message: '请填写拉黑原因', min: 2 }]}>
              <Input.TextArea rows={3} maxLength={500} showCount placeholder="请详细描述拉黑原因" />
            </Form.Item>
            <Form.Item label="证据材料（可选，最多 10 张）">
              <Upload
                accept="image/*"
                listType="picture"
                customRequest={handleBlacklistEvidenceUpload}
                fileList={blacklistEvidence.map((ev, idx) => ({
                  uid: `${idx}-${ev.url}`,
                  name: ev.filename || `证据${idx + 1}`,
                  status: 'done' as const,
                  url: ev.url,
                }))}
                onRemove={(f) => {
                  setBlacklistEvidence(blacklistEvidence.filter(ev => ev.url !== f.url));
                }}
                maxCount={10}
              >
                <Button icon={<UploadOutlined />}>上传证据</Button>
              </Upload>
            </Form.Item>
            <Form.Item name="remarks" label="备注">
              <Input.TextArea rows={2} maxLength={200} placeholder="内部备注，选填" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
};

export default ResumeDetail;