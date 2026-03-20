import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Contract, ContractDocument } from '../../contracts/models/contract.model';
import { Customer, CustomerDocument } from '../../customers/models/customer.model';
import { CustomersService } from '../../customers/customers.service';
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
    private readonly customersService: CustomersService,
    @Inject(forwardRef(() => NotificationGateway))
    private notificationGateway: NotificationGateway,
  ) {}

  /**
   * 验证回调签名（用于接收签署完成通知）
   */
  verifyCallback(signature: string, timestamp: string, body: string): boolean {
    try {
      if (!this.apiService.config.publicKey) {
        this.logger.error('esign.callback.verify_failed_no_public_key', undefined, {
          hint: '请配置 ESIGN_PUBLIC_KEY 环境变量',
        });
        return false;
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
        const profileSyncResult = await this.customersService.syncCustomerSignedStateFromContract(contract);

        // 🆕 更新客户状态为"已签约"和线索等级为"O类"
        if (profileSyncResult?.customerId) {
          try {
            const customerId = profileSyncResult.customerId;
            this.logger.info('esign.callback.customer_sync_start', {
              contractId: contract._id.toString(),
              customerId,
            });

            const customerModel = this.contractModel.db.model('Customer');
              const customer = await customerModel.findById(customerId).exec();

              if (customer) {
                this.logger.info('esign.callback.customer_synced', {
                  customerId,
                  contractId: contract._id.toString(),
                  profileChangedFields: Object.keys(profileSyncResult.changedFields || {}),
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

}
