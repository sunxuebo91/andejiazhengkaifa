import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  SearchOutlined
} from '@ant-design/icons';
import esignService from '../../services/esignService';
import { customerService } from '../../services/customerService';
import { contractService } from '../../services/contractService';
import { JobType, JOB_TYPE_MAP } from '../../types/resume';
import apiService from '../../services/api';

const { Title, Text } = Typography;
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
  currentAddress?: string;
  expectedSalary?: string;
  workExperience?: string;
  education?: string;
}

// 数字转中文大写金额的函数
// suffix 参数控制后缀：'none' = 不带后缀（如：捌仟），'yuanzheng' = 带"圆整"（如：陆仟圆整）
const convertToChineseAmount = (amount: string | number, suffix: 'none' | 'yuanzheng' = 'none'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '零';

  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟'];
  const bigUnits = ['', '万', '亿'];

  if (num === 0) return suffix === 'yuanzheng' ? '零圆整' : '零';

  const integerPart = Math.floor(num);

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

  // 根据 suffix 参数添加后缀
  if (suffix === 'yuanzheng') {
    result += '圆整';
  }
  // suffix === 'none' 时不添加任何后缀

  return result;
};

	// 统一处理模板字段 key：去掉各种空白，避免“看起来一样但其实不相等”导致 set 后 UI 不显示
	const normalizeTplKey = (v: any): string => {
		return String(v ?? '')
			// 常见空白：空格/制表/换行/不间断空格/全角空格
			.replace(/[\s\u00A0\u3000]/g, '')
			.trim();
	};

const ESignatureStepPage: React.FC = () => {
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [form] = Form.useForm();
  const [step2Form] = Form.useForm();
  const navigate = useNavigate();

  // 🔥 换人模式相关状态
  const [searchParams] = useSearchParams();
  const [isChangeMode, setIsChangeMode] = useState(false);
  const [lockedCustomerPhone, setLockedCustomerPhone] = useState<string | null>(null);
  const [originalContractData, setOriginalContractData] = useState<any>(null); // 存储原合同数据

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

  /**
   * 根据“金额字段关键词”找到模板里真实存在的“大写字段 key”。
   * 目的：避免模板 key 含隐藏空白/不同写法，导致我们 hardcode 的 key 写进去了但 UI 绑定的是另一个 key。
   */
  const findUppercaseKeysFor = React.useCallback((baseKeyword: string): string[] => {
    const fields: any[] = selectedTemplate?.fields || [];
    const baseN = normalizeTplKey(baseKeyword);
    if (!baseN) return [];

    const keys: string[] = [];
    for (const f of fields) {
      const rawKey = f?.key;
      if (!rawKey) continue;
      const keyN = normalizeTplKey(rawKey);
      const labelN = normalizeTplKey(f?.label);

      const hasBase = keyN.includes(baseN) || labelN.includes(baseN);
      const hasUpper = keyN.includes('大写') || labelN.includes('大写');
      if (hasBase && hasUpper) keys.push(String(rawKey));
    }

    return Array.from(new Set(keys));
  }, [selectedTemplate]);

  const setUppercaseAmount = React.useCallback(
    (baseKeyword: string, chineseAmount: string, fallbackKeywords: string[] = []) => {
      let keys = findUppercaseKeysFor(baseKeyword);
      for (const fb of fallbackKeywords) {
        if (keys.length > 0) break;
        keys = findUppercaseKeysFor(fb);
      }

      if (keys.length === 0) {
        console.warn('⚠️ 未找到大写字段 key，无法自动填充:', { baseKeyword, fallbackKeywords, chineseAmount });
        return;
      }

      // 🔥 只使用第一个找到的 key（避免设置多个不同名称的字段）
      const targetKey = keys[0];

      // 🔥 获取当前所有表单值
      const currentValues = step2Form.getFieldsValue();

      // 🔥 构建新的 templateParams 对象
      const newTemplateParams = {
        ...currentValues.templateParams,
        [targetKey]: chineseAmount,
      };

      // 🔥 使用 setFieldsValue 更新整个 templateParams
      step2Form.setFieldsValue({
        ...currentValues,
        templateParams: newTemplateParams,
      });

      console.log('💰 自动填充大写:', { baseKeyword, targetKey, chineseAmount });
    },
    [findUppercaseKeysFor, step2Form]
  );

  // 搜索相关状态
  const [partyASearchResults, setPartyASearchResults] = useState<UserSearchResult[]>([]);
  const [partyBSearchResults, setPartyBSearchResults] = useState<UserSearchResult[]>([]);
  const [partyASearchValue, setPartyASearchValue] = useState('');
  const [partyBSearchValue, setPartyBSearchValue] = useState('');

  // 步骤5相关状态已删除，因为步骤5已被隐藏

  // 有效期选择相关状态 - 固定为365天
  // const [validityType, setValidityType] = useState('365'); // 默认365天
  // const [customDays, setCustomDays] = useState('');

  // 🔥 最终修复：使用 ref 来存储服务备注的真实选择，绕过 antd form 的 state 覆盖问题
  const serviceRemarksRef = useRef<string[]>([]);

  // 🔥 换人模式：检测 URL 参数并自动填充客户信息
  useEffect(() => {
    const mode = searchParams.get('mode');
    const phone = searchParams.get('phone');
    const contractId = searchParams.get('contractId');

    if (mode === 'change' && phone) {
      console.log('🔄 检测到换人模式，客户电话:', phone, '原合同ID:', contractId);
      setIsChangeMode(true);
      setLockedCustomerPhone(phone);

      // 自动搜索并填充客户信息
      fetchAndFillCustomerData(phone, contractId);
    }
  }, [searchParams]);

  // 🔥 换人模式：获取并自动填充客户数据
  const fetchAndFillCustomerData = async (phone: string, contractId?: string | null) => {
    try {
      setSearchLoading(true);
      console.log('🔍 换人模式：搜索客户信息，电话:', phone, '原合同ID:', contractId);

      // 搜索客户信息
      const customerResponse = await apiService.get('/api/customers/search', {
        search: phone,
        limit: 1
      });

      console.log('🔍 换人模式：客户搜索结果:', customerResponse);

      if (customerResponse.success && customerResponse.data && customerResponse.data.length > 0) {
        const customer = customerResponse.data[0];
        console.log('✅ 换人模式：找到客户信息:', customer);

        // 自动填充表单
        form.setFieldsValue({
          partyAName: customer.name,
          partyAMobile: customer.phone,
          partyAIdCard: customer.idCardNumber || '',
          partyAAddress: customer.address || ''
        });

        // 保存到 stepData
        const customerData: UserSearchResult = {
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          idCard: customer.idCardNumber,
          type: 'customer',
          source: '客户库',
          address: customer.address,
          customerAddress: customer.address
        };

        setStepData(prev => ({
          ...prev,
          selectedPartyA: customerData
        }));

        message.success(`换人模式：已自动填充客户信息 - ${customer.name}（${customer.phone}）`);
      } else {
        message.warning(`换人模式：未找到客户信息（电话：${phone}）`);
      }

      // 🔥 如果有原合同ID，获取原合同数据
      if (contractId) {
        console.log('🔍 换人模式：获取原合同数据，合同ID:', contractId);
        const contractResponse = await apiService.get(`/api/contracts/${contractId}`);
        console.log('🔍 换人模式：原合同数据:', contractResponse);

        if (contractResponse.success && contractResponse.data) {
          setOriginalContractData(contractResponse.data);
          console.log('✅ 换人模式：已保存原合同数据');
        }
      }
    } catch (error) {
      console.error('🔥 换人模式：获取客户信息失败:', error);
      message.error('获取客户信息失败');
    } finally {
      setSearchLoading(false);
    }
  };

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
    }
    // 隐藏步骤5（下载合同）
    // {
    //   title: '下载合同',
    //   content: 'step5',
    //   description: '下载已签署的合同'
    // }
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

  // 处理甲方搜索（只搜索客户库）
  const handlePartyASearch = async (value: string) => {
    setPartyASearchValue(value);
    if (value) {
      setSearchLoading(true);
      try {
        const results: UserSearchResult[] = [];

        // 只搜索客户库 - 使用电子签名专用搜索接口（包含流失客户）
        const customerResponse = await apiService.get('/api/customers/search', {
          search: value,
          limit: 10
        });

        // 响应数据结构: { success: true, data: [...] }
        if (customerResponse.success && customerResponse.data) {
          customerResponse.data.forEach((customer: any) => {
            results.push({
              id: customer._id,
              name: customer.name,
              phone: customer.phone,
              idCard: customer.idCardNumber,
              type: 'customer',
              source: '客户库',
              address: customer.address,
              customerAddress: customer.address
            });
          });
        }

        setPartyASearchResults(results);
      } catch (error) {
        console.error('搜索客户失败:', error);
        message.error('搜索客户失败');
      } finally {
        setSearchLoading(false);
      }
    } else {
      setPartyASearchResults([]);
    }
  };

  // 处理乙方搜索（只搜索阿姨简历库）
  const handlePartyBSearch = async (value: string) => {
    setPartyBSearchValue(value);
    if (value) {
      setSearchLoading(true);
      try {
        const results: UserSearchResult[] = [];

        // 只搜索阿姨简历库
        const workerResponse = await apiService.get('/api/resumes/search-workers', {
          phone: value,
          name: value,
          limit: 10
        });

        if (workerResponse.success && workerResponse.data) {
          workerResponse.data.forEach((worker: any) => {
            results.push({
              id: worker._id,
              name: worker.name,
              phone: worker.phone,
              idCard: worker.idNumber,
              type: 'worker',
              source: '阿姨简历库',
              address: worker.currentAddress,
              currentAddress: worker.currentAddress,
              age: worker.age,
              gender: worker.gender === 1 ? '女' : worker.gender === 2 ? '男' : '女',
              nativePlace: worker.nativePlace,
              salary: worker.expectedSalary ? worker.expectedSalary.toString() : undefined,
              expectedSalary: worker.expectedSalary ? worker.expectedSalary.toString() : undefined,
              workExperience: worker.workExperience ? worker.workExperience.toString() : undefined,
              education: worker.education
            });
          });
        }

        setPartyBSearchResults(results);
      } catch (error) {
        console.error('搜索阿姨失败:', error);
        message.error('搜索阿姨失败');
      } finally {
        setSearchLoading(false);
      }
    } else {
      setPartyBSearchResults([]);
    }
  };

  // 选择甲方用户
  const handlePartyASelect = (value: string) => {
    const selectedUser = partyASearchResults.find(user => user.phone === value);
    if (selectedUser) {
      // 获取服务地址（客户的address字段）
      const serviceAddress = (selectedUser as any).address || (selectedUser as any).customerAddress || '';

      form.setFieldsValue({
        partyAName: selectedUser.name,
        partyAMobile: selectedUser.phone,
        partyAIdCard: selectedUser.idCard || '',
        partyAAddress: serviceAddress // 填充服务地址
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
      // 获取联系地址（阿姨的currentAddress字段）
      const contactAddress = (selectedUser as any).currentAddress || '';

      form.setFieldsValue({
        partyBName: selectedUser.name,
        partyBMobile: selectedUser.phone,
        partyBIdCard: selectedUser.idCard || '',
        partyBAddress: contactAddress // 填充联系地址
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

  // 🔥 加载模板的控件信息（从爱签API获取真实字段）
  const loadTemplateFields = async (templateNo: string) => {
    try {
      setTemplateLoading(true);
      console.log('🔍 开始加载模板控件信息:', templateNo);

      // 调用后端API获取模板控件信息
      const response = await esignService.getTemplateData(templateNo);
      console.log('📋 爱签API返回的模板控件信息:', response);

      // 转换为前端需要的格式
      // 🔥 过滤掉签署区相关字段（dataType 6=签署区, 7=签署时间, 13=骑缝章, 15=备注签署区）
      const fields = response
        .filter((field: any) => {
          const dataType = field.dataType;
          // 过滤签署区相关字段
          if (dataType === 6 || dataType === 7 || dataType === 13 || dataType === 15) {
            console.log(`🚫 过滤签署区字段: ${field.dataKey} (dataType=${dataType})`);
            return false;
          }
          return true;
        })
        .map((field: any) => {
          // 🔥 调试：打印关键字段的原始数据
          if (field.dataKey === '服务类型' || field.dataKey === '首次匹配费大写') {
            console.log(`🔍 ${field.dataKey} 字段原始数据:`, field);
            console.log(`🔍 ${field.dataKey} dataType:`, field.dataType);
            console.log(`🔍 ${field.dataKey} options:`, field.options);
            console.log(`🔍 ${field.dataKey} 转换后的type:`, getFieldType(field.dataType));
          }

          return {
            key: field.dataKey,
            label: field.dataKey,
            type: getFieldType(field.dataType),
            required: field.required === 1,
            options: field.options || [],  // 🔥 直接使用原始options，不做转换
            originalField: field
          };
        });

      // 🔥 去重：同一个字段名可能在模板中出现多次（如"首次匹配费"出现4次）
      const seenKeys = new Set<string>();
      const uniqueFields = fields.filter((field: any) => {
        if (seenKeys.has(field.key)) {
          console.log(`🔄 去重字段: ${field.key}`);
          return false;
        }
        seenKeys.add(field.key);
        return true;
      });

      console.log('✅ 转换后的字段列表（去重后）:', uniqueFields);
      console.log('✅ 字段数量:', uniqueFields.length);

      // 更新选中的模板，添加字段信息
      const template = templates.find(t => t.templateNo === templateNo);
      if (template) {
        setSelectedTemplate({
          ...template,
          fields: uniqueFields  // 🔥 使用去重后的字段
        });
      }

    } catch (error) {
      console.error('❌ 加载模板控件信息失败:', error);
      message.error('加载模板控件信息失败');
    } finally {
      setTemplateLoading(false);
    }
  };

  // 🔥 根据爱签API的dataType转换为前端表单控件类型
  const getFieldType = (dataType: number): string => {
    switch (dataType) {
      case 1: return 'text';        // 单行文本
      case 2: return 'radio';       // 单选
      case 3: return 'checkbox';    // 勾选
      case 4: return 'idcard';      // 身份证
      case 5: return 'date';        // 日期
      case 8: return 'textarea';    // 多行文本
      case 9: return 'multiselect'; // 多选
      case 16: return 'select';     // 下拉控件
      default: return 'text';
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
        validityTime: '365', // 默认365天，固定值
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
      // setValidityType('365'); // 已固定为365天
      
      // 如果有步骤1的用户数据，这些数据会在getInitialValues中使用
      if (stepData.users?.batchRequest) {
        // 数据会在renderStep2的getInitialValues中自动填充
      }
    }
  }, [currentStep, stepData.users]);

  // 监听时间字段变化，自动计算有效期
  // 🔥 使用 ref 追踪是否已经初始化过默认时间，避免用户修改后被覆盖
  const timeFieldsInitializedRef = React.useRef(false);

  React.useEffect(() => {
    if (currentStep === 1) {
      // 🔥 只在首次进入步骤1且未初始化过时，才设置默认时间值
      // 这样用户修改后返回步骤1时不会被覆盖
      const formValues = step2Form.getFieldsValue();
      const hasEndYear = formValues?.templateParams?.['结束年'];

      // 如果已经有结束年的值，说明用户已经填写过或已初始化过，不再覆盖
      if (!timeFieldsInitializedRef.current && !hasEndYear) {
        timeFieldsInitializedRef.current = true;

        // 设置默认时间值并计算有效期
        const currentDate = new Date();
        const nextYearDate = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());

        // ⚠️ 不要用 setFieldsValue({ templateParams: {...} }) 覆盖整个对象，
        // 用 setFields 按 namePath 精确写入，避免把其它已填写字段清掉。
        step2Form.setFields([
          { name: ['templateParams', '开始年'], value: currentDate.getFullYear() },
          { name: ['templateParams', '开始月'], value: currentDate.getMonth() + 1 },
          { name: ['templateParams', '开始日'], value: currentDate.getDate() },
          { name: ['templateParams', '结束年'], value: nextYearDate.getFullYear() },
          { name: ['templateParams', '结束月'], value: nextYearDate.getMonth() + 1 },
          { name: ['templateParams', '结束日'], value: nextYearDate.getDate() },
        ]);

        console.log('📅 初始化默认时间值:', {
          开始: `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`,
          结束: `${nextYearDate.getFullYear()}-${nextYearDate.getMonth() + 1}-${nextYearDate.getDate()}`
        });
      }

      // 计算默认有效期
      setTimeout(() => {
        calculateValidityTime();
      }, 100); // 延迟一点确保表单值已设置
    }
  }, [currentStep]);

  // 🔥 换人模式：当原合同数据加载完成后，自动填充表单字段
  React.useEffect(() => {
    if (isChangeMode && originalContractData && originalContractData.templateParams && currentStep === 1 && selectedTemplate) {
      console.log('🔄 换人模式：原合同数据已加载，开始填充表单字段');
      console.log('🔄 原合同templateParams:', originalContractData.templateParams);

      // 延迟执行，确保模板字段已经加载完成
      setTimeout(() => {
        const fieldsToSet: { name: any[]; value: any }[] = [];

	        // 遍历原合同的所有templateParams
        Object.keys(originalContractData.templateParams).forEach(key => {
          let value = originalContractData.templateParams[key];
          const keyLower = key.toLowerCase();

          // 复制需要锁定的字段 + 工作内容字段（工作内容不锁定，但需要自动填充）
          if (
            keyLower.includes('服务类型') ||
            keyLower.includes('服务费') ||
            keyLower.includes('首次匹配费') ||
            keyLower.includes('服务地址') ||
            (keyLower.includes('结束') && (keyLower.includes('年') || keyLower.includes('月') || keyLower.includes('日') || keyLower.includes('时间'))) ||
            keyLower.includes('客户') ||
            keyLower.includes('甲方') ||
            keyLower.includes('多选') || // 🔥 工作内容字段（多选6、多选7等），需要自动填充但不锁定
            keyLower.includes('服务时间') || // 🔥 服务时间字段，需要自动填充但不锁定
            keyLower.includes('休息方式') || // 🔥 休息方式字段，需要自动填充但不锁定
            keyLower.includes('服务内容') || // 🔥 服务内容字段（多选），需要自动填充但不锁定
            keyLower.includes('服务备注') || // 🔥 服务备注字段，需要自动填充但不锁定
            keyLower.includes('服务项目') || // 🔥 服务项目字段，需要自动填充但不锁定
            keyLower.includes('合同备注')    // 🔥 合同备注字段，需要自动填充但不锁定
	          ) {
	            // 🔥 时间拆分字段：Select 的 Option value 是 number，这里强制转 number 避免“值有但下拉不显示”
	            if (['开始年', '开始月', '开始日', '结束年', '结束月', '结束日'].includes(key)) {
	              if (typeof value === 'string') {
	                const n = Number(value);
	                if (!Number.isNaN(n)) value = n;
	              }
	            }

	            // 🔥 日期字段：把“2027年2月3日/2027/2/3/2027-2-3”等转换为“2027-02-03”（给 type="date" 使用）
	            if (keyLower.includes('时间') && typeof value === 'string') {
	              const raw = value.trim();
	              const cn = raw.match(/^(\d+)年(\d+)月(\d+)日$/);
	              const slash = raw.match(/^(\d+)[/](\d+)[/](\d+)$/);
	              const dash = raw.match(/^(\d+)-(\d+)-(\d+)$/);
	              const match = cn || slash || dash;
	              if (match) {
	                const year = match[1];
	                const month = String(match[2]).padStart(2, '0');
	                const day = String(match[3]).padStart(2, '0');
	                const iso = `${year}-${month}-${day}`;
	                if (iso !== raw) {
	                  console.log(`  🔄 日期格式转换: ${key} = ${raw} → ${iso}`);
	                }
	                value = iso;
	              }
	            }

	            // ✅ 统一写入 templateParams（避免 options 字段写到根路径，导致 UI 读不到）
	            // 🔥 关键修复：找到模板中对应的字段 key
            const templateKey = (() => {
              const templateFields = selectedTemplate?.fields || [];
              // 1. 精确匹配
              const exact = templateFields.find((f: any) => f.key === key);
              if (exact) return exact.key;
              // 2. 模糊匹配
              const normalizedKey = key.replace(/\s+/g, '').toLowerCase();
              const fuzzy = templateFields.find((f: any) => {
                if (!f.key) return false;
                return f.key.replace(/\s+/g, '').toLowerCase() === normalizedKey;
              });
              if (fuzzy) return fuzzy.key;
              return key;
            })();
            fieldsToSet.push({ name: ['templateParams', templateKey], value });
	            console.log(`  ✅ 准备填充字段: ${key} → ${templateKey} = ${value}`);
	          }
        });

        // 🔥 特殊处理：如果原合同没有"合同结束时间"字段，但有"结束年月日"，则组合生成
        const hasEndTime = Object.keys(originalContractData.templateParams).some(k =>
          k.toLowerCase().includes('结束时间') || k.toLowerCase().includes('合同结束时间')
        );
        if (!hasEndTime) {
          const endYear = originalContractData.templateParams['结束年'];
          const endMonth = originalContractData.templateParams['结束月'];
          const endDay = originalContractData.templateParams['结束日'];
          if (endYear && endMonth && endDay) {
            const year = String(endYear);
            const month = String(endMonth).padStart(2, '0');
            const day = String(endDay).padStart(2, '0');
            const endTimeValue = `${year}-${month}-${day}`;

            // 尝试查找模板中的"合同结束时间"字段
            if (selectedTemplate && selectedTemplate.fields) {
              const endTimeField = selectedTemplate.fields.find((f: any) =>
                f.key && (f.key.includes('合同结束时间') || f.key.includes('结束时间'))
              );
              if (endTimeField) {
                fieldsToSet.push({ name: ['templateParams', endTimeField.key], value: endTimeValue });
                console.log(`  ✅ 组合生成结束时间字段: ${endTimeField.key} = ${endTimeValue}`);
              }
            }
          }
        }

        // 🔥 辅助函数：将日期转换为 ISO 格式
        const convertDateToISO = (value: string): string => {
          const raw = value.trim();
          const cn = raw.match(/^(\d+)年(\d+)月(\d+)日$/);
          const slash = raw.match(/^(\d+)[/](\d+)[/](\d+)$/);
          const dash = raw.match(/^(\d+)-(\d+)-(\d+)$/);
          const match = cn || slash || dash;
          if (match) {
            return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
          }
          return raw;
        };

        // 🔥 辅助函数：在模板字段中查找匹配的 key
        const findTemplateFieldKey = (keywords: string[]): string | null => {
          const templateFields = selectedTemplate?.fields || [];
          for (const field of templateFields) {
            if (!field.key) continue;
            const keyLower = field.key.toLowerCase().replace(/\s+/g, '');
            for (const keyword of keywords) {
              if (keyLower.includes(keyword.toLowerCase())) {
                return field.key;
              }
            }
          }
          return null;
        };

        // 🔥 额外保障：确保结束时间字段被正确填充（即使原合同 key 和模板 key 不完全一致）
        const endTimeTemplateKey = findTemplateFieldKey(['结束时间', '合同结束时间']);
        if (endTimeTemplateKey) {
          const alreadySet = fieldsToSet.some(f => f.name[1] === endTimeTemplateKey);
          if (!alreadySet) {
            // 从原合同任何结束时间相关字段获取值
            const endTimeOriginalKey = Object.keys(originalContractData.templateParams).find(k =>
              k.toLowerCase().includes('结束时间') || k.toLowerCase().includes('合同结束时间')
            );
            if (endTimeOriginalKey) {
              const value = convertDateToISO(originalContractData.templateParams[endTimeOriginalKey]);
              fieldsToSet.push({ name: ['templateParams', endTimeTemplateKey], value });
              console.log(`  ✅ 补充填充结束时间: ${endTimeTemplateKey} = ${value}`);
            } else {
              // 从年月日组合
              const endYear = originalContractData.templateParams['结束年'];
              const endMonth = originalContractData.templateParams['结束月'];
              const endDay = originalContractData.templateParams['结束日'];
              if (endYear && endMonth && endDay) {
                const value = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
                fieldsToSet.push({ name: ['templateParams', endTimeTemplateKey], value });
                console.log(`  ✅ 从年月日组合填充结束时间: ${endTimeTemplateKey} = ${value}`);
              }
            }
          }
        }

        // 🔥 额外保障：确保服务类型字段被正确填充
        const serviceTypeTemplateKey = findTemplateFieldKey(['服务类型']);
        if (serviceTypeTemplateKey) {
          const alreadySet = fieldsToSet.some(f => f.name[1] === serviceTypeTemplateKey);
          if (!alreadySet) {
            const serviceTypeOriginalKey = Object.keys(originalContractData.templateParams).find(k =>
              k.toLowerCase().includes('服务类型')
            );
            if (serviceTypeOriginalKey) {
              fieldsToSet.push({ name: ['templateParams', serviceTypeTemplateKey], value: originalContractData.templateParams[serviceTypeOriginalKey] });
              console.log(`  ✅ 补充填充服务类型: ${serviceTypeTemplateKey} = ${originalContractData.templateParams[serviceTypeOriginalKey]}`);
            }
          }
        }

        // 🔥 额外保障：确保首次匹配费大写字段被正确填充
        const matchFeeUpperTemplateKey = findTemplateFieldKey(['首次匹配费大写']);
        if (matchFeeUpperTemplateKey) {
          const alreadySet = fieldsToSet.some(f => f.name[1] === matchFeeUpperTemplateKey);
          if (!alreadySet) {
            const matchFeeUpperOriginalKey = Object.keys(originalContractData.templateParams).find(k =>
              k.toLowerCase().includes('首次匹配费大写')
            );
            if (matchFeeUpperOriginalKey) {
              let value = originalContractData.templateParams[matchFeeUpperOriginalKey];
              // 处理"元"和"圆"的不一致
              if (typeof value === 'string') {
                value = value.replace(/元/g, '圆');
              }
              fieldsToSet.push({ name: ['templateParams', matchFeeUpperTemplateKey], value });
              console.log(`  ✅ 补充填充首次匹配费大写: ${matchFeeUpperTemplateKey} = ${value}`);
            }
          }
        }

        if (fieldsToSet.length > 0) {
          step2Form.setFields(fieldsToSet);
          console.log(`🔄 换人模式：已填充 ${fieldsToSet.length} 个字段`);
        }

        console.log('🔄 换人模式：字段填充完成');
      }, 500); // 延迟500ms，确保模板字段已渲染
    }
  }, [isChangeMode, originalContractData, currentStep, selectedTemplate]);

  // 步骤2提交处理
  const handleStep2Submit = async (values: any) => {
    try {
      setLoading(true);
      console.log('提交合同创建数据:', values);

      // 生成合同编号
      const contractNo = `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 填充甲乙双方信息到模板参数 - 只保留模板真正需要的字段
      // 🔥 调试：打印模板参数的所有字段名
      console.log('🔍 模板参数字段名列表:', Object.keys(values.templateParams || {}));
      console.log('🔍 步骤1用户数据:', stepData.users?.batchRequest);

      // 🔥 调试：打印用户填写的时间值（包括完整日期字段和分开的年月日字段）
      console.log('📅 用户填写的时间值:', {
        // 完整日期字段（模板可能使用这种格式）
        合同开始时间: values.templateParams?.['合同开始时间'],
        合同结束时间: values.templateParams?.['合同结束时间'],
        服务开始时间: values.templateParams?.['服务开始时间'],
        服务结束时间: values.templateParams?.['服务结束时间'],
        // 分开的年月日字段（模板可能使用这种格式）
        开始年: values.templateParams?.['开始年'],
        开始月: values.templateParams?.['开始月'],
        开始日: values.templateParams?.['开始日'],
        结束年: values.templateParams?.['结束年'],
        结束月: values.templateParams?.['结束月'],
        结束日: values.templateParams?.['结束日'],
      });

      const enhancedTemplateParams = {
        ...values.templateParams,
        // 只映射模板控件真正需要的字段，避免重复
        // ⚠️ 注意："甲方"、"乙方"、"丙方" 是签署区字段（dataType 6/7），不是文本字段！
        // 这些字段由爱签系统自动处理，不需要我们填充！
        // 甲方（客户）详细信息 - 使用模板控件要求的字段名
        '客户姓名': values.templateParams?.['客户姓名'] || stepData.users?.batchRequest?.partyAName,
        '客户电话': values.templateParams?.['客户电话'] || values.templateParams?.['客户联系方式'] || values.templateParams?.['甲方电话'] || values.templateParams?.['甲方联系电话'] || values.templateParams?.['甲方联系方式'] || stepData.users?.batchRequest?.partyAMobile,
        '客户联系方式': values.templateParams?.['客户联系方式'] || values.templateParams?.['客户电话'] || values.templateParams?.['甲方联系方式'] || values.templateParams?.['甲方电话'] || stepData.users?.batchRequest?.partyAMobile,
        '客户身份证号': values.templateParams?.['客户身份证号'] || values.templateParams?.['甲方身份证'] || values.templateParams?.['甲方身份证号'] || stepData.users?.batchRequest?.partyAIdCard,
        // 乙方（阿姨）详细信息 - 使用模板控件要求的字段名
        '阿姨姓名': values.templateParams?.['阿姨姓名'] || values.templateParams?.['乙方姓名'] || stepData.users?.batchRequest?.partyBName,
        '阿姨电话': values.templateParams?.['阿姨电话'] || values.templateParams?.['乙方电话'] || stepData.users?.batchRequest?.partyBMobile,
        '阿姨身份证号': values.templateParams?.['阿姨身份证号'] || values.templateParams?.['阿姨身份证'] || values.templateParams?.['乙方身份证'] || stepData.users?.batchRequest?.partyBIdCard,
        '阿姨身份证': values.templateParams?.['阿姨身份证'] || values.templateParams?.['阿姨身份证号'] || values.templateParams?.['乙方身份证'] || stepData.users?.batchRequest?.partyBIdCard,
        // 服务费相关 - 自动生成大写金额（⚠️ 只添加模板中实际存在的字段）
        // 🔥 强制使用新的转换函数重新生成大写金额，确保格式正确
        // '大写服务费': values.templateParams?.['大写服务费'] || convertToChineseAmount(values.templateParams?.['服务费'] || '0'),  // ❌ 模板中不存在
        '服务费大写': convertToChineseAmount(values.templateParams?.['服务费'] || '0', 'none'),
        // '匹配费大写': values.templateParams?.['匹配费大写'] || convertToChineseAmount(values.templateParams?.['匹配费'] || '0'),  // ❌ 模板中不存在
        '首次匹配费大写': values.templateParams?.['首次匹配费大写'] || convertToChineseAmount(values.templateParams?.['首次匹配费'] || '0', 'none'),
        '阿姨工资大写': convertToChineseAmount(values.templateParams?.['阿姨工资'] || '0', 'yuanzheng'),
        // 🔥 时间相关字段处理 - 优先使用用户填写的完整日期字段，否则从分开的年月日构建
        // 辅助函数：从完整日期字符串中提取年月日
        '服务开始时间': (() => {
          // 优先使用用户直接填写的完整日期
          if (values.templateParams?.['合同开始时间']) return values.templateParams['合同开始时间'];
          if (values.templateParams?.['服务开始时间']) return values.templateParams['服务开始时间'];
          // 否则从分开的年月日构建
          const year = values.templateParams?.['开始年'] || new Date().getFullYear();
          const month = values.templateParams?.['开始月'] || (new Date().getMonth() + 1);
          const day = values.templateParams?.['开始日'] || new Date().getDate();
          return `${year}年${month}月${day}日`;
        })(),
        '服务结束时间': (() => {
          if (values.templateParams?.['合同结束时间']) return values.templateParams['合同结束时间'];
          if (values.templateParams?.['服务结束时间']) return values.templateParams['服务结束时间'];
          const year = values.templateParams?.['结束年'] || (new Date().getFullYear() + 1);
          const month = values.templateParams?.['结束月'] || (new Date().getMonth() + 1);
          const day = values.templateParams?.['结束日'] || new Date().getDate();
          return `${year}年${month}月${day}日`;
        })(),
        '合同开始时间': (() => {
          if (values.templateParams?.['合同开始时间']) return values.templateParams['合同开始时间'];
          if (values.templateParams?.['服务开始时间']) return values.templateParams['服务开始时间'];
          const year = values.templateParams?.['开始年'] || new Date().getFullYear();
          const month = values.templateParams?.['开始月'] || (new Date().getMonth() + 1);
          const day = values.templateParams?.['开始日'] || new Date().getDate();
          return `${year}年${month}月${day}日`;
        })(),
        '合同结束时间': (() => {
          if (values.templateParams?.['合同结束时间']) return values.templateParams['合同结束时间'];
          if (values.templateParams?.['服务结束时间']) return values.templateParams['服务结束时间'];
          const year = values.templateParams?.['结束年'] || (new Date().getFullYear() + 1);
          const month = values.templateParams?.['结束月'] || (new Date().getMonth() + 1);
          const day = values.templateParams?.['结束日'] || new Date().getDate();
          return `${year}年${month}月${day}日`;
        })(),
        '服务期限': (() => {
          const startDate = values.templateParams?.['合同开始时间'] || values.templateParams?.['服务开始时间'] ||
            `${values.templateParams?.['开始年'] || new Date().getFullYear()}年${values.templateParams?.['开始月'] || (new Date().getMonth() + 1)}月${values.templateParams?.['开始日'] || new Date().getDate()}日`;
          const endDate = values.templateParams?.['合同结束时间'] || values.templateParams?.['服务结束时间'] ||
            `${values.templateParams?.['结束年'] || (new Date().getFullYear() + 1)}年${values.templateParams?.['结束月'] || (new Date().getMonth() + 1)}月${values.templateParams?.['结束日'] || new Date().getDate()}日`;
          return `${startDate}至${endDate}`;
        })(),
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

      // 🔥 全面检查所有字段 - 确保所有数组都转换为字符串
      console.log('🔥 前端修复：检查所有字段类型');
      Object.keys(enhancedTemplateParams).forEach(key => {
        const originalValue = enhancedTemplateParams[key];

        // 如果是数组，转换为分号分隔的字符串
        if (Array.isArray(originalValue)) {
          const convertedValue = originalValue.join('；');
          enhancedTemplateParams[key] = convertedValue;
          console.log(`🔥 字段"${key}"数组转换: [${originalValue.join(', ')}] -> "${convertedValue}"`);
        }
        // 如果是 undefined 或 null，转换为空字符串
        else if (originalValue === undefined || originalValue === null) {
          enhancedTemplateParams[key] = '';
          console.log(`🔥 字段"${key}"空值转换: ${originalValue} -> ""`);
        }
        // 如果是对象（但不是数组），转换为 JSON 字符串
        else if (typeof originalValue === 'object') {
          enhancedTemplateParams[key] = JSON.stringify(originalValue);
          console.log(`🔥 字段"${key}"对象转换:`, originalValue, `-> "${enhancedTemplateParams[key]}"`);
        }
        // 如果不是字符串或数字，转换为字符串
        else if (typeof originalValue !== 'string' && typeof originalValue !== 'number') {
          enhancedTemplateParams[key] = String(originalValue);
          console.log(`🔥 字段"${key}"类型转换: ${typeof originalValue} -> string: "${enhancedTemplateParams[key]}"`);
        }
      });
      
      // 移除可能导致重复显示的字段（这些字段不是模板控件需要的）
      delete enhancedTemplateParams['甲方姓名'];
      delete enhancedTemplateParams['甲方联系电话'];
      delete enhancedTemplateParams['甲方身份证号'];
      // delete enhancedTemplateParams['甲方'];  // ⚠️ 模板中需要此字段，不能删除！
      delete enhancedTemplateParams['乙方姓名'];
      delete enhancedTemplateParams['乙方电话'];
      delete enhancedTemplateParams['乙方身份证'];
      // delete enhancedTemplateParams['乙方'];  // ⚠️ 模板中需要此字段，不能删除！

      // 只提交模板真实字段，避免未知字段导致爱签参数错误
      // 但需要保留模板必填的“金额大写”等字段（部分字段可能未在字段列表中返回）
      const templateFieldKeys = (selectedTemplate?.fields || [])
        .map((field: any) => field.key)
        .filter(Boolean);
      const extraRequiredKeys = [
        '阿姨工资大写',
        // '匹配费大写',  // ❌ 模板中不存在
        '首次匹配费大写',
        '服务费大写',
        // '大写服务费'  // ❌ 模板中不存在
      ];
      const shouldFilterTemplateParams = templateFieldKeys.length > 0;
      const filteredTemplateParams = shouldFilterTemplateParams
        ? Object.fromEntries(
            Object.entries(enhancedTemplateParams).filter(([key]) =>
              templateFieldKeys.includes(key) || extraRequiredKeys.includes(key)
            )
          )
        : enhancedTemplateParams;

      if (shouldFilterTemplateParams) {
        const removedKeys = Object.keys(enhancedTemplateParams).filter(
          key => !templateFieldKeys.includes(key) && !extraRequiredKeys.includes(key)
        );
        if (removedKeys.length > 0) {
          console.warn('⚠️ 已过滤非模板字段:', removedKeys);
        }
      }
      
      const contractRequest = {
        contractNo: contractNo,
        contractName: '安得家政服务合同', // 固定合同名称
        templateNo: values.templateNo,
        templateParams: filteredTemplateParams,
        validityTime: 365, // 固定365天
        signOrder: parseInt(values.signOrder) || 1,
        readSeconds: parseInt(values.readSeconds) || 5,
        needAgree: parseInt(values.needAgree) || 0,
        autoExpand: parseInt(values.autoExpand) || 1,
        refuseOn: parseInt(values.refuseOn) || 0,
        autoContinue: parseInt(values.autoContinue) || 0,
        viewFlg: parseInt(values.viewFlg) || 0,
        enableDownloadButton: parseInt(values.enableDownloadButton) || 1
      };

      // 🔥🔥🔥 详细日志：打印最终请求参数
      console.log('🔥🔥🔥 ========== 最终合同请求参数 ==========');
      console.log('contractNo:', contractRequest.contractNo);
      console.log('contractName:', contractRequest.contractName);
      console.log('templateNo:', contractRequest.templateNo);
      console.log('validityTime:', contractRequest.validityTime);
      console.log('signOrder:', contractRequest.signOrder);
      console.log('🔥🔥🔥 templateParams 字段数量:', Object.keys(contractRequest.templateParams).length);

      // 检查数组字段
      const arrayFields = Object.entries(contractRequest.templateParams)
        .filter(([k, v]) => Array.isArray(v));
      if (arrayFields.length > 0) {
        console.error('🔥🔥🔥 ❌ 发现数组字段（这会导致错误）:', arrayFields);
      } else {
        console.log('🔥🔥🔥 ✅ 没有数组字段');
      }

      // 检查对象字段
      const objectFields = Object.entries(contractRequest.templateParams)
        .filter(([k, v]) => typeof v === 'object' && v !== null && !Array.isArray(v));
      if (objectFields.length > 0) {
        console.error('🔥🔥🔥 ❌ 发现对象字段（这会导致错误）:', objectFields);
      } else {
        console.log('🔥🔥🔥 ✅ 没有对象字段');
      }

      // 检查空值字段
      const nullFields = Object.entries(contractRequest.templateParams)
        .filter(([k, v]) => v === null || v === undefined);
      if (nullFields.length > 0) {
        console.warn('🔥🔥🔥 ⚠️ 发现空值字段:', nullFields.map(([k]) => k));
      }

      // 打印所有字段的类型
      console.log('🔥🔥🔥 所有字段类型:');
      Object.entries(contractRequest.templateParams).forEach(([key, value]) => {
        const type = Array.isArray(value) ? 'array' : typeof value;
        const preview = typeof value === 'string' && value.length > 50
          ? value.substring(0, 50) + '...'
          : value;
        console.log(`  ${key}: ${type} = ${JSON.stringify(preview)}`);
      });

      console.log('🔥🔥🔥 ========================================');

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
            // 🔥 日期提取：优先从完整日期字段解析，否则从分开的年月日构建
            startDate: (() => {
              // 辅助函数：从中文日期格式解析为 YYYY-MM-DD
              const parseChineseDate = (dateStr: string): string | null => {
                const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
                if (match) {
                  return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
                }
                return null;
              };

              // 优先尝试从完整日期字段解析
              const fullStartDate = values.templateParams?.['合同开始时间'] || values.templateParams?.['服务开始时间'];
              if (fullStartDate && typeof fullStartDate === 'string') {
                const parsed = parseChineseDate(fullStartDate);
                if (parsed) {
                  console.log('📅 从完整日期字段解析开始日期:', fullStartDate, '->', parsed);
                  return parsed;
                }
              }

              // 否则从分开的年月日构建
              const year = values.templateParams?.['开始年'] || new Date().getFullYear();
              const month = values.templateParams?.['开始月'] || (new Date().getMonth() + 1);
              const day = values.templateParams?.['开始日'] || new Date().getDate();
              return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            })(),
            endDate: (() => {
              const parseChineseDate = (dateStr: string): string | null => {
                const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
                if (match) {
                  return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
                }
                return null;
              };

              const fullEndDate = values.templateParams?.['合同结束时间'] || values.templateParams?.['服务结束时间'];
              if (fullEndDate && typeof fullEndDate === 'string') {
                const parsed = parseChineseDate(fullEndDate);
                if (parsed) {
                  console.log('📅 从完整日期字段解析结束日期:', fullEndDate, '->', parsed);
                  return parsed;
                }
              }

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

            // 🔥 保存模板参数，用于换人时复制
            templateParams: enhancedTemplateParams,

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
    // 🔥 换人模式：验证客户信息不能被修改
    if (isChangeMode && lockedCustomerPhone) {
      if (values.partyAMobile !== lockedCustomerPhone) {
        message.error('换人模式下不允许更改客户信息！客户电话必须为：' + lockedCustomerPhone);
        return;
      }
      console.log('✅ 换人模式验证通过：客户信息未被修改');
    }

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
        // ✅ 成功：不显示弹窗，直接跳转下一步
        message.success('甲乙双方用户添加成功！正在进入下一步...', 1.5);

        // 保存步骤数据
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

        form.resetFields();

        // 直接跳转到下一步
        setTimeout(() => {
          setCurrentStep(1);
        }, 500);

      } else {
        // ❌ 失败：显示详细错误信息弹窗
        const partyAMsg = response.partyA?.message || (response.partyA as any)?.msg || '未知错误';
        const partyBMsg = response.partyB?.message || (response.partyB as any)?.msg || '未知错误';

        let errorContent = '';
        if (!partyASuccess && !partyBSuccess) {
          errorContent = `甲方添加失败：${partyAMsg}\n乙方添加失败：${partyBMsg}`;
        } else if (!partyASuccess) {
          errorContent = `甲方添加失败：${partyAMsg}`;
        } else {
          errorContent = `乙方添加失败：${partyBMsg}`;
        }

        Modal.error({
          title: '添加用户失败',
          content: (
            <div>
              <p style={{ marginBottom: 12 }}>根据爱签平台返回的信息：</p>
              <div style={{
                background: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: 4,
                padding: 12,
                whiteSpace: 'pre-line'
              }}>
                {errorContent}
              </div>
              <p style={{ marginTop: 12, color: '#666', fontSize: 12 }}>
                请检查用户信息是否正确，或联系管理员处理。
              </p>
            </div>
          ),
          width: 500
        });
      }
    } catch (error: any) {
      console.error('添加用户失败:', error);

      // 网络错误或其他异常
      Modal.error({
        title: '添加用户失败',
        content: (
          <div>
            <p style={{ marginBottom: 12 }}>请求失败，请检查网络连接或联系管理员。</p>
            <div style={{
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: 4,
              padding: 12
            }}>
              {error?.message || '网络连接失败，请重试'}
            </div>
          </div>
        ),
        width: 500
      });
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
      {/* 🔥 换人模式提示 */}
      {isChangeMode && (
        <Alert
          message="换人模式"
          description={
            <div>
              <p><strong>正在为客户更换服务人员</strong></p>
              <p>• 客户信息已自动填充并锁定，不可修改（硬性规定）</p>
              <p>• 客户电话：{lockedCustomerPhone}</p>
              <p>• 请选择或输入新的服务人员（乙方）信息</p>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

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
              help={isChangeMode ? "换人模式：客户信息已锁定" : "输入姓名或手机号搜索客户库"}
            >
              <AutoComplete
                value={partyASearchValue}
                options={renderSearchOptions(partyASearchResults)}
                onSearch={handlePartyASearch}
                onSelect={handlePartyASelect}
                style={{ width: '100%' }}
                notFoundContent={searchLoading ? <Spin size="small" /> : '暂无搜索结果'}
                disabled={isChangeMode}
              >
                <Input
                  prefix={<SearchOutlined />}
                  placeholder={isChangeMode ? "换人模式：客户信息已锁定" : "输入姓名或手机号搜索客户库..."}
                  disabled={isChangeMode}
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
              <Input
                placeholder="请输入客户姓名"
                disabled={isChangeMode}
              />
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
              <Input
                placeholder="请输入手机号"
                disabled={isChangeMode}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="身份证号（可选）"
              name="partyAIdCard"
            >
              <Input
                placeholder="请输入身份证号"
                disabled={isChangeMode}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="服务地址"
              name="partyAAddress"
            >
              <Input
                placeholder={isChangeMode ? "换人模式：客户服务地址已锁定" : "客户服务地址（从客户库自动带入）"}
                disabled={isChangeMode}
              />
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
              help="输入姓名或手机号搜索阿姨简历库"
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
                  placeholder="输入姓名或手机号搜索阿姨简历库..."
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

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="联系地址"
              name="partyBAddress"
            >
              <Input placeholder="阿姨联系地址（从简历库自动带入）" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 通知设置已隐藏，使用默认值：短信通知开启，签约密码通知关闭 */}
      <Form.Item name="isNotice" initialValue={true} hidden>
        <Input />
      </Form.Item>
      <Form.Item name="isSignPwdNotice" initialValue={false} hidden>
        <Input />
      </Form.Item>

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
        validityTime: 365, // 固定365天
        signOrder: 1,
        readSeconds: 5,
        needAgree: 0,
        autoExpand: 1,
        refuseOn: 0,
        autoContinue: 0,
        viewFlg: 0,
        enableDownloadButton: 1,
        templateParams: {} // 添加 templateParams 初始值，确保表单能正确管理嵌套字段
      };

      return baseValues;
    };

    return (
      <Form
        key={isChangeMode && originalContractData ? 'loaded' : 'loading'}
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
          {/* 隐藏有效期字段，固定为365天 */}
          <Form.Item
            name="validityTime"
            hidden
          >
            <Input />
          </Form.Item>
          
          <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
            <Text type="success">
              📋 合同名称将自动设置为：<strong>安得家政服务合同</strong><br/>
              📅 合同有效期自动设置为：<strong>365天</strong>
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
              optionLabelProp="label"
              popupClassName="esign-template-select-popup"
              onChange={(value) => {
                // 🔥 选择模板后，加载模板的控件信息
                console.log('📝 选择模板:', value);
                loadTemplateFields(value);
              }}
            >
              {templates.map(template => (
                <Option 
                  key={template.templateNo} 
                  value={template.templateNo}
                  label={template.templateName}
                >
                  <div style={{ 
                    padding: '8px 4px',
                    lineHeight: '1.4',
                    whiteSpace: 'normal',
                    maxWidth: '560px'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
                      {template.templateName}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#888',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      maxWidth: '520px'
                    }}>
                      {template.description}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* 动态表单字段 - 智能分组布局 */}
          {selectedTemplate && (
            <div style={{ marginTop: 16 }}>
              {(() => {
                // 智能字段分组 - 更细致的分类
                const fieldGroups = {
                  partyA: { title: '甲方信息（客户）', icon: '👤', fields: [] as any[] },
                  partyB: { title: '乙方信息（阿姨）', icon: '👩‍💼', fields: [] as any[] },
                  // 🔥 合同信息拆分为多个子分类
                  contractService: { title: '服务信息', icon: '🏠', fields: [] as any[] },
                  contractTime: { title: '合同期限', icon: '📅', fields: [] as any[] },
                  contractFee: { title: '费用信息', icon: '💰', fields: [] as any[] },
                  contractWork: { title: '工作内容', icon: '📝', fields: [] as any[] },
                  contractOther: { title: '其他信息', icon: '📋', fields: [] as any[] }
                };

                // 根据字段关键词智能分组
                selectedTemplate.fields.forEach((field: any) => {
                  const fieldKey = field.key.toLowerCase();
                  const fieldLabel = (field.label || '').toLowerCase();

                  // 过滤签名相关字段 - 只隐藏签名区和签章区，保留日期字段
                  // 签约日期/签署日期字段需要保留，爱签平台会在签署时自动填充
                  if (fieldKey.includes('签名区') || fieldLabel.includes('签名区') ||
                      fieldKey.includes('签章区') || fieldLabel.includes('签章区')) {
                    console.log('跳过签名相关字段:', field.key, field.label);
                    return; // 跳过这些字段，不显示
                  }

                  // 甲方信息（客户）
                  if (fieldKey.includes('甲方') || fieldKey.includes('客户') || fieldKey.includes('签署人')) {
                    fieldGroups.partyA.fields.push(field);
                  }
                  // 🔥 乙方信息（阿姨）- 排除工资字段，但包含联系地址
                  else if ((fieldKey.includes('乙方') || fieldKey.includes('阿姨') ||
                           fieldKey.includes('籍贯') || fieldKey.includes('年龄') || fieldKey.includes('性别') ||
                           fieldKey.includes('联系地址')) &&
                           !fieldKey.includes('工资')) {
                    fieldGroups.partyB.fields.push(field);
                  }
                  // 🔥 服务信息：服务类型、服务地址、服务时间、休息方式
                  else if (fieldKey.includes('服务类型') || fieldKey.includes('服务地址') || fieldKey.includes('服务时间') || fieldKey.includes('休息')) {
                    fieldGroups.contractService.fields.push(field);
                  }
                  // 🔥 合同期限：开始时间、结束时间、期限、开始年月日、结束年月日
                  else if (fieldKey.includes('开始时间') || fieldKey.includes('结束时间') || fieldKey.includes('期限') ||
                           fieldKey.includes('开始年') || fieldKey.includes('开始月') || fieldKey.includes('开始日') ||
                           fieldKey.includes('结束年') || fieldKey.includes('结束月') || fieldKey.includes('结束日')) {
                    fieldGroups.contractTime.fields.push(field);
                  }
                  // 🔥 费用信息：服务费、工资、匹配费等
                  else if (fieldKey.includes('服务费') || fieldKey.includes('工资') || fieldKey.includes('匹配费') ||
                           (fieldKey.includes('费') && !fieldKey.includes('休息'))) {
                    fieldGroups.contractFee.fields.push(field);
                  }
                  // 🔥 工作安排：多选6等工作相关内容
                  else if (fieldKey.includes('多选')) {
                    fieldGroups.contractWork.fields.push(field);
                  }
                  // 🔥 其他信息：备注等
                  else {
                    fieldGroups.contractOther.fields.push(field);
                  }
                });

                // 🔥 对各个分组的字段进行排序
                const getFieldPriority = (field: any): number => {
                  const fieldKey = field.key.toLowerCase();

                  // 服务信息排序
                  if (fieldKey.includes('服务类型')) return 1;
                  if (fieldKey.includes('服务地址')) return 2;
                  if (fieldKey.includes('服务时间')) return 3;
                  if (fieldKey.includes('休息方式')) return 4;

                  // 时间相关排序
                  if (fieldKey.includes('开始时间')) return 10;
                  if (fieldKey.includes('结束时间')) return 11;
                  if (fieldKey.includes('期限')) return 12;

                  // 费用相关排序
                  if (fieldKey.includes('服务费') && !fieldKey.includes('大写')) return 20;
                  if (fieldKey.includes('服务费') && fieldKey.includes('大写')) return 21;
                  if (fieldKey.includes('阿姨工资') && !fieldKey.includes('大写')) return 22;
                  if (fieldKey.includes('阿姨工资') && fieldKey.includes('大写')) return 23;
                  if (fieldKey.includes('首次匹配费') && !fieldKey.includes('大写')) return 24;
                  if (fieldKey.includes('首次匹配费') && fieldKey.includes('大写')) return 25;
                  if (fieldKey.includes('费') || fieldKey.includes('金额')) return 26;

                  // 工作安排排序
                  if (fieldKey.includes('多选')) return 31;

                  // 其他字段
                  return 100;
                };

                // 对每个分组的字段进行排序
                Object.values(fieldGroups).forEach((group: any) => {
                  group.fields.sort((a: any, b: any) => {
                    return getFieldPriority(a) - getFieldPriority(b);
                  });
                });

                // 🔥 根据字段类型渲染不同的表单控件（使用爱签模板返回的字段信息）
                const renderFormControl = (field: any, isPartyAField: boolean = false) => {
                  const fieldKey = field.key.toLowerCase();
                  const fieldLabel = (field.label || '').toLowerCase();

                  // 🔥 换人模式：判断字段是否应该被禁用
                  let shouldDisable = false;
                  if (isChangeMode) {
                    // 1. 甲方（客户）字段禁用
                    if (isPartyAField) {
                      shouldDisable = true;
                    }
                    // 2. 合同结束时间禁用（包括年月日和完整时间字段）
                    else if (fieldKey.includes('结束') && (fieldKey.includes('年') || fieldKey.includes('月') || fieldKey.includes('日') || fieldKey.includes('时间'))) {
                      shouldDisable = true;
                    }
                    // 3. 首次匹配费禁用（包括大写）
                    else if (fieldKey.includes('首次匹配费') || fieldLabel.includes('首次匹配费')) {
                      shouldDisable = true;
                    }
                    // 4. 服务费禁用（包括大写）
                    else if (fieldKey.includes('服务费') || fieldLabel.includes('服务费')) {
                      shouldDisable = true;
                    }
                    // 5. 服务类型禁用
                    else if (fieldKey.includes('服务类型') || fieldLabel.includes('服务类型')) {
                      shouldDisable = true;
                    }
                    // 6. 服务地址禁用
                    else if (fieldKey.includes('服务地址') || fieldLabel.includes('服务地址')) {
                      shouldDisable = true;
                    }
                  }

                  // 特殊处理：如果是服务备注字段，使用多选框
                  if (fieldKey.includes('服务备注') || fieldKey.includes('服务内容') || fieldKey.includes('服务项目') ||
                      (field.options && field.options.length > 0)) {
                    // 🔥 判断是否需要显示补充输入框（只有服务备注相关字段才显示）
                    const showAdditionalInput = fieldKey.includes('服务备注') || fieldKey.includes('服务内容') || fieldKey.includes('服务项目');

                    // ⚠️ 注意：renderFormControl 会被外层 <Form.Item name={['templateParams', field.key]} ...> 包裹。
                    // 这里不要再套一层带 name/label 的 Form.Item，否则会出现：
                    // 1) label 重复显示；2) 值写到了根路径，导致换人时 setFields 写入 templateParams 后 UI 读不到。
                    return (
                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => {
                          const prevValue = prevValues?.templateParams?.[field.key];
                          const currentValue = currentValues?.templateParams?.[field.key];
                          return prevValue !== currentValue;
                        }}
                      >
                        {({ getFieldValue, setFieldValue }) => {
                          const currentRawValue = getFieldValue(['templateParams', field.key]) || '';

                          // 获取可用选项，优先使用模板字段自带的options，否则使用默认的SERVICE_OPTIONS
                          const availableOptions = field.options && field.options.length > 0
                            ? field.options.map((opt: any) => (typeof opt === 'string' ? opt : opt.label))
                            : SERVICE_OPTIONS;

                          const currentSelectedValues = currentRawValue
                            ? String(currentRawValue)
                                .split('；')
                                .map((s: string) => s.trim())
                                .filter((s: string) => s && availableOptions.includes(s))
                            : [];

                          return (
                            <div>
                              <Checkbox.Group
                                value={currentSelectedValues}
                                disabled={shouldDisable}
                                style={{
                                  width: '100%',
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                  gap: '8px 16px',
                                  marginBottom: showAdditionalInput ? '12px' : '0'
                                }}
                                onChange={(checkedValues) => {
                                  // 将选中的值实时保存到 ref 中（原逻辑保留）
                                  serviceRemarksRef.current = checkedValues;

                                  // 如果不需要补充输入框，直接保存为 “a；b；c”
                                  if (!showAdditionalInput) {
                                    setFieldValue(['templateParams', field.key], checkedValues.join('；'));
                                    return;
                                  }

                                  // 保留非选项部分（用户补充输入）
                                  const currentFormValue = String(getFieldValue(['templateParams', field.key]) || '');
                                  const parts = currentFormValue.split('；');
                                  const nonServiceParts = parts.filter((item: string) =>
                                    item.trim() && !availableOptions.includes(item.trim())
                                  );

                                  let finalValue = checkedValues.join('；');
                                  if (nonServiceParts.length > 0) {
                                    finalValue += (finalValue ? '；' : '') + nonServiceParts.join('；');
                                  }

                                  setFieldValue(['templateParams', field.key], finalValue);
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

                              {/* 只在服务备注相关字段显示补充输入框 */}
                              {showAdditionalInput && (
                                <Input.TextArea
                                  rows={3}
                                  placeholder="您也可以在此处补充其他服务内容或详细说明"
                                  style={{ marginTop: '8px' }}
                                  value={(() => {
                                    // TextArea 里只展示“非选项部分”的文本
                                    const currentFormValue = String(getFieldValue(['templateParams', field.key]) || '');
                                    const parts = currentFormValue.split('；');
                                    const nonServiceParts = parts.filter((item: string) =>
                                      item.trim() && !availableOptions.includes(item.trim())
                                    );
                                    return nonServiceParts.join('；');
                                  })()}
                                  onChange={(e) => {
                                    const additionalContent = e.target.value;
                                    const selected = currentSelectedValues;

                                    let finalValue = selected.join('；');
                                    if (additionalContent.trim()) {
                                      finalValue += (finalValue ? '；' : '') + additionalContent.trim();
                                    }
                                    setFieldValue(['templateParams', field.key], finalValue);
                                  }}
                                />
                              )}
                            </div>
                          );
                        }}
                      </Form.Item>
                    );
                  }

                  // 🔥 移除匹配费特殊处理，统一按照爱签模板字段渲染

                  // 特殊处理：有效期字段隐藏，固定为365天
                  if (fieldKey.includes('有效期') || fieldLabel.includes('有效期')) {
                    return (
                      <Form.Item
                        key={field.key}
                        name={['templateParams', field.key]}
                        hidden
                        initialValue="365"
                      >
                        <Input />
                      </Form.Item>
                    );
                  }

                  switch (field.type) {
                    case 'textarea':
                      return <Input.TextArea rows={3} placeholder={`请输入${field.label}`} disabled={shouldDisable} />;
                    case 'number':
                      return <Input type="number" placeholder={`请输入${field.label}`} disabled={shouldDisable} />;
                    case 'idcard':
                      // 身份证号码字段：18位数字，支持最后一位X
                      return (
                        <Input
                          placeholder={`请输入${field.label}`}
                          maxLength={18}
                          disabled={shouldDisable}
                        />
                      );
                    case 'date':
                      // 签约日期/签署日期字段特殊处理：显示但禁用，由爱签平台在签署时自动填充
                      const isSignDate = field.key.includes('签约日期') || field.key.includes('签署日期') ||
                                        field.label.includes('签约日期') || field.label.includes('签署日期');

                      // 🔥 合同结束时间字段：添加快捷选择按钮
                      // 注意：只匹配"结束时间"，不匹配"开始时间"
                      const isEndDate = (fieldKey.includes('结束时间') || fieldKey.includes('合同结束时间')) &&
                                       !fieldKey.includes('开始');

                      // 🔥 注意：不要用 <div> 包裹 Input，否则 Form.Item 无法正确注入 value
                      // 签署日期的提示信息移到 Form.Item 的 extra 属性中
                      return (
                        <Input
                          type="date"
                          placeholder={`请选择${field.label}`}
                          disabled={isSignDate || shouldDisable}
                          style={(isSignDate || shouldDisable) ? { backgroundColor: '#f5f5f5' } : undefined}
                        />
                      );
                    case 'checkbox':
                      return (
                        <Select placeholder={`请选择${field.label}`} disabled={shouldDisable}>
                          <Option value={true}>是</Option>
                          <Option value={false}>否</Option>
                        </Select>
                      );
                    case 'select':
                      // 🔥 dataType 16 = 下拉控件（单选）
                      return field.options && field.options.length > 0 ? (
                        <Select placeholder={`请选择${field.label}`} disabled={shouldDisable}>
                          {field.options.map((option: any, optionIndex: number) => {
                            const optionLabel = typeof option === 'string' ? option : option.label;
                            return (
                              <Option key={`${optionIndex}-${optionLabel}`} value={optionLabel}>
                                {optionLabel}
                              </Option>
                            );
                          })}
                        </Select>
                      ) : <Input placeholder={`请输入${field.label}`} disabled={shouldDisable} />;

                    case 'multiselect':
                      // 🔥 dataType 9 = 多选控件
                      return field.options && field.options.length > 0 ? (
                        <Checkbox.Group
                          disabled={shouldDisable}
                          style={{
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '8px 16px'
                          }}
                        >
                          {field.options.map((option: any, optionIndex: number) => {
                            const optionLabel = typeof option === 'string' ? option : option.label;
                            return (
                              <Checkbox
                                key={`${field.key}-${optionIndex}-${optionLabel}`}
                                value={optionLabel}
                                style={{ marginBottom: '4px' }}
                              >
                                {optionLabel}
                              </Checkbox>
                            );
                          })}
                        </Checkbox.Group>
                      ) : <Input placeholder={`请输入${field.label}`} disabled={shouldDisable} />;
                    default:
                      return <Input placeholder={`请输入${field.label}`} disabled={shouldDisable} />;
                  }
                };

                // 根据爱签API原始字段key设置默认值
                const getDefaultValue = (field: any) => {
                  const fieldKey = field.key.toLowerCase();
                  const fieldLabel = (field.label || '').toLowerCase();

                  // 🔥 调试：检查合同结束时间字段
                  if (fieldKey.includes('结束时间') || fieldKey.includes('合同结束时间')) {
                    console.log(`🔍 getDefaultValue 被调用: ${field.key}`);
                    console.log(`  - isChangeMode: ${isChangeMode}`);
                    console.log(`  - originalContractData: ${originalContractData ? '有值' : 'null'}`);
                    console.log(`  - templateParams: ${originalContractData?.templateParams ? '有值' : 'null'}`);
                    if (originalContractData?.templateParams) {
                      console.log(`  - 原合同结束时间值: ${originalContractData.templateParams['合同结束时间']}`);
                    }
                  }

                  const normalizeDateValue = (value: any) => {
                    if (value === undefined || value === null) return value;
                    if (typeof value === 'string') {
                      if (value.includes('年')) {
                        const match = value.match(/(\d+)年(\d+)月(\d+)日/);
                        if (match) {
                          const year = match[1];
                          const month = match[2].padStart(2, '0');
                          const day = match[3].padStart(2, '0');
                          return field.type === 'date' || fieldKey.includes('时间') ? `${year}-${month}-${day}` : value;
                        }
                      }
                      if (value.includes('/')) {
                        return value.replace(/\//g, '-');
                      }
                      const dateMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                      if (dateMatch) {
                        const year = dateMatch[1];
                        const month = dateMatch[2].padStart(2, '0');
                        const day = dateMatch[3].padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      }
                    }
                    return value;
                  };

                  const buildEndDateFromParts = (originalParams: any) => {
                    const endYear = originalParams?.['结束年'];
                    const endMonth = originalParams?.['结束月'];
                    const endDay = originalParams?.['结束日'];
                    if (endYear && endMonth && endDay) {
                      const year = String(endYear);
                      const month = String(endMonth).padStart(2, '0');
                      const day = String(endDay).padStart(2, '0');
                      return field.type === 'date'
                        ? `${year}-${month}-${day}`
                        : `${year}年${Number(endMonth)}月${Number(endDay)}日`;
                    }
                    return undefined;
                  };

                  // 🔥 换人模式：从原合同数据中获取需要锁定的字段值
                  if (isChangeMode && originalContractData && originalContractData.templateParams) {
                    const originalParams = originalContractData.templateParams;

                    const getOriginalValue = (key: string) => {
                      if (originalParams[key] !== undefined) return originalParams[key];
                      const trimmedKey = key.trim();
                      if (trimmedKey !== key && originalParams[trimmedKey] !== undefined) return originalParams[trimmedKey];
                      const normalizedKey = trimmedKey.replace(/\s+/g, '');
                      const matchedKey = Object.keys(originalParams).find(k => k.replace(/\s+/g, '') === normalizedKey);
                      if (matchedKey && originalParams[matchedKey] !== undefined) return originalParams[matchedKey];
                      return undefined;
                    };

                    const findFuzzyValue = (keywords: string[]) => {
                      const matchedKey = Object.keys(originalParams).find(key => {
                        const normalized = key.replace(/\s+/g, '').toLowerCase();
                        return keywords.some(keyword => normalized.includes(keyword));
                      });
                      return matchedKey ? originalParams[matchedKey] : undefined;
                    };

                    // 1. 结束时间字段（包括年月日和完整时间）
                    if (fieldKey.includes('结束') && (fieldKey.includes('年') || fieldKey.includes('月') || fieldKey.includes('日') || fieldKey.includes('时间'))) {
                      let value = getOriginalValue(field.key);
                      if (value === undefined && (fieldKey.includes('结束时间') || fieldLabel.includes('结束时间'))) {
                        value = findFuzzyValue(['结束时间', '合同结束时间']) ?? buildEndDateFromParts(originalParams);
                      }
                      value = normalizeDateValue(value);
                      if (value !== undefined) {
                        console.log(`🔄 换人模式：从原合同获取结束时间字段 ${field.key}:`, value);
                        return value;
                      }
                    }

                    // 2. 首次匹配费（包括大写）
                    if (fieldKey.includes('首次匹配费')) {
                      const value = originalParams[field.key];
                      if (value !== undefined) {
                        console.log(`🔄 换人模式：从原合同获取首次匹配费 ${field.key}:`, value);
                        return value;
                      }
                    }

                    // 3. 服务费（包括大写）
                    if (fieldKey.includes('服务费') || fieldLabel.includes('服务费')) {
                      const value = originalParams[field.key];
                      if (value !== undefined) {
                        console.log(`🔄 换人模式：从原合同获取服务费 ${field.key}:`, value);
                        return value;
                      }
                    }

                    // 4. 服务类型
                    if (fieldKey.includes('服务类型') || fieldLabel.includes('服务类型')) {
                      const value = originalParams[field.key];
                      if (value !== undefined) {
                        console.log(`🔄 换人模式：从原合同获取服务类型 ${field.key}:`, value);
                        return value;
                      }
                    }

                    // 5. 服务地址
                    if (fieldKey.includes('服务地址') || fieldLabel.includes('服务地址')) {
                      const value = originalParams[field.key];
                      if (value !== undefined) {
                        console.log(`🔄 换人模式：从原合同获取服务地址 ${field.key}:`, value);
                        return value;
                      }
                    }

                    // 6. 服务内容（多选字段）
                    if (fieldKey.includes('服务内容') || fieldLabel.includes('服务内容') ||
                        fieldKey.includes('服务备注') || fieldLabel.includes('服务备注') ||
                        fieldKey.includes('服务项目') || fieldLabel.includes('服务项目')) {
                      const value = originalParams[field.key];
                      if (value !== undefined) {
                        console.log(`🔄 换人模式：从原合同获取服务内容 ${field.key}:`, value);
                        return value;
                      }
                    }
                  }

                  if (!stepData.users?.batchRequest) return undefined;

                  const { partyAName, partyAMobile, partyAIdCard, partyBName, partyBMobile, partyBIdCard } = stepData.users.batchRequest;
                  const selectedPartyA = stepData.selectedPartyA;
                  const selectedPartyB = stepData.selectedPartyB;
                  
                  // 甲方（客户）信息匹配
                  if (fieldKey.includes('客户姓名') || fieldKey.includes('签署人姓名') || fieldKey.includes('甲方姓名')) {
                    console.log(`🔍 匹配到客户姓名字段: ${field.key}, 填充值: ${partyAName}`);
                    return partyAName;
                  }
                  if (fieldKey.includes('客户电话') || fieldKey.includes('客户联系方式') || fieldKey.includes('甲方电话') || fieldKey.includes('甲方联系电话') || fieldKey.includes('甲方联系人电话') || fieldKey.includes('甲方联系方式')) {
                    console.log(`🔍 匹配到客户电话字段: ${field.key}, 填充值: ${partyAMobile}`);
                    return partyAMobile;
                  }
                  if (fieldKey.includes('客户身份证') || fieldKey.includes('甲方身份证') || fieldKey.includes('客户身份证号') || fieldKey.includes('甲方身份证号')) {
                    console.log(`🔍 匹配到客户身份证字段: ${field.key}, 填充值: ${partyAIdCard}`);
                    return partyAIdCard;
                  }
                  if (fieldKey.includes('甲方联系地址') || fieldKey.includes('客户联系地址') || fieldKey.includes('客户地址') || fieldKey.includes('客户服务地址')) {
                    console.log(`🔍 匹配到客户地址字段: ${field.key}, 填充值: ${selectedPartyA?.customerAddress || selectedPartyA?.address}`);
                    return selectedPartyA?.customerAddress || selectedPartyA?.address;
                  }
                  
                  // 乙方（阿姨/阿嫂）信息匹配
                  if (fieldKey.includes('阿姨姓名') || fieldKey.includes('阿嫂姓名') || fieldKey.includes('乙方姓名')) {
                    console.log(`🔍 匹配到阿姨姓名字段: ${field.key}, 填充值: ${partyBName}`);
                    return partyBName;
                  }
                  if (fieldKey.includes('阿姨电话') || fieldKey.includes('阿嫂电话') || fieldKey.includes('乙方电话')) {
                    console.log(`🔍 匹配到阿姨电话字段: ${field.key}, 填充值: ${partyBMobile}`);
                    return partyBMobile;
                  }
                  if (fieldKey.includes('阿姨身份证') || fieldKey.includes('阿嫂身份证') || fieldKey.includes('乙方身份证')) {
                    console.log(`🔍 匹配到阿姨身份证字段: ${field.key}, 填充值: ${partyBIdCard}`);
                    return partyBIdCard;
                  }
                  if (fieldKey.includes('阿姨联系地址') || fieldKey.includes('阿嫂联系地址') ||
                      fieldKey.includes('乙方地址') || fieldKey.includes('联系地址')) {
                    console.log(`🔍 匹配到阿姨地址字段: ${field.key}, 填充值: ${selectedPartyB?.address}`);
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
                  
                  // 时间相关字段（非换人模式或换人模式下没有从原合同获取到值）
                  if (fieldKey.includes('开始年')) {
                    return new Date().getFullYear();
                  }
                  if (fieldKey.includes('开始月')) {
                    return new Date().getMonth() + 1;
                  }
                  if (fieldKey.includes('开始日')) {
                    return new Date().getDate();
                  }
                  // 🔥 结束时间：换人模式下已经在上面处理过了，这里只处理非换人模式
                  if (!isChangeMode) {
                    if (fieldKey.includes('结束年')) {
                      return new Date().getFullYear() + 1;
                    }
                    if (fieldKey.includes('结束月')) {
                      return new Date().getMonth() + 1;
                    }
                    if (fieldKey.includes('结束日')) {
                      return new Date().getDate();
                    }
                  }
                  
                  // 有效期字段默认值
                  if (fieldKey.includes('有效期') || fieldKey.includes('validitytime')) {
                    return '365'; // 固定365天
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
                  if (groupKey === 'time' || groupKey === 'contractTime') {
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
                          <Row gutter={8}>
                            <Col span={4}>
                              {endYearField && (
                                <Form.Item
                                  label="结束年"
                                  name={['templateParams', endYearField.key]}
                                  rules={endYearField.required ? [{ required: true, message: '请选择年份' }] : []}
                                  initialValue={getDefaultValue(endYearField)}
                                >
                                  <Select placeholder="年" onChange={calculateValidityTime} disabled={isChangeMode}>
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
                                  <Select placeholder="月" onChange={calculateValidityTime} disabled={isChangeMode}>
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
                                  <Select placeholder="日" onChange={calculateValidityTime} disabled={isChangeMode}>
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
                                        {renderFormControl(field, false)}
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
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>
                          <span style={{ marginRight: 8 }}>{group.icon}</span>
                          {group.title}
                        </span>
                      }
                      size="small"
                      style={{
                        marginBottom: 0,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        borderRadius: '8px'
                      }}
                      bodyStyle={{ padding: '16px' }}
                    >
                      {/* 普通字段 - 两列布局 */}
                      {normalFields.length > 0 && (
                        <>
                          {Array.from({ length: Math.ceil(normalFields.length / 2) }).map((_, rowIndex) => {
                            const startIndex = rowIndex * 2;
                            const rowFields = normalFields.slice(startIndex, startIndex + 2);
                            
                            return (
                              <Row gutter={16} key={`${groupKey}-row-${rowIndex}`} style={{ marginBottom: 8 }}>
                                {rowFields.map((field: any, fieldIndex: number) => {
                                  const fieldKey = field.key.toLowerCase();

                                  // 🔥 特殊处理：首次匹配费字段 - 使用下拉选择并自动转换为大写
                                  if (fieldKey === '首次匹配费' || fieldKey.includes('首次匹配费') && !fieldKey.includes('大写')) {
                                    return (
                                      <Col span={12} key={`${field.key}-${rowIndex}-${fieldIndex}`}>
                                        <Form.Item
                                          label={field.label}
                                          name={['templateParams', field.key]}
                                          rules={field.required ? [{ required: true, message: `请选择${field.label}` }] : []}
                                          initialValue={getDefaultValue(field)}
                                          style={{ marginBottom: 8 }}
                                        >
                                          <Select
                                            placeholder="请选择匹配费"
                                            disabled={isChangeMode}
                                            onChange={(value) => {
                                              const chineseAmount = convertToChineseAmount(value);
	                                              // 按模板的“真实字段key”写入，避免 key 有隐藏空白/不同写法导致 UI 不显示
	                                              setUppercaseAmount('首次匹配费', chineseAmount, ['匹配费']);
                                            }}
                                          >
                                            <Option value={1000}>1000元</Option>
                                            <Option value={1500}>1500元</Option>
                                          </Select>
                                        </Form.Item>
                                      </Col>
                                    );
                                  }

                                  // 特殊处理：匹配费字段使用简单下拉选择
                                  if (fieldKey.includes('匹配费') && !fieldKey.includes('大写')) {
                                    return (
                                      <Col span={12} key={`${field.key}-${rowIndex}-${fieldIndex}`}>
                                        <Form.Item
                                          label={field.label}
                                          name={['templateParams', field.key]}
                                          rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
                                          initialValue={getDefaultValue(field)}
                                          style={{ marginBottom: 8 }}
                                        >
                                          <Select
                                            placeholder="请选择匹配费"
                                            disabled={isChangeMode}
                                            onChange={(value) => {
                                              const chineseAmount = convertToChineseAmount(value);
	                                              setUppercaseAmount('匹配费', chineseAmount, ['首次匹配费']);
                                            }}
                                          >
                                            <Option value={1000}>1000元</Option>
                                            <Option value={1500}>1500元</Option>
                                          </Select>
                                        </Form.Item>
                                      </Col>
                                    );
                                  }

                                  // 🔥 特殊处理：服务费字段 - 输入数字后自动转换为大写
                                  if ((fieldKey.includes('服务费') || fieldKey === '服务费') && !fieldKey.includes('大写')) {
                                    return (
                                      <Col span={12} key={`${field.key}-${rowIndex}-${fieldIndex}`}>
                                        <Form.Item
                                          label={field.label}
                                          name={['templateParams', field.key]}
                                          rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
                                          initialValue={getDefaultValue(field)}
                                          style={{ marginBottom: 8 }}
                                        >
                                          <Input
                                            type="number"
                                            placeholder={`请输入${field.label}`}
                                            disabled={isChangeMode}
                                            onBlur={(e) => {
                                              const value = e.target.value;
                                              if (value) {
                                                const chineseAmount = convertToChineseAmount(value, 'none');
	                                                setUppercaseAmount('服务费', chineseAmount);
                                              }
                                            }}
                                          />
                                        </Form.Item>
                                      </Col>
                                    );
                                  }

                                  // 🔥 特殊处理：阿姨工资字段 - 输入数字后自动转换为大写
                                  if (fieldKey === '阿姨工资') {
                                    return (
                                      <Col span={12} key={`${field.key}-${rowIndex}-${fieldIndex}`}>
                                        <Form.Item
                                          label={field.label}
                                          name={['templateParams', field.key]}
                                          rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
                                          initialValue={getDefaultValue(field)}
                                          style={{ marginBottom: 8 }}
                                        >
                                          <Input
                                            type="number"
                                            placeholder={`请输入${field.label}`}
                                            onBlur={(e) => {
                                              const value = e.target.value;
                                              if (value) {
                                                const chineseAmount = convertToChineseAmount(value, 'yuanzheng');
	                                                setUppercaseAmount('阿姨工资', chineseAmount, ['工资']);
                                              }
                                            }}
                                          />
                                        </Form.Item>
                                      </Col>
                                    );
                                  }

                                  // 普通字段处理
                                  // 🔥 特殊处理：多选字段需要将字符串值转换为数组
                                  const isMultiSelect = field.label?.includes('多选') || field.key?.includes('多选');
                                  const defaultValue = getDefaultValue(field);
                                  const initialValue = isMultiSelect && typeof defaultValue === 'string'
                                    ? defaultValue.split('；').filter(item => item.trim())
                                    : defaultValue;

                                  return (
                                    <Col span={12} key={`${field.key}-${rowIndex}-${fieldIndex}`}>
                                      <Form.Item
                                        label={field.label}
                                        name={['templateParams', field.key]}
                                        rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
                                        initialValue={initialValue}
                                        style={{ marginBottom: 8 }}
                                        // 🔥 多选字段：normalize 将数组值转换为字符串存储
                                        normalize={isMultiSelect ? (value) => {
                                          console.log('🔥 normalize 输入:', value);
                                          const result = Array.isArray(value) ? value.join('；') : value;
                                          console.log('🔥 normalize 输出:', result);
                                          return result;
                                        } : undefined}
                                      >
                                        {isMultiSelect ? (
                                          // 🔥 多选字段：手动处理值的转换
                                          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => {
                                            const prevValue = prevValues.templateParams?.[field.key];
                                            const currentValue = currentValues.templateParams?.[field.key];
                                            return prevValue !== currentValue;
                                          }}>
                                            {({ getFieldValue, setFieldValue }) => {
                                              const currentValue = getFieldValue(['templateParams', field.key]);
                                              const arrayValue = typeof currentValue === 'string'
                                                ? currentValue.split('；').filter(item => item.trim())
                                                : (Array.isArray(currentValue) ? currentValue : []);

                                              console.log('🔥 当前值:', currentValue, '转换后:', arrayValue);

                                              // 🔥 换人模式：判断是否需要禁用
                                              const fieldKey = field.key.toLowerCase();
                                              const fieldLabel = (field.label || '').toLowerCase();
                                              const shouldDisableField = isChangeMode && (
                                                fieldKey.includes('服务类型') || fieldLabel.includes('服务类型')
                                              );

                                              return (
                                                <Checkbox.Group
                                                  value={arrayValue}
                                                  disabled={shouldDisableField}
                                                  style={{
                                                    width: '100%',
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                                    gap: '8px 16px'
                                                  }}
                                                  onChange={(checkedValues) => {
                                                    console.log('🔥 Checkbox.Group onChange:', checkedValues);
                                                    const stringValue = checkedValues.join('；');
                                                    setFieldValue(['templateParams', field.key], stringValue);
                                                  }}
                                                >
                                                  {field.options?.map((option: any, optionIndex: number) => {
                                                    const optionLabel = typeof option === 'string' ? option : option.label;
                                                    return (
                                                      <Checkbox
                                                        key={`${field.key}-${optionIndex}-${optionLabel}`}
                                                        value={optionLabel}
                                                        style={{ marginBottom: '4px' }}
                                                      >
                                                        {optionLabel}
                                                      </Checkbox>
                                                    );
                                                  })}
                                                </Checkbox.Group>
                                              );
                                            }}
                                          </Form.Item>
                                        ) : (
                                          renderFormControl(field, groupKey === 'partyA')
                                        )}
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
                        <Row gutter={16} key={`${groupKey}-textarea-${field.key}-${fieldIndex}`} style={{ marginBottom: 8 }}>
                          <Col span={24}>
                            <Form.Item
                              label={field.label}
                              name={['templateParams', field.key]}
                              rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
                              initialValue={getDefaultValue(field)}
                              style={{ marginBottom: 0 }}
                            >
                              {renderFormControl(field, groupKey === 'partyA')}
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

                    {/* 🔥 合同信息 - 使用卡片风格分类展示 */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        marginBottom: 12,
                        color: '#1890ff',
                        borderLeft: '4px solid #1890ff',
                        paddingLeft: '12px'
                      }}>
                        📋 合同信息
                      </div>
                      <Row gutter={[16, 16]}>
                        {/* 服务信息 */}
                        {fieldGroups.contractService.fields.length > 0 && (
                          <Col span={24}>
                            {renderFieldGroup('contractService', fieldGroups.contractService)}
                          </Col>
                        )}

                        {/* 合同期限和费用信息并排 */}
                        <Col span={12}>
                          {fieldGroups.contractTime.fields.length > 0 &&
                            renderFieldGroup('contractTime', fieldGroups.contractTime)}
                        </Col>
                        <Col span={12}>
                          {fieldGroups.contractFee.fields.length > 0 &&
                            renderFieldGroup('contractFee', fieldGroups.contractFee)}
                        </Col>

                        {/* 工作安排 */}
                        {fieldGroups.contractWork.fields.length > 0 && (
                          <Col span={24}>
                            {renderFieldGroup('contractWork', fieldGroups.contractWork)}
                          </Col>
                        )}

                        {/* 其他信息 */}
                        {fieldGroups.contractOther.fields.length > 0 && (
                          <Col span={24}>
                            {renderFieldGroup('contractOther', fieldGroups.contractOther)}
                          </Col>
                        )}
                      </Row>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </Card>

        {/* 签署设置 - 已隐藏，这些参数目前后端未使用 */}
        {/* 保留默认值在表单初始化中 */}

        <Form.Item>
          <Space>
            <Button onClick={() => setCurrentStep(0)} icon={<ArrowLeftOutlined />} size="large">
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
          },
          {
            account: 'ASIGN91110111MACJMD2R5J', // 🔑 官方已实名测试企业账号（支持无感知签约）
            name: '北京安得家政有限公司',
            mobile: '400-000-0000', // 企业客服电话
            signType: 'auto' as const, // 无感知签约（自动签章）
            validateType: 'sms' as const // 虽然是无感知，但仍需设置验证方式
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
                    role: index === 0 ? '甲方（客户）' : index === 1 ? '乙方（服务人员）' : '丙方（企业）',
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
                  role: index === 0 ? '甲方（客户）' : index === 1 ? '乙方（服务人员）' : '丙方（企业）',
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
          description="将为甲方（客户）、乙方（阿姨）和丙方（企业）添加签署权限，并生成签署链接。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {stepData.users && stepData.contract && (
          <div style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Card title="甲方（客户）" size="small" style={{ background: '#f6ffed' }}>
                  <p><strong>姓名：</strong>{stepData.users.partyA?.request?.name}</p>
                  <p><strong>手机：</strong>{stepData.users.partyA?.request?.mobile}</p>
                  <p><strong>签署方式：</strong>有感知签约（短信验证码）</p>
                  <p><strong>签名位置：</strong>模板预设位置（甲方签名区）</p>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="乙方（阿姨）" size="small" style={{ background: '#fff7e6' }}>
                  <p><strong>姓名：</strong>{stepData.users.partyB?.request?.name}</p>
                  <p><strong>手机：</strong>{stepData.users.partyB?.request?.mobile}</p>
                  <p><strong>签署方式：</strong>有感知签约（短信验证码）</p>
                  <p><strong>签名位置：</strong>模板预设位置（乙方签名区）</p>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="丙方（企业）" size="small" style={{ background: '#f0f9ff' }}>
                  <p><strong>名称：</strong>北京安得家政有限公司</p>
                  <p><strong>联系方式：</strong>400-000-0000</p>
                  <p><strong>签署方式：</strong>无感知签约（自动签章）</p>
                  <p><strong>签章位置：</strong>模板预设位置（丙方签章区）</p>
                </Card>
              </Col>
            </Row>

            <Card title="合同信息" size="small" style={{ marginTop: 16, background: '#f0f9ff' }}>
              <p><strong>合同编号：</strong>{stepData.contract.contractNo}</p>
              <p><strong>合同名称：</strong>{stepData.contract.contractName || '安得家政三方服务合同'}</p>
              <p><strong>模板编号：</strong>{stepData.contract.templateNo}</p>
              <p><strong>签署顺序：</strong>并行签署（三方可同时签署）</p>
            </Card>
          </div>
        )}

        <Form.Item>
          <Space>
            <Button onClick={() => setCurrentStep(1)} icon={<ArrowLeftOutlined />} size="large">
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
                    <Button
                      type="dashed"
                      onClick={() => {
                        const messageText = `尊敬的${signUser.name}，请您点击链接完成合同签署 ${signUser.signUrl}`;
                        navigator.clipboard.writeText(messageText);
                        message.success('文案和链接已复制到剪贴板');
                      }}
                    >
                      复制文案+链接
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
            <Button onClick={() => setCurrentStep(2)} icon={<ArrowLeftOutlined />} size="large">
              返回上一步
            </Button>
            <Button 
              type="primary" 
              onClick={() => {
                message.success('签署流程已完成！双方可以使用签署链接进行签署。');
                setTimeout(() => {
                  navigate('/contracts');
                }, 1000);
              }}
              size="large"
              disabled={signUrls.length === 0}
            >
              返回合同列表
            </Button>
          </Space>
        </Form.Item>
      </Card>
    );
  };

  // renderStep5 函数已删除，因为步骤5已被隐藏

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
      // 隐藏步骤5（下载合同）
      // case 4:
      //   return renderStep5();
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
            current={Math.min(currentStep, steps.length - 1)} 
            items={steps}
            style={{ marginBottom: 0 }}
          />
        </Card>

        {renderStepContent()}

        {/* 步骤数据展示（调试用） - 已隐藏，太占地方 */}
        {/* {(stepData.users || stepData.contract) && (
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
        )} */}
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