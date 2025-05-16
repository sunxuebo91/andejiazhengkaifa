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

// 设置 axios 默认配置
// API请求通过vite代理转发
axios.defaults.withCredentials = true;
axios.defaults.timeout = 10000;

// 定义图片压缩选项
const compressionOptions = {
  maxSizeMB: 0.05,      // 50KB = 0.05MB
  maxWidthOrHeight: 1024,
  useWebWorker: true
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
      // 使用相对路径，Vite代理会自动处理
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
    debugLog(`${type === 'front' ? '身份证正面' : '身份证背面'}上传信息:`, info);
    
    if (!info || !info.file) {
      console.error(`${type === 'front' ? '身份证正面' : '身份证背面'}文件上传失败: 未获取到文件信息`);
        return;
      }

    // 获取文件对象
    const file = info.file.originFileObj || info.file;
    
    if (!file) {
      console.error(`${type === 'front' ? '身份证正面' : '身份证背面'}文件上传失败: 未获取到文件对象`);
        return;
      }
    
    // 显示图片预览
    try {
      debugLog(`${type === 'front' ? '身份证正面' : '身份证背面'}文件信息:`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      // 压缩图片
      const compressedFile = await compressImage(file);

      // 设置状态
      if (type === 'front') {
        setIdCardFrontFile(compressedFile);
        
        // 创建URL以显示图片
        try {
          const url = URL.createObjectURL(compressedFile);
          debugLog('身份证正面文件URL创建成功:', url);
        } catch (error) {
          console.error('身份证正面文件URL创建失败:', error);
        }
        
        // 调用OCR识别API
        try {
          setLoading(true);
          
          // 创建FormData对象
          const formData = new FormData();
          formData.append('idCardImage', compressedFile);
          formData.append('idCardSide', 'front');
          
          console.log('OCR请求表单字段:', 
            Array.from(formData.entries()).map(e => `${e[0]}=${e[1] instanceof File ? e[1].name : e[1]}`).join(', ')
          );
          
          // 直接发送到后端服务器，绕过Vite代理
          const BACKEND_URL = 'http://localhost:3001';
          const response = await axios.post(`${BACKEND_URL}/api/ocr/idcard`, formData, {
            timeout: 30000, // 增加超时时间到30秒
            // 查看请求详情
            onUploadProgress: p => console.log(`上传进度: ${Math.round(p.loaded * 100 / (p.total || 1))}%`)
          });
          
          if (response.data.success) {
            message.success('身份证识别成功');
            
            // 从OCR结果中获取身份证信息
            const idCardData = response.data.data;
            debugLog('身份证OCR识别结果:', idCardData);
            
            // 自动填充表单
            const formValues: any = {};
            
            if (idCardData.words_result) {
              const wordsResult = idCardData.words_result;
              
              // 填充姓名
              if (wordsResult.姓名?.words) {
                formValues.name = wordsResult.姓名.words;
              }
              
              // 填充民族
              if (wordsResult.民族?.words) {
                // 去掉民族字段中的"族"字
                let ethnicity = wordsResult.民族.words;
                if (ethnicity.endsWith('族')) {
                  ethnicity = ethnicity.substring(0, ethnicity.length - 1);
                }
                formValues.ethnicity = ethnicity;
              }
              
              // 填充身份证号
              if (wordsResult.公民身份号码?.words) {
                formValues.idNumber = wordsResult.公民身份号码.words;
                
                // 从身份证号中提取出生日期
                const idNumber = wordsResult.公民身份号码.words;
                if (idNumber && idNumber.length === 18) {
                  // 计算年龄
                  const birthYear = parseInt(idNumber.substring(6, 10));
                  const birthMonth = parseInt(idNumber.substring(10, 12)) - 1; // 月份从0开始
                  const birthDay = parseInt(idNumber.substring(12, 14));
                  const birthDate = new Date(birthYear, birthMonth, birthDay);
                  
                  const today = new Date();
                  let age = today.getFullYear() - birthDate.getFullYear();
                  const m = today.getMonth() - birthDate.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                  }
                  
                  formValues.age = age;
                  
                  // 填充出生日期，使用dayjs格式化
                  formValues.birthDate = dayjs(`${birthYear}-${birthMonth+1}-${birthDay}`);
                  
                  // 判断性别: 身份证第17位，奇数为男，偶数为女
                  const genderCode = parseInt(idNumber.charAt(16));
                  formValues.gender = genderCode % 2 === 1 ? '男' : '女';
                }
              }
              
              // 直接从OCR结果中获取出生日期
              if (wordsResult.出生?.words) {
                const birthStr = wordsResult.出生.words;
                if (birthStr && birthStr.length === 8) {
                  const year = birthStr.substring(0, 4);
                  const month = birthStr.substring(4, 6);
                  const day = birthStr.substring(6, 8);
                  // 使用dayjs创建日期对象
                  formValues.birthDate = dayjs(`${year}-${month}-${day}`);
                }
              }
              
              // 填充地址
              if (wordsResult.住址?.words) {
                formValues.hukouAddress = wordsResult.住址.words;
                
                // 从住址中提取省/自治区/直辖市填充籍贯
                const address = wordsResult.住址.words;
                // 遍历provinces数组，查找地址中是否包含某个省份
                for (const province of provinces) {
                  if (address.startsWith(province)) {
                    formValues.nativePlace = province;
                    break;
                  }
                }
              }
              
              // 从出生日期计算生肖和星座
              if (formValues.birthDate) {
                // 计算生肖
                const birthYear = formValues.birthDate.year();
                const zodiacIndex = (birthYear - 4) % 12; // 从鼠年开始，1900年是鼠年
                const zodiacValues = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];
                formValues.zodiac = zodiacValues[zodiacIndex];
                
                // 计算星座
                const month = formValues.birthDate.month() + 1; // dayjs月份从0开始
                const day = formValues.birthDate.date();
                
                // 星座日期范围定义
                if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
                  formValues.zodiacSign = 'aquarius'; // 水瓶座 1.20-2.18
                } else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
                  formValues.zodiacSign = 'pisces'; // 双鱼座 2.19-3.20
                } else if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
                  formValues.zodiacSign = 'aries'; // 白羊座 3.21-4.19
                } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
                  formValues.zodiacSign = 'taurus'; // 金牛座 4.20-5.20
                } else if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) {
                  formValues.zodiacSign = 'gemini'; // 双子座 5.21-6.21
                } else if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) {
                  formValues.zodiacSign = 'cancer'; // 巨蟹座 6.22-7.22
                } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
                  formValues.zodiacSign = 'leo'; // 狮子座 7.23-8.22
                } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
                  formValues.zodiacSign = 'virgo'; // 处女座 8.23-9.22
                } else if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) {
                  formValues.zodiacSign = 'libra'; // 天秤座 9.23-10.23
                } else if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) {
                  formValues.zodiacSign = 'scorpio'; // 天蝎座 10.24-11.22
                } else if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) {
                  formValues.zodiacSign = 'sagittarius'; // 射手座 11.23-12.21
      } else {
                  formValues.zodiacSign = 'capricorn'; // 摩羯座 12.22-1.19
                }
              }
            }
            
            // 更新表单
            debugLog('自动填充表单数据:', formValues);
            form.setFieldsValue(formValues);
          } else {
            message.error(`身份证识别失败: ${response.data.message}`);
          }
        } catch (error) {
          console.error('OCR识别请求出错:', error);
          if (error.code === 'ECONNABORTED') {
            message.error('身份证识别服务响应超时，请稍后重试或手动输入身份证信息');
          } else if (error.response) {
            message.error(`身份证识别失败: ${error.response.data?.message || '服务器错误'}`);
          } else {
            message.error('身份证识别服务异常，请手动输入身份证信息');
          }
        } finally {
          setLoading(false);
        }
      } else {
        setIdCardBackFile(compressedFile);
        
        try {
          const url = URL.createObjectURL(compressedFile);
          debugLog('身份证背面文件URL创建成功:', url);
        } catch (error) {
          console.error('身份证背面文件URL创建失败:', error);
        }
        
        // 调用OCR识别API处理身份证背面
        try {
          setLoading(true);
          
          // 创建FormData对象
          const formData = new FormData();
          formData.append('idCardImage', compressedFile);
          formData.append('idCardSide', 'back');
          
          console.log('OCR请求表单字段(背面):', 
            Array.from(formData.entries()).map(e => `${e[0]}=${e[1] instanceof File ? e[1].name : e[1]}`).join(', ')
          );
          
          // 发送请求到后端 - 注意：不要手动设置Content-Type，让axios自动处理
          const response = await axios.post('/api/ocr/idcard', formData, {
            timeout: 30000, // 增加超时时间到30秒
            // 查看请求详情
            onUploadProgress: p => console.log(`上传进度(背面): ${Math.round(p.loaded * 100 / (p.total || 1))}%`)
          });
          
          if (response.data.success) {
            message.success('身份证背面识别成功');
            debugLog('身份证背面OCR识别结果:', response.data.data);
            // 背面通常包含签发机关等信息，可以根据需要提取
          } else {
            message.error(`身份证背面识别失败: ${response.data.message}`);
          }
        } catch (error) {
          console.error('OCR识别请求出错:', error);
          if (error.code === 'ECONNABORTED') {
            message.error('身份证背面识别服务响应超时，请稍后重试');
          } else if (error.response) {
            message.error(`身份证背面识别失败: ${error.response.data?.message || '服务器错误'}`);
          } else {
            message.error('身份证背面识别服务异常');
          }
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error(`${type === 'front' ? '身份证正面' : '身份证背面'}处理错误:`, error);
      message.error(`${type === 'front' ? '身份证正面' : '身份证背面'}上传失败`);
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
      const compressingKey = message.loading('正在处理文件...');
      
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
      message.destroy(compressingKey);
      
      // 计算总大小
      const totalOriginalSize = rawFiles.reduce((sum, file) => sum + file.size, 0);
      const totalCompressedSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
      
      // 显示处理结果
      const originalSizeKB = (totalOriginalSize / 1024).toFixed(2);
      const compressedSizeKB = (totalCompressedSize / 1024).toFixed(2);
      
      message.success(`${type}上传成功: ${originalSizeKB} KB → ${compressedSizeKB} KB`);
    } catch (error) {
      message.error(`${type}处理失败，请重试`);
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
        { key: 'expectedSalary', label: '期望薪资' },
        // 移除了currentAddress, ethnicity, education, serviceArea的必填验证
      ];
      
      // 检查是否有未填写的必填字段
      const missingFields = requiredFields.filter(field => !values[field.key]);
      if (missingFields.length > 0) {
        const missingLabels = missingFields.map(field => field.label).join(', ');
        message.error(`请填写以下必填字段: ${missingLabels}`);
        return;
      }

      // 查重检查 - 在提交前检查手机号和身份证号是否已存在
      try {
        message.loading('正在检查数据...');
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
            message.destroy(); // 清除loading消息
            return;
          }
        }
      } catch (error) {
        console.error('查重检查失败:', error);
        // 查重失败不阻止提交，但记录错误
        message.warning('简历查重检查失败，将继续提交');
      }

      setSubmitting(true);
      setLoading(true);
      message.loading('正在处理文件，请稍候...');
      
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
        message.error('上传文件失败，请重试');
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
        message.success(isEditing ? '简历更新成功' : '简历创建成功');
        
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
          message.error(`${isEditing ? '更新' : '创建'}失败: ${error.response.data?.message || '未知错误'}`);
          } else {
          message.error(`${isEditing ? '更新' : '创建'}失败，请检查网络连接`);
        }
        console.error('提交失败:', error);
      }
    } catch (error) {
      console.error('表单提交错误:', error);
      message.error(`${isEditing ? '更新' : '创建'}失败，请检查表单`);
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