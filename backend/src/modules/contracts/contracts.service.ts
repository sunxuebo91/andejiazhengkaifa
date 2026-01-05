import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contract, ContractDocument } from './models/contract.model';
import { CustomerContractHistory, CustomerContractHistoryDocument } from './models/customer-contract-history.model';
import { CustomerOperationLog } from '../customers/models/customer-operation-log.model';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ResumeService } from '../resume/resume.service';
import { AvailabilityStatus } from '../resume/models/availability-period.schema';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(CustomerContractHistory.name) private customerContractHistoryModel: Model<CustomerContractHistoryDocument>,
    @InjectModel(CustomerOperationLog.name) private operationLogModel: Model<CustomerOperationLog>,
    @Inject(forwardRef(() => ResumeService)) private resumeService: ResumeService,
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

  // 创建合同
  async create(createContractDto: CreateContractDto, userId?: string): Promise<Contract> {
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
        
        // 处理创建人ID
        let finalCreatedBy = createContractDto.createdBy;
        if (createContractDto.createdBy === 'temp' || !createContractDto.createdBy) {
          // 使用传入的userId或生成临时ID
          finalCreatedBy = userId || new Types.ObjectId().toString();
          console.log('为合同设置创建人ID:', finalCreatedBy);
        }
        
        // 更新字段
        createContractDto.customerId = finalCustomerId;
        createContractDto.workerId = finalWorkerId;
        createContractDto.createdBy = finalCreatedBy;
      } else {
        // 正常创建合同时，确保设置创建人ID
        if (userId && !createContractDto.createdBy) {
          createContractDto.createdBy = userId;
        }
      }
      
      // 生成合同编号（如果没有提供）
      if (!createContractDto.contractNumber) {
        createContractDto.contractNumber = await this.generateContractNumber();
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
    const query: any = {};
    
    // 默认只显示最新合同，除非明确要求显示所有合同
    if (!showAll) {
      query.$or = [
        { isLatest: true },
        { isLatest: { $exists: false } }, // 兼容旧数据
        { contractStatus: { $ne: 'replaced' } } // 不显示已替换的合同
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

    const [contracts, total] = await Promise.all([
      this.contractModel
        .find(query)
        .populate('customerId', 'name phone customerId')
        .populate('workerId', 'name phone')
        .populate('createdBy', 'name username')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.contractModel.countDocuments(query).exec(),
    ]);

    return {
      contracts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 根据ID获取合同详情
  async findOne(id: string): Promise<Contract> {
    console.log('🚨🚨🚨 [CONTRACTS SERVICE] 开始查询合同详情, ID:', id);
    console.log('🚨🚨🚨 [CONTRACTS SERVICE] 当前时间:', new Date().toISOString());
    
    const contract = await this.contractModel
      .findById(id)
      .populate('customerId', 'name phone customerId address')
      .populate('workerId', 'name phone idCardNumber')
      .populate('createdBy', 'name username')
      .populate('lastUpdatedBy', 'name username')
      .exec();
      
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
    
    return contract;
  }

  // 根据合同编号获取合同
  async findByContractNumber(contractNumber: string): Promise<Contract> {
    const contract = await this.contractModel
      .findOne({ contractNumber })
      .populate('customerId', 'name phone customerId address')
      .populate('workerId', 'name phone idCardNumber')
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

    // 设置最后更新人
    if (userId) {
      updateData.lastUpdatedBy = userId;
    }

    const contract = await this.contractModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('customerId', 'name phone customerId address')
      .populate('workerId', 'name phone idCardNumber')
      .populate('createdBy', 'name username')
      .populate('lastUpdatedBy', 'name username')
      .exec();
      
    if (!contract) {
      throw new NotFoundException('合同不存在');
    }
    
    return contract;
  }

  // 删除合同
  async remove(id: string): Promise<void> {
    const result = await this.contractModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('合同不存在');
    }
  }

  // 获取统计信息
  async getStatistics(): Promise<{
    total: number;
    byContractType: Record<string, number>;
    thisMonth: number;
    thisYear: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [total, byContractType, thisMonth, thisYear] = await Promise.all([
      this.contractModel.countDocuments().exec(),
      this.contractModel.aggregate([
        { $group: { _id: '$contractType', count: { $sum: 1 } } }
      ]).exec(),
      this.contractModel.countDocuments({
        createdAt: { $gte: startOfMonth }
      }).exec(),
      this.contractModel.countDocuments({
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
        const historyRecord = {
          序号: index + 1,
          合同编号: contract.contractNumber,
          服务人员: contract.workerName,
          联系电话: contract.workerPhone,
          月薪: contract.workerSalary,
          开始时间: contract.startDate || contract.createdAt,
          结束时间: contract.replacedByContractId ? '已换人' : '进行中',
          服务天数: contract.serviceDays || (contract.isLatest ? '进行中' : 0),
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

        if (contract.serviceDays) {
          totalServiceDays += contract.serviceDays;
        }

        workerHistory.push(historyRecord);
      });

      // 获取当前最新合同
      const currentContract = allContracts.find(c => c.isLatest === true) || allContracts[allContracts.length - 1];

      // 转换为前端期望的格式
      const contracts = allContracts.map((contract, index) => ({
        contractId: contract._id.toString(),
        order: index + 1,
        contractNumber: contract.contractNumber,
        workerName: contract.workerName,
        workerPhone: contract.workerPhone,
        workerSalary: contract.workerSalary,
        startDate: contract.startDate || contract.createdAt,
        endDate: contract.endDate,
        serviceDays: contract.serviceDays || (contract.isLatest ? '进行中' : 0),
        status: contract.isLatest ? 'active' : 'replaced',
        terminationDate: contract.replacedByContractId ? contract.updatedAt : null,
        terminationReason: contract.replacedByContractId ? '换人' : null,
        esignStatus: contract.esignStatus,
        createdAt: contract.createdAt,
        isLatest: contract.isLatest
      }));

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
        .populate('workerId', 'name phone idNumber')
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

      console.log('🔄 合并后的合同数据:', {
        contractNumber: mergedContractData.contractNumber,
        customerName: mergedContractData.customerName,
        workerName: mergedContractData.workerName,
        originalWorkerName: originalContract.workerName,
        serviceDays
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
      
      return newContract;

    } catch (error) {
      console.error('❌ 创建换人合同失败:', error);
      throw new BadRequestException(`创建换人合同失败: ${error.message}`);
    }
  }
} 