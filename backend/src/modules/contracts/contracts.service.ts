import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contract, ContractDocument } from './models/contract.model';
import { CustomerContractHistory, CustomerContractHistoryDocument } from './models/customer-contract-history.model';
import { CustomerOperationLog } from '../customers/models/customer-operation-log.model';
import { Customer, CustomerDocument } from '../customers/models/customer.model';
import { Resume, IResume } from '../resume/models/resume.entity';
import { User } from '../users/models/user.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ResumeService } from '../resume/resume.service';
import { AvailabilityStatus } from '../resume/models/availability-period.schema';
import { DashubaoService } from '../dashubao/dashubao.service';
import { InsurancePolicy, InsurancePolicyDocument } from '../dashubao/models/insurance-policy.model';
import { ESignService } from '../esign/esign.service';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(CustomerContractHistory.name) private customerContractHistoryModel: Model<CustomerContractHistoryDocument>,
    @InjectModel(CustomerOperationLog.name) private operationLogModel: Model<CustomerOperationLog>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Resume.name) private resumeModel: Model<IResume>,
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => ResumeService)) private resumeService: ResumeService,
    private dashubaoService: DashubaoService,
    private esignService: ESignService,
  ) {}

  /**
   * 记录客户操作日志（合同相关）
   */
  private async logCustomerOperation(
    customerId: string | Types.ObjectId,
    operatorId: string,
    operationType: string,
    operationName: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      if (!customerId || customerId === 'temp') return;
      await this.operationLogModel.create({
        customerId: new Types.ObjectId(customerId.toString()),
        operatorId: new Types.ObjectId(operatorId),
        operationType,
        operationName,
        details,
        operatedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`记录操作日志失败: ${error.message}`);
    }
  }

  // 生成合同编号
  private generateContractNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CON${timestamp.slice(-8)}${random}`;
  }

  /**
   * 数字金额转中文大写
   */
  private convertToChineseAmount(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (Number.isNaN(num)) return '零元整';

    const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const unit = ['', '拾', '佰', '仟'];
    const section = ['', '万', '亿'];

    if (num === 0) return '零元整';

    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let result = '';
    if (integerPart === 0) {
      result = '零';
    } else {
      const str = integerPart.toString();
      const len = str.length;
      for (let i = 0; i < len; i++) {
        const n = parseInt(str[i], 10);
        const pos = len - i - 1;
        const u = pos % 4;
        const s = Math.floor(pos / 4);

        if (n !== 0) {
          result += digit[n] + unit[u];
          if (u === 0 && s > 0) result += section[s];
        } else {
          if (result && !result.endsWith('零')) result += '零';
        }
      }
      result = result.replace(/零+/g, '零').replace(/零$/, '');
    }

    result += '元';

    if (decimalPart === 0) {
      result += '整';
    } else {
      const jiao = Math.floor(decimalPart / 10);
      const fen = decimalPart % 10;
      if (jiao > 0) result += digit[jiao] + '角';
      if (fen > 0) result += digit[fen] + '分';
    }

    return result;
  }

  /**
   * 验证爱签必填字段并返回详细的错误信息
   * @returns { valid: boolean, missingFields: string[], message: string }
   */
  public validateEsignFields(contractDto: CreateContractDto): {
    valid: boolean;
    missingFields: string[];
    message: string;
  } {
    const missingFields: string[] = [];

    // 检查模板编号（支持 templateNo 或 esignTemplateNo）
    if (!contractDto.templateNo && !(contractDto as any).esignTemplateNo) {
      missingFields.push('模板编号(templateNo 或 esignTemplateNo)');
    }

    // 检查客户信息
    if (!contractDto.customerName) {
      missingFields.push('客户姓名(customerName)');
    }
    if (!contractDto.customerPhone) {
      missingFields.push('客户手机号(customerPhone)');
    }
    if (!contractDto.customerIdCard) {
      missingFields.push('客户身份证号(customerIdCard)');
    }

    // 检查服务人员信息
    if (!contractDto.workerName) {
      missingFields.push('服务人员姓名(workerName)');
    }
    if (!contractDto.workerPhone) {
      missingFields.push('服务人员手机号(workerPhone)');
    }
    if (!contractDto.workerIdCard) {
      missingFields.push('服务人员身份证号(workerIdCard)');
    }

    const valid = missingFields.length === 0;
    const message = valid
      ? '所有必填字段已填写'
      : `缺少以下必填字段：${missingFields.join('、')}`;

    return { valid, missingFields, message };
  }

  /**
   * 判断是否应该启动爱签流程
   * 只有当合同包含必要的签署人信息时才启动
   */
  private shouldInitiateEsignFlow(contractDto: CreateContractDto): boolean {
    const validation = this.validateEsignFields(contractDto);
    return validation.valid;
  }

  /**
   * 从小程序提交的平铺数据中提取爱签模板参数（公开方法）
   * 小程序提交的数据格式：{ "客户姓名": "张三", "customerName": "张三", ... }
   * 需要提取中文字段名（爱签模板的 dataKey）
   */
  public extractTemplateParamsPublic(contractDto: any): Record<string, any> {
    return this.extractTemplateParams(contractDto);
  }

  /**
   * 从小程序提交的平铺数据中提取爱签模板参数（私有方法）
   * 小程序提交的数据格式：{ "客户姓名": "张三", "customerName": "张三", ... }
   * 需要提取中文字段名（爱签模板的 dataKey）
   */
  private extractTemplateParams(contractDto: CreateContractDto | any): Record<string, any> {
    console.log('🔍 [extractTemplateParams] 开始提取模板参数');
    console.log('🔍 [extractTemplateParams] 输入数据类型:', typeof contractDto);
    console.log('🔍 [extractTemplateParams] 输入数据字段数量:', Object.keys(contractDto || {}).length);

    // 如果已经有 templateParams 对象，直接使用
    if (contractDto.templateParams && Object.keys(contractDto.templateParams).length > 0) {
      console.log('🔍 [extractTemplateParams] 已有 templateParams，直接使用，字段数量:', Object.keys(contractDto.templateParams).length);
      return contractDto.templateParams;
    }

    // 否则，从平铺的数据中提取中文字段名
    const templateParams: Record<string, any> = {};

    // 定义需要排除的英文字段名（这些是CRM内部使用的字段，不是爱签模板字段）
    const excludeFields = [
      'templateNo', 'customerName', 'customerPhone', 'customerIdCard',
      'workerName', 'workerPhone', 'workerIdCard', 'customerId', 'workerId',
      'createdBy', 'contractType', 'startDate', 'endDate', 'remarks',
      'customerServiceAddress', 'serviceAddress', 'workerAddress',
      'workerNativePlace', 'workerGender', 'workerAge', 'workerSalary',
      'workerSalaryUpper', 'customerServiceFee', 'customerServiceFeeUpper',
      'serviceTime', 'restType', 'templateParams'
    ];

    // 打印所有字段名，用于调试
    const allKeys = Object.keys(contractDto || {});
    console.log('🔍 [extractTemplateParams] 所有字段名:', allKeys.join(', '));

    // 遍历所有字段，提取中文字段名
    for (const [key, value] of Object.entries(contractDto)) {
      // 跳过排除的字段
      if (excludeFields.includes(key)) {
        continue;
      }

      // 跳过空值
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // 跳过以 _ 结尾的字段（如 "首次匹配费_index"）
      if (key.endsWith('_index')) {
        continue;
      }

      // 检查是否包含中文字符
      const hasChinese = /[\u4e00-\u9fa5]/.test(key);
      if (hasChinese) {
        templateParams[key] = value;
        console.log(`🔍 [extractTemplateParams] 提取中文字段: ${key}`);
      }
    }

    console.log('🔍 [extractTemplateParams] 提取完成，中文字段数量:', Object.keys(templateParams).length);
    return templateParams;
  }

  // 创建合同
  async create(
    createContractDto: CreateContractDto,
    userId?: string,
    options?: { autoInitiateEsign?: boolean }  // 🆕 新增选项：是否自动触发爱签流程
  ): Promise<Contract> {
    try {
      console.log('创建合同服务被调用，数据:', createContractDto);
      
      // 🆕 检查是否需要进入换人模式
      if (createContractDto.customerPhone) {
        const existingContractCheck = await this.checkCustomerExistingContract(createContractDto.customerPhone);
        
        // 如果客户有现有合同，自动进入换人合并模式
        if (existingContractCheck.hasContract) {
          console.log('🔄 检测到客户已有合同，进入自动换人合并模式:', {
            customerPhone: createContractDto.customerPhone,
            existingContract: existingContractCheck.contract?.contractNumber,
            contractCount: existingContractCheck.contractCount
          });
          
          // 自动执行换人合并逻辑
          return await this.createChangeWorkerContract(
            createContractDto,
            (existingContractCheck.contract as any)._id.toString(),
            userId || 'system'
          );
        }
      }
      
      // 如果是从爱签同步过来的合同，处理临时字段
      if (createContractDto.customerId === 'temp' || createContractDto.workerId === 'temp' || createContractDto.createdBy === 'temp') {
        console.log('检测到来自爱签的合同数据，开始处理临时字段...');
        
        // 处理客户ID - 尝试找到现有客户或创建新客户
        let finalCustomerId = createContractDto.customerId;
        if (createContractDto.customerId === 'temp') {
          // TODO: 这里应该集成客户服务，暂时使用固定值
          finalCustomerId = new Types.ObjectId().toString();
          console.log('为爱签合同生成临时客户ID:', finalCustomerId);
        }
        
        // 处理员工ID - 尝试找到现有员工或创建新员工记录
        let finalWorkerId = createContractDto.workerId;
        if (createContractDto.workerId === 'temp') {
          // TODO: 这里应该集成员工/简历服务，暂时使用固定值
          finalWorkerId = new Types.ObjectId().toString();
          console.log('为爱签合同生成临时员工ID:', finalWorkerId);
        }
        
        // 处理创建人ID（只有当 userId 是有效的 ObjectId 格式时才使用）
        const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);
        let finalCreatedBy = createContractDto.createdBy;
        if (createContractDto.createdBy === 'temp' || !createContractDto.createdBy) {
          // 使用传入的userId（如果是有效ObjectId）或生成临时ID
          finalCreatedBy = (userId && isValidObjectId(userId)) ? userId : new Types.ObjectId().toString();
          console.log('为合同设置创建人ID:', finalCreatedBy);
        }

        // 更新字段
        createContractDto.customerId = finalCustomerId;
        createContractDto.workerId = finalWorkerId;
        createContractDto.createdBy = finalCreatedBy;
      } else {
        // 正常创建合同时，确保设置创建人ID（只有当 userId 是有效的 ObjectId 格式时才设置）
        const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);
        if (userId && isValidObjectId(userId) && !createContractDto.createdBy) {
          createContractDto.createdBy = userId;
        }
      }
      
      // 生成合同编号（如果没有提供）
      if (!createContractDto.contractNumber) {
        createContractDto.contractNumber = await this.generateContractNumber();
      }

      // 🆕 自动从简历获取 workerAddress（如果未提供）
      if (!createContractDto.workerAddress && createContractDto.workerPhone) {
        try {
          const resume = await this.resumeService.findByPhone(createContractDto.workerPhone);
          if (resume && resume.currentAddress) {
            createContractDto.workerAddress = resume.currentAddress;
            console.log('📍 从简历自动获取联系地址:', createContractDto.workerAddress);
          }
        } catch (error) {
          console.warn('⚠️ 从简历获取联系地址失败:', error.message);
        }
      }

      // 🆕 将 templateNo 映射到 esignTemplateNo（因为 Schema 中只有 esignTemplateNo）
      if ((createContractDto as any).templateNo && !createContractDto.esignTemplateNo) {
        createContractDto.esignTemplateNo = (createContractDto as any).templateNo;
        console.log('📋 将 templateNo 映射到 esignTemplateNo:', createContractDto.esignTemplateNo);
      }

      // 🆕 提取中文字段并保存到 templateParams（用于后续发起爱签签署）
      if (!createContractDto.templateParams || Object.keys(createContractDto.templateParams).length === 0) {
        const extractedTemplateParams = this.extractTemplateParams(createContractDto);
        if (Object.keys(extractedTemplateParams).length > 0) {
          createContractDto.templateParams = extractedTemplateParams;
          console.log('📋 提取并保存模板参数，字段数量:', Object.keys(extractedTemplateParams).length);
          console.log('📋 模板参数:', JSON.stringify(extractedTemplateParams, null, 2));
        }
      }

      console.log('处理后的合同数据:', createContractDto);

      const contract = new this.contractModel(createContractDto);
      const savedContract = await contract.save();

      console.log('合同保存成功，ID:', savedContract._id);

      // 📝 记录客户操作日志 - 发起合同
      if (createContractDto.customerId && createContractDto.customerId !== 'temp' && userId) {
        await this.logCustomerOperation(
          createContractDto.customerId,
          userId,
          'create_contract',
          '发起合同',
          {
            description: `发起合同：${savedContract.contractNumber}，阿姨：${createContractDto.workerName || '未填写'}`,
            relatedId: savedContract._id.toString(),
            relatedType: 'contract',
            after: {
              contractNumber: savedContract.contractNumber,
              workerName: createContractDto.workerName,
              contractType: createContractDto.contractType,
              contractAmount: createContractDto.contractAmount,
            }
          }
        );
      }

      // 🗓️ 自动更新月嫂档期
      if (createContractDto.workerId && createContractDto.workerId !== 'temp') {
        try {
          // 检查档期是否可用
          const isAvailable = await this.resumeService.checkAvailability(
            createContractDto.workerId,
            new Date(createContractDto.startDate),
            new Date(createContractDto.endDate)
          );

          if (!isAvailable) {
            this.logger.warn(`月嫂档期冲突: workerId=${createContractDto.workerId}, 合同=${savedContract.contractNumber}`);
            // 不阻止合同创建，只记录警告
          }

          // 更新档期为"订单占用"状态
          await this.resumeService.updateAvailability(
            createContractDto.workerId,
            {
              startDate: new Date(createContractDto.startDate).toISOString().split('T')[0],
              endDate: new Date(createContractDto.endDate).toISOString().split('T')[0],
              status: AvailabilityStatus.OCCUPIED,
              contractId: savedContract._id.toString(),
              remarks: `合同编号: ${savedContract.contractNumber}`
            }
          );

          this.logger.log(`档期更新成功: workerId=${createContractDto.workerId}, 合同=${savedContract.contractNumber}`);
        } catch (error) {
          this.logger.error(`更新档期失败: ${error.message}`, error.stack);
          // 不阻止合同创建，只记录错误
        }
      }

      // 🆕 调用爱签API创建电子合同（仅当有必要字段且明确要求时）
      const shouldAutoInitiate = options?.autoInitiateEsign !== false; // 默认为 true（向后兼容）

      if (shouldAutoInitiate && this.shouldInitiateEsignFlow(createContractDto)) {
        try {
          this.logger.log(`🚀 开始为合同 ${savedContract.contractNumber} 创建爱签电子合同...`);

          // 🔥 提取模板参数：从小程序提交的平铺数据中提取爱签模板字段
          const templateParams = this.extractTemplateParams(createContractDto);

          this.logger.log(`📋 提取的模板参数:`, JSON.stringify(templateParams, null, 2));

          const esignResult = await this.esignService.createCompleteContractFlow({
            contractNo: savedContract.contractNumber,
            contractName: `${createContractDto.contractType || '服务'}合同`,
            templateNo: createContractDto.templateNo || 'default_template',
            templateParams: templateParams,
            signers: [
              {
                name: createContractDto.customerName,
                mobile: createContractDto.customerPhone,
                idCard: createContractDto.customerIdCard,
                signType: 'auto',
                validateType: 'sms'
              },
              {
                name: createContractDto.workerName,
                mobile: createContractDto.workerPhone,
                idCard: createContractDto.workerIdCard,
                signType: 'auto',
                validateType: 'sms'
              }
            ],
            validityTime: 30,
            signOrder: 1
          });

          if (esignResult.success) {
            // 更新合同的爱签信息
            const updatedContract = await this.contractModel.findByIdAndUpdate(
              savedContract._id,
              {
                esignContractNo: esignResult.contractNo,
                esignSignUrls: JSON.stringify(esignResult.signUrls || []),
                esignCreatedAt: new Date(),
                contractStatus: 'signing',
                updatedAt: new Date()
              },
              { new: true } // 返回更新后的文档
            );

            this.logger.log(`✅ 爱签电子合同创建成功: ${esignResult.contractNo}`);

            // 返回更新后的合同对象，包含签署链接
            return updatedContract || savedContract;
          } else {
            this.logger.warn(`⚠️ 爱签电子合同创建失败: ${esignResult.message}`);
          }
        } catch (esignError) {
          this.logger.error(`❌ 爱签流程失败: ${esignError.message}`, esignError.stack);
          // 不阻止合同创建，只记录错误
        }
      } else {
        this.logger.log(`ℹ️ 合同 ${savedContract.contractNumber} 缺少必要字段，跳过爱签流程`);
      }

      return savedContract;
    } catch (error) {
      console.error('创建合同失败:', error);
      throw new BadRequestException(`创建合同失败: ${error.message}`);
    }
  }

  // 获取合同列表
  async findAll(page: number = 1, limit: number = 10, search?: string, showAll: boolean = false): Promise<{
    contracts: Contract[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};

      // 默认只显示最新合同，除非明确要求显示所有合同
      if (!showAll) {
        query.$or = [
          { isLatest: true }, // 显示标记为最新的合同
          {
            isLatest: { $exists: false }, // 兼容旧数据：没有 isLatest 字段
            contractStatus: { $ne: 'replaced' } // 且状态不是已替换
          }
        ];
      }

      if (search) {
        const searchConditions = [
          { contractNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { customerPhone: { $regex: search, $options: 'i' } },
          { workerName: { $regex: search, $options: 'i' } },
          { workerPhone: { $regex: search, $options: 'i' } },
          { workerIdCard: { $regex: search, $options: 'i' } }, // 支持按阿姨身份证搜索
        ];

        if (query.$or) {
          // 如果已经有$or条件，需要合并
          query.$and = [
            { $or: query.$or },
            { $or: searchConditions }
          ];
          delete query.$or;
        } else {
          query.$or = searchConditions;
        }
      }

      // 验证 ObjectId 格式的辅助函数
      const isValidObjectId = (id: any): boolean => {
        if (!id) return false;
        const idStr = id.toString();
        return /^[a-fA-F0-9]{24}$/.test(idStr);
      };

      // 先获取合同数据（不populate），然后手动处理populate以避免无效引用导致的错误
      const [rawContracts, total] = await Promise.all([
        this.contractModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec(),
        this.contractModel.countDocuments(query).exec(),
      ]);

      // 安全地获取需要populate的有效ID
      const validCustomerIds = rawContracts
        .filter(c => c.customerId && isValidObjectId(c.customerId))
        .map(c => c.customerId);
      const validWorkerIds = rawContracts
        .filter(c => c.workerId && isValidObjectId(c.workerId))
        .map(c => c.workerId);
      const validCreatedByIds = rawContracts
        .filter(c => c.createdBy && isValidObjectId(c.createdBy))
        .map(c => c.createdBy);

      // 批量查询关联数据
      const [customers, workers, users] = await Promise.all([
        validCustomerIds.length > 0
          ? this.customerModel.find({ _id: { $in: validCustomerIds } }).select('name phone').lean().exec()
          : [],
        validWorkerIds.length > 0
          ? this.resumeModel.find({ _id: { $in: validWorkerIds } }).select('name phone').lean().exec()
          : [],
        validCreatedByIds.length > 0
          ? this.userModel.find({ _id: { $in: validCreatedByIds } }).select('name username').lean().exec()
          : [],
      ]);

      // 创建查找映射
      const customerMap = new Map<string, any>(customers.map(c => [c._id.toString(), c] as [string, any]));
      const workerMap = new Map<string, any>(workers.map(w => [w._id.toString(), w] as [string, any]));
      const userMap = new Map<string, any>(users.map(u => [u._id.toString(), u] as [string, any]));

      // 手动填充关联数据
      const contracts = rawContracts.map(contract => {
        const result: any = { ...contract };

        // 安全地填充 customerId
        if (contract.customerId && isValidObjectId(contract.customerId)) {
          const customer = customerMap.get(contract.customerId.toString());
          result.customerId = customer || null;
        } else {
          result.customerId = null;
        }

        // 安全地填充 workerId
        if (contract.workerId && isValidObjectId(contract.workerId)) {
          const worker = workerMap.get(contract.workerId.toString());
          result.workerId = worker || null;
        } else {
          result.workerId = null;
        }

        // 安全地填充 createdBy
        if (contract.createdBy && isValidObjectId(contract.createdBy)) {
          const user = userMap.get(contract.createdBy.toString());
          result.createdBy = user || null;
        } else {
          result.createdBy = null;
        }

        return result;
      });

      return {
        contracts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`获取合同列表失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  // 根据ID获取合同详情
  async findOne(id: string): Promise<any> {
    console.log('🚨🚨🚨 [CONTRACTS SERVICE] 开始查询合同详情, ID:', id);
    console.log('🚨🚨🚨 [CONTRACTS SERVICE] 当前时间:', new Date().toISOString());

    // ✅ 验证 ObjectId 格式的辅助函数
    const isValidObjectId = (val: any): boolean => {
      if (!val) return false;
      if (typeof val === 'string') {
        return /^[a-fA-F0-9]{24}$/.test(val);
      }
      // 如果是 ObjectId 对象
      if (val._bsontype === 'ObjectId' || val.toString) {
        return /^[a-fA-F0-9]{24}$/.test(val.toString());
      }
      return false;
    };

    // 先查询合同基本信息（不 populate createdBy 和 lastUpdatedBy）
    let query = this.contractModel
      .findById(id)
      .populate('customerId', 'name phone customerId address')
      .populate('workerId', 'name phone idCardNumber hukouAddress');

    // 先获取原始数据检查 createdBy 和 lastUpdatedBy 的值
    const rawContract = await this.contractModel.findById(id).lean().exec();

    if (rawContract) {
      // 只有当 createdBy 是有效的 ObjectId 时才 populate
      if (isValidObjectId(rawContract.createdBy)) {
        query = query.populate('createdBy', 'name username');
      } else if (rawContract.createdBy) {
        console.warn('⚠️ [CONTRACTS SERVICE] createdBy 不是有效的 ObjectId:', rawContract.createdBy);
      }

      // 只有当 lastUpdatedBy 是有效的 ObjectId 时才 populate
      if (isValidObjectId(rawContract.lastUpdatedBy)) {
        query = query.populate('lastUpdatedBy', 'name username');
      } else if (rawContract.lastUpdatedBy) {
        console.warn('⚠️ [CONTRACTS SERVICE] lastUpdatedBy 不是有效的 ObjectId:', rawContract.lastUpdatedBy);
      }
    }

    const contract = await query.exec();

    if (!contract) {
      console.log('🚨🚨🚨 [CONTRACTS SERVICE] 合同不存在, ID:', id);
      throw new NotFoundException('合同不存在');
    }

    console.log('🚨🚨🚨 [CONTRACTS SERVICE] 合同详情查询结果:');
    console.log('🚨🚨🚨   - 合同ID:', contract._id);
    console.log('🚨🚨🚨   - 合同编号:', contract.contractNumber);
    console.log('🚨🚨🚨   - 创建人:', contract.createdBy);
    console.log('🚨🚨🚨   - 最后更新人:', contract.lastUpdatedBy);
    console.log('🚨🚨🚨   - lastUpdatedBy类型:', typeof contract.lastUpdatedBy);
    console.log('🚨🚨🚨   - 原始合同数据的lastUpdatedBy字段:', contract.toObject().lastUpdatedBy);

    // 查询劳动者的保险信息（根据身份证号）
    let insuranceInfo = null;
    if (contract.workerIdCard) {
      try {
        console.log('🔍 [CONTRACTS SERVICE] 查询劳动者保险信息, 身份证号:', contract.workerIdCard);
        const policies = await this.dashubaoService.getPoliciesByIdCard(contract.workerIdCard);

        if (policies && policies.length > 0) {
          // 只返回有效的保险信息（未过期、未注销、未退保）
          const activePolicies = policies.filter(p =>
            p.status === 'active' || p.status === 'processing' || p.status === 'pending'
          );

          // 🔍 调试：检查原始保单数据
          console.log('🔍 [CONTRACTS SERVICE] 原始保单数据 insuredList:', activePolicies.map(p => ({
            policyNo: p.policyNo,
            insuredList: p.insuredList,
            hasInsuredList: !!p.insuredList,
            insuredListLength: p.insuredList?.length
          })));

          insuranceInfo = {
            hasInsurance: activePolicies.length > 0,
            policies: activePolicies.map(p => ({
              policyNo: p.policyNo,
              agencyPolicyRef: p.agencyPolicyRef,
              planCode: p.planCode,
              effectiveDate: p.effectiveDate,
              expireDate: p.expireDate,
              totalPremium: p.totalPremium,
              status: p.status,
              policyPdfUrl: p.policyPdfUrl,
              // 🆕 添加被保险人信息
              insuredList: p.insuredList || [],
              insuredName: p.insuredList?.[0]?.insuredName || contract.workerName || '',
            })),
            totalPolicies: activePolicies.length,
          };
          console.log('✅ [CONTRACTS SERVICE] 找到保险信息:', JSON.stringify(insuranceInfo, null, 2));
        } else {
          insuranceInfo = {
            hasInsurance: false,
            policies: [],
            totalPolicies: 0,
          };
          console.log('ℹ️ [CONTRACTS SERVICE] 未找到保险信息');
        }
      } catch (error) {
        console.error('❌ [CONTRACTS SERVICE] 查询保险信息失败:', error);
        insuranceInfo = {
          hasInsurance: false,
          policies: [],
          totalPolicies: 0,
          error: error.message,
        };
      }
    }

    // 将合同对象转换为普通对象并添加保险信息
    const contractObj: any = contract.toObject();
    contractObj.insuranceInfo = insuranceInfo;

    // 🔥 如果 workerId populate 失败（返回 null），保留原始的 ObjectId
    // 这样前端至少知道有 workerId，只是关联的记录不存在
    if (!contractObj.workerId && rawContract.workerId) {
      console.warn('⚠️ [CONTRACTS SERVICE] workerId populate 失败，保留原始 ObjectId');
      contractObj.workerId = rawContract.workerId;
    }

    // 🔥 确保 templateParams 字段存在（即使为空对象）
    if (!contractObj.templateParams) {
      contractObj.templateParams = {};
    }

    return contractObj;
  }

  // 根据合同编号获取合同
  async findByContractNumber(contractNumber: string): Promise<Contract> {
    const contract = await this.contractModel
      .findOne({ contractNumber })
      .populate('customerId', 'name phone customerId address')
      .populate('workerId', 'name phone idCardNumber hukouAddress')
      .populate('createdBy', 'name username')
      .exec();

    if (!contract) {
      throw new NotFoundException('合同不存在');
    }

    return contract;
  }

  // 根据客户ID获取合同列表
  async findByCustomerId(customerId: string): Promise<Contract[]> {
    return await this.contractModel
      .find({ customerId })
      .populate('workerId', 'name phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  // 根据服务人员ID获取合同列表
  async findByWorkerId(workerId: string): Promise<Contract[]> {
    return await this.contractModel
      .find({ workerId })
      .populate('customerId', 'name phone customerId')
      .sort({ createdAt: -1 })
      .exec();
  }

  // 更新合同
  async update(id: string, updateContractDto: UpdateContractDto, userId?: string): Promise<Contract> {
    // 先获取原合同状态
    const originalContract = await this.contractModel.findById(id).exec();
    if (!originalContract) {
      throw new NotFoundException('合同不存在');
    }

    const updateData: any = { ...updateContractDto };

    // 处理日期字段
    if (updateContractDto.startDate) {
      updateData.startDate = new Date(updateContractDto.startDate);
    }
    if (updateContractDto.endDate) {
      updateData.endDate = new Date(updateContractDto.endDate);
    }
    if (updateContractDto.expectedDeliveryDate) {
      updateData.expectedDeliveryDate = new Date(updateContractDto.expectedDeliveryDate);
    }

    // 设置最后更新人（只有当 userId 是有效的 ObjectId 格式时才设置）
    const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);
    if (userId && isValidObjectId(userId)) {
      updateData.lastUpdatedBy = userId;
    }

    // 先执行更新
    const updatedContract = await this.contractModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .lean()
      .exec();

    if (!updatedContract) {
      throw new NotFoundException('合同不存在');
    }

    // 构建 populate 查询，只 populate 有效的 ObjectId 字段
    let query = this.contractModel
      .findById(id)
      .populate('customerId', 'name phone customerId address')
      .populate('workerId', 'name phone idCardNumber hukouAddress');

    // 只有当 createdBy 是有效的 ObjectId 时才 populate
    if (isValidObjectId(updatedContract.createdBy?.toString())) {
      query = query.populate('createdBy', 'name username');
    }

    // 只有当 lastUpdatedBy 是有效的 ObjectId 时才 populate
    if (isValidObjectId(updatedContract.lastUpdatedBy?.toString())) {
      query = query.populate('lastUpdatedBy', 'name username');
    }

    const contract = await query.exec();

    if (!contract) {
      throw new NotFoundException('合同不存在');
    }

    // 🆕 检查合同状态是否变为 active，如果是则触发保险同步
    const statusChanged = originalContract.contractStatus !== contract.contractStatus;
    const isNowActive = contract.contractStatus === 'active';

    if (statusChanged && isNowActive) {
      this.logger.log(`🔔 合同状态变为 active，触发保险同步检查: ${contract._id}`);
      // 异步触发保险同步，不阻塞合同更新
      this.syncInsuranceOnContractActive(contract._id.toString()).catch(error => {
        this.logger.error(`保险同步失败（异步）:`, error);
      });
    }

    return contract;
  }

  // 删除合同
  async remove(id: string): Promise<void> {
    // 先查询要删除的合同
    const contractToDelete = await this.contractModel.findById(id).exec();
    if (!contractToDelete) {
      throw new NotFoundException('合同不存在');
    }

    this.logger.log(`🗑️ 准备删除合同: ${contractToDelete.contractNumber}`);

    // 🔧 收集整个换人链条中的所有合同ID
    const contractIdsToDelete: string[] = [id];

    // 向前追溯：找到所有被替换的旧合同（递归）
    await this.collectReplacedContracts(contractToDelete.replacesContractId, contractIdsToDelete);

    // 向后追溯：找到所有替换它的新合同（递归）
    await this.collectReplacingContracts(contractToDelete.replacedByContractId, contractIdsToDelete);

    this.logger.log(`📋 将要删除的合同链条共 ${contractIdsToDelete.length} 个合同`);

    // 批量删除所有关联合同
    const deleteResult = await this.contractModel.deleteMany({
      _id: { $in: contractIdsToDelete }
    }).exec();

    this.logger.log(`✅ 已删除 ${deleteResult.deletedCount} 个合同（包含换人历史记录）`);
  }

  /**
   * 递归收集所有被替换的旧合同（向前追溯）
   */
  private async collectReplacedContracts(contractId: any, collected: string[]): Promise<void> {
    if (!contractId) return;

    const contractIdStr = contractId.toString();
    if (collected.includes(contractIdStr)) return; // 防止循环

    try {
      const contract = await this.contractModel.findById(contractId).exec();
      if (contract) {
        collected.push(contractIdStr);
        this.logger.log(`  ↩️ 找到被替换的旧合同: ${contract.contractNumber}`);
        // 继续向前追溯
        await this.collectReplacedContracts(contract.replacesContractId, collected);
      }
    } catch (error) {
      this.logger.warn(`⚠️ 查找旧合同失败: ${error.message}`);
    }
  }

  /**
   * 递归收集所有替换它的新合同（向后追溯）
   */
  private async collectReplacingContracts(contractId: any, collected: string[]): Promise<void> {
    if (!contractId) return;

    const contractIdStr = contractId.toString();
    if (collected.includes(contractIdStr)) return; // 防止循环

    try {
      const contract = await this.contractModel.findById(contractId).exec();
      if (contract) {
        collected.push(contractIdStr);
        this.logger.log(`  ↪️ 找到替换的新合同: ${contract.contractNumber}`);
        // 继续向后追溯
        await this.collectReplacingContracts(contract.replacedByContractId, collected);
      }
    } catch (error) {
      this.logger.warn(`⚠️ 查找新合同失败: ${error.message}`);
    }
  }

  // 获取统计信息（只统计有效合同）
  async getStatistics(): Promise<{
    total: number;
    byContractType: Record<string, number>;
    thisMonth: number;
    thisYear: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // 只统计有效合同的查询条件
    const validContractQuery = {
      $or: [
        { isLatest: true }, // 显示标记为最新的合同
        {
          isLatest: { $exists: false }, // 兼容旧数据：没有 isLatest 字段
          contractStatus: { $ne: 'replaced' } // 且状态不是已替换
        }
      ]
    };

    const [total, byContractType, thisMonth, thisYear] = await Promise.all([
      this.contractModel.countDocuments(validContractQuery).exec(),
      this.contractModel.aggregate([
        { $match: validContractQuery },
        { $group: { _id: '$contractType', count: { $sum: 1 } } }
      ]).exec(),
      this.contractModel.countDocuments({
        ...validContractQuery,
        createdAt: { $gte: startOfMonth }
      }).exec(),
      this.contractModel.countDocuments({
        ...validContractQuery,
        createdAt: { $gte: startOfYear }
      }).exec(),
    ]);

    return {
      total,
      byContractType: byContractType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      thisMonth,
      thisYear,
    };
  }

  // 获取客户合同历史
  async getCustomerContractHistory(customerPhone: string): Promise<any> {
    try {
      console.log('🔍 获取客户合同历史:', customerPhone);
      
      // 获取该客户的所有合同，按创建时间排序
      const allContracts = await this.contractModel
        .find({ customerPhone })
        .populate('customerId', 'name phone customerId')
        .populate('workerId', 'name phone')
        .populate('createdBy', 'name username')
        .sort({ createdAt: 1 }) // 按创建时间升序排列
        .exec();

      console.log(`📋 找到 ${allContracts.length} 个合同`);

      if (allContracts.length === 0) {
        return null;
      }

      // 构建换人历史记录
      const workerHistory = [];
      let totalServiceDays = 0;

      allContracts.forEach((contract, index) => {
        // 动态计算服务天数和实际结束日期
        const contractStartDate = contract.startDate || contract.createdAt;
        let actualEndDate: Date | null = null;
        let calculatedServiceDays: number | null = null;

        if (contract.replacedByContractId) {
          // 已被替换的合同：结束日期 = 下一任合同的开始日期或换人生效日期
          const nextContract = allContracts.find(c => c._id.toString() === contract.replacedByContractId.toString());
          if (nextContract) {
            actualEndDate = nextContract.changeDate || nextContract.startDate || nextContract.createdAt;
          } else {
            actualEndDate = contract.updatedAt || contract.endDate;
          }
        } else if (contract.isLatest) {
          // 当前正在服务的合同：结束日期 = 合同约定结束日期，服务天数算到今天
          actualEndDate = null; // 进行中，不设实际结束日期
        } else {
          // 其他情况（如已作废等）
          actualEndDate = contract.endDate;
        }

        // 计算实际服务天数
        if (contract.serviceDays) {
          calculatedServiceDays = contract.serviceDays;
        } else if (contractStartDate) {
          const start = new Date(contractStartDate).getTime();
          const end = actualEndDate ? new Date(actualEndDate).getTime() : Date.now();
          calculatedServiceDays = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        }

        if (calculatedServiceDays) {
          totalServiceDays += calculatedServiceDays;
        }

        const historyRecord = {
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
          被替换为: null,
          替换了: null
        };

        // 添加替换关系信息
        if (contract.replacedByContractId) {
          const replacedBy = allContracts.find(c => c._id.toString() === contract.replacedByContractId.toString());
          if (replacedBy) {
            historyRecord.被替换为 = {
              合同编号: replacedBy.contractNumber,
              服务人员: replacedBy.workerName
            };
          }
        }

        if (contract.replacesContractId) {
          const replaces = allContracts.find(c => c._id.toString() === contract.replacesContractId.toString());
          if (replaces) {
            historyRecord.替换了 = {
              合同编号: replaces.contractNumber,
              服务人员: replaces.workerName
            };
          }
        }

        workerHistory.push(historyRecord);
      });

      // 获取当前最新合同
      const currentContract = allContracts.find(c => c.isLatest === true) || allContracts[allContracts.length - 1];

      // 转换为前端期望的格式（使用 workerHistory 中已计算好的服务天数）
      const contracts = allContracts.map((contract, index) => {
        const historyItem = workerHistory[index];
        const contractStartDate = contract.startDate || contract.createdAt;

        // 已替换合同的实际结束日期 = 下一任合同的开始日期
        let actualEndDate: Date | null = null;
        if (contract.replacedByContractId) {
          const nextContract = allContracts.find(c => c._id.toString() === contract.replacedByContractId.toString());
          if (nextContract) {
            actualEndDate = nextContract.changeDate || nextContract.startDate || nextContract.createdAt;
          }
        }

        return {
          contractId: contract._id.toString(),
          order: index + 1,
          contractNumber: contract.contractNumber,
          workerName: contract.workerName,
          workerPhone: contract.workerPhone,
          workerSalary: contract.workerSalary,
          startDate: contractStartDate,
          endDate: contract.endDate, // 合同约定结束日期
          actualEndDate, // 实际结束日期（换人时的结束日期）
          serviceDays: historyItem?.服务天数 ?? null,
          status: contract.isLatest ? 'active' : 'replaced',
          terminationDate: contract.replacedByContractId ? (actualEndDate || contract.updatedAt) : null,
          terminationReason: contract.replacedByContractId ? '换人' : null,
          esignStatus: contract.esignStatus,
          createdAt: contract.createdAt,
          isLatest: contract.isLatest
        };
      });

      const result = {
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
          isLatest: currentContract.isLatest
        },
        contracts, // 前端期望的字段名
        workerHistory, // 保留原有的详细记录
        latestContractId: currentContract._id
      };

      console.log('✅ 合同历史构建完成:', {
        totalContracts: result.totalContracts,
        totalWorkers: result.totalWorkers,
        totalServiceDays: result.totalServiceDays
      });

      return result;
    } catch (error) {
      console.error('获取客户合同历史失败:', error);
      throw new BadRequestException(`获取客户合同历史失败: ${error.message}`);
    }
  }

  // 检查客户现有合同 - 用于换人模式判断
  async checkCustomerExistingContract(customerPhone: string): Promise<{
    hasContract: boolean;
    contract?: Contract;
    contractCount: number;
    isSignedContract: boolean;
  }> {
    try {
      console.log('🔍 开始检查客户现有合同, 手机号:', customerPhone);
      console.log('🔍 手机号类型:', typeof customerPhone);
      console.log('🔍 手机号长度:', customerPhone.length);
      console.log('🔍 手机号字符编码:', [...customerPhone].map(c => c.charCodeAt(0)));
      
      // 先测试查询所有合同
      const allContracts = await this.contractModel.find({}).limit(5).exec();
      console.log('📋 数据库中前5个合同的customerPhone字段:');
      allContracts.forEach((contract, index) => {
        console.log(`  ${index + 1}. ${contract.customerPhone} (类型: ${typeof contract.customerPhone}, 长度: ${contract.customerPhone?.length})`);
      });
      
      // 查找该客户的所有合同
      const queryCondition = { customerPhone };
      console.log('🔍 查询条件:', queryCondition);
      
      const contracts = await this.contractModel
        .find(queryCondition)
        .populate('customerId', 'name phone customerId')
        .populate('workerId', 'name phone')
        .populate('createdBy', 'name username')
        .sort({ createdAt: -1 })
        .exec();

      console.log('📋 查询结果:', {
        查询条件: { customerPhone },
        找到合同数量: contracts.length,
        合同列表: contracts.map(c => ({
          id: c._id,
          contractNumber: c.contractNumber,
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          esignStatus: c.esignStatus,
          contractStatus: c.contractStatus
        }))
      });

      if (contracts.length === 0) {
        console.log('❌ 没有找到该客户的合同');
        return {
          hasContract: false,
          contractCount: 0,
          isSignedContract: false
        };
      }

      // 查找最新的合同
      const latestContract = contracts[0];
      console.log('📄 最新合同:', {
        id: latestContract._id,
        contractNumber: latestContract.contractNumber,
        esignStatus: latestContract.esignStatus,
        contractStatus: latestContract.contractStatus
      });
      
      // 检查是否有已签约状态的合同
      // 爱签状态: '0'=待签约, '1'=已签约, '2'=已完成
      // 只检查最新合同的状态，避免历史合同影响新合同创建
      const latestSignedContract = contracts.find(contract => 
        contract.isLatest !== false && (
          contract.esignStatus === '1' || 
          contract.esignStatus === '2' ||
          contract.contractStatus === 'active'
        )
      );
      
      const hasSignedContract = !!latestSignedContract;

      console.log('🔍 检查已签约状态:', {
        合同状态检查: contracts.map(c => ({
          contractNumber: c.contractNumber,
          esignStatus: c.esignStatus,
          contractStatus: c.contractStatus,
          是否已签约: c.esignStatus === '1' || c.esignStatus === '2' || c.contractStatus === 'active'
        })),
        hasSignedContract
      });

      console.log('✅ 检查完成:', {
        hasContract: true,
        contractCount: contracts.length,
        isSignedContract: hasSignedContract
      });

      return {
        hasContract: true,
        contract: latestContract,
        contractCount: contracts.length,
        isSignedContract: hasSignedContract
      };
    } catch (error) {
      console.error('检查客户现有合同失败:', error);
      throw new BadRequestException(`检查客户现有合同失败: ${error.message}`);
    }
  }

  // 根据服务人员信息查询合同（用于保险投保页面自动填充）
  async searchByWorkerInfo(name?: string, idCard?: string, phone?: string): Promise<Contract[]> {
    try {
      console.log('🔍 根据服务人员信息查询合同:', { name, idCard, phone });

      // 构建查询条件 - 必须同时匹配所有提供的字段
      const query: any = {};

      if (name) {
        query.workerName = name;
      }

      if (idCard) {
        query.workerIdCard = idCard;
      }

      if (phone) {
        query.workerPhone = phone;
      }

      // 如果没有提供任何查询条件，返回空数组
      if (Object.keys(query).length === 0) {
        console.log('❌ 未提供任何查询条件');
        return [];
      }

      console.log('🔍 查询条件:', query);

      // 查询合同，只返回最新的合同
      const contracts = await this.contractModel
        .find(query)
        .populate('customerId', 'name phone customerId address')
        .populate('workerId', 'name phone idNumber hukouAddress')
        .sort({ createdAt: -1 })
        .limit(10) // 限制返回数量
        .exec();

      console.log('📋 查询结果:', {
        查询条件: query,
        找到合同数量: contracts.length,
        合同列表: contracts.map(c => ({
          id: c._id,
          contractNumber: c.contractNumber,
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          workerName: c.workerName,
          workerPhone: c.workerPhone,
          workerIdCard: c.workerIdCard,
        }))
      });

      return contracts;
    } catch (error) {
      console.error('根据服务人员信息查询合同失败:', error);
      throw new BadRequestException(`查询合同失败: ${error.message}`);
    }
  }

  // 创建换人合同（自动合并模式）
  async createChangeWorkerContract(
    createContractDto: CreateContractDto,
    originalContractId: string,
    userId: string
  ): Promise<Contract> {
    try {
      console.log('🔄 自动换人合并模式，原合同ID:', originalContractId);
      
      // 获取原合同信息
      const originalContract = await this.contractModel.findById(originalContractId).exec();
      if (!originalContract) {
        throw new NotFoundException('原合同不存在');
      }

      // 计算服务时间
      const currentDate = new Date();
      const originalStartDate = new Date(originalContract.startDate);
      const originalEndDate = new Date(originalContract.endDate);
      
      // 计算已服务天数
      const serviceDays = Math.floor(
        (currentDate.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log('⏰ 时间计算:', {
        originalStart: originalStartDate.toISOString().split('T')[0],
        originalEnd: originalEndDate.toISOString().split('T')[0],
        changeDate: currentDate.toISOString().split('T')[0],
        serviceDays
      });

      // 🆕 使用新的合同数据但保持客户信息一致
      const mergedContractData = {
        ...createContractDto,
        // 保持客户信息与原合同一致
        customerName: originalContract.customerName,
        customerPhone: originalContract.customerPhone,
        customerIdCard: originalContract.customerIdCard,
        customerId: originalContract.customerId || new Types.ObjectId(),

        // 处理新的服务人员信息（来自createContractDto）
        workerId: new Types.ObjectId(),

        // 设置创建人
        createdBy: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : new Types.ObjectId(),

        // 🔧 修正时间设置：换人合同开始时间为当日，结束时间继承原合同
        // 例如：原合同 2025-06-01 ~ 2026-05-31，换人后新合同为 2025-12-03（当日）~ 2026-05-31
        startDate: currentDate.toISOString(),  // 换人当日作为新合同开始时间
        endDate: originalEndDate.toISOString(),  // 结束时间保持原合同不变
        
        // 合并状态管理
        isLatest: true,
        contractStatus: createContractDto.contractStatus || 'draft',
        
        // 换人历史记录
        replacesContractId: originalContract._id,
        changeDate: currentDate
      };

      // 如果没有提供合同编号，使用爱签返回的编号或生成新的
      if (!mergedContractData.contractNumber) {
        mergedContractData.contractNumber = await this.generateContractNumber();
      }

      // 🆕 自动从简历获取 workerAddress（如果未提供）
      if (!mergedContractData.workerAddress && createContractDto.workerPhone) {
        try {
          const resume = await this.resumeService.findByPhone(createContractDto.workerPhone);
          if (resume && resume.currentAddress) {
            (mergedContractData as any).workerAddress = resume.currentAddress;
            console.log('📍 [换人合同] 从简历自动获取联系地址:', resume.currentAddress);
          }
        } catch (error) {
          console.warn('⚠️ [换人合同] 从简历获取联系地址失败:', error.message);
        }
      }

      // 🆕 将 templateNo 映射到 esignTemplateNo（与普通创建合同保持一致）
      if ((createContractDto as any).templateNo && !mergedContractData.esignTemplateNo) {
        (mergedContractData as any).esignTemplateNo = (createContractDto as any).templateNo;
        console.log('📋 [换人合同] 将 templateNo 映射到 esignTemplateNo:', (mergedContractData as any).esignTemplateNo);
      }

      // 🆕 提取中文字段并保存到 templateParams（用于后续发起爱签签署）
      // 🔥 修复：总是处理 templateParams，不管 mergedContractData 中是否已有（可能是空对象）
      {
        this.logger.log('🔍 [换人合同] 开始处理 templateParams');
        this.logger.log(`🔍 [换人合同] mergedContractData.templateParams 当前状态: ${JSON.stringify(mergedContractData.templateParams)}`);
        this.logger.log(`🔍 [换人合同] originalContract.templateParams 字段数: ${Object.keys(originalContract.templateParams || {}).length}`);

        // 步骤1：从原始合同继承 templateParams（如果存在）
        let baseTemplateParams: Record<string, any> = {};
        if (originalContract.templateParams && Object.keys(originalContract.templateParams).length > 0) {
          baseTemplateParams = { ...originalContract.templateParams };
          this.logger.log(`📋 [换人合同] 从原始合同继承 templateParams，字段数量: ${Object.keys(baseTemplateParams).length}`);
        } else {
          this.logger.warn('⚠️ [换人合同] 原始合同没有 templateParams');
        }

        // 步骤2：从 createContractDto 中提取新的中文字段（如果有）
        this.logger.log('🔍 [换人合同] 从 createContractDto 中提取中文字段');
        this.logger.log(`🔍 [换人合同] createContractDto 字段: ${Object.keys(createContractDto).join(', ')}`);

        const extractedTemplateParams = this.extractTemplateParams(createContractDto);
        if (Object.keys(extractedTemplateParams).length > 0) {
          this.logger.log(`📋 [换人合同] 从 createContractDto 提取到中文字段，数量: ${Object.keys(extractedTemplateParams).length}`);
          // 合并：新数据覆盖旧数据
          baseTemplateParams = { ...baseTemplateParams, ...extractedTemplateParams };
        } else {
          this.logger.warn('⚠️ [换人合同] createContractDto 中没有提取到中文字段');
        }

        // 步骤3：更新服务人员相关字段（换人后必须更新）
        // 更新阿姨信息
        if (createContractDto.workerName) baseTemplateParams['阿姨姓名'] = createContractDto.workerName;
        if (createContractDto.workerPhone) baseTemplateParams['阿姨电话'] = createContractDto.workerPhone;
        if (createContractDto.workerIdCard) baseTemplateParams['阿姨身份证'] = createContractDto.workerIdCard;
        if ((createContractDto as any).workerAddress) baseTemplateParams['联系地址'] = (createContractDto as any).workerAddress;

        // 更新工资信息（如果有变化）
        if (createContractDto.workerSalary) {
          baseTemplateParams['阿姨工资'] = createContractDto.workerSalary.toString();
          // 转换为大写
          const salaryUpper = this.convertToChineseAmount(createContractDto.workerSalary);
          baseTemplateParams['阿姨工资大写'] = salaryUpper;
        }

        // 更新客户服务费（如果有变化）
        if (createContractDto.customerServiceFee) {
          baseTemplateParams['服务费'] = createContractDto.customerServiceFee.toString();
          const feeUpper = this.convertToChineseAmount(createContractDto.customerServiceFee);
          baseTemplateParams['服务费大写'] = feeUpper;
        }

        // 🔥 关键修复：总是设置 templateParams，即使之前有空对象
        (mergedContractData as any).templateParams = baseTemplateParams;
        this.logger.log(`✅ [换人合同] 最终 templateParams 字段数量: ${Object.keys(baseTemplateParams).length}`);
        this.logger.log(`📋 [换人合同] 关键字段: ${JSON.stringify({
          阿姨姓名: baseTemplateParams['阿姨姓名'],
          阿姨工资: baseTemplateParams['阿姨工资'],
          服务时间: baseTemplateParams['服务时间'],
          休息方式: baseTemplateParams['休息方式'],
          首次匹配费: baseTemplateParams['首次匹配费']
        })}`);

        if (Object.keys(baseTemplateParams).length === 0) {
          this.logger.error('❌ [换人合同] 最终没有任何 templateParams 数据！这将导致爱签签署失败！');
        }
      }

      console.log('🔄 合并后的合同数据:', {
        contractNumber: mergedContractData.contractNumber,
        customerName: mergedContractData.customerName,
        workerName: mergedContractData.workerName,
        originalWorkerName: originalContract.workerName,
        serviceDays,
        hasTemplateParams: !!(mergedContractData as any).templateParams
      });

      // 创建新的合并合同
      const contract = new this.contractModel(mergedContractData);
      const newContract = await contract.save();

      // 更新原合同状态为已替换
      await this.contractModel.findByIdAndUpdate(originalContractId, {
        isLatest: false,
        contractStatus: 'replaced',
        replacedByContractId: (newContract as any)._id,
        serviceDays: serviceDays
      });

      // 🆕 同时更新该客户的其他历史合同状态
      await this.contractModel.updateMany(
        {
          customerPhone: originalContract.customerPhone,
          _id: { $ne: newContract._id },
          isLatest: { $ne: false }
        },
        {
          isLatest: false,
          contractStatus: 'replaced'
        }
      );

      console.log('✅ 换人合并完成，新合同ID:', (newContract as any)._id);
      console.log('📋 客户合同已自动合并，换人历史已记录');

      // 🔥🔥🔥 修复：换人合同也需要调用爱签API创建电子合同
      console.log('🔍 检查是否应该启动爱签流程...');
      console.log('  - templateNo:', createContractDto.templateNo);
      console.log('  - customerName:', createContractDto.customerName);
      console.log('  - customerPhone:', createContractDto.customerPhone);
      console.log('  - customerIdCard:', createContractDto.customerIdCard);
      console.log('  - workerName:', createContractDto.workerName);
      console.log('  - workerPhone:', createContractDto.workerPhone);
      console.log('  - workerIdCard:', createContractDto.workerIdCard);

      const shouldInitiate = this.shouldInitiateEsignFlow(createContractDto);
      console.log('  - shouldInitiateEsignFlow 结果:', shouldInitiate);

      if (shouldInitiate) {
        try {
          this.logger.log(`🚀 开始为换人合同 ${newContract.contractNumber} 创建爱签电子合同...`);

          // 🔥 修复：从保存后的合同对象中提取 templateParams，而不是使用 createContractDto.templateParams
          const templateParams = this.extractTemplateParams(newContract as any);
          this.logger.log(`📋 [换人合同] 提取的模板参数:`, JSON.stringify(templateParams, null, 2));

          if (Object.keys(templateParams).length === 0) {
            this.logger.warn(`⚠️ [换人合同] 没有提取到模板参数，跳过爱签流程`);
            return newContract;
          }

          const esignResult = await this.esignService.createCompleteContractFlow({
            contractNo: newContract.contractNumber,
            contractName: `${createContractDto.contractType || '服务'}合同（换人）`,
            templateNo: createContractDto.templateNo || 'default_template',
            templateParams: templateParams,  // ✅ 修复：使用从合同对象中提取的参数
            signers: [
              {
                name: mergedContractData.customerName,
                mobile: mergedContractData.customerPhone,
                idCard: mergedContractData.customerIdCard,
                signType: 'manual',  // 甲方：有感知签章
                validateType: 'sms'
              },
              {
                name: createContractDto.workerName,
                mobile: createContractDto.workerPhone,
                idCard: createContractDto.workerIdCard,
                signType: 'manual',  // 乙方：有感知签章
                validateType: 'sms'
              },
              {
                name: '北京安得家政有限公司',
                mobile: '',  // 企业无需手机号
                idCard: '91110111MACJMD2R5J',  // 企业统一社会信用代码
                signType: 'auto',  // 丙方（企业）：无感知签章（自动签章）
                validateType: 'sms'
              }
            ],
            validityTime: 30,
            signOrder: 1
          });

          if (esignResult.success) {
            // 更新合同的爱签信息
            await this.contractModel.findByIdAndUpdate(newContract._id, {
              esignContractNo: esignResult.contractNo,
              esignSignUrls: JSON.stringify(esignResult.signUrls || []),
              esignCreatedAt: new Date(),
              esignStatus: '0',  // 🔥 修复：设置爱签状态为待签约
              contractStatus: 'signing',
              updatedAt: new Date()
            });

            // 返回更新后的合同（包含爱签信息）
            const updatedContract = await this.contractModel.findById(newContract._id).exec();
            this.logger.log(`✅ 换人合同爱签电子合同创建成功: ${esignResult.contractNo}`);
            return updatedContract;
          } else {
            this.logger.warn(`⚠️ 换人合同爱签电子合同创建失败: ${esignResult.message}`);
          }
        } catch (esignError) {
          this.logger.error(`❌ 换人合同爱签流程失败: ${esignError.message}`, esignError.stack);
          // 不阻止合同创建，只记录错误
        }
      } else {
        this.logger.log(`ℹ️ 换人合同 ${newContract.contractNumber} 缺少必要字段，跳过爱签流程`);
        this.logger.log(`  - templateNo: ${createContractDto.templateNo || '未提供'}`);
        this.logger.log(`  - customerName: ${mergedContractData.customerName || '未提供'}`);
        this.logger.log(`  - customerPhone: ${mergedContractData.customerPhone || '未提供'}`);
        this.logger.log(`  - customerIdCard: ${mergedContractData.customerIdCard || '未提供'}`);
        this.logger.log(`  - workerName: ${createContractDto.workerName || '未提供'}`);
        this.logger.log(`  - workerPhone: ${createContractDto.workerPhone || '未提供'}`);
        this.logger.log(`  - workerIdCard: ${createContractDto.workerIdCard || '未提供'}`);
      }

      return newContract;

    } catch (error) {
      console.error('❌ 创建换人合同失败:', error);
      throw new BadRequestException(`创建换人合同失败: ${error.message}`);
    }
  }

  /**
   * 当合同状态变为 active 时，自动触发保险同步
   * 场景1：首次签约 - 绑定保单到合同
   * 场景2：换人签约 - 自动换人保单
   * 此方法会在合同状态更新时被调用
   */
  /**
   * 手动触发保险同步（增强版）
   * 1. 先查询爱签API确认合同真实状态
   * 2. 如果爱签显示已签约，更新本地状态
   * 3. 触发保险同步逻辑
   */
  async manualSyncInsurance(contractId: string): Promise<any> {
    try {
      this.logger.log(`🔄 手动触发保险同步: ${contractId}`);

      const contract = await this.contractModel.findById(contractId).exec();

      if (!contract) {
        throw new NotFoundException('合同不存在');
      }

      this.logger.log(`📋 合同信息: ${contract.contractNumber}, 当前状态: ${contract.contractStatus}, 爱签状态: ${contract.esignStatus}`);

      // 步骤1：查询爱签API获取合同真实状态
      let esignStatus = contract.esignStatus;
      let needUpdateStatus = false;

      if (contract.esignContractNo) {
        try {
          this.logger.log(`🔍 查询爱签API获取合同真实状态...`);
          const esignResponse = await this.esignService.getContractStatus(contract.esignContractNo);

          if (esignResponse && esignResponse.data) {
            esignStatus = esignResponse.data.status?.toString();
            this.logger.log(`✅ 爱签API返回状态: ${esignStatus} (${this.getEsignStatusText(esignStatus)})`);

            // 如果爱签显示已签约，但本地状态不是 active，需要更新
            if (esignStatus === '2' && contract.contractStatus !== 'active') {
              needUpdateStatus = true;
              this.logger.log(`⚠️  爱签显示已签约，但本地状态是 ${contract.contractStatus}，需要更新`);
            }
          }
        } catch (esignError) {
          this.logger.warn(`⚠️  查询爱签API失败: ${esignError.message}，使用本地状态继续`);
        }
      }

      // 步骤2：如果需要，更新本地合同状态
      if (needUpdateStatus) {
        this.logger.log(`🔧 更新本地合同状态为 active...`);
        await this.contractModel.findByIdAndUpdate(contractId, {
          contractStatus: 'active',
          esignStatus: '2',
          esignSignedAt: new Date(),
          updatedAt: new Date(),
        });
        this.logger.log(`✅ 合同状态已更新`);
      }

      // 步骤3：检查合同是否已签约
      if (esignStatus !== '2') {
        const statusText = this.getEsignStatusText(esignStatus);
        throw new BadRequestException(`合同还未签约完成，当前状态: ${statusText}`);
      }

      // 步骤4：重置同步状态（手动同步需要强制重新执行，忽略幂等性检查）
      this.logger.log(`🔄 重置同步状态，强制重新执行保险同步...`);
      await this.contractModel.findByIdAndUpdate(contractId, {
        insuranceSyncStatus: null,
        insuranceSyncError: null,
        insuranceSyncPending: false,
      });

      // 步骤5：触发保险同步
      this.logger.log(`🔄 开始保险同步...`);
      await this.syncInsuranceOnContractActive(contractId);

      // 步骤6：查询最终状态
      const updatedContract = await this.contractModel.findById(contractId).exec();

      return {
        success: true,
        message: '保险同步完成',
        data: {
          contractStatus: updatedContract.contractStatus,
          esignStatus: updatedContract.esignStatus,
          insuranceSyncStatus: updatedContract.insuranceSyncStatus,
          insuranceSyncError: updatedContract.insuranceSyncError,
        },
      };

    } catch (error) {
      this.logger.error(`❌ 手动保险同步失败:`, error);
      throw error;
    }
  }

  /**
   * 获取爱签状态文本描述
   */
  private getEsignStatusText(status: string): string {
    const statusMap = {
      '0': '等待签约',
      '1': '签约中',
      '2': '已签约',
      '3': '过期',
      '4': '拒签',
      '6': '作废',
      '7': '撤销',
    };
    return statusMap[status] || '未知状态';
  }

  async syncInsuranceOnContractActive(contractId: string): Promise<void> {
    try {
      this.logger.log(`🔍 检查合同 ${contractId} 是否需要同步保险`);

      const contract = await this.contractModel.findById(contractId).exec();

      if (!contract) {
        throw new NotFoundException('合同不存在');
      }

      // 🔒 幂等性保护：如果已经同步成功或正在同步中，跳过
      if (contract.insuranceSyncStatus === 'success') {
        this.logger.log(`⏭️ 合同 ${contractId} 保险已同步成功，跳过重复同步`);
        return;
      }
      if (contract.insuranceSyncStatus === 'pending' && contract.insuranceSyncPending) {
        this.logger.log(`⏭️ 合同 ${contractId} 保险正在同步中，跳过重复同步`);
        return;
      }

      // 🆕 场景判断：是首次签约还是换人签约
      const isChangeWorkerContract = !!contract.replacesContractId;

      if (isChangeWorkerContract) {
        // ========== 场景2：换人合同 - 自动换人保单 ==========
        this.logger.log(`✅ 这是一个换人合同，原合同ID: ${contract.replacesContractId}`);
        await this.handleChangeWorkerInsurance(contract);
      } else {
        // ========== 场景1：首次签约 - 绑定保单到合同 ==========
        this.logger.log(`✅ 这是首次签约合同，检查是否需要绑定保单`);
        await this.handleFirstContractInsurance(contract);
      }

    } catch (error) {
      this.logger.error(`❌ 保险同步失败:`, error);

      // 更新合同同步状态为失败
      await this.contractModel.findByIdAndUpdate(contractId, {
        insuranceSyncPending: false,
        insuranceSyncStatus: 'failed',
        insuranceSyncError: error.message,
      });

      // 不抛出异常，避免影响合同流程
    }
  }

  /**
   * 场景1：首次签约 - 绑定保单到合同
   */
  private async handleFirstContractInsurance(contract: any): Promise<void> {
    this.logger.log(`📋 首次签约合同信息: ${contract.workerName} (${contract.workerIdCard})`);

    if (!contract.workerIdCard) {
      this.logger.warn('⚠️ 合同缺少服务人员身份证号，无法匹配保单');
      await this.contractModel.findByIdAndUpdate(contract._id, {
        insuranceSyncStatus: 'failed',
        insuranceSyncError: '合同缺少服务人员身份证号',
        insuranceSyncedAt: new Date(),
      });
      return;
    }

    // 🔥 修复：用身份证号匹配保单的被保险人，而不是用随机的 workerId
    const policies = await this.dashubaoService['policyModel'].find({
      'insuredList.idNumber': contract.workerIdCard,
      status: 'active'
    }).exec();

    this.logger.log(`🔍 通过身份证号 ${contract.workerIdCard} 查找保单，找到 ${policies.length} 个`);

    if (policies.length === 0) {
      this.logger.log('未找到该服务人员的保单，无需绑定');
      await this.contractModel.findByIdAndUpdate(contract._id, {
        insuranceSyncStatus: 'success',
        insuranceSyncError: '无需绑定（未找到关联保险）',
        insuranceSyncedAt: new Date(),
      });
      return;
    }

    this.logger.log(`📦 找到 ${policies.length} 个保单，开始绑定到合同`);

    // 将保单绑定到合同（更新保单的 contractId 字段）
    const bindResults = [];
    for (const policy of policies) {
      try {
        await this.dashubaoService['policyModel'].findByIdAndUpdate(policy._id, {
          contractId: contract._id,
          bindToContractAt: new Date(),
        });
        bindResults.push({ success: true, policyNo: policy.policyNo });
        this.logger.log(`✅ 保单 ${policy.policyNo} 已绑定到合同 ${contract.contractNumber}`);
      } catch (error) {
        bindResults.push({ success: false, policyNo: policy.policyNo, error: error.message });
        this.logger.error(`❌ 保单 ${policy.policyNo} 绑定失败:`, error);
      }
    }

    const successCount = bindResults.filter(r => r.success).length;
    const failedResults = bindResults.filter(r => !r.success);

    await this.contractModel.findByIdAndUpdate(contract._id, {
      insuranceSyncStatus: successCount > 0 ? 'success' : 'failed',
      insuranceSyncError: failedResults.length > 0
        ? `部分失败: ${failedResults.map(r => r.error).join('; ')}`
        : null,
      insuranceSyncedAt: new Date(),
    });

    this.logger.log(`🎉 保单绑定完成: 成功 ${successCount}/${policies.length}`);
  }

  /**
   * 场景2：换人合同 - 自动换人保单
   */
  private async handleChangeWorkerInsurance(contract: any): Promise<void> {
    // 🔗 沿着换人链向上追溯，找到有 active 保险的工人
    let currentContract = contract;
    let policyOwnerContract = null;
    let policies = [];
    const maxDepth = 10; // 防止无限循环
    const visitedIds = new Set<string>();

    for (let depth = 0; depth < maxDepth; depth++) {
      if (!currentContract.replacesContractId) {
        this.logger.warn(`🔗 追溯到链条顶端，没有更多前任合同`);
        break;
      }

      const contractId = currentContract.replacesContractId.toString();
      if (visitedIds.has(contractId)) {
        this.logger.warn(`🔗 检测到循环引用，停止追溯`);
        break;
      }
      visitedIds.add(contractId);

      const predecessorContract = await this.contractModel.findById(currentContract.replacesContractId).exec();
      if (!predecessorContract) {
        this.logger.warn(`🔗 第${depth + 1}层前任合同不存在 (ID: ${currentContract.replacesContractId})`);
        break;
      }

      this.logger.log(`🔗 第${depth + 1}层前任: ${predecessorContract.workerName} (${predecessorContract.workerIdCard})`);

      if (!predecessorContract.workerIdCard) {
        this.logger.log(`🔗 前任 ${predecessorContract.workerName} 缺少身份证号，继续向上追溯...`);
        currentContract = predecessorContract;
        continue;
      }

      // 查找绑定到该合同的 active 保单
      let found = await this.dashubaoService['policyModel'].find({
        contractId: predecessorContract._id,
        status: 'active'
      }).exec();

      this.logger.log(`🔍 通过 contractId 查找 ${predecessorContract.workerName} 的保单，找到 ${found.length} 个`);

      // 如果没找到，用身份证号匹配
      if (found.length === 0) {
        found = await this.dashubaoService['policyModel'].find({
          'insuredList.idNumber': predecessorContract.workerIdCard,
          status: 'active'
        }).exec();
        this.logger.log(`🔍 通过身份证号查找 ${predecessorContract.workerName} 的保单，找到 ${found.length} 个`);
      }

      if (found.length > 0) {
        policies = found;
        policyOwnerContract = predecessorContract;
        this.logger.log(`✅ 在第${depth + 1}层前任 ${predecessorContract.workerName} 处找到 ${found.length} 个 active 保单`);
        break;
      }

      this.logger.log(`🔗 前任 ${predecessorContract.workerName} 没有 active 保单，继续向上追溯...`);
      currentContract = predecessorContract;
    }

    if (policies.length === 0 || !policyOwnerContract) {
      this.logger.log('未找到需要同步的保险，整条换人链上都没有 active 保单');
      await this.contractModel.findByIdAndUpdate(contract._id, {
        insuranceSyncStatus: 'success',
        insuranceSyncError: '无需同步（换人链上未找到关联保险）',
        insuranceSyncedAt: new Date(),
      });
      return;
    }

    this.logger.log(`📋 保单持有人: ${policyOwnerContract.workerName} (${policyOwnerContract.workerIdCard})`);
    this.logger.log(`📋 新合同信息: ${contract.workerName} (${contract.workerIdCard})`);
    this.logger.log(`📦 找到 ${policies.length} 个需要换人的保单`);

    // 标记合同为待同步状态
    await this.contractModel.findByIdAndUpdate(contract._id, {
      insuranceSyncPending: true,
      insuranceSyncStatus: 'pending',
    });

    // 调用保险换人服务
    const result = await this.dashubaoService.syncInsuranceAmendment({
      contractId: contract._id as Types.ObjectId,
      policyIds: policies.map(p => p._id as Types.ObjectId),
      oldWorker: {
        name: policyOwnerContract.workerName,
        idCard: policyOwnerContract.workerIdCard,
      },
      newWorker: {
        name: contract.workerName,
        idCard: contract.workerIdCard,
        phone: contract.workerPhone,
      },
    });

    // 更新合同同步状态
    const successCount = result.results.filter(r => r.success).length;
    const failedResults = result.results.filter(r => !r.success);

    await this.contractModel.findByIdAndUpdate(contract._id, {
      insuranceSyncPending: false,
      insuranceSyncStatus: result.success ? 'success' : 'failed',
      insuranceSyncError: failedResults.length > 0
        ? `部分失败: ${failedResults.map(r => r.error).join('; ')}`
        : null,
      insuranceSyncedAt: new Date(),
    });

    this.logger.log(`🎉 保险换人完成: 成功 ${successCount}/${policies.length}`);
  }
}