import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer } from '../customers/models/customer.model';
import { Contract } from '../contracts/models/contract.model';
import { Resume } from '../resume/models/resume.entity';
import {
  DashboardStatsDto,
  CustomerBusinessMetrics,
  LeadQualityMetrics,
  ContractMetrics,
  ResumeMetrics,
  FinancialMetrics,
  EfficiencyMetrics,
  LeadSourceDistribution,
  LeadLevelDistribution,
  LeadSourceLevelDetail,
  SalesFunnelMetrics,
  SalesFunnelItem
} from './dto/dashboard-stats.dto';
import dayjs from 'dayjs';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(Resume.name) private resumeModel: Model<Resume>,
  ) {}

  /**
   * 获取完整的驾驶舱统计数据
   */
  async getDashboardStats(startDate?: string, endDate?: string): Promise<DashboardStatsDto> {
    this.logger.log('开始计算驾驶舱统计数据...', { startDate, endDate });
    
    try {
      // 并行计算各个模块的指标
      const [customerBusiness, leadQuality, contracts, resumes, financial, efficiency, salesFunnel] = await Promise.all([
        this.getCustomerBusinessMetrics(startDate, endDate),
        this.getLeadQualityMetrics(startDate, endDate),
        this.getContractMetrics(startDate, endDate),
        this.getResumeMetrics(startDate, endDate),
        this.getFinancialMetrics(startDate, endDate),
        this.getEfficiencyMetrics(startDate, endDate),
        this.getSalesFunnelMetrics(startDate, endDate),
      ]);

      const result: DashboardStatsDto = {
        customerBusiness,
        leadQuality,
        contracts,
        resumes,
        financial,
        efficiency,
        salesFunnel,
        updateTime: new Date(),
      };

      this.logger.log('驾驶舱统计数据计算完成', {
        customers: customerBusiness.totalCustomers,
        contracts: contracts.totalContracts,
        resumes: resumes.totalResumes,
      });

      return result;
    } catch (error) {
      this.logger.error('计算驾驶舱统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 计算客户业务指标
   */
  private async getCustomerBusinessMetrics(startDate?: string, endDate?: string): Promise<CustomerBusinessMetrics> {
    // 解析时间范围
    const { rangeStart, rangeEnd } = this.parseDateRange(startDate, endDate);

    const [
      totalCustomers,
      newPeriodCustomers,
      pendingMatchCustomers,
      signedCustomers,
      lostCustomers,
    ] = await Promise.all([
      // 客户总量
      this.customerModel.countDocuments().exec(),
      
      // 时间段内新增客户
      this.customerModel.countDocuments({
        createdAt: { $gte: rangeStart, $lte: rangeEnd }
      }).exec(),
      
      // 待匹配客户（匹配中状态）
      this.customerModel.countDocuments({
        contractStatus: '匹配中'
      }).exec(),
      
      // 已签约客户
      this.customerModel.countDocuments({
        contractStatus: '已签约'
      }).exec(),
      
      // 流失客户
      this.customerModel.countDocuments({
        contractStatus: '流失客户'
      }).exec(),
    ]);

    return {
      totalCustomers,
      newTodayCustomers: newPeriodCustomers, // 改为时间段内新增
      pendingMatchCustomers,
      signedCustomers,
      lostCustomers,
    };
  }

  /**
   * 计算线索质量指标
   */
  private async getLeadQualityMetrics(startDate?: string, endDate?: string): Promise<LeadQualityMetrics> {
    // 解析时间范围
    const { rangeStart, rangeEnd } = this.parseDateRange(startDate, endDate);

    // 获取时间范围内的线索来源分布（总量，包括未评级）
    const leadSourceAggregation = await this.customerModel.aggregate([
      { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
      { $group: { _id: '$leadSource', count: { $sum: 1 } } }
    ]).exec();

    const leadSourceDistribution: LeadSourceDistribution = {};
    leadSourceAggregation.forEach(item => {
      leadSourceDistribution[item._id] = item.count;
    });

    // 计算OABCD分类总量统计
    const leadLevelAggregation = await this.customerModel.aggregate([
      {
        $match: {
          leadLevel: { $in: ['O类', 'A类', 'B类', 'C类', 'D类'] }
        }
      },
      {
        $group: {
          _id: '$leadLevel',
          count: { $sum: 1 }
        }
      }
    ]).exec();

    const leadLevelDistribution: LeadLevelDistribution = {
      oLevel: 0,
      aLevel: 0,
      bLevel: 0,
      cLevel: 0,
      dLevel: 0,
      total: 0
    };

    leadLevelAggregation.forEach(item => {
      const count = item.count;
      leadLevelDistribution.total += count;

      switch (item._id) {
        case 'O类':
          leadLevelDistribution.oLevel = count;
          break;
        case 'A类':
          leadLevelDistribution.aLevel = count;
          break;
        case 'B类':
          leadLevelDistribution.bLevel = count;
          break;
        case 'C类':
          leadLevelDistribution.cLevel = count;
          break;
        case 'D类':
          leadLevelDistribution.dLevel = count;
          break;
      }
    });

    // 计算每个线索渠道的OABCD分类
    const leadSourceLevelAggregation = await this.customerModel.aggregate([
      {
        $match: {
          leadLevel: { $in: ['O类', 'A类', 'B类', 'C类', 'D类'] }
        }
      },
      {
        $group: {
          _id: {
            leadSource: '$leadSource',
            leadLevel: '$leadLevel'
          },
          count: { $sum: 1 }
        }
      }
    ]).exec();

    const leadSourceLevelDetail: LeadSourceLevelDetail = {};

    leadSourceLevelAggregation.forEach(item => {
      const source = item._id.leadSource || '未设置';
      const level = item._id.leadLevel;
      const count = item.count;

      if (!leadSourceLevelDetail[source]) {
        leadSourceLevelDetail[source] = {
          oLevel: 0,
          aLevel: 0,
          bLevel: 0,
          cLevel: 0,
          dLevel: 0,
          total: 0
        };
      }

      leadSourceLevelDetail[source].total += count;

      switch (level) {
        case 'O类':
          leadSourceLevelDetail[source].oLevel = count;
          break;
        case 'A类':
          leadSourceLevelDetail[source].aLevel = count;
          break;
        case 'B类':
          leadSourceLevelDetail[source].bLevel = count;
          break;
        case 'C类':
          leadSourceLevelDetail[source].cLevel = count;
          break;
        case 'D类':
          leadSourceLevelDetail[source].dLevel = count;
          break;
      }
    });

    // 计算A类线索占比（所有有线索等级的客户中，A类的占比）
    const aLevelLeadsRatio = leadLevelDistribution.total > 0 ?
      Math.round((leadLevelDistribution.aLevel / leadLevelDistribution.total) * 100 * 100) / 100 : 0;

    return {
      aLevelLeadsRatio,
      leadSourceDistribution,
      leadLevelDistribution,
      leadSourceLevelDetail,
    };
  }

  /**
   * 计算合同指标
   */
  private async getContractMetrics(startDate?: string, endDate?: string): Promise<ContractMetrics> {
    // 解析时间范围
    const { rangeStart, rangeEnd } = this.parseDateRange(startDate, endDate);

    const [
      totalContracts,
      newPeriodContracts,
      signingContracts,
      changeWorkerContracts,
      totalCustomers,
    ] = await Promise.all([
      // 合同总量
      this.contractModel.countDocuments().exec(),
      
      // 时间段内新签合同
      this.contractModel.countDocuments({
        createdAt: { $gte: rangeStart, $lte: rangeEnd }
      }).exec(),
      
      // 签约中合同（爱签状态为签约中）
      this.contractModel.countDocuments({
        esignStatus: '1' // 签约中状态
      }).exec(),
      
      // 换人合同数
      this.contractModel.countDocuments({
        replacesContractId: { $exists: true }
      }).exec(),
      
      // 总客户数用于计算转化率
      this.customerModel.countDocuments().exec(),
    ]);

    // 计算签约转化率：已签约客户 / 总客户 * 100%
    const signedCustomers = await this.customerModel.countDocuments({
      contractStatus: '已签约'
    }).exec();
    
    const signConversionRate = totalCustomers > 0 ? 
      Math.round((signedCustomers / totalCustomers) * 100 * 100) / 100 : 0;

    return {
      totalContracts,
      newThisMonthContracts: newPeriodContracts, // 改为时间段内新签
      signingContracts,
      changeWorkerContracts,
      signConversionRate,
    };
  }

  /**
   * 计算简历指标（复用现有逻辑）
   */
  private async getResumeMetrics(startDate?: string, endDate?: string): Promise<ResumeMetrics> {
    // 解析时间范围
    const { rangeStart, rangeEnd } = this.parseDateRange(startDate, endDate);
    
    // 获取所有简历数据进行分析
    const [totalResumes, newPeriodResumes, allResumes] = await Promise.all([
      this.resumeModel.countDocuments().exec(),
      this.resumeModel.countDocuments({
        createdAt: { $gte: rangeStart, $lte: rangeEnd }
      }).exec(),
      this.resumeModel.find({}, 'orderStatus createdAt').lean().exec(),
    ]);

    // 按接单状态统计
    const acceptingResumes = allResumes.filter(r => r.orderStatus === 'accepting').length;
    const notAcceptingResumes = allResumes.filter(r => r.orderStatus === 'not-accepting').length;
    const onServiceResumes = allResumes.filter(r => r.orderStatus === 'on-service').length;

    return {
      totalResumes,
      newTodayResumes: newPeriodResumes, // 改为时间段内新增
      acceptingResumes,
      notAcceptingResumes,
      onServiceResumes,
    };
  }

  /**
   * 获取客户业务指标（单独接口）
   */
  async getCustomerBusinessMetricsOnly(): Promise<CustomerBusinessMetrics> {
    return this.getCustomerBusinessMetrics();
  }

  /**
   * 计算财务营收指标
   */
  private async getFinancialMetrics(startDate?: string, endDate?: string): Promise<FinancialMetrics> {
    // 解析时间范围
    const { rangeStart, rangeEnd } = this.parseDateRange(startDate, endDate);
    
    // 计算上一个相同长度的时间段（用于环比）
    const rangeDuration = rangeEnd.getTime() - rangeStart.getTime();
    const lastPeriodStart = new Date(rangeStart.getTime() - rangeDuration);
    const lastPeriodEnd = new Date(rangeEnd.getTime() - rangeDuration);

    // 查询当前时间段的合同
    const currentPeriodContracts = await this.contractModel.find({
      contractStatus: { $in: ['active', 'signing'] },
      startDate: { $gte: rangeStart, $lte: rangeEnd }
    }).exec();

    // 查询上一时间段的合同（用于计算环比增长）
    const lastPeriodContracts = await this.contractModel.find({
      contractStatus: { $in: ['active', 'signing'] },
      startDate: { $gte: lastPeriodStart, $lte: lastPeriodEnd }
    }).exec();

    // 查询所有生效中的合同
    const activeContracts = await this.contractModel.find({
      contractStatus: { $in: ['active', 'signing'] }
    }).exec();

    // 计算当前时间段服务费收入
    const currentServiceFeeIncome = currentPeriodContracts.reduce((sum, contract) => {
      return sum + (contract.customerServiceFee || 0);
    }, 0);

    // 计算当前时间段工资支出
    const currentWageExpenditure = currentPeriodContracts.reduce((sum, contract) => {
      return sum + (contract.workerSalary || 0);
    }, 0);

    // 计算上一时间段服务费收入（用于环比计算）
    const lastPeriodServiceFeeIncome = lastPeriodContracts.reduce((sum, contract) => {
      return sum + (contract.customerServiceFee || 0);
    }, 0);

    // 计算毛利润率：(服务费收入 - 工资支出) / 服务费收入 * 100%
    const grossProfitMargin = currentServiceFeeIncome > 0 ? 
      Math.round(((currentServiceFeeIncome - currentWageExpenditure) / currentServiceFeeIncome) * 100 * 100) / 100 : 0;

    // 计算环比增长率：(当前收入 - 上期收入) / 上期收入 * 100%
    const monthOverMonthGrowthRate = lastPeriodServiceFeeIncome > 0 ? 
      Math.round(((currentServiceFeeIncome - lastPeriodServiceFeeIncome) / lastPeriodServiceFeeIncome) * 100 * 100) / 100 : 
      (currentServiceFeeIncome > 0 ? 100 : -100);

    // 计算平均服务费
    const averageServiceFee = activeContracts.length > 0 ? 
      Math.round(activeContracts.reduce((sum, contract) => sum + (contract.customerServiceFee || 0), 0) / activeContracts.length) : 0;

    return {
      monthlyServiceFeeIncome: Math.round(currentServiceFeeIncome),
      monthlyWageExpenditure: Math.round(currentWageExpenditure),
      grossProfitMargin,
      monthOverMonthGrowthRate,
      totalActiveContracts: activeContracts.length,
      averageServiceFee,
    };
  }

  /**
   * 计算运营效率指标
   */
  private async getEfficiencyMetrics(startDate?: string, endDate?: string): Promise<EfficiencyMetrics> {
    // 解析时间范围
    const { rangeStart, rangeEnd } = this.parseDateRange(startDate, endDate);
    
    // 获取时间范围内的客户和合同数据
    const [allCustomers, allContracts] = await Promise.all([
      this.customerModel.find({
        createdAt: { $gte: rangeStart, $lte: rangeEnd }
      }).exec(),
      this.contractModel.find({
        createdAt: { $gte: rangeStart, $lte: rangeEnd }
      }).exec(),
    ]);

    // 计算平均匹配时长（从客户录入到首次签约的时间）
    const signedCustomers = allCustomers.filter(customer => customer.contractStatus === '已签约');
    let totalMatchingDays = 0;
    let validMatchingCount = 0;

    for (const customer of signedCustomers) {
      // 找到该客户的第一个合同
      const firstContract = allContracts
        .filter(contract => contract.customerPhone === customer.phone)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
      
      if (firstContract && customer.createdAt) {
        const matchingDays = Math.floor(
          (new Date(firstContract.createdAt).getTime() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (matchingDays >= 0) {
          totalMatchingDays += matchingDays;
          validMatchingCount++;
        }
      }
    }

    const averageMatchingDays = validMatchingCount > 0 ? 
      Math.round((totalMatchingDays / validMatchingCount) * 100) / 100 : 0;

    // 计算换人率：换人合同数 / 总合同数 * 100%
    const changeWorkerContracts = allContracts.filter(contract => contract.replacesContractId).length;
    const workerChangeRate = allContracts.length > 0 ? 
      Math.round((changeWorkerContracts / allContracts.length) * 100 * 100) / 100 : 0;

    // 计算合同签署率：已签署合同 / 总合同 * 100%
    const signedContracts = allContracts.filter(contract => contract.esignStatus === '2').length; // 2表示已签署
    const contractSigningRate = allContracts.length > 0 ? 
      Math.round((signedContracts / allContracts.length) * 100 * 100) / 100 : 0;

    // 计算快速匹配率：7天内完成匹配的客户比例
    let quickMatchingCount = 0;
    for (const customer of signedCustomers) {
      const firstContract = allContracts
        .filter(contract => contract.customerPhone === customer.phone)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
      
      if (firstContract && customer.createdAt) {
        const matchingDays = Math.floor(
          (new Date(firstContract.createdAt).getTime() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (matchingDays >= 0 && matchingDays <= 7) {
          quickMatchingCount++;
        }
      }
    }

    const quickMatchingRate = validMatchingCount > 0 ? 
      Math.round((quickMatchingCount / validMatchingCount) * 100 * 100) / 100 : 0;

    // 计算平均服务时长（已完成的合同的服务天数）
    const completedContracts = allContracts.filter(contract => 
      contract.serviceDays && contract.serviceDays > 0
    );
    const totalServiceDays = completedContracts.reduce((sum, contract) => sum + (contract.serviceDays || 0), 0);
    const averageServiceDuration = completedContracts.length > 0 ? 
      Math.round(totalServiceDays / completedContracts.length) : 0;

    // 暂时设置固定的客户满意度（后续需要接入评价系统）
    const customerSatisfactionRate = 85.5; // 默认满意度

    return {
      averageMatchingDays,
      workerChangeRate,
      customerSatisfactionRate,
      contractSigningRate,
      averageServiceDuration,
      quickMatchingRate,
    };
  }

  /**
   * 解析时间范围参数
   */
  private parseDateRange(startDate?: string, endDate?: string): { rangeStart: Date; rangeEnd: Date } {
    let rangeStart: Date;
    let rangeEnd: Date;

    if (startDate && endDate) {
      rangeStart = new Date(startDate);
      rangeEnd = new Date(endDate);
      this.logger.log(`使用指定时间范围: ${startDate} 到 ${endDate}`, {
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString()
      });
    } else {
      // 默认为当前月
      rangeStart = dayjs().startOf('month').toDate();
      rangeEnd = dayjs().endOf('month').toDate();
      this.logger.log(`使用默认时间范围（当前月）`, {
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString()
      });
    }

    return { rangeStart, rangeEnd };
  }

  /**
   * 获取销售个人漏斗数据
   */
  async getSalesFunnelMetrics(startDate?: string, endDate?: string): Promise<SalesFunnelMetrics> {
    this.logger.log('开始计算销售漏斗数据...');

    try {
      // 聚合查询：按销售人员统计
      // 🔥 [FIX] 只统计非公海客户（销售人员当前持有的客户）
      const salesAggregation = await this.customerModel.aggregate([
        {
          $match: {
            assignedTo: { $exists: true, $ne: null },
            inPublicPool: false
          }
        },
        {
          $group: {
            _id: '$assignedTo',
            totalLeads: { $sum: 1 },
            oLevel: {
              $sum: { $cond: [{ $eq: ['$leadLevel', 'O类'] }, 1, 0] }
            },
            aLevel: {
              $sum: { $cond: [{ $eq: ['$leadLevel', 'A类'] }, 1, 0] }
            },
            bLevel: {
              $sum: { $cond: [{ $eq: ['$leadLevel', 'B类'] }, 1, 0] }
            },
            cLevel: {
              $sum: { $cond: [{ $eq: ['$leadLevel', 'C类'] }, 1, 0] }
            },
            dLevel: {
              $sum: { $cond: [{ $eq: ['$leadLevel', 'D类'] }, 1, 0] }
            },
            totalDealAmount: {
              $sum: { $ifNull: ['$dealAmount', 0] }
            },
            leadSources: { $push: '$leadSource' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $unwind: {
            path: '$userInfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            userId: '$_id',
            userName: { $ifNull: ['$userInfo.name', '未知'] },
            totalLeads: 1,
            oLevel: 1,
            aLevel: 1,
            bLevel: 1,
            cLevel: 1,
            dLevel: 1,
            totalDealAmount: 1,
            leadSources: 1
          }
        },
        {
          $match: {
            userName: { $ne: '未知' }
          }
        },
        {
          $sort: { totalDealAmount: -1, totalLeads: -1 }
        }
      ]).exec();

      // 处理数据
      const salesFunnelList: SalesFunnelItem[] = salesAggregation.map(item => {
        // 计算主要线索渠道（出现次数最多的）
        const sourceCount: { [key: string]: number } = {};
        item.leadSources.forEach((source: string) => {
          sourceCount[source] = (sourceCount[source] || 0) + 1;
        });
        const mainLeadSource = Object.keys(sourceCount).reduce((a, b) =>
          sourceCount[a] > sourceCount[b] ? a : b, '其他'
        );

        // 计算成交率
        const conversionRate = item.totalLeads > 0
          ? parseFloat(((item.oLevel / item.totalLeads) * 100).toFixed(2))
          : 0;

        // 计算客单价
        const averageDealAmount = item.oLevel > 0
          ? parseFloat((item.totalDealAmount / item.oLevel).toFixed(2))
          : 0;

        return {
          userId: item.userId.toString(),
          userName: item.userName,
          mainLeadSource,
          totalLeads: item.totalLeads,
          oLevel: item.oLevel,
          aLevel: item.aLevel,
          bLevel: item.bLevel,
          cLevel: item.cLevel,
          dLevel: item.dLevel,
          conversionRate,
          totalDealAmount: item.totalDealAmount,
          averageDealAmount
        };
      });

      // 计算总计
      const totalLeads = salesFunnelList.reduce((sum, item) => sum + item.totalLeads, 0);
      const totalDealAmount = salesFunnelList.reduce((sum, item) => sum + item.totalDealAmount, 0);
      const totalOLevel = salesFunnelList.reduce((sum, item) => sum + item.oLevel, 0);
      const averageConversionRate = totalLeads > 0
        ? parseFloat(((totalOLevel / totalLeads) * 100).toFixed(2))
        : 0;

      this.logger.log('销售漏斗数据计算完成', {
        salesCount: salesFunnelList.length,
        totalLeads,
        totalDealAmount,
        averageConversionRate
      });

      return {
        salesFunnelList,
        totalLeads,
        totalDealAmount,
        averageConversionRate
      };
    } catch (error) {
      this.logger.error('计算销售漏斗数据失败', error);
      return {
        salesFunnelList: [],
        totalLeads: 0,
        totalDealAmount: 0,
        averageConversionRate: 0
      };
    }
  }
}