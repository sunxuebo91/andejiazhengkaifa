import { PageContainer } from '@ant-design/pro-components';
import { Card, Button, Form, Input, Select, Upload, Divider, Row, Col, Typography, Modal, DatePicker, InputNumber, message, Space } from 'antd';
import { useState, useEffect } from 'react';
import { PlusOutlined, CloseOutlined, EyeOutlined, UploadOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
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
import { ImageService } from '../../services/imageService';
import { Gender, GenderType, JobType, Education, FormValues, WorkExperience } from '../../types/resume';
import type { Resume } from '../../services/resume.service';
import type { ApiResponse } from '@/services/api';
import { isLoggedIn } from '@/services/auth';

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

// 修改工种映射常量
const JOB_TYPE_MAP = {
  'zhujia-yuer': '住家育儿',
  'baiban-yuer': '白班育儿',
  'baojie': '保洁',
  'baiban-baomu': '白班保姆',
  'zhujia-baomu': '住家保姆',
  'yangchong': '养宠',
  'xiaoshi': '小时工',
  'yuexin': '月薪'
} as const;

// 添加学历映射常量
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
interface ExtendedResume extends Omit<Resume, 'gender' | 'jobType' | 'workExperience' | 'education'> {
  gender: GenderType;
  jobType: JobType;
  education: Education;
  medicalExamDate?: string;
  birthDate?: string;
  workExperiences?: WorkExperience[];
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
  const workExperiences: WorkExperience[] = (resume.workExperience || [])
    .filter((exp: WorkExperience | null): exp is WorkExperience => exp !== null)
    .map((exp: WorkExperience) => ({
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      description: exp.description || '',
      company: exp.company || undefined,
      position: exp.position || undefined
    }));

  return {
    ...resume,
    jobType,
    education,
    gender,
    workExperiences
  };
};

// 修改类型声明
type FileWithOriginFileObj = UploadFile & {
  originFileObj?: RcFile;
};

// 添加常量定义
const MAX_PHOTO_COUNT = 10;
const MAX_CERTIFICATE_COUNT = 10;
const MAX_MEDICAL_REPORT_COUNT = 10;
const MAX_MEDICAL_PDF_COUNT = 5;

const CreateResume = () => {
  const navigate = useNavigate();
  const [messageApi] = message.useMessage();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingResume, setEditingResume] = useState<ExtendedResume | null>(null);
  const [idCardFiles, setIdCardFiles] = useState<{
    front: CustomUploadFile[];
    back: CustomUploadFile[];
  }>({ front: [], back: [] });
  const [photoFiles, setPhotoFiles] = useState<CustomUploadFile[]>([]);
  const [certificateFiles, setCertificateFiles] = useState<CustomUploadFile[]>([]);
  const [medicalReportFiles, setMedicalReportFiles] = useState<CustomUploadFile[]>([]);
  const [previewState, setPreviewState] = useState<{
    visible: boolean;
    image: string;
    title: string;
  }>({
    visible: false,
    image: '',
    title: ''
  });
  const [existingIdCardFrontUrl, setExistingIdCardFrontUrl] = useState<string>('');
  const [existingIdCardBackUrl, setExistingIdCardBackUrl] = useState<string>('');
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [existingCertificateUrls, setExistingCertificateUrls] = useState<string[]>([]);
  const [existingMedicalReportUrls, setExistingMedicalReportUrls] = useState<string[]>([]);
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [medicalPdfCount, setMedicalPdfCount] = useState<number>(0);

  // 加载简历数据
  const loadResumeData = async (resumeId: string) => {
    try {
      setLoading(true);
      const response = await apiService.get<ApiResponse<Resume>>(`/resumes/${resumeId}`);
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
          birthDate: extendedResume.birthDate || undefined,
          medicalExamDate: extendedResume.medicalExamDate || undefined,
          ethnicity: extendedResume.ethnicity,
          zodiac: extendedResume.zodiac,
          zodiacSign: extendedResume.zodiacSign,
          expectedSalary: extendedResume.expectedSalary,
          serviceArea: extendedResume.serviceArea,
          orderStatus: extendedResume.orderStatus,
          skills: extendedResume.skills,
          leadSource: extendedResume.leadSource,
          workExperiences: extendedResume.workExperiences?.map(exp => ({
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            description: exp.description || '',
            company: exp.company || undefined,
            position: exp.position || undefined
          })) || []
        };
        
        // 设置表单值
        form.setFieldsValue(formData);
      } else {
        messageApi.error(response.message || '加载简历失败');
      }
    } catch (error) {
      console.error('加载简历失败:', error);
      messageApi.error('加载简历失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时检查认证状态
  useEffect(() => {
    if (!isLoggedIn()) {
      messageApi.error('请先登录');
      navigate('/login');
      return;
    }

    // 检查是否是编辑模式
    const params = new URLSearchParams(window.location.search);
    const isEditMode = params.get('edit') === 'true';
    const resumeId = params.get('id');

    if (isEditMode && resumeId) {
      // 编辑模式：加载简历数据
      loadResumeData(resumeId);
    } else {
      // 创建模式：检查本地存储中是否有未完成的编辑
      const savedData = localStorage.getItem('editingResume');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData) as ExtendedResume;
          form.setFieldsValue({
            ...parsedData,
            // Keep dates as strings in the form data
            birthDate: parsedData.birthDate,
            medicalExamDate: parsedData.medicalExamDate,
            // Ensure jobType is properly typed
            jobType: parsedData.jobType as JobType,
            workExperiences: parsedData.workExperiences || []
          });
          setEditingResume(parsedData);
          messageApi.info('已恢复未完成的编辑');
        } catch (error) {
          console.error('恢复编辑数据失败:', error);
          localStorage.removeItem('editingResume');
        }
      }
    }
  }, [form, navigate, messageApi]);

  // 性别选择处理函数，确保 form 可用
  const handleGenderChange = (value: GenderType) => {
    if (value === Gender.MALE || value === Gender.FEMALE) {
      form.setFieldsValue({ gender: value });
    }
  };

  // 定义检查后端连接的函数
  const checkBackendConnection = async () => {
    try {
      await apiService.get('/health');
      messageApi.success('后端连接正常');
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      messageApi.error('后端服务暂时无法连接，请检查后端服务是否启动');
      console.error(`连接后端失败: ${apiError.response?.status || apiError.message || '未知错误'}`);
    }
  };

  useEffect(() => {
    debugLog('CreateResume component mounted');

    // 添加延迟，确保后端有足够时间启动
    const timer = setTimeout(() => {
      checkBackendConnection();
    }, 3000); // 延迟3秒执行

    return () => clearTimeout(timer);
  }, []);

  // 页面标题
  const pageTitle = editingResume ? '编辑简历' : '创建简历';

  // 身份证上传组件的自定义渲染
  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  );

  // 身份证文件上传变更处理
  const handleIdCardUpload = async (type: 'front' | 'back', info: UploadChangeParam<UploadFile<any>>) => {
    debugLog('开始处理身份证上传:', { type, info });
    
    // 检查是否正在处理OCR
    if (isOcrProcessing) {
      debugLog('OCR处理正在进行中，忽略新的上传请求');
      return;
    }

    // 检查文件对象是否存在
    if (!info.file) {
      console.error(`${type === 'front' ? '身份证正面' : '身份证背面'}上传失败: 未获取到文件信息`);
      messageApi.error('文件上传失败，请重试');
      return;
    }

    // 检查文件对象
    const file = info.file.originFileObj;
    if (!file) {
      console.error(`${type === 'front' ? '身份证正面' : '身份证背面'}文件上传失败:`, {
        status: info.file.status,
        name: info.file.name,
        size: info.file.size,
        type: info.file.type,
        uid: info.file.uid
      });
      messageApi.error('文件上传失败，请重试');
      return;
    }

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      console.error('不支持的文件类型:', file.type);
      messageApi.error('请上传图片文件（JPG、JPEG、PNG）');
      return;
    }

    try {
      setIsOcrProcessing(true);
      debugLog('开始OCR识别:', { 
        type, 
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // 使用 ImageService 进行 OCR 识别
      const ocrResult = await ImageService.ocrIdCard(file, type);
      debugLog('OCR识别结果:', ocrResult);

      // 提取并填充表单数据
      const formValues = ImageService.extractIdCardInfo(ocrResult);
      debugLog('提取的表单数据:', formValues);

      if (Object.keys(formValues).length > 0) {
        form.setFieldsValue(formValues);
        messageApi.success('身份证信息识别成功');
      } else {
        debugLog('未能从OCR结果中提取到有效信息');
        messageApi.warning('未能识别到身份证信息，请手动填写');
      }

      // 更新文件状态
      const newFile = {
        uid: file.uid || `-1`,
        name: file.name,
        status: 'done' as const,
        url: URL.createObjectURL(file),
        originFileObj: file,
        isExisting: false
      };

      if (type === 'front') {
        setIdCardFiles(prev => ({
          ...prev,
          front: [newFile]
        }));
      } else {
        setIdCardFiles(prev => ({
          ...prev,
          back: [newFile]
        }));
      }

    } catch (error) {
      console.error('OCR识别失败:', error);
      if (error instanceof Error) {
        messageApi.error(`身份证识别失败: ${error.message}`);
      } else {
        messageApi.error('身份证识别失败，请手动填写信息');
      }
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
        messageApi.warning('正在处理身份证识别，请稍候...');
        return false;
      }

      // 检查文件类型
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        messageApi.error('只能上传图片文件！');
        return false;
      }
      
      // 检查文件大小（限制为5MB）
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        messageApi.error('图片大小不能超过5MB！');
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

  // 修改 handleSubmit 函数
  const handleSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      console.log('表单验证通过，准备提交:', values);

      // 准备文件上传数据
      const formData = new FormData();
      const fileTypes: string[] = [];
      
      // 添加基本信息
      Object.entries(values).forEach(([key, value]) => {
        // 跳过文件字段，它们将单独处理
        if (
          key !== 'idCardFront' && 
          key !== 'idCardBack' && 
          key !== 'photoFiles' && 
          key !== 'certificateFiles' && 
          key !== 'medicalReportFiles'
        ) {
          // 处理数组和对象
          if (value !== null && value !== undefined) {
            if (Array.isArray(value) || typeof value === 'object') {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, value.toString());
            }
          }
        }
      });

      // 添加文件
      const frontFile = idCardFiles.front[0] as FileWithOriginFileObj;
      const backFile = idCardFiles.back[0] as FileWithOriginFileObj;

      if (frontFile?.originFileObj) {
        formData.append('files', frontFile.originFileObj);
        fileTypes.push('idCardFront');
      }
      
      if (backFile?.originFileObj) {
        formData.append('files', backFile.originFileObj);
        fileTypes.push('idCardBack');
      }
      
      // 添加个人照片
      (photoFiles as FileWithOriginFileObj[]).forEach(file => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
          fileTypes.push('personalPhoto');
        }
      });
      
      // 添加证书照片
      (certificateFiles as FileWithOriginFileObj[]).forEach(file => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
          fileTypes.push('certificate');
        }
      });
      
      // 添加体检报告
      (medicalReportFiles as FileWithOriginFileObj[]).forEach(file => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
          fileTypes.push('medicalReport');
        }
      });

      // 添加文件类型数组
      formData.append('fileTypes', JSON.stringify(fileTypes));

      // 发送请求
      const endpoint = editingResume ? `/resumes/${editingResume.id}` : '/resumes';
      const method = editingResume ? 'put' : 'post';
      
      console.log('发送请求到:', endpoint, '方法:', method, '文件类型:', fileTypes);
      const response = await apiService[method](endpoint, formData);
      
      if (response.success) {
        messageApi.success('简历创建成功');
        // 修改导航路径
        navigate('/aunt/list');
      } else {
        throw new Error(response.message || '提交失败');
      }
    } catch (error) {
      console.error('提交简历失败:', error);
      if (error instanceof Error) {
        messageApi.error(`提交失败: ${error.message}`);
      } else {
        messageApi.error('提交失败，请重试');
      }
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
      
      // 设置个人照片
      if (editingResume.photoUrls && editingResume.photoUrls.length > 0) {
        setExistingPhotoUrls(editingResume.photoUrls);
      }
      
      // 设置技能证书
      if (editingResume.certificateUrls && editingResume.certificateUrls.length > 0) {
        setExistingCertificateUrls(editingResume.certificateUrls);
      }
      
      // 设置体检报告
      if (editingResume.medicalReportUrls && editingResume.medicalReportUrls.length > 0) {
        setExistingMedicalReportUrls(editingResume.medicalReportUrls);
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
        birthDate: editingResume.birthDate || undefined,
        medicalExamDate: editingResume.medicalExamDate || undefined,
        ethnicity: editingResume.ethnicity,
        zodiac: editingResume.zodiac,
        zodiacSign: editingResume.zodiacSign,
        expectedSalary: editingResume.expectedSalary,
        serviceArea: editingResume.serviceArea,
        orderStatus: editingResume.orderStatus,
        skills: editingResume.skills,
        leadSource: editingResume.leadSource,
        workExperiences: (editingResume.workExperiences || [])
          .filter((exp: WorkExperienceItem | null): exp is WorkExperienceItem => exp !== null)
          .map((exp: WorkExperienceItem) => ({
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            description: exp.description || '',
            company: exp.company || undefined,
            position: exp.position || undefined
          }))
      };

      // 设置表单值
      form.setFieldsValue(formData);
    }
  }, [editingResume, form]);

  // Update the file handling functions
  const handleFileChange = (type: 'photo' | 'certificate' | 'medical') => (info: UploadChangeParam<UploadFile<any>>) => {
    // 只处理新上传的文件，保持已存在的文件不变
    const newFiles = info.fileList.filter(file => !(file as any).isExisting).map(file => {
      const baseProps: BaseFileProps = {
        uid: file.uid || `${Date.now()}`,
        name: file.name || '未命名文件',
        url: file.url,
        thumbUrl: file.thumbUrl,
        originFileObj: file.originFileObj,
        size: file.size,
        type: file.type
      };

      return {
        ...baseProps,
        status: (file.status || 'done') as UploadFileStatus,
        isExisting: false
      } as NewFile;
    });

    // 对于体检报告，需要特别处理PDF文件
    if (type === 'medical') {
      const pdfFiles = newFiles.filter(file => file.type === 'application/pdf');
      setMedicalPdfCount(pdfFiles.length);
    }

    switch (type) {
      case 'photo':
        setPhotoFiles(newFiles);
        break;
      case 'certificate':
        setCertificateFiles(newFiles);
        break;
      case 'medical':
        setMedicalReportFiles(newFiles);
        break;
    }
  };

  // Update the handleFileRemove function
  const handleFileRemove = (type: 'photo' | 'certificate' | 'medical') => (file: UploadFile<any>) => {
    const isExisting = (file as any).isExisting === true;
    
    if (isExisting) {
      switch (type) {
        case 'photo':
          setExistingPhotoUrls(prev => {
            const newUrls = prev.filter(url => url !== file.url);
            console.log('删除照片后的URL列表:', newUrls);
            return newUrls;
          });
          break;
        case 'certificate':
          setExistingCertificateUrls(prev => {
            const newUrls = prev.filter(url => url !== file.url);
            console.log('删除证书后的URL列表:', newUrls);
            return newUrls;
          });
          break;
        case 'medical':
          setExistingMedicalReportUrls(prev => {
            const newUrls = prev.filter(url => url !== file.url);
            console.log('删除报告后的URL列表:', newUrls);
            return newUrls;
          });
          break;
      }
      return true;
    }
    
    // 处理新上传的文件删除
    switch (type) {
      case 'photo':
        setPhotoFiles(prev => prev.filter(item => item.uid !== file.uid));
        break;
      case 'certificate':
        setCertificateFiles(prev => prev.filter(item => item.uid !== file.uid));
        break;
      case 'medical':
        setMedicalReportFiles(prev => prev.filter(item => item.uid !== file.uid));
        break;
    }
    return true;
  };

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
                  <Form.Item
                    label="出生日期"
                    name="birthDate"
                    rules={[{ required: true, message: '请选择出生日期' }]}
                    getValueProps={(value: string | undefined) => ({
                      value: value ? dayjs(value) : undefined
                    })}
                    getValueFromEvent={(date: Dayjs | null) => date ? date.format('YYYY-MM-DD') : undefined}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
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
                    label="技能标签"
                    name="skills"
                  >
                    <Select 
                      mode="multiple" 
                      placeholder="请选择技能标签"
                      style={{ width: '100%' }}
                    >
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
                                  getValueFromEvent={(date: Dayjs | null) => date ? date.format('YYYY-MM') : undefined}
                                >
                                  <DatePicker 
                                    style={{ width: '100%' }} 
                                    placeholder="开始日期" 
                                    picker="month"
                                    format="YYYY-MM"
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
                                  getValueFromEvent={(date: Dayjs | null) => date ? date.format('YYYY-MM') : undefined}
                                >
                                  <DatePicker 
                                    style={{ width: '100%' }} 
                                    placeholder="结束日期" 
                                    picker="month"
                                    format="YYYY-MM"
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
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input.TextArea 
                                    rows={4} 
                                    placeholder="请描述工作内容和职责"
                                    style={{ resize: 'none' }}
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
                <Col span={8}>
                  <Card 
                    size="small" 
                    title="个人照片" 
                    style={{ marginBottom: 16 }}
                  >
                    <Upload
                      listType="picture-card"
                      fileList={[
                        ...photoFiles,
                        ...existingPhotoUrls.map((url, index) => ({
                          uid: `existing-photo-${url}-${index}`,
                          name: `已有图片 ${index + 1}`,
                          status: 'done' as const,
                          url: url,
                          isExisting: true,
                          type: 'image/jpeg'
                        }))
                      ]}
                      onRemove={handleFileRemove('photo')}
                      beforeUpload={() => false}
                      onChange={handleFileChange('photo')}
                      accept=".jpg,.jpeg,.png"
                      multiple
                    >
                      {photoFiles.length + existingPhotoUrls.length >= MAX_PHOTO_COUNT ? null : uploadButton}
                    </Upload>
                  </Card>
                </Col>
                
                <Col span={8}>
                  <Card 
                    size="small" 
                    title="技能证书" 
                    style={{ marginBottom: 16 }}
                  >
                    <Upload
                      listType="picture-card"
                      fileList={[
                        ...certificateFiles,
                        ...existingCertificateUrls.map((url, index) => {
                          const isPdf = url.toLowerCase().endsWith('.pdf');
                          return {
                            uid: `existing-certificate-${index}`,
                            name: url.split('/').pop() || `证书${index + 1}`,
                            status: 'done' as const,
                            url: isPdf ? undefined : url,
                            thumbUrl: isPdf
                              ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAALrSURBVGiB7ZZNSFRBFMd/980M5lCjUoiNJtqkmR8ItUhcGNRCKKhFuogkXIgfCzcqLdq0KoQIAqEPaCG0CTOJcrJAUHDjB0hqYlKgLHJmnDed865vmWN2Z+a+Nx23//Lg3XPPf/f/P+e+d+97FhGYqVGzJRRvACJiA9oAB9AIrI8TLwhMAT5gFLgpIr5oAW0xwm1Ap4i0W8PVbkTkGpAGnBOR0+GxEQFEJBO4ChwVERuiYiJyDfgC9IVLEhoQkZ3AY0BKCPcpd133eywdJ8tybDQSETuGYXSKyIFwPzug1Qp3bNmyZU93d/eEbduxNChLA9d1La35+PETent7jwH7ReQ9VA8hEWkGbgMYhjHS19d3qa+vT0TEmqvJwrIs0eqqVCqq9p6fn19YWVm5FthvA9qAeoALFy70GIYxUtugKok6LfN5AMlAEwBVVVVtdc23cpmmmQLYReQ7wL179/64c+fOdN2TrVS6rvtTq/cDvgCg67pn7dq12yoqKpKL3ZqjdPpwHGdWqz8C8ATwaMr+/v6enJwcc65brKuru+H1epdLpVKB53n3FqrVs4EQKf90PNc9DMwCPykghPx2YFZTdgGngJSt/hR4vsA6KTIgGHQBnwBfnRqIFbwBxBtAvAHEG0C8AcQbQLwBxBtAvAH89wBExG4YRsxvZtOUctrp+/6g4ziD0+OmU36NypIsJY/66RudtLQ0MU3zY0dHx+7FgCkpKaG0tHQWQGZmpgBXqqqquoF7ixmAptm9MJDrurZpmj+AjMbGxsC2bdvWNDc3r9Lpj0qz3t7eD+Xl5ed0XRdgCjisxNdQP5biOI6taVoB0FVUVFTudDpzNE2LailKsizleR4i8sPzvJH5QAM4juPOzMxcAd4qiqI0NDSU7t27NzkaiFDzer3+paWlwcnJyfHFTJ+xVIZh2IHUhoYGbWJiYjwQCCxo+lQqFcvLy30LCgpK9+3bt3MxEMOUoihB0zTdVatW+eLUf9n6C/G3z8hTZStxAAAAAElFTkSuQmCC'
                                : url,
                              type: isPdf ? 'application/pdf' : 'image/jpeg',
                              isExisting: true
                            };
                          })
                        ]}
                      onRemove={handleFileRemove('certificate')}
                      beforeUpload={() => false}
                      onChange={handleFileChange('certificate')}
                      accept=".jpg,.jpeg,.png"
                      multiple
                    >
                      {certificateFiles.length + existingCertificateUrls.length >= MAX_CERTIFICATE_COUNT ? null : uploadButton}
                    </Upload>
                  </Card>
                </Col>
                
                <Col span={8}>
                  <Card 
                    size="small" 
                    title="体检报告" 
                    style={{ marginBottom: 16 }}
                  >
                    <Form.Item
                      label="体检时间"
                      name="medicalExamDate"
                      getValueProps={(value: string | undefined) => ({
                        value: value ? dayjs(value) : undefined
                      })}
                      getValueFromEvent={(date: Dayjs | null) => date ? date.format('YYYY-MM-DD') : undefined}
                    >
                      <DatePicker 
                        placeholder="请选择体检日期" 
                        style={{ width: '100%' }} 
                        format="YYYY-MM-DD"
                      />
                    </Form.Item>
                    <Upload
                      listType="picture-card"
                      fileList={[
                        ...medicalReportFiles,
                        ...existingMedicalReportUrls.map((url, index) => {
                          const isPdf = url.toLowerCase().endsWith('.pdf');
                          return {
                            uid: `existing-medical-${url}-${index}`,
                            name: `已有报告 ${index + 1}`,
                            status: 'done' as const,
                            url: isPdf ? undefined : url,
                            thumbUrl: isPdf
                              ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAALrSURBVGiB7ZZNSFRBFMd/980M5lCjUoiNJtqkmR8ItUhcGNRCKKhFuogkXIgfCzcqLdq0KoQIAqEPaCG0CTOJcrJAUHDjB0hqYlKgLHJmnDed865vmWN2Z+a+Nx23//Lg3XPPf/f/P+e+d+97FhGYqVGzJRRvACJiA9oAB9AIrI8TLwhMAT5gFLgpIr5oAW0xwm1Ap4i0W8PVbkTkGpAGnBOR0+GxEQFEJBO4ChwVERuiYiJyDfgC9IVLEhoQkZ3AY0BKCPcpd133eywdJ8tybDQSETuGYXSKyIFwPzug1Qp3bNmyZU93d/eEbduxNChLA9d1La35+PETent7jwH7ReQ9VA8hEWkGbgMYhjHS19d3qa+vT0REmqvJwrIs0eqqVCqq9p6fn19YWVm5FthvA9qAeoALFy70GIYxUtugKok6LfN5AMlAEwBVVVVtdc23cpmmmQLYReQ7wL179/64c+fOdN2TrVS6rvtTq/cDvgCg67pn7dq12yoqKpKL3ZqjdPpwHGdWqz8C8ATwaMr+/v6enJwcc65brKuru+H1epdLpVKB53n3FqrVs4EQKf90PNc9DMwCPykghPx2YFZTdgGngJSt/hR4vsA6KTIgGHQBnwBfnRqIFbwBxBtAvAHEG0C8AcQbQLwBxBtAvAH89wBExG4YRsxvZtOUctrp+/6g4ziD0+OmU36NypIsJY/66RudtLQ0MU3zY0dHx+7FgCkpKaG0tHQWQGZmpgBXqqqquoF7ixmAptm9MJDrurZpmj+AjMbGxsC2bdvWNDc3r9Lpj0qz3t7eD+Xl5ed0XRdgCjisxNdQP5biOI6taVoB0FVUVFTudDpzNE2LailKsizleR4i8sPzvJH5QAM4juPOzMxcAd4qiqI0NDSU7t27NzkaiFDzer3+paWlwcnJyfHFTJ+xVIZh2IHUhoYGbWJiYjwQCCxo+lQqFcvLy30LCgpK9+3bt3MxEMOUoihB0zTdVatW+eLUf9n6C/G3z8hTZStxAAAAAElFTkSuQmCC'
                                : url,
                              type: isPdf ? 'application/pdf' : 'image/jpeg',
                              isExisting: true
                            };
                          })
                        ]}
                      onRemove={handleFileRemove('medical')}
                      beforeUpload={(file) => {
                        // 检查是否是PDF文件
                        const isPdf = file.type === 'application/pdf';
                        if (isPdf && medicalPdfCount >= MAX_MEDICAL_PDF_COUNT) {
                          messageApi.error('PDF文件数量已达到上限（5个）');
                          return false;
                        }
                        return false;
                      }}
                      onChange={handleFileChange('medical')}
                      accept=".jpg,.jpeg,.png,.pdf"
                      multiple
                    >
                      {medicalReportFiles.length + existingMedicalReportUrls.length >= MAX_MEDICAL_REPORT_COUNT || 
                       (medicalPdfCount >= MAX_MEDICAL_PDF_COUNT && medicalReportFiles.some(f => f.type === 'application/pdf')) ? null : uploadButton}
                    </Upload>
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
              navigate(-1);
            }}>
              取消
            </Button>
          </div>
          </Form>
        </Card>
      
      <Modal
        open={previewState.visible}
        title={previewState.title}
        footer={null}
        onCancel={() => setPreviewState(prev => ({ ...prev, visible: false }))}
      >
        <img alt="预览图片" style={{ width: '100%' }} src={previewState.image} />
      </Modal>
    </PageContainer>
  );
};

export default CreateResume;