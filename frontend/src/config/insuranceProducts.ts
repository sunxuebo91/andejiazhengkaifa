// 大树保保险产品配置

export interface InsurancePlan {
  name: string;           // 方案名称
  productCode: string;    // 产品代码
  planCode: string;       // 计划代码
  price: number;          // 价格（元）
  period: 'year' | 'month'; // 年/月
  insuranceType?: 'personal' | 'enterprise'; // 投保类型（个人/企业）
}

export interface InsuranceProduct {
  id: string;
  company: string;        // 保险公司
  name: string;           // 险种名称
  plans: InsurancePlan[];
}

export const insuranceProducts: InsuranceProduct[] = [
  {
    id: 'pingan-jiazheng',
    company: '平安保险',
    name: '"家政无忧"雇主责任险',
    plans: [
      // 年计划
      { name: '方案A（年）', productCode: 'MP10450101', planCode: 'PK00029001', price: 110, period: 'year' },
      { name: '方案B（年）', productCode: 'MP10450101', planCode: 'PK00029011', price: 160, period: 'year' },
      { name: '方案C（年）', productCode: 'MP10450102', planCode: 'PK00029001', price: 280, period: 'year' },
      { name: '方案D（年）', productCode: 'MP10450102', planCode: 'PK00029011', price: 360, period: 'year' },
      // 月计划
      { name: '方案B（月）', productCode: 'MP10450133', planCode: 'PK00029011', price: 20, period: 'month' },
      { name: '方案C（月）', productCode: 'MP10450133', planCode: 'PK00056658', price: 40, period: 'month' },
      { name: '方案D（月）', productCode: 'MP10450133', planCode: 'PK00056659', price: 50, period: 'month' },
    ],
  },
  {
    id: 'pingan-dashubao',
    company: '平安保险',
    name: '大树保服务无忧保障计划',
    plans: [
      // 计划一
      { name: '计划一（年）', productCode: 'MP10450164', planCode: 'PK00038868', price: 100, period: 'year' },
      { name: '计划一（月）', productCode: 'MP10450164', planCode: 'PK00038868', price: 10, period: 'month' },
      // 计划二
      { name: '计划二（年）', productCode: 'MP10450132', planCode: 'PK00029001', price: 120, period: 'year' },
      { name: '计划二（月）', productCode: 'MP10450132', planCode: 'PK00029001', price: 12, period: 'month' },
    ],
  },
  {
    id: 'huatai-yuesao',
    company: '华泰保险',
    name: '月嫂无忧-尊享计划',
    plans: [
      // 个人投保
      { name: '方案A（月）- 个人', productCode: 'JHJYS', planCode: 'QX000000130807', price: 49, period: 'month', insuranceType: 'personal' },
      { name: '方案B（月）- 个人', productCode: 'JHJYS', planCode: 'QX000000130808', price: 79, period: 'month', insuranceType: 'personal' },
      { name: '方案C（月）- 个人', productCode: 'JHJYS', planCode: 'QX000000130809', price: 149, period: 'month', insuranceType: 'personal' },
      { name: '方案D（月）- 个人', productCode: 'JHJYS', planCode: 'QX000000130810', price: 199, period: 'month', insuranceType: 'personal' },
      // 企业投保
      { name: '方案A（月）- 企业', productCode: 'JHJYS', planCode: 'QX000000130811', price: 49, period: 'month', insuranceType: 'enterprise' },
      { name: '方案B（月）- 企业', productCode: 'JHJYS', planCode: 'QX000000130812', price: 79, period: 'month', insuranceType: 'enterprise' },
      { name: '方案C（月）- 企业', productCode: 'JHJYS', planCode: 'QX000000130813', price: 149, period: 'month', insuranceType: 'enterprise' },
      { name: '方案D（月）- 企业', productCode: 'JHJYS', planCode: 'QX000000130814', price: 199, period: 'month', insuranceType: 'enterprise' },
    ],
  },
];

// 根据产品ID获取产品信息
export const getProductById = (id: string): InsuranceProduct | undefined => {
  return insuranceProducts.find(p => p.id === id);
};

// 根据产品ID和计划代码获取计划信息
export const getPlanByCode = (productId: string, planCode: string): InsurancePlan | undefined => {
  const product = getProductById(productId);
  return product?.plans.find(p => p.planCode === planCode);
};

// 获取产品选项列表（用于下拉框）
export const getProductOptions = () => {
  return insuranceProducts.map(p => ({
    value: p.id,
    label: `${p.company} - ${p.name}`,
  }));
};

// 根据产品ID获取计划选项列表（用于下拉框）
export const getPlanOptions = (productId: string) => {
  const product = getProductById(productId);
  if (!product) return [];
  
  return product.plans.map(p => ({
    value: p.planCode,
    label: `${p.name} - ¥${p.price}`,
    price: p.price,
    productCode: p.productCode,
    period: p.period,
  }));
};

