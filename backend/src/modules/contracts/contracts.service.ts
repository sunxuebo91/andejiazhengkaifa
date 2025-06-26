import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contract, ContractDocument } from './models/contract.model';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
  ) {}

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
      
      return savedContract;
    } catch (error) {
      console.error('创建合同失败:', error);
      throw new BadRequestException(`创建合同失败: ${error.message}`);
    }
  }

  // 获取合同列表
  async findAll(page: number = 1, limit: number = 10, search?: string): Promise<{
    contracts: Contract[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = {};
    
    if (search) {
      query.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { workerName: { $regex: search, $options: 'i' } },
        { workerPhone: { $regex: search, $options: 'i' } },
      ];
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
    const contract = await this.contractModel
      .findById(id)
      .populate('customerId', 'name phone customerId address')
      .populate('workerId', 'name phone idCardNumber')
      .populate('createdBy', 'name username')
      .exec();
      
    if (!contract) {
      throw new NotFoundException('合同不存在');
    }
    
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
  async update(id: string, updateContractDto: UpdateContractDto): Promise<Contract> {
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

    const contract = await this.contractModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('customerId', 'name phone customerId address')
      .populate('workerId', 'name phone idCardNumber')
      .populate('createdBy', 'name username')
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
} 