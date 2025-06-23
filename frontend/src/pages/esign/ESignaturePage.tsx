import React, { useState } from 'react';
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
  App
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

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;



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
  const [contractResult, setContractResult] = useState<any>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  
  // 步骤数据存储
  const [stepData, setStepData] = useState({
    users: null as any,
    contract: null as any,
    signer: null as any,
    signUrl: '',
    downloadUrl: '',
    selectedPartyA: undefined as UserSearchResult | undefined,
    selectedPartyB: undefined as UserSearchResult | undefined
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

  // 当进入步骤2时加载模板并设置默认值
  React.useEffect(() => {
    if (currentStep === 1) {
      loadTemplates();
      
      // 如果有步骤1的用户数据，这些数据会在getInitialValues中使用
      if (stepData.users?.batchRequest) {
        // 数据会在renderStep2的getInitialValues中自动填充
      }
    }
  }, [currentStep, stepData.users]);

  // 步骤2提交处理
  const handleStep2Submit = async (values: any) => {
    try {
      setLoading(true);
      console.log('提交合同创建数据:', values);

      // 生成合同编号
      const contractNo = `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 填充甲乙双方信息到模板参数
      const enhancedTemplateParams = {
        ...values.templateParams,
        // 如果模板参数中没有甲乙方信息，从步骤1数据中补充
        // 甲方（客户）信息 - 使用模板要求的字段名
        '客户姓名': values.templateParams?.['客户姓名'] || stepData.users?.batchRequest?.partyAName,
        '客户电话': values.templateParams?.['客户电话'] || values.templateParams?.['甲方电话'] || values.templateParams?.['甲方联系电话'] || stepData.users?.batchRequest?.partyAMobile,
        '客户身份证号': values.templateParams?.['客户身份证号'] || values.templateParams?.['甲方身份证'] || values.templateParams?.['甲方身份证号'] || stepData.users?.batchRequest?.partyAIdCard,
        // 乙方（阿姨）信息
        '乙方姓名': values.templateParams?.['乙方姓名'] || values.templateParams?.['阿姨姓名'] || stepData.users?.batchRequest?.partyBName,
        '乙方电话': values.templateParams?.['乙方电话'] || values.templateParams?.['阿姨电话'] || stepData.users?.batchRequest?.partyBMobile,
        '乙方身份证': values.templateParams?.['乙方身份证'] || values.templateParams?.['阿姨身份证号'] || stepData.users?.batchRequest?.partyBIdCard,
        // 服务费相关 - 自动生成大写金额
        '大写服务费': values.templateParams?.['大写服务费'] || convertToChineseAmount(values.templateParams?.['服务费'] || '0'),
        '匹配费大写': values.templateParams?.['匹配费大写'] || convertToChineseAmount(values.templateParams?.['匹配费'] || '0'),
        '阿姨工资大写': values.templateParams?.['阿姨工资大写'] || convertToChineseAmount(values.templateParams?.['阿姨工资'] || '0'),
      };
      
      const contractRequest = {
        contractNo: contractNo,
        contractName: values.contractName,
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
        message.success('合同创建成功！可以进入下一步添加签署方。');
        setStepData(prev => ({ 
          ...prev, 
          contract: {
            contractNo: contractNo,
            contractName: values.contractName,
            templateNo: values.templateNo,
            templateParams: enhancedTemplateParams,
            success: true, // 添加成功标记
            ...response.data
          }
        }));
        setCurrentStep(2); // 进入步骤3
      } else {
        const errorMsg = response?.msg || '合同创建失败';
        message.error(`合同创建失败: ${errorMsg}`);
        // 设置失败状态
        setStepData(prev => ({ 
          ...prev, 
          contract: {
            contractNo: contractNo,
            contractName: values.contractName,
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

      // 如果有步骤1的数据，生成默认合同名称：甲方名称+身份证后四位+的家政服务合同
      if (stepData.users?.batchRequest) {
        const { partyAName, partyAIdCard } = stepData.users.batchRequest;
        const idCardLast4 = partyAIdCard ? partyAIdCard.slice(-4) : '';
        baseValues.contractName = `${partyAName}${idCardLast4}的家政服务合同`;
      }

      return baseValues;
    };

    return (
      <Form
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
            <Col span={12}>
              <Form.Item
                label="合同名称"
                name="contractName"
                rules={[{ required: true, message: '请输入合同名称' }]}
              >
                <Input placeholder="请输入合同名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="有效期（天）"
                name="validityTime"
                rules={[{ required: true, message: '请输入合同有效期' }]}
              >
                <Input type="number" placeholder="合同有效期（天数）" />
              </Form.Item>
            </Col>
          </Row>
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
                  time: { title: '服务时间', icon: '📅', fields: [] as any[] },
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
                      <Select placeholder="请选择服务类型">
                        {Object.values(JobType).map(jobType => (
                          <Option key={jobType} value={JOB_TYPE_MAP[jobType]}>
                            {JOB_TYPE_MAP[jobType]}
                          </Option>
                        ))}
                      </Select>
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
                  
                  // 根据字段类型和名称提供合理默认值
                  if (field.type === 'date') {
                    return new Date().toISOString().split('T')[0];
                  }
                  if (field.type === 'checkbox') {
                    return true;
                  }
                  if (field.type === 'number') {
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

        // 构建签署方数据
        const signersData = [
          {
            contractNo: stepData.contract.contractNo,
            account: stepData.users.partyA.request.mobile, // 甲方账号（手机号）
            name: stepData.users.partyA.request.name,
            mobile: stepData.users.partyA.request.mobile,
            signType: 'manual' as const, // 有感知签约
            validateType: 'sms' as const, // 短信验证码
            signPosition: {
              page: 1,
              x: 0.25, // 甲方签名位置（左侧）
              y: 0.55
            }
          },
          {
            contractNo: stepData.contract.contractNo,
            account: stepData.users.partyB.request.mobile, // 乙方账号（手机号）
            name: stepData.users.partyB.request.name,
            mobile: stepData.users.partyB.request.mobile,
            signType: 'manual' as const, // 有感知签约
            validateType: 'sms' as const, // 短信验证码
            signPosition: {
              page: 1,
              x: 0.75, // 乙方签名位置（右侧）
              y: 0.55
            }
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
        // code: 100000 表示成功，其他表示异常
        if (result && result.code === 100000 && result.data) {
          // 保存签署结果
          setStepData(prev => ({
            ...prev,
            signer: result.data,
            signUrl: result.data.signUser?.[0]?.signUrl || ''
          }));

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
                  <p><strong>签名位置：</strong>第1页左侧</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="乙方（阿姨）" size="small" style={{ background: '#fff7e6' }}>
                  <p><strong>姓名：</strong>{stepData.users.partyB?.request?.name}</p>
                  <p><strong>手机：</strong>{stepData.users.partyB?.request?.mobile}</p>
                  <p><strong>签署方式：</strong>有感知签约（短信验证码）</p>
                  <p><strong>签名位置：</strong>第1页右侧</p>
                </Card>
              </Col>
            </Row>

            <Card title="合同信息" size="small" style={{ marginTop: 16, background: '#f0f9ff' }}>
              <p><strong>合同编号：</strong>{stepData.contract.contractNo}</p>
              <p><strong>合同名称：</strong>{stepData.contract.contractName || '家政服务合同'}</p>
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
    const [contractStatus, setContractStatus] = useState<any>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);

    const checkContractStatus = async () => {
      if (!stepData.contract?.contractNo) {
        message.error('合同编号不存在');
        return;
      }

      setStatusLoading(true);
      try {
        const result = await esignService.getContractStatus(stepData.contract.contractNo);
        console.log('合同状态查询结果:', result);
        setContractStatus(result.data);
        
        if (result.success) {
          message.success('合同状态查询成功');
        } else {
          message.warning(result.message || '合同状态查询失败');
        }
      } catch (error) {
        console.error('查询合同状态失败:', error);
        message.error('查询合同状态失败');
      } finally {
        setStatusLoading(false);
      }
    };

    const downloadContract = async () => {
      if (!stepData.contract?.contractNo) {
        message.error('合同编号不存在');
        return;
      }

      setDownloadLoading(true);
      try {
        const result = await esignService.downloadSignedContract(stepData.contract.contractNo);
        console.log('下载合同结果:', result);
        
        if (result.success && result.data?.downloadUrl) {
          // 打开下载链接
          window.open(result.data.downloadUrl, '_blank');
          message.success('合同下载链接已打开');
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

    return (
      <Card title="步骤5：下载合同" bordered={false}>
        <Alert
          message="合同签署流程完成"
          description="您可以查询合同状态，确认签署完成后下载已签署的合同。"
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {stepData.contract && (
          <Card title="合同信息" size="small" style={{ marginBottom: 24, background: '#f0f9ff' }}>
            <p><strong>合同编号：</strong>{stepData.contract.contractNo}</p>
            <p><strong>合同名称：</strong>{stepData.contract.contractName || '家政服务合同'}</p>
            <p><strong>模板编号：</strong>{stepData.contract.templateNo}</p>
          </Card>
        )}

        <div style={{ marginBottom: 24 }}>
          <Space>
            <Button 
              type="primary" 
              onClick={checkContractStatus}
              loading={statusLoading}
              icon={<SearchOutlined />}
            >
              查询合同状态
            </Button>
            <Button 
              type="primary" 
              onClick={downloadContract}
              loading={downloadLoading}
              disabled={!contractStatus}
            >
              下载合同
            </Button>
          </Space>
        </div>

        {contractStatus && (
          <Card title="合同状态" size="small" style={{ marginBottom: 24 }}>
            <pre style={{ 
              background: '#f6f8fa', 
              padding: 16, 
              borderRadius: 4, 
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {JSON.stringify(contractStatus, null, 2)}
            </pre>
          </Card>
        )}

        <Alert
          message="操作说明"
          description={
            <div>
              <p>1. 点击"查询合同状态"可以查看当前签署进度</p>
              <p>2. 当所有签署方都完成签署后，合同状态会变为"已完成"</p>
              <p>3. 合同签署完成后，点击"下载合同"获取已签署的PDF文件</p>
              <p>4. 如果合同尚未完成签署，请通知相关方完成签署</p>
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