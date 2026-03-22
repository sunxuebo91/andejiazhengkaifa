import { PageContainer } from '@ant-design/pro-components';
import { Card, Button, Form, Input, Select, Upload, Divider, Row, Col, Typography, Modal, DatePicker, InputNumber, App, message, Rate, List, Space, Tag } from 'antd';
import { useState, useEffect } from 'react';
import { PlusOutlined, CloseOutlined, EyeOutlined, UploadOutlined, InfoCircleOutlined, ReloadOutlined, StarFilled } from '@ant-design/icons';
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
import VideoUpload from '../../components/VideoUpload';
import { generateOrderNumber } from '../../utils/orderNumberGenerator';
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

// Define a base type for file properties
type BaseFileProps = {
  uid: string;
  name: string;
  url?: string;
  thumbUrl?: string;
  originFileObj?: RcFile;
  size?: number;
  type?: string;
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
  // 文件相关字段 - 旧格式
  idCardFront?: { url: string };
  idCardBack?: { url: string };
  photoUrls?: string[];
  certificateUrls?: string[];
  medicalReportUrls?: string[];
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  // 文件相关字段 - 新格式
  personalPhoto?: { url: string; filename?: string; size?: number; mimetype?: string };
  certificates?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
  reports?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
  confinementMealPhotos?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
  cookingPhotos?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
  complementaryFoodPhotos?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
  positiveReviewPhotos?: Array<{ url: string; filename?: string; size?: number; mimetype?: string }>;
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

  // 修改预览处理函数
  const handlePreview = (file: UploadFile) => {
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = URL.createObjectURL(file.originFileObj);
    }
    
    const fileUrl = file.url || (file.preview as string) || '';
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
  const renderUploadList = (type: keyof FileUploadState) => {
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

    return (
      <Upload
        listType="picture-card"
        fileList={currentFiles}
        onPreview={handlePreview}
        onRemove={handleRemoveFile(type)}
        beforeUpload={async (file) => {
          // 移除"先保存基本信息"的限制

          // 🔄 添加图片压缩处理
          let processedFile: File = file;
          try {
            // 压缩类型映射
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

          // 修复文件类型参数映射
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
          // 本地临时缩略图，确保上传完成前也能显示
          const tempPreviewUrl = URL.createObjectURL(processedFile);

          // 如果是编辑模式且有简历ID，直接上传
          if (editingResume?._id) {
            try {
              const response = await apiService.upload(`/api/resumes/${editingResume._id}/upload`, formData);
              if (response.success) {
                const newFile: CustomUploadFile = {
                  uid: file.uid,
                  name: file.name,
                  url: response.data?.fileUrl, // 统一使用fileUrl字段
                  thumbUrl: tempPreviewUrl,
                  status: "done" as const,
                  originFileObj: file, // 保持原始 RcFile 类型
                  size: processedFile.size, // 使用压缩后的大小
                  isExisting: false
                };

                // 同时更新两套状态
                setFileUploadState(prev => ({
                  ...prev,
                  [type]: {
                    ...prev[type],
                    files: [...prev[type].files, newFile]
                  }
                }));

                // 同时更新单独的状态变量（兼容旧逻辑）
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
            // 如果是新建模式，将文件添加到待上传列表
            // 注意：保存压缩后的文件作为 originFileObj，避免在提交时再次压缩
            const newFile: CustomUploadFile = {
              uid: file.uid,
              name: file.name,
              status: "done" as const,
              thumbUrl: tempPreviewUrl,
              originFileObj: processedFile as unknown as RcFile, // 使用压缩后的文件
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

            // 同时更新两套状态
            setFileUploadState(prev => ({
              ...prev,
              [type]: {
                ...prev[type],
                files: [...prev[type].files, newFile]
              }
            }));

            // 同时更新单独的状态变量（兼容旧逻辑）
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
          return false; // 阻止 antd Upload 自动上传
        }}
        onChange={handleFileChange(type)}
        accept={type === 'medical' ? '.jpg,.jpeg,.png,.pdf' : '.jpg,.jpeg,.png'}
        multiple
      >
        {isMaxReached ? null : uploadButton}
      </Upload>
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
        console.log('  - 新格式个人照片:', extendedResume.personalPhoto);
        console.log('  - 旧格式个人照片:', extendedResume.photoUrls);

        // 处理新格式的个人照片
        if (extendedResume.personalPhoto?.url) {
          console.log('  ✅ 添加新格式个人照片:', extendedResume.personalPhoto.url);
          allPhotoFiles.push({
            uid: `existing-photo-new-0`,
            name: extendedResume.personalPhoto.filename || '个人照片',
            status: 'done' as const,
            url: extendedResume.personalPhoto.url,
            isExisting: true,
            size: extendedResume.personalPhoto.size || 0
          });
          addedPhotoUrls.add(extendedResume.personalPhoto.url);
        }

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
          const photoData = {
            photos: fileUploadState.photo.files.map(file => ({
              url: file.url,
              filename: file.name,
              size: file.size,
              mimetype: file.type || 'image/jpeg'
            }))
          };

          try {
            await apiService.patch(`/api/resumes/${editingResume._id}/personal-photos`, photoData);
            console.log('✅ 个人照片排序更新成功');
          } catch (error) {
            console.error('❌ 个人照片排序更新失败:', error);
            // 不阻断流程，只记录错误
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
        const photoFileList = (photoFiles as CustomUploadFile[])
          .map(file => file.originFileObj)
          .filter((file): file is RcFile => file !== undefined);
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
        
        const response = await apiService.upload('/api/resumes', formData, 'POST');
        
        console.log('🆕 创建API响应:', response);
        
        if (response.success) {
          const successMessage = '简历创建成功';
          console.log('✅ 显示成功消息:', successMessage);
          messageApi.success(successMessage);
          
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
      rules={field === 'medicalExamDate' ? [] : [{ required: true, message: `请选择${label}` }]}
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
                    label="手机号码"
                    name="phone"
                    rules={[
                      { required: true, message: '请输入手机号码' },
                      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                    ]}
                  >
                    <Input placeholder="请输入手机号码" autoComplete="tel" />
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
                                        onClick={() => {
                                          const orderNumber = generateOrderNumber();
                                          const experiences = form.getFieldValue('workExperiences');
                                          experiences[name] = {
                                            ...experiences[name],
                                            orderNumber
                                          };
                                          form.setFieldsValue({ workExperiences: experiences });
                                        }}
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
                                  <Input placeholder="请输入客户姓名" />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'customerReview']}
                                  label="客户评价"
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
                        const formData = new FormData();
                        formData.append('file', processedFile);
                        formData.append('type', 'personalPhoto');
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
                          const newFile: CustomUploadFile = {
                            uid: file.uid,
                            name: file.name,
                            status: 'done',
                            thumbUrl: tempPreviewUrl,
                            originFileObj: file,
                            size: processedFile.size,
                            isExisting: false,
                          };
                          setFileUploadState(prev => ({
                            ...prev,
                            photo: { ...prev.photo, files: [...prev.photo.files, newFile] },
                          }));
                          setPhotoFiles(prev => [...prev, newFile]);
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
              title={<Divider orientation="left">作品展示</Divider>}
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
                    {renderUploadList('confinementMeal')}
                  </Card>
                </Col>

                <Col span={6}>
                  <Card
                    size="small"
                    title="烹饪照片"
                    extra={<span style={{ fontSize: '12px', color: '#999' }}>最多30张</span>}
                    style={{ marginBottom: 16 }}
                  >
                    {renderUploadList('cooking')}
                  </Card>
                </Col>

                <Col span={6}>
                  <Card
                    size="small"
                    title="辅食添加照片"
                    extra={<span style={{ fontSize: '12px', color: '#999' }}>最多30张</span>}
                    style={{ marginBottom: 16 }}
                  >
                    {renderUploadList('complementaryFood')}
                  </Card>
                </Col>

                <Col span={6}>
                  <Card
                    size="small"
                    title="好评展示照片"
                    extra={<span style={{ fontSize: '12px', color: '#999' }}>最多30张</span>}
                    style={{ marginBottom: 16 }}
                  >
                    {renderUploadList('positiveReview')}
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