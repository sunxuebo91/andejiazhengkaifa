import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Contract, ContractDocument } from '../../contracts/models/contract.model';
import { Customer, CustomerDocument } from '../../customers/models/customer.model';
import { NotificationGateway } from '../../notification/notification.gateway';
import { AppLogger } from '../../../common/logging/app-logger';
import { RequestContextStore } from '../../../common/logging/request-context';
import { ESignApiService } from './esign-api.service';

@Injectable()
export class ESignCallbackService {
  private readonly logger = new AppLogger(ESignCallbackService.name);

  constructor(
    private readonly apiService: ESignApiService,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @Inject(forwardRef(() => NotificationGateway))
    private notificationGateway: NotificationGateway,
  ) {}

  /**
   * 验证回调签名（用于接收签署完成通知）
   */
  verifyCallback(signature: string, timestamp: string, body: string): boolean {
    try {
      if (!this.apiService.config.publicKey) {
        this.logger.warn('未配置公钥，无法验证回调签名');
        return true; // 在没有公钥的情况下，暂时允许通过
      }

      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(`${timestamp}${body}`);
      verify.end();
      
      return verify.verify(this.apiService.config.publicKey, signature, 'base64');
    } catch (error) {
      this.logger.error('验证回调签名失败:', error);
      return false;
    }
  }

  /**
   * 处理爱签合同状态回调
   * 当爱签合同状态变化时，爱签会调用这个方法
   */
  async handleContractCallback(callbackData: any): Promise<void> {
    try {
      this.logger.info('esign.callback.received', { callbackData });

      // 爱签回调数据格式可能包含：
      // - contractNo: 合同编号
      // - status: 合同状态 (0=等待签约, 1=签约中, 2=已签约, 3=过期, 4=拒签, 6=作废, 7=撤销)
      // - signTime: 签署时间
      // 具体格式需要根据爱签实际回调数据调整

      const { contractNo, status } = callbackData;

      if (!contractNo) {
        this.logger.error('esign.callback.missing_contract_no');
        return;
      }

      this.logger.info('esign.callback.contract_status_received', { contractNo, status });

      // 查找本地数据库中的合同
      const contract = await this.contractModel.findOne({
        esignContractNo: contractNo
      }).exec();

      if (!contract) {
        this.logger.error('esign.callback.contract_not_found', undefined, { contractNo });
        return;
      }

      this.logger.info('esign.callback.contract_found', {
        contractId: contract._id.toString(),
        contractNo,
        currentStatus: contract.contractStatus,
      });

      // 更新爱签状态
      const updateData: any = {
        esignStatus: status.toString()
      };

      // 如果爱签状态是"已签约"(2)，则更新本地合同状态为"active"
      if (status === 2 || status === '2') {
        updateData.contractStatus = 'active';
        updateData.esignSignedAt = new Date();
        this.logger.info('esign.callback.contract_signed', {
          contractId: contract._id.toString(),
          contractNo,
        });
      }

      // 更新合同
      await this.contractModel.findByIdAndUpdate(contract._id, updateData).exec();

      this.logger.info('esign.callback.contract_updated', {
        contractId: contract._id.toString(),
        contractNo,
        nextStatus: updateData.contractStatus || contract.contractStatus,
      });

      // 签约完成后，同步客户姓名为合同中的真实姓名（合同发起姓名）
      if (status === 2 || status === '2') {
        await this.syncCustomerNameBySignedContract(contract);

        // 🆕 更新客户状态为"已签约"和线索等级为"O类"
        if (contract.customerId) {
          try {
            const customerId = contract.customerId.toString();
            this.logger.info('esign.callback.customer_sync_start', {
              contractId: contract._id.toString(),
              customerId,
            });

            // 调用客户服务更新状态
            const customerModel = this.contractModel.db.model('Customer');
            const customer = await customerModel.findById(customerId).exec();

            if (customer) {
              const oldStatus = customer.contractStatus;
              const oldLeadLevel = customer.leadLevel;

              // 更新客户状态和线索等级
              await customerModel.findByIdAndUpdate(customerId, {
                contractStatus: '已签约',
                leadLevel: 'O类',
                lastActivityAt: new Date(),
              }).exec();

              this.logger.info('esign.callback.customer_synced', {
                customerId,
                contractId: contract._id.toString(),
                oldStatus,
                oldLeadLevel,
              });

              // 记录操作日志
              const operationLogModel = this.contractModel.db.model('CustomerOperationLog');
              await operationLogModel.create({
                customerId: customer._id,
                operatorId: contract.createdBy || customer._id,
                entityType: 'contract',
                entityId: contract._id.toString(),
                operationType: 'update',
                operationName: '合同签约自动更新', // 🔥 修复：必填字段
                details: {
                  before: { contractStatus: oldStatus, leadLevel: oldLeadLevel },
                  after: { contractStatus: '已签约', leadLevel: 'O类' },
                  description: '合同签约成功，自动更新客户状态为已签约，线索等级为O类',
                  relatedId: contract._id.toString(),
                  relatedType: 'contract',
                },
                operatedAt: new Date(),
                requestId: RequestContextStore.getValue('requestId'),
              });

              // 🔔 广播刷新事件，通知前端更新客户列表
              try {
                await this.notificationGateway.broadcastRefresh('customerList', {
                  customerId: customerId,
                  contractNumber: contract.contractNumber,
                  action: 'statusUpdate',
                });
                this.logger.info('esign.callback.customer_refresh_broadcasted', {
                  customerId,
                  contractNumber: contract.contractNumber,
                });
              } catch (error) {
                this.logger.error('esign.callback.customer_refresh_failed', error, {
                  customerId,
                  contractNumber: contract.contractNumber,
                });
              }
            }
          } catch (error) {
            this.logger.error('esign.callback.customer_sync_failed', error, {
              contractId: contract._id.toString(),
              customerId: contract.customerId?.toString(),
            });
            // 不抛出异常，避免影响合同流程
          }
        }
      }

      // 🔔 如果状态变为 active，触发保险同步
      // 注意：这里不能直接注入 ContractsService（会造成循环依赖）
      // 保险同步会在 ContractsService.update() 方法中自动触发
      // 所以我们需要通过 ContractsService.update() 来更新合同，而不是直接更新数据库

      // 重新实现：通过事件或者直接调用 ContractsService
      // 由于循环依赖问题，这里我们先更新数据库，然后在 ContractsController 中手动触发同步

    } catch (error) {
      this.logger.error('esign.callback.handle_failed', error);
      throw error;
    }
  }

  private async syncCustomerNameBySignedContract(contract: ContractDocument): Promise<void> {
    const realName = contract.customerName?.trim();
    if (!realName) {
      this.logger.warn('esign.callback.customer_name_sync_missing_name', {
        contractId: contract._id.toString(),
        contractNumber: contract.contractNumber,
      });
      return;
    }

    // 优先按 customerId 精准更新
    if (contract.customerId) {
      const customer = await this.customerModel.findById(contract.customerId).select('_id name phone').exec();
      if (customer) {
        if ((customer.name || '').trim() === realName) {
          this.logger.info('esign.callback.customer_name_sync_skipped_same_name', {
            customerId: customer._id.toString(),
            contractId: contract._id.toString(),
          });
          return;
        }

        await this.customerModel.findByIdAndUpdate(customer._id, {
          name: realName,
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        }).exec();

        this.logger.info('esign.callback.customer_name_synced_by_customer_id', {
          customerId: customer._id.toString(),
          contractId: contract._id.toString(),
        });
        return;
      }
    }

    // 兜底：按合同手机号更新（历史脏数据可能没有 customerId）
    if (contract.customerPhone) {
      const customer = await this.customerModel.findOne({ phone: contract.customerPhone }).select('_id name phone').exec();
      if (!customer) {
        this.logger.warn('esign.callback.customer_name_sync_customer_missing', {
          contractId: contract._id.toString(),
          contractNo: contract.contractNumber,
          customerPhone: contract.customerPhone,
        });
        return;
      }

      if ((customer.name || '').trim() === realName) {
        this.logger.info('esign.callback.customer_name_sync_skipped_same_name', {
          customerId: customer._id.toString(),
          contractId: contract._id.toString(),
        });
        return;
      }

      await this.customerModel.findByIdAndUpdate(customer._id, {
        name: realName,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      }).exec();

      this.logger.info('esign.callback.customer_name_synced_by_phone', {
        customerId: customer._id.toString(),
        contractId: contract._id.toString(),
      });
      return;
    }

    this.logger.warn('esign.callback.customer_name_sync_missing_customer_ref', {
      contractId: contract._id.toString(),
      contractNumber: contract.contractNumber,
    });
  }

}
