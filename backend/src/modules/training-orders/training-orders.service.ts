import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Contract,
  ContractDocument,
  ContractStatus,
  OrderCategory,
  PaymentStatus,
} from '../contracts/models/contract.model';
import {
  TrainingLead,
  TrainingLeadDocument,
} from '../training-leads/models/training-lead.model';
import { ContractsService } from '../contracts/contracts.service';
import { ESignService, isRealAisignSignUrl } from '../esign/esign.service';
import { CreateContractDto } from '../contracts/dto/create-contract.dto';

/**
 * 职培订单服务
 * - 数据层复用 Contract 集合，通过 orderCategory='training' 与家政合同隔离
 * - 所有查询强制注入 orderCategory 过滤，防止越界
 */
@Injectable()
export class TrainingOrdersService {
  private readonly logger = new Logger(TrainingOrdersService.name);

  constructor(
    @InjectModel(Contract.name) private readonly contractModel: Model<ContractDocument>,
    @InjectModel(TrainingLead.name) private readonly trainingLeadModel: Model<TrainingLeadDocument>,
    private readonly contractsService: ContractsService,
    private readonly esignService: ESignService,
  ) {}

  /** CRM 端：分页查询职培订单列表 */
  async findAll(
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<{ items: ContractDocument[]; total: number; page: number; limit: number; totalPages: number }> {
    const query: any = { orderCategory: OrderCategory.TRAINING };
    if (search) {
      query.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.contractModel
        .find(query)
        .populate('createdBy', 'name username')
        .populate('trainingLeadId', 'leadSource')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.contractModel.countDocuments(query).exec(),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** CRM 端：获取单条职培订单详情（含关联学员信息） */
  async findOneWithLead(id: string): Promise<any> {
    const contract = await this.fetchTrainingContract(id);
    const lead = contract.trainingLeadId
      ? await this.trainingLeadModel.findById(contract.trainingLeadId).lean().exec()
      : null;
    return { contract, lead };
  }

  /**
   * 褓贝小程序：按学员手机号聚合返回学员 + 全部职培合同
   *
   * C 端展示白名单（前端在用）：
   *   - lead.name / lead.phone
   *   - contracts[].{contractNumber, contractStatus, intendedCourses(显示为"已报课程"),
   *     courseAmount, paymentAmount, paymentStatus, paidAt, createdAt,
   *     paymentEnabled, esignStarted, esignCompleted, contractFileUrl}
   *
   * 内部字段（C 端已隐藏，接口保留仅供 CRM/其他端使用，切勿在新页面直接展示）：
   *   - lead.status                         跟进状态（如"7天未跟进"），CRM 内部口径
   *   - amount.{courseAmount, serviceFeeAmount, budget}   内部核算口径（整块已下线）
   *   - contracts[].serviceFeeAmount        内部分摊口径
   *   - contracts[].consultPosition         销售内部记录
   *   - courseInfo.*                        "报课信息"卡片整块已从 C 端移除
   */
  async getBaobeiDetailByPhone(phone: string): Promise<{
    lead: TrainingLead | null;
    courseInfo: any | null;
    amount: any | null;
    contracts: any[];
  }> {
    const lead = await this.trainingLeadModel.findOne({ phone }).lean().exec();
    const contracts = await this.contractModel
      .find({ customerPhone: phone, orderCategory: OrderCategory.TRAINING })
      .select('-templateParams -esignSignUrls -workerIdCard -customerIdCard')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const courseInfo = lead
      ? {
          consultPosition: lead.consultPosition,
          intendedCourses: lead.intendedCourses || [],
          reportedCertificates: lead.reportedCertificates || [],
          isOnlineCourse: lead.isOnlineCourse,
          // 统一格式化为 YYYY-MM-DD，避免各端各自 new Date 造成时区偏移
          expectedStartDate: this.formatDateYMD(lead.expectedStartDate),
        }
      : null;

    const amount = lead
      ? {
          // 原字段（元，保留兼容管理后台/其他端）
          courseAmount: lead.courseAmount,
          serviceFeeAmount: lead.serviceFeeAmount,
          budget: lead.budget,
          // 显式带单位后缀的别名（元），推荐新接入方使用
          courseAmountYuan: lead.courseAmount ?? null,
          serviceFeeAmountYuan: lead.serviceFeeAmount ?? null,
          budgetYuan: lead.budget ?? null,
        }
      : null;

    const shaped: any[] = contracts.map((c: any) => this.shapeBaobeiContract(c));

    // 实时并发补齐 signerStatuses：失败/超时走 buildTrainingSignerStatuses 内部降级，
    // 外层 allSettled 再兜一层，保证列表主体接口不被爱签抖动拖垮。
    const signerStatusesList = await Promise.allSettled(
      contracts.map((c: any) => this.buildTrainingSignerStatuses(c)),
    );
    signerStatusesList.forEach((res, i) => {
      const s = res.status === 'fulfilled' ? res.value : null;
      shaped[i].signerStatuses = s;
      // 爱签实时显示学员未签时，强制把展示态退回 signing 并同步 esignCompleted=false，
      // 覆盖 DB esignStatus 被历史回调污染为 '2' 的场景，确保小程序"去签约"按钮不被误收起。
      if (s && s.studentSigned === false) {
        shaped[i].contractStatus = ContractStatus.SIGNING;
        shaped[i].esignCompleted = false;
      }
    });

    return {
      lead,
      courseInfo,
      amount,
      contracts: shaped,
    };
  }

  /**
   * CRM 端：标记职培订单已毕业（证书申报）
   * - 幂等：若已处于终态（graduated/refunded）则直接返回当前合同，不重复写入
   * - 成功后同时同步到小程序可见的 contractStatus
   */
  async markGraduated(id: string): Promise<ContractDocument> {
    const contract = await this.fetchTrainingContract(id);
    if (contract.contractStatus === ContractStatus.GRADUATED) {
      return contract;
    }
    if (contract.contractStatus === ContractStatus.REFUNDED) {
      throw new BadRequestException('该订单已退款，不能再标记为已毕业');
    }
    const updated = await this.contractModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            contractStatus: ContractStatus.GRADUATED,
            graduatedAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('订单不存在');
    this.logger.log(`[职培订单] 已标记毕业 id=${id} contractNumber=${updated.contractNumber}`);
    return updated;
  }

  /**
   * CRM 端：标记职培订单已退款，并从报课金额中扣减退款金额
   * - 幂等：若已处于 refunded 终态则直接返回，不重复扣减
   * - refundAmount 允许超过 courseAmount，超出部分扣减后 courseAmount 截断为 0
   */
  async markRefunded(id: string, refundAmount: number): Promise<ContractDocument> {
    const contract = await this.fetchTrainingContract(id);
    if (contract.contractStatus === ContractStatus.REFUNDED) {
      return contract;
    }
    const currentCourseAmount = Number(contract.courseAmount) || 0;
    const nextCourseAmount = Math.max(0, Math.round((currentCourseAmount - refundAmount) * 100) / 100);
    const updated = await this.contractModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            contractStatus: ContractStatus.REFUNDED,
            refundedAt: new Date(),
            courseAmount: nextCourseAmount,
            paymentStatus: PaymentStatus.REFUNDED,
            updatedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('订单不存在');
    this.logger.log(
      `[职培订单] 已标记退款 id=${id} contractNumber=${updated.contractNumber} refundAmount=${refundAmount} courseAmount:${currentCourseAmount}→${nextCourseAmount}`,
    );
    return updated;
  }

  /** 褓贝小程序：获取职培合同签约链接（强制校验 orderCategory） */
  async getSigningUrlForBaobei(id: string, phone: string) {
    await this.fetchTrainingContractByIdAndPhone(id, phone);
    return this.contractsService.getCustomerSigningUrl(id, phone);
  }

  /** 褓贝小程序：支付确认（强制校验 orderCategory） */
  async confirmPaymentForBaobei(
    id: string,
    phone: string,
    amount: number,
    sqbSn: string,
    paidAt: Date,
  ) {
    await this.fetchTrainingContractByIdAndPhone(id, phone);
    return this.contractsService.confirmPayment(id, phone, amount, sqbSn, paidAt);
  }

  /**
   * 褓贝小程序：查询职培合同状态（轻量接口）
   * - 仅返回状态相关字段，不含任何敏感/大体积字段
   * - 强制校验 orderCategory=training 与 customerPhone 归属
   * - C 端仅展示四种状态：signing / active / graduated / refunded；draft 等过渡/异常状态统一归并为 signing
   */
  async getContractStatusForBaobei(id: string, phone: string): Promise<{
    id: string;
    contractStatus: string;
    esignStatus: string | null;
    esignCompleted: boolean;
    paymentStatus: string;
    paymentEnabled: boolean;
    signerStatuses: {
      companySigned: boolean;
      studentSigned: boolean;
      companySignedAt: string | null;
      studentSignedAt: string | null;
    } | null;
  }> {
    const contract = await this.fetchTrainingContractByIdAndPhone(id, phone);
    const signerStatuses = await this.buildTrainingSignerStatuses(contract);

    // 同 getBaobeiDetailByPhone：爱签实时显示学员未签时，以爱签为准把展示态退回 signing，
    // 防止 DB esignStatus 被污染导致小程序误判"已签约"。
    let contractStatus = this.normalizeTrainingContractStatus(
      contract.contractStatus,
      contract.esignStatus,
      contract.paymentStatus,
    );
    let esignCompleted = contract.esignStatus === '2';
    if (signerStatuses && signerStatuses.studentSigned === false) {
      contractStatus = ContractStatus.SIGNING;
      esignCompleted = false;
    }

    return {
      id: String(contract._id),
      contractStatus,
      esignStatus: contract.esignStatus || null,
      esignCompleted,
      paymentStatus: contract.paymentStatus || PaymentStatus.UNPAID,
      paymentEnabled: !!contract.paymentEnabled,
      signerStatuses,
    };
  }



  // ── 小程序端（/api/training-orders/miniprogram）──────────────────────────

  /**
   * 小程序：分页查询职培订单列表
   * - 强制 orderCategory=training
   * - 非全局角色（admin/manager/operator 之外）只看自己创建的
   */
  async findForMiniProgram(
    page: number,
    limit: number,
    search: string | undefined,
    createdByFilter: string | undefined,
  ): Promise<{ items: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const query: any = { orderCategory: OrderCategory.TRAINING };
    if (search) {
      query.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }
    if (createdByFilter) {
      query.createdBy = new Types.ObjectId(createdByFilter);
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.contractModel
        .find(query)
        .populate('createdBy', 'name username')
        .populate('trainingLeadId', 'leadSource studentId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.contractModel.countDocuments(query).exec(),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** 小程序：按手机号预查学员线索，返回 null 表示新学员（允许放行，后端 create 会直接使用 dto 里的学员信息） */
  async findStudentByPhone(phone: string): Promise<TrainingLead | null> {
    if (!phone) throw new BadRequestException('phone 参数不能为空');
    return this.trainingLeadModel.findOne({ phone }).lean().exec();
  }

  /**
   * 小程序：准备 create 入参
   * - 强制 orderCategory=training
   * - 若数据库有匹配手机号的学员线索，自动填入 trainingLeadId、intendedCourses、consultPosition、serviceFeeAmount、courseAmount（仅在 dto 未提供时兜底）
   */
  async prepareCreateDtoForMiniProgram(dto: CreateContractDto): Promise<CreateContractDto> {
    const prepared: any = { ...dto, orderCategory: OrderCategory.TRAINING };
    if (!prepared.trainingLeadId && prepared.customerPhone) {
      const lead = await this.trainingLeadModel.findOne({ phone: prepared.customerPhone }).lean().exec();
      if (lead) {
        prepared.trainingLeadId = String(lead._id);
        if (prepared.intendedCourses == null) prepared.intendedCourses = lead.intendedCourses || [];
        if (prepared.consultPosition == null) prepared.consultPosition = lead.consultPosition || undefined;
        if (prepared.courseAmount == null && lead.courseAmount != null) prepared.courseAmount = lead.courseAmount;
        if (prepared.serviceFeeAmount == null && lead.serviceFeeAmount != null) prepared.serviceFeeAmount = lead.serviceFeeAmount;
      }
    }
    return prepared as CreateContractDto;
  }

  /**
   * 小程序：发起职培订单签署
   * - 强制校验 orderCategory=training
   * - 签署方：甲方=北京安得家政有限公司（企业自动签章）+ 乙方=学员（有感知签章）
   * - 复用 ESignService.createCompleteContractFlow（内部完成 addStranger → createContract → addSigners → 取短链接）
   * - 成功后回写 esignContractNo / esignSignUrls / esignCreatedAt / contractStatus='signing'
   */
  async initiateSigningForMiniProgram(id: string, userId: string): Promise<any> {
    const contract = await this.fetchTrainingContract(id);
    if (contract.esignContractNo && contract.esignSignUrls) {
      // 幂等：仅当已存链接为合法 http(s) 短链时才直接返回；
      // 历史脏数据（拼接的 hxcx.asign.cn/sign/{contractNo}?account=... 假链接）将被视为"未初始化"，重新发起签署
      let cachedSignUrls: any[] = [];
      try {
        const parsed = JSON.parse(contract.esignSignUrls);
        if (Array.isArray(parsed)) cachedSignUrls = parsed;
      } catch {
        cachedSignUrls = [];
      }
      const cachedValid = cachedSignUrls.some((u: any) => u && isRealAisignSignUrl(u.signUrl));
      if (cachedValid) {
        return {
          contractId: String(contract._id),
          contractNumber: contract.contractNumber,
          esignContractNo: contract.esignContractNo,
          contractStatus: contract.contractStatus,
          signUrls: cachedSignUrls,
          alreadyInitiated: true,
        };
      }
      // 历史脏数据修复：爱签合同已创建但库里存的是无效链接，直接从爱签侧抓真实短链回写，
      // 不再走 createCompleteContractFlow（避免对同一 contractNo 重复 addStranger/createContract）
      this.logger.warn(
        `[职培订单-小程序] 幂等命中但缓存的 signUrls 无合法短链，尝试从爱签侧重新抓取 id=${id} esignContractNo=${contract.esignContractNo}`,
      );
      try {
        const refetch = await this.esignService.getContractSignUrls(contract.esignContractNo, 'training');
        const refetched: any[] = refetch?.success && Array.isArray(refetch.data?.signUrls) ? refetch.data.signUrls : [];
        const refetchedValid = refetched.some((u: any) => u && isRealAisignSignUrl(u.signUrl));
        if (refetchedValid) {
          await this.contractsService.update(
            String(contract._id),
            { esignSignUrls: JSON.stringify(refetched) } as any,
            userId,
          );
          return {
            contractId: String(contract._id),
            contractNumber: contract.contractNumber,
            esignContractNo: contract.esignContractNo,
            contractStatus: contract.contractStatus,
            signUrls: refetched,
            alreadyInitiated: true,
          };
        }
      } catch (e: any) {
        this.logger.error(`[职培订单-小程序] 历史脏数据修复时 getContractSignUrls 失败: ${e?.message || e}`);
      }
      throw new BadRequestException('该订单已向爱签发起过签署但签署链接不可用，请联系管理员撤销后重试');
    }

    const validation = this.contractsService.validateEsignFields(contract as any);
    if (!validation.valid) {
      throw new BadRequestException(`数据验证失败：${validation.message}`);
    }

    const templateParams = this.contractsService.extractTemplateParamsPublic(contract as any);
    const templateNo = (contract as any).templateNo || contract.esignTemplateNo;
    if (!templateNo) {
      throw new BadRequestException('订单缺少爱签模板编号(templateNo/esignTemplateNo)');
    }

    this.logger.log(`[职培订单-小程序] 发起签署 id=${id} contractNumber=${contract.contractNumber}`);

    const esignResult = await this.esignService.createCompleteContractFlow({
      contractNo: contract.contractNumber,
      contractName: '安得家政职业培训咨询协议',
      templateNo,
      templateParams,
      signers: [
        {
          name: '北京安得家政有限公司',
          mobile: '400-000-0000',
          idCard: '91110111MACJMD2R5J',
          signType: 'auto',
          validateType: 'sms',
        },
        {
          name: contract.customerName,
          mobile: contract.customerPhone,
          idCard: contract.customerIdCard,
          signType: 'manual',
          validateType: 'sms',
        },
      ],
      validityTime: 30,
      signOrder: 2,
    });

    if (!esignResult.success) {
      throw new BadRequestException(`爱签发起签署失败：${esignResult.message || '未知错误'}`);
    }

    // createCompleteContractFlow 内部已做 5 次重试取真实短链；若仍为空，再调 getContractSignUrls 兜底一次
    // （与家政小程序路径对齐：contracts-miniprogram.controller.ts 也是这种两段式）
    let signUrls: any[] = Array.isArray(esignResult.signUrls) ? esignResult.signUrls : [];
    const hasValidSignUrl = (list: any[]) => list.some((u: any) => u && isRealAisignSignUrl(u.signUrl));

    if (!hasValidSignUrl(signUrls)) {
      this.logger.warn(
        `[职培订单-小程序] createCompleteContractFlow 未返回有效 signUrls，尝试 getContractSignUrls 兜底 contractNo=${esignResult.contractNo}`,
      );
      try {
        const fallback = await this.esignService.getContractSignUrls(esignResult.contractNo, 'training');
        if (fallback?.success && Array.isArray(fallback.data?.signUrls)) {
          signUrls = fallback.data.signUrls;
        }
      } catch (e: any) {
        this.logger.error(`[职培订单-小程序] getContractSignUrls 兜底失败: ${e?.message || e}`);
      }
    }

    if (!hasValidSignUrl(signUrls)) {
      // 仍未拿到真实短链——不把无效链接写库误导小程序，直接抛错让前端稍后重试发起签署（该接口已有幂等保护）
      throw new BadRequestException('爱签签署链接生成超时，请稍后重试');
    }

    await this.contractsService.update(
      String(contract._id),
      {
        esignContractNo: esignResult.contractNo,
        esignSignUrls: JSON.stringify(signUrls),
        esignCreatedAt: new Date(),
        contractStatus: 'signing',
      } as any,
      userId,
    );

    return {
      contractId: String(contract._id),
      contractNumber: contract.contractNumber,
      esignContractNo: esignResult.contractNo,
      contractStatus: 'signing',
      signUrls,
      alreadyInitiated: false,
    };
  }

  // ── 内部辅助 ──────────────────────────────────────────────────────────────

  /**
   * 职培订单：实时查询爱签，构建 companySigned / studentSigned 明细。
   *
   * 设计要点：
   *   - 数据源只取爱签实时接口，不读 DB esignStatus（历史上存在企业方回调早于
   *     initiate-signing 写库、导致 DB 被整体置为 '2' 的污染案例）；
   *   - 企业方：userType === 1（爱签企业自动签账号 ASIGN…）；
   *   - 学员方：userType !== 1，按 mobile/account=customerPhone 或 signOrder=2 定位；
   *   - 爱签抖动失败时按 DB esignStatus 粗略兜底，避免前端拿到 500 级错误。
   */
  private async buildTrainingSignerStatuses(contract: any): Promise<{
    companySigned: boolean;
    studentSigned: boolean;
    companySignedAt: string | null;
    studentSignedAt: string | null;
  } | null> {
    if (!contract?.esignContractNo) return null;

    const toIso = (t: any): string | null => {
      if (!t) return null;
      return typeof t === 'number' ? new Date(t).toISOString() : String(t);
    };

    try {
      const result = await this.esignService.getContractInfo(contract.esignContractNo);
      const signUsers: any[] = result?.data?.signUser || [];

      const company = signUsers.find(u => u.userType === 1);
      const student = signUsers.find(u =>
        u.userType !== 1 && (
          String(u.mobile || '') === contract.customerPhone ||
          String(u.account || '') === contract.customerPhone ||
          u.signOrder === 2
        ),
      );

      return {
        companySigned: company?.signStatus === 2,
        studentSigned: student?.signStatus === 2,
        companySignedAt: company?.signStatus === 2 ? toIso(company.signTime) : null,
        studentSignedAt: student?.signStatus === 2 ? toIso(student.signTime) : null,
      };
    } catch (err: any) {
      this.logger.warn(
        `[buildTrainingSignerStatuses] 爱签查询失败，降级按 DB 推断: contractNo=${contract.esignContractNo} err=${err?.message || err}`,
      );
      const allSigned = contract.esignStatus === '2';
      return {
        companySigned: allSigned,
        studentSigned: allSigned,
        companySignedAt: null,
        studentSignedAt: null,
      };
    }
  }

  private async fetchTrainingContract(id: string): Promise<ContractDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('订单不存在');
    const contract = await this.contractModel.findById(id).lean().exec();
    if (!contract) throw new NotFoundException('订单不存在');
    if (contract.orderCategory !== OrderCategory.TRAINING) {
      throw new NotFoundException('订单不存在');
    }
    return contract as ContractDocument;
  }

  private async fetchTrainingContractByIdAndPhone(id: string, phone: string): Promise<ContractDocument> {
    if (!phone) throw new BadRequestException('phone 参数不能为空');
    const contract = await this.fetchTrainingContract(id);
    if (contract.customerPhone !== phone) throw new ForbiddenException('无权访问该订单');
    return contract;
  }

  private shapeBaobeiContract(c: any) {
    // 应付金额业务口径：= courseAmount（报课金额），与 CRM 职培订单列表"报课金额"列一致；
    // serviceFeeAmount（服务费金额）是 CRM 内部核算字段，不参与 C 端应付展示。
    // 注：MiniprogramNotificationService.notifyPaymentDone 订阅消息模板文案为"服务费 ¥X 支付成功"，
    // 该文案是家政合同历史遗留（家政侧客户付的即服务费），职培场景下文案语义不匹配，
    // 属于订阅消息侧的独立清理项，不影响本接口应付口径。
    const payableYuan = c.courseAmount ?? null;
    const payableCents = payableYuan != null ? this.yuanToCents(payableYuan) : null;
    const paymentCents = c.paymentAmount ?? null;
    const paymentYuan = paymentCents != null ? this.centsToYuan(paymentCents) : null;

    return {
      id: String(c._id),
      contractNumber: c.contractNumber,
      // C 端仅四种状态：signing / active / graduated / refunded
      contractStatus: this.normalizeTrainingContractStatus(c.contractStatus, c.esignStatus, c.paymentStatus),
      contractFileUrl: c.contractFileUrl || null,
      createdAt: c.createdAt,
      esignStarted: !!c.esignContractNo,
      esignCompleted: c.esignStatus === '2',
      paymentEnabled: !!c.paymentEnabled,
      paymentStatus: c.paymentStatus || PaymentStatus.UNPAID,
      // 实付金额（原字段，分；保留兼容）+ 显式后缀别名
      paymentAmount: paymentCents,
      paymentAmountCents: paymentCents,
      paymentAmountYuan: paymentYuan,
      paidAt: c.paidAt || null,
      sqbSn: c.sqbSn || null,
      // 职培终态时间戳（未到达终态时为 null）
      graduatedAt: c.graduatedAt || null,
      graduatedAtFmt: this.formatDateYMD(c.graduatedAt),
      refundedAt: c.refundedAt || null,
      refundedAtFmt: this.formatDateYMD(c.refundedAt),
      // 应付金额（业务口径 = 报课金额），C 端小程序直接读 payableAmountYuan 展示
      payableAmountYuan: payableYuan,
      payableAmountCents: payableCents,
      // 原字段（元，保留兼容）+ 显式后缀别名
      courseAmount: c.courseAmount ?? null,
      courseAmountYuan: c.courseAmount ?? null,
      // 内部字段：合同服务费分摊口径，C 端不展示；serviceFeeAmountYuan 同值仅做单位标注
      serviceFeeAmount: c.serviceFeeAmount ?? null,
      serviceFeeAmountYuan: c.serviceFeeAmount ?? null,
      intendedCourses: c.intendedCourses || [],
      // 内部字段：销售咨询岗位记录，C 端不展示
      consultPosition: c.consultPosition || null,
    };
  }

  /**
   * C 端职培合同状态归一化：仅对外暴露 signing / signed / active / graduated / refunded 五种。
   * 判定优先级（DB contractStatus 陈旧时以爱签 + 支付为准，避免与 CRM 实时状态错位）：
   *   1) contractStatus 为终态 graduated / refunded（CRM 人工标记）→ 直接返回终态
   *   2) esignStatus !== '2'（爱签双方未全部签完）→ 一律 signing
   *   3) esignStatus === '2' 且 paymentStatus === paid → active（学员已付款，学习中）
   *   4) esignStatus === '2' 且 paymentStatus !== paid → signed（已签约，等待付款）
   */
  private normalizeTrainingContractStatus(
    status: string | null | undefined,
    esignStatus: string | null | undefined,
    paymentStatus: string | null | undefined,
  ): string {
    if (status === ContractStatus.GRADUATED || status === ContractStatus.REFUNDED) {
      return status;
    }
    if (esignStatus !== '2') {
      return ContractStatus.SIGNING;
    }
    if (paymentStatus === PaymentStatus.PAID) {
      return ContractStatus.ACTIVE;
    }
    return ContractStatus.SIGNED;
  }

  /** 将 Date / ISO 字符串格式化为 YYYY-MM-DD（UTC 基准，与存库口径一致） */
  private formatDateYMD(v: Date | string | null | undefined): string | null {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  /** 分 → 元（保留 2 位小数，规避浮点精度） */
  private centsToYuan(cents: number): number {
    return Math.round(cents) / 100;
  }

  /** 元 → 分（四舍五入到整数） */
  private yuanToCents(yuan: number): number {
    return Math.round(yuan * 100);
  }
}
