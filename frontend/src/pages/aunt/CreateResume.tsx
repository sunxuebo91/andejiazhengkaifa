import { PageContainer } from '@ant-design/pro-components';
import { Card, Button, Form, Input, Select, Upload, Divider, Row, Col, Typography, Modal, DatePicker, InputNumber, App, message, Rate, List, Space, Dropdown } from 'antd';
import { useState, useEffect, useCallback, useRef } from 'react';
import { PlusOutlined, CloseOutlined, EyeOutlined, UploadOutlined, InfoCircleOutlined, ReloadOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import type { UploadChangeParam } from 'antd/es/upload';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import BaiduMapCard from '../../components/BaiduMapCard';
import apiService from '../../services/api';
import type { ApiResponse } from '../../services/api';
import { ImageService } from '../../services/imageService';
import { Gender, GenderType, JobType, Education, FormValues, WorkExperience } from '../../types/resume';
import type { Resume } from '../../services/resume.service';
import { isLoggedIn } from '../../services/auth';
import { JOB_TYPE_MAP } from '../../constants/jobTypes'; // 引入共享的工种映射
import SortableImageUpload from '../../components/SortableImageUpload';
import AIPhotoClassifyModal from '../../components/AIPhotoClassifyModal';
import type { ClassifiedFile } from '../../components/AIPhotoClassifyModal';
import { CATEGORY_LABELS } from '../../components/AIPhotoClassifyModal';
import VideoUpload from '../../components/VideoUpload';
import { generateOrderNumber } from '../../utils/orderNumberGenerator';
import { contractService } from '../../services/contractService';
import type { Contract } from '../../types/contract.types';
import { BEIJING_DISTRICTS } from '../../constants/beijingDistricts';
// 扩展 dayjs 功能
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const { Option } = Select;
const { Title, Text } = Typography;

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
  '汉', '蒙古', '回', '藏', '维吾尔', '苗', '彝', '壮', '布依', '朝鲜',
  '满', '侗', '瑶', '白', '土家', '哈尼', '哈萨克', '傣', '黎', '傈僳',
  '佤', '畲', '高山', '拉祜', '水', '东乡', '纳西', '景颇', '柯尔克孜', '土',
  '达斡尔', '仫佬', '羌', '布朗', '撒拉', '毛南', '仡佬', '锡伯', '阿昌', '普米',
  '塔吉克', '怒', '乌孜别克', '俄罗斯', '鄂温克', '德昂', '保安', '裕固', '京', '塔塔尔',
  '独龙', '鄂伦春', '赫哲', '门巴', '珞巴', '基诺'
];

// 在文件顶部添加调试模式常量
// 调试模式开关，生产环境设为false
const DEBUG_MODE = false;
const LOCAL_WECHAT_PASTE_HELPER_URL = 'http://127.0.0.1:43821';

// Define a base type for file properties
type BaseFileProps = {
  uid: string;
  name: string;
  url?: string;
  thumbUrl?: string;
  originFileObj?: RcFile;
  size?: number;
  type?: string;
  // AI生成的工装照URL（仅用于个人照片，在创建模式下由/api/ai/swap-uniform接口生成）
  uniformPhotoUrl?: string;
};

// Define types for new and existing files
type NewFile = BaseFileProps & {
  status: UploadFileStatus;
  isExisting: false;
};

type ExistingFile = BaseFileProps & {
  status: 'done';
  isExisting: true;
};

// Union type for all file types
type CustomUploadFile = NewFile | ExistingFile;

// Add type for API error response
interface ApiErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// Add UploadFileStatus type
type UploadFileStatus = 'uploading' | 'done' | 'error' | 'removed';

// Restore utility functions
function debugLog(...args: unknown[]): void {
  if (DEBUG_MODE) console.log(...args);
}

// 修改学历映射常量
const EDUCATION_MAP = {
  'no': '无学历',
  'primary': '小学',
  'middle': '初中',
  'secondary': '中专',
  'vocational': '职高',
  'high': '高中',
  'college': '大专',
  'bachelor': '本科',
  'graduate': '研究生'
} as const;

// 定义工作经历项类型（使用WorkExperience接口）
type WorkExperienceItem = WorkExperience;

// 扩展Resume类型以包含前端特有的字段
interface ExtendedResume extends Omit<Resume, 'gender' | 'jobType' | 'education'> {
  gender: GenderType;
  jobType: JobType;
  education: Education;
  medicalExamDate?: string;
  birthDate?: string;
  workExperiences?: WorkExperience[];
  // 添加缺失的字段
  maritalStatus?: string;
  religion?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  selfIntroduction?: string;
  internalEvaluation?: string;
  // 文件相关字段 - 新格式
  idCardFront?: { url: string };
  idCardBack?: { url: string };
  photoUrls?: string[];
  certificateUrls?: string[];
  medicalReportUrls?: string[];
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  // 文件相关字段 - 新格式
  personalPhoto?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }> | { url: string; filename?: string; size?: number; mimetype?: string };
  certificates?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
  reports?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
  confinementMealPhotos?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
  cookingPhotos?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
  complementaryFoodPhotos?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
  positiveReviewPhotos?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
  // AI生成的工装照
  uniformPhoto?: { url: string; filename?: string; size?: number; mimetype?: string };
}

// 添加类型转换辅助函数
const convertToExtendedResume = (resume: Resume): ExtendedResume => {
  // 确保jobType是JobType类型
  let jobType: JobType;
  try {
    if (typeof resume.jobType === 'string' && Object.values(JobType).includes(resume.jobType as JobType)) {
      jobType = resume.jobType as JobType;
    } else {
      jobType = JobType.ZHUJIA_YUER;
    }
  } catch {
    jobType = JobType.ZHUJIA_YUER;
  }

  // 确保education是Education类型
  let education: Education;
  try {
    if (typeof resume.education === 'string' && Object.values(Education).includes(resume.education as Education)) {
      education = resume.education as Education;
    } else {
      education = Education.NO;
    }
  } catch {
    education = Education.NO;
  }

  // 确保gender是GenderType类型
  let gender: GenderType;
  try {
    const genderValue = resume.gender as string;
    if (genderValue === Gender.MALE || genderValue === Gender.FEMALE) {
      gender = genderValue;
    } else {
      gender = Gender.FEMALE;
    }
  } catch {
    gender = Gender.FEMALE;
  }

  // 确保工作经历数组的类型正确
  const workExperiences: WorkExperience[] = (resume.workExperiences || [])
    .filter((exp: WorkExperience | null): exp is WorkExperience => exp !== null)
    .map((exp: WorkExperience) => ({
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      description: exp.description || '',
      company: exp.company || undefined,
      position: exp.position || undefined,
      orderNumber: exp.orderNumber || undefined,
      district: exp.district || undefined,
      customerName: exp.customerName || undefined,
      customerReview: exp.customerReview || undefined,
      photos: exp.photos || []
    }));

  return {
    ...resume,
    jobType,
    education,
    gender,
    workExperiences
  };
};

// 修改文件类型定义
type FileType = 'image/jpeg' | 'image/jpg' | 'image/png' | 'application/pdf';
type ImageType = 'image/jpeg' | 'image/jpg' | 'image/png';

// 修改文件上传配置
const FILE_UPLOAD_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png'] as ImageType[],
  allowedPdfTypes: ['application/pdf'] as const,
  maxPhotoCount: 30,
  maxCertificateCount: 30,
  maxMedicalReportCount: 10,
  maxMedicalPdfCount: 5,
  maxConfinementMealCount: 30,
  maxCookingCount: 30,
  maxComplementaryFoodCount: 30,
  maxPositiveReviewCount: 30
} as const;

// 文件上传按钮组件
const uploadButton = (
  <div>
    <PlusOutlined />
    <div style={{ marginTop: 8 }}>上传</div>
  </div>
);

// 定义预览状态类型
interface PreviewState {
  visible: boolean;
  image: string;
  title: string;
}

// 定义文件上传状态类型
interface FileUploadState {
  photo: { files: CustomUploadFile[] };
  certificate: { files: CustomUploadFile[] };
  medical: { files: CustomUploadFile[] };
  confinementMeal: { files: CustomUploadFile[] };
  cooking: { files: CustomUploadFile[] };
  complementaryFood: { files: CustomUploadFile[] };
  positiveReview: { files: CustomUploadFile[] };
}

// 定义员工评价接口
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

const CreateResume: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingResume, setEditingResume] = useState<ExtendedResume | null>(null);
  const [messageState, setMessageState] = useState<{ type: 'success' | 'warning' | 'error'; content: string } | null>(null);
  const [idCardFiles, setIdCardFiles] = useState<{
    front: CustomUploadFile[];
    back: CustomUploadFile[];
  }>({ front: [], back: [] });
  const [photoFiles, setPhotoFiles] = useState<CustomUploadFile[]>([]);
  const [certificateFiles, setCertificateFiles] = useState<CustomUploadFile[]>([]);
  const [medicalReportFiles, setMedicalReportFiles] = useState<CustomUploadFile[]>([]);
  const [selfIntroductionVideo, setSelfIntroductionVideo] = useState<{
    url: string;
    filename?: string;
    size?: number;
    mimetype?: string;
  } | undefined>(undefined);
  const [previewState, setPreviewState] = useState<PreviewState>({
    visible: false,
    image: '',
    title: ''
  });
  const [existingIdCardFrontUrl, setExistingIdCardFrontUrl] = useState<string>('');
  const [existingIdCardBackUrl, setExistingIdCardBackUrl] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [fileUploadState, setFileUploadState] = useState<FileUploadState>({
    photo: { files: [] },
    certificate: { files: [] },
    medical: { files: [] },
    confinementMeal: { files: [] },
    cooking: { files: [] },
    complementaryFood: { files: [] },
    positiveReview: { files: [] }
  });

  // 员工评价相关状态
  const [employeeEvaluations, setEmployeeEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [isAddEvaluationVisible, setIsAddEvaluationVisible] = useState(false);
  const [evaluationForm] = Form.useForm();
  const [evaluationLoading, setEvaluationLoading] = useState(false);

  // AI识别相关状态
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImage, setAiImage] = useState<string | null>(null); // base64 图片数据（不含data:前缀）
  const [aiImageMimeType, setAiImageMimeType] = useState<string>('image/png');
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null); // 用于预览的完整data URL
  const [aiPastedImages, setAiPastedImages] = useState<string[]>([]); // 从HTML粘贴中提取的内联图片(data URL)
  const lastAiPasteSignatureRef = useRef<{ signature: string; timestamp: number }>({ signature: '', timestamp: 0 });

  // AI图片分类相关状态
  const [aiPhotoClassifyVisible, setAiPhotoClassifyVisible] = useState(false);

  // 合同关联选择器状态
  const [contractPicker, setContractPicker] = useState<{
    open: boolean;
    loading: boolean;
    contracts: Contract[];
    targetIndex: number;
  }>({ open: false, loading: false, contracts: [], targetIndex: -1 });

  const blobToDataUrl = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }, []);

  // 从HTML中提取所有图片URL（微信等平台粘贴时图片嵌在HTML中）
  const extractImagesFromHtml = useCallback((html: string): string[] => {
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const urls: string[] = [];
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      // 接受 data/http(s)/file URL，以及微信复制出来的 Windows 本地图片路径
      if (
        src.startsWith('data:image/') ||
        src.startsWith('http://') ||
        src.startsWith('https://') ||
        src.startsWith('file://') ||
        /^[a-zA-Z]:\\/.test(src)
      ) {
        urls.push(src);
      }
    }
    return urls;
  }, []);

  const readImagesFromClipboardApi = useCallback(async (): Promise<string[]> => {
    if (!navigator.clipboard?.read) {
      return [];
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      const dataUrls: string[] = [];

      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (!imageType) continue;

        const blob = await item.getType(imageType);
        const dataUrl = await blobToDataUrl(blob);
        dataUrls.push(dataUrl);
      }

      return dataUrls;
    } catch (error) {
      console.warn('[AI简历粘贴] navigator.clipboard.read() 读取失败:', error);
      return [];
    }
  }, [blobToDataUrl]);

  const readImagesFromLocalHelper = useCallback(async (paths: string[]): Promise<string[]> => {
    if (paths.length === 0) {
      return [];
    }

    try {
      const response = await fetch(`${LOCAL_WECHAT_PASTE_HELPER_URL}/api/read-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paths }),
      });

      if (!response.ok) {
        return [];
      }

      const payload = await response.json();
      const images = Array.isArray(payload?.images) ? payload.images : [];
      return images
        .map((item: { dataUrl?: string }) => item?.dataUrl)
        .filter((dataUrl: string | undefined): dataUrl is string => typeof dataUrl === 'string' && dataUrl.startsWith('data:image/'));
    } catch (error) {
      console.warn('[AI简历粘贴] 本机微信图片助手不可用:', error);
      return [];
    }
  }, []);

  const appendAiPastedImages = useCallback((dataUrls: string[]) => {
    if (dataUrls.length === 0) {
      return;
    }

    setAiPastedImages(prev => {
      const all = [...prev, ...dataUrls];
      const unique = Array.from(new Set(all));
      return unique.slice(0, 20);
    });
  }, []);

  // 将AI弹窗中粘贴的图片直接分配到指定照片分类（含身份证正反面+OCR）
  type AssignCategory = 'photo' | 'certificate' | 'medical' | 'cooking' | 'complementaryFood' | 'positiveReview' | 'confinementMeal' | 'idCardFront' | 'idCardBack';

  const handleAssignImageToCategory = useCallback(async (dataUrl: string, imgIndex: number, category: AssignCategory) => {
    try {
      // 1. 将 data URL 转为 File
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      const fileName = `paste_${Date.now()}_${imgIndex}.${ext}`;
      const file = new File([blob], fileName, { type: blob.type }) as unknown as RcFile;
      (file as any).uid = `ai-paste-${Date.now()}-${imgIndex}`;

      // ---- 身份证正面/背面：设置预览 + 触发 OCR ----
      if (category === 'idCardFront' || category === 'idCardBack') {
        const side = category === 'idCardFront' ? 'front' : 'back';
        const newFile: CustomUploadFile = {
          uid: (file as any).uid,
          name: fileName,
          status: 'done' as const,
          url: URL.createObjectURL(file),
          originFileObj: file,
          isExisting: false,
          type: file.type,
        };
        setIdCardFiles(prev => ({ ...prev, [side]: [newFile] }));

        // 触发 OCR 识别
        try {
          setIsOcrProcessing(true);
          const ocrResult = await ImageService.ocrIdCard(file, side);
          const formValues = ImageService.extractIdCardInfo(ocrResult);
          if (Object.keys(formValues).length > 0) {
            form.setFieldsValue(formValues);
            messageApi.success(`身份证${side === 'front' ? '正面' : '背面'}识别成功`);
          } else {
            messageApi.warning('未能识别到身份证信息，请手动填写');
          }
        } catch (error) {
          console.error('OCR识别失败:', error);
          messageApi.error(error instanceof Error ? error.message : '身份证识别失败，请手动填写');
        } finally {
          setIsOcrProcessing(false);
        }

        // 从粘贴图片列表中移除
        setAiPastedImages(prev => prev.filter((_, i) => i !== imgIndex));
        return;
      }

      // ---- 其他照片分类 ----
      // 2. 压缩
      let processedFile: File = file;
      try {
        processedFile = await ImageService.compressImage(file, 'photo');
      } catch {
        processedFile = file;
      }

      const tempPreviewUrl = URL.createObjectURL(processedFile);

      const fileTypeMapping: Record<string, string> = {
        'photo': 'personalPhoto',
        'certificate': 'certificate',
        'medical': 'medicalReport',
        'cooking': 'cookingPhoto',
        'complementaryFood': 'complementaryFoodPhoto',
        'positiveReview': 'positiveReviewPhoto',
        'confinementMeal': 'confinementMealPhoto',
      };

      if (editingResume?._id) {
        // 编辑模式：上传到服务器
        const formData = new FormData();
        formData.append('file', processedFile);
        formData.append('type', fileTypeMapping[category]);
        const response = await apiService.upload(`/api/resumes/${editingResume._id}/upload`, formData);
        if (response.success) {
          const newFile: CustomUploadFile = {
            uid: (file as any).uid,
            name: fileName,
            url: response.data?.fileUrl,
            thumbUrl: tempPreviewUrl,
            status: 'done' as const,
            originFileObj: file,
            size: processedFile.size,
            isExisting: false,
          };
          setFileUploadState(prev => ({
            ...prev,
            [category]: { ...prev[category], files: [...prev[category].files, newFile] },
          }));
          if (category === 'photo') setPhotoFiles(prev => [...prev, newFile]);
          if (category === 'certificate') setCertificateFiles(prev => [...prev, newFile]);
          if (category === 'medical') setMedicalReportFiles(prev => [...prev, newFile]);
          messageApi.success(`已添加到${categoryLabels[category]}`);
        } else {
          messageApi.error(response.message || '上传失败');
          return;
        }
      } else {
        // 创建模式：本地保存，提交时再上传
        const newFile: CustomUploadFile = {
          uid: (file as any).uid,
          name: fileName,
          status: 'done' as const,
          thumbUrl: tempPreviewUrl,
          originFileObj: processedFile as unknown as RcFile,
          size: processedFile.size,
          isExisting: false,
        };
        setFileUploadState(prev => ({
          ...prev,
          [category]: { ...prev[category], files: [...prev[category].files, newFile] },
        }));
        if (category === 'photo') setPhotoFiles(prev => [...prev, newFile]);
        if (category === 'certificate') setCertificateFiles(prev => [...prev, newFile]);
        if (category === 'medical') setMedicalReportFiles(prev => [...prev, newFile]);
        messageApi.success(`已添加到${categoryLabels[category]}`);
      }

      // 3. 从粘贴图片列表中移除
      setAiPastedImages(prev => prev.filter((_, i) => i !== imgIndex));
    } catch (err) {
      console.error('分配图片到分类失败:', err);
      messageApi.error('分配图片失败，请重试');
    }
  }, [editingResume, messageApi, form]);

  const categoryLabels: Record<string, string> = {
    photo: '个人照片',
    certificate: '技能证书',
    medical: '体检报告',
    cooking: '烹饪照片',
    complementaryFood: '辅食照片',
    confinementMeal: '月子餐照片',
    positiveReview: '好评截图',
    idCardFront: '身份证正面',
    idCardBack: '身份证背面',
  };

  // 将外部图片URL通过canvas转成data URL（避免CORS问题时回退为原URL）
  const loadImageAsDataUrl = useCallback((url: string): Promise<string> => {
    return new Promise((resolve) => {
      if (url.startsWith('data:')) {
        resolve(url);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch {
          // canvas tainted by CORS, 直接使用原URL显示
          resolve(url);
        }
      };
      img.onerror = () => resolve(url); // 加载失败也保留原URL
      img.src = url;
    });
  }, []);

  // 处理粘贴图片（window 级 + div onPaste 共用）
  // 支持多次粘贴累积：收集剪贴板中所有图片
  const handleAiModalPaste = useCallback(async (e: ClipboardEvent | React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    const items = clipboardData.items;
    const files = clipboardData.files;
    const html = clipboardData.getData('text/html');

    const signatureParts: string[] = [];
    if (items) {
      for (let i = 0; i < items.length; i++) {
        signatureParts.push(`${items[i].kind}:${items[i].type}`);
      }
    }
    if (files) {
      for (let i = 0; i < files.length; i++) {
        signatureParts.push(`file:${files[i].type}:${files[i].size}`);
      }
    }
    signatureParts.push(`html:${html.length}`);
    const signature = signatureParts.join('|');
    const now = Date.now();
    if (
      signature &&
      lastAiPasteSignatureRef.current.signature === signature &&
      now - lastAiPasteSignatureRef.current.timestamp < 300
    ) {
      return;
    }
    lastAiPasteSignatureRef.current = { signature, timestamp: now };

    // 调试：输出剪贴板所有类型
    if (items) {
      const types: string[] = [];
      for (let i = 0; i < items.length; i++) {
        types.push(`${items[i].kind}:${items[i].type}`);
      }
      console.log('[AI简历粘贴] 剪贴板items:', types.join(', '), '| files数量:', files?.length || 0);
    }

    // 1. 收集剪贴板中所有图片文件（items + files 去重）
    const imageFiles: File[] = [];
    const seenNames = new Set<string>();

    // 从 items 收集
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const key = `${file.name}-${file.size}`;
            if (!seenNames.has(key)) {
              seenNames.add(key);
              imageFiles.push(file);
            }
          }
        }
      }
    }

    // 从 files 收集（某些浏览器/平台 files 里有额外图片）
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const key = `${file.name}-${file.size}`;
          if (!seenNames.has(key)) {
            seenNames.add(key);
            imageFiles.push(file);
          }
        }
      }
    }

    console.log('[AI简历粘贴] 找到图片文件数:', imageFiles.length);

    if (imageFiles.length > 0) {
      e.preventDefault();
      // 读取所有图片文件并添加到 aiPastedImages
      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          appendAiPastedImages([dataUrl]);
        };
        reader.readAsDataURL(file);
      });
      return;
    }

    // 2. 没有直接的图片文件时，尝试从 HTML 内容中提取图片（微信等平台粘贴）
    if (html) {
      console.log('[AI简历粘贴] HTML内容(前500字):', html.substring(0, 500));
      const imgUrls = extractImagesFromHtml(html);
      console.log('[AI简历粘贴] 从HTML提取到图片URL数量:', imgUrls.length);
      if (imgUrls.length > 0) {
        const remoteImgUrls = imgUrls.filter(url => !/^[a-zA-Z]:\\/.test(url) && !url.startsWith('file://'));
        const localImgPaths = imgUrls.filter(url => /^[a-zA-Z]:\\/.test(url));
        const hasLocalImagePath = localImgPaths.length > 0;

        const htmlDataUrls = remoteImgUrls.length > 0
          ? await Promise.all(remoteImgUrls.map(url => loadImageAsDataUrl(url)))
          : [];

        const helperDataUrls = hasLocalImagePath ? await readImagesFromLocalHelper(localImgPaths) : [];
        const clipboardDataUrls = helperDataUrls.length === 0 && hasLocalImagePath
          ? await readImagesFromClipboardApi()
          : [];
        const mergedDataUrls = [...htmlDataUrls, ...helperDataUrls, ...clipboardDataUrls];

        if (mergedDataUrls.length > 0) {
          console.log('[AI简历粘贴] 成功读取真实图片数量:', mergedDataUrls.length);
          appendAiPastedImages(mergedDataUrls);
          return;
        }

        if (hasLocalImagePath) {
          messageApi.warning(`检测到 ${imgUrls.length} 张微信图片引用，但当前浏览器未拿到真实图片数据。请启动本机微信图片助手，或改用单张粘贴/拖入上传区。`);
        }
      }
    }
  }, [appendAiPastedImages, extractImagesFromHtml, loadImageAsDataUrl, messageApi, readImagesFromClipboardApi, readImagesFromLocalHelper]);

  // 弹窗打开时在 window 上兜底监听粘贴（焦点在 textarea 时也能捕获图片）
  useEffect(() => {
    if (!aiModalVisible) return;
    const listener = (e: ClipboardEvent) => handleAiModalPaste(e);
    window.addEventListener('paste', listener);
    return () => window.removeEventListener('paste', listener);
  }, [aiModalVisible, handleAiModalPaste]);

  // AI识别 - 将简历文本解析为表单字段
  const SURNAMES = ['李','王','张','刘','陈','赵','黄','周','吴','徐','孙','朱','马','胡','林','郑','何','高','梁','郭'];
  const generateCustomerName = () => {
    const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    return surname + (Math.random() < 0.5 ? '先生' : '女士');
  };

  const REVIEW_TEMPLATES: Record<string, string[]> = {
    yuesao: [
      '照顾产妇和新生儿非常专业，服务态度好，强烈推荐！',
      '月嫂技术过硬，细心体贴，宝宝和妈妈恢复都很好。',
      '非常尽责，把产妇和宝宝照顾得很好，值得信赖。',
      '专业负责，经验丰富，服务周到，全家都很满意。',
      '照顾精心到位，产妇身体恢复好，新生儿护理专业。',
    ],
    'zhujia-yuer': [
      '育儿经验丰富，孩子喜欢她，家长非常放心满意。',
      '住家育儿嫂责任心强，孩子活泼健康，非常推荐。',
      '带孩子耐心细心，孩子成长进步很快，很满意。',
      '专业认真负责，孩子在她照顾下身体健康活泼。',
    ],
    'baiban-yuer': [
      '白天照顾孩子专业细心，孩子喜欢她，家长放心。',
      '育儿经验丰富，孩子在她照顾下健康快乐成长。',
      '细心负责，孩子活泼开朗，家长非常满意推荐。',
    ],
    'zhujia-baomu': [
      '做家务干净利落，为人诚实，相处融洽，非常满意。',
      '勤劳踏实，把家里打理得整整齐齐，值得信赖。',
      '住家保姆很负责，做饭好吃，家务干净，推荐。',
    ],
    'baiban-baomu': [
      '做事勤快，家务整洁，为人善良，全家都满意。',
      '白班保姆认真负责，把家里打理得非常干净整洁。',
    ],
    baojie: [
      '打扫非常仔细认真，家里干净整洁，非常满意推荐。',
      '保洁服务专业，每次都打扫得一尘不染，值得推荐。',
    ],
    'zhujia-hulao': [
      '照顾老人耐心细致，老人很喜欢她，服务非常周到。',
      '护理经验丰富，老人恢复很好，家属非常放心满意。',
      '专业护老，对老人体贴入微，家人非常信任她。',
    ],
    default: [
      '服务态度好，工作认真负责，家人都非常满意推荐。',
      '专业负责，细心周到，相处融洽，非常值得推荐。',
      '工作能力强，为人实在诚恳，服务让人非常放心。',
    ],
  };

  const generateCustomerReview = (jobType?: string) => {
    const list = (jobType && REVIEW_TEMPLATES[jobType]) || REVIEW_TEMPLATES.default;
    return list[Math.floor(Math.random() * list.length)];
  };

  const handleOrderNumberGenerate = async (expIndex: number) => {
    const phone = form.getFieldValue('phone');
    const workerName = form.getFieldValue('name');
    if (phone || workerName) {
      setContractPicker(prev => ({ ...prev, open: false, loading: true, targetIndex: expIndex }));
      try {
        const contracts = await contractService.searchByWorkerInfo({ phone, name: workerName });
        if (contracts && contracts.length > 0) {
          setContractPicker({ open: true, loading: false, contracts, targetIndex: expIndex });
          return;
        }
      } catch {
        // 查询失败则直接生成
      } finally {
        setContractPicker(prev => ({ ...prev, loading: false }));
      }
    }
    // 无合同记录，直接生成
    const experiences = form.getFieldValue('workExperiences');
    experiences[expIndex] = { ...experiences[expIndex], orderNumber: generateOrderNumber() };
    form.setFieldsValue({ workExperiences: experiences });
  };

  const handleSelectContract = (contractNumber: string) => {
    const { targetIndex } = contractPicker;
    const experiences = form.getFieldValue('workExperiences');
    experiences[targetIndex] = { ...experiences[targetIndex], orderNumber: contractNumber };
    form.setFieldsValue({ workExperiences: experiences });
    setContractPicker(prev => ({ ...prev, open: false }));
  };

  const normalizeProvince = (place: string): string => {
    if (!place) return '';
    // 精确匹配
    const exact = provinces.find(p => p === place);
    if (exact) return exact;
    // 短名称匹配：如"湖南"→"湖南省"，"北京"→"北京市"
    const match = provinces.find(p => p.startsWith(place) || place.startsWith(p.slice(0, 2)));
    if (match) return match;
    // 处理"山西运城"、"湖南长沙"等带城市的籍贯：尝试用前两个字匹配省份
    if (place.length >= 2) {
      const prefix = place.slice(0, 2);
      const prefixMatch = provinces.find(p => p.startsWith(prefix));
      if (prefixMatch) return prefixMatch;
      // 也尝试用前三个字匹配（如"内蒙古"、"黑龙江"）
      if (place.length >= 3) {
        const prefix3 = place.slice(0, 3);
        const prefix3Match = provinces.find(p => p.startsWith(prefix3));
        if (prefix3Match) return prefix3Match;
      }
    }
    return place;
  };

  const inferJobTypeFromText = (text?: string): JobType | undefined => {
    if (!text) return undefined;
    const normalized = text.replace(/\s+/g, '');

    if (/(小时工|钟点工)/.test(normalized)) return JobType.XIAOSHI;
    if (/(护老|养老院|半自理|不自理|卧床|老人|护理员|养老护理)/.test(normalized)) return JobType.ZHUJIA_HULAO;
    if (/(月嫂|月子中心|产妇|新生儿|月子护理)/.test(normalized)) return JobType.YUESAO;
    if (/(白班).*(育儿|带宝宝|主带|辅带宝宝|宝宝|大宝|小宝|孩子|小孩|幼儿园|婴儿|带娃)|(?:育儿|带宝宝|主带|辅带宝宝|宝宝|大宝|小宝|孩子|小孩|幼儿园|婴儿|带娃).*(白班)/.test(normalized)) return JobType.BAIBAN_YUER;
    if (/(育儿|带宝宝|主带|辅带宝宝|早教|读绘本|宝宝|大宝|小宝|幼儿园|孩子|小孩|婴儿|带娃)/.test(normalized)) return JobType.ZHUJIA_YUER;
    if (/(白班).*(做饭|家务|保姆|高端家务|生活助理|私人助理)|(?:做饭|家务|保姆|高端家务|生活助理|私人助理).*(白班)/.test(normalized)) return JobType.BAIBAN_BAOMU;
    if (/(保洁)/.test(normalized)) return JobType.BAOJIE;
    if (/(养宠|宠物)/.test(normalized)) return JobType.YANGCHONG;
    if (/(家教|辅导功课|学科辅导|作业辅导|补习|辅导老师)/.test(normalized)) return JobType.JIAJIAO;
    if (/(陪伴师|陪伴|陪诊|陪聊|情感陪伴)/.test(normalized)) return JobType.PEIBAN;
    if (/(做饭|家务|保姆|高端家务|生活助理|私人助理|收纳整理)/.test(normalized)) return JobType.ZHUJIA_BAOMU;
    return undefined;
  };

  const handleAIParse = async () => {
    const isImageMode = !!aiImage;

    if (!isImageMode) {
      // 文本模式：预处理文本
      const cleanedText = aiText
        .replace(/\[图片\]/g, '')
        .replace(/\[表情\]/g, '')
        .replace(/\[语音\]/g, '')
        .replace(/\[视频\]/g, '')
        .replace(/\[文件\]/g, '')
        .replace(/\[链接\]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (!cleanedText || cleanedText.length < 10) {
        messageApi.warning('请粘贴简历文本（至少10个字符）');
        return;
      }
    }

    setAiLoading(true);
    try {
      let res: any;
      if (isImageMode) {
        // 图片模式
        res = await apiService.post('/api/ai/parse-resume-image', {
          image: aiImage,
          mimeType: aiImageMimeType,
        });
      } else {
        // 文本模式
        const cleanedText = aiText
          .replace(/\[图片\]/g, '')
          .replace(/\[表情\]/g, '')
          .replace(/\[语音\]/g, '')
          .replace(/\[视频\]/g, '')
          .replace(/\[文件\]/g, '')
          .replace(/\[链接\]/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        res = await apiService.post('/api/ai/parse-resume', { text: cleanedText });
      }
      if (!res.success || !res.data) {
        messageApi.error(res.message || 'AI识别失败');
        return;
      }
      const p = res.data;
      const formValues: Record<string, any> = {};

      // 基本信息
      if (p.name)                formValues.name            = p.name;
      if (p.age)                 formValues.age             = p.age;
      if (p.gender)              formValues.gender          = p.gender;
      if (p.phone)               formValues.phone           = p.phone;
      if (p.wechat)              formValues.wechat          = p.wechat;
      if (p.birthDate)           formValues.birthDate       = p.birthDate;
      if (p.currentAddress)      formValues.currentAddress  = p.currentAddress;
      if (p.hukouAddress)        formValues.hukouAddress    = p.hukouAddress;
      if (p.idNumber)            formValues.idNumber        = p.idNumber;
      if (p.nativePlace)         formValues.nativePlace     = normalizeProvince(p.nativePlace);
      if (p.ethnicity)           formValues.ethnicity       = p.ethnicity;
      if (p.education)           formValues.education       = p.education;
      if (p.maritalStatus)       formValues.maritalStatus   = p.maritalStatus;
      if (p.zodiac)              formValues.zodiac          = p.zodiac;
      if (p.constellation)       formValues.zodiacSign      = p.constellation; // 字段名不同
      if (p.religion)            formValues.religion        = p.religion;

      // 工作信息
      if (p.jobType)             formValues.jobType         = p.jobType;
      if (p.experienceYears != null) {
        formValues.experienceYears = p.experienceYears;
      } else if (p.workExperiences?.length) {
        // AI 未返回 experienceYears 时，从 workExperiences 日期区间自动估算总年限
        let totalMonths = 0;
        const now = new Date();
        for (const exp of p.workExperiences) {
          const start = exp.startDate ? new Date(exp.startDate + '-01') : null;
          const endRaw = exp.endDate && exp.endDate !== '至今' ? new Date(exp.endDate + '-01') : now;
          if (start && !isNaN(start.getTime())) {
            const months = (endRaw.getFullYear() - start.getFullYear()) * 12
              + (endRaw.getMonth() - start.getMonth());
            if (months > 0) totalMonths += months;
          }
        }
        if (totalMonths > 0) {
          formValues.experienceYears = Math.round(totalMonths / 12 * 10) / 10;
        }
      }
      if (p.expectedSalary)      formValues.expectedSalary  = p.expectedSalary;
      if (p.skills?.length)      formValues.skills          = p.skills;
      // 自我介绍：将 selfIntroduction 和 familySituation 合并写入
      {
        const parts: string[] = [];
        if (p.selfIntroduction) parts.push(p.selfIntroduction);
        if (p.familySituation) parts.push(`家庭情况：${p.familySituation}`);
        if (parts.length > 0) formValues.selfIntroduction = parts.join('\n');
      }

      // 工作经历
      if (p.workExperiences?.length) {
        formValues.workExperiences = p.workExperiences.map((exp: any) => {
          const jobType = inferJobTypeFromText(exp.description);
          return {
            startDate:      exp.startDate      || '',
            endDate:        exp.endDate        || '',
            jobType,
            description:    exp.description    || '',
            district:       exp.district       || undefined,
            customerName:   exp.customerName   || generateCustomerName(),
            customerReview: exp.customerReview || generateCustomerReview(jobType),
            orderNumber:    generateOrderNumber(),
          };
        });
      }

      form.setFieldsValue(formValues);

      // 存储AI生成的推荐理由，稍后在保存简历后自动创建内部评价
      if (p.recommendationReason) {
        setAiRecommendation(p.recommendationReason);
      }

      const filled = Object.keys(formValues).filter(k => k !== 'workExperiences').length
        + (formValues.workExperiences ? 1 : 0);
      messageApi.success(`AI识别完成，已填充 ${filled} 个字段`);
      setAiModalVisible(false);
      setAiText('');
      setAiImage(null);
      setAiImagePreview(null);
      setAiImageMimeType('image/png');
      setAiPastedImages([]);
    } catch (err: any) {
      messageApi.error(err.message || 'AI识别请求失败');
    } finally {
      setAiLoading(false);
    }
  };

  // AI图片分类确认回调：将分类结果的文件添加到对应的 fileUploadState 分类
  const handleAIPhotoClassifyConfirm = (results: ClassifiedFile[]) => {
    type PhotoCategoryKey = 'photo' | 'certificate' | 'medical' | 'confinementMeal' | 'cooking' | 'complementaryFood' | 'positiveReview';
    setFileUploadState(prev => {
      const next = { ...prev };
      results.forEach(item => {
        const cat = item.category as PhotoCategoryKey;
        if (!next[cat]) return;
        const newFile: CustomUploadFile = {
          uid: `ai-classify-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: item.file.name,
          status: 'done',
          thumbUrl: item.previewUrl,
          originFileObj: item.file as RcFile,
          size: item.file.size,
          isExisting: false,
        };
        next[cat] = { ...next[cat], files: [...next[cat].files, newFile] };
      });
      return next;
    });
    const summary = results.reduce<Record<string, number>>((acc, item) => {
      const label = CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] || item.category;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const summaryText = Object.entries(summary).map(([k, v]) => `${k}×${v}`).join('、');
    messageApi.success(`已添加 ${results.length} 张图片：${summaryText}`);
  };

  // 将某分类下的图片移到另一分类
  type PhotoCategoryKey = 'photo' | 'certificate' | 'medical' | 'confinementMeal' | 'cooking' | 'complementaryFood' | 'positiveReview';
  const handleMoveToCategory = (fromCategory: PhotoCategoryKey) => (file: CustomUploadFile, toCategory: string) => {
    setFileUploadState(prev => {
      const toCat = toCategory as PhotoCategoryKey;
      if (!prev[toCat] || fromCategory === toCat) return prev;
      const fromFiles = prev[fromCategory].files.filter(f => f.uid !== file.uid);
      const toFiles = [...prev[toCat].files, file];
      return {
        ...prev,
        [fromCategory]: { ...prev[fromCategory], files: fromFiles },
        [toCat]: { ...prev[toCat], files: toFiles },
      };
    });
  };

  // 将 validateFile 移到组件内部
  const validateFile = (file: RcFile, type: 'idCard' | 'photo' | 'certificate' | 'medical' | 'confinementMeal' | 'cooking' | 'complementaryFood' | 'positiveReview'): boolean => {
    // 检查文件大小
    if (file.size > FILE_UPLOAD_CONFIG.maxSize) {
      messageApi.error(`文件大小不能超过${FILE_UPLOAD_CONFIG.maxSize / 1024 / 1024}MB`);
      return false;
    }

    // 检查文件类型
    const fileType = file.type as FileType;
    if (type === 'medical') {
      if (![...FILE_UPLOAD_CONFIG.allowedImageTypes, ...FILE_UPLOAD_CONFIG.allowedPdfTypes].includes(fileType)) {
        messageApi.error('只支持JPG、JPEG、PNG和PDF文件');
        return false;
      }
    } else {
      if (!FILE_UPLOAD_CONFIG.allowedImageTypes.includes(fileType as ImageType)) {
        messageApi.error('只支持JPG、JPEG、PNG图片文件');
        return false;
      }
    }

    return true;
  };

  // 文件上传处理函数
  const handleFileChange = (type: 'photo' | 'certificate' | 'medical' | 'confinementMeal' | 'cooking' | 'complementaryFood' | 'positiveReview') =>
    (info: UploadChangeParam<UploadFile<any>>) => {
      const { file, fileList } = info;
      
      // 验证文件
      if (file.status === 'uploading' && file.originFileObj) {
        if (!validateFile(file.originFileObj, type)) {
          return;
        }
      }

      // 更新两套文件列表状态以保持兼容性
      const customFileList = fileList as CustomUploadFile[];
      
      // 更新单独的状态变量（兼容旧逻辑）
      switch (type) {
        case 'photo':
          setPhotoFiles(customFileList);
          break;
        case 'certificate':
          setCertificateFiles(customFileList);
          break;
        case 'medical':
          setMedicalReportFiles(customFileList);
          break;
      }
      
      // 同时更新统一的文件上传状态
      setFileUploadState(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          files: customFileList
        }
      }));

      // 处理上传状态
      if (file.status === 'done') {
        messageApi.success(`${file.name} 上传成功`);
      } else if (file.status === 'error') {
        messageApi.error(`${file.name} 上传失败`);
      }
    };

  // 重新生成AI工装照
  const handleRegeneratePhoto = async (file: CustomUploadFile) => {
    // 如果文件还没上传（AI分类填充的本地文件），先上传到 COS 获得 URL
    let photoUrl = file.url;
    if (!photoUrl) {
      if (!file.originFileObj) {
        messageApi.warning('无原始照片，无法生成工装');
        return;
      }
      const hideUploading = messageApi.loading('正在上传原图，请稍候...', 0);
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file.originFileObj as File);
        const uploadRes = await apiService.upload('/api/ai/upload-photo', uploadFormData, 'POST');
        hideUploading();
        if (!uploadRes.success || !uploadRes.data?.photoUrl) {
          messageApi.error('上传原图失败，请重试');
          return;
        }
        photoUrl = uploadRes.data.photoUrl;
        // 顺便把 url 回填，避免下次再次上传
        setFileUploadState(prev => ({
          ...prev,
          photo: { ...prev.photo, files: prev.photo.files.map(f => f.uid === file.uid ? { ...f, url: photoUrl! } : f) },
        }));
        setPhotoFiles(prev => prev.map(f => f.uid === file.uid ? { ...f, url: photoUrl! } : f));
      } catch (err) {
        hideUploading();
        messageApi.error('上传原图失败，请重试');
        return;
      }
    }
    // 立即设为上传中状态，触发图片上的"上传中..."遮罩
    const uploadingFile: NewFile = {
      uid: file.uid,
      name: file.name,
      url: photoUrl,
      thumbUrl: file.thumbUrl,
      size: file.size,
      type: file.type,
      uniformPhotoUrl: file.uniformPhotoUrl,
      status: 'uploading' as const,
      isExisting: false,
    };
    setFileUploadState(prev => ({
      ...prev,
      photo: { ...prev.photo, files: prev.photo.files.map(f => f.uid === file.uid ? uploadingFile : f) },
    }));
    setPhotoFiles(prev => prev.map(f => f.uid === file.uid ? uploadingFile : f));

    const hideLoading = messageApi.loading('正在重新生成AI工装照，请稍候（约30-60秒）...', 0);
    try {
      // 将COS URL传给后端，由后端服务端下载并调用AI（避免浏览器CORS限制）
      const aiResponse = await apiService.post('/api/ai/swap-uniform-by-url', { photoUrl }, { timeout: 120000 });
      hideLoading();

      if (aiResponse.success && aiResponse.data?.personalPhotoUrl) {
        const { personalPhotoUrl, uniformPhotoUrl } = aiResponse.data;
        const doneFile: CustomUploadFile = {
          uid: file.uid,
          name: file.name,
          status: 'done' as const,
          url: personalPhotoUrl,
          thumbUrl: uniformPhotoUrl || file.thumbUrl,
          uniformPhotoUrl: uniformPhotoUrl,
          size: file.size,
          isExisting: false,
        };
        setFileUploadState(prev => ({
          ...prev,
          photo: { ...prev.photo, files: prev.photo.files.map(f => f.uid === file.uid ? doneFile : f) },
        }));
        setPhotoFiles(prev => prev.map(f => f.uid === file.uid ? doneFile : f));
        messageApi.success('AI工装照重新生成成功！');
      } else {
        throw new Error(aiResponse.message || '重新生成失败');
      }
    } catch (err) {
      hideLoading();
      console.error('[AI重新换装] 失败:', err);
      // 恢复为之前的状态
      const restoredFile: NewFile = {
        uid: file.uid,
        name: file.name,
        url: photoUrl,
        thumbUrl: file.thumbUrl,
        size: file.size,
        type: file.type,
        uniformPhotoUrl: file.uniformPhotoUrl,
        status: 'done' as const,
        isExisting: false,
      };
      setFileUploadState(prev => ({
        ...prev,
        photo: { ...prev.photo, files: prev.photo.files.map(f => f.uid === file.uid ? restoredFile : f) },
      }));
      setPhotoFiles(prev => prev.map(f => f.uid === file.uid ? restoredFile : f));
      messageApi.warning('AI工装照重新生成失败，请稍后重试');
    }
  };

  // 修改预览处理函数
  const handlePreview = (file: UploadFile) => {
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = URL.createObjectURL(file.originFileObj);
    }
    
    // 优先预览 AI 生成的工装照（thumbUrl），其次是原始照片（url/preview）
    const fileUrl = (file as any).uniformPhotoUrl || file.thumbUrl || file.url || (file.preview as string) || '';
    const fileName = file.name || file.url?.substring(file.url.lastIndexOf('/') + 1) || '';
    
    // 判断是否为PDF文件
    const isPdf = file.type === 'application/pdf' || 
                  fileName.toLowerCase().endsWith('.pdf') || 
                  fileUrl.toLowerCase().includes('.pdf');
    
    if (isPdf) {
      // PDF文件直接下载，不预览
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // 图片文件预览
      setPreviewState({
        visible: true,
        image: fileUrl,
        title: fileName
      });
    }
  };

  // 修改文件移除处理函数
  const handleRemoveFile = (type: 'photo' | 'certificate' | 'medical' | 'confinementMeal' | 'cooking' | 'complementaryFood' | 'positiveReview') => async (file: UploadFile) => {
    try {
      console.log('🗑️ 开始删除文件:', {
        type,
        fileName: file.name,
        fileUrl: file.url,
        isExisting: (file as CustomUploadFile).isExisting,
        editingResumeId: editingResume?._id
      });

      // 如果是编辑模式且是已存在的文件，需要调用后端API删除
      if (editingResume?._id && file.url && (file as CustomUploadFile).isExisting) {
        console.log('🔄 调用后端删除API...');
        
        // 调用后端API删除文件 - 使用POST请求避免URL过长问题
        const deleteUrl = `/api/resumes/${editingResume._id}/files/delete`;
        const response = await apiService.post(deleteUrl, { fileUrl: file.url });
        
        console.log('📝 后端删除API响应:', response);
        
        if (response.success) {
          messageApi.success(`${file.name} 删除成功`);
          console.log('✅ 后端删除成功');
        } else {
          console.warn('⚠️ 文件删除API返回非成功状态，但继续移除UI显示:', response);
          messageApi.warning(`${file.name} 删除可能未完全成功`);
        }
      } else {
        console.log('ℹ️ 无需调用后端API（新文件或非编辑模式）');
      }
      
      // 从前端状态中移除文件
      console.log('🔄 从前端状态中移除文件...');
      setFileUploadState(prev => {
        const newState = {
          ...prev,
          [type]: {
            ...prev[type],
            files: prev[type]?.files.filter(f => f.uid !== file.uid) || []
          }
        };
        console.log('📊 更新后的文件状态:', newState);
        return newState;
      });
      
      // 同时更新单独的状态变量（兼容旧逻辑）
      switch (type) {
        case 'photo':
          setPhotoFiles(prev => {
            const newFiles = prev.filter(f => f.uid !== file.uid);
            console.log('📸 更新photoFiles:', newFiles.length, '个文件');
            return newFiles;
          });
          break;
        case 'certificate':
          setCertificateFiles(prev => {
            const newFiles = prev.filter(f => f.uid !== file.uid);
            console.log('📜 更新certificateFiles:', newFiles.length, '个文件');
            return newFiles;
          });
          break;
        case 'medical':
          setMedicalReportFiles(prev => {
            const newFiles = prev.filter(f => f.uid !== file.uid);
            console.log('🏥 更新medicalReportFiles:', newFiles.length, '个文件');
            return newFiles;
          });
          break;
      }
      
      console.log('✅ 文件删除操作完成');
      
    } catch (error) {
      console.error('❌ 删除文件失败:', error);
      
      // 即使删除API失败，也从UI中移除文件（可能文件已经不存在）
      setFileUploadState(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          files: prev[type]?.files.filter(f => f.uid !== file.uid) || []
        }
      }));
      
      // 同时更新单独的状态变量
      switch (type) {
        case 'photo':
          setPhotoFiles(prev => prev.filter(f => f.uid !== file.uid));
          break;
        case 'certificate':
          setCertificateFiles(prev => prev.filter(f => f.uid !== file.uid));
          break;
        case 'medical':
          setMedicalReportFiles(prev => prev.filter(f => f.uid !== file.uid));
          break;
      }
      
      messageApi.warning(`${file.name} 已从界面移除，但删除可能失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 修改文件上传列表渲染函数
  const renderUploadList = (
    type: keyof FileUploadState,
    moveOptions?: { onMoveToCategory: (file: CustomUploadFile, cat: string) => void; availableCategories: Array<{ value: string; label: string }> }
  ) => {
    const currentFiles = fileUploadState[type].files;
    const isMaxReached = (() => {
      switch (type) {
        case 'photo':
          return currentFiles.length >= FILE_UPLOAD_CONFIG.maxPhotoCount;
        case 'certificate':
          return currentFiles.length >= FILE_UPLOAD_CONFIG.maxCertificateCount;
        case 'medical':
          return currentFiles.length >= FILE_UPLOAD_CONFIG.maxMedicalReportCount;
        case 'confinementMeal':
          return currentFiles.length >= FILE_UPLOAD_CONFIG.maxConfinementMealCount;
        case 'cooking':
          return currentFiles.length >= FILE_UPLOAD_CONFIG.maxCookingCount;
        case 'complementaryFood':
          return currentFiles.length >= FILE_UPLOAD_CONFIG.maxComplementaryFoodCount;
        case 'positiveReview':
          return currentFiles.length >= FILE_UPLOAD_CONFIG.maxPositiveReviewCount;
        default:
          return false;
      }
    })();

    const beforeUploadHandler = async (file: RcFile) => {
          // 🔄 添加图片压缩处理
          let processedFile: File = file;
          try {
            const compressionTypeMapping = {
              'photo': 'photo',
              'certificate': 'certificate',
              'medical': 'medicalReport',
              'confinementMeal': 'photo',
              'cooking': 'photo',
              'complementaryFood': 'photo',
              'positiveReview': 'photo'
            } as const;

            const compressionType = compressionTypeMapping[type as keyof typeof compressionTypeMapping];

            console.log(`🗜️ 开始压缩文件: ${file.name} (${(file.size / 1024).toFixed(2)}KB) - 类型: ${compressionType}`);
            processedFile = await ImageService.compressImage(file, compressionType);
            console.log(`✅ 压缩完成: ${processedFile.name} (${(processedFile.size / 1024).toFixed(2)}KB)`);
          } catch (error) {
            console.warn('⚠️ 压缩失败，使用原文件:', error);
            processedFile = file;
          }

          const formData = new FormData();
          formData.append('file', processedFile);

          const fileTypeMapping = {
            'photo': 'personalPhoto',
            'certificate': 'certificate',
            'medical': 'medicalReport',
            'confinementMeal': 'confinementMealPhoto',
            'cooking': 'cookingPhoto',
            'complementaryFood': 'complementaryFoodPhoto',
            'positiveReview': 'positiveReviewPhoto'
          } as const;

          const mappedType = fileTypeMapping[type as keyof typeof fileTypeMapping];
          if (!mappedType) {
            console.error(`未知的文件类型: ${type}`);
            messageApi.error(`未知的文件类型: ${type}`);
            return false;
          }

          formData.append('type', mappedType);
          console.log(`📂 文件上传类型映射: ${type} -> ${mappedType}`);
          const tempPreviewUrl = URL.createObjectURL(processedFile);

          if (editingResume?._id) {
            try {
              const response = await apiService.upload(`/api/resumes/${editingResume._id}/upload`, formData);
              if (response.success) {
                const newFile: CustomUploadFile = {
                  uid: file.uid,
                  name: file.name,
                  url: response.data?.fileUrl,
                  thumbUrl: tempPreviewUrl,
                  status: "done" as const,
                  originFileObj: file,
                  size: processedFile.size,
                  isExisting: false
                };

                setFileUploadState(prev => ({
                  ...prev,
                  [type]: {
                    ...prev[type],
                    files: [...prev[type].files, newFile]
                  }
                }));

                switch (type) {
                  case 'photo':
                    setPhotoFiles(prev => [...prev, newFile]);
                    break;
                  case 'certificate':
                    setCertificateFiles(prev => [...prev, newFile]);
                    break;
                  case 'medical':
                    setMedicalReportFiles(prev => [...prev, newFile]);
                    break;
                }

                messageApi.success(`${file.name} 上传成功`);
              } else {
                messageApi.error(response.message || "上传失败");
              }
            } catch (err) {
              console.error("上传文件时出错", err);
              messageApi.error("上传文件时出错");
            }
          } else {
            const newFile: CustomUploadFile = {
              uid: file.uid,
              name: file.name,
              status: "done" as const,
              thumbUrl: tempPreviewUrl,
              originFileObj: processedFile as unknown as RcFile,
              size: processedFile.size,
              isExisting: false
            };

            console.log(`📁 创建模式：添加文件到待上传列表`, {
              type,
              fileName: file.name,
              originalSize: file.size,
              compressedSize: processedFile.size,
              hasOriginFileObj: !!newFile.originFileObj
            });

            setFileUploadState(prev => ({
              ...prev,
              [type]: {
                ...prev[type],
                files: [...prev[type].files, newFile]
              }
            }));

            switch (type) {
              case 'photo':
                setPhotoFiles(prev => [...prev, newFile]);
                break;
              case 'certificate':
                setCertificateFiles(prev => [...prev, newFile]);
                break;
              case 'medical':
                setMedicalReportFiles(prev => [...prev, newFile]);
                break;
            }
          }
          return false;
    };

    // 当有 moveOptions 时，只渲染 SortableImageUpload（避免出现两个上传按钮）
    if (moveOptions) {
      return (
        <SortableImageUpload
          fileList={fileUploadState[type].files}
          onChange={(newList) => setFileUploadState(prev => ({ ...prev, [type]: { ...prev[type], files: newList as CustomUploadFile[] } }))}
          onPreview={handlePreview}
          onRemove={handleRemoveFile(type)}
          onMoveToCategory={moveOptions.onMoveToCategory}
          availableCategories={moveOptions.availableCategories}
          maxCount={(() => {
            switch (type) {
              case 'confinementMeal': return FILE_UPLOAD_CONFIG.maxConfinementMealCount;
              case 'cooking': return FILE_UPLOAD_CONFIG.maxCookingCount;
              case 'complementaryFood': return FILE_UPLOAD_CONFIG.maxComplementaryFoodCount;
              case 'positiveReview': return FILE_UPLOAD_CONFIG.maxPositiveReviewCount;
              default: return 9999;
            }
          })()}
          beforeUpload={beforeUploadHandler}
          disabled={false}
        />
      );
    }

    return (
    <div>
      <Upload
        listType="picture-card"
        fileList={currentFiles}
        onPreview={handlePreview}
        onRemove={handleRemoveFile(type)}
        beforeUpload={beforeUploadHandler}
        onChange={handleFileChange(type)}
        accept={type === 'medical' ? '.jpg,.jpeg,.png,.pdf' : '.jpg,.jpeg,.png'}
        multiple
        showUploadList={true}
      >
        {isMaxReached ? null : uploadButton}
      </Upload>
    </div>
    );
  };

  // 修改健康检查相关的 useEffect
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const isHealthy = await checkBackendConnection();
        if (isHealthy) {
          setMessageState({ type: 'success', content: '后端连接正常' });
        } else {
          setMessageState({ type: 'error', content: '后端服务暂时无法连接，请检查后端服务是否启动' });
        }
      } catch (_error) {
        setMessageState({ type: 'error', content: '后端服务暂时无法连接，请检查后端服务是否启动' });
      }
    };

    const timer = setTimeout(checkHealth, 3000);
    return () => clearTimeout(timer);
  }, []); // 移除 messageApi 依赖

  // 添加一个新的 useEffect 来处理消息状态
  useEffect(() => {
    if (messageState) {
      switch (messageState.type) {
        case 'success':
          messageApi.success(messageState.content);
          break;
        case 'error':
          messageApi.error(messageState.content);
          break;
        case 'warning':
          messageApi.warning(messageState.content);
          break;
      }
      setMessageState(null);
    }
  }, [messageState, messageApi]);

  // 修改 loadResumeData 函数
  const loadResumeData = async (resumeId: string) => {
    try {
      setLoading(true);
      const response = await apiService.get<ApiResponse<Resume>>(`/api/resumes/${resumeId}`);
      if (response.success && response.data) {
        // 使用类型断言，先转换为unknown再转换为Resume
        const resumeData = response.data as unknown as Resume;
        const extendedResume = convertToExtendedResume(resumeData);
        setEditingResume(extendedResume);
        
        // 设置表单数据，确保所有字段都是正确的类型
        const formData = {
          name: extendedResume.name,
          age: extendedResume.age,
          phone: extendedResume.phone,
          gender: extendedResume.gender,
          nativePlace: extendedResume.nativePlace,
          jobType: extendedResume.jobType,
          education: extendedResume.education,
          experienceYears: extendedResume.experienceYears,
          idNumber: extendedResume.idNumber,
          wechat: extendedResume.wechat,
          currentAddress: extendedResume.currentAddress,
          hukouAddress: extendedResume.hukouAddress,
          birthDate: extendedResume.birthDate ? dayjs(extendedResume.birthDate).format('YYYY-MM-DD') : undefined,
          medicalExamDate: extendedResume.medicalExamDate ? dayjs(extendedResume.medicalExamDate).format('YYYY-MM-DD') : undefined,
          ethnicity: extendedResume.ethnicity,
          zodiac: extendedResume.zodiac,
          zodiacSign: extendedResume.zodiacSign,
          expectedSalary: extendedResume.expectedSalary,
          serviceArea: extendedResume.serviceArea,
          orderStatus: extendedResume.orderStatus,
          skills: extendedResume.skills,
          leadSource: extendedResume.leadSource,
          // 添加缺失的字段
          maritalStatus: extendedResume.maritalStatus,
          religion: extendedResume.religion,
          emergencyContactName: extendedResume.emergencyContactName,
          emergencyContactPhone: extendedResume.emergencyContactPhone,
          // 培训意向字段
          learningIntention: (extendedResume as any).learningIntention,
          currentStage: (extendedResume as any).currentStage,
          workExperiences: extendedResume.workExperiences?.map(exp => ({
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            description: exp.description || '',
            company: exp.company || undefined,
            position: exp.position || undefined,
            orderNumber: exp.orderNumber || undefined,
            district: exp.district || undefined,
            customerName: exp.customerName || undefined,
            customerReview: exp.customerReview || undefined,
            jobType: exp.jobType || undefined,
            photos: exp.photos || []
          })) || [{ startDate: '', endDate: '', description: '' }] // 确保至少有一条工作经历
        };
        
        // 设置表单值
        form.setFieldsValue(formData);
        
        // 设置已有文件的显示
        if (extendedResume.idCardFrontUrl || extendedResume.idCardFront?.url) {
          setExistingIdCardFrontUrl(extendedResume.idCardFrontUrl || extendedResume.idCardFront?.url || '');
        }
        
        if (extendedResume.idCardBackUrl || extendedResume.idCardBack?.url) {
          setExistingIdCardBackUrl(extendedResume.idCardBackUrl || extendedResume.idCardBack?.url || '');
        }
        
        // 修改：统一使用 fileUploadState 管理文件状态
        const updatedFileUploadState = {
          photo: { files: [] as CustomUploadFile[] },
          certificate: { files: [] as CustomUploadFile[] },
          medical: { files: [] as CustomUploadFile[] },
          confinementMeal: { files: [] as CustomUploadFile[] },
          cooking: { files: [] as CustomUploadFile[] },
          complementaryFood: { files: [] as CustomUploadFile[] },
          positiveReview: { files: [] as CustomUploadFile[] }
        };
        
        // 设置个人照片 - 同时处理新格式和旧格式，避免重复
        const allPhotoFiles: CustomUploadFile[] = [];
        const addedPhotoUrls = new Set<string>(); // 用于去重

        console.log('🖼️ 编辑模式：加载个人照片');
        console.log('  - 工装照:', extendedResume.uniformPhoto);
        console.log('  - 新格式个人照片:', extendedResume.personalPhoto);
        console.log('  - 旧格式个人照片:', extendedResume.photoUrls);

        // 🔥 首先加载工装照（排在最前面）
        if (extendedResume.uniformPhoto?.url && !addedPhotoUrls.has(extendedResume.uniformPhoto.url)) {
          console.log('  👔 添加工装照:', extendedResume.uniformPhoto.url);
          allPhotoFiles.push({
            uid: 'existing-uniform-photo',
            name: extendedResume.uniformPhoto.filename || '工装照',
            status: 'done' as const,
            url: extendedResume.uniformPhoto.url,
            uniformPhotoUrl: extendedResume.uniformPhoto.url, // 标记为工装照
            isExisting: true,
            size: extendedResume.uniformPhoto.size || 0
          });
          addedPhotoUrls.add(extendedResume.uniformPhoto.url);
        }

        // 处理新格式的个人照片（数组或单对象）
        const personalPhotoArr = extendedResume.personalPhoto
          ? (Array.isArray(extendedResume.personalPhoto)
              ? extendedResume.personalPhoto
              : [extendedResume.personalPhoto])
          : [];

        personalPhotoArr.forEach((photo, index) => {
          if (photo?.url && !addedPhotoUrls.has(photo.url)) {
            allPhotoFiles.push({
              uid: `existing-photo-new-${index}`,
              name: photo.filename || `个人照片${index + 1}`,
              status: 'done' as const,
              url: photo.url,
              isExisting: true,
              size: photo.size || 0
            });
            addedPhotoUrls.add(photo.url);
          }
        });

        // 处理旧格式的个人照片（去重）
        if (extendedResume.photoUrls && extendedResume.photoUrls.length > 0) {
          const uniqueOldPhotos = extendedResume.photoUrls.filter(url => !addedPhotoUrls.has(url));
          if (uniqueOldPhotos.length > 0) {
            console.log('  ✅ 添加旧格式个人照片:', uniqueOldPhotos.length, '张（已去重）');
            const oldPhotoFiles = uniqueOldPhotos.map((url, index) => ({
              uid: `existing-photo-old-${index}`,
              name: `个人照片${index + 1}`,
              status: 'done' as const,
              url: url,
              isExisting: true,
              size: 0
            }));
            allPhotoFiles.push(...oldPhotoFiles as CustomUploadFile[]);
          } else {
            console.log('  ⚠️ 旧格式个人照片已存在，跳过重复项');
          }
        }

        if (allPhotoFiles.length > 0) {
          console.log('  📸 最终个人照片数量:', allPhotoFiles.length);
          updatedFileUploadState.photo.files = allPhotoFiles;
          setPhotoFiles(allPhotoFiles);
        }

        // 设置技能证书 - 同时处理新格式和旧格式，避免重复
        const allCertFiles: CustomUploadFile[] = [];
        const addedCertUrls = new Set<string>(); // 用于去重

        console.log('📜 编辑模式：加载证书');
        console.log('  - 新格式证书:', extendedResume.certificates?.length || 0, '个');
        console.log('  - 旧格式证书:', extendedResume.certificateUrls?.length || 0, '个');

        // 处理新格式的证书
        if (extendedResume.certificates && extendedResume.certificates.length > 0) {
          console.log('  ✅ 添加新格式证书:', extendedResume.certificates.length, '个');
          const newCertFiles = extendedResume.certificates.map((cert, index) => ({
            uid: `existing-cert-new-${index}`,
            name: cert.filename || `证书${index + 1}`,
            status: 'done' as const,
            url: cert.url,
            isExisting: true,
            size: cert.size || 0
          }));
          allCertFiles.push(...newCertFiles as CustomUploadFile[]);
          // 记录已添加的URL
          extendedResume.certificates.forEach(cert => addedCertUrls.add(cert.url));
        }

        // 处理旧格式的证书（去重）
        if (extendedResume.certificateUrls && extendedResume.certificateUrls.length > 0) {
          const uniqueOldCerts = extendedResume.certificateUrls.filter(url => !addedCertUrls.has(url));
          if (uniqueOldCerts.length > 0) {
            console.log('  ✅ 添加旧格式证书:', uniqueOldCerts.length, '个（已去重）');
            const oldCertFiles = uniqueOldCerts.map((url, index) => ({
              uid: `existing-cert-old-${index}`,
              name: `证书${index + 1}`,
              status: 'done' as const,
              url: url,
              isExisting: true,
              size: 0
            }));
            allCertFiles.push(...oldCertFiles as CustomUploadFile[]);
          } else {
            console.log('  ⚠️ 旧格式证书已存在，跳过重复项');
          }
        }

        if (allCertFiles.length > 0) {
          console.log('  📜 最终证书数量:', allCertFiles.length);
          updatedFileUploadState.certificate.files = allCertFiles;
          setCertificateFiles(allCertFiles);
        }

        // 设置体检报告 - 同时处理新格式和旧格式，避免重复
        const allMedicalFiles: CustomUploadFile[] = [];
        const addedMedicalUrls = new Set<string>(); // 用于去重

        console.log('🏥 编辑模式：加载体检报告');
        console.log('  - 新格式体检报告:', extendedResume.reports?.length || 0, '个');
        console.log('  - 旧格式体检报告:', extendedResume.medicalReportUrls?.length || 0, '个');

        // 处理新格式的体检报告
        if (extendedResume.reports && extendedResume.reports.length > 0) {
          console.log('  ✅ 添加新格式体检报告:', extendedResume.reports.length, '个');
          const newMedicalFiles = extendedResume.reports.map((report, index) => ({
            uid: `existing-medical-new-${index}`,
            name: report.filename || `体检报告${index + 1}`,
            status: 'done' as const,
            url: report.url,
            isExisting: true,
            size: report.size || 0
          }));
          allMedicalFiles.push(...newMedicalFiles as CustomUploadFile[]);
          // 记录已添加的URL
          extendedResume.reports.forEach(report => addedMedicalUrls.add(report.url));
        }

        // 处理旧格式的体检报告（去重）
        if (extendedResume.medicalReportUrls && extendedResume.medicalReportUrls.length > 0) {
          const uniqueOldMedicals = extendedResume.medicalReportUrls.filter(url => !addedMedicalUrls.has(url));
          if (uniqueOldMedicals.length > 0) {
            console.log('  ✅ 添加旧格式体检报告:', uniqueOldMedicals.length, '个（已去重）');
            const oldMedicalFiles = uniqueOldMedicals.map((url, index) => ({
              uid: `existing-medical-old-${index}`,
              name: `体检报告${index + 1}`,
              status: 'done' as const,
              url: url,
              isExisting: true,
              size: 0
            }));
            allMedicalFiles.push(...oldMedicalFiles as CustomUploadFile[]);
          } else {
            console.log('  ⚠️ 旧格式体检报告已存在，跳过重复项');
          }
        }

        if (allMedicalFiles.length > 0) {
          console.log('  🏥 最终体检报告数量:', allMedicalFiles.length);
          updatedFileUploadState.medical.files = allMedicalFiles;
          setMedicalReportFiles(allMedicalFiles);
        }

        // 设置月子餐照片
        if (extendedResume.confinementMealPhotos && extendedResume.confinementMealPhotos.length > 0) {
          console.log('  🍲 加载月子餐照片:', extendedResume.confinementMealPhotos.length, '张');
          const confinementMealFiles: CustomUploadFile[] = extendedResume.confinementMealPhotos.map((file: any, index: number) => ({
            uid: `confinementMeal-${index}-${Date.now()}`,
            name: file.filename || `月子餐照片${index + 1}`,
            status: 'done' as const,
            url: file.url,
            size: file.size || 0,
            type: file.mimetype || 'image/jpeg',
            isExisting: true
          }));
          updatedFileUploadState.confinementMeal.files = confinementMealFiles;
        }

        // 设置烹饪照片
        if (extendedResume.cookingPhotos && extendedResume.cookingPhotos.length > 0) {
          console.log('  👨‍🍳 加载烹饪照片:', extendedResume.cookingPhotos.length, '张');
          const cookingFiles: CustomUploadFile[] = extendedResume.cookingPhotos.map((file: any, index: number) => ({
            uid: `cooking-${index}-${Date.now()}`,
            name: file.filename || `烹饪照片${index + 1}`,
            status: 'done' as const,
            url: file.url,
            size: file.size || 0,
            type: file.mimetype || 'image/jpeg',
            isExisting: true
          }));
          updatedFileUploadState.cooking.files = cookingFiles;
        }

        // 设置辅食添加照片
        if (extendedResume.complementaryFoodPhotos && extendedResume.complementaryFoodPhotos.length > 0) {
          console.log('  🍼 加载辅食添加照片:', extendedResume.complementaryFoodPhotos.length, '张');
          const complementaryFoodFiles: CustomUploadFile[] = extendedResume.complementaryFoodPhotos.map((file: any, index: number) => ({
            uid: `complementaryFood-${index}-${Date.now()}`,
            name: file.filename || `辅食添加照片${index + 1}`,
            status: 'done' as const,
            url: file.url,
            size: file.size || 0,
            type: file.mimetype || 'image/jpeg',
            isExisting: true
          }));
          updatedFileUploadState.complementaryFood.files = complementaryFoodFiles;
        }

        // 设置好评展示照片
        if (extendedResume.positiveReviewPhotos && extendedResume.positiveReviewPhotos.length > 0) {
          console.log('  ⭐ 加载好评展示照片:', extendedResume.positiveReviewPhotos.length, '张');
          const positiveReviewFiles: CustomUploadFile[] = extendedResume.positiveReviewPhotos.map((file: any, index: number) => ({
            uid: `positiveReview-${index}-${Date.now()}`,
            name: file.filename || `好评展示照片${index + 1}`,
            status: 'done' as const,
            url: file.url,
            size: file.size || 0,
            type: file.mimetype || 'image/jpeg',
            isExisting: true
          }));
          updatedFileUploadState.positiveReview.files = positiveReviewFiles;
        }

        // 更新统一的文件上传状态
        setFileUploadState(updatedFileUploadState);

        // 加载员工评价数据
        if ((response.data as any).employeeEvaluations) {
          setEmployeeEvaluations((response.data as any).employeeEvaluations);
        }

      } else {
        setMessageState({ type: 'error', content: response.message || '加载简历失败' });
      }
    } catch (error) {
      console.error('加载简历失败:', error);
      setMessageState({ type: 'error', content: '加载简历失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  // 修改 checkAuthAndLoadData 函数
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      if (!isLoggedIn()) {
        setMessageState({ type: 'error', content: '请先登录' });
        navigate('/login');
        return;
      }

      // 检查是否是编辑模式
      const params = new URLSearchParams(window.location.search);
      const isEditMode = params.get('edit') === 'true';
      const resumeId = params.get('id');

      if (isEditMode && resumeId) {
        // 明确的编辑模式：通过URL参数加载指定简历
        await loadResumeData(resumeId);
      } else {
        // 非编辑模式：确保是空白的创建页面
        console.log('🆕 进入创建模式，清除所有编辑数据');
        
        // 清除localStorage中的编辑数据
        localStorage.removeItem('editingResume');
        
        // 重置所有相关状态
        setEditingResume(null);
        form.resetFields();
        
        // 重置文件状态
        setIdCardFiles({ front: [], back: [] });
        setPhotoFiles([]);
        setCertificateFiles([]);
        setMedicalReportFiles([]);
        setExistingIdCardFrontUrl('');
        setExistingIdCardBackUrl('');
        
        console.log('✅ 创建模式初始化完成');
      }
    };

    checkAuthAndLoadData();
  }, [form, navigate]);

  // 性别选择处理函数，确保 form 可用
  const handleGenderChange = (value: GenderType) => {
    if (value === Gender.MALE || value === Gender.FEMALE) {
      form.setFieldsValue({ gender: value });
    }
  };

  // 使用 useEffect 进行健康检查
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const isHealthy = await checkBackendConnection();
        if (isHealthy) {
          messageApi.success('后端连接正常');
        }
      } catch (_error) {
        setMessageState({ type: 'error', content: '后端服务暂时无法连接，请检查后端服务是否启动' });
      }
    };

    // 延迟3秒执行健康检查
    const timer = setTimeout(checkHealth, 3000);
    return () => clearTimeout(timer);
  }, [messageApi]); // 添加 messageApi 作为依赖项

  // 定义检查后端连接的函数
  const checkBackendConnection = async (): Promise<boolean> => {
    try {
      const isHealthy = await apiService.checkHealth();
      if (!isHealthy) {
        throw new Error('后端服务响应异常');
      }
      return true;
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`连接后端失败: ${apiError.response?.status || apiError.message || '未知错误'}`);
      throw error;
    }
  };

  // 添加员工评价
  const handleAddEvaluation = async (values: any) => {
    try {
      setEvaluationLoading(true);

      if (!editingResume?._id) {
        messageApi.error('简历ID不存在');
        return;
      }

      console.log('准备创建员工评价:', {
        employeeId: editingResume._id,
        employeeName: editingResume.name,
        ...values
      });

      // 调用API创建员工评价
      const response = await apiService.post('/api/employee-evaluations', {
        employeeId: editingResume._id,
        employeeName: editingResume.name,
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

      console.log('员工评价创建成功:', response);

      messageApi.success('添加评价成功');
      setIsAddEvaluationVisible(false);
      evaluationForm.resetFields();

      // 重新加载简历数据以获取最新的评价列表
      if (editingResume._id) {
        await loadResumeData(editingResume._id);
      }

    } catch (error) {
      console.error('添加员工评价失败:', error);
      messageApi.error(error instanceof Error ? error.message : '添加评价失败');
    } finally {
      setEvaluationLoading(false);
    }
  };

  // 页面标题
  const pageTitle = editingResume ? '编辑简历' : '创建简历';

  // 修改身份证上传处理函数
  const handleIdCardUpload = async (type: 'front' | 'back', info: UploadChangeParam<UploadFile<any>>) => {
    if (isOcrProcessing) {
      messageApi.warning('正在处理身份证识别，请稍候...');
      return;
    }

    const file = info.file.originFileObj;
    if (!file) {
      messageApi.error('文件上传失败，请重试');
      return;
    }

    if (!validateFile(file, 'idCard')) {
      return;
    }

    try {
      setIsOcrProcessing(true);
      const ocrResult = await ImageService.ocrIdCard(file, type);
      const formValues = ImageService.extractIdCardInfo(ocrResult);
      
      if (Object.keys(formValues).length > 0) {
        form.setFieldsValue(formValues);
        messageApi.success('身份证信息识别成功');
      } else {
        messageApi.warning('未能识别到身份证信息，请手动填写');
      }

      const newFile: CustomUploadFile = {
        uid: file.uid || `-1`,
        name: file.name,
        status: 'done' as const,
        url: URL.createObjectURL(file),
        originFileObj: file,
        isExisting: false,
        type: file.type
      };

      setIdCardFiles(prev => ({
        ...prev,
        [type]: [newFile]
      }));

    } catch (error) {
      console.error('OCR识别失败:', error);
      messageApi.error(error instanceof Error ? error.message : '身份证识别失败，请手动填写信息');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // 创建身份证上传组件的配置生成函数
  const createIdCardUploadProps = (type: 'front' | 'back') => ({
    listType: "picture" as const,
    showUploadList: false,
    beforeUpload: (file: RcFile) => {
      // 检查是否正在处理OCR
      if (isOcrProcessing) {
        setMessageState({ type: 'warning', content: '正在处理身份证识别，请稍候...' });
        return false;
      }

      // 检查文件类型
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        setMessageState({ type: 'error', content: '只能上传图片文件！' });
        return false;
      }
      
      // 检查文件大小（限制为5MB）
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        setMessageState({ type: 'error', content: '图片大小不能超过5MB！' });
        return false;
      }

      // 直接处理文件上传
      const uploadInfo: UploadChangeParam<UploadFile<any>> = {
        file: {
          uid: file.uid || `rc-upload-${Date.now()}`,
          name: file.name,
          status: 'done',
          originFileObj: file,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          lastModifiedDate: file.lastModifiedDate
        },
        fileList: [{
          uid: file.uid || `rc-upload-${Date.now()}`,
          name: file.name,
          status: 'done',
          originFileObj: file,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          lastModifiedDate: file.lastModifiedDate
        }]
      };

      handleIdCardUpload(type, uploadInfo);
      
      return false; // 阻止自动上传
    },
    accept: '.jpg,.jpeg,.png',
    maxCount: 1,
    onChange: (info: UploadChangeParam<UploadFile<any>>) => {
      debugLog('文件上传状态变更:', {
        uploadType: type,
        status: info.file.status,
        name: info.file.name,
        size: info.file.size,
        fileType: info.file.type,
        hasOriginFileObj: !!info.file.originFileObj
      });
    }
  });

  // 预览身份证图片
  const previewIdCard = (file: File | undefined) => {
    if (!file) {
      console.error('预览失败: 文件未定义');
      return;
    }
    debugLog('预览身份证图片:', file.name);
    const objectUrl = URL.createObjectURL(file);
    debugLog('创建的图片URL:', objectUrl);
    setPreviewState({
      visible: true,
      image: objectUrl,
      title: file.name
    });
  };

  // 组件卸载时清理预览URL
  useEffect(() => {
    return () => {
      // 清理所有预览URL
      Object.values(idCardFiles).forEach(files => {
        files.forEach(file => {
          if (file.url && file.url.startsWith('blob:')) {
            URL.revokeObjectURL(file.url);
          }
        });
      });
    };
  }, []);

  // 更新身份证图片预览组件
  const renderIdCardPreview = (type: 'front' | 'back', file: CustomUploadFile | undefined) => {
    // 检查是否有新上传的文件
    if (file) {
      return (
        <div style={{ 
          border: '1px solid #d9d9d9', 
          borderRadius: 8, 
          padding: 8, 
          position: 'relative',
          height: 160
        }}>
          <img 
            src={file.url}
            alt={`身份证${type === 'front' ? '正面' : '背面'}`}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain' 
            }}
            onLoad={() => debugLog(`身份证${type === 'front' ? '正面' : '背面'}图片加载成功`)}
            onError={(e) => {
              console.error(`身份证${type === 'front' ? '正面' : '背面'}图片加载失败`);
              e.currentTarget.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJmv2G12QAAAABJRU5ErkJggg==';
            }}
          />
          <div style={{ 
            position: 'absolute', 
            bottom: 8, 
            left: 8, 
            background: 'rgba(0,0,0,0.6)', 
            color: 'white', 
            padding: '2px 8px', 
            borderRadius: 4,
            fontSize: 12
          }}>
            {(file.size ? (file.size / 1024).toFixed(2) : '0.00')} KB
          </div>
          <div style={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            display: 'flex', 
            gap: 8 
          }}>
            <Button
              size="small"
              shape="circle"
              icon={<EyeOutlined />}
              onClick={() => previewIdCard(file.originFileObj)}
            />
            <Button
              size="small"
              shape="circle"
              danger
              icon={<CloseOutlined />}
              onClick={() => {
                setIdCardFiles(prev => {
                  if (file.url && file.url.startsWith('blob:')) {
                    URL.revokeObjectURL(file.url);
                  }
                  return {
                    ...prev,
                    [type]: []
                  };
                });
              }}
            />
          </div>
        </div>
      );
    }

    // 检查是否有已有的照片URL
    const existingUrl = type === 'front' ? existingIdCardFrontUrl : existingIdCardBackUrl;
    if (existingUrl) {
      return (
        <div style={{ 
          border: '1px solid #d9d9d9', 
          borderRadius: 8, 
          padding: 8, 
          position: 'relative',
          height: 160
        }}>
          <img 
            src={existingUrl}
            alt={`身份证${type === 'front' ? '正面' : '背面'}`}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain' 
            }}
            onLoad={() => debugLog(`已有身份证${type === 'front' ? '正面' : '背面'}图片加载成功`)}
            onError={(e) => {
              console.error(`已有身份证${type === 'front' ? '正面' : '背面'}图片加载失败`);
              e.currentTarget.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJmv2G12QAAAABJRU5ErkJggg==';
            }}
          />
          <div style={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            display: 'flex', 
            gap: 8 
          }}>
            <Button
              size="small"
              shape="circle"
              icon={<EyeOutlined />}
              onClick={() => {
                // 创建一个临时的File对象用于预览
                fetch(existingUrl)
                  .then(res => res.blob())
                  .then(blob => {
                    const file = new File([blob], `idcard-${type}.jpg`, { type: 'image/jpeg' });
                    previewIdCard(file);
                  })
                  .catch(err => {
                    console.error('预览已有照片失败:', err);
                    messageApi.error('预览照片失败');
                  });
              }}
            />
            <Button
              size="small"
              shape="circle"
              danger
              icon={<CloseOutlined />}
              onClick={() => {
                if (type === 'front') {
                  setExistingIdCardFrontUrl('');
                } else {
                  setExistingIdCardBackUrl('');
                }
              }}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  // 修改 handleSubmit 函数，在编辑模式下只上传新文件
  const handleSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      
      console.log('🚀 开始提交表单，模式:', editingResume?._id ? '编辑' : '创建');
      console.log('📊 当前文件状态:', values);
      
      // 处理空字符串的idNumber，将其转换为undefined
      if (values.idNumber === '') {
        values.idNumber = undefined;
      }
      
      if (editingResume?._id) {
        // 编辑模式：只处理基本信息更新和新文件上传
        console.log('📝 编辑模式：更新基本信息');

        // 先更新基本信息（不包含文件，但包含视频URL）
        const basicInfo: Record<string, unknown> = { ...values };

        // 添加自我介绍视频信息
        if (selfIntroductionVideo && selfIntroductionVideo.url) {
          basicInfo.selfIntroductionVideo = selfIntroductionVideo;
          console.log('📹 编辑模式：包含视频信息', selfIntroductionVideo);
        }

        const response = await apiService.patch(`/api/resumes/${editingResume._id}`, basicInfo);
        
        console.log('✅ 基本信息更新响应:', response);
        
        // 然后只上传新文件（isExisting: false 且有 originFileObj）
        const newPhotoFiles = (photoFiles as CustomUploadFile[])
          .filter(file => !file.isExisting && file.originFileObj);
        const newCertificateFiles = (certificateFiles as CustomUploadFile[])
          .filter(file => !file.isExisting && file.originFileObj);
        const newMedicalFiles = (medicalReportFiles as CustomUploadFile[])
          .filter(file => !file.isExisting && file.originFileObj);
        const newIdCardFrontFile = idCardFiles.front[0] && !(idCardFiles.front[0] as CustomUploadFile).isExisting ? 
          (idCardFiles.front[0] as CustomUploadFile).originFileObj : null;
        const newIdCardBackFile = idCardFiles.back[0] && !(idCardFiles.back[0] as CustomUploadFile).isExisting ? 
          (idCardFiles.back[0] as CustomUploadFile).originFileObj : null;
        
        console.log('📂 检测到新文件:', {
          newPhotos: newPhotoFiles.length,
          newCertificates: newCertificateFiles.length,
          newMedicalReports: newMedicalFiles.length,
          newIdCardFront: !!newIdCardFrontFile,
          newIdCardBack: !!newIdCardBackFile
        });
        
        // 上传新文件
        const uploadPromises: Promise<any>[] = [];
        
        // 🚫 身份证文件上传逻辑需要保留，因为身份证在handleIdCardUpload中处理，不是在beforeUpload
        if (newIdCardFrontFile) {
          console.log('📤 上传新身份证正面');
          const formData = new FormData();
          formData.append('file', newIdCardFrontFile);
          formData.append('type', 'idCardFront');
          uploadPromises.push(
            apiService.upload(`/api/resumes/${editingResume._id}/upload`, formData)
              .then(res => console.log('✅ 身份证正面上传完成:', res))
          );
        }
        
        if (newIdCardBackFile) {
          console.log('📤 上传新身份证背面');
          const formData = new FormData();
          formData.append('file', newIdCardBackFile);
          formData.append('type', 'idCardBack');
          uploadPromises.push(
            apiService.upload(`/api/resumes/${editingResume._id}/upload`, formData)
              .then(res => console.log('✅ 身份证背面上传完成:', res))
          );
        }
        
        // 🚫 删除重复上传逻辑 - 个人照片在beforeUpload中已经上传
        console.log('ℹ️ 编辑模式：个人照片文件已在选择时上传，跳过重复上传');
        
        // newPhotoFiles.forEach((file, index) => {
        //   console.log(`📤 上传新个人照片 ${index + 1}`);
        //   const formData = new FormData();
        //   formData.append('file', file.originFileObj!);
        //   formData.append('type', 'personalPhoto');
        //   uploadPromises.push(
        //     apiService.upload(`/api/resumes/${editingResume._id}/upload`, formData)
        //       .then(res => console.log(`✅ 个人照片 ${index + 1} 上传完成:`, res))
        //   );
        // });
        
        // 🚫 删除重复上传逻辑 - 证书和体检报告在beforeUpload中已经上传
        // 编辑模式下，文件在选择时已通过beforeUpload立即上传，无需在此处重复上传
        console.log('ℹ️ 编辑模式：证书和体检报告文件已在选择时上传，跳过重复上传');
        
        // newCertificateFiles.forEach((file, index) => {
        //   console.log(`📤 上传新证书 ${index + 1}`);
        //   const formData = new FormData();
        //   formData.append('file', file.originFileObj!);
        //   formData.append('type', 'certificate');
        //   uploadPromises.push(
        //     apiService.upload(`/api/resumes/${editingResume._id}/upload`, formData)
        //       .then(res => console.log(`✅ 证书 ${index + 1} 上传完成:`, res))
        //   );
        // });
        
        // newMedicalFiles.forEach((file, index) => {
        //   console.log(`📤 上传新体检报告 ${index + 1}`);
        //   const formData = new FormData();
        //   formData.append('file', file.originFileObj!);
        //   formData.append('type', 'medicalReport');
        //   uploadPromises.push(
        //     apiService.upload(`/api/resumes/${editingResume._id}/upload`, formData)
        //       .then(res => console.log(`✅ 体检报告 ${index + 1} 上传完成:`, res))
        //   );
        // });
        
        // 更新个人照片排序
        if (fileUploadState.photo.files.length > 0) {
          console.log('📸 更新个人照片排序');

          // 找到已生成工装照的源文件
          const uniformFile = fileUploadState.photo.files.find(f => f.uniformPhotoUrl);

          // 排除已生成工装照的源照片（用工装照替代）
          const photosToSave = fileUploadState.photo.files
            .filter(file => !file.uniformPhotoUrl) // 排除有工装照的源照片
            .map(file => ({
              url: file.url,
              filename: file.name,
              size: file.size,
              mimetype: file.type || 'image/jpeg'
            }));

          const photoData = { photos: photosToSave };

          try {
            await apiService.patch(`/api/resumes/${editingResume._id}/personal-photos`, photoData);
            console.log('✅ 个人照片排序更新成功');
          } catch (error) {
            console.error('❌ 个人照片排序更新失败:', error);
          }

          // 保存工装照（如果有生成过）
          if (uniformFile?.uniformPhotoUrl) {
            console.log('👔 保存工装照:', uniformFile.uniformPhotoUrl);
            try {
              await apiService.patch(`/api/resumes/${editingResume._id}`, {
                uniformPhoto: {
                  url: uniformFile.uniformPhotoUrl,
                  filename: `uniform-photo.jpg`,
                  mimetype: 'image/jpeg',
                  size: 0,
                },
              });
              console.log('✅ 工装照保存成功');
            } catch (error) {
              console.error('❌ 工装照保存失败:', error);
            }
          }
        }

        // 等待所有新文件上传完成
        if (uploadPromises.length > 0) {
          console.log(`⏳ 等待 ${uploadPromises.length} 个新文件上传完成...`);
          await Promise.all(uploadPromises);
          console.log('🎉 所有新文件上传完成');
        } else {
          console.log('ℹ️ 没有新文件需要上传');
        }
        
        if (response.success) {
          const successMessage = '简历更新成功';
          console.log('✅ 显示成功消息:', successMessage);
          messageApi.success(successMessage);

          // 如果有AI生成的推荐理由（重新做了AI识别），自动创建内部评价记录
          if (aiRecommendation && editingResume._id) {
            try {
              await apiService.post('/api/employee-evaluations', {
                employeeId: editingResume._id,
                employeeName: editingResume.name,
                evaluationType: 'daily',
                overallRating: 5,
                comment: aiRecommendation,
                isPublic: false,
                status: 'published',
              });
              console.log('✅ AI推荐理由已自动添加为内部评价');
            } catch (evalErr) {
              console.warn('⚠️ AI推荐理由评价创建失败（不影响简历保存）:', evalErr);
            }
            setAiRecommendation('');
          }

          // 设置刷新标记，让列表页面知道需要刷新
          localStorage.setItem('shouldRefreshResumeList', 'true');

          // 等待一下让用户看到成功消息，然后跳转
          setTimeout(() => {
            navigate('/aunt/list');
          }, 1500);
        } else {
          throw new Error(response.message || '更新失败');
        }
        
      } else {
        // 创建模式：一次性提交所有信息
        console.log('🆕 创建模式：提交所有信息');
        
        // 获取所有文件对象
        const frontFile = (idCardFiles.front[0] as CustomUploadFile)?.originFileObj;
        const backFile = (idCardFiles.back[0] as CustomUploadFile)?.originFileObj;

        // 分两类：已预上传（有url无originFileObj） 和 待上传（有originFileObj）
        const preUploadedPhotos = (photoFiles as CustomUploadFile[]).filter(f => f.url && !f.originFileObj);
        const photoFileList = (photoFiles as CustomUploadFile[])
          .filter(f => !f.url && f.originFileObj)
          .map(file => file.originFileObj)
          .filter((file): file is RcFile => file !== undefined);

        // 预生成工装照URL（取第一张有uniformPhotoUrl的照片）
        const preGeneratedUniformPhotoUrl = preUploadedPhotos.find(f => f.uniformPhotoUrl)?.uniformPhotoUrl;
        // 排除已生成工装照的源照片（用工装照替代，源照片不再单独保存）
        const preUploadedPhotoUrls = preUploadedPhotos.filter(f => !f.uniformPhotoUrl).map(f => f.url!).filter(Boolean);
        const certificateFileList = (certificateFiles as CustomUploadFile[])
          .map(file => file.originFileObj)
          .filter((file): file is RcFile => file !== undefined);
        const medicalReportFileList = (medicalReportFiles as CustomUploadFile[])
          .map(file => file.originFileObj)
          .filter((file): file is RcFile => file !== undefined);

        // 获取 4 个新照片类型的文件
        console.log('📸 创建模式：收集新照片类型文件');
        console.log('  - fileUploadState.confinementMeal:', fileUploadState.confinementMeal);
        console.log('  - fileUploadState.cooking:', fileUploadState.cooking);
        console.log('  - fileUploadState.complementaryFood:', fileUploadState.complementaryFood);
        console.log('  - fileUploadState.positiveReview:', fileUploadState.positiveReview);

        const confinementMealFileList = fileUploadState.confinementMeal.files
          .map(file => file.originFileObj)
          .filter((file): file is RcFile => file !== undefined);
        const cookingFileList = fileUploadState.cooking.files
          .map(file => file.originFileObj)
          .filter((file): file is RcFile => file !== undefined);
        const complementaryFoodFileList = fileUploadState.complementaryFood.files
          .map(file => file.originFileObj)
          .filter((file): file is RcFile => file !== undefined);
        const positiveReviewFileList = fileUploadState.positiveReview.files
          .map(file => file.originFileObj)
          .filter((file): file is RcFile => file !== undefined);

        console.log('  - confinementMealFileList 数量:', confinementMealFileList.length);
        console.log('  - cookingFileList 数量:', cookingFileList.length);
        console.log('  - complementaryFoodFileList 数量:', complementaryFoodFileList.length);
        console.log('  - positiveReviewFileList 数量:', positiveReviewFileList.length);

        // 处理表单值，确保idNumber为空字符串时被转为undefined
        const formValues = { ...values };
        if (formValues.idNumber === '') {
          formValues.idNumber = undefined;
        }
        
        // 🔄 压缩所有图片文件
        console.log('🗜️ 开始压缩所有文件...');
        const compressedPhotoFiles = await Promise.all(
          photoFileList.map(async (file) => {
            try {
              return await ImageService.compressImage(file, 'photo');
            } catch (error) {
              console.warn('⚠️ 个人照片压缩失败，使用原文件:', error);
              return file;
            }
          })
        );
        
        const compressedCertificateFiles = await Promise.all(
          certificateFileList.map(async (file) => {
            try {
              return await ImageService.compressImage(file, 'certificate');
            } catch (error) {
              console.warn('⚠️ 证书压缩失败，使用原文件:', error);
              return file;
            }
          })
        );
        
        const compressedMedicalFiles = await Promise.all(
          medicalReportFileList.map(async (file) => {
            try {
              return await ImageService.compressImage(file, 'medicalReport');
            } catch (error) {
              console.warn('⚠️ 体检报告压缩失败，使用原文件:', error);
              return file;
            }
          })
        );
        
        // 压缩身份证图片
        let compressedFrontFile: File | undefined = frontFile;
        let compressedBackFile: File | undefined = backFile;
        if (frontFile) {
          try {
            compressedFrontFile = await ImageService.compressImage(frontFile, 'idCard');
          } catch (error) {
            console.warn('⚠️ 身份证正面压缩失败，使用原文件:', error);
          }
        }
        if (backFile) {
          try {
            compressedBackFile = await ImageService.compressImage(backFile, 'idCard');
          } catch (error) {
            console.warn('⚠️ 身份证背面压缩失败，使用原文件:', error);
          }
        }

        // 4 个新照片类型已经在 beforeUpload 中压缩过了，直接使用
        // 注意：这些文件现在是 Blob 对象，需要转换为 File 对象
        console.log('📸 4 个新照片类型（已在 beforeUpload 中压缩）:');
        console.log('  - 月子餐照片:', confinementMealFileList.length, '张');
        console.log('  - 烹饪照片:', cookingFileList.length, '张');
        console.log('  - 辅食添加照片:', complementaryFoodFileList.length, '张');
        console.log('  - 好评展示照片:', positiveReviewFileList.length, '张');

        console.log('✅ 文件压缩完成');
        
        // 构建完整的表单数据
        const formData = new FormData();
        
        // 添加基本信息
        Object.entries(formValues).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (Array.isArray(value) || typeof value === 'object') {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, value.toString());
            }
          }
        });
        
        // 添加所有压缩后的文件
        if (compressedFrontFile) formData.append('idCardFront', compressedFrontFile as File);
        if (compressedBackFile) formData.append('idCardBack', compressedBackFile as File);
        compressedPhotoFiles.forEach(file => formData.append('photoFiles', file as File));
        compressedCertificateFiles.forEach(file => formData.append('certificateFiles', file as File));
        compressedMedicalFiles.forEach(file => formData.append('medicalReportFiles', file as File));

        // 添加 4 个新照片类型（已在 beforeUpload 中压缩）
        confinementMealFileList.forEach(file => formData.append('confinementMealPhotos', file as File));
        cookingFileList.forEach(file => formData.append('cookingPhotos', file as File));
        complementaryFoodFileList.forEach(file => formData.append('complementaryFoodPhotos', file as File));
        positiveReviewFileList.forEach(file => formData.append('positiveReviewPhotos', file as File));

        // 添加自我介绍视频
        if (selfIntroductionVideo && selfIntroductionVideo.url) {
          // 如果视频已经上传到服务器，只需要传URL
          formData.append('selfIntroductionVideoUrl', selfIntroductionVideo.url);
        }

        // 传递预上传的个人照片URL（已由AI换装接口处理，无需重复上传）
        if (preUploadedPhotoUrls.length > 0) {
          formData.append('preUploadedPhotoUrls', JSON.stringify(preUploadedPhotoUrls));
          console.log('📸 传递预上传个人照片URL:', preUploadedPhotoUrls.length, '张');
        }

        // 传递预生成的工装照URL（跳过后端AI二次生成）
        if (preGeneratedUniformPhotoUrl) {
          formData.append('preGeneratedUniformPhotoUrl', preGeneratedUniformPhotoUrl);
          console.log('🥼 传递预生成工装照URL:', preGeneratedUniformPhotoUrl.substring(0, 60) + '...');
        }

        const response = await apiService.upload('/api/resumes', formData, 'POST');
        
        console.log('🆕 创建API响应:', response);
        
        if (response.success) {
          const successMessage = '简历创建成功';
          console.log('✅ 显示成功消息:', successMessage);
          messageApi.success(successMessage);

          // 如果有AI生成的推荐理由，自动创建内部评价记录
          const createdResumeId = response.data?._id || response.data?.id;
          if (aiRecommendation && createdResumeId) {
            try {
              await apiService.post('/api/employee-evaluations', {
                employeeId: createdResumeId,
                employeeName: formValues.name || '',
                evaluationType: 'daily',
                overallRating: 5,
                comment: aiRecommendation,
                isPublic: false,
                status: 'published',
              });
              console.log('✅ AI推荐理由已自动添加为内部评价');
            } catch (evalErr) {
              console.warn('⚠️ AI推荐理由评价创建失败（不影响简历保存）:', evalErr);
            }
            setAiRecommendation('');
          }

          // 设置刷新标记，让列表页面知道需要刷新
          localStorage.setItem('shouldRefreshResumeList', 'true');

          // 等待一下让用户看到成功消息，然后跳转
          setTimeout(() => {
            navigate('/aunt/list');
          }, 1500);
        } else {
          throw new Error(response.message || '创建失败');
        }
      }
      
    } catch (error: unknown) {
      console.error('❌ 提交失败:', error);
      const errorMessage = error instanceof Error ? error.message : '提交失败，请重试';
      messageApi.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // 检查是否为编辑模式并加载现有图片
  useEffect(() => {
    if (editingResume) {
      // 设置身份证照片
      if (editingResume.idCardFrontUrl) {
        setExistingIdCardFrontUrl(editingResume.idCardFrontUrl);
      }

      if (editingResume.idCardBackUrl) {
        setExistingIdCardBackUrl(editingResume.idCardBackUrl);
      }

      // 设置自我介绍视频
      if (editingResume.selfIntroductionVideo) {
        setSelfIntroductionVideo(editingResume.selfIntroductionVideo);
      }
    }
  }, [editingResume]);

  // 组件初始化
  useEffect(() => {
    if (editingResume) {
      // 处理表单数据，确保所有字段都是正确的类型
      const formData = {
        name: editingResume.name,
        age: editingResume.age,
        phone: editingResume.phone,
        gender: editingResume.gender,
        nativePlace: editingResume.nativePlace,
        jobType: editingResume.jobType,
        education: editingResume.education,
        experienceYears: editingResume.experienceYears,
        idNumber: editingResume.idNumber,
        wechat: editingResume.wechat,
        currentAddress: editingResume.currentAddress,
        hukouAddress: editingResume.hukouAddress,
        birthDate: editingResume.birthDate ? dayjs(editingResume.birthDate).format('YYYY-MM-DD') : undefined,
        medicalExamDate: editingResume.medicalExamDate ? dayjs(editingResume.medicalExamDate).format('YYYY-MM-DD') : undefined,
        ethnicity: editingResume.ethnicity,
        selfIntroduction: editingResume.selfIntroduction,
        internalEvaluation: (editingResume as any).internalEvaluation,
        zodiac: editingResume.zodiac,
        zodiacSign: editingResume.zodiacSign,
        expectedSalary: editingResume.expectedSalary,
        maternityNurseLevel: (editingResume as any).maternityNurseLevel, // 月嫂档位
        serviceArea: editingResume.serviceArea,
        orderStatus: editingResume.orderStatus,
        skills: editingResume.skills,
        leadSource: editingResume.leadSource,
        // 添加缺失的字段
        maritalStatus: editingResume.maritalStatus,
        religion: editingResume.religion,
        emergencyContactName: editingResume.emergencyContactName,
        emergencyContactPhone: editingResume.emergencyContactPhone,
        // 培训意向字段
        learningIntention: (editingResume as any).learningIntention,
        currentStage: (editingResume as any).currentStage,
        workExperiences: (editingResume.workExperiences || [])
          .filter((exp: WorkExperienceItem | null): exp is WorkExperienceItem => exp !== null)
          .map((exp: WorkExperienceItem) => ({
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            description: exp.description || '',
            company: exp.company || undefined,
            position: exp.position || undefined,
            orderNumber: exp.orderNumber || undefined,
            district: exp.district || undefined,
            customerName: exp.customerName || undefined,
            customerReview: exp.customerReview || undefined,
            jobType: exp.jobType || undefined,
            photos: exp.photos || []
          }))
      };

      // 设置表单值
      form.setFieldsValue(formData);
    }
  }, [editingResume, form]);

  // 修复日期选择器的值处理
  const handleDateChange = (date: Dayjs | null, field: 'birthDate' | 'medicalExamDate' | string) => {
    if (date && dayjs.isDayjs(date)) {
      // 使用字符串格式存储日期，避免对象引用问题
      const dateString = date.format('YYYY-MM-DD');
      form.setFieldsValue({ [field]: dateString });
    } else {
      form.setFieldsValue({ [field]: undefined });
    }
  };

  // 修复日期选择器的渲染
  type DateField = 'birthDate' | 'medicalExamDate' | string;

  const renderDatePicker = (field: DateField, label: string) => (
    <Form.Item
      label={label}
      name={field}
      rules={field === 'medicalExamDate' || field === 'birthDate' ? [] : [{ required: true, message: `请选择${label}` }]}
      getValueProps={(value: string | undefined) => ({
        value: value ? dayjs(value) : null
      })}
      normalize={(value) => {
        // 确保值始终是字符串或undefined
        if (value && dayjs.isDayjs(value)) {
          return value.format('YYYY-MM-DD');
        }
        return value;
      }}
    >
      <DatePicker
        onChange={(date) => handleDateChange(date, field)}
        format="YYYY-MM-DD"
        style={{ width: '100%' }}
      />
    </Form.Item>
  );

  return (
    <PageContainer
      header={{
        title: pageTitle,
        breadcrumb: {
          items: [
            { path: '/aunt/list', title: '阿姨简历库' },
            ...(editingResume 
              ? [
                  { path: `/aunt/detail/${new URLSearchParams(window.location.search).get('id')}`, title: '简历详情' },
                  { title: '编辑简历' }
                ]
              : [{ title: '创建简历' }]
            ),
          ],
        },
        onBack: () => window.history.back(),
        extra: [
          <Button
            key="ai"
            type="primary"
            onClick={() => setAiModalVisible(true)}
          >
            🤖 AI识别填充
          </Button>,
          <Button
            key="refresh"
            type="default"
            onClick={checkBackendConnection}
            icon={<ReloadOutlined />}
          >
            刷新连接
          </Button>
        ],
      }}
    >
      {contextHolder}
      <Card
        style={{ marginBottom: 24 }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              {editingResume ? '编辑阿姨简历' : '创建阿姨简历'}
            </Title>
          </div>
        }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
          {/* 身份证信息区域 */}
          <Divider orientation="left">
            <Title level={5}>
              <InfoCircleOutlined style={{ marginRight: 8 }} />
              身份证信息
            </Title>
          </Divider>
          
          <Row gutter={24}>
            <Col span={12}>
              <Card 
                size="small" 
                title="身份证正面" 
                style={{ marginBottom: 16 }}
                extra={<Text type="secondary">可选上传</Text>}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Upload
                    {...createIdCardUploadProps('front')}
                  >
                    <Button icon={<UploadOutlined />} style={{ marginBottom: 8 }}>
                      上传身份证正面
                    </Button>
                  </Upload>
                  
                  {renderIdCardPreview('front', idCardFiles.front[0])}
                </div>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card 
                size="small" 
                title="身份证背面" 
                style={{ marginBottom: 16 }}
                extra={<Text type="secondary">可选上传</Text>}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Upload
                    {...createIdCardUploadProps('back')}
                  >
                    <Button icon={<UploadOutlined />} style={{ marginBottom: 8 }}>
                      上传身份证背面
                    </Button>
                  </Upload>
                  
                  {renderIdCardPreview('back', idCardFiles.back[0])}
                </div>
              </Card>
            </Col>
          </Row>
          
          {/* 基本信息区域 */}
          <Form.Item noStyle>
            <Card
              title={<Divider orientation="left">
                基本信息</Divider>}
              style={{ marginBottom: 24 }}
            >
              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Form.Item
                    label="姓名"
                    name="name"
                    rules={[{ required: true, message: '请输入姓名' }]}
                  >
                    <Input placeholder="请输入姓名" autoComplete="name" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="年龄"
                    name="age"
                    rules={[{ required: true, message: '请输入年龄' }]}
                  >
                    <InputNumber min={18} max={80} style={{ width: '100%' }} placeholder="请输入年龄" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="性别"
                    name="gender"
                    rules={[{ required: true, message: '请选择性别' }]}
                  >
                    <Select<GenderType> placeholder="请选择性别" onChange={handleGenderChange}>
                      <Option value={Gender.MALE}>男</Option>
                      <Option value={Gender.FEMALE}>女</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Form.Item
                    label={
                      <span>
                        手机号码
                        <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>（不填则保存为草稿）</span>
                      </span>
                    }
                    name="phone"
                    rules={[
                      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                    ]}
                  >
                    <Input placeholder="请输入手机号码（可选）" autoComplete="tel" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="微信号"
                    name="wechat"
                  >
                    <Input placeholder="请输入微信号" autoComplete="off" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  {renderDatePicker('birthDate', '出生日期')}
                </Col>
              </Row>
              
              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Form.Item
                    label="现居住地址"
                    name="currentAddress"
                  >
                    <Input placeholder="请输入现居住地址" autoComplete="street-address" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="籍贯"
                    name="nativePlace"
                    rules={[{ required: true, message: '请选择籍贯' }]}
                  >
                    <Select placeholder="请选择籍贯">
                      {provinces.map(province => (
                        <Option key={province} value={province}>{province}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="户籍地址"
                    name="hukouAddress"
                  >
                    <Input placeholder="请输入户籍地址" autoComplete="street-address" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Form.Item
                    label="身份证号"
                    name="idNumber"
                    rules={[
                      { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号' }
                    ]}
                  >
                    <Input placeholder="请输入身份证号" autoComplete="off" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="学历"
                    name="education"
                    rules={[{ required: true, message: '请选择学历' }]}
                  >
                    <Select placeholder="请选择学历">
                      {Object.entries(EDUCATION_MAP).map(([value, label]) => (
                        <Option key={value} value={value}>{label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="婚姻状况"
                    name="maritalStatus"
                  >
                    <Select placeholder="请选择婚姻状况">
                      <Option value="single">未婚</Option>
                      <Option value="married">已婚</Option>
                      <Option value="divorced">离异</Option>
                      <Option value="widowed">丧偶</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Form.Item
                    label="民族"
                    name="ethnicity"
                  >
                    <Select placeholder="请选择民族">
                      {ethnicities.map(ethnicity => (
                        <Option key={ethnicity} value={ethnicity}>{ethnicity}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="生肖"
                    name="zodiac"
                  >
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
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="星座"
                    name="zodiacSign"
                  >
                    <Select placeholder="请选择星座">
                      <Option value="capricorn">摩羯座</Option>
                      <Option value="aquarius">水瓶座</Option>
                      <Option value="pisces">双鱼座</Option>
                      <Option value="aries">白羊座</Option>
                      <Option value="taurus">金牛座</Option>
                      <Option value="gemini">双子座</Option>
                      <Option value="cancer">巨蟹座</Option>
                      <Option value="leo">狮子座</Option>
                      <Option value="virgo">处女座</Option>
                      <Option value="libra">天秤座</Option>
                      <Option value="scorpio">天蝎座</Option>
                      <Option value="sagittarius">射手座</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Form.Item
                    label="宗教信仰"
                    name="religion"
                  >
                    <Select placeholder="请选择宗教信仰">
                      <Option value="none">无</Option>
                      <Option value="buddhism">佛教</Option>
                      <Option value="christianity">基督教</Option>
                      <Option value="islam">伊斯兰教</Option>
                      <Option value="catholicism">天主教</Option>
                      <Option value="hinduism">印度教</Option>
                      <Option value="taoism">道教</Option>
                      <Option value="protestantism">新教</Option>
                      <Option value="orthodoxy">东正教</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Form.Item>

          {/* 紧急联系信息 */}
          <Form.Item noStyle>
            <Card
              title={<Divider orientation="left">
                紧急联系信息</Divider>}
              style={{ marginBottom: 24 }}
            >
              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Form.Item
                    label="紧急联系人姓名"
                    name="emergencyContactName"
                  >
                    <Input placeholder="请输入紧急联系人姓名" autoComplete="name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="紧急联系人电话"
                    name="emergencyContactPhone"
                  >
                    <Input placeholder="请输入紧急联系人电话" autoComplete="tel" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Form.Item>

          {/* 工作信息区域 */}
          <Form.Item noStyle>
            <Card
              title={<Divider orientation="left">
                工作信息</Divider>}
              style={{ marginBottom: 24 }}
            >
              {/* 添加BaiduMapCard组件，并连接到表单 */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600 }}>服务区域</span>
                </div>
                <Form.Item
                  name="serviceArea"
                  noStyle
                >
                  <BaiduMapCard />
                </Form.Item>
              </div>
              
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item
                    label="工种"
                    name="jobType"
                    rules={[{ required: true, message: '请选择工种' }]}
                  >
                    <Select placeholder="请选择工种">
                      {Object.entries(JOB_TYPE_MAP).map(([value, label]) => (
                        <Option key={value} value={value}>{label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="工作经验年限"
                    name="experienceYears"
                    rules={[{ required: true, message: '请输入工作经验年限' }]}
                  >
                    <InputNumber min={0} max={50} placeholder="请输入工作经验年限" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="月嫂档位"
                    name="maternityNurseLevel"
                  >
                    <Select placeholder="请选择月嫂档位（选填）" allowClear>
                      <Option value="junior">初级月嫂</Option>
                      <Option value="silver">银牌月嫂</Option>
                      <Option value="gold">金牌月嫂</Option>
                      <Option value="platinum">铂金月嫂</Option>
                      <Option value="diamond">钻石月嫂</Option>
                      <Option value="crown">皇冠月嫂</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item
                    label="期望薪资"
                    name="expectedSalary"
                    rules={[
                      { required: true, message: '请输入期望薪资' },
                      { type: 'number', min: 0, message: '期望薪资不能为负数' }
                    ]}
                  >
                    <InputNumber
                      min={0}
                      placeholder="请输入期望薪资"
                      style={{ width: '100%' }}
                      precision={0}
                      parser={value => value ? Number(String(value).replace(/[^\d]/g, '')) : 0}
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item
                    label="接单状态"
                    name="orderStatus"
                  >
                    <Select placeholder="请选择接单状态">
                      <Option value="accepting">想接单</Option>
                      <Option value="not-accepting">不接单</Option>
                      <Option value="signed">已签约</Option>
                      <Option value="on-service">已上户</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="线索来源"
                    name="leadSource"
                  >
                    <Select placeholder="请选择线索来源">
                      <Option value="referral">转介绍</Option>
                      <Option value="paid-lead">付费线索</Option>
                      <Option value="community">社群线索</Option>
                      <Option value="door-to-door">地推</Option>
                      <Option value="shared-order">合单</Option>
                      <Option value="sales">销售录入</Option>
                      <Option value="other">其他</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  {/* 保留一个空列以保持布局平衡 */}
                </Col>
              </Row>
              
              <Row gutter={24}>
                <Col span={24}>
                  <Form.Item
                    label="技能证书"
                    name="skills"
                  >
                    <Select
                      mode="multiple"
                      placeholder="请选择技能证书"
                      style={{ width: '100%' }}
                    >
                      <Option value="muying">母婴护理师</Option>
                      <Option value="cuiru">高级催乳师</Option>
                      <Option value="yuezican">月子餐营养师</Option>
                      <Option value="chanhou">产后修复师</Option>
                      <Option value="teshu-yinger">特殊婴儿护理</Option>
                      <Option value="yiliaobackground">医疗背景</Option>
                      <Option value="yuying">高级育婴师</Option>
                      <Option value="zaojiao">早教师</Option>
                      <Option value="fushi">辅食营养师</Option>
                      <Option value="ertui">小儿推拿师</Option>
                      <Option value="waiyu">外语</Option>
                      <Option value="zhongcan">中餐</Option>
                      <Option value="xican">西餐</Option>
                      <Option value="mianshi">面食</Option>
                      <Option value="jiashi">驾驶</Option>
                      <Option value="shouyi">整理收纳</Option>
                      <Option value="yingyang">营养师</Option>
                      <Option value="liliao-kangfu">理疗康复</Option>
                      <Option value="shuangtai-huli">双胎护理</Option>
                      <Option value="yanglao-huli">养老护理</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* 🔥 添加自我介绍字段 */}
              <Row gutter={24}>
                <Col span={24}>
                  <Form.Item
                    label="自我介绍"
                    name="selfIntroduction"
                    extra="请简单介绍一下自己的工作经验、技能特长、性格特点等（选填，最多1000字）"
                  >
                    <Input.TextArea
                      placeholder="请简单介绍一下自己的工作经验、技能特长、性格特点等..."
                      rows={4}
                      maxLength={1000}
                      showCount
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* 内部员工评价 - 只读展示 */}
              <Row gutter={24}>
                <Col span={24}>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16
                    }}>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'rgba(0, 0, 0, 0.85)'
                      }}>
                        内部员工评价
                      </span>
                      <Space>
                        <span style={{ color: '#999', fontSize: 12 }}>仅内部可见</span>
                        {editingResume && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => setIsAddEvaluationVisible(true)}
                          >
                            添加评价
                          </Button>
                        )}
                      </Space>
                    </div>

                    {employeeEvaluations && employeeEvaluations.length > 0 ? (
                      <List
                        dataSource={employeeEvaluations}
                        renderItem={(evaluation: EmployeeEvaluation, index: number) => (
                          <List.Item key={evaluation.id || index}>
                            <Card
                              style={{ width: '100%' }}
                              styles={{ body: { padding: '16px' } }}
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

                                {/* 评价时间 */}
                                <div style={{ textAlign: 'right' }}>
                                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                    {dayjs(evaluation.evaluationDate).format('YYYY-MM-DD HH:mm')}
                                  </Typography.Text>
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
                          {editingResume ? '暂无内部评价' : '保存简历后可添加评价'}
                        </Typography.Text>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </Card>
          </Form.Item>

          {/* 培训意向区域 */}
          <Form.Item noStyle>
            <Card
              title={<Divider orientation="left">
                培训意向</Divider>}
              style={{ marginBottom: 24 }}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label="学习意向"
                    name="learningIntention"
                  >
                    <Select placeholder="请选择学习意向" allowClear>
                      <Option value="yuesao">月嫂</Option>
                      <Option value="yuersao">育儿嫂</Option>
                      <Option value="baomu">保姆</Option>
                      <Option value="hulao">护老</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="当前阶段"
                    name="currentStage"
                  >
                    <Select placeholder="请选择当前阶段" allowClear>
                      <Option value="experienced-certified">有经验有证书</Option>
                      <Option value="experienced-no-cert">有经验无证书</Option>
                      <Option value="certified-no-exp">有证书无经验</Option>
                      <Option value="beginner">小白</Option>
                      <Option value="not-looking">不找工作</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Form.Item>

          {/* 工作经验区域 */}
          <Form.Item noStyle>
            <Card
              title={<Divider orientation="left">
                工作经验</Divider>}
              style={{ marginBottom: 24 }}
            >
              <Row gutter={24}>
                <Col span={24}>
                  <Form.List name="workExperiences">
                    {(fields, { add }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Card 
                            key={key} 
                            style={{ marginBottom: 16 }}
                            extra={
                              <Button
                                type="text"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => {
                                  const experiences = form.getFieldValue('workExperiences');
                                  if (experiences && experiences.length > 1) {
                                    form.setFieldsValue({
                                      workExperiences: experiences.filter((_: any, index: number) => index !== name)
                                    });
                                  } else {
                                    messageApi.warning('至少需要保留一条工作经历');
                                  }
                                }}
                              />
                            }
                          >
                            <Row gutter={24}>
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'startDate']}
                                  label="开始日期"
                                  rules={[{ required: true, message: '请选择开始日期' }]}
                                  getValueProps={(value: string | undefined) => ({
                                    value: value ? dayjs(value) : undefined
                                  })}
                                  normalize={(value) => {
                                    if (value && dayjs.isDayjs(value)) {
                                      return value.format('YYYY-MM');
                                    }
                                    return value;
                                  }}
                                >
                                  <DatePicker 
                                    style={{ width: '100%' }} 
                                    placeholder="开始日期" 
                                    picker="month"
                                    format="YYYY-MM"
                                    onChange={(date) => {
                                      if (date && dayjs.isDayjs(date)) {
                                        form.setFieldsValue({
                                          workExperiences: {
                                            ...form.getFieldValue('workExperiences'),
                                            [name]: {
                                              ...form.getFieldValue(['workExperiences', name]),
                                              startDate: date.format('YYYY-MM')
                                            }
                                          }
                                        });
                                      }
                                    }}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'endDate']}
                                  label="结束日期"
                                  rules={[{ required: true, message: '请选择结束日期' }]}
                                  getValueProps={(value: string | undefined) => ({
                                    value: value ? dayjs(value) : undefined
                                  })}
                                  normalize={(value) => {
                                    if (value && dayjs.isDayjs(value)) {
                                      return value.format('YYYY-MM');
                                    }
                                    return value;
                                  }}
                                >
                                  <DatePicker 
                                    style={{ width: '100%' }} 
                                    placeholder="结束日期" 
                                    picker="month"
                                    format="YYYY-MM"
                                    onChange={(date) => {
                                      if (date && dayjs.isDayjs(date)) {
                                        form.setFieldsValue({
                                          workExperiences: {
                                            ...form.getFieldValue('workExperiences'),
                                            [name]: {
                                              ...form.getFieldValue(['workExperiences', name]),
                                              endDate: date.format('YYYY-MM')
                                            }
                                          }
                                        });
                                      }
                                    }}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                            <Row gutter={24}>
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'jobType']}
                                  label="工种"
                                >
                                  <Select placeholder="请选择工种" allowClear>
                                    {Object.entries(JOB_TYPE_MAP).map(([value, label]) => (
                                      <Option key={value} value={value}>{label}</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </Col>
                            </Row>
                            <Row gutter={24}>
                              <Col span={24}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'description']}
                                  label="工作描述"
                                  rules={[{ required: true, message: '请输入工作描述' }]}
                                >
                                  <Input.TextArea
                                    rows={4}
                                    placeholder="请描述工作内容和职责"
                                    style={{ resize: 'none' }}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>

                            {/* 详细信息（选填） */}
                            <Divider orientation="left" style={{ fontSize: '14px', margin: '16px 0', color: 'red', fontWeight: 'bold' }}>
                              详细信息（选填）- 测试版本
                            </Divider>

                            <Row gutter={24}>
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'orderNumber']}
                                  label="订单号"
                                  tooltip="自动生成，可修改"
                                >
                                  <Input
                                    placeholder="CON12345678901"
                                    suffix={
                                      <Button
                                        type="link"
                                        size="small"
                                        loading={contractPicker.loading && contractPicker.targetIndex === name}
                                        onClick={() => handleOrderNumberGenerate(name)}
                                      >
                                        生成
                                      </Button>
                                    }
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'district']}
                                  label="服务区域"
                                >
                                  <Select placeholder="请选择北京市区域">
                                    {BEIJING_DISTRICTS.map(district => (
                                      <Option key={district.value} value={district.value}>
                                        {district.label}
                                      </Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </Col>
                            </Row>

                            <Row gutter={24}>
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'customerName']}
                                  label="客户姓名"
                                >
                                  <Input
                                    placeholder="请输入客户姓名"
                                    suffix={
                                      <Button
                                        type="link"
                                        size="small"
                                        onClick={() => {
                                          const experiences = form.getFieldValue('workExperiences');
                                          experiences[name] = { ...experiences[name], customerName: generateCustomerName() };
                                          form.setFieldsValue({ workExperiences: experiences });
                                        }}
                                      >
                                        随机生成
                                      </Button>
                                    }
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'customerReview']}
                                  label={
                                    <Space size={4}>
                                      <span>客户评价</span>
                                      <Button
                                        type="link"
                                        size="small"
                                        style={{ padding: 0, height: 'auto', fontSize: 12 }}
                                        onClick={() => {
                                          const experiences = form.getFieldValue('workExperiences');
                                          const jobType = experiences[name]?.jobType || form.getFieldValue('jobType');
                                          experiences[name] = { ...experiences[name], customerReview: generateCustomerReview(jobType) };
                                          form.setFieldsValue({ workExperiences: experiences });
                                        }}
                                      >
                                        随机生成
                                      </Button>
                                    </Space>
                                  }
                                >
                                  <Input.TextArea
                                    rows={2}
                                    placeholder="请输入客户评价"
                                    style={{ resize: 'none' }}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>

                            {/* 工作照片上传 */}
                            <Row gutter={24}>
                              <Col span={24}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'photos']}
                                  label="工作照片"
                                  tooltip="可上传多张工作现场照片"
                                >
                                  <SortableImageUpload
                                    fileList={(() => {
                                      const photos = form.getFieldValue(['workExperiences', name, 'photos']) || [];
                                      return photos.map((photo: any, index: number) => ({
                                        uid: photo.uid || `work-photo-${name}-${index}`,
                                        name: photo.filename || `工作照片${index + 1}`,
                                        status: 'done' as const,
                                        url: photo.url,
                                        size: photo.size || 0,
                                        isExisting: true
                                      }));
                                    })()}
                                    onChange={(newFileList) => {
                                      const photos = newFileList.map(file => ({
                                        url: file.url || '',
                                        filename: file.name,
                                        size: file.size || 0,
                                        mimetype: file.type || 'image/jpeg'
                                      }));
                                      const experiences = form.getFieldValue('workExperiences');
                                      experiences[name] = {
                                        ...experiences[name],
                                        photos
                                      };
                                      form.setFieldsValue({ workExperiences: experiences });
                                    }}
                                    onPreview={handlePreview}
                                    maxCount={9}
                                    beforeUpload={async (file) => {
                                      // 压缩图片
                                      let processedFile: File = file;
                                      try {
                                        console.log(`🗜️ 开始压缩工作照片: ${file.name}`);
                                        processedFile = await ImageService.compressImage(file, 'photo');
                                        console.log(`✅ 压缩完成: ${processedFile.name}`);
                                      } catch (error) {
                                        console.warn('⚠️ 压缩失败，使用原文件:', error);
                                        processedFile = file;
                                      }

                                      const formData = new FormData();
                                      formData.append('file', processedFile);
                                      formData.append('type', 'workExperiencePhoto');
                                      const tempPreviewUrl = URL.createObjectURL(processedFile);

                                      if (editingResume?._id) {
                                        try {
                                          const response = await apiService.upload(`/api/resumes/${editingResume._id}/upload`, formData);
                                          if (response.success) {
                                            const newPhoto = {
                                              url: response.data?.fileUrl,
                                              filename: file.name,
                                              size: processedFile.size,
                                              mimetype: file.type
                                            };
                                            const experiences = form.getFieldValue('workExperiences');
                                            const currentPhotos = experiences[name]?.photos || [];
                                            experiences[name] = {
                                              ...experiences[name],
                                              photos: [...currentPhotos, newPhoto]
                                            };
                                            form.setFieldsValue({ workExperiences: experiences });
                                            messageApi.success(`${file.name} 上传成功`);
                                          } else {
                                            messageApi.error(response.message || '上传失败');
                                          }
                                        } catch (err) {
                                          console.error('上传文件时出错', err);
                                          messageApi.error('上传文件时出错');
                                        }
                                      } else {
                                        const newPhoto = {
                                          url: tempPreviewUrl,
                                          filename: file.name,
                                          size: processedFile.size,
                                          mimetype: file.type
                                        };
                                        const experiences = form.getFieldValue('workExperiences');
                                        const currentPhotos = experiences[name]?.photos || [];
                                        experiences[name] = {
                                          ...experiences[name],
                                          photos: [...currentPhotos, newPhoto]
                                        };
                                        form.setFieldsValue({ workExperiences: experiences });
                                      }
                                      return false;
                                    }}
                                    disabled={false}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                        ))}
                        <Form.Item>
                          <Button 
                            type="dashed" 
                            onClick={() => {
                              debugLog('添加新工作经历');
                              add({
                                startDate: undefined,
                                endDate: undefined,
                                description: ''
                              });
                            }} 
                            block 
                            icon={<PlusOutlined />}
                          >
                            添加工作经历
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Col>
              </Row>
            </Card>
          </Form.Item>

          {/* 其他资料上传区域 */}
          <Form.Item noStyle>
            <Card
              title={<Divider orientation="left">
                其他资料上传</Divider>}
              style={{ marginBottom: 24 }}
            >
              <Row gutter={24}>
                <Col span={6}>
                  <Card
                    size="small"
                    title="个人照片"
                    style={{ marginBottom: 16 }}
                  >
                    <SortableImageUpload
                      fileList={fileUploadState.photo.files}
                      onChange={(newFileList) => {
                        const typedFileList = newFileList as CustomUploadFile[];
                        setFileUploadState(prev => ({
                          ...prev,
                          photo: { ...prev.photo, files: typedFileList }
                        }));
                        setPhotoFiles(typedFileList);
                      }}
                      onPreview={handlePreview}
                      onRemove={handleRemoveFile('photo')}
                      onRegenerate={handleRegeneratePhoto}
                      maxCount={FILE_UPLOAD_CONFIG.maxPhotoCount}
                      beforeUpload={async (file: RcFile) => {
                        // 校验
                        if (!validateFile(file, 'photo')) return false;
                        // 压缩
                        let processedFile: File = file;
                        try {
                          processedFile = await ImageService.compressImage(file, 'photo');
                        } catch {
                          processedFile = file;
                        }
                        const tempPreviewUrl = URL.createObjectURL(processedFile);
                        if (editingResume?._id) {
                          // 编辑模式：上传到简历
                          const formData = new FormData();
                          formData.append('file', processedFile);
                          formData.append('type', 'personalPhoto');
                          try {
                            const response = await apiService.upload(`/api/resumes/${editingResume._id}/upload`, formData);
                            if (response.success) {
                              const newFile: CustomUploadFile = {
                                uid: file.uid,
                                name: file.name,
                                url: response.data?.fileUrl,
                                thumbUrl: tempPreviewUrl,
                                status: 'done',
                                originFileObj: file,
                                size: processedFile.size,
                                isExisting: false,
                              };
                              setFileUploadState(prev => ({
                                ...prev,
                                photo: { ...prev.photo, files: [...prev.photo.files, newFile] },
                              }));
                              setPhotoFiles(prev => [...prev, newFile]);
                              messageApi.success(`${file.name} 上传成功`);
                            } else {
                              messageApi.error(response.message || '上传失败');
                            }
                          } catch (err) {
                            console.error('上传文件时出错', err);
                            messageApi.error('上传文件时出错');
                          }
                        } else {
                          // 创建模式：只上传到COS，不触发AI（点击"生成工装"按钮才触发）
                          const uploadFormData = new FormData();
                          uploadFormData.append('file', processedFile);
                          try {
                            const response = await apiService.upload('/api/ai/upload-photo', uploadFormData, 'POST');
                            const photoUrl = response.success ? response.data?.photoUrl : undefined;
                            const newFile: CustomUploadFile = {
                              uid: file.uid,
                              name: file.name,
                              status: 'done',
                              url: photoUrl,
                              thumbUrl: tempPreviewUrl,
                              size: processedFile.size,
                              isExisting: false,
                            };
                            setFileUploadState(prev => ({
                              ...prev,
                              photo: { ...prev.photo, files: [...prev.photo.files, newFile] },
                            }));
                            setPhotoFiles(prev => [...prev, newFile]);
                          } catch (err) {
                            console.error('上传照片失败:', err);
                            // 即使上传失败也保留本地预览
                            const newFile: CustomUploadFile = {
                              uid: file.uid,
                              name: file.name,
                              status: 'done',
                              thumbUrl: tempPreviewUrl,
                              originFileObj: processedFile as unknown as RcFile,
                              size: processedFile.size,
                              isExisting: false,
                            };
                            setFileUploadState(prev => ({
                              ...prev,
                              photo: { ...prev.photo, files: [...prev.photo.files, newFile] },
                            }));
                            setPhotoFiles(prev => [...prev, newFile]);
                          }
                        }
                        return false;
                      }}
                      disabled={false}
                    />
                  </Card>
                </Col>

                <Col span={6}>
                  <Card
                    size="small"
                    title="技能证书"
                    style={{ marginBottom: 16 }}
                  >
                    {renderUploadList('certificate')}
                  </Card>
                </Col>

                <Col span={6}>
                  <Card
                    size="small"
                    title="体检报告"
                    style={{ marginBottom: 16 }}
                  >
                    {renderDatePicker('medicalExamDate', '体检时间')}
                    {renderUploadList('medical')}
                  </Card>
                </Col>

                <Col span={6}>
                  <Card
                    size="small"
                    title="自我介绍视频"
                    style={{ marginBottom: 16 }}
                    extra={<span style={{ fontSize: '12px', color: '#999' }}>支持最大50MB，自动转码</span>}
                  >
                    <VideoUpload
                      value={selfIntroductionVideo}
                      onChange={setSelfIntroductionVideo}
                      onUpload={async (file: File) => {
                        // 使用新的视频上传API（自动转码为H.264格式）
                        const result = await ImageService.uploadVideo(file, 'selfIntroductionVideo');

                        // 更新视频信息（使用转码后的文件信息，包含mimetype）
                        setSelfIntroductionVideo({
                          url: result.fileUrl,
                          filename: result.filename,
                          size: result.size,
                          mimetype: result.mimeType || 'video/mp4'
                        });

                        return result.fileUrl;
                      }}
                      disabled={false}
                    />
                  </Card>
                </Col>
              </Row>
            </Card>
          </Form.Item>

          {/* 作品展示区域 */}
          <Form.Item noStyle>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Divider orientation="left" style={{ margin: 0 }}>作品展示</Divider>
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<span>🤖</span>}
                    onClick={() => setAiPhotoClassifyVisible(true)}
                    style={{ marginLeft: 16 }}
                  >
                    AI批量分类图片
                  </Button>
                </div>
              }
              style={{ marginBottom: 24 }}
            >
              <Row gutter={24}>
                <Col span={6}>
                  <Card
                    size="small"
                    title="月子餐照片"
                    extra={<span style={{ fontSize: '12px', color: '#999' }}>最多30张</span>}
                    style={{ marginBottom: 16 }}
                  >
                    {renderUploadList('confinementMeal', {
                      onMoveToCategory: handleMoveToCategory('confinementMeal'),
                      availableCategories: [
                        { value: 'cooking', label: '烹饪照片' },
                        { value: 'complementaryFood', label: '辅食照片' },
                        { value: 'positiveReview', label: '好评截图' },
                        { value: 'photo', label: '个人照片' },
                      ],
                    })}
                  </Card>
                </Col>

                <Col span={6}>
                  <Card
                    size="small"
                    title="烹饪照片"
                    extra={<span style={{ fontSize: '12px', color: '#999' }}>最多30张</span>}
                    style={{ marginBottom: 16 }}
                  >
                    {renderUploadList('cooking', {
                      onMoveToCategory: handleMoveToCategory('cooking'),
                      availableCategories: [
                        { value: 'confinementMeal', label: '月子餐照片' },
                        { value: 'complementaryFood', label: '辅食照片' },
                        { value: 'positiveReview', label: '好评截图' },
                        { value: 'photo', label: '个人照片' },
                      ],
                    })}
                  </Card>
                </Col>

                <Col span={6}>
                  <Card
                    size="small"
                    title="辅食添加照片"
                    extra={<span style={{ fontSize: '12px', color: '#999' }}>最多30张</span>}
                    style={{ marginBottom: 16 }}
                  >
                    {renderUploadList('complementaryFood', {
                      onMoveToCategory: handleMoveToCategory('complementaryFood'),
                      availableCategories: [
                        { value: 'confinementMeal', label: '月子餐照片' },
                        { value: 'cooking', label: '烹饪照片' },
                        { value: 'positiveReview', label: '好评截图' },
                        { value: 'photo', label: '个人照片' },
                      ],
                    })}
                  </Card>
                </Col>

                <Col span={6}>
                  <Card
                    size="small"
                    title="好评展示照片"
                    extra={<span style={{ fontSize: '12px', color: '#999' }}>最多30张</span>}
                    style={{ marginBottom: 16 }}
                  >
                    {renderUploadList('positiveReview', {
                      onMoveToCategory: handleMoveToCategory('positiveReview'),
                      availableCategories: [
                        { value: 'confinementMeal', label: '月子餐照片' },
                        { value: 'cooking', label: '烹饪照片' },
                        { value: 'complementaryFood', label: '辅食照片' },
                        { value: 'photo', label: '个人照片' },
                      ],
                    })}
                  </Card>
                </Col>
              </Row>
            </Card>
          </Form.Item>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading || submitting}
              style={{ marginRight: '16px' }}
            >
              {editingResume ? '保存更新' : '创建简历'}
            </Button>
            <Button onClick={() => {
              // 如果是编辑模式，清除localStorage中的数据
              if (editingResume) {
                localStorage.removeItem('editingResume');
              }
              navigate('/aunt/list');
            }}>
              取消
            </Button>
          </div>
          </Form>
        </Card>
      
      <Modal
        open={previewState.visible}
        title={previewState.title ? `预览图片 - ${previewState.title}` : '预览图片'}
        footer={null}
        width={800}
        onCancel={() => setPreviewState(prev => ({ ...prev, visible: false }))}
      >
        <img alt="预览图片" style={{ width: '100%' }} src={previewState.image} />
      </Modal>

      {/* AI识别填充弹窗 */}
      <Modal
        title="🤖 AI识别简历"
        open={aiModalVisible}
        onCancel={() => { setAiModalVisible(false); setAiText(''); setAiImage(null); setAiImagePreview(null); setAiPastedImages([]); }}
        width={680}
        footer={[
          <Button key="cancel" onClick={() => { setAiModalVisible(false); setAiText(''); setAiImage(null); setAiImagePreview(null); setAiPastedImages([]); }}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={aiLoading}
            onClick={handleAIParse}
            disabled={!aiImage && (!aiText || aiText.trim().length < 10)}
          >
            {aiImage ? '识别图片并填充' : '识别并填充'}
          </Button>,
        ]}
      >
        {/* 整个内容区域监听粘贴事件，确保图片粘贴能被捕获 */}
        <div
          tabIndex={-1}
          onPaste={(e) => { e.nativeEvent.stopImmediatePropagation(); handleAiModalPaste(e); }}
          style={{ outline: 'none' }}
        >
          <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
            将简历文字粘贴到下方，或直接 <b>Ctrl+V 粘贴截图</b>，AI将自动识别并填充到表单中。
            <br /><span style={{ fontSize: 12, color: '#999' }}>💡 支持多次粘贴：先粘贴文字，再逐个粘贴图片，图片会自动累加显示。</span>
          </div>
          {aiImagePreview && (
            <div style={{ marginBottom: 12, textAlign: 'center', position: 'relative' }}>
              <img
                src={aiImagePreview}
                alt="粘贴的截图"
                style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid #d9d9d9' }}
              />
              <Button
                size="small"
                danger
                style={{ position: 'absolute', top: 4, right: 4 }}
                onClick={() => { setAiImage(null); setAiImagePreview(null); }}
              >
                移除图片
              </Button>
              <div style={{ marginTop: 4, color: '#52c41a', fontSize: 12 }}>
                ✅ 已粘贴截图，点击"识别图片并填充"开始识别
              </div>
            </div>
          )}
          {aiText.includes('[图片]') && !aiImagePreview && (
            <div style={{ marginBottom: 8, padding: '8px 12px', background: aiPastedImages.length > 0 ? '#f6ffed' : '#fff7e6', border: `1px solid ${aiPastedImages.length > 0 ? '#b7eb8f' : '#ffe58f'}`, borderRadius: 6, fontSize: 12 }}>
              {aiPastedImages.length === 0 ? (
                <>
                  <div style={{ color: '#faad14', marginBottom: 4 }}>
                    ⚠️ 检测到文本中包含[图片]等占位符（来自微信等平台复制），识别时会自动忽略这些标记。
                  </div>
                  <div style={{ color: '#666' }}>
                    💡 如需识别图片：回到微信收藏，<b>逐个复制图片</b>后在此处 <b>Ctrl+V</b> 粘贴，图片会累加显示在下方。也可以<b>截图</b>后粘贴。
                  </div>
                </>
              ) : (
                <div style={{ color: '#52c41a' }}>
                  ✅ 已检测到文本中的[图片]占位符，已粘贴 {aiPastedImages.length} 张图片。可继续粘贴更多图片，或点击下方图片选择一张进行AI识别。
                </div>
              )}
            </div>
          )}
          {aiPastedImages.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#666' }}>📷 已粘贴的图片（{aiPastedImages.length}张）：</span>
                <Button size="small" danger onClick={() => setAiPastedImages([])}>清除全部</Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {aiPastedImages.map((imgUrl, idx) => (
                  <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={imgUrl}
                      alt={`粘贴图片${idx + 1}`}
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid #d9d9d9',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        // 点击图片设为AI识别图片
                        const mimeMatch = imgUrl.match(/^data:(image\/[^;]+);base64,/);
                        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                        const base64 = imgUrl.replace(/^data:image\/[^;]+;base64,/, '');
                        setAiImage(base64);
                        setAiImageMimeType(mime);
                        setAiImagePreview(imgUrl);
                      }}
                      title="点击选择此图片进行AI识别"
                    />
                    {/* 删除按钮 */}
                    <span
                      onClick={() => setAiPastedImages(prev => prev.filter((_, i) => i !== idx))}
                      style={{
                        position: 'absolute', top: -4, right: -4,
                        background: '#ff4d4f', color: '#fff', borderRadius: '50%',
                        width: 16, height: 16, fontSize: 10, lineHeight: '16px',
                        textAlign: 'center', cursor: 'pointer',
                      }}
                    >✕</span>
                    {/* 移动到分类按钮 */}
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'idCardFront', label: '移到身份证正面（自动OCR识别）' },
                          { key: 'idCardBack', label: '移到身份证背面' },
                          { type: 'divider' as const },
                          { key: 'photo', label: '移到个人照片' },
                          { key: 'certificate', label: '移到技能证书' },
                          { key: 'medical', label: '移到体检报告' },
                          { key: 'confinementMeal', label: '移到月子餐照片' },
                          { key: 'cooking', label: '移到烹饪照片' },
                          { key: 'complementaryFood', label: '移到辅食照片' },
                          { key: 'positiveReview', label: '移到好评截图' },
                        ],
                        onClick: ({ key }) => handleAssignImageToCategory(imgUrl, idx, key as AssignCategory),
                      }}
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <span
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute', bottom: 2, right: 2,
                          background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 4,
                          width: 20, height: 20, fontSize: 12, lineHeight: '20px',
                          textAlign: 'center', cursor: 'pointer',
                        }}
                        title="移动到照片分类"
                      >
                        <FolderOpenOutlined />
                      </span>
                    </Dropdown>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                💡 点击图片可选择进行AI识别，点击右下角 <FolderOpenOutlined /> 可直接移到对应照片分类
              </div>
            </div>
          )}
          <Input.TextArea
            rows={(aiImagePreview || aiPastedImages.length > 0) ? 6 : 14}
            placeholder={'粘贴简历文本，或直接 Ctrl+V 粘贴截图\n\n例如：\n姓名：张三\n年龄：35\n籍贯：湖南\n手机：13800138000\n工种：月嫂\n...'}
            value={aiText}
            onChange={e => setAiText(
              e.target.value
                .replace(/\[图片\]/g, '')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
            )}
            maxLength={5000}
            showCount
          />
        </div>
      </Modal>

      {/* AI图片批量分类弹窗 */}
      <AIPhotoClassifyModal
        open={aiPhotoClassifyVisible}
        onCancel={() => setAiPhotoClassifyVisible(false)}
        jobType={form.getFieldValue('jobType')}
        onConfirm={handleAIPhotoClassifyConfirm}
      />

      {/* 合同关联选择器 */}
      <Modal
        title="选择关联合同"
        open={contractPicker.open}
        onCancel={() => setContractPicker(prev => ({ ...prev, open: false }))}
        footer={[
          <Button key="cancel" onClick={() => setContractPicker(prev => ({ ...prev, open: false }))}>取消</Button>,
          <Button
            key="new"
            onClick={() => handleSelectContract(generateOrderNumber())}
          >
            不关联，生成新订单号
          </Button>,
        ]}
        width={560}
      >
        <div style={{ marginBottom: 12, color: '#666' }}>
          找到 {contractPicker.contracts.length} 条合同记录，点击选择关联：
        </div>
        <List
          size="small"
          bordered
          dataSource={contractPicker.contracts}
          renderItem={(contract) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => handleSelectContract(contract.contractNumber)}
              actions={[<Button type="link" size="small">选择</Button>]}
            >
              <Space direction="vertical" size={2}>
                <span><b>{contract.contractNumber}</b></span>
                <span style={{ fontSize: 12, color: '#999' }}>
                  {contract.customerName} · {contract.startDate?.slice(0, 10)} ~ {contract.endDate?.slice(0, 10)}
                </span>
              </Space>
            </List.Item>
          )}
        />
      </Modal>

      {/* 添加员工评价弹窗 */}
      <Modal
        title="添加员工评价"
        open={isAddEvaluationVisible}
        onCancel={() => setIsAddEvaluationVisible(false)}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => setIsAddEvaluationVisible(false)}>
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
    </PageContainer>
  );
};

export default function CreateResumeWithApp() {
  return (
    <App>
      <CreateResume />
    </App>
  );
}
