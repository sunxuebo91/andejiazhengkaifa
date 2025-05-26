import { PageContainer } from '@ant-design/pro-components';
import { Card, Button, Form, Input, Select, Upload, Divider, Row, Col, Typography, Modal, DatePicker, InputNumber, App } from 'antd';
import { useState, useEffect } from 'react';
import { PlusOutlined, CloseOutlined, EyeOutlined, UploadOutlined, InfoCircleOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { UploadFile, UploadChangeParam } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';
import dayjs from 'dayjs';
import BaiduMapCard from '../../components/BaiduMapCard';
import apiService from '../../services/api';
import { ImageService } from '../../services/imageService';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import type { Dayjs } from 'dayjs';
import type { DatePickerProps } from 'antd';
import { GenderType, JobType, Education } from '@/types/resume';
import { Gender } from '@/types/resume';

// 扩展 dayjs 功能
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// 删除 axios 相关配置，因为使用 apiService 替代

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

// 添加类型定义
interface WorkExperience {
  startDate: string;
  endDate: string;
  description: string;
}

interface FormValues {
  name: string;
  gender: GenderType;
  age: number;
  idNumber: string;
  phone: string;
  address: string;
  workExperiences: WorkExperience[];
  experienceYears?: number;
  nativePlace?: string;
  jobType?: string;
  education?: string;
  wechat?: string;
  currentAddress?: string;
  hukouAddress?: string;
  birthDate?: string;
  ethnicity?: string;
  zodiac?: string;
  zodiacSign?: string;
  expectedSalary?: number;
  serviceArea?: string[];
  orderStatus?: string;
  skills?: string[];
  leadSource?: string;
  [key: string]: any;
}

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

// Add new interfaces and type definitions after the existing ones
interface WorkExperienceItem {
  startDate?: string;
  endDate?: string;
  description?: string;
}

// Restore utility functions
function debugLog(...args: unknown[]): void {
  if (DEBUG_MODE) console.log(...args);
}

// 添加日期验证工具函数
const isValidDate = (date: any): date is Dayjs => {
  return date && typeof date === 'object' && 'isValid' in date && date.isValid();
};

const toDayjs = (date: any): Dayjs | undefined => {
  if (!date) return undefined;
  if (isValidDate(date)) return date;
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed : undefined;
};

// 添加工种映射常量
const JOB_TYPE_MAP = {
  'ZHUJIA_YUER': '住家育儿',
  'BAIBAN_YUER': '白班育儿',
  'BAOJIE': '保洁',
  'BAIBAN_BAOMU': '白班保姆',
  'ZHUJIA_BAOMU': '住家保姆',
  'YANGCHONG': '养宠',
  'XIAOSHI': '小时工',
  'YUEXIN': '月薪'
} as const;

// 添加工种值转换函数
const convertJobType = (value: string): string => {
  const jobTypeMap: Record<string, string> = {
    'ZHUJIA_YUER': 'zhujia-yuer',
    'BAIBAN_YUER': 'baiban-yuer',
    'BAOJIE': 'baojie',
    'BAIBAN_BAOMU': 'baiban-baomu',
    'ZHUJIA_BAOMU': 'zhujia-baomu',
    'YANGCHONG': 'yangchong',
    'XIAOSHI': 'xiaoshi',
    'YUEXIN': 'yuexin'
  };
  return jobTypeMap[value] || value;
};

// 添加有效工种值列表
const VALID_JOB_TYPES = [
  'zhujia-yuer',
  'baiban-yuer',
  'baojie',
  'baiban-baomu',
  'zhujia-baomu',
  'yangchong',
  'xiaoshi',
  'yuexin'
] as const;

const CreateResume = () => {
  const { message: messageApi } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();
  const [loading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
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
  const [hasExistingIdCardFront, setHasExistingIdCardFront] = useState<boolean>(false);
  const [hasExistingIdCardBack, setHasExistingIdCardBack] = useState<boolean>(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);

  // 性别选择处理函数，确保 form 可用
  const handleGenderChange = (value: GenderType) => {
    if (value === Gender.MALE || value === Gender.FEMALE) {
      form.setFieldsValue({ gender: value });
    }
  };

  // 检查URL是否包含edit参数，如果不包含，应当是创建新简历
  useEffect(() => {
    // 获取当前URL
    const url = window.location.href;
    
    // 如果URL不包含edit参数，则清除localStorage中的editingResume
    if (!url.includes('edit=true')) {
      debugLog('清除localStorage中的editingResume数据，进入创建新简历模式');
      localStorage.removeItem('editingResume');
    } else {
      debugLog('保留editingResume数据，进入编辑简历模式');
    }
  }, []);

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
  const pageTitle = isEditing ? '编辑简历' : '创建简历';

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
    if (!file) return null;

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
  };

  // 添加日期格式化函数
  const formatDateToChinese = (date: string | Date | undefined): string => {
    if (!date) return '';
    const d = dayjs(date);
    return `${d.year()}年${d.month() + 1}月`;
  };

  // 修改 DatePicker 组件的配置
  const datePickerProps = {
    format: 'YYYY年MM月DD日',
    allowClear: true,
    style: { width: '100%' },
    getPopupContainer: (trigger: HTMLElement) => trigger.parentElement || document.body
  } as const;

  // 修改工作经历 DatePicker 的配置
  const workExperienceDatePickerProps = {
    format: 'YYYY年MM月',
    picker: 'month' as DatePickerProps['picker'],
    allowClear: true,
    style: { width: '100%' },
    getPopupContainer: (trigger: HTMLElement) => trigger.parentElement || document.body
  } as const;

  // 修改工作经历 DatePicker 的 onChange 处理
  const handleWorkExperienceDateChange = (name: number, field: 'startDate' | 'endDate') => (date: Dayjs | null) => {
    debugLog(`${field}被选择:`, date);
    const workExperiences = form.getFieldValue('workExperiences') || [];
    const updatedExperiences = [...workExperiences];
    updatedExperiences[name] = {
      ...updatedExperiences[name],
      [field]: date ? toDayjs(date) : undefined
    };
    form.setFieldsValue({ workExperiences: updatedExperiences });
  };

  // 修改 handleSubmit 函数
  const handleSubmit = async (values: FormValues) => {
    let formData: FormData | null = null;
    let processedValues: Partial<FormValues> = {};
    
    try {
      setSubmitting(true);

      // 记录原始值
      console.log('工种原始值:', {
        jobType: values.jobType,
        type: typeof values.jobType,
        rawValue: values.jobType
      });

      // 验证必填字段
      if (!values.jobType) {
        throw new Error('工种不能为空');
      }

      // 处理表单数据，确保枚举值正确
      processedValues = {
        ...values,
        // 确保性别值正确
        gender: values.gender === 'male' || values.gender === 'female' ? values.gender : 'female',
        // 确保工种使用正确的枚举值
        jobType: (() => {
          const convertedValue = convertJobType(String(values.jobType));
          console.log('工种处理过程:', {
            originalValue: values.jobType,
            convertedValue,
            validTypes: VALID_JOB_TYPES
          });

          // 检查转换后的值是否在有效值列表中
          if (!VALID_JOB_TYPES.includes(convertedValue as typeof VALID_JOB_TYPES[number])) {
            throw new Error(`请选择正确的工种，当前值: ${convertedValue}`);
          }
          return convertedValue;
        })(),
        // 确保学历使用正确的枚举值
        education: (() => {
          const education = values.education?.toLowerCase();
          const validEducation = [
            'no', 'primary', 'middle', 'secondary', 'vocational',
            'high', 'college', 'bachelor', 'graduate'
          ];
          if (!education || !validEducation.includes(education)) {
            throw new Error('请选择正确的学历');
          }
          return education;
        })(),
        // 处理日期
        birthDate: values.birthDate ? dayjs(values.birthDate).format('YYYY-MM-DD') : undefined,
        medicalExamDate: values.medicalExamDate ? dayjs(values.medicalExamDate).format('YYYY-MM-DD') : undefined,
        // 处理工作经历，确保日期字段格式正确
        workExperiences: values.workExperiences?.map(exp => ({
          ...exp,
          startDate: exp.startDate ? dayjs(exp.startDate).format('YYYY-MM') : dayjs().format('YYYY-MM'),
          endDate: exp.endDate ? dayjs(exp.endDate).format('YYYY-MM') : dayjs().format('YYYY-MM'),
          description: exp.description || ''
        })) || [],
        // 确保数字类型正确
        age: (() => {
          const age = Number(values.age);
          if (isNaN(age) || age < 18 || age > 80) {
            throw new Error('年龄必须在18-80岁之间');
          }
          return age;
        })(),
        experienceYears: (() => {
          const years = Number(values.experienceYears);
          if (isNaN(years) || years < 0 || years > 50) {
            throw new Error('工作经验年限必须在0-50年之间');
          }
          return years;
        })(),
        // 确保期望薪资是有效的数字
        expectedSalary: values.expectedSalary ? Math.max(0, Math.floor(Number(values.expectedSalary))) : undefined,
        // 确保 serviceArea 始终是数组且不为空
        serviceArea: (() => {
          if (!values.serviceArea || (Array.isArray(values.serviceArea) && values.serviceArea.length === 0)) {
            throw new Error('服务区域不能为空');
          }
          return Array.isArray(values.serviceArea) ? values.serviceArea : [values.serviceArea];
        })(),
        // 确保 skills 是数组且值正确
        skills: (() => {
          if (!values.skills || (Array.isArray(values.skills) && values.skills.length === 0)) {
            return []; // 技能是可选的，允许为空数组
          }
          const skillsArray = Array.isArray(values.skills) ? values.skills : [values.skills];
          const validSkills = [
            'chanhou', 'teshu-yinger', 'yiliaobackground', 'yuying', 'zaojiao',
            'fushi', 'ertui', 'waiyu', 'zhongcan', 'xican', 'mianshi', 'jiashi', 'shouyi'
          ];
          const filteredSkills = skillsArray
            .map(skill => skill.toLowerCase())
            .filter(skill => validSkills.includes(skill));
          if (filteredSkills.length === 0) {
            throw new Error('请选择有效的技能标签');
          }
          return filteredSkills;
        })()
      };

      // 创建 FormData
      formData = new FormData();
      if (!formData) {
        throw new Error('无法创建 FormData 对象');
      }

      // 添加基本字段
      Object.entries(processedValues).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'workExperiences') {
            // 特殊处理工作经历，确保日期格式正确
            const formattedExperiences = (value as any[]).map(exp => ({
              ...exp,
              startDate: exp.startDate ? dayjs(exp.startDate).format('YYYY-MM') : dayjs().format('YYYY-MM'),
              endDate: exp.endDate ? dayjs(exp.endDate).format('YYYY-MM') : dayjs().format('YYYY-MM')
            }));
            formData!.append(key, JSON.stringify(formattedExperiences));
          } else if (key === 'expectedSalary' || key === 'age' || key === 'experienceYears') {
            formData!.append(key, Math.floor(Number(value)).toString());
          } else if (Array.isArray(value)) {
            formData!.append(key, JSON.stringify(value));
          } else if (typeof value === 'object') {
            formData!.append(key, JSON.stringify(value));
          } else {
            formData!.append(key, String(value));
          }
        }
      });

      // 添加文件类型数组
      const fileTypes: string[] = [];

      // 定义添加文件的函数
      const addFilesToFormData = (files: CustomUploadFile[], type: string) => {
        if (!formData) return;
        files.forEach(file => {
          if (file.originFileObj) {
            formData!.append('files', file.originFileObj as Blob);
            fileTypes.push(type);
          }
        });
      };

      // 添加新文件及其类型
      addFilesToFormData(idCardFiles.front, 'idCardFront');
      addFilesToFormData(idCardFiles.back, 'idCardBack');
      addFilesToFormData(photoFiles, 'other');
      addFilesToFormData(certificateFiles, 'other');
      addFilesToFormData(medicalReportFiles, 'other');

      // 添加已存在的文件 URL
      if (formData) {
        if (hasExistingIdCardFront && existingIdCardFrontUrl) {
          formData.append('idCardFrontUrl', existingIdCardFrontUrl);
        }
        if (hasExistingIdCardBack && existingIdCardBackUrl) {
          formData.append('idCardBackUrl', existingIdCardBackUrl);
        }
        if (existingPhotoUrls.length > 0) {
          formData.append('photoUrls', JSON.stringify(existingPhotoUrls));
        }
        if (existingCertificateUrls.length > 0) {
          formData.append('certificateUrls', JSON.stringify(existingCertificateUrls));
        }
        if (existingMedicalReportUrls.length > 0) {
          formData.append('medicalReportUrls', JSON.stringify(existingMedicalReportUrls));
        }
      }

      // 记录完整的提交数据
      console.log('提交表单 - 完整数据:', {
        基本信息: {
          姓名: processedValues.name,
          年龄: processedValues.age,
          手机号: processedValues.phone,
          性别: processedValues.gender,
          籍贯: processedValues.nativePlace,
          工种: processedValues.jobType,
          学历: processedValues.education,
          工作经验年限: processedValues.experienceYears,
          期望薪资: processedValues.expectedSalary
        },
        可选信息: {
          身份证号: processedValues.idNumber || '',
          微信号: processedValues.wechat || '',
          现居地址: processedValues.currentAddress || '',
          户籍地址: processedValues.hukouAddress || '',
          出生日期: processedValues.birthDate || '',
          民族: processedValues.ethnicity || '',
          生肖: processedValues.zodiac || '',
          星座: processedValues.zodiacSign || '',
          服务区域: processedValues.serviceArea || [],
          接单状态: processedValues.orderStatus || '',
          技能标签: processedValues.skills || [],
          来源渠道: processedValues.leadSource || ''
        },
        工作经历: processedValues.workExperiences || [],
        文件信息: {
          新上传文件: {
            身份证正面: idCardFiles.front.length > 0,
            身份证背面: idCardFiles.back.length > 0,
            个人照片数量: photoFiles.length,
            技能证书数量: certificateFiles.length,
            体检报告数量: medicalReportFiles.length
          },
          已存在文件: {
            身份证正面: hasExistingIdCardFront,
            身份证背面: hasExistingIdCardBack,
            个人照片数量: existingPhotoUrls.length,
            技能证书数量: existingCertificateUrls.length,
            体检报告数量: existingMedicalReportUrls.length
          },
          文件类型: fileTypes
        }
      });

      // 记录发送到后端的数据
      const formDataObj = Object.fromEntries(formData.entries());
      console.log('发送到后端的数据:', {
        formData: formDataObj,
        rawValues: processedValues,
        fileTypes
      });

      // 发送请求
      const response = await apiService.upload('/resumes', formData);

      // 记录响应数据
      console.log('提交表单 - 响应数据:', {
        success: response.success,
        message: response.message,
        data: response.data
      });

      if (response.success) {
        messageApi.success('创建简历成功');
        navigate('/aunt/list');
      } else {
        messageApi.error(response.message || '创建简历失败');
      }
    } catch (error: unknown) {
      // 详细的错误日志记录
      const isAxiosError = (error: unknown): error is any => {
        return typeof error === 'object' && error !== null && 'isAxiosError' in error;
      };

      console.error('提交表单 - 详细错误信息:', {
        error,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : '未知错误',
        errorStack: error instanceof Error ? error.stack : undefined,
        axiosError: isAxiosError(error) ? {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data
          }
        } : undefined,
        formData: formData ? Object.fromEntries(formData.entries()) : undefined,
        processedValues,
        formValues: values
      });

      // 提取并显示具体的错误信息
      let errorMessage = '创建简历失败';
      if (isAxiosError(error)) {
        const axiosError = error;
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
        
        // 如果是验证错误，显示具体的字段错误
        if (axiosError.response?.data?.errors) {
          const validationErrors = axiosError.response.data.errors;
          const errorDetails = Object.entries(validationErrors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          console.error('表单验证错误详情:', errorDetails);
          errorMessage = `表单验证失败:\n${errorDetails}`;
        }

        // 记录原始响应数据
        console.error('后端返回的原始错误数据:', axiosError.response?.data);
      }
      
      messageApi.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // 检查是否为编辑模式并加载现有图片
  useEffect(() => {
    if (isEditing) {
      const editingResumeJSON = localStorage.getItem('editingResume');
      if (editingResumeJSON) {
        const editingResume = JSON.parse(editingResumeJSON);
        debugLog('加载编辑简历数据:', editingResume);
        
        // 设置身份证照片
        if (editingResume.idCardFrontUrl) {
          setExistingIdCardFrontUrl(editingResume.idCardFrontUrl);
          setHasExistingIdCardFront(true);
        }
        
        if (editingResume.idCardBackUrl) {
          setExistingIdCardBackUrl(editingResume.idCardBackUrl);
          setHasExistingIdCardBack(true);
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
    }
  }, [isEditing]);

  // 组件初始化
  useEffect(() => {
    // 检查是否有编辑中的简历数据
    const editingResumeJSON = localStorage.getItem('editingResume');
    if (editingResumeJSON) {
      try {
        const editingResume = JSON.parse(editingResumeJSON);
        debugLog('从localStorage加载简历数据进行编辑:', editingResume);
        
        // 处理日期字段，确保所有日期值都是有效的 dayjs 对象
        const formData = {
          ...editingResume,
          birthDate: toDayjs(editingResume.birthDate),
          medicalExamDate: toDayjs(editingResume.medicalExamDate),
          workExperiences: (editingResume.workExperiences || []).map((exp: WorkExperienceItem) => {
            if (!exp) return null;
            return {
              ...exp,
              startDate: toDayjs(exp.startDate),
              endDate: toDayjs(exp.endDate),
              description: exp.description || ''
            };
          }).filter(Boolean)
        };
        
        // 设置表单数据
        form.setFieldsValue(formData);
        setIsEditing(true);
      } catch (error) {
        console.error('解析编辑数据出错:', error);
        messageApi.error('加载编辑数据失败');
        localStorage.removeItem('editingResume');
      }
    }
  }, [form, messageApi]);

  // Update the file handling functions
  const handleFileChange = (type: 'photo' | 'certificate' | 'medical') => (info: UploadChangeParam<UploadFile<any>>) => {
    const fileList = info.fileList.map(file => {
      const baseProps: BaseFileProps = {
        uid: file.uid || `${Date.now()}`,
        name: file.name || '未命名文件',
        url: file.url,
        thumbUrl: file.thumbUrl,
        originFileObj: file.originFileObj,
        size: file.size,
        type: file.type
      };

      // Check if this is an existing file
      if ((file as any).isExisting) {
        return {
          ...baseProps,
          status: 'done' as const,
          isExisting: true
        } as ExistingFile;
      }

      // Otherwise it's a new file
      return {
        ...baseProps,
        status: (file.status || 'done') as UploadFileStatus,
        isExisting: false
      } as NewFile;
    });

    switch (type) {
      case 'photo':
        setPhotoFiles(fileList);
        break;
      case 'certificate':
        setCertificateFiles(fileList);
        break;
      case 'medical':
        setMedicalReportFiles(fileList);
        break;
    }
  };

  // Update the handleFileRemove function
  const handleFileRemove = (type: 'photo' | 'certificate' | 'medical') => (file: UploadFile<any>) => {
    // Convert UploadFile to CustomUploadFile by checking if it's an existing file
    const isExisting = (file as any).isExisting === true;
    
    if (isExisting) {
      switch (type) {
        case 'photo':
          setExistingPhotoUrls(prev => prev.filter(url => url !== file.url));
          break;
        case 'certificate':
          setExistingCertificateUrls(prev => prev.filter(url => url !== file.url));
          break;
        case 'medical':
          setExistingMedicalReportUrls(prev => prev.filter(url => url !== file.url));
          break;
      }
      return true;
    }
    
    switch (type) {
      case 'photo':
        setPhotoFiles(prev => prev.filter(item => item.originFileObj !== file.originFileObj));
        break;
      case 'certificate':
        setCertificateFiles(prev => prev.filter(item => item.originFileObj !== file.originFileObj));
        break;
      case 'medical':
        setMedicalReportFiles(prev => prev.filter(item => item.originFileObj !== file.originFileObj));
        break;
    }
    return true;
  };

  return (
    <PageContainer
      header={{
        title: pageTitle,
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
            <Title level={4} style={{ margin: 0 }}>阿姨简历信息</Title>
          </div>
        }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={async (values) => {
              try {
                setSubmitting(true);
                console.log('表单验证通过，准备提交:', values);
                await handleSubmit(values);
              } catch (error) {
                console.error('表单提交失败:', error);
                messageApi.error('表单提交失败，请检查填写是否正确');
              } finally {
                setSubmitting(false);
              }
            }}
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
                    label="生日"
                    name="birthDate"
                    getValueProps={(value) => ({ value: toDayjs(value) })}
                  >
                    <DatePicker {...datePickerProps} placeholder="请选择出生日期" />
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
                      <Option value={Education.NO}>无学历</Option>
                      <Option value={Education.PRIMARY}>小学</Option>
                      <Option value={Education.MIDDLE}>初中</Option>
                      <Option value={Education.SECONDARY}>中专</Option>
                      <Option value={Education.VOCATIONAL}>职高</Option>
                      <Option value={Education.HIGH}>高中</Option>
                      <Option value={Education.COLLEGE}>大专</Option>
                      <Option value={Education.BACHELOR}>本科</Option>
                      <Option value={Education.GRADUATE}>研究生</Option>
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
                                icon={<DeleteOutlined />}
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
                                getValueProps={(value) => ({ value: toDayjs(value) })}
                              >
                                <DatePicker 
                                  {...workExperienceDatePickerProps}
                                  placeholder="选择开始时间"
                                  onChange={handleWorkExperienceDateChange(name, 'startDate')}
                                />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'endDate']}
                                label="结束时间"
                                getValueProps={(value) => ({ value: toDayjs(value) })}
                              >
                                <DatePicker 
                                  {...workExperienceDatePickerProps}
                                  placeholder="选择结束时间"
                                  onChange={handleWorkExperienceDateChange(name, 'endDate')}
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
                          uid: `existing-${index}`,
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
                      {photoFiles.length + existingPhotoUrls.length >= 5 ? null : uploadButton}
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
                        ...existingCertificateUrls.map((url, index) => ({
                          uid: `existing-${index}`,
                          name: `已有证书 ${index + 1}`,
                          status: 'done' as const,
                          url: url,
                          isExisting: true,
                          type: 'application/pdf'
                        }))
                      ]}
                      onRemove={handleFileRemove('certificate')}
                      beforeUpload={() => false}
                      onChange={handleFileChange('certificate')}
                      accept=".jpg,.jpeg,.png"
                      multiple
                    >
                      {certificateFiles.length + existingCertificateUrls.length >= 5 ? null : uploadButton}
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
                      getValueProps={(value) => ({ value: toDayjs(value) })}
                    >
                      <DatePicker 
                        placeholder="请选择体检时间" 
                        style={{ width: '100%' }} 
                        format="YYYY-MM-DD"
                      />
                    </Form.Item>
                    <Upload
                      listType="picture-card"
                      fileList={[
                        ...medicalReportFiles,
                        ...existingMedicalReportUrls.map((url, index) => ({
                          uid: `existing-${index}`,
                          name: `已有报告 ${index + 1}`,
                          status: 'done' as const,
                          url: url.toLowerCase().endsWith('.pdf') ? undefined : url,
                          thumbUrl: url.toLowerCase().endsWith('.pdf') ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAALrSURBVGiB7ZZNSFRRFMd/980M5lCjUoiNJtqkmR8ItUhcGNRCKKhFuogkXIgfCzcqLdq0KoQIAqEPaCG0CTOJcrJAUHDjB0hqYlKgLHJmnDed865vmWN2Z+a+Nx23//Lg3XPPf/f/P+e+d+97FhGYqVGzJRRvACJiA9oAB9AIrI8TLwhMAT5gFLgpIr5oAW0xwm1Ap4i0W8PVbkTkGpAGnBOR0+GxEQFEJBO4ChwVERuiYiJyDfgC9IVLEhoQkZ3AY0BKCPcpd133eywdJ8tybDQSETuGYXSKyIFwPzug1Qp3bNmyZU93d/eEbduxNChLA9d1La35+PETent7jwH7ReQ9VA8hEWkGbgMYhjHS19d3qa+vT0TEmqvJwrIs0eqqVCqq9p6fn19YWVm5FthvA9qAeoALFy70GIYxUtugKok6LfN5AMlAEwBVVVVtdc23cpmmmQLYReQ7wL179/64c+fOdN2TrVS6rvtTq/cDvgCg67pn7dq12yoqKpKL3ZqjdPpwHGdWqz8C8ATwaMr+/v6enJwcc65brKuru+H1epdLpVKB53n3FqrVs4EQKf90PNc9DMwCPykghPx2YFZTdgGngBSt/hR4vsA6KTIgGHQBnwBfnRqIFbwBxBtAvAHEG0C8AcQbQLwBxBtAvAH89wBExG4YRsxvZtOUctrp+/6g4ziD0+OmU36NypIsJY/66RudtLQ0MU3zY0dHx+7FgCkpKaG0tHQWQGZmpgBXqqqquoF7ixmAptm9MJDrurZpmj+AjMbGxsC2bdvWNDc3r9Lpj0qz3t7eD+Xl5ed0XRdgCjisxNdQP5biOI6taVoB0FVUVFTudDpzNE2LailKsizleR4i8sPzvJH5QAM4juPOzMxcAd4qiqI0NDSU7t27NzkaiFDzer3+paWlwcnJyfHFTJ+xVIZh2IHUhoYGbWJiYjwQCCxo+lQqFcvLy30LCgpK9+3bt3MxEMOUoihB0zTdVatW+eLUf9n6C/G3z8hTZStxAAAAAElFTkSuQmCC' : undefined,
                        isExisting: true,
                        type: 'image/jpeg'
                      }))
                    ]}
                      onRemove={handleFileRemove('medical')}
                      beforeUpload={() => false}
                      onChange={handleFileChange('medical')}
                      accept=".jpg,.jpeg,.png,.pdf"
                      multiple
                    >
                      {medicalReportFiles.length + existingMedicalReportUrls.length >= 5 ? null : uploadButton}
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
              提交
            </Button>
            <Button onClick={() => navigate(-1)}>取消</Button>
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