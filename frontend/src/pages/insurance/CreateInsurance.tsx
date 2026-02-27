import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  DatePicker,
  Select,
  InputNumber,
  Space,
  message,
  Steps,
  Result,
  Typography,
  Row,
  Col,
  Spin,
  Tag,
  Modal,
  Collapse,
  Divider,
} from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import {
  PlusOutlined,
  MinusCircleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ShoppingCartOutlined,
  ArrowLeftOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import insuranceService from '../../services/insuranceService';
import {
  CreatePolicyData,
  ID_TYPE_OPTIONS,
  GENDER_OPTIONS,
} from '../../types/insurance.types';
import { apiService } from '../../services/api';
import {
  insuranceProducts,
  InsurancePlan,
  InsuranceProduct,
} from '../../config/insuranceProducts';
import { contractService } from '../../services/contractService';
import { customerService } from '../../services/customerService';
import WechatPayModal from '../../components/WechatPayModal';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// 格式化日期为大树保格式 (yyyyMMddHHmmss)
const formatDateForApi = (date: dayjs.Dayjs): string => {
  return date.format('YYYYMMDDHHmmss');
};

// 从身份证号提取出生日期和性别
const extractInfoFromIdCard = (idCard: string): { birthDate: string; gender: string } | null => {
  if (!idCard || idCard.length !== 18) return null;
  
  const birthYear = idCard.substring(6, 10);
  const birthMonth = idCard.substring(10, 12);
  const birthDay = idCard.substring(12, 14);
  const birthDate = `${birthYear}${birthMonth}${birthDay}000000`;
  
  const genderCode = parseInt(idCard.substring(16, 17));
  const gender = genderCode % 2 === 1 ? 'M' : 'F';
  
  return { birthDate, gender };
};

const productDetails: Record<string, {
  badge?: string;
  tagline: string;
  highlights: string[];
  coverages: string[];
  notices: string[];
  rules?: string[];
  extras?: string[];
}> = {
  'pingan-dashubao': {
    badge: '热门推荐',
    tagline: '大树保平台热销雇主险，保障全面、价格灵活（月/年缴）',
    highlights: [
      '雇主责任：身故伤残 10-40万，医疗 1-4万',
      '第三者责任年累计 100-400万',
      '含误工费、住院津贴、救护车津贴、法律费用',
      '突发急性病身故保障，覆盖上下班途中',
    ],
    coverages: [
      '雇主责任：身故及伤残、医疗费用、误工费、住院津贴、救护车津贴、突发急性病身故、法律费用',
      '第三者责任：年累计赔偿限额 100万/200万/300万/400万，含身故伤残、医疗、财产损失',
      '医疗扩展自费药（赔付不超过合理医疗费用10%）',
    ],
    notices: [
      '被保险人员工年龄 16-65 周岁，超出范围合同自始无效',
      '仅承保 1-3 类职业（不含 4 类及以上职业/拒保职业）',
      '承保区域：全国范围（港澳台除外）',
      '认可全国二级及二级以上公立医院（北京平谷/密云/怀柔、天津滨海/静海除外）',
      '被保险人需在事故发生后 48 小时内报案',
      '同一保险期间同一雇员限投保 1 份，多保无效',
      '突发急性病身故仅限工作时间（含上下班途中）或工作岗位且 48 小时内抢救无效',
    ],
    rules: [
      '雇员工种：限 1-2 类',
      '投保人/被保险人：家政服务企业、个体工商户等',
      '缴费方式：月/年交；默认次日零时生效，可选择生效日期',
      '退保：生效前退保收取保费 5% 或 50 元（取高者）手续费，生效后不可退保',
      '批改：一年期按需求申请变更，只增不减，可线上批改人员信息',
      '新增人员：线上操作，次日凌晨生效，保费按天折算',
    ],
    extras: [
      '附加条款：扩展就餐时间、扩展紧急运输（每位雇员 5000）、扩展境内公出',
      '伤残等级赔付比例：一级 100%…十级 3%',
    ],
  },
  'pingan-jiazheng': {
    badge: '性价比方案',
    tagline: '家政无忧雇主责任险，覆盖雇主责任与第三者责任',
    highlights: [
      '计划一/二双档可选，月缴 10/12 元，年缴 100/120 元',
      '雇主责任含身故伤残、医疗、误工费、住院津贴、救护车津贴',
      '第三者责任最高 100 万年累计',
    ],
    coverages: [
      '雇主责任：身故及伤残、医疗费用、误工费、住院津贴、救护车津贴、突发急性病身故、法律费用',
      '第三者责任：身故伤残、医疗费用、财产损失',
    ],
    notices: [
      '雇用人员不含直系亲属，年龄 16-65 周岁',
      '被保险人仅限 1-3 类职业，4 类及以上不在承保范围',
      '仅承保中国大陆区域（不含港澳台）',
      '认可全国二级及二级以上公立医院（北京平谷/密云/怀柔、天津滨海/静海除外）',
      '雇员过失导致客户财产损失按折旧赔付，古董字画金银首饰等除外',
      '上下班途中合理路线意外伤残死亡属于责任范围',
      '同一保险期间雇员最多投保一份，多保无效',
      '突发急性病身故仅限工作时间（含上下班途中）或工作岗位且 48 小时内抢救无效',
    ],
  },
  'huatai-yuesao': {
    badge: '月嫂专属',
    tagline: '月嫂专享意外与第三者责任保障，覆盖新生儿与产妇住院津贴',
    highlights: [
      '个人意外：身故残疾 40 万，意外医疗 4 万（0 免赔）',
      '工作时间猝死 40 万，意外住院津贴 100 元/天起',
      '第三者责任：雇主家庭成员人身伤害累计 80 万',
      '雇主家庭财产损失 6 万（每次免赔 10%）',
    ],
    coverages: [
      '月嫂个人意外：意外身故残疾 40 万、意外医疗 4 万（0 免赔）、工作时间猝死 40 万、意外住院津贴 100 元/天（免赔 3 天游、180 天为限）',
      '第三者责任：雇主家庭成员人身伤害累计 80 万；每人每次限额 40 万（新生儿 0-28 天限额 20 万）',
      '雇主家庭财产损失 6 万（每次事故免赔 10%）',
      '其他第三者伤害（雇主家庭成员外）累计限额 2 万（医疗部分为保额 10% 为限）',
      '其他保障：法律费用 10 万；住院津贴（婴幼儿黄疸/肺炎/脐炎或产妇乳腺炎）80/100/150/300 元/天（最高 30 天，免赔 0 天）',
    ],
    notices: [
      '被保人员年龄 18-65 周岁，超出范围合同自始无效',
      '同一家政人员保险期内仅限一份，多投无效',
      '新生儿为出生 0-28 天婴儿',
      '认可医院：全国二级及二级以上公立医院',
      '48 小时内报案，逾期影响查勘定损可能不赔',
      '家政人员与雇主及其家庭成员为直系亲属不承保',
      '2 米及以上高空作业导致事故不赔',
      '猝死为病发 48 小时内死亡',
      '本产品不支持人员替换',
    ],
    rules: [
      '第三者责任对雇主家庭成员外人身伤害限额：累计/每次 2 万（医疗部分为保额 10%）',
      '雇主家庭成员每人每次限额 40 万；新生儿每次限额 20 万',
      '住院津贴理赔需二级以上公立医院病历或建休证明',
    ],
    extras: [
      '不赔责任包括：传染病/精神病不宜从事家政服务人员、贵重或难以鉴价财产、罚款罚金、间接损失等',
      '擦玻器造成玻璃划痕不赔，玻璃破损可赔',
    ],
  },
};

const CreateInsurance: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [policyResult, setPolicyResult] = useState<any>(null);
  const [resumeInfo, setResumeInfo] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
  const [insuranceMonths, setInsuranceMonths] = useState<number>(1); // 月计划的月数
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('resumeId');
  // 🆕 从合同详情页传递的服务人员信息
  const workerName = searchParams.get('workerName');
  const workerPhone = searchParams.get('workerPhone');
  const workerIdCard = searchParams.get('workerIdCard');

  // 获取次日的日期（保险默认次日生效）
  const getTomorrowDate = () => dayjs().add(1, 'day').startOf('day');

  // 当被保险人数量变化时，重新计算总保费
  const recalculatePremium = () => {
    if (selectedPlan) {
      const insuredList = form.getFieldValue('insuredList') || [{}];
      // 月计划：保费 = 单价 * 月数 * 人数
      // 年计划：保费 = 单价 * 人数
      const months = selectedPlan.period === 'month' ? insuranceMonths : 1;
      const totalPremium = selectedPlan.price * months * insuredList.length;
      form.setFieldsValue({ totalPremium });
    }
  };

  // 自动计算结束日期
  const calculateExpireDate = (effectiveDate: dayjs.Dayjs, months: number, isYear: boolean) => {
    if (isYear) {
      return effectiveDate.add(1, 'year').subtract(1, 'day');
    } else {
      return effectiveDate.add(months, 'month').subtract(1, 'day');
    }
  };

  // 🆕 从合同详情页跳转时，自动填充服务人员信息
  useEffect(() => {
    if (workerName && workerIdCard) {
      console.log('📋 从合同详情页跳转，自动填充服务人员信息:', { workerName, workerPhone, workerIdCard });
      const info = extractInfoFromIdCard(workerIdCard);
      form.setFieldsValue({
        insuredList: [{
          insuredName: workerName,
          idType: '1',
          idNumber: workerIdCard,
          birthDate: info?.birthDate ? dayjs(info.birthDate.substring(0, 8), 'YYYYMMDD') : undefined,
          gender: info?.gender || 'M',
          mobile: workerPhone || '',
        }],
      });
      message.success(`已自动填充服务人员信息：${workerName}`);
    }
  }, [workerName, workerPhone, workerIdCard]);

  // 加载阿姨简历信息
  useEffect(() => {
    if (resumeId) {
      loadResumeInfo(resumeId);
    }
  }, [resumeId]);

  const loadResumeInfo = async (id: string) => {
    try {
      const response = await apiService.get(`/api/resumes/${id}`);
      if (response.data) {
        setResumeInfo(response.data);
        // 自动填充被保险人信息
        const info = extractInfoFromIdCard(response.data.idCard);
        form.setFieldsValue({
          insuredList: [{
            insuredName: response.data.name,
            idType: '1',
            idNumber: response.data.idCard,
            birthDate: info?.birthDate ? dayjs(info.birthDate.substring(0, 8), 'YYYYMMDD') : undefined,
            gender: info?.gender || 'M',
            mobile: response.data.phone,
          }],
        });
      }
    } catch (error) {
      console.error('加载简历信息失败:', error);
    }
  };

  // 处理身份证号变化，自动提取出生日期和性别
  const handleIdCardChange = (index: number, value: string) => {
    const info = extractInfoFromIdCard(value);
    if (info) {
      const insuredList = form.getFieldValue('insuredList') || [];
      insuredList[index] = {
        ...insuredList[index],
        birthDate: dayjs(info.birthDate.substring(0, 8), 'YYYYMMDD'),
        gender: info.gender,
      };
      form.setFieldsValue({ insuredList });
    }
    // 触发合同信息匹配
    checkAndAutoFillFromContract(index);
  };

  // 根据姓名、身份证号、手机号匹配合同信息并自动填充
  const checkAndAutoFillFromContract = async (index: number) => {
    try {
      const insuredList = form.getFieldValue('insuredList') || [];
      const currentInsured = insuredList[index];

      // 获取当前输入的信息
      const name = currentInsured?.insuredName;
      const idCard = currentInsured?.idNumber;
      const phone = currentInsured?.mobile;

      // 至少需要有姓名和身份证号才进行查询
      if (!name || !idCard || idCard.length !== 18) {
        return;
      }

      console.log('🔍 尝试匹配合同信息:', { name, idCard, phone });

      // 查询合同信息
      const contracts = await contractService.searchByWorkerInfo({
        name,
        idCard,
        phone: phone || undefined,
      });

      if (contracts && contracts.length > 0) {
        // 找到匹配的合同，使用第一个合同的信息
        const contract = contracts[0];
        console.log('✅ 找到匹配的合同:', contract);

        // 🆕 通过客户手机号获取服务地址
        let serviceAddress = '';

        // 方法1: 先尝试从合同的 customerId 对象中获取
        if (typeof contract.customerId === 'object' && contract.customerId?.address) {
          serviceAddress = contract.customerId.address;
          console.log('✅ 从合同对象获取到服务地址:', serviceAddress);
        }

        // 方法2: 如果方法1失败，通过客户手机号查询
        if (!serviceAddress && contract.customerPhone) {
          try {
            console.log('🔍 通过客户手机号查询服务地址:', contract.customerPhone);
            const addressData = await customerService.getAddressByPhone(contract.customerPhone);
            if (addressData?.address) {
              serviceAddress = addressData.address;
              console.log('✅ 通过手机号获取到服务地址:', serviceAddress);
            }
          } catch (error) {
            console.warn('通过手机号获取服务地址失败:', error);
          }
        }

        if (serviceAddress) {
          insuredList[index] = {
            ...insuredList[index],
            serviceAddress,
          };
          form.setFieldsValue({ insuredList });
          message.success(`已自动填充服务地址：${serviceAddress}`);
        } else {
          console.log('⚠️ 未能获取到服务地址');
        }
      }
    } catch (error) {
      console.error('匹配合同信息失败:', error);
      // 静默失败，不影响用户输入
    }
  };

  // 处理姓名变化
  const handleNameChange = (index: number) => {
    checkAndAutoFillFromContract(index);
  };

  // 处理手机号变化 - 显示候选匹配列表
  const handlePhoneChange = async (index: number) => {
    try {
      const insuredList = form.getFieldValue('insuredList') || [];
      const currentInsured = insuredList[index];
      const phone = currentInsured?.mobile;

      // 如果手机号不是11位，不查询
      if (!phone || phone.length !== 11) {
        return;
      }

      console.log('🔍 根据手机号查询合同:', phone);

      // 查询合同信息
      const contracts = await contractService.searchByWorkerInfo({
        phone,
      });

      if (contracts && contracts.length > 0) {
        console.log('✅ 找到匹配的合同:', contracts);

        // 如果只有一个匹配，直接填充
        if (contracts.length === 1) {
          const contract = contracts[0];

          // 🆕 获取服务地址
          let serviceAddress = '';
          if (typeof contract.customerId === 'object' && contract.customerId?.address) {
            serviceAddress = contract.customerId.address;
          } else if (contract.customerPhone) {
            try {
              const addressData = await customerService.getAddressByPhone(contract.customerPhone);
              if (addressData?.address) {
                serviceAddress = addressData.address;
              }
            } catch (error) {
              console.warn('获取服务地址失败:', error);
            }
          }

          // 从身份证号提取出生日期和性别
          const info = extractInfoFromIdCard(contract.workerIdCard);

          insuredList[index] = {
            ...insuredList[index],
            insuredName: contract.workerName,
            idNumber: contract.workerIdCard,
            birthDate: info?.birthDate ? dayjs(info.birthDate.substring(0, 8), 'YYYYMMDD') : undefined,
            gender: info?.gender || 'M',
            serviceAddress,
          };
          form.setFieldsValue({ insuredList });
          message.success(`已自动填充：${contract.workerName} 的信息`);
        } else {
          // 多个匹配，显示选择对话框
          Modal.confirm({
            title: '找到多个匹配的阿姨',
            content: (
              <div>
                <p>请选择要投保的阿姨：</p>
                {contracts.map((contract, idx) => (
                  <div key={idx} style={{ marginBottom: 8 }}>
                    <Button
                      block
                      onClick={async () => {
                        // 🆕 获取服务地址
                        let serviceAddress = '';
                        if (typeof contract.customerId === 'object' && contract.customerId?.address) {
                          serviceAddress = contract.customerId.address;
                        } else if (contract.customerPhone) {
                          try {
                            const addressData = await customerService.getAddressByPhone(contract.customerPhone);
                            if (addressData?.address) {
                              serviceAddress = addressData.address;
                            }
                          } catch (error) {
                            console.warn('获取服务地址失败:', error);
                          }
                        }

                        // 从身份证号提取出生日期和性别
                        const info = extractInfoFromIdCard(contract.workerIdCard);

                        insuredList[index] = {
                          ...insuredList[index],
                          insuredName: contract.workerName,
                          idNumber: contract.workerIdCard,
                          birthDate: info?.birthDate ? dayjs(info.birthDate.substring(0, 8), 'YYYYMMDD') : undefined,
                          gender: info?.gender || 'M',
                          serviceAddress,
                        };
                        form.setFieldsValue({ insuredList });
                        message.success(`已自动填充：${contract.workerName} 的信息`);
                        Modal.destroyAll();
                      }}
                    >
                      {contract.workerName} - {contract.workerIdCard}
                    </Button>
                  </div>
                ))}
              </div>
            ),
            okText: '取消',
            cancelButtonProps: { style: { display: 'none' } },
          });
        }
      }
    } catch (error) {
      console.error('查询合同信息失败:', error);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // 构建请求数据
      const policyData: CreatePolicyData = {
        productCode: selectedPlan?.productCode,
        planCode: values.planCode,
        effectiveDate: formatDateForApi(values.effectiveDate),
        expireDate: formatDateForApi(values.expireDate),
        groupSize: values.insuredList.length,
        totalPremium: values.totalPremium,
        serviceAddress: values.serviceAddress,
        workOrderId: values.workOrderId,
        remark: values.remark,
        policyHolder: {
          policyHolderType: values.policyHolderType,
          policyHolderName: values.policyHolderName,
          phIdType: values.phIdType,
          phIdNumber: values.phIdNumber,
          phTelephone: values.phTelephone,
          phAddress: values.phAddress,
          phProvinceCode: values.phProvinceCode,
          phCityCode: values.phCityCode,
          phDistrictCode: values.phDistrictCode,
        },
        insuredList: values.insuredList.map((item: any, index: number) => ({
          insuredId: String(index + 1),
          insuredName: item.insuredName,
          insuredType: '1',
          idType: item.idType,
          idNumber: item.idNumber,
          birthDate: formatDateForApi(item.birthDate),
          gender: item.gender,
          mobile: item.mobile,
        })),
        resumeId: resumeId || undefined,
      };

      const result = await insuranceService.createPolicy(policyData);
      setPolicyResult(result);

      // 检查是否需要支付
      if (result.status === 'pending' && result.errorMessage?.includes('余额不足')) {
        // 需要支付
        setPaymentModalVisible(true);
        message.warning('保单创建成功，请完成支付');
      } else if (result.status === 'active' || result.policyNo) {
        // 直接生效（见费出单）
        setCurrentStep(2);
        message.success('投保成功！');
      } else {
        // 其他情况，显示结果
        setCurrentStep(2);
        message.success('投保成功！');
      }
    } catch (error: any) {
      message.error(error.message || '投保失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 支付成功回调
  const handlePaymentSuccess = () => {
    setPaymentModalVisible(false);
    setCurrentStep(2);
    message.success('支付成功，保单已生效！');
    // 刷新保单信息
    if (policyResult?.agencyPolicyRef) {
      insuranceService.getPolicyByPolicyNo(policyResult.agencyPolicyRef).then((updatedPolicy) => {
        setPolicyResult(updatedPolicy);
      });
    }
  };

  const steps = [
    { title: '选择保险产品', icon: <ShoppingCartOutlined /> },
    { title: '填写被保险人信息', icon: <TeamOutlined /> },
    { title: '投保完成', icon: <CheckCircleOutlined /> },
  ];

  // 选择保险计划
  const handleSelectPlan = (product: InsuranceProduct, plan: InsurancePlan) => {
    setSelectedProduct(product.id);
    setSelectedPlan(plan);

    // 重置月数为1（月计划默认1个月）
    setInsuranceMonths(1);

    // 默认生效日期为次日，但用户可以修改
    const effectiveDate = getTomorrowDate();
    const expireDate = calculateExpireDate(effectiveDate, 1, plan.period === 'year');

    form.setFieldsValue({
      productId: product.id,
      planCode: plan.planCode,
      effectiveDate,
      expireDate,
      insuranceMonths: 1,
    });

    // 自动计算总保费
    const insuredList = form.getFieldValue('insuredList') || [{}];
    const totalPremium = plan.price * insuredList.length;
    form.setFieldsValue({ totalPremium });

    // 进入下一步
    setCurrentStep(1);
  };

  // 渲染保险产品卡片列表（新版：按险种分组，按年月展示）
  const renderProductCards = () => {
    // 过滤掉家政无忧，将常用险种（大树保）放在第一位
    const sortedProducts = [...insuranceProducts]
      .filter(p => p.id !== 'pingan-jiazheng') // 隐藏家政无忧
      .sort((a, b) => {
        if (a.id === 'pingan-dashubao') return -1;
        if (b.id === 'pingan-dashubao') return 1;
        return 0;
      });

    return (
      <div>
        <Row gutter={[24, 24]}>
          {sortedProducts.map((product) => {
            const detail = productDetails[product.id];
            const isPopular = product.id === 'pingan-dashubao'; // 常用险种

            // 按年月分组套餐，大树保只显示计划二
            let yearPlans = product.plans.filter(p => p.period === 'year');
            let monthPlans = product.plans.filter(p => p.period === 'month');

            if (isPopular) {
              // 大树保只显示计划二
              yearPlans = yearPlans.filter(p => p.name.includes('计划二'));
              monthPlans = monthPlans.filter(p => p.name.includes('计划二'));
            }

            // 其他产品正常显示
            return (
              <Col xs={24} lg={12} xl={8} key={product.id}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: isPopular ? '2px solid #52c41a' : '1px solid #f0f0f0',
                  }}
                  bodyStyle={{ padding: 0 }}
                >
                  {/* 卡片头部 */}
                  <div
                    style={{
                      padding: 20,
                      background: isPopular
                        ? 'linear-gradient(135deg, #f6ffed 0%, #ffffff 70%)'
                        : 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 70%)',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Space>
                        <SafetyCertificateOutlined
                          style={{
                            color: isPopular ? '#52c41a' : '#2f54eb',
                            fontSize: 22
                          }}
                        />
                        <div>
                          <Title level={5} style={{ marginBottom: 0 }}>{product.name}</Title>
                          <Text type="secondary">{product.company}</Text>
                        </div>
                      </Space>
                      {isPopular && <Tag color="success">常用</Tag>}
                      {detail?.badge && !isPopular && <Tag color="gold">{detail.badge}</Tag>}
                    </div>
                    {detail?.tagline && (
                      <Paragraph style={{ marginTop: 12, marginBottom: 0 }} type="secondary">
                        {detail.tagline}
                      </Paragraph>
                    )}
                  </div>

                  {/* 卡片内容 */}
                  <div style={{ padding: 20 }}>
                    {detail?.highlights && (
                      <div style={{ marginBottom: 16 }}>
                        <Space wrap size={[8, 8]}>
                          {detail.highlights.map((item, idx) => (
                            <Tag key={`${product.id}-hl-${idx}`} color="blue">{item}</Tag>
                          ))}
                        </Space>
                      </div>
                    )}

                    {/* 大树保：年缴和月缴并列显示 */}
                    {isPopular ? (
                      <Row gutter={[12, 12]}>
                        {yearPlans.map((plan) => (
                          <Col span={12} key={plan.planCode}>
                            <Card
                              size="small"
                              hoverable
                              style={{
                                border: selectedPlan?.planCode === plan.planCode ? '2px solid #2f54eb' : '1px solid #f0f0f0',
                                boxShadow: selectedPlan?.planCode === plan.planCode ? '0 4px 12px rgba(47,84,235,0.15)' : 'none',
                                cursor: 'pointer',
                              }}
                              onClick={() => handleSelectPlan(product, plan)}
                            >
                              <div style={{ textAlign: 'center' }}>
                                <Tag color="geekblue" style={{ marginBottom: 8 }}>年缴</Tag>
                                <div>
                                  <Text strong style={{ fontSize: 12 }}>{plan.name.replace('（年）', '')}</Text>
                                </div>
                                <div style={{ marginTop: 8 }}>
                                  <Text style={{ fontSize: 20, color: '#f5222d', fontWeight: 600 }}>¥{plan.price}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>/年</Text>
                                </div>
                                {selectedPlan?.planCode === plan.planCode && (
                                  <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 4 }} />
                                )}
                              </div>
                            </Card>
                          </Col>
                        ))}
                        {monthPlans.map((plan) => (
                          <Col span={12} key={plan.planCode}>
                            <Card
                              size="small"
                              hoverable
                              style={{
                                border: selectedPlan?.planCode === plan.planCode ? '2px solid #2f54eb' : '1px solid #f0f0f0',
                                boxShadow: selectedPlan?.planCode === plan.planCode ? '0 4px 12px rgba(47,84,235,0.15)' : 'none',
                                cursor: 'pointer',
                              }}
                              onClick={() => handleSelectPlan(product, plan)}
                            >
                              <div style={{ textAlign: 'center' }}>
                                <Tag color="green" style={{ marginBottom: 8 }}>月缴</Tag>
                                <div>
                                  <Text strong style={{ fontSize: 12 }}>{plan.name.replace('（月）', '')}</Text>
                                </div>
                                <div style={{ marginTop: 8 }}>
                                  <Text style={{ fontSize: 20, color: '#f5222d', fontWeight: 600 }}>¥{plan.price}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>/月</Text>
                                </div>
                                {selectedPlan?.planCode === plan.planCode && (
                                  <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 4 }} />
                                )}
                              </div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <>
                        {/* 其他产品：年缴套餐 */}
                        {yearPlans.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
                              <Tag color="geekblue">年缴</Tag>
                            </Title>
                            <Row gutter={[12, 12]}>
                              {yearPlans.map((plan) => (
                                <Col span={12} key={plan.planCode}>
                                  <Card
                                    size="small"
                                    hoverable
                                    style={{
                                      border: selectedPlan?.planCode === plan.planCode ? '2px solid #2f54eb' : '1px solid #f0f0f0',
                                      boxShadow: selectedPlan?.planCode === plan.planCode ? '0 4px 12px rgba(47,84,235,0.15)' : 'none',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => handleSelectPlan(product, plan)}
                                  >
                                    <div style={{ textAlign: 'center' }}>
                                      <Text strong style={{ fontSize: 12 }}>{plan.name.replace('（年）', '')}</Text>
                                      <div style={{ marginTop: 8 }}>
                                        <Text style={{ fontSize: 20, color: '#f5222d', fontWeight: 600 }}>¥{plan.price}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>/年</Text>
                                      </div>
                                      {selectedPlan?.planCode === plan.planCode && (
                                        <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 4 }} />
                                      )}
                                    </div>
                                  </Card>
                                </Col>
                              ))}
                            </Row>
                          </div>
                        )}

                        {/* 其他产品：月缴套餐 */}
                        {monthPlans.length > 0 && (
                          <div>
                            <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
                              <Tag color="green">月缴</Tag>
                            </Title>
                            <Row gutter={[12, 12]}>
                              {monthPlans.map((plan) => (
                                <Col span={12} key={plan.planCode}>
                                  <Card
                                    size="small"
                                    hoverable
                                    style={{
                                      border: selectedPlan?.planCode === plan.planCode ? '2px solid #2f54eb' : '1px solid #f0f0f0',
                                      boxShadow: selectedPlan?.planCode === plan.planCode ? '0 4px 12px rgba(47,84,235,0.15)' : 'none',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => handleSelectPlan(product, plan)}
                                  >
                                    <div style={{ textAlign: 'center' }}>
                                      <Text strong style={{ fontSize: 12 }}>{plan.name.replace('（月）', '').replace('- 个人', '').replace('- 企业', '')}</Text>
                                      {plan.insuranceType && (
                                        <div>
                                          <Tag color={plan.insuranceType === 'personal' ? 'blue' : 'orange'} style={{ fontSize: 10, marginTop: 4 }}>
                                            {plan.insuranceType === 'personal' ? '个人' : '企业'}
                                          </Tag>
                                        </div>
                                      )}
                                      <div style={{ marginTop: 8 }}>
                                        <Text style={{ fontSize: 20, color: '#f5222d', fontWeight: 600 }}>¥{plan.price}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>/月</Text>
                                      </div>
                                      {selectedPlan?.planCode === plan.planCode && (
                                        <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 4 }} />
                                      )}
                                    </div>
                                  </Card>
                                </Col>
                              ))}
                            </Row>
                          </div>
                        )}
                      </>
                    )}

                    {/* 产品详情折叠面板 */}
                    {detail && (
                      <>
                        <Divider style={{ margin: '20px 0 12px' }} />
                        <Collapse
                          size="small"
                          items={[
                            {
                              key: 'coverage',
                              label: '产品说明（保障责任）',
                              children: (
                                <div>
                                  {detail.coverages.map((item, idx) => (
                                    <Paragraph key={`${product.id}-cov-${idx}`} style={{ marginBottom: 8 }}>
                                      {item}
                                    </Paragraph>
                                  ))}
                                </div>
                              ),
                            },
                            {
                              key: 'notice',
                              label: '投保须知/特别约定',
                              children: (
                                <div>
                                  <ol style={{ paddingLeft: 20, marginBottom: 0 }}>
                                    {detail.notices.map((item, idx) => (
                                      <li key={`${product.id}-notice-${idx}`} style={{ marginBottom: 6 }}>{item}</li>
                                    ))}
                                  </ol>
                                </div>
                              ),
                            },
                            ...(detail.rules ? [{
                              key: 'rules',
                              label: '投保规则',
                              children: (
                                <div>
                                  <ol style={{ paddingLeft: 20, marginBottom: 0 }}>
                                    {detail.rules.map((item, idx) => (
                                      <li key={`${product.id}-rules-${idx}`} style={{ marginBottom: 6 }}>{item}</li>
                                    ))}
                                  </ol>
                                </div>
                              ),
                            }] : []),
                            ...(detail.extras ? [{
                              key: 'extras',
                              label: '附加条款与说明',
                              children: (
                                <div>
                                  {detail.extras.map((item, idx) => (
                                    <Paragraph key={`${product.id}-extra-${idx}`} style={{ marginBottom: 8 }}>
                                      {item}
                                    </Paragraph>
                                  ))}
                                </div>
                              ),
                            }] : []),
                          ]}
                        />
                      </>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  };

  // 渲染投保人表单（固定为企业信息，不可编辑）
  const renderPolicyHolderForm = () => (
    <Card title="投保人信息" bordered={false}>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="policyHolderType"
            label="投保人类型"
            rules={[{ required: true, message: '请选择投保人类型' }]}
            initialValue="C"
          >
            <Select disabled>
              <Option value="C">企业</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="policyHolderName"
            label="投保人名称"
            rules={[{ required: true, message: '请输入投保人名称' }]}
            initialValue="北京安得家政有限公司"
          >
            <Input disabled />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="phIdType"
            label="证件类型"
            rules={[{ required: true, message: '请选择证件类型' }]}
            initialValue="G"
          >
            <Select disabled>
              <Option value="G">统一社会信用代码</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="phIdNumber"
            label="统一社会信用代码"
            rules={[{ required: true, message: '请输入统一社会信用代码' }]}
            initialValue="91110111MACJMD2R5J"
          >
            <Input disabled />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="phProvince"
            label="省市区"
            initialValue="北京市"
          >
            <Input disabled />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="phAddress"
            label="企业地址"
            initialValue="北京市朝阳区望京园602号楼3层339"
          >
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="phProvinceCode"
            label="省级编码"
            initialValue="110000"
            hidden
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="phCityCode"
            label="市级编码"
            initialValue="110100"
            hidden
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="phDistrictCode"
            label="区级编码"
            initialValue="110105"
            hidden
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  // 渲染保单信息表单
  const renderPolicyInfoForm = () => (
    <Card title="保单信息" bordered={false} style={{ marginTop: 16 }}>
      {/* 隐藏字段存储产品和计划代码 */}
      <Form.Item name="productId" hidden><Input /></Form.Item>
      <Form.Item name="planCode" hidden><Input /></Form.Item>

      <Row gutter={16}>
        {/* 月计划显示月数输入框 */}
        {selectedPlan?.period === 'month' && (
          <Col span={6}>
            <Form.Item
              name="insuranceMonths"
              label="投保月数"
              rules={[{ required: true, message: '请输入投保月数' }]}
              initialValue={1}
              tooltip="可选择1-11个月"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={11}
                precision={0}
                placeholder="1-11个月"
                addonAfter="月"
                onChange={(value) => {
                  const months = value || 1;
                  setInsuranceMonths(months);
                  // 重新计算结束日期
                  const effectiveDate = form.getFieldValue('effectiveDate') || getTomorrowDate();
                  const expireDate = calculateExpireDate(effectiveDate, months, false);
                  form.setFieldsValue({ expireDate });
                  // 重新计算保费
                  setTimeout(recalculatePremium, 0);
                }}
              />
            </Form.Item>
          </Col>
        )}
        <Col span={selectedPlan?.period === 'month' ? 6 : 8}>
          <Form.Item
            name="effectiveDate"
            label="生效日期"
            rules={[{ required: true, message: '请选择生效日期' }]}
            tooltip="可选择任意日期作为保险生效日期"
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="请选择生效日期"
              format="YYYY-MM-DD"
              disabledDate={(current) => {
                // 不能选择今天之前的日期
                return current && current < dayjs().startOf('day');
              }}
              onChange={(date) => {
                if (date) {
                  // 重新计算结束日期
                  const months = selectedPlan?.period === 'month' ? insuranceMonths : 1;
                  const expireDate = calculateExpireDate(date, months, selectedPlan?.period === 'year');
                  form.setFieldsValue({ expireDate });
                }
              }}
            />
          </Form.Item>
        </Col>
        <Col span={selectedPlan?.period === 'month' ? 6 : 8}>
          <Form.Item
            name="expireDate"
            label="结束日期"
            rules={[{ required: true, message: '请选择结束日期' }]}
            tooltip="根据投保期限自动计算"
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="自动计算"
              disabled
              format="YYYY-MM-DD"
            />
          </Form.Item>
        </Col>
        <Col span={selectedPlan?.period === 'month' ? 6 : 8}>
          <Form.Item
            name="totalPremium"
            label="总保费（元）"
            rules={[{ required: true, message: '请输入总保费' }]}
            tooltip={selectedPlan?.period === 'month' ? `${selectedPlan?.price}元/人/月 × ${insuranceMonths}月` : `${selectedPlan?.price}元/人/年`}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="自动计算"
              disabled
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item name="remark" label="备注">
            <Input placeholder="请输入备注信息" />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  // 渲染被保险人表单
  const renderInsuredListForm = () => (
    <Card title="被保险人信息" bordered={false} style={{ marginTop: 16 }}>
      <Form.List name="insuredList" initialValue={[{}]}>
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }, index) => (
              <div key={key} style={{ marginBottom: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
                <Row gutter={16} align="middle">
                  <Col span={22}>
                    <Title level={5}>被保险人 {index + 1}</Title>
                  </Col>
                  <Col span={2} style={{ textAlign: 'right' }}>
                    {fields.length > 1 && (
                      <MinusCircleOutlined
                        style={{ color: 'red', fontSize: 18, cursor: 'pointer' }}
                        onClick={() => { remove(name); setTimeout(recalculatePremium, 100); }}
                      />
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'insuredName']}
                      label="姓名"
                      rules={[{ required: true, message: '请输入姓名' }]}
                    >
                      <Input
                        placeholder="请输入姓名"
                        onBlur={() => handleNameChange(index)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'idType']}
                      label="证件类型"
                      rules={[{ required: true, message: '请选择证件类型' }]}
                      initialValue="1"
                    >
                      <Select>
                        {ID_TYPE_OPTIONS.map(opt => (
                          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'idNumber']}
                      label="证件号码"
                      rules={[{ required: true, message: '请输入证件号码' }]}
                    >
                      <Input
                        placeholder="请输入证件号码"
                        onChange={(e) => handleIdCardChange(index, e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'birthDate']}
                      label="出生日期"
                      rules={[{ required: true, message: '请选择出生日期' }]}
                    >
                      <DatePicker style={{ width: '100%' }} placeholder="请选择出生日期" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'gender']}
                      label="性别"
                      rules={[{ required: true, message: '请选择性别' }]}
                    >
                      <Select placeholder="请选择性别">
                        {GENDER_OPTIONS.map(opt => (
                          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item {...restField} name={[name, 'mobile']} label="手机号码">
                      <Input
                        placeholder="请输入手机号码"
                        onBlur={() => handlePhoneChange(index)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item {...restField} name={[name, 'serviceAddress']} label="服务地址">
                      <Input placeholder="请输入服务地址（可自动填充）" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            ))}
            <Form.Item>
              <Button type="dashed" onClick={() => { add(); setTimeout(recalculatePremium, 100); }} block icon={<PlusOutlined />}>
                添加被保险人
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>
    </Card>
  );

  // 渲染结果页面
  const renderResult = () => {
    const isPending = policyResult?.status === 'pending';

    return (
      <Result
        status={isPending ? 'warning' : 'success'}
        title={isPending ? '保单待支付' : '投保成功！'}
        subTitle={
          <div>
            <p>保单流水号：{policyResult?.agencyPolicyRef}</p>
            {policyResult?.policyNo && <p>保单号：{policyResult.policyNo}</p>}
            <p>总保费：¥{policyResult?.totalPremium}</p>
            {isPending && (
              <p style={{ color: '#faad14', marginTop: 8 }}>
                {policyResult?.errorMessage || '请完成支付后保单才能生效'}
              </p>
            )}
          </div>
        }
        extra={[
          isPending && (
            <Button
              type="primary"
              key="pay"
              icon={<WechatOutlined />}
              onClick={() => setPaymentModalVisible(true)}
            >
              立即支付
            </Button>
          ),
          <Button
            type={isPending ? 'default' : 'primary'}
            key="list"
            onClick={() => navigate('/insurance/list')}
          >
            查看保单列表
          </Button>,
          <Button key="new" onClick={() => {
            setCurrentStep(0);
            setPolicyResult(null);
            form.resetFields();
          }}>
            继续投保
          </Button>,
          policyResult?.policyPdfUrl && (
            <Button key="pdf" href={policyResult.policyPdfUrl} target="_blank">
              下载电子保单
            </Button>
          ),
        ].filter(Boolean)}
      />
    );
  };

  return (
    <PageContainer
      title="阿姨投保"
      subTitle="为家政服务人员购买保险"
      extra={
        resumeInfo && (
          <Text type="secondary">
            当前为阿姨 <Text strong>{resumeInfo.name}</Text> 投保
          </Text>
        )
      }
    >
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />

      {currentStep === 0 && (
        <div>
          <Title level={4} style={{ marginBottom: 16 }}>
            <SafetyCertificateOutlined style={{ marginRight: 8 }} />
            请选择保险产品和计划
          </Title>
          {renderProductCards()}
        </div>
      )}

      {currentStep === 1 && (
        <Spin spinning={loading}>
          {/* 显示已选计划信息 */}
          {selectedPlan && (
            <Card style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Row align="middle" justify="space-between">
                <Col>
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                    <Text>已选择：</Text>
                    <Text strong>
                      {insuranceProducts.find(p => p.id === selectedProduct)?.company} - {insuranceProducts.find(p => p.id === selectedProduct)?.name}
                    </Text>
                    <Tag color="blue">{selectedPlan.name}</Tag>
                    <Text style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 18 }}>
                      ¥{selectedPlan.price}/人
                    </Text>
                  </Space>
                </Col>
                <Col>
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setCurrentStep(0)}
                  >
                    重新选择
                  </Button>
                </Col>
              </Row>
            </Card>
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            scrollToFirstError
          >
            {renderPolicyHolderForm()}
            {renderPolicyInfoForm()}
            {renderInsuredListForm()}

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Space size="large">
                <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(0)}>
                  上一步
                </Button>
                <Button type="primary" htmlType="submit" icon={<SafetyCertificateOutlined />} size="large">
                  确认投保
                </Button>
              </Space>
            </div>
          </Form>
        </Spin>
      )}

      {currentStep === 2 && renderResult()}

      {/* 支付弹窗 */}
      {policyResult && (
        <WechatPayModal
          visible={paymentModalVisible}
          policyNo={policyResult.policyNo || ''}
          agencyPolicyRef={policyResult.agencyPolicyRef || ''}
          totalPremium={policyResult.totalPremium || 0}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setPaymentModalVisible(false)}
        />
      )}
    </PageContainer>
  );
};

export default CreateInsurance;

