export interface CustomerBusinessMetrics {
  totalCustomers: number;           // 客户总量
  newTodayCustomers: number;       // 本月新增客户（字段名保持不变，但含义是本月新增）
  pendingMatchCustomers: number;   // 待匹配客户（匹配中状态）
  signedCustomers: number;         // 已签约客户
  lostCustomers: number;           // 流失客户
}

export interface LeadSourceDistribution {
  [key: string]: number;           // 线索来源分布（总量，包括未评级）
}

export interface LeadLevelDistribution {
  oLevel: number;                  // O类线索数量
  aLevel: number;                  // A类线索数量
  bLevel: number;                  // B类线索数量
  cLevel: number;                  // C类线索数量
  dLevel: number;                  // D类线索数量
  total: number;                   // 总计
}

export interface LeadSourceLevelDetail {
  [leadSource: string]: {          // 线索来源
    oLevel: number;                // O类数量
    aLevel: number;                // A类数量
    bLevel: number;                // B类数量
    cLevel: number;                // C类数量
    dLevel: number;                // D类数量
    total: number;                 // 该来源总计
  };
}

export interface LeadQualityMetrics {
  aLevelLeadsRatio: number;        // A类线索占比
  leadSourceDistribution: LeadSourceDistribution;  // 线索来源分布（总量）
  leadLevelDistribution: LeadLevelDistribution;    // ABCD分类总量统计
  leadSourceLevelDetail: LeadSourceLevelDetail;    // 每个线索渠道的ABCD分类
}

export interface ContractMetrics {
  totalContracts: number;          // 合同总量
  newThisMonthContracts: number;   // 本月新签合同
  signingContracts: number;        // 签约中合同
  changeWorkerContracts: number;   // 换人合同数
  signConversionRate: number;      // 签约转化率
}

export interface ResumeMetrics {
  totalResumes: number;            // 简历总量
  newTodayResumes: number;         // 本月新增简历（字段名保持不变，但含义是本月新增）
  acceptingResumes: number;        // 想接单阿姨
  notAcceptingResumes: number;     // 不接单阿姨
  onServiceResumes: number;        // 已上户阿姨
}

export interface FinancialMetrics {
  monthlyServiceFeeIncome: number;     // 本月服务费收入
  monthlyWageExpenditure: number;      // 本月工资支出
  grossProfitMargin: number;           // 毛利润率
  monthOverMonthGrowthRate: number;    // 环比增长率
  totalActiveContracts: number;        // 生效中合同数量
  averageServiceFee: number;           // 平均服务费
}

export interface EfficiencyMetrics {
  averageMatchingDays: number;         // 平均匹配时长（天）
  workerChangeRate: number;            // 换人率统计（%）
  customerSatisfactionRate: number;    // 客户满意度（%）
  contractSigningRate: number;         // 合同签署率（%）
  averageServiceDuration: number;      // 平均服务时长（天）
  quickMatchingRate: number;           // 快速匹配率（7天内匹配的比例）
}

export interface SalesFunnelItem {
  userId: string;
  userName: string;
  mainLeadSource: string;
  totalLeads: number;
  oLevel: number;
  aLevel: number;
  bLevel: number;
  cLevel: number;
  dLevel: number;
  conversionRate: number;
  totalDealAmount: number;
  averageDealAmount: number;
}

export interface SalesFunnelMetrics {
  salesFunnelList: SalesFunnelItem[];
  totalLeads: number;
  totalDealAmount: number;
  averageConversionRate: number;
}

export interface DashboardStats {
  customerBusiness: CustomerBusinessMetrics;
  leadQuality: LeadQualityMetrics;
  contracts: ContractMetrics;
  resumes: ResumeMetrics;
  financial: FinancialMetrics;
  efficiency: EfficiencyMetrics;
  salesFunnel: SalesFunnelMetrics;
  updateTime: Date;
}