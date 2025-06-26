import React, { useState, useRef } from 'react';
// import { useNavigate } from 'react-router-dom'; // 暂时不需要
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Input, 
  Form, 
  Steps, 
  Row,
  Col,
  Alert,
  Select,
  Modal,
  Spin,
  AutoComplete,
  Tag,
  App,
  Checkbox
} from 'antd';
import { 
  ArrowLeftOutlined,
  UserOutlined,
  SearchOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import esignService from '../../services/esignService';
import { customerService } from '../../services/customerService';
import { contractService } from '../../services/contractService';
import { JobType, JOB_TYPE_MAP } from '../../types/resume';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// 服务项目选项
const SERVICE_OPTIONS = [
  '做饭',
  '做早餐',
  '做午餐', 
  '做晚餐',
  '买菜',
  '熨烫衣服',
  '洗衣服',
  '打扫卫生',
  '照顾老人',
  '照顾孩子',
  '辅助照顾老人\\孩子',
  '科学合理的喂养指导，保障婴幼儿生长发育的营养需要',
  '婴幼儿洗澡、洗头、清洗五官',
  '婴幼儿换洗衣物、尿不湿等，保障婴幼儿卫生、干爽、预防尿布疹',
  '为婴幼儿进行抚触、被动操、安抚哭闹、呵护入睡',
  '随时对婴幼儿的身体状况（如摄入量、大小便、皮肤、体温等）进行观察，协助护理婴幼儿常见疾病。',
  '婴幼儿房间的卫生、通风，奶瓶、餐具的清洁消毒',
  '婴幼儿的早期教育和正确引导',
  '婴幼儿的辅食制作及喂养',
  '做儿童早餐',
  '做儿童中餐',
  '做儿童晚餐',
  '手洗儿童衣服',
  '熨烫儿童衣服',
  '整理儿童玩具、书籍',
  '接送孩子上学、课外辅导'
];



interface UserSearchResult {
  id: string;
  name: string;
  phone: string;
  idCard?: string;
  type: 'customer' | 'worker';
  source: string;
  // 扩展字段
  address?: string;
  age?: number;
  gender?: string;
  nativePlace?: string;
  salary?: string;
  // 客户特有字段
  customerAddress?: string;
  // 阿姨特有字段
  expectedSalary?: string;
  workExperience?: string;
  education?: string;
}

// 数字转中文大写金额的函数
const convertToChineseAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '零元整';
  
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟'];
  const bigUnits = ['', '万', '亿'];
  
  if (num === 0) return '零元整';
  
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  let result = '';
  
  // 处理整数部分
  if (integerPart === 0) {
    result = '零';
  } else {
    const intStr = integerPart.toString();
    const len = intStr.length;
    
    for (let i = 0; i < len; i++) {
      const digit = parseInt(intStr[i]);
      const pos = len - i - 1;
      const unitIndex = pos % 4;
      const bigUnitIndex = Math.floor(pos / 4);
      
      if (digit !== 0) {
        result += digits[digit] + units[unitIndex];
        if (unitIndex === 0 && bigUnitIndex > 0) {
          result += bigUnits[bigUnitIndex];
        }
      } else if (result && !result.endsWith('零')) {
        result += '零';
      }
    }
    
    // 清理多余的零
    result = result.replace(/零+/g, '零').replace(/零$/, '');
  }
  
  result += '元';
  
  // 处理小数部分
  if (decimalPart === 0) {
    result += '整';
  } else {
    const jiao = Math.floor(decimalPart / 10);
    const fen = decimalPart % 10;
    
    if (jiao > 0) {
      result += digits[jiao] + '角';
    }
    if (fen > 0) {
      result += digits[fen] + '分';
    }
  }
  
  return result;
};

const ESignatureStepPage: React.FC = () => {
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [form] = Form.useForm();
  const [step2Form] = Form.useForm();
  const [contractResult, setContractResult] = useState<any>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  // const navigate = useNavigate(); // 暂时不需要
  
  // 步骤数据存储
  const [stepData, setStepData] = useState({
    users: null as any,
    contract: null as any,
    signer: null as any,
    signUrl: '',
    downloadUrl: '',
    selectedPartyA: undefined as UserSearchResult | undefined,
    selectedPartyB: undefined as UserSearchResult | undefined,
    localContractId: undefined as string | undefined
  });

  // 步骤2相关状态
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  // 搜索相关状态
  const [partyASearchResults, setPartyASearchResults] = useState<UserSearchResult[]>([]);
  const [partyBSearchResults, setPartyBSearchResults] = useState<UserSearchResult[]>([]);
  const [partyASearchValue, setPartyASearchValue] = useState('');
  const [partyBSearchValue, setPartyBSearchValue] = useState('');

  // 步骤5相关状态
  const [statusLoading, setStatusLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [contractStatus, setContractStatus] = useState<any>(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState({
    force: 1, // 默认强制下载
    downloadFileType: 1 // 默认PDF文件
  });

  // 有效期选择相关状态
  const [validityType, setValidityType] = useState('90'); // 默认90天
  const [customDays, setCustomDays] = useState('');

  // 🔥 最终修复：使用 ref 来存储服务备注的真实选择，绕过 antd form 的 state 覆盖问题
  const serviceRemarksRef = useRef<string[]>([]);

  const steps = [
    {
      title: '添加陌生用户',
      content: 'step1',
      description: '添加甲方（客户）和乙方（阿姨）用户'
    },
    {
      title: '上传待签署文件',
      content: 'step2',
      description: '选择合同模板，填写合同信息'
    },
    {
      title: '添加签署方',
      content: 'step3',
      description: '添加签署方，自动返回signUrl'
    },
    {
      title: '打开签署链接',
      content: 'step4',
      description: '打开签署链接进行实名认证和签署'
    },
    {
      title: '下载合同',
      content: 'step5',
      description: '下载已签署的合同'
    }
  ];

  // 搜索用户（客户库 + 阿姨简历库）
  const searchUsers = async (searchText: string): Promise<UserSearchResult[]> => {
    if (!searchText || searchText.length < 2) {
      return [];
    }

    setSearchLoading(true);
    const results: UserSearchResult[] = [];

    try {
      // 搜索客户库
      const customerResponse = await customerService.getCustomers({
        search: searchText,
        limit: 5
      });

      if (customerResponse.customers) {
        customerResponse.customers.forEach(customer => {
          results.push({
            id: customer._id,
            name: customer.name,
            phone: customer.phone,
            idCard: customer.idCardNumber,
            type: 'customer',
            source: '客户库',
            address: customer.address,
            customerAddress: customer.address,
            age: customer.ageRequirement ? parseInt(customer.ageRequirement) : undefined,
            gender: customer.genderRequirement,
            nativePlace: customer.originRequirement
          });
        });
      }

      // 搜索阿姨简历库
      const workerResponse = await contractService.searchWorkers(searchText, 5);
      
      if (workerResponse && Array.isArray(workerResponse)) {
        workerResponse.forEach((worker: any) => {
          results.push({
            id: worker._id,
            name: worker.name,
            phone: worker.phone,
            idCard: worker.idNumber,
            type: 'worker',
            source: '阿姨简历库',
            address: worker.currentAddress,
            age: worker.age,
            gender: worker.gender === 1 ? '女' : worker.gender === 2 ? '男' : '女', // 默认女性
            nativePlace: worker.nativePlace,
            salary: worker.expectedSalary ? worker.expectedSalary.toString() : undefined,
            expectedSalary: worker.expectedSalary ? worker.expectedSalary.toString() : undefined,
            workExperience: worker.workExperience ? worker.workExperience.toString() : undefined,
            education: worker.education
          });
        });
      }
      
    } catch (error) {
      console.error('搜索用户失败:', error);
      message.error('搜索用户失败');
    } finally {
      setSearchLoading(false);
    }

    // 去重：如果同一个手机号在两个数据源中都存在，优先显示客户库的数据
    const uniqueResults = results.reduce((acc: UserSearchResult[], current) => {
      const existingIndex = acc.findIndex(item => item.phone === current.phone);
      if (existingIndex >= 0) {
        // 如果已存在相同手机号，优先保留客户库数据
        if (current.type === 'customer') {
          acc[existingIndex] = current;
        }
      } else {
        acc.push(current);
      }
      return acc;
    }, []);

    return uniqueResults;
  };

  // 处理甲方搜索
  const handlePartyASearch = async (value: string) => {
    setPartyASearchValue(value);
    if (value) {
      const results = await searchUsers(value);
      setPartyASearchResults(results);
    } else {
      setPartyASearchResults([]);
    }
  };

  // 处理乙方搜索
  const handlePartyBSearch = async (value: string) => {
    setPartyBSearchValue(value);
    if (value) {
      const results = await searchUsers(value);
      setPartyBSearchResults(results);
    } else {
      setPartyBSearchResults([]);
    }
  };

  // 选择甲方用户
  const handlePartyASelect = (value: string) => {
    const selectedUser = partyASearchResults.find(user => user.phone === value);
    if (selectedUser) {
      form.setFieldsValue({
        partyAName: selectedUser.name,
        partyAMobile: selectedUser.phone,
        partyAIdCard: selectedUser.idCard || ''
      });
      setPartyASearchValue(selectedUser.phone);
      
      // 保存完整的用户信息到stepData中，供步骤2使用
      setStepData(prev => ({
        ...prev,
        selectedPartyA: selectedUser
      }));
      
      message.success(`已选择${selectedUser.source}用户：${selectedUser.name}`);
    }
  };

  // 选择乙方用户
  const handlePartyBSelect = (value: string) => {
    const selectedUser = partyBSearchResults.find(user => user.phone === value);
    if (selectedUser) {
      form.setFieldsValue({
        partyBName: selectedUser.name,
        partyBMobile: selectedUser.phone,
        partyBIdCard: selectedUser.idCard || ''
      });
      setPartyBSearchValue(selectedUser.phone);
      
      // 保存完整的用户信息到stepData中，供步骤2使用
      setStepData(prev => ({
        ...prev,
        selectedPartyB: selectedUser
      }));
      
      message.success(`已选择${selectedUser.source}用户：${selectedUser.name}`);
    }
  };

    // 渲染搜索选项
  const renderSearchOptions = (results: UserSearchResult[]) => {
    return results.map((user, index) => ({
      value: user.phone,
      key: `${user.type}-${user.id}-${index}`, // 使用类型、ID和索引组合作为唯一key
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold' }}>{user.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {user.phone} {user.idCard && `• ${user.idCard.slice(0, 6)}***${user.idCard.slice(-4)}`}
            </div>
          </div>
          <Tag color={user.type === 'customer' ? 'blue' : 'green'}>
            {user.source}
          </Tag>
        </div>
      )
    }));
  };

  // 加载模板列表
  const loadTemplates = async () => {
    try {
      setTemplateLoading(true);
      const templateList = await esignService.getTemplates();
      setTemplates(templateList);
    } catch (error) {
      console.error('加载模板失败:', error);
      message.error('加载模板失败');
    } finally {
      setTemplateLoading(false);
    }
  };

  // 自动计算合同有效期的函数
  const calculateValidityTime = () => {
    const formValues = step2Form.getFieldsValue();
    
    // 获取时间字段值
    const startYear = formValues.templateParams?.['开始年'];
    const startMonth = formValues.templateParams?.['开始月'];
    const startDay = formValues.templateParams?.['开始日'];
    const endYear = formValues.templateParams?.['结束年'];
    const endMonth = formValues.templateParams?.['结束月'];
    const endDay = formValues.templateParams?.['结束日'];
    
    // 如果所有时间字段都有值，则计算天数差
    if (startYear && startMonth && startDay && endYear && endMonth && endDay) {
      try {
        // 创建开始和结束日期
        const startDate = new Date(startYear, startMonth - 1, startDay);
        const endDate = new Date(endYear, endMonth - 1, endDay);
        
        // 计算天数差
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        // 确保天数为正数，至少为1天
        const validityDays = Math.max(1, daysDiff + 1); // +1 因为包含开始和结束日期
        
        // 自动填充到有效期字段
        step2Form.setFieldsValue({
          validityTime: validityDays
        });
        
        console.log('自动计算有效期:', {
          startDate: `${startYear}-${startMonth}-${startDay}`,
          endDate: `${endYear}-${endMonth}-${endDay}`,
          validityDays
        });
      } catch (error) {
        console.error('计算有效期时出错:', error);
      }
    }
  };

  // 当进入步骤2时加载模板并设置默认值
  React.useEffect(() => {
    if (currentStep === 1) {
      loadTemplates();
      
      // 设置表单默认值
      const defaultValues = {
        validityTime: '90', // 默认90天，与下拉选择的默认值保持一致
        signOrder: 1,
        readSeconds: 5,
        needAgree: 0,
        autoExpand: 1,
        refuseOn: 0,
        autoContinue: 0,
        viewFlg: 0,
        enableDownloadButton: 1
      };
      
      step2Form.setFieldsValue(defaultValues);
      
      // 设置有效期下拉选择的默认值
      setValidityType('90');
      
      // 如果有步骤1的用户数据，这些数据会在getInitialValues中使用
      if (stepData.users?.batchRequest) {
        // 数据会在renderStep2的getInitialValues中自动填充
      }
    }
  }, [currentStep, stepData.users]);

  // 监听时间字段变化，自动计算有效期
  React.useEffect(() => {
    if (currentStep === 1) {
      // 设置默认时间值并计算有效期
      const currentDate = new Date();
      const nextYearDate = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());
      
      const defaultTimeValues = {
        templateParams: {
          '开始年': currentDate.getFullYear(),
          '开始月': currentDate.getMonth() + 1,
          '开始日': currentDate.getDate(),
          '结束年': nextYearDate.getFullYear(),
          '结束月': nextYearDate.getMonth() + 1,
          '结束日': nextYearDate.getDate()
        }
      };
      
      // 设置默认时间值
      step2Form.setFieldsValue(defaultTimeValues);
      
      // 计算默认有效期
      setTimeout(() => {
        calculateValidityTime();
      }, 100); // 延迟一点确保表单值已设置
    }
  }, [currentStep]);



  // 步骤2提交处理
  const handleStep2Submit = async (values: any) => {
    try {
      setLoading(true);
      console.log('提交合同创建数据:', values);

      // 生成合同编号
      const contractNo = `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 填充甲乙双方信息到模板参数 - 只保留模板真正需要的字段
      const enhancedTemplateParams = {
        ...values.templateParams,
        // 只映射模板控件真正需要的字段，避免重复
        // 甲方（客户）信息 - 使用模板控件要求的字段名
        '客户姓名': values.templateParams?.['客户姓名'] || stepData.users?.batchRequest?.partyAName,
        '客户电话': values.templateParams?.['客户电话'] || values.templateParams?.['甲方电话'] || values.templateParams?.['甲方联系电话'] || stepData.users?.batchRequest?.partyAMobile,
        '客户身份证号': values.templateParams?.['客户身份证号'] || values.templateParams?.['甲方身份证'] || values.templateParams?.['甲方身份证号'] || stepData.users?.batchRequest?.partyAIdCard,
        // 乙方（阿姨）信息 - 使用模板控件要求的字段名
        '阿姨姓名': values.templateParams?.['阿姨姓名'] || values.templateParams?.['乙方姓名'] || stepData.users?.batchRequest?.partyBName,
        '阿姨电话': values.templateParams?.['阿姨电话'] || values.templateParams?.['乙方电话'] || stepData.users?.batchRequest?.partyBMobile,
        '阿姨身份证号': values.templateParams?.['阿姨身份证号'] || values.templateParams?.['乙方身份证'] || stepData.users?.batchRequest?.partyBIdCard,
        // 服务费相关 - 自动生成大写金额
        '大写服务费': values.templateParams?.['大写服务费'] || convertToChineseAmount(values.templateParams?.['服务费'] || '0'),
        '匹配费大写': values.templateParams?.['匹配费大写'] || convertToChineseAmount(values.templateParams?.['匹配费'] || '0'),
        '阿姨工资大写': values.templateParams?.['阿姨工资大写'] || convertToChineseAmount(values.templateParams?.['阿姨工资'] || '0'),
        // 时间相关字段 - 合并分别的年月日为完整格式
        '服务开始时间': `${values.templateParams?.['开始年'] || new Date().getFullYear()}年${values.templateParams?.['开始月'] || (new Date().getMonth() + 1)}月${values.templateParams?.['开始日'] || new Date().getDate()}日`,
        '服务结束时间': `${values.templateParams?.['结束年'] || (new Date().getFullYear() + 1)}年${values.templateParams?.['结束月'] || (new Date().getMonth() + 1)}月${values.templateParams?.['结束日'] || new Date().getDate()}日`,
        '合同开始时间': `${values.templateParams?.['开始年'] || new Date().getFullYear()}年${values.templateParams?.['开始月'] || (new Date().getMonth() + 1)}月${values.templateParams?.['开始日'] || new Date().getDate()}日`,
        '合同结束时间': `${values.templateParams?.['结束年'] || (new Date().getFullYear() + 1)}年${values.templateParams?.['结束月'] || (new Date().getMonth() + 1)}月${values.templateParams?.['结束日'] || new Date().getDate()}日`,
        '服务期限': `${values.templateParams?.['开始年'] || new Date().getFullYear()}年${values.templateParams?.['开始月'] || (new Date().getMonth() + 1)}月${values.templateParams?.['开始日'] || new Date().getDate()}日至${values.templateParams?.['结束年'] || (new Date().getFullYear() + 1)}年${values.templateParams?.['结束月'] || (new Date().getMonth() + 1)}月${values.templateParams?.['结束日'] || new Date().getDate()}日`,
        // 保留原有的分别字段，方便模板按需使用
        '开始年': values.templateParams?.['开始年'] || new Date().getFullYear(),
        '开始月': values.templateParams?.['开始月'] || (new Date().getMonth() + 1),
        '开始日': values.templateParams?.['开始日'] || new Date().getDate(),
        '结束年': values.templateParams?.['结束年'] || (new Date().getFullYear() + 1),
        '结束月': values.templateParams?.['结束月'] || (new Date().getMonth() + 1),
        '结束日': values.templateParams?.['结束日'] || new Date().getDate(),
      };

      // 🔥 最终修复：在提交时，直接使用 ref 中存储的完整服务选项，覆盖掉可能已被破坏的表单值
      if (serviceRemarksRef.current && serviceRemarksRef.current.length > 0) {
        const correctServiceRemarks = serviceRemarksRef.current.join('；');
        enhancedTemplateParams['服务备注'] = correctServiceRemarks;
        console.log(`🔥🔥🔥 前端最终修复：使用 ref 覆盖服务备注，正确值为: "${correctServiceRemarks}"`);
      }

      // 🔥 特殊处理服务备注字段 - 确保多选项目正确传递
      console.log('🔥 前端修复：检查服务备注字段处理');
      Object.keys(enhancedTemplateParams).forEach(key => {
        if (key.includes('服务备注') || key.includes('服务需求') || key.includes('服务内容') || key.includes('服务项目')) {
          const originalValue = enhancedTemplateParams[key];
          console.log(`🔥 服务字段"${key}"原始值:`, originalValue, `(类型: ${typeof originalValue})`);
          
          // 如果是数组，转换为分号分隔的字符串
          if (Array.isArray(originalValue)) {
            const convertedValue = originalValue.join('；');
            enhancedTemplateParams[key] = convertedValue;
            console.log(`🔥 服务字段"${key}"数组转换: [${originalValue.join(', ')}] -> "${convertedValue}"`);
          }
          // 如果是字符串且包含分号，保持不变
          else if (typeof originalValue === 'string' && originalValue.includes('；')) {
            console.log(`🔥 服务字段"${key}"已是分号分隔字符串: "${originalValue}"`);
          }
          // 其他情况保持原值
          else {
            console.log(`🔥 服务字段"${key}"保持原值: "${originalValue}"`);
          }
        }
      });
      
      // 移除可能导致重复显示的字段（这些字段不是模板控件需要的）
      delete enhancedTemplateParams['甲方姓名'];
      delete enhancedTemplateParams['甲方联系电话'];
      delete enhancedTemplateParams['甲方身份证号'];
      delete enhancedTemplateParams['甲方'];
      delete enhancedTemplateParams['乙方姓名'];
      delete enhancedTemplateParams['乙方电话'];
      delete enhancedTemplateParams['乙方身份证'];
      delete enhancedTemplateParams['乙方'];
      
      const contractRequest = {
        contractNo: contractNo,
        contractName: '安得家政服务合同', // 固定合同名称
        templateNo: values.templateNo,
        templateParams: enhancedTemplateParams,
        validityTime: parseInt(values.validityTime) || 30,
        signOrder: parseInt(values.signOrder) || 1,
        readSeconds: parseInt(values.readSeconds) || 5,
        needAgree: parseInt(values.needAgree) || 0,
        autoExpand: parseInt(values.autoExpand) || 1,
        refuseOn: parseInt(values.refuseOn) || 0,
        autoContinue: parseInt(values.autoContinue) || 0,
        viewFlg: parseInt(values.viewFlg) || 0,
        enableDownloadButton: parseInt(values.enableDownloadButton) || 1
      };

      const response = await esignService.createContractStep2(contractRequest);
      
      console.log('创建合同响应:', response);

      // 根据爱签官方API文档，响应格式为 { code, msg, data }
      // code: 100000 表示成功，其他表示异常
      if (response && response.code === 100000) {
        // 🔥 新增：保存到本地数据库
        try {
          console.log('爱签合同创建成功，开始保存到本地数据库...');
          
          // 准备本地合同数据
          const localContractData = {
            // 基本信息
            contractNumber: contractNo,
            customerName: stepData.users?.batchRequest?.partyAName || values.templateParams?.['客户姓名'],
            customerPhone: stepData.users?.batchRequest?.partyAMobile || values.templateParams?.['客户电话'],
            customerIdCard: stepData.users?.batchRequest?.partyAIdCard || values.templateParams?.['客户身份证号'],
            contractType: values.templateParams?.['合同类型'] || '住家育儿嫂',
            startDate: (() => {
              const year = values.templateParams?.['开始年'] || new Date().getFullYear();
              const month = values.templateParams?.['开始月'] || (new Date().getMonth() + 1);
              const day = values.templateParams?.['开始日'] || new Date().getDate();
              return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            })(),
            endDate: (() => {
              const year = values.templateParams?.['结束年'] || (new Date().getFullYear() + 1);
              const month = values.templateParams?.['结束月'] || (new Date().getMonth() + 1);
              const day = values.templateParams?.['结束日'] || new Date().getDate();
              return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            })(),
            
            // 服务人员信息
            workerName: stepData.users?.batchRequest?.partyBName || values.templateParams?.['阿姨姓名'],
            workerPhone: stepData.users?.batchRequest?.partyBMobile || values.templateParams?.['阿姨电话'],
            workerIdCard: stepData.users?.batchRequest?.partyBIdCard || values.templateParams?.['阿姨身份证号'],
            
            // 费用信息
            workerSalary: parseFloat(values.templateParams?.['阿姨工资'] || values.templateParams?.['月工资'] || '0'),
            customerServiceFee: parseFloat(values.templateParams?.['服务费'] || values.templateParams?.['客户服务费'] || '0'),
            workerServiceFee: parseFloat(values.templateParams?.['家政员服务费'] || '0') || undefined,
            deposit: parseFloat(values.templateParams?.['约定定金'] || '0') || undefined,
            finalPayment: parseFloat(values.templateParams?.['约定尾款'] || '0') || undefined,
            
            // 其他信息
            expectedDeliveryDate: values.templateParams?.['预产期'] || undefined,
            salaryPaymentDay: parseInt(values.templateParams?.['工资发放日'] || '0') || undefined,
            monthlyWorkDays: parseInt(values.templateParams?.['月工作天数'] || '0') || undefined,
            remarks: values.templateParams?.['服务备注'] || values.templateParams?.['备注'] || undefined,
            
            // 爱签相关信息
            esignContractNo: contractNo,
            esignStatus: '0', // 等待签约
            esignCreatedAt: new Date().toISOString(),
            esignTemplateNo: values.templateNo,
            // 🔥 新增：预留签署链接字段，等步骤3完成后更新
            esignSignUrls: undefined, // 会在步骤3完成后更新
            
            // 临时字段（会被后端处理）
            customerId: 'temp', // 会被后端处理
            workerId: 'temp', // 会被后端处理
            createdBy: 'temp' // 会被后端处理
          };
          
          console.log('准备保存的本地合同数据:', localContractData);
          
          // 调用本地合同创建API
          const localContract = await contractService.createContract(localContractData);
          console.log('本地合同保存成功:', localContract);
          
          message.success('合同创建成功！已保存到本地数据库。');
          
          // 保存本地合同ID到stepData，供后续步骤使用
          console.log('✅ 本地合同创建成功，ID:', localContract._id);
          setStepData(prev => ({ 
            ...prev, 
            localContractId: localContract._id,
            contract: {
              contractNo: contractNo,
              contractName: '安得家政服务合同',
              templateNo: values.templateNo,
              templateParams: enhancedTemplateParams,
              success: true,
              localSynced: true, // 标记本地已同步
              localContractId: localContract._id,
              ...response.data
            }
          }));
          console.log('🔍 stepData已更新，localContractId:', localContract._id);
          setCurrentStep(2); // 进入步骤3
          
        } catch (localError) {
          console.error('保存到本地数据库失败:', localError);
          message.warning('爱签合同创建成功，但本地数据同步失败。您可以手动在合同列表中查看。');
          
          // 即使本地保存失败，也保持原有流程
          setStepData(prev => ({ 
            ...prev, 
            contract: {
              contractNo: contractNo,
              contractName: '安得家政服务合同',
              templateNo: values.templateNo,
              templateParams: enhancedTemplateParams,
              success: true,
              localSyncError: localError instanceof Error ? localError.message : String(localError),
              ...response.data
            }
          }));
          setCurrentStep(2); // 进入步骤3
        }
        
        // 保存爱签数据到步骤数据
        setStepData(prev => ({ 
          ...prev, 
          contract: {
            contractNo: contractNo,
            contractName: '安得家政服务合同',
            templateNo: values.templateNo,
            templateParams: enhancedTemplateParams,
            success: true,
            localSynced: true, // 标记本地已同步
            ...response.data
          }
        }));
      } else {
        const errorMsg = response?.msg || '合同创建失败';
        message.error(`合同创建失败: ${errorMsg}`);
        // 设置失败状态
        setStepData(prev => ({ 
          ...prev, 
          contract: {
            contractNo: contractNo,
            contractName: '安得家政服务合同', // 固定合同名称
            templateNo: values.templateNo,
            templateParams: enhancedTemplateParams,
            success: false, // 添加失败标记
            error: errorMsg
          }
        }));
      }
    } catch (error) {
      console.error('创建合同失败:', error);
      message.error('创建合同失败，请检查网络连接或联系管理员');
    } finally {
      setLoading(false);
    }
  };

  // 步骤1：添加甲乙双方用户
  const handleStep1Submit = async (values: any) => {
    setLoading(true);
    try {
      console.log('提交甲乙双方用户数据:', values);

      const response = await esignService.addUsersBatch({
        partyAName: values.partyAName,
        partyAMobile: values.partyAMobile,
        partyAIdCard: values.partyAIdCard,
        partyBName: values.partyBName,
        partyBMobile: values.partyBMobile,
        partyBIdCard: values.partyBIdCard,
        isNotice: values.isNotice !== false,
        isSignPwdNotice: values.isSignPwdNotice === true
      });

      console.log('添加用户响应:', response);

      // 检查批量添加是否成功 - 两个用户都成功才算成功
      const partyASuccess = response.partyA?.success;
      const partyBSuccess = response.partyB?.success;
      
      if (partyASuccess && partyBSuccess) {
        message.success('甲乙双方用户添加成功！');
        setContractResult(response);
        setSuccessModalVisible(true);
        setStepData(prev => ({ 
          ...prev, 
          users: {
            partyA: response.partyA,
            partyB: response.partyB,
            batchRequest: {
              partyAName: values.partyAName,
              partyAMobile: values.partyAMobile,
              partyAIdCard: values.partyAIdCard,
              partyBName: values.partyBName,
              partyBMobile: values.partyBMobile,
              partyBIdCard: values.partyBIdCard,
              isNotice: values.isNotice !== false,
              isSignPwdNotice: values.isSignPwdNotice === true
            },
            batchResponse: response
          }
        }));
        // 可以选择是否自动进入下一步，或者让用户手动点击
        // setCurrentStep(1); // 进入下一步
        form.resetFields();
      } else {
        message.error(response.message || '添加用户失败');
      }
    } catch (error) {
      console.error('添加用户失败:', error);
      message.error('添加用户失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleStep1Submit}
      style={{ maxWidth: 800, margin: '0 auto' }}
    >
      <Alert
        message="步骤1：添加甲乙双方用户"
        description="同时添加甲方（客户）和乙方（阿姨）用户到爱签平台。支持从客户库和阿姨简历库快速搜索选择。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 甲方（客户）信息 */}
          <Card 
            title={
              <Space>
            <UserOutlined style={{ color: '#1890ff' }} />
            <span style={{ color: '#1890ff' }}>甲方信息（客户）</span>
              </Space>
            }
        style={{ marginBottom: 24, borderColor: '#1890ff' }}
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="快速搜索甲方用户"
              help="输入姓名或手机号搜索客户库和阿姨简历库"
            >
              <AutoComplete
                value={partyASearchValue}
                options={renderSearchOptions(partyASearchResults)}
                onSearch={handlePartyASearch}
                onSelect={handlePartyASelect}
                style={{ width: '100%' }}
                notFoundContent={searchLoading ? <Spin size="small" /> : '暂无搜索结果'}
              >
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="输入姓名或手机号搜索客户库和阿姨简历库..."
                />
              </AutoComplete>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="客户姓名"
              name="partyAName"
              rules={[{ required: true, message: '请输入客户姓名' }]}
            >
              <Input placeholder="请输入客户姓名" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="手机号（用户唯一识别码）"
              name="partyAMobile"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
              ]}
            >
              <Input placeholder="请输入手机号" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="身份证号（可选）"
              name="partyAIdCard"
            >
              <Input placeholder="请输入身份证号" />
            </Form.Item>
          </Col>
        </Row>
          </Card>

      {/* 乙方（阿姨）信息 */}
      <Card 
        title={
          <Space>
            <UserOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a' }}>乙方信息（阿姨）</span>
          </Space>
        }
        style={{ marginBottom: 24, borderColor: '#52c41a' }}
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="快速搜索乙方用户"
              help="输入姓名或手机号搜索客户库和阿姨简历库"
            >
              <AutoComplete
                value={partyBSearchValue}
                options={renderSearchOptions(partyBSearchResults)}
                onSearch={handlePartyBSearch}
                onSelect={handlePartyBSelect}
                style={{ width: '100%' }}
                notFoundContent={searchLoading ? <Spin size="small" /> : '暂无搜索结果'}
              >
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="输入姓名或手机号搜索客户库和阿姨简历库..."
                />
              </AutoComplete>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
                <Form.Item
              label="乙方姓名（阿姨）"
              name="partyBName"
              rules={[{ required: true, message: '请输入乙方姓名' }]}
            >
              <Input placeholder="请输入乙方姓名" />
                </Form.Item>
          </Col>
          <Col span={8}>
                <Form.Item
              label="手机号（用户唯一识别码）"
              name="partyBMobile"
                  rules={[
                    { required: true, message: '请输入手机号' },
                    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
                  ]}
                >
                  <Input placeholder="请输入手机号" />
                </Form.Item>
          </Col>
          <Col span={8}>
                <Form.Item
              label="身份证号（可选）"
              name="partyBIdCard"
                >
                  <Input placeholder="请输入身份证号" />
                </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 通知设置 */}
      <Card title="通知设置" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="短信通知"
              name="isNotice"
              valuePropName="checked"
              initialValue={true}
            >
              <Select>
                <Option value={true}>开启短信通知</Option>
                <Option value={false}>关闭短信通知</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
                <Form.Item
              label="签约密码通知"
              name="isSignPwdNotice"
              valuePropName="checked"
              initialValue={false}
            >
              <Select>
                <Option value={true}>通知签约密码</Option>
                <Option value={false}>不通知签约密码</Option>
                  </Select>
                </Form.Item>
          </Col>
        </Row>
      </Card>

                <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} size="large" block>
          添加甲乙双方用户
                  </Button>
                </Form.Item>
              </Form>
  );

  // 步骤2：创建合同
  const renderStep2 = () => {
    // 动态生成初始值
    const getInitialValues = () => {
      const baseValues: any = {
        validityTime: 30,
        signOrder: 1,
        readSeconds: 5,
        needAgree: 0,
        autoExpand: 1,
        refuseOn: 0,
        autoContinue: 0,
        viewFlg: 0,
        enableDownloadButton: 1
      };

      return baseValues;
    };

    return (
      <Form
        form={step2Form}
        layout="vertical"
        onFinish={handleStep2Submit}
        style={{ maxWidth: 800, margin: '0 auto' }}
        initialValues={getInitialValues()}
      >
        <Alert
          message="步骤2：上传待签署文件"
          description="选择合同模板，填写合同信息，创建待签署的合同文件。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* 基本信息 */}
        <Card title="合同基本信息" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="有效期（天）"
                name="validityTime"
                rules={[{ required: true, message: '请输入合同有效期' }]}
              >
                <Input type="number" placeholder="根据合同时间自动计算" />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
            <Text type="success">
              📋 合同名称将自动设置为：<strong>安得家政服务合同</strong>
            </Text>
          </div>
        </Card>

        {/* 模板选择 */}
        <Card title="选择合同模板" style={{ marginBottom: 24 }}>
          <Form.Item
            label="合同模板"
            name="templateNo"
            rules={[{ required: true, message: '请选择合同模板' }]}
          >
            <Select
              placeholder="请选择合同模板"
              loading={templateLoading}
              onChange={(value) => {
                const template = templates.find(t => t.templateNo === value);
                setSelectedTemplate(template);
              }}
            >
              {templates.map(template => (
                <Option key={template.templateNo} value={template.templateNo}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{template.templateName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{template.description}</div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* 动态表单字段 - 智能分组布局 */}
          {selectedTemplate && (
            <div style={{ marginTop: 16 }}>
              {(() => {
                // 智能字段分组
                const fieldGroups = {
                  partyA: { title: '甲方信息（客户）', icon: '👤', fields: [] as any[] },
                  partyB: { title: '乙方信息（阿姨）', icon: '👩‍💼', fields: [] as any[] },
                  service: { title: '服务信息', icon: '🏠', fields: [] as any[] },
                  time: { title: '合同开始与结束时间', icon: '📅', fields: [] as any[] },
                  fee: { title: '费用信息', icon: '💰', fields: [] as any[] },
                  contract: { title: '合同信息', icon: '📋', fields: [] as any[] },
                  other: { title: '其他信息', icon: '📝', fields: [] as any[] }
                };

                // 根据字段关键词智能分组
                selectedTemplate.fields.forEach((field: any) => {
                  const fieldKey = field.key.toLowerCase();

                  
                  // 甲方信息
                  if (fieldKey.includes('甲方') || fieldKey.includes('客户') || fieldKey.includes('签署人')) {
                    fieldGroups.partyA.fields.push(field);
                  }
                  // 乙方信息
                  else if (fieldKey.includes('乙方') || fieldKey.includes('阿姨') || 
                           fieldKey.includes('籍贯') || fieldKey.includes('年龄') || fieldKey.includes('性别')) {
                    fieldGroups.partyB.fields.push(field);
                  }
                  // 服务信息
                  else if (fieldKey.includes('服务') || fieldKey.includes('地址') || fieldKey.includes('类型')) {
                    fieldGroups.service.fields.push(field);
                  }
                  // 时间信息
                  else if (fieldKey.includes('年') || fieldKey.includes('月') || fieldKey.includes('日') || 
                           fieldKey.includes('时间') || fieldKey.includes('期限') || fieldKey.includes('签署日期')) {
                    fieldGroups.time.fields.push(field);
                  }
                  // 费用信息
                  else if (fieldKey.includes('费') || fieldKey.includes('工资') || fieldKey.includes('金额') || 
                           fieldKey.includes('付款') || fieldKey.includes('大写')) {
                    fieldGroups.fee.fields.push(field);
                  }
                  // 合同信息
                  else if (fieldKey.includes('合同') || fieldKey.includes('备注') || fieldKey.includes('条款') || 
                           fieldKey.includes('丙方') || fieldKey.includes('内容')) {
                    fieldGroups.contract.fields.push(field);
                  }
                  // 其他
                  else {
                    fieldGroups.other.fields.push(field);
                  }
                });

                // 根据字段类型渲染不同的表单控件
                const renderFormControl = (field: any) => {
                  // 特殊处理：如果是服务类型字段，使用工种下拉选项
                  const fieldKey = field.key.toLowerCase();
                  const fieldLabel = field.label.toLowerCase();
                  if (fieldKey.includes('服务类型') || fieldLabel.includes('服务类型') || 
                      fieldKey.includes('工种') || fieldLabel.includes('工种')) {
                    return (
                      <Select 
                        placeholder="请选择服务类型"
                      >
                        {Object.values(JobType).map(jobType => (
                          <Option key={jobType} value={JOB_TYPE_MAP[jobType]}>
                            {JOB_TYPE_MAP[jobType]}
                          </Option>
                        ))}
                      </Select>
                    );
                  }

                  // 特殊处理：如果是服务备注字段，使用多选框
                  if (fieldKey.includes('服务备注') || fieldKey.includes('服务内容') || fieldKey.includes('服务项目') || 
                      (field.options && field.options.length > 0)) {
                    return (
                      <Form.Item shouldUpdate={(prevValues, currentValues) => {
                        return prevValues[field.key] !== currentValues[field.key];
                      }}>
                        {() => {
                          // 获取当前表单值并转换为数组
                          const currentValue = step2Form.getFieldValue(field.key) || '';
                          // 获取可用选项，优先使用模板字段自带的options，否则使用默认的SERVICE_OPTIONS
                          const availableOptions = field.options && field.options.length > 0 
                            ? field.options.map((opt: any) => opt.label) 
                            : SERVICE_OPTIONS;
                          const currentSelectedValues = currentValue ? 
                            currentValue.split('；').filter((item: string) => item.trim() && availableOptions.includes(item.trim())) : 
                            [];
                          
                          return (
                            <div>
                              <Checkbox.Group
                                value={currentSelectedValues}
                                style={{ 
                                  width: '100%',
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                  gap: '8px 16px',
                                  marginBottom: '12px'
                                }}
                                onChange={(checkedValues) => {
                                  // 🔥 最终修复：将选中的值实时保存到 ref 中
                                  serviceRemarksRef.current = checkedValues;
                                  console.log('🔥 ref updated:', serviceRemarksRef.current);

                                  console.log('服务备注选择变化:', checkedValues); // 调试日志
                                  // 获取当前表单值，保留非服务选项的内容（如用户手动输入的补充内容）
                                  const currentFormValue = step2Form.getFieldValue(field.key) || '';
                                  const parts = currentFormValue.split('；');
                                  const nonServiceParts = parts.filter((item: string) => 
                                    item.trim() && !availableOptions.includes(item.trim())
                                  );
                                  
                                  // 合并选中的服务项目和已有的补充内容
                                  let finalValue = checkedValues.join('；');
                                  if (nonServiceParts.length > 0) {
                                    finalValue += (finalValue ? '；' : '') + nonServiceParts.join('；');
                                  }
                                  
                                  step2Form.setFieldValue(field.key, finalValue);
                                  console.log('服务备注最终值:', finalValue); // 调试日志
                                }}
                              >
                                {availableOptions.map((option: string, index: number) => (
                                  <Checkbox 
                                    key={`service-${index}-${option}`} 
                                    value={option} 
                                    style={{ marginBottom: '4px' }}
                                  >
                                    {option}
                                  </Checkbox>
                                ))}
                              </Checkbox.Group>
                              <Input.TextArea 
                                rows={3} 
                                placeholder="您也可以在此处补充其他服务内容或详细说明"
                                style={{ marginTop: '8px' }}
                                onChange={(e) => {
                                  // 处理手动输入的补充内容 - 需要与已选择的服务项目合并
                                  const additionalContent = e.target.value;
                                  const currentFormValue = step2Form.getFieldValue(field.key) || '';
                                  
                                  // 如果当前表单值包含分号，说明有多选项目，需要合并
                                  if (currentFormValue.includes('；')) {
                                    // 分离已选择的项目和补充内容
                                    const parts = currentFormValue.split('；');
                                    const selectedServices = parts.filter((part: string) => availableOptions.includes(part.trim()));
                                    
                                    // 合并选择的服务和补充内容
                                    let finalValue = selectedServices.join('；');
                                    if (additionalContent.trim()) {
                                      finalValue += (finalValue ? '；' : '') + additionalContent.trim();
                                    }
                                    step2Form.setFieldValue(field.key, finalValue);
                                  } else {
                                    // 如果没有多选项目，直接设置补充内容
                                    step2Form.setFieldValue(field.key, additionalContent);
                                  }
                                }}
                              />
                            </div>
                          );
                        }}
                      </Form.Item>
                    );
                  }

                  // 匹配费字段已在Form.Item层面特殊处理，这里跳过
                  if (fieldKey.includes('匹配费') && !fieldKey.includes('大写')) {
                    return null; // 这不会被显示，因为已在Form.Item层面处理
                  }

                  // 特殊处理：有效期字段使用下拉选择
                  if (fieldKey.includes('有效期') || fieldLabel.includes('有效期')) {
                    const handleValidityChange = (value: string) => {
                      setValidityType(value);
                      if (value !== 'custom') {
                        // 预设选项，直接设置天数
                        step2Form.setFieldValue(field.key, value);
                      } else {
                        // 自定义选项，清空当前值，等待用户输入
                        step2Form.setFieldValue(field.key, customDays || '');
                      }
                    };

                    const handleCustomDaysChange = (e: any) => {
                      const days = e.target.value;
                      setCustomDays(days);
                      if (validityType === 'custom') {
                        step2Form.setFieldValue(field.key, days);
                      }
                    };

                    return (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Select
                          value={validityType}
                          onChange={handleValidityChange}
                          style={{ width: '150px' }}
                          placeholder="选择有效期"
                        >
                          <Option value="90">90天</Option>
                          <Option value="180">180天</Option>
                          <Option value="365">365天</Option>
                          <Option value="custom">其他（自定义）</Option>
                        </Select>
                        {validityType === 'custom' && (
                          <Input
                            type="number"
                            value={customDays}
                            onChange={handleCustomDaysChange}
                            placeholder="请输入天数"
                            style={{ width: '120px' }}
                            min={1}
                            max={3650}
                            suffix="天"
                          />
                        )}
                      </div>
                    );
                  }

                  switch (field.type) {
                    case 'textarea':
                      return <Input.TextArea rows={3} placeholder={`请输入${field.label}`} />;
                    case 'number':
                      return <Input type="number" placeholder={`请输入${field.label}`} />;
                    case 'date':
                      return <Input type="date" placeholder={`请选择${field.label}`} />;
                    case 'checkbox':
                      return (
                        <Select placeholder={`请选择${field.label}`}>
                          <Option value={true}>是</Option>
                          <Option value={false}>否</Option>
                        </Select>
                      );
                    case 'select':
                      return field.options ? (
                        <Select placeholder={`请选择${field.label}`}>
                          {field.options.map((option: string, optionIndex: number) => (
                            <Option key={`${option}-${optionIndex}`} value={option}>{option}</Option>
                          ))}
                        </Select>
                      ) : <Input placeholder={`请输入${field.label}`} />;
                    default:
                      return <Input placeholder={`请输入${field.label}`} />;
                  }
                };

                // 根据爱签API原始字段key设置默认值
                const getDefaultValue = (field: any) => {
                  if (!stepData.users?.batchRequest) return undefined;
                  
                  const { partyAName, partyAMobile, partyAIdCard, partyBName, partyBMobile, partyBIdCard } = stepData.users.batchRequest;
                  const selectedPartyA = stepData.selectedPartyA;
                  const selectedPartyB = stepData.selectedPartyB;
                  const fieldKey = field.key.toLowerCase();
                  
                  // 甲方（客户）信息匹配
                  if (fieldKey.includes('客户姓名') || fieldKey.includes('签署人姓名') || fieldKey.includes('甲方姓名')) {
                    return partyAName;
                  }
                  if (fieldKey.includes('客户电话') || fieldKey.includes('甲方电话') || fieldKey.includes('甲方联系电话') || fieldKey.includes('甲方联系人电话')) {
                    return partyAMobile;
                  }
                  if (fieldKey.includes('客户身份证') || fieldKey.includes('甲方身份证') || fieldKey.includes('客户身份证号') || fieldKey.includes('甲方身份证号')) {
                    return partyAIdCard;
                  }
                  if (fieldKey.includes('甲方联系地址') || fieldKey.includes('客户联系地址') || fieldKey.includes('客户地址')) {
                    return selectedPartyA?.customerAddress || selectedPartyA?.address;
                  }
                  
                  // 乙方（阿姨）信息匹配
                  if (fieldKey.includes('阿姨姓名') || fieldKey.includes('乙方姓名')) {
                    return partyBName;
                  }
                  if (fieldKey.includes('阿姨电话') || fieldKey.includes('乙方电话')) {
                    return partyBMobile;
                  }
                  if (fieldKey.includes('阿姨身份证') || fieldKey.includes('乙方身份证')) {
                    return partyBIdCard;
                  }
                  if (fieldKey.includes('阿姨联系地址') || fieldKey.includes('乙方地址')) {
                    return selectedPartyB?.address;
                  }
                  if (fieldKey.includes('籍贯')) {
                    return selectedPartyB?.nativePlace;
                  }
                  if (fieldKey.includes('年龄')) {
                    return selectedPartyB?.age;
                  }
                  if (fieldKey.includes('性别')) {
                    return selectedPartyB?.gender;
                  }
                  if (fieldKey.includes('阿姨工资') || fieldKey.includes('期望薪资')) {
                    return selectedPartyB?.expectedSalary || selectedPartyB?.salary;
                  }
                  
                  // 服务相关信息
                  if (fieldKey.includes('服务地址') || fieldKey.includes('服务联系地址')) {
                    // 服务地址优先使用客户地址
                    return selectedPartyA?.customerAddress || selectedPartyA?.address;
                  }
                  
                  // 时间相关字段
                  if (fieldKey.includes('开始年')) {
                    return new Date().getFullYear();
                  }
                  if (fieldKey.includes('开始月')) {
                    return new Date().getMonth() + 1;
                  }
                  if (fieldKey.includes('开始日')) {
                    return new Date().getDate();
                  }
                  if (fieldKey.includes('结束年')) {
                    return new Date().getFullYear() + 1;
                  }
                  if (fieldKey.includes('结束月')) {
                    return new Date().getMonth() + 1;
                  }
                  if (fieldKey.includes('结束日')) {
                    return new Date().getDate();
                  }
                  
                  // 有效期字段默认值
                  if (fieldKey.includes('有效期') || fieldKey.includes('validitytime')) {
                    return '90'; // 默认90天，与下拉选择的默认值保持一致
                  }
                  
                  // 根据字段类型和名称提供合理默认值
                  if (field.type === 'date') {
                    return new Date().toISOString().split('T')[0];
                  }
                  if (field.type === 'checkbox') {
                    return true;
                  }
                  if (field.type === 'number') {
                    // 匹配费字段设置默认值
                    if (fieldKey.includes('匹配费') && !fieldKey.includes('大写')) {
                      return 1000; // 默认1000元
                    }
                    if (fieldKey.includes('费') || fieldKey.includes('金额') || fieldKey.includes('工资')) {
                      return '';
                    }
                    if (fieldKey.includes('年龄')) {
                      return '';
                    }
                  }
                  
                  // 其他字段返回空值，让用户自己填写
                  return undefined;
                };

                // 渲染字段组
                const renderFieldGroup = (groupKey: string, group: any) => {
                  if (group.fields.length === 0) return null;
                  
                  // 特殊处理时间字段组 - 改为年月日6列展示
                  if (groupKey === 'time') {
                    // 生成年份选项（当前年 - 1 到 当前年 + 10）
                    const currentYear = new Date().getFullYear();
                    const yearOptions = Array.from({ length: 12 }, (_, i) => currentYear - 1 + i);
                    
                    // 生成月份选项
                    const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
                    
                    // 生成日期选项
                    const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);
                    
                    // 找到时间相关字段
                    const startYearField = group.fields.find((f: any) => f.key === '开始年');
                    const startMonthField = group.fields.find((f: any) => f.key === '开始月');
                    const startDayField = group.fields.find((f: any) => f.key === '开始日');
                    const endYearField = group.fields.find((f: any) => f.key === '结束年');
                    const endMonthField = group.fields.find((f: any) => f.key === '结束月');
                    const endDayField = group.fields.find((f: any) => f.key === '结束日');
                    
                    // 其他时间字段
                    const otherTimeFields = group.fields.filter((f: any) => 
                      !['开始年', '开始月', '开始日', '结束年', '结束月', '结束日'].includes(f.key)
                    );
                    
                    return (
                      <Card 
                        key={groupKey}
                        title={
                          <span>
                            <span style={{ marginRight: 8 }}>{group.icon}</span>
                            {group.title}
                          </span>
                        }
                        size="small" 
                        style={{ marginBottom: 16 }}
                      >
                        {/* 合同开始时间 */}
                        <div style={{ marginBottom: 16 }}>
                          <h4 style={{ marginBottom: 12, color: '#1890ff' }}>合同开始时间</h4>
                          <Row gutter={8}>
                            <Col span={4}>
                              {startYearField && (
                                <Form.Item
                                  label="开始年"
                                  name={['templateParams', startYearField.key]}
                                  rules={startYearField.required ? [{ required: true, message: '请选择年份' }] : []}
                                  initialValue={getDefaultValue(startYearField)}
                                >
                                  <Select placeholder="年" onChange={calculateValidityTime}>
                                    {yearOptions.map(year => (
                                      <Option key={year} value={year}>{year}年</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              )}
                            </Col>
                            <Col span={4}>
                              {startMonthField && (
                                <Form.Item
                                  label="开始月"
                                  name={['templateParams', startMonthField.key]}
                                  rules={startMonthField.required ? [{ required: true, message: '请选择月份' }] : []}
                                  initialValue={getDefaultValue(startMonthField)}
                                >
                                  <Select placeholder="月" onChange={calculateValidityTime}>
                                    {monthOptions.map(month => (
                                      <Option key={month} value={month}>{month}月</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              )}
                            </Col>
                            <Col span={4}>
                              {startDayField && (
                                <Form.Item
                                  label="开始日"
                                  name={['templateParams', startDayField.key]}
                                  rules={startDayField.required ? [{ required: true, message: '请选择日期' }] : []}
                                  initialValue={getDefaultValue(startDayField)}
                                >
                                  <Select placeholder="日" onChange={calculateValidityTime}>
                                    {dayOptions.map(day => (
                                      <Option key={day} value={day}>{day}日</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              )}
                            </Col>
                            <Col span={12}>
                              {/* 空白区域 */}
                            </Col>
                          </Row>
                        </div>
                        
                        {/* 合同结束时间 */}
                        <div>
                          <h4 style={{ marginBottom: 12, color: '#52c41a' }}>合同结束时间</h4>
                          <Row gutter={8}>
                            <Col span={4}>
                              {endYearField && (
                                <Form.Item
                                  label="结束年"
                                  name={['templateParams', endYearField.key]}
                                  rules={endYearField.required ? [{ required: true, message: '请选择年份' }] : []}
                                  initialValue={getDefaultValue(endYearField)}
                                >
                                  <Select placeholder="年" onChange={calculateValidityTime}>
                                    {yearOptions.map(year => (
                                      <Option key={year} value={year}>{year}年</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              )}
                            </Col>
                            <Col span={4}>
                              {endMonthField && (
                                <Form.Item
                                  label="结束月"
                                  name={['templateParams', endMonthField.key]}
                                  rules={endMonthField.required ? [{ required: true, message: '请选择月份' }] : []}
                                  initialValue={getDefaultValue(endMonthField)}
                                >
                                  <Select placeholder="月" onChange={calculateValidityTime}>
                                    {monthOptions.map(month => (
                                      <Option key={month} value={month}>{month}月</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              )}
                            </Col>
                            <Col span={4}>
                              {endDayField && (
                                <Form.Item
                                  label="结束日"
                                  name={['templateParams', endDayField.key]}
                                  rules={endDayField.required ? [{ required: true, message: '请选择日期' }] : []}
                                  initialValue={getDefaultValue(endDayField)}
                                >
                                  <Select placeholder="日" onChange={calculateValidityTime}>
                                    {dayOptions.map(day => (
                                      <Option key={day} value={day}>{day}日</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              )}
                            </Col>
                            <Col span={12}>
                              {/* 空白区域 */}
                            </Col>
                          </Row>
                        </div>
                        
                        {/* 其他时间相关字段 */}
                        {otherTimeFields.length > 0 && (
                          <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                            <h4 style={{ marginBottom: 12, color: '#666' }}>其他时间信息</h4>
                            {Array.from({ length: Math.ceil(otherTimeFields.length / 2) }).map((_, rowIndex) => {
                              const startIndex = rowIndex * 2;
                              const rowFields = otherTimeFields.slice(startIndex, startIndex + 2);
                              
                              return (
                                <Row gutter={16} key={`time-row-${rowIndex}`}>
                                  {rowFields.map((field: any, fieldIndex: number) => (
                                    <Col span={12} key={`${field.key}-${rowIndex}-${fieldIndex}`}>
                                      <Form.Item
                                        label={field.label}
                                        name={['templateParams', field.key]}
                                        rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
                                        initialValue={getDefaultValue(field)}
                                      >
                                        {renderFormControl(field)}
                                      </Form.Item>
                                    </Col>
                                  ))}
                                  {rowFields.length === 1 && <Col span={12} />}
                                </Row>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    );
                  }
                  
                  // 将字段按类型分组：textarea单独占一行，其他字段两列展示
                  const textareaFields = group.fields.filter((f: any) => f.type === 'textarea');
                  const normalFields = group.fields.filter((f: any) => f.type !== 'textarea');
                  
                  return (
                    <Card 
                      key={groupKey}
                      title={
                        <span>
                          <span style={{ marginRight: 8 }}>{group.icon}</span>
                          {group.title}
                        </span>
                      }
                      size="small" 
                      style={{ marginBottom: 16 }}
                    >
                      {/* 普通字段 - 两列布局 */}
                      {normalFields.length > 0 && (
                        <>
                          {Array.from({ length: Math.ceil(normalFields.length / 2) }).map((_, rowIndex) => {
                            const startIndex = rowIndex * 2;
                            const rowFields = normalFields.slice(startIndex, startIndex + 2);
                            
                            return (
                              <Row gutter={16} key={`${groupKey}-row-${rowIndex}`}>
                                {rowFields.map((field: any, fieldIndex: number) => {
                                  const fieldKey = field.key.toLowerCase();
                                  
                                                                     // 特殊处理：匹配费字段使用简单下拉选择
                                   if (fieldKey.includes('匹配费') && !fieldKey.includes('大写')) {
                                     return (
                                       <Col span={12} key={`${field.key}-${rowIndex}-${fieldIndex}`}>
                                         <Form.Item
                                           label={field.label}
                                           name={['templateParams', field.key]}
                                           rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
                                           initialValue={getDefaultValue(field)}
                                         >
                                           <Select 
                                             placeholder="请选择匹配费"
                                             onChange={(value) => {
                                               console.log('💰 匹配费选择:', value);
                                               // 自动更新匹配费大写字段
                                               const chineseAmount = convertToChineseAmount(value);
                                               step2Form.setFieldsValue({
                                                 templateParams: {
                                                   '匹配费大写': chineseAmount
                                                 }
                                               });
                                             }}
                                           >
                                             <Option value={1000}>1000元</Option>
                                             <Option value={1500}>1500元</Option>
                                           </Select>
                                         </Form.Item>
                                       </Col>
                                     );
                                   }
                                  
                                  // 普通字段处理
                                  return (
                                    <Col span={12} key={`${field.key}-${rowIndex}-${fieldIndex}`}>
                                      <Form.Item
                                        label={field.label}
                                        name={['templateParams', field.key]}
                                        rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
                                        initialValue={getDefaultValue(field)}
                                      >
                                        {renderFormControl(field)}
                                      </Form.Item>
                                    </Col>
                                  );
                                })}
                                {/* 如果只有一个字段，补齐空白列 */}
                                {rowFields.length === 1 && <Col span={12} />}
                              </Row>
                            );
                          })}
                        </>
                      )}
                      
                      {/* Textarea字段 - 单独占一行 */}
                      {textareaFields.map((field: any, fieldIndex: number) => (
                        <Row gutter={16} key={`${groupKey}-textarea-${field.key}-${fieldIndex}`}>
                          <Col span={24}>
                            <Form.Item
                              label={field.label}
                              name={['templateParams', field.key]}
                              rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
                              initialValue={getDefaultValue(field)}
                            >
                              {renderFormControl(field)}
                            </Form.Item>
                          </Col>
                        </Row>
                      ))}
                    </Card>
                  );
                };

                return (
                  <>
                    {/* 按优先级顺序渲染字段组 */}
                    {renderFieldGroup('partyA', fieldGroups.partyA)}
                    {renderFieldGroup('partyB', fieldGroups.partyB)}
                    {renderFieldGroup('service', fieldGroups.service)}
                    {renderFieldGroup('time', fieldGroups.time)}
                    {renderFieldGroup('fee', fieldGroups.fee)}
                    {renderFieldGroup('contract', fieldGroups.contract)}
                    {renderFieldGroup('other', fieldGroups.other)}
                  </>
                );
              })()}
            </div>
          )}
        </Card>

        {/* 签署设置 */}
        <Card title="签署设置" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="签署方式"
                name="signOrder"
              >
                <Select>
                  <Option value={1}>无序签署</Option>
                  <Option value={2}>顺序签署</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="强制阅读时间（秒）"
                name="readSeconds"
              >
                <Input type="number" placeholder="强制阅读时间" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="同意协议开关"
                name="needAgree"
              >
                <Select>
                  <Option value={0}>关闭</Option>
                  <Option value={1}>开启</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="自动展开文件"
                name="autoExpand"
              >
                <Select>
                  <Option value={0}>不展开</Option>
                  <Option value={1}>自动展开</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="退回按钮"
                name="refuseOn"
              >
                <Select>
                  <Option value={0}>关闭</Option>
                  <Option value={1}>开启</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="下载按钮"
                name="enableDownloadButton"
              >
                <Select>
                  <Option value={0}>关闭</Option>
                  <Option value={1}>开启</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Form.Item>
          <Space>
            <Button onClick={() => setCurrentStep(0)} icon={<ArrowLeftOutlined />}>
              返回上一步
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              创建合同
            </Button>
          </Space>
        </Form.Item>
      </Form>
    );
  };

  // 步骤3：添加签署方
  const renderStep3 = () => {
    const handleStep3Submit = async () => {
      if (!stepData.users || !stepData.contract) {
        message.error('请先完成前面的步骤');
        return;
      }

      setLoading(true);
      try {
        console.log('开始添加签署方...');
        console.log('用户数据:', stepData.users);
        console.log('合同数据:', stepData.contract);

        // 构建签署方数据（使用模板坐标签章）
        const signersData = [
          {
            account: stepData.users.partyA.request.mobile, // 甲方账号（手机号）
            name: stepData.users.partyA.request.name,
            mobile: stepData.users.partyA.request.mobile,
            signType: 'manual' as const, // 有感知签约
            validateType: 'sms' as const // 短信验证码
            // 移除signPosition，让后端使用模板坐标签章策略
          },
          {
            account: stepData.users.partyB.request.mobile, // 乙方账号（手机号）
            name: stepData.users.partyB.request.name,
            mobile: stepData.users.partyB.request.mobile,
            signType: 'manual' as const, // 有感知签约
            validateType: 'sms' as const // 短信验证码
            // 移除signPosition，让后端使用模板坐标签章策略
          }
        ];
        
        console.log('签署方数据构建完成:', signersData);

        // 调用简化版添加签署方API
        const result = await esignService.addSimpleContractSigners({
          contractNo: stepData.contract.contractNo,
          signers: signersData,
          signOrder: 'parallel' // 并行签署
        });

        console.log('添加签署方结果:', result);

        // 根据爱签官方API文档，响应格式为 { code, msg, data }
        // code: 100000 表示成功，100074 表示重复添加（也算成功）
        if (result && (result.code === 100000 || result.code === 100074)) {
          console.log('🔍 检查本地合同ID:', stepData.localContractId);
          console.log('🔍 检查签署用户数据:', result.data?.signUser);
          console.log('🔍 完整的result.data:', result.data);
          
          // 如果是重复添加（100074），需要通过合同状态API获取签署链接
          if (result.code === 100074) {
            console.log('⚠️ 检测到重复添加签署人，尝试从合同状态获取签署链接...');
            try {
              // 通过合同状态API获取签署链接
              const statusResult = await esignService.getContractStatus(stepData.contract.contractNo);
              console.log('📊 合同状态查询结果:', statusResult);
              
              if (statusResult.success && statusResult.data?.signUser) {
                // 使用从状态API获取的签署链接
                setStepData(prev => ({
                  ...prev,
                  signer: statusResult.data,
                  signUrl: statusResult.data.signUser?.[0]?.signUrl || ''
                }));
                
                // 保存签署链接到本地数据库
                if (stepData.localContractId) {
                  const signUrls = statusResult.data.signUser.map((user: any, index: number) => ({
                    name: user.name,
                    mobile: user.account,
                    role: index === 0 ? '甲方（客户）' : '乙方（服务人员）',
                    signUrl: user.signUrl,
                    account: user.account,
                    signOrder: user.signOrder
                  }));

                  console.log('🔗 准备保存的签署链接数据:', signUrls);

                  await contractService.updateContract(stepData.localContractId, {
                    esignSignUrls: JSON.stringify(signUrls),
                    esignStatus: '1'
                  });
                  
                  console.log('✅ 签署链接已保存到本地数据库:', signUrls);
                  message.success('签署链接已获取并保存到本地数据库');
                }
              } else {
                message.warning('无法获取签署链接，请稍后在合同详情页查看');
              }
            } catch (statusError) {
              console.error('❌ 获取合同状态失败:', statusError);
              message.warning('签署方已存在，但无法获取签署链接，请稍后在合同详情页查看');
            }
          } else {
            // 正常成功情况（100000）
            setStepData(prev => ({
              ...prev,
              signer: result.data,
              signUrl: result.data.signUser?.[0]?.signUrl || ''
            }));

            // 保存签署链接到本地数据库
            if (stepData.localContractId && result.data?.signUser) {
              try {
                const signUrls = result.data.signUser.map((user: any, index: number) => ({
                  name: user.name,
                  mobile: user.account,
                  role: index === 0 ? '甲方（客户）' : '乙方（服务人员）',
                  signUrl: user.signUrl,
                  account: user.account,
                  signOrder: user.signOrder
                }));

                console.log('🔗 准备保存的签署链接数据:', signUrls);

                await contractService.updateContract(stepData.localContractId, {
                  esignSignUrls: JSON.stringify(signUrls),
                  esignStatus: '1'
                });
                
                console.log('✅ 签署链接已保存到本地数据库:', signUrls);
                message.success('签署链接已保存到本地数据库');
              } catch (error) {
                console.error('❌ 保存签署链接到本地数据库失败:', error);
                message.error('保存签署链接到本地数据库失败，但不影响签署流程');
              }
            } else {
              console.warn('⚠️ 无法保存签署链接到本地数据库:');
              console.warn('  - localContractId:', stepData.localContractId);
              console.warn('  - signUser:', result.data?.signUser);
              if (!stepData.localContractId) {
                message.warning('本地合同ID不存在，签署链接无法保存到本地数据库');
              } else if (!result.data?.signUser) {
                message.warning('签署用户数据不存在，签署链接无法保存到本地数据库');
              }
            }
          }

          message.success('签署方添加成功！');
          setCurrentStep(3); // 进入下一步
        } else {
          const errorMsg = result?.msg || result?.message || '添加签署方失败';
          message.error(`添加签署方失败: ${errorMsg}`);
        }
      } catch (error) {
        console.error('添加签署方失败:', error);
        message.error('添加签署方失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    return (
      <Card title="步骤3：添加签署方" bordered={false}>
        <Alert
          message="准备添加签署方"
          description="将为甲方（客户）和乙方（阿姨）添加签署权限，并生成签署链接。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {stepData.users && stepData.contract && (
          <div style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Card title="甲方（客户）" size="small" style={{ background: '#f6ffed' }}>
                  <p><strong>姓名：</strong>{stepData.users.partyA?.request?.name}</p>
                  <p><strong>手机：</strong>{stepData.users.partyA?.request?.mobile}</p>
                  <p><strong>签署方式：</strong>有感知签约（短信验证码）</p>
                  <p><strong>签名位置：</strong>模板预设位置（甲方签名区）</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="乙方（阿姨）" size="small" style={{ background: '#fff7e6' }}>
                  <p><strong>姓名：</strong>{stepData.users.partyB?.request?.name}</p>
                  <p><strong>手机：</strong>{stepData.users.partyB?.request?.mobile}</p>
                  <p><strong>签署方式：</strong>有感知签约（短信验证码）</p>
                  <p><strong>签名位置：</strong>模板预设位置（乙方签名区）</p>
                </Card>
              </Col>
            </Row>

            <Card title="合同信息" size="small" style={{ marginTop: 16, background: '#f0f9ff' }}>
              <p><strong>合同编号：</strong>{stepData.contract.contractNo}</p>
              <p><strong>合同名称：</strong>{stepData.contract.contractName || '安得家政三方服务合同'}</p>
              <p><strong>模板编号：</strong>{stepData.contract.templateNo}</p>
              <p><strong>签署顺序：</strong>并行签署（甲乙双方可同时签署）</p>
            </Card>
          </div>
        )}

        <Form.Item>
          <Space>
            <Button onClick={() => setCurrentStep(1)} icon={<ArrowLeftOutlined />}>
              返回上一步
            </Button>
            <Button 
              type="primary" 
              onClick={handleStep3Submit} 
              loading={loading} 
              size="large"
              disabled={!stepData.users || !stepData.contract}
            >
              添加签署方
            </Button>
          </Space>
        </Form.Item>
      </Card>
    );
  };

  // 步骤4：打开签署链接
  const renderStep4 = () => {
    const signUrls = stepData.signer?.signUser || [];
    
    return (
      <Card title="步骤4：打开签署链接" bordered={false}>
        <Alert
          message="签署方添加成功！"
          description="签署链接已生成，请通知甲乙双方分别打开对应链接进行签署。"
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {signUrls.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            {signUrls.map((signUser: any, index: number) => (
              <Card 
                key={index}
                title={`${index === 0 ? '甲方' : '乙方'}签署链接`}
                size="small" 
                style={{ 
                  marginBottom: 16,
                  background: index === 0 ? '#f6ffed' : '#fff7e6'
                }}
              >
                <p><strong>签署人：</strong>{signUser.name}</p>
                <p><strong>手机号：</strong>{signUser.account}</p>
                <p><strong>签署顺序：</strong>{signUser.signOrder}</p>
                <div style={{ marginTop: 12 }}>
                  <Space>
                    <Button 
                      type="primary" 
                      onClick={() => window.open(signUser.signUrl, '_blank')}
                    >
                      打开签署链接
                    </Button>
                    <Button 
                      onClick={() => {
                        navigator.clipboard.writeText(signUser.signUrl);
                        message.success('签署链接已复制到剪贴板');
                      }}
                    >
                      复制链接
                    </Button>
                  </Space>
                </div>
                <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                  <Text ellipsis copyable style={{ width: '100%' }}>
                    {signUser.signUrl}
                  </Text>
                </div>
              </Card>
            ))}

            <Alert
              message="签署说明"
              description={
                <div>
                  <p>1. 请通知甲乙双方分别点击对应的签署链接</p>
                  <p>2. 签署时需要进行身份验证（短信验证码）</p>
                  <p>3. 双方都签署完成后，合同即生效</p>
                  <p>4. 可以在下一步下载已签署的合同</p>
                </div>
              }
              type="info"
              style={{ marginTop: 16 }}
            />
          </div>
        ) : (
          <Alert
            message="暂无签署链接"
            description="请先完成前面的步骤生成签署链接。"
            type="warning"
            style={{ marginBottom: 24 }}
          />
        )}

        <Form.Item>
          <Space>
            <Button onClick={() => setCurrentStep(2)} icon={<ArrowLeftOutlined />}>
              返回上一步
            </Button>
            <Button 
              type="primary" 
              onClick={() => setCurrentStep(4)}
              size="large"
              disabled={signUrls.length === 0}
            >
              继续下一步（下载合同）
            </Button>
          </Space>
        </Form.Item>
      </Card>
    );
  };

  // 步骤5：下载合同
  const renderStep5 = () => {
    // 自动查询合同状态 - 在页面加载时执行
    React.useEffect(() => {
      if (stepData.contract?.contractNo && !contractStatus) {
        console.log('🔄 步骤5页面加载，自动查询合同状态...');
        // 延迟一点执行，确保页面渲染完成
        const timer = setTimeout(() => {
          checkContractStatus();
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [stepData.contract?.contractNo]);

    const previewContract = async () => {
      if (!stepData.contract?.contractNo) {
        message.error('合同编号不存在');
        return;
      }

      setPreviewLoading(true);
      try {
        // 🔥 根据官方文档构建预览参数
        const previewParams = [
          {
            account: stepData.users?.partyA?.request?.mobile || 'preview_user_1',
            isWrite: 0, // 不使用手写章
            signStrategyList: [
              {
                attachNo: 1,
                locationMode: 4, // 模板坐标签章
                signKey: '甲方',
                signPage: 1,
                signX: 0.1,
                signY: 0.1
              }
            ]
          },
          {
            account: stepData.users?.partyB?.request?.mobile || 'preview_user_2',
            isWrite: 0, // 不使用手写章
            signStrategyList: [
              {
                attachNo: 1,
                locationMode: 4, // 模板坐标签章
                signKey: '乙方',
                signPage: 1,
                signX: 0.6,
                signY: 0.1
              }
            ]
          }
        ];

        console.log('📋 预览合同请求参数:', previewParams);
        
        const result = await esignService.previewContract(stepData.contract.contractNo, previewParams);
        console.log('合同预览结果:', result);
        
        // 🔥 处理后端响应格式
        if (result && result.success) {
          setPreviewData({
            success: true,
            contractNo: stepData.contract.contractNo,
            previewUrl: result.previewData,
            message: result.message || '预览成功',
            fallbackMode: result.fallbackMode || false,
            previewInfo: result.previewInfo
          });
          
          if (result.fallbackMode) {
            message.warning('无法生成预览图，已获取合同状态信息');
          } else if (result.previewData) {
            message.success('合同预览生成成功');
          } else {
            message.success('合同预览信息获取成功');
          }
        } else {
          // 处理错误情况
          let errorMessage = result?.message || '获取合同预览信息失败';
          
          message.error(errorMessage);
          setPreviewData({
            success: false,
            contractNo: stepData.contract.contractNo,
            error: errorMessage
          });
        }
      } catch (error) {
        console.error('预览合同失败:', error);
        message.error('预览合同失败，请检查网络连接');
        setPreviewData({
          success: false,
          contractNo: stepData.contract.contractNo,
          error: '网络错误或服务异常'
        });
      } finally {
        setPreviewLoading(false);
      }
    };

    const downloadContract = async () => {
      if (!stepData.contract?.contractNo) {
        message.error('合同编号不存在');
        return;
      }

      setDownloadLoading(true);
      try {
        const result = await esignService.downloadSignedContract(
          stepData.contract.contractNo, 
          downloadOptions
        );
        console.log('下载合同结果:', result);
        
        if (result.success && result.data) {
          const downloadData = result.data;
          
          // 如果返回的是base64数据，直接下载文件
          if (downloadData.data && downloadData.downloadInfo?.isBase64) {
            const fileName = downloadData.downloadInfo.fileName || `${stepData.contract.contractNo}.pdf`;
            esignService.downloadBase64File(
              downloadData.data, 
              fileName, 
              downloadData.downloadInfo.fileType
            );
            message.success(`合同文件下载成功：${fileName}`);
          }
          // 如果返回的是下载URL，打开链接
          else if (downloadData.downloadUrl) {
            window.open(downloadData.downloadUrl, '_blank');
            message.success('合同下载链接已打开');
          }
          // 其他情况显示返回的信息
          else {
            message.info('下载请求已提交，请查看响应信息');
          }
        } else {
          message.error(result.message || '合同下载失败');
        }
      } catch (error) {
        console.error('下载合同失败:', error);
        message.error('下载合同失败');
      } finally {
        setDownloadLoading(false);
      }
    };

    // 获取下载文件类型选项
    const getDownloadFileTypeOptions = () => [
      { label: 'PDF文件', value: 1, description: '标准PDF格式合同文件' },
      { label: 'PNG图片+PDF', value: 2, description: '多个单张PNG文件，含PDF文件' },
      { label: 'PNG分页压缩+PDF', value: 3, description: '分页PNG压缩文件，含PDF文件' }, 
      { label: '合同单张图片', value: 4, description: '合同单张图片，不含PDF文件' },
      { label: '所有分页图片', value: 5, description: '所有分页图片，不含PDF文件' }
    ];

    // 查询合同状态的函数 - 完全重写
    const checkContractStatus = async () => {
      if (!stepData.contract?.contractNo) {
        message.error('合同编号不存在，无法查询状态');
        return;
      }

      console.log(`🔍 开始查询合同状态，合同编号: ${stepData.contract.contractNo}`);
      setStatusLoading(true);
      
      try {
        // 调用后端API
        const response = await esignService.getContractStatus(stepData.contract.contractNo);
        console.log('📦 API响应 (原始):', response);
        console.log('📦 响应类型:', typeof response);
        
        // 🔥 重写：简化响应处理逻辑
        let apiResult = response;
        
        // 如果是字符串，尝试解析
        if (typeof response === 'string') {
          try {
            apiResult = JSON.parse(response);
            console.log('✅ JSON解析成功:', apiResult);
          } catch (e) {
            console.error('❌ JSON解析失败:', e);
            message.error('服务器响应格式错误');
            return;
          }
        }
        
        console.log('🔍 处理后的结果:', apiResult);
        console.log('🔍 检查字段:');
        console.log('  - success:', apiResult.success);
        console.log('  - message:', apiResult.message);
        console.log('  - data:', apiResult.data);
        console.log('  - statusInfo:', apiResult.statusInfo);
        
        // 🔥 重写：统一判断成功条件
        let isSuccess = false;
        let contractData = null;
        let statusValue = null;
        
        // 方式1：后端包装格式 {success: true, data: {...}, statusInfo: {...}}
        if (apiResult.success === true && apiResult.data) {
          isSuccess = true;
          contractData = apiResult;
          statusValue = apiResult.data?.status || apiResult.statusInfo?.status;
          console.log('✅ 识别为后端包装格式');
          console.log('📊 提取的状态值:', statusValue);
        }
        // 方式2：直接爱签API格式（如果data中包含code字段）
        else if (apiResult.data && typeof apiResult.data === 'object' && 
                'code' in apiResult.data && 
                (apiResult.data.code === 100000 || apiResult.data.code === '100000')) {
          isSuccess = true;
          contractData = apiResult.data;
          statusValue = apiResult.data.data?.status;
          console.log('✅ 识别为嵌套的爱签API格式');
          console.log('📊 提取的状态值:', statusValue);
        }
        
        if (isSuccess && contractData && statusValue !== undefined && statusValue !== null) {
          // 🎉 成功获取合同状态
          console.log('🎉 合同状态查询成功！状态值:', statusValue);
          
          setContractStatus(contractData);
          console.log('📋 设置的contractStatus:', contractData);
          console.log('📋 contractStatus.data.status:', contractData.data.status);
          
          // 状态映射
          const statusMap: { [key: number]: { text: string; type: 'success' | 'info' | 'warning' | 'error' } } = {
            0: { text: '等待签约', type: 'warning' },
            1: { text: '签约中', type: 'info' },
            2: { text: '已签约', type: 'success' },
            3: { text: '过期', type: 'error' },
            4: { text: '拒签', type: 'error' },
            6: { text: '作废', type: 'warning' },
            7: { text: '撤销', type: 'warning' }
          };
          
          const statusInfo = statusMap[statusValue] || { text: '未知状态', type: 'info' };
          
          // 显示成功消息
          if (statusInfo.type === 'success') {
            message.success(`合同状态：${statusInfo.text}`);
          } else if (statusInfo.type === 'error') {
            message.error(`合同状态：${statusInfo.text}`);
          } else if (statusInfo.type === 'warning') {
            message.warning(`合同状态：${statusInfo.text}`);
          } else {
            message.info(`合同状态：${statusInfo.text}`);
          }
          
        } else {
          // 🚨 查询失败
          console.log('❌ 合同状态查询失败');
          console.log('  - isSuccess:', isSuccess);
          console.log('  - contractData:', contractData);
          console.log('  - statusValue:', statusValue);
          
          setContractStatus(null);
          
          // 错误处理
          let errorMessage = '合同状态查询失败';
          let errorCode = null;
          
          // 获取错误码和错误信息
          if (apiResult.success === false) {
            errorCode = apiResult.errorCode;
            errorMessage = apiResult.message || errorMessage;
          } else if (apiResult.data && typeof apiResult.data === 'object' && 
                    'code' in apiResult.data && apiResult.data.code !== 100000) {
            errorCode = apiResult.data.code;
            errorMessage = (apiResult.data as any).msg || errorMessage;
          }
          
          // 根据错误码显示具体错误
          if (errorCode) {
            switch (Number(errorCode)) {
              case 100056:
                errorMessage = '参数错误：合同编号为空或格式错误';
                break;
              case 100066:
                errorMessage = '合同不存在，请检查合同编号是否正确';
                break;
              case 100613:
                errorMessage = '合同已被删除';
                break;
              default:
                errorMessage = `查询失败 (错误码: ${errorCode}): ${errorMessage}`;
            }
          }
          
          message.error(errorMessage);
        }
        
      } catch (error: any) {
        console.error('🚨 查询合同状态异常:', error);
        setContractStatus(null);
        
        // 网络或系统错误处理
        if (error?.response?.status === 404) {
          message.error('合同查询服务不可用，请稍后重试');
        } else if (error?.response?.status >= 500) {
          message.error('服务器内部错误，请联系管理员');
        } else if (error?.message?.includes('Network Error')) {
          message.error('网络连接失败，请检查网络');
        } else {
          message.error('查询合同状态失败，请重试');
        }
      } finally {
        setStatusLoading(false);
      }
    };

    // 撤销合同的函数
    const withdrawContract = async () => {
      if (!stepData.contract?.contractNo) {
        message.error('合同编号不存在');
        return;
      }

      // 确认对话框
      Modal.confirm({
        title: '确认撤销合同',
        content: '撤销后的合同将无法恢复，您确定要撤销此合同吗？',
        okText: '确认撤销',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          setWithdrawLoading(true);
          try {
            const result = await esignService.withdrawContract(
              stepData.contract.contractNo,
              '用户主动撤销合同'
            );
            console.log('撤销合同结果:', result);
            
            if (result.success) {
              message.success('合同撤销成功');
              // 撤销成功后，重新查询合同状态
              await checkContractStatus();
            } else {
              message.error(result.message || '撤销合同失败');
            }
          } catch (error) {
            console.error('撤销合同失败:', error);
            message.error('撤销合同失败');
          } finally {
            setWithdrawLoading(false);
          }
        }
      });
    };

    // 状态辅助函数
    const getStatusColor = (status: number): string => {
      const colorMap: { [key: number]: string } = {
        0: 'orange',  // 等待签约
        1: 'blue',    // 签约中
        2: 'green',   // 已签约
        3: 'red',     // 过期
        4: 'red',     // 拒签
        6: 'gray',    // 作废
        7: 'gray'     // 撤销
      };
      return colorMap[status] || 'gray';
    };

    const getStatusText = (status: number): string => {
      const textMap: { [key: number]: string } = {
        0: '等待签约',
        1: '签约中',
        2: '已签约',
        3: '过期',
        4: '拒签',
        6: '作废',
        7: '撤销'
      };
      return textMap[status] || '未知状态';
    };

    const getStatusDescription = (status: number): string => {
      const descMap: { [key: number]: string } = {
        0: '合同已创建，等待签署方签约',
        1: '合同正在签署过程中',
        2: '合同已完成签署',
        3: '合同已过期',
        4: '签署方拒绝签署合同',
        6: '合同已作废',
        7: '合同已撤销'
      };
      return descMap[status] || '无法获取合同状态信息';
    };

    return (
      <Card title="步骤5：下载合同" bordered={false}>
        <Alert
          message="合同签署流程完成"
          description="您可以查询合同状态，预览合同信息，然后选择不同格式下载已签署的合同。"
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {stepData.contract && (
          <Card title="合同信息" size="small" style={{ marginBottom: 24, background: '#f0f9ff' }}>
            <p><strong>合同编号：</strong>{stepData.contract.contractNo}</p>
            <p><strong>合同名称：</strong>{stepData.contract.contractName || '安得家政三方服务合同'}</p>
            <p><strong>模板编号：</strong>{stepData.contract.templateNo}</p>
          </Card>
        )}

        {/* 合同状态显示 */}
        {contractStatus && (
          <Card title="合同状态信息" size="small" style={{ marginBottom: 24, background: '#f0f9ff' }}>
            <Row gutter={16}>
              <Col span={8}>
                <p><strong>合同编号：</strong>{contractStatus.data?.contractNo}</p>
              </Col>
              <Col span={8}>
                <p><strong>合同名称：</strong>{contractStatus.data?.contractName}</p>
              </Col>
              <Col span={8}>
                <p><strong>当前状态：</strong>
                  <Tag color={getStatusColor(contractStatus.data.status)}>
                    {getStatusText(contractStatus.data.status)}
                  </Tag>
                </p>
              </Col>
            </Row>
            <p><strong>状态说明：</strong>{getStatusDescription(contractStatus.data.status)}</p>
          </Card>
        )}

        {/* 操作按钮区域 */}
        <div style={{ marginBottom: 24 }}>
          <Space wrap>
            <Button 
              type="primary" 
              onClick={checkContractStatus}
              loading={statusLoading}
              icon={<SearchOutlined />}
            >
              查询合同状态
            </Button>
            <Button 
              type="default" 
              onClick={previewContract}
              loading={previewLoading}
            >
              预览合同信息
            </Button>
            <Button 
              type="primary" 
              onClick={downloadContract}
              loading={downloadLoading}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              下载合同
            </Button>
            {/* 新增：合同详情按钮 */}
            {stepData.localContractId && (
              <Button 
                type="primary"
                onClick={() => {
                  window.open(`/contracts/detail/${stepData.localContractId}`, '_blank');
                  message.success('合同详情页已在新窗口打开');
                }}
                icon={<FileTextOutlined />}
                style={{ background: '#1890ff', borderColor: '#1890ff' }}
              >
                合同详情
              </Button>
            )}
            <Button 
              danger
              onClick={withdrawContract}
              loading={withdrawLoading}
              style={{ marginLeft: 8 }}
            >
              撤销合同
            </Button>
          </Space>
        </div>

        {/* 预览信息显示 */}
        {previewData && (
          <Card title="合同预览信息" size="small" style={{ marginBottom: 24, background: '#f6ffed' }}>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>合同编号：</strong>{previewData.contractNo}</p>
                <p><strong>可下载状态：</strong>
                  <Tag color={previewData.previewInfo?.canDownload ? 'green' : 'red'}>
                    {previewData.previewInfo?.canDownload ? '可下载' : '不可下载'}
                  </Tag>
                </p>
                {previewData.fallbackMode && (
                  <p><strong>预览模式：</strong>
                    <Tag color="orange">状态信息模式</Tag>
                  </p>
                )}
              </Col>
              <Col span={12}>
                <p><strong>推荐格式：</strong>
                  {previewData.previewInfo?.availableFormats?.find((f: any) => f.recommended)?.name || 'PDF文件'}
                </p>
                <p><strong>可用格式数量：</strong>{previewData.previewInfo?.availableFormats?.length || 0}</p>
                {previewData.previewInfo?.hasPreviewImage !== undefined && (
                  <p><strong>预览图：</strong>
                    <Tag color={previewData.previewInfo.hasPreviewImage ? 'green' : 'orange'}>
                      {previewData.previewInfo.hasPreviewImage ? '已生成' : '未生成'}
                    </Tag>
                  </p>
                )}
              </Col>
            </Row>
            
            {/* 显示预览图片（如果有） */}
            {previewData.previewData && (
              <div style={{ marginTop: 16 }}>
                <p><strong>预览图片：</strong></p>
                {typeof previewData.previewData === 'string' ? (
                  <img 
                    src={`data:image/png;base64,${previewData.previewData}`}
                    alt="合同预览"
                    style={{ maxWidth: '100%', maxHeight: '400px', border: '1px solid #d9d9d9' }}
                  />
                ) : (
                  <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                    <pre>{JSON.stringify(previewData.previewData, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
            
            {/* 显示合同状态（如果是备选模式） */}
            {previewData.fallbackMode && previewData.status && (
              <div style={{ marginTop: 16 }}>
                <p><strong>合同状态信息：</strong></p>
                <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                  <pre>{JSON.stringify(previewData.status, null, 2)}</pre>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 下载选项配置 */}
        <Card title="下载选项配置" size="small" style={{ marginBottom: 24 }}>
          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="强制下载">
                  <Select
                    value={downloadOptions.force}
                    onChange={(value) => setDownloadOptions(prev => ({ ...prev, force: value }))}
                  >
                    <Option value={0}>仅下载已签署完成的合同</Option>
                    <Option value={1}>强制下载任何状态的合同</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="下载文件类型">
                  <Select
                    value={downloadOptions.downloadFileType}
                    onChange={(value) => setDownloadOptions(prev => ({ ...prev, downloadFileType: value }))}
                  >
                    {getDownloadFileTypeOptions().map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {/* 显示当前选择的文件类型描述 */}
            <Alert
              message="文件类型说明"
              description={getDownloadFileTypeOptions().find(opt => opt.value === downloadOptions.downloadFileType)?.description}
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          </Form>
        </Card>

        {contractStatus && (
          <Card title="合同状态详情" size="small" style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Tag color={contractStatus.status === 'completed' ? 'green' : 'orange'}>
                状态：{contractStatus.status || '未知'}
              </Tag>
              {contractStatus.signProgress && (
                <Tag color="blue">
                  签署进度：{contractStatus.signProgress}
                </Tag>
              )}
            </div>
            
            <pre style={{ 
              background: '#f6f8fa', 
              padding: 16, 
              borderRadius: 4, 
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontSize: '12px'
            }}>
              {JSON.stringify(contractStatus, null, 2)}
            </pre>
          </Card>
        )}

        <Alert
          message="操作说明"
          description={
            <div>
              <p><strong>下载选项说明：</strong></p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li><strong>强制下载：</strong>选择是否在合同未完全签署时也允许下载</li>
                <li><strong>PDF文件：</strong>标准格式，适合打印和存档</li>
                <li><strong>PNG图片+PDF：</strong>包含图片格式和PDF文件的压缩包</li>
                <li><strong>分页压缩：</strong>每页单独的PNG图片加PDF文件</li>
                <li><strong>单张图片：</strong>整个合同的一张长图</li>
                <li><strong>分页图片：</strong>每页单独的PNG图片文件</li>
              </ul>
              <p><strong>操作流程：</strong></p>
              <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>先查询合同状态确认签署进度</li>
                <li>预览合同信息了解可用格式</li>
                <li>根据需要选择下载文件类型</li>
                <li>点击下载合同按钮获取文件</li>
              </ol>
            </div>
          }
          type="info"
          style={{ marginBottom: 24 }}
        />

        <Form.Item>
          <Space>
            <Button onClick={() => setCurrentStep(3)} icon={<ArrowLeftOutlined />}>
              返回上一步
            </Button>
            <Button type="primary" onClick={() => window.location.reload()}>
              重新开始
            </Button>
          </Space>
        </Form.Item>
      </Card>
    );
  };

  // 渲染其他步骤的占位内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderStep1();
      case 1:
        return renderStep2();
      case 2:
        return renderStep3();
      case 3:
        return renderStep4();
      case 4:
        return renderStep5();
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          电子签名合同创建流程
        </Title>
        
        <Card style={{ marginBottom: 24 }}>
          <Steps 
            current={currentStep} 
            items={steps}
            style={{ marginBottom: 0 }}
          />
        </Card>

        {renderStepContent()}

        {/* 步骤数据展示（调试用） */}
        {(stepData.users || stepData.contract) && (
          <Card title="已保存的步骤数据" style={{ marginTop: 24 }}>
            {stepData.users && (
              <Paragraph>
                <Text strong>甲乙双方用户数据:</Text>
                <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 4, marginTop: 8 }}>
                  {JSON.stringify(stepData.users, null, 2)}
                </pre>
              </Paragraph>
            )}
            {stepData.contract && (
              <Paragraph>
                <Text strong>合同数据:</Text>
                <pre style={{ background: '#f0f9ff', padding: 12, borderRadius: 4, marginTop: 8 }}>
                  {JSON.stringify(stepData.contract, null, 2)}
                </pre>
              </Paragraph>
            )}
          </Card>
        )}

        {/* 成功结果弹窗 */}
        <Modal
          title="用户添加成功"
          open={successModalVisible}
          onOk={() => {
            setSuccessModalVisible(false);
            setCurrentStep(1); // 进入下一步
          }}
          onCancel={() => setSuccessModalVisible(false)}
          okText="继续下一步"
          cancelText="关闭"
          width={800}
        >
          {contractResult && (
          <div>
            <Alert
                message="甲乙双方用户添加成功！"
                description="用户已成功添加到爱签平台，可以继续下一步操作。"
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="甲方（客户）" size="small">
                    <p><strong>状态：</strong> {contractResult.partyA?.success ? '✅ 成功' : '❌ 失败'}</p>
                    <p><strong>消息：</strong> {contractResult.partyA?.message}</p>
                    <p><strong>姓名：</strong> {contractResult.partyA?.request?.name}</p>
                    <p><strong>手机：</strong> {contractResult.partyA?.request?.mobile}</p>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="乙方（阿姨）" size="small">
                    <p><strong>状态：</strong> {contractResult.partyB?.success ? '✅ 成功' : '❌ 失败'}</p>
                    <p><strong>消息：</strong> {contractResult.partyB?.message}</p>
                    <p><strong>姓名：</strong> {contractResult.partyB?.request?.name}</p>
                    <p><strong>手机：</strong> {contractResult.partyB?.request?.mobile}</p>
                  </Card>
                </Col>
              </Row>
          </div>
        )}
      </Modal>
      </div>
    </div>
  );
};

// 包装组件提供App上下文
const ESignaturePageWithApp: React.FC = () => {
  return (
    <App>
      <ESignatureStepPage />
    </App>
  );
};

export default ESignaturePageWithApp; 