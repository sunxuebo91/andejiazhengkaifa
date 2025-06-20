import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  InputNumber,
  message,
  Divider,
  Space,
  Typography,
  Table,
  Modal,
  Checkbox,
  Spin,
  Alert
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined,
  UserOutlined,
  SearchOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { api } from '../../services/api';
import { Customer } from '../../types/customer.types';
import { contractService } from '../../services/contractService';
import { Worker } from '../../types/contract.types';
import { debounce } from 'lodash';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

// 爱签合同模板ID
const ESIGN_TEMPLATE_ID = 'TNF606E6D81E2D49C99CC983F4D0412276-3387';

// 固定表单字段定义 - 与后端Contract模型完全一致
interface FormField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'phone' | 'idcard' | 'checkbox-group';
  required: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string } | string | { category: string; options: string[] }>;
  group: string;
  min?: number;
  max?: number;
  rows?: number;
}

const CreateContract: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string>('');
  
  // 客户和服务人员选择相关状态
  const [customerSearchVisible, setCustomerSearchVisible] = useState(false);
  const [workerSearchVisible, setWorkerSearchVisible] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [workerSearchLoading, setWorkerSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [workerSearchText, setWorkerSearchText] = useState('');

  // 固定表单字段定义 - 完整的合同模板字段
  const formFields: FormField[] = [
    // 甲方信息（客户）
    {
      id: '客户姓名',
      name: '客户姓名',
      type: 'text',
      required: true,
      placeholder: '请输入客户姓名',
      group: 'partyA'
    },
    {
      id: '客户电话',
      name: '客户电话',
      type: 'text',
      required: true,
      placeholder: '请输入客户电话',
      group: 'partyA'
    },
    {
      id: '客户身份证号',
      name: '客户身份证号',
      type: 'text',
      required: true,
      placeholder: '请输入客户身份证号',
      group: 'partyA'
    },
    {
      id: '客户联系地址',
      name: '客户联系地址',
      type: 'text',
      required: true,
      placeholder: '请输入客户联系地址',
      group: 'partyA'
    },
    
    // 乙方信息（阿姨/服务人员）
    {
      id: '阿姨姓名',
      name: '阿姨姓名',
      type: 'text',
      required: true,
      placeholder: '请输入阿姨姓名',
      group: 'partyB'
    },
    {
      id: '阿姨电话',
      name: '阿姨电话',
      type: 'text',
      required: true,
      placeholder: '请输入阿姨电话',
      group: 'partyB'
    },
    {
      id: '阿姨身份证号',
      name: '阿姨身份证号',
      type: 'text',
      required: true,
      placeholder: '请输入阿姨身份证号',
      group: 'partyB'
    },
    {
      id: '阿姨联系地址',
      name: '阿姨联系地址',
      type: 'text',
      required: false,
      placeholder: '请输入阿姨联系地址',
      group: 'partyB'
    },
    {
      id: '年龄',
      name: '年龄',
      type: 'number',
      required: false,
      placeholder: '请输入年龄',
      group: 'partyB',
      min: 18,
      max: 65
    },
    {
      id: '籍贯',
      name: '籍贯',
      type: 'text',
      required: false,
      placeholder: '请输入籍贯',
      group: 'partyB'
    },
    {
      id: '性别',
      name: '性别',
      type: 'select',
      required: false,
      placeholder: '请选择性别',
      group: 'partyB',
      options: [
        { label: '女', value: '女' },
        { label: '男', value: '男' }
      ]
    },
    
    // 服务信息
    {
      id: '服务备注',
      name: '服务备注',
      type: 'checkbox-group',
      required: true,
      placeholder: '请选择服务内容',
      group: 'service',
      options: [
        {
          category: '家务服务',
          options: ['做饭', '买菜', '熨烫衣服', '洗衣服', '打扫卫生', '做早餐', '做中餐', '做晚餐']
        },
        {
          category: '照护服务',
          options: ['照顾老人', '照顾孩子', '照顾老人/病人/照顾孩子']
        },
        {
          category: '婴幼儿护理',
          options: [
            '科学合理的喂养指导', 
            '保障婴幼儿生长发育的营养需要',
            '婴幼儿洗澡，洗头，清洗五官', 
            '婴幼儿换洗衣物，尿不湿等', 
            '保障婴幼儿卫生，干爽，预防尿布疹', 
            '为婴幼儿进行抚触，被动操，安抚哭闹，呵护入睡', 
            '随时对婴幼儿的身体状况（如摄入量，大小便，皮肤，体温等）进行观察', 
            '协助护理婴幼儿常见疾病', 
            '婴幼儿房间的卫生，通风，奶瓶，餐具的清洁消毒', 
            '婴幼儿的早期教育和正确引导', 
            '婴幼儿的辅食制作及喂养'
          ]
        },
        {
          category: '儿童照护',
          options: [
            '做儿童早餐', 
            '做儿童中餐', 
            '做儿童晚餐', 
            '手洗儿童衣服', 
            '熨烫儿童衣服', 
            '整理儿童玩具，书籍', 
            '接送孩子上学', 
            '课外辅导'
          ]
        }
      ]
    },
    {
      id: '服务地址',
      name: '服务地址',
      type: 'text',
      required: true,
      placeholder: '请输入服务地址',
      group: 'service'
    },
    
    // 服务期限
    {
      id: '开始年',
      name: '开始年',
      type: 'number',
      required: true,
      placeholder: '年份',
      group: 'period',
      min: 2024,
      max: 2030
    },
    {
      id: '开始月',
      name: '开始月',
      type: 'number',
      required: true,
      placeholder: '月份',
      group: 'period',
      min: 1,
      max: 12
    },
    {
      id: '开始日',
      name: '开始日',
      type: 'number',
      required: true,
      placeholder: '日期',
      group: 'period',
      min: 1,
      max: 31
    },
    {
      id: '结束年',
      name: '结束年',
      type: 'number',
      required: true,
      placeholder: '年份',
      group: 'period',
      min: 2024,
      max: 2030
    },
    {
      id: '结束月',
      name: '结束月',
      type: 'number',
      required: true,
      placeholder: '月份',
      group: 'period',
      min: 1,
      max: 12
    },
    {
      id: '结束日',
      name: '结束日',
      type: 'number',
      required: true,
      placeholder: '日期',
      group: 'period',
      min: 1,
      max: 31
    },
    
    // 费用信息
    {
      id: '服务费',
      name: '服务费',
      type: 'number',
      required: true,
      placeholder: '请输入服务费（元）',
      group: 'financial',
      min: 0
    },
    {
      id: '大写服务费',
      name: '大写服务费',
      type: 'text',
      required: true,
      placeholder: '服务费大写',
      group: 'financial'
    },
    {
      id: '匹配费',
      name: '匹配费',
      type: 'number',
      required: true,
      placeholder: '请输入匹配费（元）',
      group: 'financial',
      min: 0
    },
    {
      id: '匹配费大写',
      name: '匹配费大写',
      type: 'text',
      required: true,
      placeholder: '匹配费大写',
      group: 'financial'
    },
    {
      id: '阿姨工资',
      name: '阿姨工资',
      type: 'number',
      required: true,
      placeholder: '请输入阿姨工资（元）',
      group: 'financial',
      min: 0
    },
    {
      id: '阿姨工资大写',
      name: '阿姨工资大写',
      type: 'text',
      required: true,
      placeholder: '阿姨工资大写',
      group: 'financial'
    },
    {
      id: '工资发放日期',
      name: '工资发放日期',
      type: 'select',
      required: false,
      placeholder: '请选择工资发放日期',
      group: 'financial',
      options: Array.from({ length: 31 }, (_, i) => ({
        label: `每月${i + 1}日`,
        value: `每月${i + 1}日`
      }))
    },
    
    // 其他信息
    {
      id: '合同备注',
      name: '合同备注',
      type: 'textarea',
      required: false,
      placeholder: '请输入合同备注',
      group: 'terms',
      rows: 4
    }
  ];

  // 搜索客户
  const searchCustomers = async (searchText: string) => {
    if (!searchText.trim()) {
      setCustomers([]);
      return;
    }
    
    setCustomerSearchLoading(true);
    try {
      const response = await api.get('/api/customers', {
        params: {
          search: searchText.trim(),
          limit: 10
        }
      });
      
      if (response.data?.customers) {
        if (response.data.customers.length === 0) {
          message.info('未找到匹配的客户');
        }
        setCustomers(response.data.customers);
      } else {
        setCustomers([]);
        message.info('未找到匹配的客户');
      }
    } catch (error) {
      console.error('搜索客户失败:', error);
      message.error('搜索客户失败');
      setCustomers([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  // 搜索服务人员
  const searchWorkers = async (searchText: string) => {
    if (!searchText.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setWorkerSearchLoading(true);
    try {
      // 使用searchText作为name或phone参数
      const response = await contractService.searchWorkers(searchText);
      setWorkers(response);
    } catch (error) {
      console.error('搜索服务人员失败:', error);
      message.error('搜索服务人员失败');
    } finally {
      setWorkerSearchLoading(false);
    }
  };

  // 选择客户
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    
    // 确保身份证号正确填充
    const idCardNumber = customer.idCardNumber || '';
    const customerAddress = customer.address || '';
    console.log('选择客户:', customer);
    console.log('身份证号:', idCardNumber);
    
    form.setFieldsValue({
      customerName: customer.name,
      customerPhone: customer.phone,
      customerIdCard: idCardNumber,
      customerId: customer._id,
      // 自动填充到甲方信息字段
      客户姓名: customer.name,
      客户电话: customer.phone,
      客户身份证号: idCardNumber,
      客户联系地址: customerAddress,
      // 同步填充服务地址
      服务地址: customerAddress,
    });
    setCustomerSearchVisible(false);
    setCustomers([]);
    setCustomerSearchText('');
    
    // 更新模板预览
    setTimeout(() => {
      const allValues = form.getFieldsValue();
      console.log('选择客户后更新预览:', allValues);
      debouncedUpdatePreview(allValues);
    }, 200);
  };

  // 选择服务人员
  const handleSelectWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    form.setFieldsValue({
      workerName: worker.name,
      workerPhone: worker.phone,
      workerIdCard: worker.idNumber,
      workerId: worker._id,
      // 自动填充到乙方信息字段
      阿姨姓名: worker.name,
      阿姨电话: worker.phone,
      阿姨身份证号: worker.idNumber || '',
      阿姨联系地址: worker.currentAddress || '',
      // 填充阿姨个人信息（现在也是乙方信息的一部分）
      年龄: worker.age || '',
      籍贯: worker.nativePlace || '',
      性别: '女', // Worker类型中没有gender属性，默认为女性
    });
    setWorkerSearchVisible(false);
    setWorkers([]);
    setWorkerSearchText('');
    
    // 更新模板预览
    setTimeout(() => {
      const allValues = form.getFieldsValue();
      console.log('选择服务人员后更新预览:', allValues);
      debouncedUpdatePreview(allValues);
    }, 200);
  };

  // 初始化时检查URL参数并预加载客户信息
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    const workerId = searchParams.get('workerId');
    
    if (customerId) {
      // 预加载客户信息
      loadCustomerById(customerId);
    }
    
    if (workerId) {
      // 预加载服务人员信息
      loadWorkerById(workerId);
    }
  }, [searchParams]);

  // 根据ID加载客户信息
  const loadCustomerById = async (customerId: string) => {
    try {
      const response = await api.get(`/api/customers/${customerId}`);
      if (response.data) {
        const customer = response.data;
        setSelectedCustomer(customer);
        
        // 确保身份证号正确填充
        const idCardNumber = customer.idCardNumber || '';
        const customerAddress = customer.address || '';
        console.log('加载客户:', customer);
        console.log('身份证号:', idCardNumber);
        
        form.setFieldsValue({
          customerName: customer.name,
          customerPhone: customer.phone,
          customerIdCard: idCardNumber,
          customerId: customer._id,
          // 自动填充到甲方信息字段
          客户姓名: customer.name,
          客户电话: customer.phone,
          客户身份证号: idCardNumber,
          客户联系地址: customerAddress,
          // 同步填充服务地址
          服务地址: customerAddress,
        });
      }
    } catch (error) {
      console.error('加载客户信息失败:', error);
      message.warning('加载客户信息失败，请手动选择客户');
    }
  };

  // 根据ID加载服务人员信息
  const loadWorkerById = async (workerId: string) => {
    try {
      const response = await api.get(`/api/resumes/${workerId}`);
      if (response.data) {
        const worker = response.data;
        setSelectedWorker(worker);
        form.setFieldsValue({
          workerName: worker.name,
          workerPhone: worker.phone,
          workerIdCard: worker.idNumber,
          workerId: worker._id,
          // 自动填充到乙方信息字段
          阿姨姓名: worker.name,
          阿姨电话: worker.phone,
          阿姨身份证号: worker.idNumber || '',
        });
      }
    } catch (error) {
      console.error('加载服务人员信息失败:', error);
      message.warning('加载服务人员信息失败，请手动选择服务人员');
    }
  };

  // 获取固定的模板预览
  useEffect(() => {
    const fetchTemplatePreview = async () => {
      try {
        setPreviewLoading(true);
        
        const templateResponse = await api.post('/api/esign/templates/preview', {
          templateId: ESIGN_TEMPLATE_ID,
          formData: {} // 传入空数据获取空白模板
        });

        if (templateResponse.data && templateResponse.data.previewUrl) {
          setTemplatePreviewUrl(templateResponse.data.previewUrl);
          console.log('成功获取模板预览URL:', templateResponse.data.previewUrl);
        } else {
          // 如果直接的预览URL不存在，检查嵌套的错误消息
          const errorMessage = templateResponse.data?.message || '模板预览响应格式不正确';
          console.error('模板预览失败:', errorMessage, templateResponse);
          message.warning(`模板预览加载失败: ${errorMessage}`);
        }
      } catch (previewError: any) {
        const errorMessage = previewError.response?.data?.message || previewError.message || '未知错误';
        console.error('获取模板预览异常:', previewError);
        message.error(`模板预览加载失败: ${errorMessage}`);
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchTemplatePreview();
  }, []);

  // 更新模板预览的函数
  const updateTemplatePreview = async (formData: any) => {
    try {
      setPreviewLoading(true);
      
      // 过滤掉空值和undefined值
      const filteredData = Object.keys(formData).reduce((acc: any, key) => {
        if (formData[key] !== undefined && formData[key] !== null && formData[key] !== '') {
          acc[key] = formData[key];
        }
        return acc;
      }, {});

      console.log('更新模板预览，表单数据:', filteredData);
      
      const templateResponse = await api.post('/api/esign/templates/preview', {
        templateId: ESIGN_TEMPLATE_ID,
        formData: filteredData
      });

      if (templateResponse.data && templateResponse.data.previewUrl) {
        setTemplatePreviewUrl(templateResponse.data.previewUrl);
        console.log('成功更新模板预览URL:', templateResponse.data.previewUrl);
      } else {
        const errorMessage = templateResponse.data?.message || '模板预览响应格式不正确';
        console.error('模板预览更新失败:', errorMessage, templateResponse);
      }
    } catch (previewError: any) {
      console.error('更新模板预览异常:', previewError);
      // 不显示错误消息，避免频繁弹窗
    } finally {
      setPreviewLoading(false);
    }
  };

  // 防抖函数，避免频繁更新预览
  const debouncedUpdatePreview = useCallback(
    debounce((formData: any) => {
      updateTemplatePreview(formData);
    }, 1000), // 1秒防抖
    []
  );

  // 处理表单值变化
  const handleFormChange = (changedValues: any) => {
    // 如果客户联系地址发生变化，同步更新服务地址
    if ('客户联系地址' in changedValues && changedValues['客户联系地址']) {
      form.setFieldValue('服务地址', changedValues['客户联系地址']);
    }
    
    // 自动转换阿拉伯数字为中文大写
    if ('服务费' in changedValues && changedValues['服务费'] !== undefined) {
      const serviceFee = Number(changedValues['服务费']);
      if (!isNaN(serviceFee)) {
        const chineseAmount = convertToChinese(serviceFee);
        form.setFieldValue('大写服务费', chineseAmount);
      }
    }
    
    if ('匹配费' in changedValues && changedValues['匹配费'] !== undefined) {
      const matchingFee = Number(changedValues['匹配费']);
      if (!isNaN(matchingFee)) {
        const chineseAmount = convertToChinese(matchingFee);
        form.setFieldValue('匹配费大写', chineseAmount);
      }
    }
    
    if ('阿姨工资' in changedValues && changedValues['阿姨工资'] !== undefined) {
      const salary = Number(changedValues['阿姨工资']);
      if (!isNaN(salary)) {
        const chineseAmount = convertToChinese(salary);
        form.setFieldValue('阿姨工资大写', chineseAmount);
      }
    }

    // 获取当前所有表单值并更新模板预览
    setTimeout(() => {
      const allValues = form.getFieldsValue();
      console.log('表单值发生变化，准备更新预览:', allValues);
      debouncedUpdatePreview(allValues);
    }, 100);
  };

  // 数字转中文大写函数
  const convertToChinese = (num: number): string => {
    if (num === 0) return '零元整';
    
    const chnNumChar = ["零","壹","贰","叁","肆","伍","陆","柒","捌","玖"];
    const chnUnitChar = ["","拾","佰","仟","万","拾","佰","仟","亿","拾","佰","仟","兆"];
    let strIns = '', chnStr = '';
    let unitPos = 0;
    let zero = true;
    
    while(num > 0){
      const v = num % 10;
      if(v === 0){
        if(!zero){
          zero = true;
          chnStr = chnNumChar[v] + chnStr;
        }
      }else{
        zero = false;
        strIns = chnNumChar[v];
        strIns += chnUnitChar[unitPos];
        chnStr = strIns + chnStr;
      }
      unitPos++;
      num = Math.floor(num / 10);
    }
    
    return chnStr + '元整';
  };

  const handleBack = () => {
    navigate('/contracts/list');
  };

  const handleSubmit = async (values: any) => {
    // 验证是否已选择客户和服务人员
    if (!selectedCustomer) {
      message.error('请选择客户');
      return;
    }
    if (!selectedWorker) {
      message.error('请选择服务人员');
      return;
    }

    // 如果"服务备注"是数组，则将其合并为字符串
    if (Array.isArray(values['服务备注'])) {
      values['服务备注'] = values['服务备注'].join('，');
    }

    // 自动添加当前日期作为签署日期
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const formattedDate = `${year}年${month}月${day}日`;
    
    try {
      setLoading(true);
      console.log('创建合同数据:', values);
      
      const response = await contractService.createContract({
        ...values,
        customerId: selectedCustomer._id,
        workerId: selectedWorker._id,
        签署日期: formattedDate, // 自动添加签署日期
      });
      
      if (response) {
        message.success('合同创建成功');
        navigate('/contracts/list');
      } else {
        message.error('合同创建失败');
      }
    } catch (error: any) {
      console.error('创建合同失败:', error);
      message.error(error.message || '合同创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 渲染表单控件
  const renderFormField = (field: FormField) => {
    const commonProps = {
      placeholder: field.placeholder,
      style: { width: '100%' }
    };

    try {
      switch (field.type) {
        case 'text':
        case 'phone':
        case 'idcard':
          return <Input {...commonProps} />;
        
        case 'textarea':
          return <TextArea rows={field.rows || 4} {...commonProps} />;
        
        case 'checkbox-group':
          if (field.options && Array.isArray(field.options) && field.options.length > 0) {
            // 检查是否是分类格式的选项
            if (typeof field.options[0] === 'object' && 'category' in field.options[0]) {
              // 分类显示
              return (
                <div style={{ width: '100%' }}>
                  <Checkbox.Group style={{ width: '100%' }}>
                    {(field.options as { category: string, options: string[] }[]).map((categoryGroup, index) => (
                      <div key={index} style={{ marginBottom: '16px' }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          marginBottom: '8px', 
                          borderBottom: '1px solid #f0f0f0',
                          paddingBottom: '4px' 
                        }}>
                          {categoryGroup.category}
                        </div>
                        <Row gutter={[8, 8]}>
                          {categoryGroup.options.map(option => (
                            <Col span={8} key={option}>
                              <Checkbox value={option}>{option}</Checkbox>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    ))}
                  </Checkbox.Group>
                </div>
              );
            } else {
              // 普通列表显示
              return (
                <Checkbox.Group style={{ width: '100%' }}>
                  <Row gutter={[8, 8]}>
                    {(field.options as string[]).map(option => (
                      <Col span={8} key={option}>
                        <Checkbox value={option}>{option}</Checkbox>
                      </Col>
                    ))}
                  </Row>
                </Checkbox.Group>
              );
            }
          }
          return null;
        
        case 'number':
          return (
            <InputNumber 
              {...commonProps} 
              min={field.min} 
              max={field.max}
              precision={field.id.includes('Fee') || field.id.includes('Salary') || field.id.includes('Payment') || field.id.includes('deposit') ? 2 : 0}
            />
          );
        
        case 'date':
          return <DatePicker {...commonProps} />;
        
        case 'select':
          return (
            <Select {...commonProps}>
              {field.options?.map(option => {
                if (typeof option === 'string') {
                  return <Option key={option} value={option}>{option}</Option>;
                }
                if ('label' in option && 'value' in option) {
                  return (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  );
                }
                // 分类选项不会在select中使用
                return null;
              })}
            </Select>
          );
        
        default:
          return <Input {...commonProps} />;
      }
    } catch (error) {
      console.error(`控件渲染错误: ${field.id}`, error);
      return (
        <div style={{ color: '#ff4d4f', padding: '8px', border: '1px solid #ff4d4f', borderRadius: '4px' }}>
          控件渲染失败: {field.name}
        </div>
      );
    }
  };

  // 按组分组字段
  const groupedFields = formFields.reduce((groups: Record<string, FormField[]>, field: FormField) => {
    const group = field.group;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(field);
    return groups;
  }, {} as Record<string, FormField[]>);

  const groupTitles = {
    partyA: '甲方信息（客户）',
    partyB: '乙方信息（阿姨/服务人员）',
    service: '服务备注',
    period: '服务期限',
    financial: '费用信息',
    terms: '合同备注'
  };

  // 客户表格列
  const customerColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '身份证号',
      dataIndex: 'idCardNumber',
      key: 'idCardNumber',
      render: (text: string) => text ? `${text.slice(0, 6)}****${text.slice(-4)}` : '',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Customer) => (
        <Button type="primary" size="small" onClick={() => handleSelectCustomer(record)}>
          选择
        </Button>
      ),
    },
  ];

  // 服务人员表格列
  const workerColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '身份证号',
      dataIndex: 'idNumber',
      key: 'idNumber',
      render: (text: string) => text ? `${text.slice(0, 6)}****${text.slice(-4)}` : '',
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '工种',
      dataIndex: 'jobType',
      key: 'jobType',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Worker) => (
        <Button type="primary" size="small" onClick={() => handleSelectWorker(record)}>
          选择
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Space>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
          >
            返回
          </Button>
          <Title level={3} style={{ margin: 0 }}>创建合同</Title>
        </Space>
        <Space>
          <Button 
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
          >
            创建合同
          </Button>
        </Space>
      </div>

      {/* 主要内容区域 - 左右分栏 */}
      <Row gutter={24} style={{ flex: 1, minHeight: 0 }}>
        {/* 左侧：合同信息录入区域 */}
        <Col span={12} style={{ height: '100%' }}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                创建合同
                {loading && <Spin size="small" />}
              </Space>
            }
            style={{ height: '100%' }}
            bodyStyle={{ height: 'calc(100% - 57px)', overflowY: 'auto', padding: '24px' }}
          >
            <div>
              <Alert
                message="爱签合同模板字段"
                description="以下表单字段与爱签电子签名模板控件一致，用于创建电子签名合同。标记为必填的字段不能为空。"
                type="info"
                showIcon
                style={{ marginBottom: '24px' }}
              />

              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                onValuesChange={handleFormChange}
              >
                {/* 甲方信息区域（客户） */}
                <Divider orientation="left">甲方信息（客户）</Divider>
                <Row gutter={16} style={{ marginBottom: '16px' }}>
                  <Col span={16}>
                    <Form.Item
                      label="选择客户"
                      required
                    >
                      {selectedCustomer ? (
                        <div style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #d9d9d9', 
                          borderRadius: '6px',
                          backgroundColor: '#f6ffed'
                        }}>
                          <Text strong>{selectedCustomer.name}</Text>
                          <Text type="secondary" style={{ marginLeft: '8px' }}>
                            {selectedCustomer.phone}
                          </Text>
                        </div>
                      ) : (
                        <Text type="secondary">请选择客户</Text>
                      )}
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label=" ">
                      <Button 
                        icon={<SearchOutlined />}
                        onClick={() => setCustomerSearchVisible(true)}
                      >
                        选择客户
                      </Button>
                    </Form.Item>
                  </Col>
                </Row>

                {/* 乙方信息区域（阿姨/服务人员） */}
                <Divider orientation="left">乙方信息（阿姨/服务人员）</Divider>
                <Row gutter={16} style={{ marginBottom: '16px' }}>
                  <Col span={16}>
                    <Form.Item
                      label="选择服务人员"
                      required
                    >
                      {selectedWorker ? (
                        <div style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #d9d9d9', 
                          borderRadius: '6px',
                          backgroundColor: '#f6ffed'
                        }}>
                          <Text strong>{selectedWorker.name}</Text>
                          <Text type="secondary" style={{ marginLeft: '8px' }}>
                            {selectedWorker.phone}
                          </Text>
                          <Text type="secondary" style={{ marginLeft: '8px' }}>
                            {selectedWorker.jobType}
                          </Text>
                        </div>
                      ) : (
                        <Text type="secondary">请选择服务人员</Text>
                      )}
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label=" ">
                      <Button 
                        icon={<UserOutlined />}
                        onClick={() => setWorkerSearchVisible(true)}
                      >
                        选择服务人员
                      </Button>
                    </Form.Item>
                  </Col>
                </Row>

                {/* 表单字段分组 */}
                {Object.entries(groupedFields).map(([groupKey, groupFields]) => (
                  <div key={groupKey}>
                    <Divider orientation="left">
                      {groupTitles[groupKey as keyof typeof groupTitles] || groupKey}
                    </Divider>
                    {groupKey === 'period' ? (
                      // 服务期限特殊处理为三列布局
                      <Row gutter={16}>
                        <Col span={8}>
                          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>开始日期</div>
                          <Row gutter={8}>
                            <Col span={8}>
                              <Form.Item
                                label="年"
                                name="开始年"
                                rules={[{ required: true, message: '请输入开始年份' }]}
                              >
                                <InputNumber min={2024} max={2030} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                label="月"
                                name="开始月"
                                rules={[{ required: true, message: '请输入开始月份' }]}
                              >
                                <InputNumber min={1} max={12} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                label="日"
                                name="开始日"
                                rules={[{ required: true, message: '请输入开始日期' }]}
                              >
                                <InputNumber min={1} max={31} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Col>
                        <Col span={8}>
                          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>结束日期</div>
                          <Row gutter={8}>
                            <Col span={8}>
                              <Form.Item
                                label="年"
                                name="结束年"
                                rules={[{ required: true, message: '请输入结束年份' }]}
                              >
                                <InputNumber min={2024} max={2030} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                label="月"
                                name="结束月"
                                rules={[{ required: true, message: '请输入结束月份' }]}
                              >
                                <InputNumber min={1} max={12} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                label="日"
                                name="结束日"
                                rules={[{ required: true, message: '请输入结束日期' }]}
                              >
                                <InputNumber min={1} max={31} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Col>
                        <Col span={8}>
                          {/* 留空，保持三列布局的平衡 */}
                        </Col>
                      </Row>
                    ) : (
                      // 其他字段正常渲染
                      <Row gutter={16}>
                        {groupFields.map((field) => (
                          <Col span={(field.type === 'textarea' || field.type === 'checkbox-group') ? 24 : 12} key={field.id}>
                            <Form.Item
                              label={field.name}
                              name={field.id}
                              rules={field.required ? [{ required: true, message: `请输入${field.name}` }] : []}
                            >
                              {renderFormField(field)}
                            </Form.Item>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </div>
                ))}
                
                {/* 隐藏的提交按钮 */}
                <Form.Item style={{ display: 'none' }}>
                  <Button type="primary" htmlType="submit">
                    提交
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </Card>
        </Col>

        {/* 右侧：合同预览区域 */}
        <Col span={12} style={{ height: '100%' }}>
          <Card 
            title={
              <Space>
                <EyeOutlined />
                合同模板预览
                {previewLoading && <Spin size="small" />}
              </Space>
            }
            style={{ height: '100%' }}
            bodyStyle={{ height: 'calc(100% - 57px)', overflowY: 'auto' }}
          >
            {templatePreviewUrl ? (
              <iframe 
                src={templatePreviewUrl} 
                title="合同模板预览"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  border: 'none',
                  borderRadius: '4px'
                }}
              />
            ) : (
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#999',
                fontSize: '16px',
                flexDirection: 'column'
              }}>
                <EyeOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <Text type="secondary">
                  {previewLoading ? '正在加载模板...' : '合同模板加载中...'}
                </Text>
                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    模板预览功能可选，不影响合同创建
                  </Text>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 客户搜索弹窗 */}
      <Modal
        title="选择客户"
        open={customerSearchVisible}
        onCancel={() => {
          setCustomerSearchVisible(false);
          setCustomers([]);
          setCustomerSearchText('');
        }}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: '16px' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="请输入客户姓名或手机号搜索"
              value={customerSearchText}
              onChange={(e) => setCustomerSearchText(e.target.value)}
              onPressEnter={() => searchCustomers(customerSearchText)}
            />
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
              loading={customerSearchLoading}
              onClick={() => searchCustomers(customerSearchText)}
            >
              搜索
            </Button>
          </Space.Compact>
        </div>
        <Table
          columns={customerColumns}
          dataSource={customers}
          rowKey="_id"
          loading={customerSearchLoading}
          pagination={false}
          size="small"
        />
      </Modal>

      {/* 服务人员搜索弹窗 */}
      <Modal
        title="选择服务人员"
        open={workerSearchVisible}
        onCancel={() => {
          setWorkerSearchVisible(false);
          setWorkers([]);
          setWorkerSearchText('');
        }}
        footer={null}
        width={1000}
      >
        <div style={{ marginBottom: '16px' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="请输入服务人员姓名或手机号搜索"
              value={workerSearchText}
              onChange={(e) => setWorkerSearchText(e.target.value)}
              onPressEnter={() => searchWorkers(workerSearchText)}
            />
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
              loading={workerSearchLoading}
              onClick={() => searchWorkers(workerSearchText)}
            >
              搜索
            </Button>
          </Space.Compact>
        </div>
        <Table
          columns={workerColumns}
          dataSource={workers}
          rowKey="_id"
          loading={workerSearchLoading}
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  );
};

export default CreateContract;