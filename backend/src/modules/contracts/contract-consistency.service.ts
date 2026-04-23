import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contract, ContractDocument, ContractStatus } from './models/contract.model';
import { Customer, CustomerDocument } from '../customers/models/customer.model';
import { Resume, IResume } from '../resume/models/resume.entity';
import { CustomerOperationLog } from '../customers/models/customer-operation-log.model';
import { ResumeOperationLog } from '../resume/models/resume-operation-log.model';
import { OrderStatus } from '../resume/dto/create-resume.dto';
import { RequestContextStore } from '../../common/logging/request-context';
import {
  SYNCABLE_CONTRACT_STATUSES,
  CUSTOMER_TO_CONTRACT_FIELD_MAP,
  RESUME_TO_CONTRACT_FIELD_MAP,
  CONTRACT_TO_CUSTOMER_FIELD_MAP,
  CONTRACT_TO_RESUME_FIELD_MAP,
  NEVER_OVERWRITE_WITH_EMPTY,
  SENSITIVE_FIELDS,
  ContractProfileSyncSource,
  isBlank,
  normalize,
} from './contract-sync.constants';

const SIGNED_CUSTOMER_CONTRACT_STATUS = '已签约';
const SIGNED_CUSTOMER_LEAD_LEVEL = 'O类';
const SYSTEM_OPERATOR_ID = new Types.ObjectId('000000000000000000000000');

export interface OnContractActivatedResult {
  contractId: string;
  customerId?: string;
  customerChangedFields: Record<string, any>;
  resumeId?: string;
  resumeChangedFields: Record<string, any>;
}

/**
 * 订单为中心的数据一致性同步服务
 *  1. 合同签约瞬间 → 回灌客户档案与阿姨简历的核心字段（一次性）
 *  2. 合同终态（换人/作废/退款/毕业）→ 回退阿姨接单状态
 *  3. 客户档案/阿姨简历被编辑 → 下发变更到该对象名下所有"已签约 + 最新"的合同
 *
 * 反向同步门槛：contract.contractStatus ∈ {SIGNED, ACTIVE} 且 contract.isLatest === true
 */
@Injectable()
export class ContractConsistencyService {
  private readonly logger = new Logger(ContractConsistencyService.name);

  constructor(
    @InjectModel(Contract.name) private readonly contractModel: Model<ContractDocument>,
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Resume.name) private readonly resumeModel: Model<IResume>,
    @InjectModel(CustomerOperationLog.name) private readonly customerOpLogModel: Model<CustomerOperationLog>,
    @InjectModel(ResumeOperationLog.name) private readonly resumeOpLogModel: Model<ResumeOperationLog>,
  ) {}

  /**
   * 合同进入签约完成态时调用（SIGNED / ACTIVE），一次性把合同快照回灌到客户档案与阿姨简历。
   * 同时：客户状态 → 已签约/O类；阿姨 orderStatus → on-service。
   */
  async onContractActivated(contractId: string | Types.ObjectId): Promise<OnContractActivatedResult> {
    const result: OnContractActivatedResult = {
      contractId: contractId.toString(),
      customerChangedFields: {},
      resumeChangedFields: {},
    };
    try {
      const contract = await this.contractModel.findById(contractId).exec();
      if (!contract) return result;

      const actorId = (contract.createdBy as any)?.toString?.() || 'system';

      const customerOut = await this.syncContractToCustomer(contract, actorId);
      if (customerOut) {
        result.customerId = customerOut.customerId;
        result.customerChangedFields = customerOut.changedFields;
      }

      const resumeOut = await this.syncContractToResume(contract, actorId);
      if (resumeOut) {
        result.resumeId = resumeOut.resumeId;
        result.resumeChangedFields = resumeOut.changedFields;
      }

      await this.contractModel.findByIdAndUpdate(contract._id, {
        lastProfileSyncedAt: new Date(),
        lastProfileSyncSource: ContractProfileSyncSource.CONTRACT_SIGNED,
      }).exec();
    } catch (err) {
      this.logger.error(`[onContractActivated] failed: contractId=${contractId}`, err as any);
    }
    return result;
  }

  /**
   * 合同进入终态（REPLACED / CANCELLED / REFUNDED / GRADUATED）时调用。
   * 若该阿姨已无其他"ACTIVE + 最新"合同，回退其 orderStatus 到 accepting。
   */
  async onContractTerminated(
    contractId: string | Types.ObjectId,
    reason: 'replaced' | 'cancelled' | 'refunded' | 'graduated',
  ): Promise<void> {
    try {
      const contract = await this.contractModel.findById(contractId).lean().exec();
      if (!contract || !contract.workerId) return;

      const activeCount = await this.contractModel.countDocuments({
        workerId: contract.workerId,
        _id: { $ne: contract._id },
        contractStatus: ContractStatus.ACTIVE,
        isLatest: true,
      }).exec();
      if (activeCount > 0) {
        this.logger.log(`[onContractTerminated] worker=${contract.workerId} 仍有 ${activeCount} 份在服合同，保留 orderStatus`);
        return;
      }

      const resume = await this.resumeModel.findById(contract.workerId).exec();
      if (!resume) return;
      if (resume.orderStatus !== OrderStatus.ON_SERVICE) return;

      await this.resumeModel.findByIdAndUpdate(resume._id, { orderStatus: OrderStatus.ACCEPTING }).exec();
      await this.writeResumeLog(resume._id as Types.ObjectId, 'system', 'change_status', '合同终态自动回退接单状态', {
        before: { orderStatus: OrderStatus.ON_SERVICE },
        after: { orderStatus: OrderStatus.ACCEPTING },
        description: `合同终态(${reason})后阿姨无其他在服合同，接单状态自动回退为 accepting`,
        relatedId: contract._id.toString(),
        relatedType: 'contract',
      });
      this.logger.log(`[onContractTerminated] worker=${resume._id} orderStatus → accepting`);
    } catch (err) {
      this.logger.error(`[onContractTerminated] failed: contractId=${contractId}`, err as any);
    }
  }

  /**
   * 客户档案保存后调用，把白名单内的变更下发到该客户名下所有"已签约+最新"合同。
   */
  async onCustomerUpdated(
    customerId: string | Types.ObjectId,
    before: Record<string, any>,
    after: Record<string, any>,
    _actorId?: string,
  ): Promise<void> {
    try {
      const contractSet = this.computeContractUpdatesFromProfile(
        CUSTOMER_TO_CONTRACT_FIELD_MAP,
        before,
        after,
      );
      if (Object.keys(contractSet).length === 0) return;

      const contracts = await this.contractModel.find({
        customerId: new Types.ObjectId(customerId.toString()),
        contractStatus: { $in: SYNCABLE_CONTRACT_STATUSES },
        isLatest: true,
      }).exec();
      if (contracts.length === 0) return;

      const now = new Date();
      for (const contract of contracts) {
        await this.contractModel.findByIdAndUpdate(contract._id, {
          ...contractSet,
          lastProfileSyncedAt: now,
          lastProfileSyncSource: ContractProfileSyncSource.CUSTOMER_UPDATE,
        }).exec();
        this.logger.log(`[onCustomerUpdated] contract=${contract._id} 更新字段: ${Object.keys(contractSet).join(', ')}`);
      }
    } catch (err) {
      this.logger.error(`[onCustomerUpdated] failed: customerId=${customerId}`, err as any);
    }
  }

  /**
   * 阿姨简历保存后调用，把白名单内的变更下发到该阿姨名下所有"已签约+最新"合同。
   */
  async onResumeUpdated(
    resumeId: string | Types.ObjectId,
    before: Record<string, any>,
    after: Record<string, any>,
    _actorId?: string,
  ): Promise<void> {
    try {
      const contractSet = this.computeContractUpdatesFromProfile(
        RESUME_TO_CONTRACT_FIELD_MAP,
        before,
        after,
      );
      if (Object.keys(contractSet).length === 0) return;

      const contracts = await this.contractModel.find({
        workerId: new Types.ObjectId(resumeId.toString()),
        contractStatus: { $in: SYNCABLE_CONTRACT_STATUSES },
        isLatest: true,
      }).exec();
      if (contracts.length === 0) return;

      const now = new Date();
      for (const contract of contracts) {
        await this.contractModel.findByIdAndUpdate(contract._id, {
          ...contractSet,
          lastProfileSyncedAt: now,
          lastProfileSyncSource: ContractProfileSyncSource.RESUME_UPDATE,
        }).exec();
        this.logger.log(`[onResumeUpdated] contract=${contract._id} 更新字段: ${Object.keys(contractSet).join(', ')}`);
      }
    } catch (err) {
      this.logger.error(`[onResumeUpdated] failed: resumeId=${resumeId}`, err as any);
    }
  }

  // ==================== 私有辅助方法 ====================

  private async syncContractToCustomer(
    contract: ContractDocument,
    actorId: string,
  ): Promise<{ customerId: string; changedFields: Record<string, any> } | null> {
    let customer: CustomerDocument | null = null;
    if (contract.customerId) {
      customer = await this.customerModel.findById(contract.customerId).exec();
    }
    if (!customer && contract.customerPhone) {
      customer = await this.customerModel.findOne({ phone: contract.customerPhone }).exec();
    }
    if (!customer) {
      this.logger.warn(`[syncContractToCustomer] customer missing, contractId=${contract._id}`);
      return null;
    }

    const before: Record<string, any> = {
      name: customer.name,
      phone: customer.phone,
      idCardNumber: customer.idCardNumber,
      address: customer.address,
      contractStatus: customer.contractStatus,
      leadLevel: customer.leadLevel,
    };
    const changedFields: Record<string, any> = {};

    for (const [contractField, customerField] of Object.entries(CONTRACT_TO_CUSTOMER_FIELD_MAP)) {
      const contractValue = normalize((contract as any)[contractField]);
      const customerValue = normalize((customer as any)[customerField]);
      if (isBlank(contractValue)) continue;
      if (contractValue === customerValue) continue;
      changedFields[customerField] = contractValue;
      if (SENSITIVE_FIELDS.has(customerField) && !isBlank(customerValue) && contractValue !== customerValue) {
        this.logger.warn(`[syncContractToCustomer] SENSITIVE field change ${customerField}: ${customerValue} -> ${contractValue}`);
      }
    }
    if (customer.contractStatus !== SIGNED_CUSTOMER_CONTRACT_STATUS) {
      changedFields.contractStatus = SIGNED_CUSTOMER_CONTRACT_STATUS;
    }
    if (customer.leadLevel !== SIGNED_CUSTOMER_LEAD_LEVEL) {
      changedFields.leadLevel = SIGNED_CUSTOMER_LEAD_LEVEL;
    }

    if (Object.keys(changedFields).length === 0) {
      return { customerId: customer._id.toString(), changedFields: {} };
    }

    changedFields.updatedAt = new Date();
    changedFields.lastActivityAt = new Date();
    await this.customerModel.findByIdAndUpdate(customer._id, changedFields).exec();

    await this.writeCustomerLog(customer._id as Types.ObjectId, actorId, 'update', '合同签约自动更新', {
      before,
      after: { ...before, ...changedFields },
      description: '合同签约成功，自动同步客户实名信息、客户状态和线索等级',
      relatedId: contract._id.toString(),
      relatedType: 'contract',
    });

    this.logger.log(`[syncContractToCustomer] customer=${customer._id} 更新字段: ${Object.keys(changedFields).join(', ')}`);
    return { customerId: customer._id.toString(), changedFields };
  }

  private async syncContractToResume(
    contract: ContractDocument,
    actorId: string,
  ): Promise<{ resumeId: string; changedFields: Record<string, any> } | null> {
    if (!contract.workerId) return null;
    const resume = await this.resumeModel.findById(contract.workerId).exec();
    if (!resume) {
      this.logger.warn(`[syncContractToResume] resume missing, workerId=${contract.workerId}`);
      return null;
    }

    const before: Record<string, any> = {
      name: resume.name,
      phone: resume.phone,
      idNumber: resume.idNumber,
      orderStatus: resume.orderStatus,
    };
    const changedFields: Record<string, any> = {};

    for (const [contractField, resumeField] of Object.entries(CONTRACT_TO_RESUME_FIELD_MAP)) {
      const contractValue = normalize((contract as any)[contractField]);
      const resumeValue = normalize((resume as any)[resumeField]);
      if (isBlank(contractValue)) continue;
      if (contractValue === resumeValue) continue;
      changedFields[resumeField] = contractValue;
      if (SENSITIVE_FIELDS.has(resumeField) && !isBlank(resumeValue) && contractValue !== resumeValue) {
        this.logger.warn(`[syncContractToResume] SENSITIVE field change ${resumeField}: ${resumeValue} -> ${contractValue}`);
      }
    }
    if (resume.orderStatus !== OrderStatus.ON_SERVICE) {
      changedFields.orderStatus = OrderStatus.ON_SERVICE;
    }

    if (Object.keys(changedFields).length === 0) {
      return { resumeId: resume._id.toString(), changedFields: {} };
    }

    await this.resumeModel.findByIdAndUpdate(resume._id, changedFields).exec();
    await this.writeResumeLog(resume._id as Types.ObjectId, actorId, 'update', '合同签约自动更新', {
      before,
      after: { ...before, ...changedFields },
      description: '合同签约成功，自动同步阿姨实名信息与接单状态',
      relatedId: contract._id.toString(),
      relatedType: 'contract',
    });

    this.logger.log(`[syncContractToResume] resume=${resume._id} 更新字段: ${Object.keys(changedFields).join(', ')}`);
    return { resumeId: resume._id.toString(), changedFields };
  }

  private computeContractUpdatesFromProfile(
    map: Record<string, string>,
    before: Record<string, any>,
    after: Record<string, any>,
  ): Record<string, any> {
    const contractSet: Record<string, any> = {};
    for (const [profileField, contractField] of Object.entries(map)) {
      if (!(profileField in after)) continue;
      const beforeVal = normalize(before?.[profileField]);
      const afterVal = normalize(after[profileField]);
      if (beforeVal === afterVal) continue;
      if (isBlank(afterVal) && NEVER_OVERWRITE_WITH_EMPTY.has(contractField)) continue;
      contractSet[contractField] = afterVal ?? '';
      if (SENSITIVE_FIELDS.has(contractField) && !isBlank(beforeVal) && !isBlank(afterVal) && beforeVal !== afterVal) {
        this.logger.warn(`[profile-sync] SENSITIVE field change ${contractField}: ${beforeVal} -> ${afterVal}`);
      }
    }
    return contractSet;
  }

  private async writeCustomerLog(
    customerId: Types.ObjectId,
    operatorId: string,
    operationType: string,
    operationName: string,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);
      const operatorObjectId = isValidObjectId(operatorId) ? new Types.ObjectId(operatorId) : SYSTEM_OPERATOR_ID;
      await this.customerOpLogModel.create({
        customerId,
        operatorId: operatorObjectId,
        entityType: 'customer',
        entityId: customerId.toString(),
        operationType,
        operationName,
        details,
        operatedAt: new Date(),
        requestId: RequestContextStore.getValue('requestId'),
      });
    } catch (err) {
      this.logger.error('customer.log.write_failed', err as any);
    }
  }

  private async writeResumeLog(
    resumeId: Types.ObjectId,
    operatorId: string,
    operationType: string,
    operationName: string,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);
      const operatorObjectId = isValidObjectId(operatorId) ? new Types.ObjectId(operatorId) : SYSTEM_OPERATOR_ID;
      await this.resumeOpLogModel.create({
        resumeId,
        operatorId: operatorObjectId,
        entityType: 'resume',
        entityId: resumeId.toString(),
        operationType,
        operationName,
        details,
        operatedAt: new Date(),
        requestId: RequestContextStore.getValue('requestId'),
      });
    } catch (err) {
      this.logger.error('resume.log.write_failed', err as any);
    }
  }
}
