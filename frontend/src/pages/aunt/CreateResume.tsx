import { PageContainer } from '@ant-design/pro-components';
import { Card, message, Button, Form, Input, Select, Upload, Divider, Row, Col, Typography, Modal, DatePicker, InputNumber, Tag, Spin, Tooltip, App } from 'antd';
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
import { compressImage, createImagePreview, revokeImagePreview, clearCompressionCache } from '../../utils/imageUtils';
import { recognizeIdCard, extractIdCardFormData, testOcrConnection } from '../../utils/ocrUtils';

// 设置 axios 默认配置
// API请求通过vite代理转发
axios.defaults.withCredentials = true;
axios.defaults.timeout = 10000;

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

// 创建一个安全的对象复制函数，防止循环引用
const safeClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 避免处理DOM节点和React元素
  if (
    obj instanceof HTMLElement || 
    obj instanceof Node ||
    (obj.$$typeof && obj.$$typeof.toString().includes('Symbol(react'))
  ) {
    return '[DOM_ELEMENT]';
  }

  // 处理日期对象
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map(item => safeClone(item));
  }

  // 处理普通对象
  const clone = {};
  Object.keys(obj).forEach(key => {
    // 跳过以"_"或"$"开头的属性，这些通常是内部属性
    if (key.startsWith('_') || key.startsWith('$') || key.startsWith('__')) {
      return;
    }
    
    try {
      clone[key] = safeClone(obj[key]);
    } catch (e) {
      // 如果出现错误，使用安全的占位符
      clone[key] = '[CIRCULAR_REFERENCE]';
    }
  });
  
  return clone;
};

const CreateResume = () => {
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
      message.loading('正在连接后端服务...');
      debugLog('尝试连接后端服务...');
      // 将URL改回 /api/resumes，这与之前 NestJS RouterExplorer 显示的 ResumeController 路由一致
      const response = await axios.get('/api/resumes', { 
        timeout: 8000 // 增加超时时间
      });
      debugLog('后端连接正常:', response.data);
      message.success('后端服务连接成功');
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
      message.error('后端服务暂时无法连接，请检查后端服务是否启动');
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
  const [previewUrl, setPreviewUrl] = useState<string>(''); 
  const [idCardFrontPreview, setIdCardFrontPreview] = useState<string>('');
  const [idCardBackPreview, setIdCardBackPreview] = useState<string>('');
  const [ocrApiAvailable, setOcrApiAvailable] = useState<boolean>(false); // 添加OCR API可用性状态

  // 创建Form实例并确保它在整个组件生命周期中是稳定的
  const [form] = Form.useForm();
  // 确保表单实例在组件挂载后可用
  useEffect(() => {
    debugLog('Form实例初始化:', !!form);
  }, [form]);

  const { message, notification } = App.useApp();
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

  // 计算生肖和星座
  const calculateZodiacFromBirthDate = (birthDate: dayjs.Dayjs, currentValues: any) => {
    if (!birthDate || !birthDate.isValid()) return {};
    
    const updates: Record<string, any> = {};
    
    // 计算生肖
    const birthYear = birthDate.year();
    const zodiacIndex = (birthYear - 4) % 12;
    const zodiacValues = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];
    updates.zodiac = zodiacValues[zodiacIndex];
    
    // 计算星座
    const month = birthDate.month() + 1; // dayjs月份从0开始
    const day = birthDate.date();
    
    // 根据月份和日期确定星座
    let zodiacSign = '';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
      zodiacSign = 'aquarius'; // 水瓶座 1.20-2.18
    } else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
      zodiacSign = 'pisces'; // 双鱼座 2.19-3.20
    } else if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
      zodiacSign = 'aries'; // 白羊座 3.21-4.19
    } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
      zodiacSign = 'taurus'; // 金牛座 4.20-5.20
    } else if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) {
      zodiacSign = 'gemini'; // 双子座 5.21-6.21
    } else if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) {
      zodiacSign = 'cancer'; // 巨蟹座 6.22-7.22
    } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
      zodiacSign = 'leo'; // 狮子座 7.23-8.22
    } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
      zodiacSign = 'virgo'; // 处女座 8.23-9.22
    } else if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) {
      zodiacSign = 'libra'; // 天秤座 9.23-10.23
    } else if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) {
      zodiacSign = 'scorpio'; // 天蝎座 10.24-11.22
    } else if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) {
      zodiacSign = 'sagittarius'; // 射手座 11.23-12.21
    } else {
      zodiacSign = 'capricorn'; // 摩羯座 12.22-1.19
    }
    
    updates.zodiacSign = zodiacSign;
    
    return updates;
  };

  // 处理表单值变化
  const handleFormChange = (changedValues: any, allValues: any) => {
    debugLog('表单值变化:', changedValues);
    
    // 检查是否修改了出生日期
    if (changedValues.birthDate) {
      const birthDate = changedValues.birthDate;
      
      // 如果birthDate有效，自动计算生肖和星座
      if (birthDate && birthDate.isValid()) {
        const zodiacValues = calculateZodiacFromBirthDate(birthDate, allValues);
        
        // 只有当生肖和星座未手动设置时，才自动计算
        if (Object.keys(zodiacValues).length > 0) {
          // 延迟更新以避免与当前更改冲突
          setTimeout(() => {
            form.setFieldsValue(zodiacValues);
            debugLog('已自动计算生肖和星座:', zodiacValues);
          }, 100);
        }
      }
    }
    
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

  // 检查OCR服务是否可用
  const checkOcrConnection = async () => {
    try {
      debugLog('检查OCR服务是否可用');
      const isAvailable = await testOcrConnection();
      setOcrApiAvailable(isAvailable);
      
      if (isAvailable) {
        debugLog('OCR服务可用');
        // 显示OCR服务可用的提示
        notification.success({
          message: '身份证OCR识别服务可用',
          description: '您可以上传身份证照片进行自动识别',
          placement: 'topRight',
          duration: 3
        });
      } else {
        debugLog('OCR服务不可用');
        // 显示OCR服务不可用的提示，让用户知道需要手动填写
        notification.info({
          message: '身份证OCR识别功能暂不可用',
          description: '后端存储服务配置问题，请手动填写身份证信息',
          placement: 'topRight',
          duration: 5
        });
      }
      
      return isAvailable;
    } catch (error) {
      debugLog('检查OCR服务出错', error);
      setOcrApiAvailable(false);
      message.error('OCR服务检测失败');
      return false;
    }
  };

  // 组件挂载时检查服务连接
  useEffect(() => {
    checkBackendConnection();
    checkOcrConnection();
    
    // 组件卸载时清理预览URLs
    return () => {
      if (previewUrl) {
        revokeImagePreview(previewUrl);
      }
      if (idCardFrontPreview) {
        revokeImagePreview(idCardFrontPreview);
      }
      if (idCardBackPreview) {
        revokeImagePreview(idCardBackPreview);
      }
    };
  }, []);

  // 处理身份证上传
  const handleIdCardUpload = async (type: 'front' | 'back', info: any) => {
    try {
      debugLog(`处理${type === 'front' ? '身份证正面' : '身份证背面'}上传`, info);
      
      // 获取文件对象 - 修复原始文件对象获取问题
      let file = null;
      
      if (info.file && info.file.originFileObj) {
        // 从Upload组件获取文件
        file = info.file.originFileObj;
      } else if (info.file instanceof File) {
        // 直接是File对象
        file = info.file;
      } else if (info.target && info.target.files && info.target.files[0]) {
        // 从input元素获取文件
        file = info.target.files[0];
      }
      
      if (!file) {
        console.error('找不到原始文件对象', info);
        message.error(`${type === 'front' ? '身份证正面' : '身份证背面'}上传失败: 无效的文件对象`);
        return;
      }
      
      // 验证文件类型
      if (!file.type.includes('image')) {
        message.error('请上传图片格式的身份证照片');
        return;
      }
      
      // 记录原始文件大小
      const originalSizeKB = (file.size / 1024).toFixed(2);
      debugLog(`原始${type === 'front' ? '身份证正面' : '身份证背面'}文件大小: ${originalSizeKB} KB`);
      
      // 压缩图片，限制在50KB内
      const compressedFile = await compressImage(file);
      const compressedSizeKB = (compressedFile.size / 1024).toFixed(2);
      
      debugLog(`压缩后${type === 'front' ? '身份证正面' : '身份证背面'}文件大小: ${compressedSizeKB} KB`);
      if (originalSizeKB !== compressedSizeKB) {
        message.success(`${type === 'front' ? '身份证正面' : '身份证背面'}图片已压缩: ${originalSizeKB} KB → ${compressedSizeKB} KB`);
      }
      
      // 创建预览 - 更新UI立即响应，提高用户体验
      const previewUrl = createImagePreview(compressedFile);
      
      // 根据身份证类型更新状态
      if (type === 'front') {
        // 清理旧预览
        if (idCardFrontPreview) {
          revokeImagePreview(idCardFrontPreview);
        }
        setIdCardFrontPreview(previewUrl);
        setIdCardFrontFile(compressedFile);
      } else {
        // 清理旧预览
        if (idCardBackPreview) {
          revokeImagePreview(idCardBackPreview);
        }
        setIdCardBackPreview(previewUrl);
        setIdCardBackFile(compressedFile);
      }
      
      // 仅当上传的是身份证正面且OCR已可用时才尝试OCR识别
      if (type === 'front') {
        debugLog('准备开始OCR识别流程');
        
        // 首先检查OCR是否可用，如果之前检测到可用则直接使用
        let canUseOcr = ocrApiAvailable;
        
        if (!canUseOcr) {
          debugLog('OCR服务可用性未知，开始检测...');
          // 如果OCR不可用，提示用户
          notification.info({
            message: '检测OCR服务状态',
            description: '系统将尝试连接OCR服务，请稍候...',
            placement: 'topRight',
            duration: 3
          });
          
          // 立即开始OCR服务检测
          try {
            canUseOcr = await testOcrConnection();
            setOcrApiAvailable(canUseOcr);
            
            debugLog('OCR服务检测结果:', canUseOcr);
            
            if (!canUseOcr) {
              notification.info({
                message: '身份证OCR识别不可用',
                description: '后端存储服务配置问题，请手动填写身份证信息',
                placement: 'topRight',
                duration: 5
              });
              return; // 不再尝试OCR识别
            }
          } catch (error) {
            debugLog('OCR服务检测失败:', error);
            notification.error({
              message: 'OCR服务检测失败',
              description: '请手动填写身份证信息',
              placement: 'topRight',
              duration: 3
            });
            return; // 不再尝试OCR识别
          }
        }
        
        // 显示加载提示
        message.loading({
          content: '正在识别身份证信息...',
          key: 'ocrLoading',
          duration: 0
        });
        
        debugLog('开始身份证OCR识别请求');
        
        // 使用Promise.race添加超时控制，防止过长等待
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('OCR识别超时')), 15000); // 增加到15秒超时
        });
        
        try {
          // 执行OCR识别，并设置超时限制
          const ocrResultPromise = recognizeIdCard(compressedFile, type);
          const ocrResult = await Promise.race([ocrResultPromise, timeoutPromise]);
          
          // 关闭加载提示
          message.destroy('ocrLoading');
          
          if (ocrResult.success) {
            debugLog('身份证OCR识别成功:', ocrResult);
            notification.success({
              message: '身份证识别成功',
              description: '系统已自动填充相关信息，请检查并补充其他字段',
              placement: 'topRight',
              duration: 3,
            });
            
            // 处理OCR结果并更新表单
            handleOcrResult(ocrResult, form);
          } else {
            debugLog('身份证OCR识别失败:', ocrResult.message);
            
            // 检查是否为腾讯云COS错误
            if (ocrResult.message && ocrResult.message.includes('SecretId')) {
              notification.warning({
                message: '身份证识别服务配置问题',
                description: '后端存储服务认证参数缺失，请手动填写身份证信息',
                placement: 'topRight',
                duration: 5
              });
            } else {
              notification.warning({
                message: '身份证识别未成功',
                description: '请手动填写身份证信息，或重新上传更清晰的照片',
                placement: 'topRight',
                duration: 3
              });
            }
          }
        } catch (ocrError) {
          // 关闭加载提示
          message.destroy('ocrLoading');
          
          debugLog('OCR识别过程中发生错误:', ocrError);
          
          // 检查是否为腾讯云COS错误
          const errorMsg = ocrError.message || '';
          
          if (errorMsg === 'OCR识别超时') {
            notification.warning({
              message: '身份证识别超时',
              description: '请手动填写身份证信息，或稍后重试',
              placement: 'topRight',
              duration: 3
            });
          } else if (errorMsg.includes('SecretId') || errorMsg.includes('All promises were rejected')) {
            notification.error({
              message: '身份证识别服务配置问题',
              description: '后端存储服务认证参数缺失，请手动填写身份证信息',
              placement: 'topRight',
              duration: 5
            });
          } else {
            notification.error({
              message: '身份证识别失败',
              description: `错误: ${errorMsg || '未知错误'}`,
              placement: 'topRight',
              duration: 5
            });
          }
        }
      }
    } catch (error) {
      debugLog('处理身份证上传时出错:', error);
      message.error('上传处理出错，请重试');
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
      const compressingKey = message.loading({
        content: `正在处理${type}文件...`, 
        duration: 0
      });
      
      // 获取原始文件
      const rawFiles = [...newFiles];
      
      // 分类文件
      const pdfFiles = rawFiles.filter(file => file.type === 'application/pdf');
      const imageFiles = rawFiles.filter(file => file.type !== 'application/pdf');
      
      // 显示文件分类信息
      debugLog(`准备处理文件: 共${rawFiles.length}个文件, 其中图片${imageFiles.length}个, PDF${pdfFiles.length}个`);
      
      // 使用批处理方式压缩图片
      let compressedFiles = [];
      
      try {
        // 使用批处理压缩
        if (imageFiles.length > 0) {
          const compressedImages = await batchCompressImages(imageFiles, 3); // 每批处理3个文件
          compressedFiles = [...compressedImages, ...pdfFiles];
        } else {
          compressedFiles = [...pdfFiles];
        }
      } catch (compressionError) {
        console.error('图片批量压缩失败:', compressionError);
        // 如果批量压缩失败，使用原始文件
        compressedFiles = rawFiles;
        message.warning(`${type}压缩失败，将使用原始文件`);
      }
      
      // 根据类型设置文件
      if (type === '个人照片') {
        setPhotoFiles(compressedFiles);
      } else if (type === '技能证书') {
        setCertificateFiles(compressedFiles);
      } else if (type === '体检报告') {
        setMedicalReportFiles(compressedFiles);
      }
      
      // 关闭压缩中提示
      message.destroy(compressingKey);
      
      // 计算总大小
      const totalOriginalSize = rawFiles.reduce((sum, file) => sum + file.size, 0);
      const totalCompressedSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
      
      // 显示处理结果
      const originalSizeKB = (totalOriginalSize / 1024).toFixed(2);
      const compressedSizeKB = (totalCompressedSize / 1024).toFixed(2);
      
      if (pdfFiles.length > 0) {
        message.success(`${type}上传成功: ${originalSizeKB} KB → ${compressedSizeKB} KB (包含${pdfFiles.length}个PDF文件未压缩)`);
      } else {
        message.success(`${type}上传成功: ${originalSizeKB} KB → ${compressedSizeKB} KB`);
      }
    } catch (error) {
      message.error(`${type}处理失败，请重试`);
      console.error(`${type}上传失败:`, error);
    }
  };

  // 处理表单提交
  const handleSubmit = async (/* values: any - this argument will be the event, ignore it */) => {
    // Indicate processing has started
    setLoading(true);
    setSubmitting(true);

    try {
      const formAllValues = await form.validateFields(); // Validate and get all form values

      const cleanValues = safeClone(formAllValues);
      debugLog('表单提交 (通过 validateFields 获取)', cleanValues);

      if (!isEditing) {
        try {
          // 执行查重检查
          // 确保这里的api.resumes.checkDuplicate也使用正确的路径前缀，如果它是axios实例的一部分
          const duplicateCheckResult = await api.resumes.checkDuplicate({ 
            name: cleanValues.name,
            phone: cleanValues.phone,
            idNumber: cleanValues.idNumber,
          });

          debugLog('查重结果:', duplicateCheckResult);

          if (duplicateCheckResult && duplicateCheckResult.isDuplicate) {
            // 找到重复简历，提示用户
            Modal.confirm({
              title: '发现重复简历',
              content: `系统中已存在姓名为 ${cleanValues.name} 的简历记录，确定要继续保存吗？`,
              okText: '继续保存',
              cancelText: '取消',
              onOk: () => {
                debugLog('用户确认继续保存重复简历');
                // setLoading and setSubmitting are already true.
                // continueSubmit will proceed and eventually reset them via finalSubmit's finally block.
                continueSubmit(cleanValues);
              },
              onCancel: () => {
                debugLog('用户取消了重复简历的保存');
                setLoading(false); // Reset states if cancelled
                setSubmitting(false);
              },
            });
            return; // Exit handleSubmit after Modal.confirm is called; further action is handled by Modal's callbacks.
          }
        } catch (error) {
          debugLog('查重失败:', error);
          // 查重失败不阻止提交，但记录错误
          message.warning('简历查重检查失败，将继续提交');
          // Fall through to continueSubmit(cleanValues) below
          // setLoading and setSubmitting remain true
        }
      }

      // If not editing, or if editing, or if duplicate check passed/failed with warning (and no modal return)
      await continueSubmit(cleanValues); // This will eventually call finalSubmit which has a finally block to reset states
    } catch (errorInfo) {
      // This catch is for form.validateFields() errors or other synchronous errors before async ops in continueSubmit
      debugLog('表单校验失败或提交准备阶段出错:', errorInfo);
      // Check if errorInfo is a validation error object from AntD
      if (errorInfo && typeof errorInfo === 'object' && 'errorFields' in errorInfo && Array.isArray(errorInfo.errorFields) && errorInfo.errorFields.length > 0) {
        message.error('表单校验失败，请检查红色标记的字段。');
      } else {
        message.error('提交处理时发生错误，请重试。'); // <--- CORRECTED SYNTAX (removed stray backslash)
      }
      setLoading(false);
      setSubmitting(false);
    }
    // setLoading and setSubmitting are primarily reset by finalSubmit's finally block
    // or by the catch block here, or by Modal's onCancel.
  };

  // 继续提交流程
  const continueSubmit = async (values: any) => {
    setSubmitting(true);
    setLoading(true);
    
    // 使用带倒计时的加载提示
    const loadingKey = 'submitLoading';
    message.loading({
      content: '正在处理文件，请稍候...',
      key: loadingKey,
      duration: 0
    });
    
    // 先上传所有文件
    const fileUrls: any = {
      idCardFrontUrl: '',
      idCardBackUrl: '',
      photoUrls: [],
      certificateUrls: [],
      medicalReportUrls: []
    };
    
    let uploadSuccess = true;
    let uploadError = null;
    let isCosError = false;
    
    // 创建一个超时Promise
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('提交超时，请稍后重试')), 60000); // 60秒超时
    });
    
    try {
      // 清理内存与缓存，为上传做准备
      clearCompressionCache();
      
      // 上传身份证正面
      if (idCardFrontFile) {
        const formData = new FormData();
        formData.append('file', idCardFrontFile);
        try {
          // 更新加载提示
          message.loading({
            content: '正在上传身份证正面...',
            key: loadingKey,
            duration: 0
          });
          
          const response = await Promise.race([
            axios.post(`/api/upload/id-card/front`, formData),
            timeout
          ]);
          
          fileUrls.idCardFrontUrl = response.data.url;
        } catch (error) {
          uploadError = error;
          uploadSuccess = false;
          console.error('上传身份证正面失败:', error);
          
          // 检查是否是COS配置错误
          const errorMsg = error.response?.data?.message || error.message || '';
          if (errorMsg.includes('SecretId') || errorMsg.includes('COS')) {
            isCosError = true;
          }
          
          throw new Error(`上传身份证正面失败: ${error.response?.status || '网络错误'}`);
        }
      } 
      
      // 上传身份证背面
      if (idCardBackFile) {
        const formData = new FormData();
        formData.append('file', idCardBackFile);
        try {
          // 更新加载提示
          message.loading({
            content: '正在上传身份证背面...',
            key: loadingKey,
            duration: 0
          });
          
          const response = await Promise.race([
            axios.post(`/api/upload/id-card/back`, formData),
            timeout
          ]);
          
          fileUrls.idCardBackUrl = response.data.url;
        } catch (error) {
          uploadError = error;
          uploadSuccess = false;
          console.error('上传身份证背面失败:', error);
          
          // 检查是否是COS配置错误
          const errorMsg = error.response?.data?.message || error.message || '';
          if (errorMsg.includes('SecretId') || errorMsg.includes('COS')) {
            isCosError = true;
          }
          
          throw new Error(`上传身份证背面失败: ${error.response?.status || '网络错误'}`);
        }
      }
      
      // 使用批量上传函数处理多文件上传
      try {
        // 更新加载提示
        if (photoFiles.length > 0) {
          message.loading({
            content: `正在上传个人照片(${photoFiles.length}张)...`,
            key: loadingKey,
            duration: 0
          });
          
          await batchUploadFiles(photoFiles, 'photo', fileUrls.photoUrls);
        }
        
        if (certificateFiles.length > 0) {
          message.loading({
            content: `正在上传证书(${certificateFiles.length}份)...`,
            key: loadingKey,
            duration: 0
          });
          
          await batchUploadFiles(certificateFiles, 'certificate', fileUrls.certificateUrls);
        }
        
        if (medicalReportFiles.length > 0) {
          message.loading({
            content: `正在上传体检报告(${medicalReportFiles.length}份)...`,
            key: loadingKey,
            duration: 0
          });
          
          await batchUploadFiles(medicalReportFiles, 'medical-report', fileUrls.medicalReportUrls);
        }
      } catch (error) {
        uploadError = error;
        uploadSuccess = false;
        console.error('批量上传文件失败:', error);
        
        // 检查是否是COS配置错误
        const errorMsg = error.response?.data?.message || error.message || '';
        if (errorMsg.includes('SecretId') || errorMsg.includes('COS')) {
          isCosError = true;
        } else if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
          throw new Error('文件上传超时，请稍后重试或减少文件数量');
        } else {
          throw new Error(`上传文件失败: ${errorMsg || '网络错误'}`);
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
        
        // 使用安全的数组克隆方法，确保没有循环引用
        fileUrls.photoUrls = [
          ...safeClone(fileUrls.photoUrls), 
          ...safeClone(existingPhotoUrls)
        ];
        
        fileUrls.certificateUrls = [
          ...safeClone(fileUrls.certificateUrls), 
          ...safeClone(existingCertificateUrls)
        ];
        
        fileUrls.medicalReportUrls = [
          ...safeClone(fileUrls.medicalReportUrls), 
          ...safeClone(existingMedicalReportUrls)
        ];
      }
      
      // 文件上传完成后更新加载提示
      message.loading({
        content: '文件上传完成，正在提交表单数据...',
        key: loadingKey,
        duration: 0
      });
    } catch (error) {
      console.error('上传文件失败:', error);
      
      // 关闭加载提示并显示错误信息
      message.error({
        content: error.message || '上传文件失败',
        key: loadingKey,
        duration: 3
      });
      
      // 如果是COS错误，提示用户并询问是否继续提交
      if (isCosError) {
        Modal.confirm({
          title: '文件上传服务配置问题',
          content: '由于腾讯云COS配置缺失，文件上传失败。您可以选择跳过文件上传，仅保存基本信息，或者取消提交。',
          okText: '仅保存基本信息',
          cancelText: '取消提交',
          onCancel: () => {
            message.info('已取消提交');
            setLoading(false);
            setSubmitting(false);
          },
          onOk: () => {
            // 继续提交，但跳过文件上传部分
            debugLog('用户选择仅保存基本信息');
            // 确保最终传入的数据是安全的
            const safeFileUrls = safeClone(fileUrls);
            finalSubmit(values, safeFileUrls);
          }
        });
        return;
      }
      
      const errorMessage = error.response?.status === 500 
        ? '服务器错误：文件上传失败（HTTP 500）' 
        : `上传文件失败: ${error.message || '未知错误'}`;
      message.error(errorMessage);
      setLoading(false);
      setSubmitting(false);
      return;
    }
    
    // 如果文件上传成功，继续提交表单数据
    await finalSubmit(values, safeClone(fileUrls));
  };
  
  // MongoDB错误时临时保存表单数据
  const saveFormDataLocally = (formData: any) => {
    try {
      // 创建需要保存的数据的深拷贝
      const dataToSave = JSON.parse(JSON.stringify(formData));
      
      // 转换日期对象为字符串
      if (dataToSave.birthDate && typeof dataToSave.birthDate === 'object') {
        dataToSave.birthDate = dayjs(dataToSave.birthDate).format('YYYY-MM-DD');
      }
      
      // 处理工作经验中的日期
      if (dataToSave.workExperiences) {
        dataToSave.workExperiences = dataToSave.workExperiences.map(exp => ({
          ...exp,
          startDate: exp.startDate ? dayjs(exp.startDate).format('YYYY-MM') : undefined,
          endDate: exp.endDate ? dayjs(exp.endDate).format('YYYY-MM') : undefined
        }));
      }
      
      // 保存到localStorage
      localStorage.setItem('resumeFormBackup', JSON.stringify(dataToSave));
      return true;
    } catch (e) {
      console.error('保存表单数据到本地失败:', e);
      return false;
    }
  };

  // 最终提交表单数据
  const finalSubmit = async (values: any, fileUrls: any) => {
    const loadingKey = 'submitLoading';
    
    try {
      // 合并所有表单数据并深度克隆以去除循环引用
      const allFormData = safeClone({ ...values });
      
      // 转换性别值为英文（确保数据库保存的是英文格式）
      if (allFormData.gender) {
        allFormData.gender = allFormData.gender === '男' ? 'male' : 
                             allFormData.gender === '女' ? 'female' : 
                             allFormData.gender;
      }
      
      // 强制处理birthDate为字符串格式 - 使用最简单的方式
      if (allFormData.birthDate) {
        if (typeof allFormData.birthDate === 'object' && typeof allFormData.birthDate.format === 'function') {
          // Dayjs对象
          allFormData.birthDate = allFormData.birthDate.format('YYYY-MM-DD');
        } else if (typeof allFormData.birthDate !== 'string') {
          // 尝试转换其他类型
          try {
            const date = new Date(allFormData.birthDate);
            if (!isNaN(date.getTime())) {
              allFormData.birthDate = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'格式
            } else {
              delete allFormData.birthDate; // 如果无效，移除该字段
            }
          } catch (e) {
            delete allFormData.birthDate; // 无法转换则移除
          }
        }
      }
      
      // 简化工作经验处理 - 完全移除该字段（后端日志显示它可能导致问题）
      delete allFormData.workExperiences;
      delete allFormData.workExperience;
      
      // 确保所有数字类型字段都是数字而非字符串
      if (allFormData.age && typeof allFormData.age === 'string') {
        allFormData.age = parseInt(allFormData.age, 10);
      }
      
      if (allFormData.expectedSalary && typeof allFormData.expectedSalary === 'string') {
        allFormData.expectedSalary = parseInt(allFormData.expectedSalary, 10);
      }
      
      // 确保所有必填字段都有值
      if (!allFormData.name) allFormData.name = '';
      if (!allFormData.phone) allFormData.phone = '';
      if (!allFormData.education) allFormData.education = '';
      if (!allFormData.nativePlace) allFormData.nativePlace = '';
      if (!allFormData.jobType) allFormData.jobType = '';
      
      // 确保数值类型字段为数字
      if (allFormData.age === undefined || allFormData.age === null || allFormData.age === '') {
        allFormData.age = 0;
      } else if (typeof allFormData.age === 'string') {
        allFormData.age = parseInt(allFormData.age, 10) || 0;
      }
      
      if (allFormData.experienceYears === undefined || allFormData.experienceYears === null || allFormData.experienceYears === '') {
        allFormData.experienceYears = 0;
      } else if (typeof allFormData.experienceYears === 'string') {
        allFormData.experienceYears = parseInt(allFormData.experienceYears, 10) || 0;
      }
      
      if (allFormData.expectedSalary === undefined || allFormData.expectedSalary === null || allFormData.expectedSalary === '') {
        allFormData.expectedSalary = 0;
      } else if (typeof allFormData.expectedSalary === 'string') {
        allFormData.expectedSalary = parseInt(allFormData.expectedSalary, 10) || 0;
      }
      
      // 准备提交的数据，确保fileUrls也经过安全克隆
      const requestData = {
        ...allFormData,
        // 移除所有可能引起问题的复杂或未使用字段
        ...safeClone(fileUrls)
      };
      
      // 移除可能导致问题的特殊字段
      delete requestData.__proto__;
      delete requestData.constructor;
      delete requestData.prototype;
      
      // 确保没有undefined值
      Object.keys(requestData).forEach(key => {
        if (requestData[key] === undefined) {
          delete requestData[key];
        }
      });
      
      // 移除空的数组字段
      if (Array.isArray(requestData.photoUrls) && requestData.photoUrls.length === 0) {
        delete requestData.photoUrls;
      }
      if (Array.isArray(requestData.certificateUrls) && requestData.certificateUrls.length === 0) {
        delete requestData.certificateUrls;
      }
      if (Array.isArray(requestData.medicalReportUrls) && requestData.medicalReportUrls.length === 0) {
        delete requestData.medicalReportUrls;
      }
      if (Array.isArray(requestData.skills) && requestData.skills.length === 0) {
        delete requestData.skills;
      }
      
      // 确保workExperience字段格式正确
      if (requestData.workExperience && !Array.isArray(requestData.workExperience)) {
        try {
          // 尝试将workExperience字段转换为数组
          requestData.workExperience = [];
        } catch (e) {
          // 如果转换失败，删除该字段
          delete requestData.workExperience;
        }
      }
      
      debugLog('最终提交的简化数据:', requestData);
      
      // 更新加载提示
      message.loading({
        content: '正在保存数据到服务器...',
        key: loadingKey,
        duration: 0
      });
      
      // 判断是编辑还是创建
      const apiUrl = isEditing ? `/api/resumes/${editingResumeId}` : '/api/resumes';
      const method = isEditing ? 'PUT' : 'POST';
      
      // 创建一个超时Promise
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时，请稍后重试')), 30000));
      
      try {
        // 提交表单数据到后端（使用Promise.race添加超时控制）
        console.log('发送简历数据请求:', {
          method: method.toLowerCase(),
          url: apiUrl,
          data: JSON.stringify(requestData)
        });
        
        const response = await Promise.race([
          axios[method.toLowerCase()](apiUrl, requestData),
          timeoutPromise
        ]);
        
        debugLog('提交响应:', response.data);
        
        if (response.data && response.data.success) {
          // 关闭加载提示并显示成功消息
          message.success({
            content: `简历${isEditing ? '更新' : '创建'}成功`,
            key: loadingKey,
            duration: 2
          });
          
          // 更新成功后，清空表单
          form.resetFields();
          
          // 清理预览和文件状态
          if (idCardFrontPreview) {
            revokeImagePreview(idCardFrontPreview);
            setIdCardFrontPreview('');
          }
          if (idCardBackPreview) {
            revokeImagePreview(idCardBackPreview);
            setIdCardBackPreview('');
          }
          
          setIdCardFrontFile(null);
          setIdCardBackFile(null);
          setPhotoFiles([]);
          setCertificateFiles([]);
          setMedicalReportFiles([]);
          
          // 清理图片压缩缓存
          clearCompressionCache();
          
          // 如果是编辑模式，则从localStorage移除编辑数据
          if (isEditing) {
            localStorage.removeItem('editingResume');
          }
          
          // 导航到简历列表页面
          setTimeout(() => {
            navigate('/aunt/resume-list');
          }, 1000);
        } else {
          message.error({
            content: `简历${isEditing ? '更新' : '创建'}失败: ${response.data?.message || '未知错误'}`,
            key: loadingKey,
            duration: 3
          });
        }
      } catch (error) {
        console.error('数据提交错误:', error);
        // 记录详细的错误信息
        console.error('错误详情:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: error.config
        });
        
        const isMongoDB = error.response?.data?.message?.includes('MongoDB') || 
                         error.response?.data?.message?.includes('propertyName') ||
                         error.response?.data?.message?.includes('Cannot read properties');
        
        let errorMessage;
        if (isMongoDB) {
          // 保存表单数据到localStorage
          const savedLocally = saveFormDataLocally(form.getFieldsValue());
          
          errorMessage = '数据库错误：您的表单数据' + 
                        (savedLocally ? '已自动保存到本地' : '无法保存') + 
                        '。请联系管理员解决数据库配置问题。';
        } else if (error.response?.status === 500) {
          // 也尝试保存表单数据
          saveFormDataLocally(form.getFieldsValue());
          errorMessage = '服务器内部错误，您的数据已本地保存，请稍后重试';
        } else if (error.name === 'AbortError' || error.message === '请求超时，请稍后重试') {
          errorMessage = '提交超时，请稍后重试';
        } else {
          errorMessage = `提交失败: ${error.response?.data?.message || error.message || '未知错误'}`;
        }
        
        // 对于数据库错误，显示模态框而不只是普通消息
        if (isMongoDB) {
          Modal.error({
            title: '数据库错误',
            content: (
              <div>
                <p>{errorMessage}</p>
                <p>错误详情: <code>Cannot read properties of undefined (reading 'propertyName')</code></p>
                <p>这是后端MongoDB配置问题，与您填写的数据无关。</p>
                <p>如需恢复已保存的表单，请刷新页面后检查。</p>
              </div>
            ),
            okText: '我知道了'
          });
          message.destroy(loadingKey);
        } else {
          message.error({
            content: errorMessage,
            key: loadingKey,
            duration: 5
          });
        }
      }
    } catch (error) {
      console.error('准备提交数据时出错:', error);
      message.error({
        content: '准备提交数据时出错，请检查表单数据',
        key: loadingKey,
        duration: 3
      });
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
        message.error('加载编辑数据失败');
        localStorage.removeItem('editingResume');
      }
    }
  }, [form, message]);

  // 从OCR结果中提取日期并转换为dayjs对象
  const parseOcrDate = (dateString: string) => {
    if (!dateString) return null;
    
    // 尝试解析常见的日期格式
    const formats = [
      'YYYY年MM月DD日',
      'YYYY年M月D日',
      'YYYY/MM/DD',
      'YYYY-MM-DD',
      'YYYYMMDD'
    ];
    
    // 移除不必要的字符
    const cleanedDateString = dateString.replace(/[^0-9年月日/\-]/g, '');
    
    for (const format of formats) {
      const date = dayjs(cleanedDateString, format);
      if (date.isValid()) {
        return date;
      }
    }
    
    // 如果是身份证号，尝试从中提取出生日期
    if (/^\d{17}[\dXx]$/.test(dateString)) {
      const birthPart = dateString.substring(6, 14);
      const year = birthPart.substring(0, 4);
      const month = birthPart.substring(4, 6);
      const day = birthPart.substring(6, 8);
      return dayjs(`${year}-${month}-${day}`);
    }
    
    return null;
  };

  // 处理身份证OCR识别结果
  const handleOcrResult = (ocrResult: any, formInstance: any) => {
    if (!ocrResult || !ocrResult.success) {
      message.error('识别结果无效，请手动填写信息');
      return;
    }
    
    try {
      debugLog('原始OCR结果:', ocrResult);
      
      // 提取表单数据
      const formData = extractIdCardFormData(ocrResult.data);
      console.log('从OCR结果中提取的表单数据:', formData);
      
      if (!formData || Object.keys(formData).length === 0) {
        message.warning('未能从身份证中提取到有效信息，请手动填写');
        return;
      }
      
      // 获取当前表单值
      const currentValues = formInstance.getFieldsValue();
      
      // 需要更新的字段
      const fieldsToUpdate: Record<string, any> = {};
      const updatedFields: string[] = [];
      
      // 添加姓名
      if (formData.name && !currentValues.name) {
        fieldsToUpdate.name = formData.name;
        updatedFields.push('姓名');
      }
      
      // 添加性别（腾讯云OCR直接提供性别）
      if (formData.gender && !currentValues.gender) {
        fieldsToUpdate.gender = formData.gender;
        updatedFields.push('性别');
      }
      
      // 添加民族
      if (formData.ethnicity && !currentValues.ethnicity) {
        fieldsToUpdate.ethnicity = formData.ethnicity;
        updatedFields.push('民族');
      }
      
      // 添加身份证号码
      if (formData.idNumber && !currentValues.idNumber) {
        const idNumber = formData.idNumber.replace(/[^\dXx]/g, ''); // 清除非数字和X的字符
        
        if (/^\d{17}[\dXx]$/.test(idNumber)) {
          fieldsToUpdate.idNumber = idNumber;
          updatedFields.push('身份证号');
          
          // 从身份证号码提取性别（如果腾讯云OCR没有直接提供）
          if (!currentValues.gender && !fieldsToUpdate.gender) {
            // 第17位，奇数为男，偶数为女
            const genderValue = parseInt(idNumber.charAt(16));
            fieldsToUpdate.gender = genderValue % 2 === 1 ? '男' : '女';
            updatedFields.push('性别');
          }
          
          // 从身份证号码提取年龄
          if (!currentValues.age) {
            const birthYear = parseInt(idNumber.substring(6, 10));
            const currentYear = new Date().getFullYear();
            fieldsToUpdate.age = currentYear - birthYear;
            updatedFields.push('年龄');
          }
          
          // 从身份证号码提取出生日期
          if (!currentValues.birthDate) {
            const birthPart = idNumber.substring(6, 14);
            const year = birthPart.substring(0, 4);
            const month = birthPart.substring(4, 6);
            const day = birthPart.substring(6, 8);
            const birthDate = dayjs(`${year}-${month}-${day}`);
            if (birthDate.isValid()) {
              fieldsToUpdate.birthDate = birthDate;
              updatedFields.push('出生日期');
              
              // 计算生肖和星座
              if (!currentValues.zodiac || !currentValues.zodiacSign) {
                const zodiacValues = calculateZodiacFromBirthDate(birthDate, currentValues);
                if (zodiacValues.zodiac && !currentValues.zodiac) {
                  fieldsToUpdate.zodiac = zodiacValues.zodiac;
                  updatedFields.push('生肖');
                }
                if (zodiacValues.zodiacSign && !currentValues.zodiacSign) {
                  fieldsToUpdate.zodiacSign = zodiacValues.zodiacSign;
                  updatedFields.push('星座');
                }
              }
            }
          }
        } else {
          console.error('提取的身份证号码格式不正确:', idNumber);
        }
      }
      
      // 添加户籍地址
      if (formData.hukouAddress && !currentValues.hukouAddress) {
        fieldsToUpdate.hukouAddress = formData.hukouAddress;
        updatedFields.push('户籍地址');
        
        // 尝试从户籍地址中提取省份作为籍贯
        if (!currentValues.nativePlace) {
          // 遍历省份列表，查找匹配项
          for (const province of provinces) {
            if (formData.hukouAddress.startsWith(province)) {
              fieldsToUpdate.nativePlace = province;
              updatedFields.push('籍贯');
              break;
            }
          }
        }
      }
      
      // 添加出生日期（如果身份证号提取失败，则尝试从出生字段提取）
      if (formData.birthDateString && !fieldsToUpdate.birthDate && !currentValues.birthDate) {
        const birthDate = parseOcrDate(formData.birthDateString);
        if (birthDate && birthDate.isValid()) {
          fieldsToUpdate.birthDate = birthDate;
          updatedFields.push('出生日期');
          
          // 计算生肖和星座
          if (!currentValues.zodiac || !currentValues.zodiacSign) {
            const zodiacValues = calculateZodiacFromBirthDate(birthDate, currentValues);
            if (zodiacValues.zodiac && !currentValues.zodiac) {
              fieldsToUpdate.zodiac = zodiacValues.zodiac;
              updatedFields.push('生肖');
            }
            if (zodiacValues.zodiacSign && !currentValues.zodiacSign) {
              fieldsToUpdate.zodiacSign = zodiacValues.zodiacSign;
              updatedFields.push('星座');
            }
          }
        }
      }
      
      // 更新表单
      if (Object.keys(fieldsToUpdate).length > 0) {
        debugLog('将更新以下字段:', fieldsToUpdate);
        formInstance.setFieldsValue(fieldsToUpdate);
        
        // 显示成功消息，列出已填充的字段
        if (updatedFields.length > 0) {
          const fieldsList = updatedFields.join('、');
          notification.success({
            message: '身份证信息填充成功',
            description: `已自动填充: ${fieldsList}`,
            placement: 'topRight',
            duration: 5
          });
        } else {
          message.info('表单已更新');
        }
      } else {
        message.info('未发现需要填充的新信息');
      }
    } catch (error) {
      console.error('处理OCR结果时出错:', error);
      message.error('处理识别结果时出错，请手动填写信息');
    }
  };

  // 批量上传文件，支持重试和错误恢复
  const batchUploadFiles = async (files, category, urlList) => {
    const maxRetries = 2; // 最大重试次数
    const batchSize = 3; // 每批处理的文件数量
    
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i += batchSize) {
      // 获取当前批次的文件
      const batch = files.slice(i, i + batchSize);
      const uploadPromises = batch.map(async (file) => {
        let retryCount = 0;
        let uploaded = false;
        let url = '';
        
        // 尝试上传，支持重试
        while (!uploaded && retryCount <= maxRetries) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            
            // 设置超时
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
            
            const response = await axios.post(
              `/api/upload/file/${category}`, 
              formData,
              { signal: controller.signal }
            );
            
            clearTimeout(timeoutId); // 清除超时
            
            if (response.data && response.data.url) {
              url = response.data.url;
              uploaded = true;
            } else {
              throw new Error('无效的上传响应');
            }
          } catch (error) {
            retryCount++;
            if (retryCount > maxRetries) {
              throw error; // 重试次数用完，抛出错误
            }
            
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000));
            debugLog(`文件 ${file.name} 上传失败，正在进行第 ${retryCount} 次重试...`);
          }
        }
        
        return url;
      });
      
      try {
        // 并行上传当前批次
        const urls = await Promise.all(uploadPromises);
        
        // 将成功的URL添加到列表
        urls.filter(url => url).forEach(url => urlList.push(url));
        
        // 如果还有更多批次，添加短暂延迟
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`批量上传文件失败（类别: ${category}）:`, error);
        throw error;
      }
    }
  };

  // 检查是否有之前保存的表单数据
  useEffect(() => {
    const savedForm = localStorage.getItem('resumeFormBackup');
    if (savedForm) {
      try {
        const formData = JSON.parse(savedForm);
        debugLog('检测到本地保存的表单数据', formData);
        
        // 询问用户是否要恢复之前保存的数据
        Modal.confirm({
          title: '检测到未提交的表单数据',
          content: '发现之前因数据库错误而未能提交的表单数据，是否恢复？',
          okText: '恢复数据',
          cancelText: '不需要',
          onOk: () => {
            // 处理日期字段
            if (formData.birthDate) {
              formData.birthDate = dayjs(formData.birthDate);
            }
            
            // 处理工作经验中的日期
            if (formData.workExperiences && Array.isArray(formData.workExperiences)) {
              formData.workExperiences = formData.workExperiences.map(exp => ({
                ...exp,
                startDate: exp.startDate ? dayjs(exp.startDate) : undefined,
                endDate: exp.endDate ? dayjs(exp.endDate) : undefined
              }));
            }
            
            // 设置表单值
            form.setFieldsValue(formData);
            message.success('表单数据已恢复');
          },
          onCancel: () => {
            localStorage.removeItem('resumeFormBackup');
            message.info('已清除本地表单数据');
          }
        });
      } catch (e) {
        console.error('解析本地表单数据失败:', e);
      }
    }
  }, [form]);

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
                      <Option value="男">男</Option>
                      <Option value="女">女</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Form.Item
                    label="手机号码"
                    name="phone"
                    rules={[{ required: true, message: '请输入手机号码' }]}
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
                  >
                    <Input placeholder="请输入身份证号" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="学历"
                    name="education"
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
                    label="工作经验"
                    name="experienceYears"
                  >
                    <InputNumber min={0} max={50} placeholder="请输入工作经验年限" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                      <Form.Item
                        label="期望薪资"
                        name="expectedSalary"
                        rules={[{ required: true, message: '请输入期望薪资' }]}
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
                          url: file.type.includes('image') ? URL.createObjectURL(file) : undefined,
                          originFileObj: file
                        })),
                        // 已有的证书
                        ...existingCertificateUrls.map((url, index) => ({
                          uid: `existing-${index}`,
                          name: `已有证书 ${index + 1}`,
                          status: 'done',
                          url: url.toLowerCase().endsWith('.pdf') ? undefined : url,
                          thumbUrl: url.toLowerCase().endsWith('.pdf') ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAALrSURBVGiB7ZZNSFRRFMd/980M5lCjUoiNJtqkmR8ItUhcGNRCKKhFuogkXIgfCzcqLdq0KoQIAqEPaCG0CTOJcrJAUHDjB0hqYlKgLHJmnDed865vmWN2Z+a+Nx23//Lg3XPPPff/P+e+d+97FhGYqVGzJRRvACJiA9oAB9AIrI8TLwhMAT5gFLgpIr5oAW0xwm1Ap4i0W8PVbkTkGpAGnBOR0+GxEQFEJBO4ChwVERuiYiJyDfgC9IVLEhoQkZ3AY0BKCPcpd133eywdJ8tybDQSETuGYXSKyIFwPzug1Qp3bNmyZU93d/eEbduxNChLA9d1La35+PETent7jwH7ReQ9VA8hEWkGbgMYhjHS19d3qa+vT0TEmqvJwrIs0eqqVCqq9p6fn19YWVm5FthvA9qAeoALFy70GIYxUtugKok6LfN5AMlAEwBVVVVtdc23cpmmmQLYReQ7wL179/64c+fOdN2TrVS6rvtTq/cDvgCg67pn7dq12yoqKpKL3ZqjdPpwHGdWqz8C8ATwaMr+/v6enJwcc65brKuru+H1epdLpVKB53n3FqrVs4EQKf90PNc9DMwCPykghPx2YFZTdgGngBSt/hR4vsA6KTIgGHQBnwBfnRqIFbwBxBtAvAHEG0C8AcQbQLwBxBtAvAH89wBExG4YRsxvZtOUctrp+/6g4ziD0+OmU36NypIsJY/66RudtLQ0MU3zY0dHx+7FgCkpKaG0tHQWQGZmpgBXqqqquoF7ixmAptm9MJDrurZpmj+AjMbGxsC2bdvWNDc3r9Lpj0qz3t7eD+Xl5ed0XRdgCjisxNdQP5biOI6taVoB0FVUVFTudDpzNE2LailKsizleR4i8sPzvJH5QAM4juPOzMxcAd4qiqI0NDSU7t27NzkaiFDzer3+paWlwcnJyfHFTJ+xVIZh2IHUhoYGbWJiYjwQCCxo+lQqFcvLy30LCgpK9+3bt3MxEMOUoihB0zTdVatW+eLUf9n6C/G3z8hTZStxAAAAAElFTkSuQmCC' : undefined,
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
                      accept=".jpg,.jpeg,.png,.pdf"
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