import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
  async create(createContractDto: CreateContractDto, userId: string): Promise<Contract> {
    const contractNumber = this.generateContractNumber();
    
    const contractData = {
      ...createContractDto,
      contractNumber,
      createdBy: userId,
      startDate: new Date(createContractDto.startDate),
      endDate: new Date(createContractDto.endDate),
      expectedDeliveryDate: createContractDto.expectedDeliveryDate 
        ? new Date(createContractDto.expectedDeliveryDate)
        : undefined,
    };

    const contract = new this.contractModel(contractData);
    return await contract.save();
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