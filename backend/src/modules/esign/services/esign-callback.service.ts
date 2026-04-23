import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Contract, ContractDocument, OnboardStatus } from '../../contracts/models/contract.model';
import { Customer, CustomerDocument } from '../../customers/models/customer.model';
import { CustomersService } from '../../customers/customers.service';
import { NotificationGateway } from '../../notification/notification.gateway';
import { AppLogger } from '../../../common/logging/app-logger';
import { RequestContextStore } from '../../../common/logging/request-context';
import { ESignApiService } from './esign-api.service';
import { OrderCategory } from '../../contracts/models/contract.model';
import { MiniProgramNotificationService } from '../../miniprogram-notification/miniprogram-notification.service';

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
    private readonly mpNotificationService: MiniProgramNotificationService,
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
   * 带兜底与短暂重试的合同查询。
   * 场景：爱签回调偶发早于 initiate-signing 写入 esignContractNo（实测相差 2~5s），
   *       按 esignContractNo 查不到时，先尝试用 contractNumber 兜底，再短暂等待重试一次。
   */
  private async findContractForCallbackWithRetry(
    contractNo: string,
  ): Promise<ContractDocument | null> {
    const query = {
      $or: [
        { esignContractNo: contractNo },
        { contractNumber: contractNo },
      ],
    } as any;

    let contract = await this.contractModel.findOne(query).exec();
    if (contract) return contract;

    // 首次未命中，等待 800ms 再试一次（覆盖写库延迟）
    await new Promise(r => setTimeout(r, 800));
    contract = await this.contractModel.findOne(query).exec();
    return contract;
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

      // 查找本地数据库中的合同：
      // - 优先按 esignContractNo 匹配；
      // - 兜底按 contractNumber 匹配（应对「回调早于 initiate-signing 写入 esignContractNo」的竞态）；
      // - 首次未命中时等待 800ms 再重试一次，覆盖写库延迟。
      const contract = await this.findContractForCallbackWithRetry(contractNo);

      if (!contract) {
        this.logger.error('esign.callback.contract_not_found', undefined, { contractNo });
        return;
      }

      // 若是通过 contractNumber 兜底命中、esignContractNo 仍为空，顺手回填，
      // 避免后续查询再次走 fallback。
      if (!contract.esignContractNo) {
        try {
          await this.contractModel.findByIdAndUpdate(contract._id, {
            $set: { esignContractNo: contractNo },
          }).exec();
          (contract as any).esignContractNo = contractNo;
          this.logger.info('esign.callback.backfill_esign_contract_no', {
            contractId: contract._id.toString(),
            contractNo,
          });
        } catch (err) {
          this.logger.warn('esign.callback.backfill_esign_contract_no_failed', {
            contractId: contract._id.toString(),
            contractNo,
            error: (err as Error)?.message,
          });
        }
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

      // 判定是否整单全签完成：
      // 爱签 userNotifyUrl 回调（带 account/signMark）语义为「某个签署方签完了」，
      // 其 status=2 只表示该方已签，并非整单完成。例如企业"无感知自动签章"会在
      // 合同创建后立刻触发一次 account=ASIGN...、status=2 的回调，此时学员/客户
      // 尚未签署。若据此将 contractStatus 设为 active，会：
      //   1) 与实际签署进度不符（列表提前显示"已签约"）；
      //   2) 覆盖正在进行中的 initiate-signing（draft→signing）状态机过渡，
      //      触发 "合同状态不能从 active 变更为 signing" 报错。
      // 因此：per-signer 回调需主动查询所有签署方状态确认；contract-level
      // 回调（无 account/signMark）才直接信任 status=2。
      const isPerSignerEvent = !!(callbackData.account || callbackData.signMark);
      let allSignersCompleted = false;
      if (status === 2 || status === '2') {
        if (!isPerSignerEvent) {
          allSignersCompleted = true;
        } else {
          try {
            // 直接调爱签 /contract/getContract 拿全部签署方 signStatus，
            // 避免通过 ESignService 造成 ESignService↔ESignCallbackService 循环依赖。
            const info = await this.apiService.callESignAPI('/contract/getContract', {
              contractNo,
            });
            const signUsers: Array<{ signStatus?: number }> =
              info?.data?.signUser || info?.data?.signUsers || [];
            allSignersCompleted =
              signUsers.length > 0 && signUsers.every(u => u.signStatus === 2);
            if (!allSignersCompleted) {
              this.logger.info('esign.callback.partial_sign_completed', {
                contractNo,
                signerAccount: callbackData.account,
                signedCount: signUsers.filter(u => u.signStatus === 2).length,
                totalCount: signUsers.length,
              });
            }
          } catch (err) {
            this.logger.warn('esign.callback.verify_all_signers_failed', {
              contractNo,
              error: (err as Error)?.message,
            });
            // 校验失败时保守处理：不推进 contractStatus，仅记录 esignStatus
          }
        }
      }

      if (allSignersCompleted) {
        updateData.contractStatus = 'active';
        updateData.esignSignedAt = new Date();
        // 职培订单没有上户流程，不动 onboardStatus；家政订单仅在未确认上户时推进为 pending
        if (
          (contract as any).orderCategory !== OrderCategory.TRAINING &&
          (contract as any).onboardStatus !== OnboardStatus.CONFIRMED
        ) {
          updateData.onboardStatus = OnboardStatus.PENDING;
        }
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

      // 签约完成后：推送小程序通知 + 同步客户姓名（仅在整单完成时触发）
      if (allSignersCompleted) {
        // 📬 触发小程序通知：合同签署完成
        if (contract.customerPhone) {
          this.mpNotificationService.notifyContractSigned(
            contract.customerPhone,
            contract._id.toString(),
            contract.contractNumber || contractNo,
          ).catch(err => this.logger.error('esign.callback.mp_notification_failed', err));
        }
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
