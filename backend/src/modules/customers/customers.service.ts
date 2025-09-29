import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './models/customer.model';
import { CustomerFollowUp } from './models/customer-follow-up.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CreateCustomerFollowUpDto } from './dto/create-customer-follow-up.dto';
import { User } from '../users/models/user.entity';
import { WeChatService } from '../wechat/wechat.service';
import { CustomerAssignmentLog } from './models/customer-assignment-log.model';


@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(CustomerFollowUp.name) private customerFollowUpModel: Model<CustomerFollowUp>,
    @InjectModel(CustomerAssignmentLog.name) private assignmentLogModel: Model<CustomerAssignmentLog>,
    private wechatService: WeChatService,
  ) {}

  // 生成客户ID
  private generateCustomerId(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CUS${timestamp.slice(-8)}${random}`;
  }

  // 创建客户（支持创建时指定负责人，未指定则默认分配给创建人）
  async create(createCustomerDto: CreateCustomerDto, userId: string): Promise<Customer> {
    // 检查手机号是否已存在
    const existingCustomer = await this.customerModel.findOne({ phone: createCustomerDto.phone });
    if (existingCustomer) {
      throw new ConflictException('该手机号已存在客户记录');
    }

    const customerId = this.generateCustomerId();

    const now = new Date();
    const dtoAny: any = createCustomerDto as any;
    const hasAssignedTo = !!dtoAny.assignedTo;

    const customerData: any = {
      ...createCustomerDto,
      customerId,
      createdBy: userId,
      expectedStartDate: createCustomerDto.expectedStartDate ? new Date(createCustomerDto.expectedStartDate) : undefined,
      expectedDeliveryDate: createCustomerDto.expectedDeliveryDate ? new Date(createCustomerDto.expectedDeliveryDate) : undefined,
      // 分配信息
      assignedTo: hasAssignedTo ? dtoAny.assignedTo : userId,
      assignedBy: userId,
      assignedAt: now,
      assignmentReason: hasAssignedTo ? (dtoAny.assignmentReason || '创建时指定负责人') : '创建默认分配给创建人',
    };

    const customer = new this.customerModel(customerData);
    return await customer.save();
  }

  // 获取客户列表（支持搜索和分页 + 角色可见性 + 指定负责人过滤）
  async findAll(query: CustomerQueryDto, currentUserId?: string): Promise<{
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { search, caregiverName, caregiverPhone, page = 1, limit = 10, sortBy = 'updatedAt', sortOrder = 'desc', ...filters } = query as any;

    const searchConditions: any = {};

    // 构建搜索条件
    if (search) {
      searchConditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { phone: (search || '').trim() }, // 添加精确匹配
      ];
    }

    // 按名字或手机号精确搜索
    if (query.name) {
      searchConditions.name = { $regex: query.name, $options: 'i' };
    }
    if (query.phone) {
      searchConditions.$or = [
        { phone: { $regex: query.phone, $options: 'i' } },
        { phone: (query.phone || '').trim() }, // 添加精确匹配
      ];
    }

    // 阿姨搜索（预留）
    if (caregiverName) {
      searchConditions.caregiverName = { $regex: caregiverName, $options: 'i' };
    }
    if (caregiverPhone) {
      searchConditions.caregiverPhone = { $regex: caregiverPhone, $options: 'i' };
    }

    // 其他筛选条件（包含 assignedTo 等）
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        searchConditions[key] = filters[key];
      }
    });

    // 基于角色的可见性控制
    if (currentUserId) {
      const currentUser = await this.userModel.findById(currentUserId).select('role').lean();
      const role = (currentUser as any)?.role;
      if (role === 'employee') {
        // 员工默认仅能看到自己负责或自己创建的客户
        if (!searchConditions.assignedTo) {
          searchConditions.$and = (searchConditions.$and || []).concat([
            {
              $or: [
                { assignedTo: new Types.ObjectId(currentUserId) },
                { createdBy: currentUserId },
              ],
            },
          ]);
        } else {
          // 即使传入了 assignedTo，如果不是本人，则仍然限制为本人可见范围
          searchConditions.$and = (searchConditions.$and || []).concat([
            {
              $or: [
                { assignedTo: new Types.ObjectId(currentUserId) },
                { createdBy: currentUserId },
              ],
            },
          ]);
        }
      }
    }

    const skip = (page - 1) * limit;

    // 🔥 [CUSTOMER-SORT-FIX] 强制按更新时间倒序排序，与简历列表保持一致
    console.log(`🔥🔥🔥 [CUSTOMER-DEBUG] 开始查询客户列表 - page: ${page}, limit: ${limit}, sortBy: ${sortBy}`);

    const findQuery = this.customerModel
      .find(searchConditions)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const [customers, total] = await Promise.all([
      findQuery.exec(),
      this.customerModel.countDocuments(searchConditions).exec(),
    ]);

    // 🔥 [CUSTOMER-SORT-FIX] 强制二次排序确保正确性
    const sortedCustomers = (customers || []).sort((a: any, b: any) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return {
      customers: sortedCustomers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 根据ID获取客户详情（包含跟进记录）
  async findOne(id: string): Promise<Customer & {
    createdByUser?: { name: string; username: string } | null;
    lastUpdatedByUser?: { name: string; username: string } | null;
    assignedToUser?: { name: string; username: string } | null;
    assignedByUser?: { name: string; username: string } | null;
    followUps?: CustomerFollowUp[];
  }> {
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 获取创建人信息
    const createdByUser = await this.userModel
      .findById(customer.createdBy)
      .select('name username')
      .lean()
      .exec();

    // 获取最后更新人信息
    const lastUpdatedByUser = customer.lastUpdatedBy ? await this.userModel
      .findById(customer.lastUpdatedBy)
      .select('name username')
      .lean()
      .exec() : null;

    // 获取当前负责人信息
    const assignedToUser = customer.assignedTo ? await this.userModel
      .findById(customer.assignedTo)
      .select('name username')
      .lean()
      .exec() : null;

    // 获取分配人信息
    const assignedByUser = customer.assignedBy ? await this.userModel
      .findById(customer.assignedBy)
      .select('name username')
      .lean()
      .exec() : null;

    // 获取跟进记录
    const followUps = await this.customerFollowUpModel
      .find({ customerId: id })
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 })
      .exec();

    return {
      ...customer.toObject(),
      createdByUser: createdByUser ? { name: createdByUser.name, username: createdByUser.username } : null,
      lastUpdatedByUser: lastUpdatedByUser ? { name: lastUpdatedByUser.name, username: lastUpdatedByUser.username } : null,
      assignedToUser: assignedToUser ? { name: assignedToUser.name, username: assignedToUser.username } : null,
      assignedByUser: assignedByUser ? { name: assignedByUser.name, username: assignedByUser.username } : null,
      followUps: followUps
    };
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
  async update(id: string, updateCustomerDto: UpdateCustomerDto, userId?: string): Promise<Customer> {
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

    const updateData: any = { ...updateCustomerDto };
    if (updateCustomerDto.expectedStartDate) {
      updateData.expectedStartDate = new Date(updateCustomerDto.expectedStartDate);
    }
    if (updateCustomerDto.expectedDeliveryDate) {
      updateData.expectedDeliveryDate = new Date(updateCustomerDto.expectedDeliveryDate);
    }

    // 设置最后更新人
    if (userId) {
      updateData.lastUpdatedBy = userId;
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

  // 创建客户跟进记录
  async createFollowUp(customerId: string, createFollowUpDto: CreateCustomerFollowUpDto, userId: string): Promise<CustomerFollowUp> {
    // 验证客户是否存在
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    const followUp = new this.customerFollowUpModel({
      customerId,
      ...createFollowUpDto,
      createdBy: userId,
    });

    return await followUp.save();
  }

  // 分配客户给指定用户
  async assignCustomer(customerId: string, assignedTo: string, assignmentReason: string | undefined, adminUserId: string): Promise<Customer> {
    // 验证管理员/经理权限
    const adminUser = await this.userModel.findById(adminUserId).select('role name username active').lean();
    if (!adminUser || !['admin', 'manager'].includes((adminUser as any).role)) {
      throw new ForbiddenException('只有管理员或经理可以分配客户');
    }

    // 验证客户
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 验证目标用户
    const targetUser = await this.userModel.findById(assignedTo).select('name username role active').lean();
    if (!targetUser) {
      throw new NotFoundException('指定的负责人不存在');
    }
    if ((targetUser as any).active === false) {
      throw new ConflictException('指定的负责人未激活');
    }
    if (!['employee', 'manager'].includes((targetUser as any).role)) {
      throw new ConflictException('指定的负责人角色不允许被分配');
    }

    const oldAssignedTo = (customer as any).assignedTo ? new Types.ObjectId((customer as any).assignedTo) : undefined;
    const now = new Date();

    // 如果负责人未变化，可按需直接返回（no-op）
    if (oldAssignedTo && oldAssignedTo.toString() === assignedTo) {
      return customer;
    }

    // 更新客户分配信息
    const updated = await this.customerModel.findByIdAndUpdate(
      customerId,
      {
        assignedTo: new Types.ObjectId(assignedTo),
        assignedBy: new Types.ObjectId(adminUserId),
        assignedAt: now,
        assignmentReason: assignmentReason,
        lastUpdatedBy: adminUserId,
      },
      { new: true }
    ).exec();

    if (!updated) {
      throw new NotFoundException('客户不存在');
    }

    // 写入分配审计日志
    await this.assignmentLogModel.create({
      customerId: new Types.ObjectId(customerId),
      oldAssignedTo,
      newAssignedTo: new Types.ObjectId(assignedTo),
      assignedBy: new Types.ObjectId(adminUserId),
      assignedAt: now,
      reason: assignmentReason,
    } as any);

    // 写入系统跟进记录
    const oldUser = oldAssignedTo ? await this.userModel.findById(oldAssignedTo).select('name username').lean() : null;
    const newUser = await this.userModel.findById(assignedTo).select('name username').lean();
    const content = `系统：负责人由${oldUser ? oldUser.name : '未分配'}变更为${newUser ? newUser.name : '未知'}。原因：${assignmentReason || '未填写'}`;

    await this.customerFollowUpModel.create({
      customerId: new Types.ObjectId(customerId),
      type: 'other' as any,
      content,
      createdBy: new Types.ObjectId(adminUserId),
    } as any);

    // 发送微信通知给被分配的员工
    await this.sendAssignmentNotification(updated, targetUser as any, assignmentReason);

    return updated;
  }

  // 获取可分配的用户列表
  async getAssignableUsers(): Promise<Array<Pick<User, any>>> {
    const users = await this.userModel
      .find({ active: true, role: { $in: ['employee', 'manager'] } })
      .select('_id name username role department')
      .sort({ name: 1 })
      .lean();
    return users as any;
  }

  // 获取客户的分配历史
  async getAssignmentLogs(customerId: string) {
    const logs = await this.assignmentLogModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .populate('oldAssignedTo', 'name username')
      .populate('newAssignedTo', 'name username')
      .populate('assignedBy', 'name username')
      .sort({ assignedAt: -1 })
      .lean()
      .exec();

    // 转换字段名以匹配前端期望
    return logs.map(log => ({
      ...log,
      oldAssignedToUser: log.oldAssignedTo,
      newAssignedToUser: log.newAssignedTo,
      assignedByUser: log.assignedBy,
    }));
  }

  // 获取客户跟进记录
  async getFollowUps(customerId: string): Promise<CustomerFollowUp[]> {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    return await this.customerFollowUpModel
      .find({ customerId })
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 })
      .exec();
  }

  // 发送分配通知
  private async sendAssignmentNotification(customer: Customer, targetUser: any, assignmentReason?: string): Promise<void> {
    try {
      // 检查用户是否绑定了微信
      if (!targetUser.wechatOpenId) {
        console.log(`用户 ${targetUser.name} 未绑定微信，跳过通知发送`);
        return;
      }

      // 构建客户详情页面URL
      const detailUrl = `${process.env.FRONTEND_URL || 'https://crm.andejiazheng.com'}/customers/${(customer as any)._id}`;

      // 发送微信通知
      await this.wechatService.sendLeadAssignmentNotification(
        targetUser.wechatOpenId,
        {
          name: customer.name,
          phone: customer.phone,
          leadSource: customer.leadSource,
          serviceCategory: customer.serviceCategory || '未指定',
          assignedAt: new Date().toLocaleString('zh-CN'),
          assignmentReason: assignmentReason,
        },
        detailUrl
      );

      console.log(`微信通知发送成功：${targetUser.name} (${customer.name})`);
    } catch (error) {
      console.error(`发送微信通知失败：${error.message}`, error);
      // 不抛出错误，避免影响主业务流程
    }
  }
}