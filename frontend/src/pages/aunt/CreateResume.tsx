import { PageContainer } from '@ant-design/pro-components';
import { Card, message, Button, Form, Input, Select, Upload, Divider, Row, Col, Typography, Modal, DatePicker, InputNumber, Tag, App } from 'antd';
import { useState, useRef, useEffect } from 'react';
import { PlusOutlined, CloseOutlined, EyeOutlined, UploadOutlined, InfoCircleOutlined, CheckCircleOutlined, ReloadOutlined, CloseCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { FilePdfOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';
import dayjs from 'dayjs';
import imageCompression from 'browser-image-compression';
// 引入自定义的百度地图地址自动补全组件
// import BaiduAddressAutocomplete from '../../components/BaiduAddressAutocomplete';
import BaiduMapCard from '../../components/BaiduMapCard';
import apiService from '../../services/api';

// 设置 axios 默认配置
// API请求通过vite代理转发
axios.defaults.withCredentials = true;
axios.defaults.timeout = 10000;

// 定义图片压缩选项
const compressionOptions = {
  maxSizeMB: 0.1,      // Increase to 100KB = 0.1MB
  maxWidthOrHeight: 800, // Reduce max dimensions
  useWebWorker: true,
  initialQuality: 0.8   // Add initial quality setting
};

// 图片压缩函数
const compressImage = async (file) => {
  try {
    console.log(`压缩前文件大小: ${(file.size / 1024).toFixed(2)} KB`);
    
    // 检查文件类型，只压缩图片
    if (!file.type.includes('image')) {
      console.log('非图片文件，不进行压缩:', file.type);
      return file;
    }
    
    // 压缩图片
    const compressedFile = await imageCompression(file, compressionOptions);
    console.log(`压缩后文件大小: ${(compressedFile.size / 1024).toFixed(2)} KB`);
    
    return compressedFile;
  } catch (error) {
    console.error('图片压缩失败:', error);
    return file; // 压缩失败则返回原文件
  }
};

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

// 调试日志函数
function debugLog(...args) {
  if (DEBUG_MODE) console.log(...args);
}

// 将组件内的console.log替换为debugLog
// 例如：
// console.log('表单值变化: Object'); => debugLog('表单值变化: Object');
// console.log('Form实例初始化: true'); => debugLog('Form实例初始化: true');

// 添加生肖计算函数
const getChineseZodiac = (year: number): string => {
  const zodiacMap = {
    0: 'rat',    // 鼠
    1: 'ox',     // 牛
    2: 'tiger',  // 虎
    3: 'rabbit', // 兔
    4: 'dragon', // 龙
    5: 'snake',  // 蛇
    6: 'horse',  // 马
    7: 'goat',   // 羊
    8: 'monkey', // 猴
    9: 'rooster',// 鸡
    10: 'dog',   // 狗
    11: 'pig'    // 猪
  };
  return zodiacMap[(year - 4) % 12];
};

// 添加星座计算函数
const getZodiacSign = (month: number, day: number): string => {
  const dates = [
    { date: [1, 20], sign: 'aquarius' },    // 水瓶座
    { date: [2, 19], sign: 'pisces' },      // 双鱼座
    { date: [3, 21], sign: 'aries' },       // 白羊座
    { date: [4, 20], sign: 'taurus' },      // 金牛座
    { date: [5, 21], sign: 'gemini' },      // 双子座
    { date: [6, 22], sign: 'cancer' },      // 巨蟹座
    { date: [7, 23], sign: 'leo' },         // 狮子座
    { date: [8, 23], sign: 'virgo' },       // 处女座
    { date: [9, 23], sign: 'libra' },       // 天秤座
    { date: [10, 24], sign: 'scorpio' },    // 天蝎座
    { date: [11, 23], sign: 'sagittarius' }, // 射手座
    { date: [12, 22], sign: 'capricorn' }   // 摩羯座
  ];

  for (let i = 0; i < dates.length; i++) {
    const nextIndex = (i + 1) % dates.length;
    const currentDate = dates[i].date;
    const nextDate = dates[nextIndex].date;
    
    if (month === currentDate[0] && day >= currentDate[1] || 
        month === nextDate[0] && day < nextDate[1]) {
      return dates[i].sign;
    }
  }
  return 'capricorn'; // 默认返回摩羯座
};

// 添加籍贯提取函数
const extractNativePlace = (address: string): string => {
  // 匹配省级行政区
  const provinceRegex = /^(北京市|天津市|上海市|重庆市|河北省|山西省|辽宁省|吉林省|黑龙江省|江苏省|浙江省|安徽省|福建省|江西省|山东省|河南省|湖北省|湖南省|广东省|海南省|四川省|贵州省|云南省|陕西省|甘肃省|青海省|台湾省|内蒙古自治区|广西壮族自治区|西藏自治区|宁夏回族自治区|新疆维吾尔自治区|香港特别行政区|澳门特别行政区)/;
  const match = address.match(provinceRegex);
  return match ? match[1] : '';
};

const CreateResume = () => {
  const { message: messageApi } = App.useApp();
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
      messageApi.loading('正在连接后端服务...');
      debugLog('尝试连接后端服务...');
      // 使用相对路径，Vite代理会自动处理
      const response = await axios.get('/api/resumes', {
        timeout: 8000 // 增加超时时间
      });
      debugLog('后端连接正常:', response.data);
      messageApi.success('后端服务连接成功');
      setBackendConnected(true);
      setConnectionError('');
    } catch (error) {
      console.error('后端连接失败:', error);
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response,
        request: error.request
      });
      
      // 显示友好的错误信息
      messageApi.error('后端服务暂时无法连接，请检查后端服务是否启动');
      setBackendConnected(false);
      setConnectionError(`连接后端失败: ${error.response?.status || error.message}`);
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

  // 文件上传相关state
  const [idCardFrontFile, setIdCardFrontFile] = useState<File | null>(null);
  const [idCardBackFile, setIdCardBackFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [certificateFiles, setCertificateFiles] = useState<File[]>([]);
  const [medicalReportFiles, setMedicalReportFiles] = useState<File[]>([]);

  // 已有图片URL状态
  const [existingIdCardFrontUrl, setExistingIdCardFrontUrl] = useState<string>('');
  const [existingIdCardBackUrl, setExistingIdCardBackUrl] = useState<string>('');
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [existingCertificateUrls, setExistingCertificateUrls] = useState<string[]>([]);
  const [existingMedicalReportUrls, setExistingMedicalReportUrls] = useState<string[]>([]);
  
  // 判断是否有已存在的图片
  const [hasExistingIdCardFront, setHasExistingIdCardFront] = useState<boolean>(false);
  const [hasExistingIdCardBack, setHasExistingIdCardBack] = useState<boolean>(false);

  // 预览状态管理
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // 创建Form实例并确保它在整个组件生命周期中是稳定的
  const [form] = Form.useForm();
  // 确保表单实例在组件挂载后可用
  useEffect(() => {
    debugLog('Form实例初始化:', !!form);
  }, [form]);

  const [formValues, setFormValues] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  const navigate = useNavigate();
  
  // API基础URL，这里使用相对路径
  const baseUrl = '';

  // 状态定义
  const [submitting, setSubmitting] = useState(false); // 提交状态
  const [isEditing, setIsEditing] = useState(false); // 是否为编辑模式
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null); // 正在编辑的简历ID

  // 页面标题
  const pageTitle = isEditing ? '编辑简历' : '创建简历';

  // 处理表单值变化
  const handleFormChange = (changedValues: any, allValues: any) => {
    debugLog('表单值变化:', changedValues);
    // 将新值合并到formValues中，而不是替换
    setFormValues(prev => ({
      ...prev,
      ...changedValues
    }));
  };

  // 处理图片预览
  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = URL.createObjectURL(file.originFileObj as Blob);
    }

    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
    setPreviewTitle(file.name || file.url!.substring(file.url!.lastIndexOf('/') + 1));
  };

  const handleCancel = () => setPreviewOpen(false);

  // 身份证上传组件的自定义渲染
  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  );

  // 身份证文件上传变更处理
  const handleIdCardUpload = async (type: 'front' | 'back', info: any) => {
    if (!info?.file) {
      console.error(`${type === 'front' ? '身份证正面' : '身份证背面'}文件上传失败: 未获取到文件信息`);
      messageApi.error('未获取到文件信息');
      return;
    }

    const file = info.file.originFileObj || info.file;
    if (!file) {
      console.error(`${type === 'front' ? '身份证正面' : '身份证背面'}文件上传失败: 未获取到文件对象`);
      messageApi.error('未获取到文件对象');
      return;
    }

    try {
      // Show loading message
      const loadingKey = 'compressing';
      messageApi.loading({ content: '正在处理图片...', key: loadingKey });
      
      // 压缩图片
      const compressedFile = await compressImage(file);
      
      // 设置对应的状态
      if (type === 'front') {
        setIdCardFrontFile(compressedFile);
      } else {
        setIdCardBackFile(compressedFile);
      }

      // Show compressed size
      console.log(`压缩后文件大小: ${(compressedFile.size / 1024).toFixed(2)} KB`);

      // 创建FormData对象
      const formData = new FormData();
      formData.append('image', compressedFile);  // 统一使用 'image' 作为字段名
      formData.append('idCardSide', type);
      
      setLoading(true);
      messageApi.loading({ content: '正在处理...', key: loadingKey });
      
      try {
        // 只对身份证正面进行OCR识别
        if (type === 'front') {
          // 发送OCR请求
          const ocrResponse = await axios.post('/api/ocr/idcard', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
          });

          if (!ocrResponse.data.success) {
            throw new Error(ocrResponse.data.message || 'OCR识别失败');
          }

          // 腾讯云OCR响应格式处理
          const ocrResult = ocrResponse.data.data;
          messageApi.success({ content: '身份证正面识别成功', key: loadingKey });

          // Process OCR results
          const formValues: any = {};

          // Extract information with better error handling
          try {
            // 处理腾讯云OCR返回的数据格式
            const words_result = ocrResult.words_result || {};
            
            if (words_result.姓名?.words) {
              formValues.name = words_result.姓名.words;
            }
            if (words_result.民族?.words) {
              formValues.ethnicity = words_result.民族.words.replace(/族$/, '');
            }
            if (words_result.公民身份号码?.words) {
              const idCard = words_result.公民身份号码.words;
              formValues.idNumber = idCard;

              // 提取出生日期
              const birthYear = parseInt(idCard.substring(6, 10));
              const birthMonth = parseInt(idCard.substring(10, 12));
              const birthDay = parseInt(idCard.substring(12, 14));
              const birthDate = dayjs(`${birthYear}-${birthMonth}-${birthDay}`);
              formValues.birthDate = birthDate;

              // 计算年龄
              const today = dayjs();
              const age = today.diff(birthDate, 'year');
              formValues.age = age;

              // 计算生肖
              formValues.zodiac = getChineseZodiac(birthYear);

              // 计算星座
              formValues.zodiacSign = getZodiacSign(birthMonth, birthDay);

              // 设置性别
              formValues.gender = parseInt(idCard.charAt(16)) % 2 === 1 ? '男' : '女';
            }
            if (words_result.住址?.words) {
              const address = words_result.住址.words;
              formValues.currentAddress = address;
              formValues.hukouAddress = address;
              
              // 提取籍贯
              const nativePlace = extractNativePlace(address);
              if (nativePlace) {
                formValues.nativePlace = nativePlace;
              }
            }

            // 更新表单
            form.setFieldsValue(formValues);
          } catch (error) {
            console.error('处理OCR结果时出错:', error);
            messageApi.error({ content: '处理识别结果时出错，请手动填写信息', key: loadingKey });
          }
        }

        // 上传图片到服务器
        const uploadResponse = await axios.post(`/api/upload/id-card/${type}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (!uploadResponse.data.success) {
          throw new Error(uploadResponse.data.message || '图片上传失败');
        }

        // 更新表单中的URL字段
        form.setFieldsValue({
          [`idCard${type === 'front' ? 'Front' : 'Back'}Url`]: uploadResponse.data.data.url
        });

        messageApi.success({ content: '图片上传成功', key: loadingKey });
      } catch (error: any) {
        console.error('上传或识别失败:', error);
        messageApi.error({ 
          content: error.response?.data?.message || error.message || '上传失败', 
          key: loadingKey 
        });
      } finally {
        setLoading(false);
      }
    } catch (error: any) {
      console.error('处理图片失败:', error);
      messageApi.error(error.message || '处理图片失败');
      setLoading(false);
    }
  };

  // 预览身份证图片
  const previewIdCard = (file: File) => {
    debugLog('预览身份证图片:', file.name);
    const objectUrl = URL.createObjectURL(file);
    debugLog('创建的图片URL:', objectUrl);
    setPreviewImage(objectUrl);
    setPreviewTitle(file.name);
    setPreviewOpen(true);
  };

  // 多文件上传处理
  const handleMultiFileUpload = async (type, info) => {
    try {
      const { fileList } = info;
      
      // 获取新上传的文件
      const newFiles = fileList
        .filter(fileInfo => fileInfo.originFileObj)
        .map(fileInfo => fileInfo.originFileObj);
      
      if (newFiles.length === 0) return;
      
      // 显示压缩中的提示
      const compressingKey = messageApi.loading('正在处理文件...');
      
      // 获取原始文件
      const rawFiles = [...newFiles];
      
      // 压缩所有文件
      const compressPromises = rawFiles.map(file => compressImage(file));
      const compressedFiles = await Promise.all(compressPromises);
      
      // 根据类型设置文件
      if (type === '个人照片') {
        setPhotoFiles(compressedFiles);
      } else if (type === '技能证书') {
        setCertificateFiles(compressedFiles);
      } else if (type === '体检报告') {
        setMedicalReportFiles(compressedFiles);
      }
      
      // 关闭压缩中提示
      messageApi.destroy(compressingKey);
      
      // 计算总大小
      const totalOriginalSize = rawFiles.reduce((sum, file) => sum + file.size, 0);
      const totalCompressedSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
      
      // 显示处理结果
      const originalSizeKB = (totalOriginalSize / 1024).toFixed(2);
      const compressedSizeKB = (totalCompressedSize / 1024).toFixed(2);
      
      messageApi.success(`${type}上传成功: ${originalSizeKB} KB → ${compressedSizeKB} KB`);
    } catch (error) {
      messageApi.error(`${type}处理失败，请重试`);
      console.error(`${type}上传失败:`, error);
    }
  };

  // 修改handleSubmit函数，支持更新操作
  const handleSubmit = async (values: any) => {
    try {
      const values = await form.validateFields();
      debugLog('表单值:', values);
      
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

      // 查重检查 - 在提交前检查手机号和身份证号是否已存在
      try {
        messageApi.loading('正在检查数据...');
        // 只有创建新简历时才检查重复
        if (!isEditing && (values.phone || values.idNumber)) {
          console.log('检查手机号和身份证号是否重复');
          
          // 从本地存储获取所有简历
          let localResumeList = [];
          try {
            const storedResumeList = localStorage.getItem('resumeList');
            if (storedResumeList) {
              localResumeList = JSON.parse(storedResumeList);
            }
          } catch (e) {
            console.error('无法解析本地简历列表:', e);
          }
          
          // 从API获取简历列表
          try {
            const response = await axios.get('/api/resumes');
            if (response.data && Array.isArray(response.data)) {
              // 合并API和本地数据
              localResumeList = [...localResumeList, ...response.data];
            }
          } catch (e) {
            console.error('无法从API获取简历列表:', e);
          }
          
          // 检查手机号是否重复
          const duplicatePhone = localResumeList.some(resume => 
            resume.phone && resume.phone === values.phone
          );
          
          // 检查身份证号是否重复
          const duplicateIdNumber = values.idNumber && localResumeList.some(resume => 
            resume.idNumber && resume.idNumber === values.idNumber
          );
          
          console.log('查重结果:', { duplicatePhone, duplicateIdNumber });
          
          // 如果存在重复数据
          if (duplicatePhone || duplicateIdNumber) {
            const duplicateFields = [];
            if (duplicatePhone) duplicateFields.push('手机号');
            if (duplicateIdNumber) duplicateFields.push('身份证号');
            
            // 显示错误信息并停止提交
            Modal.error({
              title: '已存在相同信息的简历',
              content: `系统中已存在使用相同${duplicateFields.join('或')}的简历，请勿重复创建。`,
              okText: '我知道了'
            });
            messageApi.destroy(); // 清除loading消息
            return;
          }
        }
      } catch (error) {
        console.error('查重检查失败:', error);
        // 查重失败不阻止提交，但记录错误
        messageApi.warning('简历查重检查失败，将继续提交');
      }

      setSubmitting(true);
      setLoading(true);
      messageApi.loading('正在处理文件，请稍候...');
      
      // 先上传所有文件
      const fileUrls: any = {
        idCardFrontUrl: '',
        idCardBackUrl: '',
        photoUrls: [],
        certificateUrls: [],
        medicalReportUrls: []
      };
      
      try {
        // 上传身份证正面
        if (idCardFrontFile) {
          const formData = new FormData();
          formData.append('file', idCardFrontFile);
          const response = await axios.post(`/api/upload/id-card/front`, formData);
          fileUrls.idCardFrontUrl = response.data.url;
        } 
        
        // 上传身份证背面
        if (idCardBackFile) {
          const formData = new FormData();
          formData.append('file', idCardBackFile);
          const response = await axios.post(`/api/upload/id-card/back`, formData);
          fileUrls.idCardBackUrl = response.data.url;
        }
        
        // 上传个人照片
        if (photoFiles.length > 0) {
          for (const file of photoFiles) {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post(`/api/upload/file/photo`, formData);
            fileUrls.photoUrls.push(response.data.url);
          }
        }
        
        // 上传技能证书
        if (certificateFiles.length > 0) {
          for (const file of certificateFiles) {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post(`/api/upload/file/certificate`, formData);
            fileUrls.certificateUrls.push(response.data.url);
          }
        }
        
        // 上传体检报告
        if (medicalReportFiles.length > 0) {
          for (const file of medicalReportFiles) {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post(`/api/upload/file/medical-report`, formData);
            fileUrls.medicalReportUrls.push(response.data.url);
          }
        }
        
        // 如果是编辑模式，且有可用的URL，合并现有和新上传的URL
        if (isEditing) {
          // 只有当用户没有删除已有图片时，才保留它们
          if (hasExistingIdCardFront && !idCardFrontFile) {
            fileUrls.idCardFrontUrl = existingIdCardFrontUrl;
          }
          
          if (hasExistingIdCardBack && !idCardBackFile) {
            fileUrls.idCardBackUrl = existingIdCardBackUrl;
          }
          
          // 合并所有已有的照片URL和新上传的照片URL
          fileUrls.photoUrls = [...fileUrls.photoUrls, ...existingPhotoUrls];
          fileUrls.certificateUrls = [...fileUrls.certificateUrls, ...existingCertificateUrls];
          fileUrls.medicalReportUrls = [...fileUrls.medicalReportUrls, ...existingMedicalReportUrls];
        }
      } catch (error) {
        console.error('上传文件失败:', error);
        messageApi.error('上传文件失败，请重试');
        setLoading(false);
        setSubmitting(false);
        return;
      }
      
      // 合并所有表单数据
      const allFormData = { ...values };
      debugLog('表单数据:', allFormData);
      
      // 处理工作经验中的日期格式
      if (allFormData.workExperiences && allFormData.workExperiences.length > 0) {
        debugLog('处理前的工作经历数据:', JSON.stringify(allFormData.workExperiences));
        
        // 获取当前表单的原始值，确保能拿到正确的日期对象
        const formWorkExps = form.getFieldValue('workExperiences');
        debugLog('Form中的工作经历数据:', formWorkExps);
        
        // 直接使用表单实例中的数据，并过滤掉空值
        const validWorkExps = formWorkExps.filter(exp => exp && (exp.startDate || exp.endDate || exp.description));
        debugLog('有效的工作经历数据:', validWorkExps);
        
        // 处理日期格式
        allFormData.workExperiences = validWorkExps.map((exp, index) => {
          debugLog(`处理工作经历[${index}]`);
          
          // 处理开始日期
          let startDateStr = '';
          if (exp.startDate) {
            if (typeof exp.startDate.format === 'function') {
              startDateStr = exp.startDate.format('YYYY-MM');
              debugLog(`工作经历[${index}]开始时间格式化为:`, startDateStr);
            } else if (typeof exp.startDate === 'string') {
              startDateStr = exp.startDate;
            }
          }
          
          // 处理结束日期
          let endDateStr = '';
          if (exp.endDate) {
            if (typeof exp.endDate.format === 'function') {
              endDateStr = exp.endDate.format('YYYY-MM');
              debugLog(`工作经历[${index}]结束时间格式化为:`, endDateStr);
            } else if (typeof exp.endDate === 'string') {
              endDateStr = exp.endDate;
            }
          }
          
          return {
            startDate: startDateStr,
            endDate: endDateStr,
            description: exp.description || ''
          };
        });
        
        debugLog('处理后的工作经历数据:', JSON.stringify(allFormData.workExperiences));
      }
      
      // 准备工作经历数据
      const workExperiences = allFormData.workExperiences || [];
      
      // 准备提交的数据
      const requestData = {
        ...allFormData,
        workExperiences,
        ...fileUrls
      };
      
      debugLog('最终提交的完整数据:', requestData);
      
      // 判断是编辑还是创建
      const apiUrl = isEditing ? `/api/resumes/${editingResumeId}` : '/api/resumes';
      const method = isEditing ? 'PUT' : 'POST';
      
      // 提交表单数据到后端
      try {
        // 使用axios发送请求
        const response = isEditing
          ? await axios.put(apiUrl, requestData)
          : await axios.post(apiUrl, requestData);
        
        debugLog('提交响应:', response.data);
        
        // 显示成功消息并导航到简历详情页
        messageApi.success(isEditing ? '简历更新成功' : '简历创建成功');
        
        // 清除编辑状态
        if (isEditing) {
          localStorage.removeItem('editingResume');
          setIsEditing(false);
          setEditingResumeId(null);
        }
        
        // 表单重置和跳转
        form.resetFields();
        // 跳转到简历详情页
        navigate(`/aunt/resume/${response.data.id}`);
      } catch (error) {
        // 错误处理
        setLoading(false);
        setSubmitting(false);
        
        if (error.response) {
          messageApi.error(`${isEditing ? '更新' : '创建'}失败: ${error.response.data?.message || '未知错误'}`);
          } else {
          messageApi.error(`${isEditing ? '更新' : '创建'}失败，请检查网络连接`);
        }
        console.error('提交失败:', error);
      }
    } catch (error) {
      console.error('表单提交错误:', error);
      messageApi.error(`${isEditing ? '更新' : '创建'}失败，请检查表单`);
    } finally {
      setLoading(false);
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
        
        // 设置表单数据
        form.setFieldsValue({
          name: editingResume.name,
          phone: editingResume.phone,
          age: editingResume.age,
          gender: editingResume.gender,
          wechat: editingResume.wechat,
          maritalStatus: editingResume.maritalStatus,
          religion: editingResume.religion,
          currentAddress: editingResume.currentAddress,
          nativePlace: editingResume.nativePlace,
          hukouAddress: editingResume.hukouAddress,
          ethnicity: editingResume.ethnicity,
          idNumber: editingResume.idNumber,
          birthPlace: editingResume.birthPlace,
          education: editingResume.education,
          birthDate: editingResume.birthDate ? dayjs(editingResume.birthDate) : undefined,
          zodiac: editingResume.zodiac,
          zodiacSign: editingResume.zodiacSign,
          jobType: editingResume.jobType,
          workYears: editingResume.workYears,
          experienceYears: editingResume.experienceYears,
          specialty: editingResume.specialty,
          description: editingResume.description,
          height: editingResume.height,
          weight: editingResume.weight,
          expectedSalary: editingResume.expectedSalary,
          serviceArea: editingResume.serviceArea,
          orderStatus: editingResume.orderStatus,
          leadSource: editingResume.leadSource,
          skills: editingResume.skills
        });
        
        // 设置页面标题和提交按钮文本
        setIsEditing(true);
        setEditingResumeId(editingResume.id);
        
        // 加载工作经历
        if (editingResume.workExperiences && Array.isArray(editingResume.workExperiences)) {
          const formattedWorkExps = editingResume.workExperiences.map(exp => ({
            startDate: exp.startDate && exp.startDate !== '-' ? dayjs(exp.startDate) : undefined,
            endDate: exp.endDate && exp.endDate !== '-' ? dayjs(exp.endDate) : undefined,
            description: exp.description
          }));
          
          // 清空现有的工作经历并添加新的工作经历
          form.setFieldsValue({ workExperiences: [] });
          
          // 然后设置整个数组
          setTimeout(() => {
            form.setFieldsValue({ workExperiences: formattedWorkExps });
          }, 100);
        }
      } catch (error) {
        console.error('解析编辑数据出错:', error);
        messageApi.error('加载编辑数据失败');
        localStorage.removeItem('editingResume');
      }
    }
  }, [form, messageApi]);

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
      {/* 移除 contextHolder */}
      <Card
        style={{ marginBottom: 24 }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>阿姨简历信息</Title>
          </div>
        }
        >
          <Form
            layout="vertical"
          form={form}
            onValuesChange={handleFormChange}
          initialValues={formValues}
          style={{ maxWidth: '100%' }}
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
                extra={<Text type="secondary">必须上传</Text>}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Upload
                    listType="picture"
                    showUploadList={false}
                    beforeUpload={() => false}
                    onChange={(info) => handleIdCardUpload('front', info)}
                    accept=".jpg,.jpeg,.png"
                  >
                    <Button icon={<UploadOutlined />} style={{ marginBottom: 8 }}>
                      上传身份证正面
        </Button>
                  </Upload>
                  
                  {/* 显示新上传的图片 */}
                  {idCardFrontFile && (
                    <div style={{ 
                      border: '1px solid #d9d9d9', 
                      borderRadius: 8, 
                      padding: 8, 
                      position: 'relative',
                      height: 160
                    }}>
                      <img 
                        src={URL.createObjectURL(idCardFrontFile)}
                        alt="身份证正面"
          style={{
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain' 
                        }}
                        onLoad={() => debugLog('身份证正面图片加载成功')}
                        onError={(e) => {
                          console.error('身份证正面图片加载失败');
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
                        {(idCardFrontFile.size / 1024).toFixed(2)} KB
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
                          onClick={() => previewIdCard(idCardFrontFile)}
                        />
                        <Button
                          size="small"
                          shape="circle"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => setIdCardFrontFile(null)}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* 显示已有的图片（仅在编辑模式且没有新上传图片时） */}
                  {!idCardFrontFile && hasExistingIdCardFront && (
                    <div style={{ 
                      border: '1px solid #d9d9d9', 
                      borderRadius: 8, 
                      padding: 8, 
                      position: 'relative',
                      height: 160
                    }}>
                      <img 
                        src={existingIdCardFrontUrl}
                        alt="身份证正面(已上传)"
          style={{
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain' 
                        }}
                        onLoad={() => debugLog('已有身份证正面图片加载成功')}
                        onError={(e) => {
                          console.error('已有身份证正面图片加载失败');
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
                        已上传图片
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
                          onClick={() => {
                            setPreviewImage(existingIdCardFrontUrl);
                            setPreviewTitle('身份证正面(已上传)');
                            setPreviewOpen(true);
                          }}
                        />
                        <Button
                          size="small"
                          shape="circle"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => {
                            setHasExistingIdCardFront(false);
                            setExistingIdCardFrontUrl('');
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card 
                size="small" 
                title="身份证背面" 
                style={{ marginBottom: 16 }}
                extra={<Text type="secondary">必须上传</Text>}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Upload
                    listType="picture"
                    showUploadList={false}
                    beforeUpload={() => false}
                    onChange={(info) => handleIdCardUpload('back', info)}
                    accept=".jpg,.jpeg,.png"
                  >
                    <Button icon={<UploadOutlined />} style={{ marginBottom: 8 }}>
                      上传身份证背面
                    </Button>
                  </Upload>
                  
                  {/* 显示新上传的图片 */}
                  {idCardBackFile && (
                    <div style={{ 
                      border: '1px solid #d9d9d9', 
                      borderRadius: 8, 
                      padding: 8, 
                      position: 'relative',
                      height: 160
                    }}>
                      <img 
                        src={URL.createObjectURL(idCardBackFile)}
                        alt="身份证背面"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain' 
                        }}
                        onLoad={() => debugLog('身份证背面图片加载成功')}
                        onError={(e) => {
                          console.error('身份证背面图片加载失败');
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
                        {(idCardBackFile.size / 1024).toFixed(2)} KB
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
                          onClick={() => previewIdCard(idCardBackFile)}
                        />
                        <Button
                          size="small"
                          shape="circle"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => setIdCardBackFile(null)}
                        />
                      </div>
              </div>
            )}
                  
                  {/* 显示已有的图片（仅在编辑模式且没有新上传图片时） */}
                  {!idCardBackFile && hasExistingIdCardBack && (
                    <div style={{ 
                      border: '1px solid #d9d9d9', 
                      borderRadius: 8, 
                      padding: 8, 
                      position: 'relative',
                      height: 160
                    }}>
                      <img 
                        src={existingIdCardBackUrl}
                        alt="身份证背面(已上传)"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain' 
                        }}
                        onLoad={() => debugLog('已有身份证背面图片加载成功')}
                        onError={(e) => {
                          console.error('已有身份证背面图片加载失败');
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
                        已上传图片
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
                          onClick={() => {
                            setPreviewImage(existingIdCardBackUrl);
                            setPreviewTitle('身份证背面(已上传)');
                            setPreviewOpen(true);
                          }}
                        />
                        <Button
                          size="small"
                          shape="circle"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => {
                            setHasExistingIdCardBack(false);
                            setExistingIdCardBackUrl('');
                          }}
                        />
                      </div>
                    </div>
                  )}
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
                    <Input placeholder="请输入姓名" />
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
                    <Select placeholder="请选择性别">
                      <Option value="male">男</Option>
                      <Option value="female">女</Option>
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
                    <Input placeholder="请输入手机号码" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="微信号"
                    name="wechat"
                  >
                    <Input placeholder="请输入微信号" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="生日"
                    name="birthDate"
                  >
                    <DatePicker style={{ width: '100%' }} placeholder="请选择出生日期" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Form.Item
                    label="现居住地址"
                    name="currentAddress"
                  >
                    <Input placeholder="请输入现居住地址" />
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
                    <Input placeholder="请输入户籍地址" />
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
                    <Input placeholder="请输入身份证号" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="学历"
                    name="education"
                    rules={[{ required: true, message: '请选择学历' }]}
                  >
                    <Select placeholder="请选择学历">
                      <Option value="no">无学历</Option>
                      <Option value="primary">小学</Option>
                      <Option value="middle">初中</Option>
                      <Option value="secondary">中专</Option>
                      <Option value="vocational">职高</Option>
                      <Option value="high">高中</Option>
                      <Option value="college">大专</Option>
                      <Option value="bachelor">本科</Option>
                      <Option value="graduate">研究生及以上</Option>
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
                    <Input placeholder="请输入紧急联系人姓名" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="紧急联系人电话"
                    name="emergencyContactPhone"
                  >
                    <Input placeholder="请输入紧急联系人电话" />
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
                      >
                    <InputNumber 
                      min={0} 
                      placeholder="请输入期望薪资" 
                      style={{ width: '100%' }}
                      formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value!.replace(/\¥\s?|(,*)/g, '')}
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
                            >
                              <DatePicker 
                                format="YYYY-MM" 
                                picker="month" 
                                placeholder="选择开始时间" 
                                style={{ width: '100%' }}
                                onChange={(date) => {
                                  debugLog('开始时间被选择:', date);
                                  // 使用Form API直接设置字段值，这是更可靠的方式
                                  form.setFieldValue(['workExperiences', name, 'startDate'], date);
                                }}
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
                                onChange={(date) => {
                                  debugLog('结束时间被选择:', date);
                                  // 使用Form API直接设置字段值，这是更可靠的方式
                                  form.setFieldValue(['workExperiences', name, 'endDate'], date);
                                }}
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
                              startDate: dayjs(),  // 使用当前日期作为初始值
                              endDate: dayjs(),    // 使用当前日期作为初始值
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
                        // 新上传的照片
                        ...photoFiles.map((file, index) => ({
                          uid: `-${index}`,
                          name: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
                          status: 'done',
                          url: URL.createObjectURL(file),
                          originFileObj: file
                        })),
                        // 已有的照片
                        ...existingPhotoUrls.map((url, index) => ({
                          uid: `existing-${index}`,
                          name: `已有图片 ${index + 1}`,
                          status: 'done',
                          url: url,
                          isExisting: true // 标记为已有图片
                        }))
                      ]}
                      onRemove={(file: any) => {
                        // 如果是已有图片，从existingPhotoUrls中移除
                        if (file.isExisting) {
                          const newUrls = existingPhotoUrls.filter(url => url !== file.url);
                          setExistingPhotoUrls(newUrls);
                          return true;
                        }
                        // 如果是新上传的图片，从photoFiles中移除
                        const index = photoFiles.findIndex(item => item === file.originFileObj);
                        const newFileList = [...photoFiles];
                        newFileList.splice(index, 1);
                        setPhotoFiles(newFileList);
                        return true;
                      }}
                      beforeUpload={() => false}
                      onChange={(info) => handleMultiFileUpload('个人照片', info)}
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
                        // 新上传的证书
                        ...certificateFiles.map((file, index) => ({
                          uid: `-${index}`,
                          name: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
                          status: 'done',
                          url: URL.createObjectURL(file),
                          originFileObj: file
                        })),
                        // 已有的证书
                        ...existingCertificateUrls.map((url, index) => ({
                          uid: `existing-${index}`,
                          name: `已有证书 ${index + 1}`,
                          status: 'done',
                          url: url,
                          isExisting: true // 标记为已有图片
                        }))
                      ]}
                      onRemove={(file: any) => {
                        // 如果是已有图片，从existingCertificateUrls中移除
                        if (file.isExisting) {
                          const newUrls = existingCertificateUrls.filter(url => url !== file.url);
                          setExistingCertificateUrls(newUrls);
                          return true;
                        }
                        // 如果是新上传的图片，从certificateFiles中移除
                        const index = certificateFiles.findIndex(item => item === file.originFileObj);
                        const newFileList = [...certificateFiles];
                        newFileList.splice(index, 1);
                        setCertificateFiles(newFileList);
                        return true;
                      }}
                      beforeUpload={() => false}
                      onChange={(info) => handleMultiFileUpload('技能证书', info)}
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
                      rules={[{ required: false, message: '请选择体检时间' }]}
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
                        // 新上传的报告
                        ...medicalReportFiles.map((file, index) => ({
                          uid: `-${index}`,
                          name: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
                          status: 'done',
                          url: file.type.includes('image') ? URL.createObjectURL(file) : undefined,
                          originFileObj: file
                        })),
                        // 已有的报告
                        ...existingMedicalReportUrls.map((url, index) => ({
                          uid: `existing-${index}`,
                          name: `已有报告 ${index + 1}`,
                          status: 'done',
                          url: url.toLowerCase().endsWith('.pdf') ? undefined : url,
                          thumbUrl: url.toLowerCase().endsWith('.pdf') ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAALrSURBVGiB7ZZNSFRRFMd/980M5lCjUoiNJtqkmR8ItUhcGNRCKKhFuogkXIgfCzcqLdq0KoQIAqEPaCG0CTOJcrJAUHDjB0hqYlKgLHJmnDed865vmWN2Z+a+Nx23//Lg3XPPPff/P+e+d+97FhGYqVGzJRRvACJiA9oAB9AIrI8TLwhMAT5gFLgpIr5oAW0xwm1Ap4i0W8PVbkTkGpAGnBOR0+GxEQFEJBO4ChwVERuiYiJyDfgC9IVLEhoQkZ3AY0BKCPcpd133eywdJ8tybDQSETuGYXSKyIFwPzug1Qp3bNmyZU93d/eEbduxNChLA9d1La35+PETent7jwH7ReQ9VA8hEWkGbgMYhjHS19d3qa+vT0TEmqvJwrIs0eqqVCqq9p6fn19YWVm5FthvA9qAeoALFy70GIYxUtugKok6LfN5AMlAEwBVVVVtdc23cpmmmQLYReQ7wL179/64c+fOdN2TrVS6rvtTq/cDvgCg67pn7dq12yoqKpKL3ZqjdPpwHGdWqz8C8ATwaMr+/v6enJwcc65brKuru+H1epdLpVKB53n3FqrVs4EQKf90PNc9DMwCPykghPx2YFZTdgGngBSt/hR4vsA6KTIgGHQBnwBfnRqIFbwBxBtAvAHEG0C8AcQbQLwBxBtAvAH89wBExG4YRsxvZtOUctrp+/6g4ziD0+OmU36NypIsJY/66RudtLQ0MU3zY0dHx+7FgCkpKaG0tHQWQGZmpgBXqqqquoF7ixmAptm9MJDrurZpmj+AjMbGxsC2bdvWNDc3r9Lpj0qz3t7eD+Xl5ed0XRdgCjisxNdQP5biOI6taVoB0FVUVFTudDpzNE2LailKsizleR4i8sPzvJH5QAM4juPOzMxcAd4qiqI0NDSU7t27NzkaiFDzer3+paWlwcnJyfHFTJ+xVIZh2IHUhoYGbWJiYjwQCCxo+lQqFcvLy30LCgpK9+3bt3MxEMOUoihB0zTdVatW+eLUf9n6C/G3z8hTZStxAAAAAElFTkSuQmCC' : undefined,
                          isExisting: true // 标记为已有图片
                        }))
                      ]}
                      onRemove={(file: any) => {
                        // 如果是已有图片，从existingMedicalReportUrls中移除
                        if (file.isExisting) {
                          const newUrls = existingMedicalReportUrls.filter(url => url !== file.url);
                          setExistingMedicalReportUrls(newUrls);
                          return true;
                        }
                        // 如果是新上传的图片，从medicalReportFiles中移除
                        const index = medicalReportFiles.findIndex(item => item === file.originFileObj);
                        const newFileList = [...medicalReportFiles];
                        newFileList.splice(index, 1);
                        setMedicalReportFiles(newFileList);
                        return true;
                      }}
                      beforeUpload={() => false}
                      onChange={(info) => handleMultiFileUpload('体检报告', info)}
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
                  onClick={handleSubmit} 
                  loading={loading || submitting}
                  style={{ marginRight: '16px' }}
                >
                  {isEditing ? '保存更新' : '创建简历'}
                </Button>
                <Button onClick={() => navigate(-1)}>取消</Button>
              </div>
          </Form>
        </Card>
      
      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={handleCancel}
      >
        <img alt="预览" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </PageContainer>
  );
};

export default CreateResume;