import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './models/customer.model';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  // 生成客户ID
  private generateCustomerId(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CUS${timestamp.slice(-8)}${random}`;
  }

  // 创建客户
  async create(createCustomerDto: CreateCustomerDto, userId: string): Promise<Customer> {
    // 检查手机号是否已存在
    const existingCustomer = await this.customerModel.findOne({ 
      phone: createCustomerDto.phone 
    });
    
    if (existingCustomer) {
      throw new ConflictException('该手机号已存在客户记录');
    }

    const customerId = this.generateCustomerId();
    
    const customerData = {
      ...createCustomerDto,
      customerId,
      createdBy: userId,
      contractStatus: '待定', // 默认状态
      expectedStartDate: new Date(createCustomerDto.expectedStartDate),
      expectedDeliveryDate: createCustomerDto.expectedDeliveryDate 
        ? new Date(createCustomerDto.expectedDeliveryDate) 
        : undefined,
    };

    const customer = new this.customerModel(customerData);
    return await customer.save();
  }

  // 获取客户列表（支持搜索和分页）
  async findAll(query: CustomerQueryDto): Promise<{
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { search, caregiverName, caregiverPhone, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = query;
    
    const searchConditions: any = {};

    // 构建搜索条件
    if (search) {
      searchConditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // 阿姨搜索（这里假设有关联的阿姨信息，实际需要根据业务逻辑调整）
    if (caregiverName) {
      // 预留阿姨姓名搜索逻辑
      searchConditions.caregiverName = { $regex: caregiverName, $options: 'i' };
    }

    if (caregiverPhone) {
      // 预留阿姨电话搜索逻辑
      searchConditions.caregiverPhone = { $regex: caregiverPhone, $options: 'i' };
    }

    // 其他筛选条件
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        searchConditions[key] = filters[key];
      }
    });

    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [customers, total] = await Promise.all([
      this.customerModel
        .find(searchConditions)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.customerModel.countDocuments(searchConditions).exec(),
    ]);

    return {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 根据ID获取客户详情
  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }
    return customer;
  }

  // 根据客户ID获取客户详情
  async findByCustomerId(customerId: string): Promise<Customer> {
    const customer = await this.customerModel.findOne({ customerId }).exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }
    return customer;
  }

  // 更新客户信息
  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    // 如果更新手机号，检查是否与其他客户冲突
    if (updateCustomerDto.phone) {
      const existingCustomer = await this.customerModel.findOne({
        phone: updateCustomerDto.phone,
        _id: { $ne: id }
      });
      
      if (existingCustomer) {
        throw new ConflictException('该手机号已被其他客户使用');
      }
    }

    const updateData = { ...updateCustomerDto };
    if (updateCustomerDto.expectedStartDate) {
      updateData.expectedStartDate = new Date(updateCustomerDto.expectedStartDate);
    }
    if (updateCustomerDto.expectedDeliveryDate) {
      updateData.expectedDeliveryDate = new Date(updateCustomerDto.expectedDeliveryDate);
    }

    const customer = await this.customerModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
      
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }
    
    return customer;
  }

  // 删除客户
  async remove(id: string): Promise<void> {
    const result = await this.customerModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('客户不存在');
    }
  }

  // 获取统计信息
  async getStatistics(): Promise<{
    total: number;
    byContractStatus: Record<string, number>;
    byLeadSource: Record<string, number>;
    byServiceCategory: Record<string, number>;
  }> {
    const [total, byContractStatus, byLeadSource, byServiceCategory] = await Promise.all([
      this.customerModel.countDocuments().exec(),
      this.customerModel.aggregate([
        { $group: { _id: '$contractStatus', count: { $sum: 1 } } }
      ]).exec(),
      this.customerModel.aggregate([
        { $group: { _id: '$leadSource', count: { $sum: 1 } } }
      ]).exec(),
      this.customerModel.aggregate([
        { $group: { _id: '$serviceCategory', count: { $sum: 1 } } }
      ]).exec(),
    ]);

    return {
      total,
      byContractStatus: byContractStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byLeadSource: byLeadSource.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byServiceCategory: byServiceCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
} 