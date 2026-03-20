import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contract, ContractDocument } from './models/contract.model';
import { AppLogger } from '../../common/logging/app-logger';

interface CustomerContractCheckResult {
  hasContract: boolean;
  contract?: Contract;
  contractCount: number;
  isSignedContract: boolean;
}

@Injectable()
export class ContractsQueryService {
  private readonly logger = new AppLogger(ContractsQueryService.name);

  constructor(
    @InjectModel(Contract.name) private readonly contractModel: Model<ContractDocument>,
  ) {}

  async getCustomerContractHistory(customerPhone: string): Promise<any> {
    try {
      const allContracts = await this.contractModel
        .find({ customerPhone })
        .populate('customerId', 'name phone customerId')
        .populate('workerId', 'name phone')
        .populate('createdBy', 'name username')
        .sort({ createdAt: 1 })
        .exec();

      if (allContracts.length === 0) {
        return null;
      }

      const workerHistory = allContracts.map((contract, index) => {
        const actualEndDate = this.resolveActualEndDate(contract, allContracts);
        const contractStartDate = contract.startDate || contract.createdAt;
        const calculatedServiceDays = this.resolveServiceDays(contract, contractStartDate, actualEndDate);

        return {
          序号: index + 1,
          合同编号: contract.contractNumber,
          服务人员: contract.workerName,
          联系电话: contract.workerPhone,
          月薪: contract.workerSalary,
          开始时间: contractStartDate,
          结束时间: contract.replacedByContractId ? '已换人' : '进行中',
          合同结束日期: contract.endDate,
          实际结束日期: actualEndDate,
          服务天数: calculatedServiceDays,
          状态: contract.contractStatus,
          是否最新: contract.isLatest,
          创建时间: contract.createdAt,
          被替换为: this.resolveRelatedContractInfo(contract.replacedByContractId, allContracts),
          替换了: this.resolveRelatedContractInfo(contract.replacesContractId, allContracts),
        };
      });

      const currentContract = allContracts.find(c => c.isLatest === true) || allContracts[allContracts.length - 1];
      const totalServiceDays = workerHistory.reduce((sum, item) => sum + (item.服务天数 || 0), 0);

      const contracts = allContracts.map((contract, index) => {
        const actualEndDate = this.resolveActualEndDate(contract, allContracts);
        const contractStartDate = contract.startDate || contract.createdAt;

        return {
          contractId: contract._id.toString(),
          order: index + 1,
          contractNumber: contract.contractNumber,
          workerName: contract.workerName,
          workerPhone: contract.workerPhone,
          workerSalary: contract.workerSalary,
          startDate: contractStartDate,
          endDate: contract.endDate,
          actualEndDate,
          serviceDays: workerHistory[index]?.服务天数 ?? null,
          status: contract.isLatest ? 'active' : 'replaced',
          terminationDate: contract.replacedByContractId ? (actualEndDate || contract.updatedAt) : null,
          terminationReason: contract.replacedByContractId ? '换人' : null,
          esignStatus: contract.esignStatus,
          createdAt: contract.createdAt,
          isLatest: contract.isLatest,
        };
      });

      return {
        customerPhone,
        customerName: currentContract.customerName,
        totalContracts: allContracts.length,
        totalWorkers: [...new Set(allContracts.map(c => c.workerName))].length,
        totalServiceDays,
        currentContract: {
          id: currentContract._id,
          contractNumber: currentContract.contractNumber,
          workerName: currentContract.workerName,
          workerPhone: currentContract.workerPhone,
          workerSalary: currentContract.workerSalary,
          status: currentContract.contractStatus,
          isLatest: currentContract.isLatest,
        },
        contracts,
        workerHistory,
        latestContractId: currentContract._id,
      };
    } catch (error) {
      this.logger.error('contracts.query.history_failed', error, { customerPhone });
      throw new BadRequestException(`获取客户合同历史失败: ${error.message}`);
    }
  }

  async checkCustomerExistingContract(customerPhone: string): Promise<CustomerContractCheckResult> {
    try {
      const contracts = await this.contractModel
        .find({ customerPhone })
        .populate('customerId', 'name phone customerId')
        .populate('workerId', 'name phone')
        .populate('createdBy', 'name username')
        .sort({ createdAt: -1 })
        .exec();

      if (contracts.length === 0) {
        return {
          hasContract: false,
          contractCount: 0,
          isSignedContract: false,
        };
      }

      const latestContract = contracts[0];
      const hasSignedContract = contracts.some(contract =>
        contract.isLatest !== false && (
          contract.esignStatus === '1' ||
          contract.esignStatus === '2' ||
          contract.contractStatus === 'active'
        )
      );

      return {
        hasContract: true,
        contract: latestContract,
        contractCount: contracts.length,
        isSignedContract: hasSignedContract,
      };
    } catch (error) {
      this.logger.error('contracts.query.check_customer_failed', error, { customerPhone });
      throw new BadRequestException(`检查客户现有合同失败: ${error.message}`);
    }
  }

  async searchByWorkerInfo(name?: string, idCard?: string, phone?: string): Promise<Contract[]> {
    try {
      const query: Record<string, string> = {};

      if (name) {
        query.workerName = name;
      }
      if (idCard) {
        query.workerIdCard = idCard;
      }
      if (phone) {
        query.workerPhone = phone;
      }

      if (Object.keys(query).length === 0) {
        return [];
      }

      return this.contractModel
        .find(query)
        .populate('customerId', 'name phone customerId address')
        .populate('workerId', 'name phone idNumber hukouAddress')
        .sort({ createdAt: -1 })
        .limit(10)
        .exec();
    } catch (error) {
      this.logger.error('contracts.query.search_worker_failed', error, { name, idCard, phone });
      throw new BadRequestException(`查询合同失败: ${error.message}`);
    }
  }

  private resolveActualEndDate(contract: ContractDocument, allContracts: ContractDocument[]): Date | null {
    if (contract.replacedByContractId) {
      const nextContract = allContracts.find(
        c => c._id.toString() === contract.replacedByContractId.toString(),
      );
      return nextContract
        ? nextContract.changeDate || nextContract.startDate || nextContract.createdAt
        : contract.updatedAt || contract.endDate;
    }

    if (contract.isLatest) {
      return null;
    }

    return contract.endDate;
  }

  private resolveServiceDays(
    contract: ContractDocument,
    contractStartDate: Date,
    actualEndDate: Date | null,
  ): number | null {
    if (contract.serviceDays) {
      return contract.serviceDays;
    }

    if (!contractStartDate) {
      return null;
    }

    const start = new Date(contractStartDate).getTime();
    const end = actualEndDate ? new Date(actualEndDate).getTime() : Date.now();
    return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }

  private resolveRelatedContractInfo(
    relatedContractId: ContractDocument['replacedByContractId'],
    allContracts: ContractDocument[],
  ) {
    if (!relatedContractId) {
      return null;
    }

    const relatedContract = allContracts.find(
      c => c._id.toString() === relatedContractId.toString(),
    );
    if (!relatedContract) {
      return null;
    }

    return {
      合同编号: relatedContract.contractNumber,
      服务人员: relatedContract.workerName,
    };
  }
}
