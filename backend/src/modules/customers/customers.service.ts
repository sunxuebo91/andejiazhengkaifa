import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
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
import { PublicPoolLog } from './models/public-pool-log.model';
import { CustomerOperationLog } from './models/customer-operation-log.model';
import { PublicPoolQueryDto } from './dto/public-pool.dto';
import { NotificationHelperService } from '../notification/notification-helper.service';
import { Contract } from '../contracts/models/contract.model';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import axios from 'axios';


@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(CustomerFollowUp.name) private customerFollowUpModel: Model<CustomerFollowUp>,
    @InjectModel(CustomerAssignmentLog.name) private assignmentLogModel: Model<CustomerAssignmentLog>,
    @InjectModel(PublicPoolLog.name) private publicPoolLogModel: Model<PublicPoolLog>,
    @InjectModel(CustomerOperationLog.name) private operationLogModel: Model<CustomerOperationLog>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    private wechatService: WeChatService,
    private notificationHelper: NotificationHelperService,
  ) {}

  /**
   * 记录客户操作日志
   * @param customerId 客户ID
   * @param operatorId 操作人ID
   * @param operationType 操作类型
   * @param operationName 操作名称（中文）
   * @param details 操作详情
   */
  async logOperation(
    customerId: string | Types.ObjectId,
    operatorId: string,
    operationType: string,
    operationName: string,
    details?: {
      before?: Record<string, any>;
      after?: Record<string, any>;
      description?: string;
      relatedId?: string;
      relatedType?: string;
    }
  ): Promise<void> {
    try {
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

  /**
   * 获取客户操作日志
   * @param customerId 客户ID
   */
  async getOperationLogs(customerId: string): Promise<any[]> {
    const logs = await this.operationLogModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .populate('operatorId', 'name username')
      .sort({ operatedAt: -1 })
      .lean()
      .exec();

    return logs.map(log => ({
      ...log,
      operator: log.operatorId,
    }));
  }

  /**
   * 判断跟进记录是否为系统自动生成的记录
   * 系统记录不算作有效跟进，只有员工手动填写的才算
   * @param followUp 跟进记录
   * @returns 是否为系统记录
   */
  private isSystemFollowUp(followUp: any): boolean {
    // 系统记录的特征：
    // 1. type 为 'other' 且 content 以 "系统" 开头
    // 2. content 包含系统自动流转相关的关键词
    const content = followUp.content || '';
    const type = followUp.type || '';

    // 检查是否为系统自动生成的记录
    if (type === 'other' && (
      content.startsWith('系统：') ||
      content.startsWith('系统:') ||
      content.includes('系统自动流转') ||
      content.includes('负责人由') && content.includes('变更为')
    )) {
      return true;
    }

    return false;
  }

  /**
   * 计算客户的跟进状态
   * @param customer 客户对象
   * @param followUps 跟进记录列表
   * @param assignedToId 可选的负责人ID（用于列表查询时传入）
   * @returns 跟进状态标签：'新客未跟进' | '流转未跟进' | '已跟进'
   */
  private calculateFollowUpStatus(customer: any, followUps: any[], assignedToId?: string): string | null {
    // 检查当前负责人是否做过跟进
    let hasOwnerFollowUp = false;

    // 如果传入了 assignedToId，直接使用
    let currentAssignedToId = assignedToId;

    // 如果没有传入，尝试从 customer.assignedTo 中提取
    if (!currentAssignedToId && customer.assignedTo) {
      if (typeof customer.assignedTo === 'object') {
        // 可能是 populated 的对象，尝试获取 _id
        currentAssignedToId = customer.assignedTo._id?.toString() || customer.assignedTo.toString();
      } else {
        // 是 ObjectId 字符串
        currentAssignedToId = customer.assignedTo.toString();
      }
    }

    if (currentAssignedToId) {
      // 过滤掉系统自动生成的记录，只保留员工手动填写的有效跟进记录
      const validFollowUps = followUps ? followUps.filter(f => !this.isSystemFollowUp(f)) : [];

      // 检查是否有当前负责人创建的有效跟进记录
      hasOwnerFollowUp = validFollowUps.length > 0 && validFollowUps.some(followUp => {
        const createdById = typeof followUp.createdBy === 'object'
          ? followUp.createdBy._id?.toString()
          : followUp.createdBy.toString();
        return createdById === currentAssignedToId;
      });
    }

    // 判断是流转线索还是新客线索
    const transferCount = customer.transferCount || 0;

    // 如果当前负责人已经做过有效跟进，显示"已跟进"
    if (hasOwnerFollowUp) {
      return '已跟进';
    }

    // 如果线索被流转过（transferCount > 0），显示"流转未跟进"
    if (transferCount > 0) {
      return '流转未跟进';
    }

    // 如果是新客（transferCount = 0），显示"新客未跟进"
    return '新客未跟进';
  }

  /**
   * 获取客户的跟进状态（公开方法，供API调用）
   * @param customerId 客户ID
   * @returns 跟进状态信息
   */
  async getFollowUpStatus(customerId: string): Promise<{
    customerId: string;
    customerName: string;
    followUpStatus: string | null;
    transferCount: number;
    hasFollowUp: boolean;
    currentOwnerHasFollowUp: boolean;
  }> {
    // 获取客户信息
    const customer = await this.customerModel.findById(customerId).lean().exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 获取跟进记录 - 同时支持 ObjectId 和字符串格式（历史数据兼容）
    const followUps = await this.customerFollowUpModel
      .find({
        $or: [
          { customerId: customer._id },
          { customerId: customerId }
        ]
      })
      .populate('createdBy', '_id name username')
      .lean()
      .exec();

    // 过滤掉系统自动生成的记录，只保留员工手动填写的有效跟进记录
    const validFollowUps = followUps.filter(f => !this.isSystemFollowUp(f));

    // 计算跟进状态
    const followUpStatus = this.calculateFollowUpStatus(customer, followUps);

    // 检查当前负责人是否做过有效跟进（不包括系统记录）
    let currentOwnerHasFollowUp = false;
    if (customer.assignedTo) {
      const assignedToId = typeof customer.assignedTo === 'object'
        ? (customer.assignedTo as any)._id?.toString()
        : (customer.assignedTo as any).toString();

      currentOwnerHasFollowUp = validFollowUps.some(followUp => {
        const createdById = typeof followUp.createdBy === 'object'
          ? (followUp.createdBy as any)._id?.toString()
          : (followUp.createdBy as any).toString();
        return createdById === assignedToId;
      });
    }

    return {
      customerId: customer._id.toString(),
      customerName: customer.name,
      followUpStatus,
      transferCount: customer.transferCount || 0,
      hasFollowUp: validFollowUps.length > 0,  // 只计算有效跟进记录
      currentOwnerHasFollowUp,
    };
  }

  // 生成客户ID
  private generateCustomerId(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CUS${timestamp.slice(-8)}${random}`;
  }

  // 手机号脱敏
  private maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 11) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  // 创建客户（支持创建时指定负责人，未指定则默认分配给创建人）
  async create(createCustomerDto: CreateCustomerDto, userId: string): Promise<Customer> {
    // 验证手机号或微信号至少填一个
    const phone = createCustomerDto.phone?.trim();
    const wechatId = createCustomerDto.wechatId?.trim();
    if (!phone && !wechatId) {
      throw new BadRequestException('请填写手机号或微信号');
    }

    // 检查手机号是否已存在（只有当手机号不为空时才检查）
    if (phone) {
      const existingCustomer = await this.customerModel.findOne({ phone: createCustomerDto.phone });
      if (existingCustomer) {
        throw new ConflictException('该手机号已存在客户记录');
      }
    }

    const customerId = this.generateCustomerId();

    const now = new Date();
    const dtoAny: any = createCustomerDto as any;
    const hasAssignedTo = !!dtoAny.assignedTo;
    const assignedToUserId = hasAssignedTo ? dtoAny.assignedTo : userId;

    const customerData: any = {
      ...createCustomerDto,
      customerId,
      createdBy: userId,
      expectedStartDate: createCustomerDto.expectedStartDate ? new Date(createCustomerDto.expectedStartDate) : undefined,
      expectedDeliveryDate: createCustomerDto.expectedDeliveryDate ? new Date(createCustomerDto.expectedDeliveryDate) : undefined,
      // 分配信息（确保转换为 ObjectId）
      assignedTo: new Types.ObjectId(assignedToUserId),
      assignedBy: new Types.ObjectId(userId),
      assignedAt: now,
      assignmentReason: hasAssignedTo ? (dtoAny.assignmentReason || '创建时指定负责人') : '创建默认分配给创建人',
      // 活动时间追踪
      lastActivityAt: now,
    };

    const customer = new this.customerModel(customerData);
    const savedCustomer = await customer.save();

    // 📝 记录操作日志 - 创建客户
    await this.logOperation(
      savedCustomer._id.toString(),
      userId,
      'create',
      '创建客户',
      {
        description: `创建客户：${savedCustomer.name}`,
        after: {
          name: savedCustomer.name,
          phone: this.maskPhoneNumber(savedCustomer.phone),
          leadSource: savedCustomer.leadSource,
          contractStatus: savedCustomer.contractStatus,
          leadLevel: savedCustomer.leadLevel,
        }
      }
    );

    // 🔔 发送客户分配通知（如果分配给其他人或自己）
    try {
      await this.notificationHelper.notifyCustomerAssigned(assignedToUserId, {
        customerId: savedCustomer._id.toString(),
        customerName: savedCustomer.name,
        phone: this.maskPhoneNumber(savedCustomer.phone),
        leadSource: savedCustomer.leadSource,
      });
      this.logger.log(`✅ 客户创建通知已发送: ${savedCustomer.name} -> 用户ID: ${assignedToUserId}`);
    } catch (err) {
      this.logger.error(`❌ 发送客户创建通知失败: ${err.message}`);
    }

    return savedCustomer;
  }

  // 获取客户列表（支持搜索和分页 + 角色可见性 + 指定负责人过滤）
  async findAll(query: CustomerQueryDto, currentUserId?: string): Promise<{
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      search,
      caregiverName,
      caregiverPhone,
      page = 1,
      limit = 10,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      createdStartDate,
      createdEndDate,
      assignedStartDate,
      assignedEndDate,
      ...filters
    } = query as any;

    const searchConditions: any = {};

    // 🔥 [FIX] 客户列表应该只显示非公海客户
    searchConditions.inPublicPool = false;

    // 🔥 [OPTIMIZATION] 如果用户主动搜索（输入了关键词），则搜索所有客户（包括流失客户）
    // 如果没有搜索关键词，则排除流失客户（除非用户主动筛选流失客户）
    if (!search) {
      // 没有搜索关键词时，排除流失客户（流失客户只在公海显示）
      // 注意：如果用户主动筛选 contractStatus='流失客户'，则允许显示
      if (!filters.contractStatus || filters.contractStatus !== '流失客户') {
        searchConditions.contractStatus = { $ne: '流失客户' };
      }
    }

    // 构建搜索条件（支持姓名、电话、微信号）
    if (search) {
      searchConditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { phone: (search || '').trim() }, // 添加精确匹配
        { wechatId: { $regex: search, $options: 'i' } }, // 微信号模糊搜索
        { wechatId: (search || '').trim() }, // 微信号精确匹配
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

    // 线索创建时间范围筛选
    if (createdStartDate || createdEndDate) {
      searchConditions.createdAt = {};
      if (createdStartDate) {
        searchConditions.createdAt.$gte = new Date(createdStartDate);
      }
      if (createdEndDate) {
        // 设置为当天的23:59:59
        const endDate = new Date(createdEndDate);
        endDate.setHours(23, 59, 59, 999);
        searchConditions.createdAt.$lte = endDate;
      }
    }

    // 线索分配时间范围筛选
    if (assignedStartDate || assignedEndDate) {
      searchConditions.assignedAt = {};
      if (assignedStartDate) {
        searchConditions.assignedAt.$gte = new Date(assignedStartDate);
      }
      if (assignedEndDate) {
        // 设置为当天的23:59:59
        const endDate = new Date(assignedEndDate);
        endDate.setHours(23, 59, 59, 999);
        searchConditions.assignedAt.$lte = endDate;
      }
    }

    // 线索状态筛选：通过 transferCount 判断
    if (filters.leadStatus === '已流转') {
      searchConditions.transferCount = { $gt: 0 };
      delete filters.leadStatus;
    } else if (filters.leadStatus === '未流转') {
      searchConditions.$and = (searchConditions.$and || []).concat([
        {
          $or: [
            { transferCount: { $exists: false } },
            { transferCount: 0 },
          ],
        },
      ]);
      delete filters.leadStatus;
    }

    // 其他筛选条件（包含 assignedTo 等）
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        // 如果是 assignedTo，需要转换为 ObjectId
        if (key === 'assignedTo') {
          searchConditions[key] = new Types.ObjectId(filters[key]);
        } else if (key !== 'leadStatus') {
          searchConditions[key] = filters[key];
        }
      }
    });

    // 基于角色的可见性控制
    if (currentUserId) {
      const currentUser = await this.userModel.findById(currentUserId).select('role').lean();
      const role = (currentUser as any)?.role;
      // 检查是否是普通员工（兼容 'employee' 和 '普通员工'）
      const isEmployee = role === 'employee' || role === '普通员工';
      if (isEmployee) {
        // 员工默认仅能看到自己负责或自己创建的客户
        searchConditions.$and = (searchConditions.$and || []).concat([
          {
            $or: [
              { assignedTo: new Types.ObjectId(currentUserId) },
              { assignedTo: currentUserId },
              { createdBy: new Types.ObjectId(currentUserId) },
              { createdBy: currentUserId },
            ],
          },
        ]);
      }
    }

    const skip = (page - 1) * limit;

    // 🔥 [CUSTOMER-SORT-FIX] 强制按更新时间倒序排序，与简历列表保持一致
    console.log(`🔥🔥🔥 [CUSTOMER-DEBUG] 开始查询客户列表 - page: ${page}, limit: ${limit}, sortBy: ${sortBy}`);
    console.log(`🔥🔥🔥 [CUSTOMER-DEBUG] 查询条件:`, JSON.stringify(searchConditions));

    const findQuery = this.customerModel
      .find(searchConditions)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', '_id name username')
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

    // 🔥 转换 assignedTo 为 assignedToUser 格式，并计算跟进状态
    const customersWithFollowUpStatus = await Promise.all(
      sortedCustomers.map(async (customer: any) => {
        // 获取该客户的跟进记录 - 使用 customer._id (ObjectId) 查询
        const followUps = await this.customerFollowUpModel
          .find({ customerId: customer._id })
          .populate('createdBy', '_id name username')
          .lean()
          .exec();

        // 提取 assignedToId（因为 customer.assignedTo 已经被 populate 了）
        const assignedToId = customer.assignedTo?._id?.toString() || customer.assignedTo?.toString();

        // 计算跟进状态，传入正确的 assignedToId
        const followUpStatus = this.calculateFollowUpStatus(customer, followUps, assignedToId);

        return {
          ...customer,
          assignedToUser: customer.assignedTo ? {
            name: customer.assignedTo.name,
            username: customer.assignedTo.username
          } : null,
          followUpStatus
        };
      })
    );

    return {
      customers: customersWithFollowUpStatus,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 🔥 电子签名专用搜索：包含所有状态的客户（包括流失客户）
  async searchForESign(search: string, limit: number = 10): Promise<Customer[]> {
    if (!search) {
      return [];
    }

    const searchConditions: any = {
      inPublicPool: false, // 只搜索非公海客户
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { phone: (search || '').trim() }, // 精确匹配
        { wechatId: { $regex: search, $options: 'i' } },
        { wechatId: (search || '').trim() },
      ],
    };

    // 🔥 注意：不过滤 contractStatus，允许搜索所有状态的客户（包括流失客户）
    const customers = await this.customerModel
      .find(searchConditions)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .populate('assignedTo', 'name username')
      .lean()
      .exec();

    return customers as any;
  }

  // 根据ID获取客户详情（包含跟进记录）
  async findOne(id: string): Promise<Customer & {
    createdByUser?: { name: string; username: string } | null;
    lastUpdatedByUser?: { name: string; username: string } | null;
    assignedToUser?: { name: string; username: string } | null;
    assignedByUser?: { name: string; username: string } | null;
    followUps?: CustomerFollowUp[];
    followUpStatus?: string | null;
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

    // 获取跟进记录 - 同时支持 ObjectId 和字符串格式的 customerId（历史数据兼容）
    // 🔧 过滤掉系统自动生成的记录，只返回员工手动填写的跟进记录
    const allFollowUps = await this.customerFollowUpModel
      .find({
        $or: [
          { customerId: customer._id },  // ObjectId 格式
          { customerId: id }              // 字符串格式（历史数据兼容）
        ]
      })
      .populate('createdBy', '_id name username')
      .sort({ createdAt: -1 })
      .exec();

    // 过滤掉系统记录（type='other' 且内容以"系统"开头的记录）
    const followUps = allFollowUps.filter(followUp => !this.isSystemFollowUp(followUp));

    // 计算跟进状态
    const followUpStatus = this.calculateFollowUpStatus(customer.toObject(), followUps);

    return {
      ...customer.toObject(),
      createdByUser: createdByUser ? { name: createdByUser.name, username: createdByUser.username } : null,
      lastUpdatedByUser: lastUpdatedByUser ? { name: lastUpdatedByUser.name, username: lastUpdatedByUser.username } : null,
      assignedToUser: assignedToUser ? { name: assignedToUser.name, username: assignedToUser.username } : null,
      assignedByUser: assignedByUser ? { name: assignedByUser.name, username: assignedByUser.username } : null,
      followUps: followUps,
      followUpStatus
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

  // 根据手机号获取客户信息
  async findByPhone(phone: string): Promise<Customer | null> {
    const customer = await this.customerModel.findOne({ phone }).exec();
    return customer;
  }

  // 更新客户信息
  async update(id: string, updateCustomerDto: UpdateCustomerDto, userId?: string): Promise<Customer> {
    // 获取当前客户信息
    const currentCustomer = await this.customerModel.findById(id).exec();
    if (!currentCustomer) {
      throw new NotFoundException('客户不存在');
    }

    // 🔒 权限检查：O类线索等级只能由管理员手动修改
    if (updateCustomerDto.leadLevel === 'O类' && userId) {
      const user = await this.userModel.findById(userId).select('role').lean();
      if (!user || user.role !== 'admin') {
        throw new ForbiddenException('只有管理员可以手动设置线索等级为O类');
      }
    }

    // 验证手机号或微信号至少有一个（考虑更新后的值）
    const updatedPhone = updateCustomerDto.phone !== undefined
      ? updateCustomerDto.phone?.trim()
      : currentCustomer.phone?.trim();
    const updatedWechatId = updateCustomerDto.wechatId !== undefined
      ? updateCustomerDto.wechatId?.trim()
      : currentCustomer.wechatId?.trim();

    if (!updatedPhone && !updatedWechatId) {
      throw new BadRequestException('请填写手机号或微信号');
    }

    // 如果更新手机号，检查是否与其他客户冲突（只有当手机号不为空时才检查）
    if (updateCustomerDto.phone && updateCustomerDto.phone.trim()) {
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

    // 更新活动时间
    updateData.lastActivityAt = new Date();

    const customer = await this.customerModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 📝 记录操作日志 - 编辑客户
    if (userId) {
      // 字段名中英文映射表
      const fieldNameMap: Record<string, string> = {
        'name': '姓名',
        'phone': '电话',
        'wechatId': '微信号',
        'contractStatus': '客户状态',
        'leadLevel': '线索等级',
        'leadSource': '线索来源',
        'serviceCategory': '需求品类',
        'salaryBudget': '薪资预算',
        'serviceAddress': '服务地址',
        'remark': '备注',
        'notes': '备注',
        'remarks': '备注',
        'address': '地址',
        'familySize': '家庭人数',
        'genderRequirement': '性别要求',
        'ageRequirement': '年龄要求',
        'educationRequirement': '学历要求',
        'originRequirement': '籍贯要求',
        'expectedStartDate': '期望上岗时间',
        'expectedDeliveryDate': '预产期',
        'restSchedule': '休息安排',
        'idCardNumber': '身份证号',
        'assignedTo': '负责人',
        'inPublicPool': '公海状态'
      };

      // 构建变更详情
      const changedFields: string[] = [];
      const beforeData: Record<string, any> = {};
      const afterData: Record<string, any> = {};

      // 检测变更的字段（跟踪所有重要字段）
      const fieldsToTrack = [
        'name', 'phone', 'wechatId', 'contractStatus', 'leadLevel', 'leadSource',
        'serviceCategory', 'salaryBudget', 'serviceAddress', 'remark', 'notes', 'remarks',
        'address', 'familySize', 'genderRequirement', 'ageRequirement', 'educationRequirement',
        'originRequirement', 'expectedStartDate', 'expectedDeliveryDate', 'restSchedule',
        'idCardNumber', 'assignedTo', 'inPublicPool'
      ];
      for (const field of fieldsToTrack) {
        const currentValue = currentCustomer[field];
        const newValue = updateCustomerDto[field];
        if (newValue !== undefined && String(currentValue) !== String(newValue)) {
          changedFields.push(field);
          beforeData[field] = currentValue;
          afterData[field] = newValue;
        }
      }

      if (changedFields.length > 0) {
        // 将英文字段名转换为中文
        const changedFieldsInChinese = changedFields.map(field => fieldNameMap[field] || field);

        await this.logOperation(
          id,
          userId,
          'update',
          '编辑客户信息',
          {
            before: beforeData,
            after: afterData,
            description: `修改了: ${changedFieldsInChinese.join('、')}`,
          }
        );
      }
    }

    return customer;
  }

  /**
   * 🆕 自动更新客户线索等级为O类（当合同签约时调用）
   * 此方法由合同服务在检测到合同签约时调用
   * @param customerId 客户ID
   */
  async updateLeadLevelToOOnContractSigned(customerId: string): Promise<void> {
    try {
      this.logger.log(`🔄 检查客户 ${customerId} 是否需要更新线索等级为O类`);

      const customer = await this.customerModel.findById(customerId).exec();
      if (!customer) {
        this.logger.warn(`客户 ${customerId} 不存在，跳过线索等级更新`);
        return;
      }

      // 如果已经是O类，无需更新
      if (customer.leadLevel === 'O类') {
        this.logger.log(`客户 ${customer.name} 已经是O类，无需更新`);
        return;
      }

      const oldLeadLevel = customer.leadLevel;

      // 更新线索等级为O类
      await this.customerModel.findByIdAndUpdate(customerId, {
        leadLevel: 'O类',
        lastActivityAt: new Date(),
      });

      this.logger.log(`✅ 客户 ${customer.name} 线索等级已自动更新: ${oldLeadLevel} -> O类`);

      // 记录操作日志
      await this.logOperation(
        customerId,
        'system', // 系统自动操作
        'update',
        '自动更新线索等级',
        {
          description: `合同签约成功，线索等级自动更新为O类`,
          before: { leadLevel: oldLeadLevel },
          after: { leadLevel: 'O类' },
        }
      );
    } catch (error) {
      this.logger.error(`❌ 自动更新客户线索等级失败:`, error);
      // 不抛出异常，避免影响合同流程
    }
  }

  // 删除客户
  async remove(id: string, userId?: string): Promise<void> {
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 📝 记录操作日志 - 删除客户（在删除前记录）
    if (userId) {
      await this.logOperation(
        id,
        userId,
        'delete',
        '删除客户',
        {
          description: `删除客户：${customer.name}`,
          before: {
            name: customer.name,
            phone: this.maskPhoneNumber(customer.phone),
            contractStatus: customer.contractStatus,
          }
        }
      );
    }

    await this.customerModel.findByIdAndDelete(id).exec();
  }

  // 获取统计信息
  async getStatistics(): Promise<{
    total: number;
    byContractStatus: Record<string, number>;
    byLeadSource: Record<string, number>;
    byServiceCategory: Record<string, number>;
  }> {
    // 🔥 [FIX] 统计信息应该只统计非公海客户
    const [total, byContractStatus, byLeadSource, byServiceCategory] = await Promise.all([
      this.customerModel.countDocuments({ inPublicPool: false }).exec(),
      this.customerModel.aggregate([
        { $match: { inPublicPool: false } },
        { $group: { _id: '$contractStatus', count: { $sum: 1 } } }
      ]).exec(),
      this.customerModel.aggregate([
        { $match: { inPublicPool: false } },
        { $group: { _id: '$leadSource', count: { $sum: 1 } } }
      ]).exec(),
      this.customerModel.aggregate([
        { $match: { inPublicPool: false } },
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

  // 小程序统计：基于筛选条件统计客户数据
  async getFilteredStatisticsForMiniprogram(query: Partial<CustomerQueryDto>): Promise<{
    total: number;
    byContractStatus: Record<string, number>;
    byLeadSource: Record<string, number>;
    byServiceCategory: Record<string, number>;
  }> {
    const searchConditions: any = {
      inPublicPool: false,
    };

    // 关键词搜索：仅姓名、手机号
    if (query.search && query.search.trim()) {
      const keyword = query.search.trim();
      searchConditions.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } },
      ];
    }

    // 指定归属人
    if (query.assignedTo) {
      searchConditions.assignedTo = new Types.ObjectId(query.assignedTo);
    }

    // 线索等级筛选
    if (query.leadLevel) {
      searchConditions.leadLevel = query.leadLevel;
    }

    // 线索状态筛选：通过 transferCount 判断
    if ((query as any).leadStatus === '已流转') {
      searchConditions.transferCount = { $gt: 0 };
    } else if ((query as any).leadStatus === '未流转') {
      searchConditions.$and = (searchConditions.$and || []).concat([
        {
          $or: [
            { transferCount: { $exists: false } },
            { transferCount: 0 },
          ],
        },
      ]);
    }

    const [total, byContractStatus, byLeadSource, byServiceCategory] = await Promise.all([
      this.customerModel.countDocuments(searchConditions).exec(),
      this.customerModel.aggregate([
        { $match: searchConditions },
        { $group: { _id: '$contractStatus', count: { $sum: 1 } } },
      ]).exec(),
      this.customerModel.aggregate([
        { $match: searchConditions },
        { $group: { _id: '$leadSource', count: { $sum: 1 } } },
      ]).exec(),
      this.customerModel.aggregate([
        { $match: searchConditions },
        { $group: { _id: '$serviceCategory', count: { $sum: 1 } } },
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
      customerId: new Types.ObjectId(customerId),  // 确保使用 ObjectId 类型
      ...createFollowUpDto,
      createdBy: new Types.ObjectId(userId),  // 确保使用 ObjectId 类型
    });

    const saved = await followUp.save();

    // 更新客户的最后活动时间
    await this.customerModel.findByIdAndUpdate(customerId, {
      lastActivityAt: new Date(),
      lastFollowUpBy: new Types.ObjectId(userId),
      lastFollowUpTime: new Date(),
    });

    // ⚠️ 注意：跟进记录本身已保存到 customer_follow_ups 表
    // 不需要再记录到操作日志，避免重复显示

    return saved;
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
    if (!['admin', 'employee', 'manager'].includes((targetUser as any).role)) {
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
        lastActivityAt: now, // 更新活动时间
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

    // 📝 记录操作日志 - 分配客户
    const oldUser = oldAssignedTo ? await this.userModel.findById(oldAssignedTo).select('name username').lean() : null;
    const newUser = await this.userModel.findById(assignedTo).select('name username').lean();

    await this.logOperation(
      customerId,
      adminUserId,
      'assign',
      '分配客户',
      {
        description: `负责人由${oldUser ? oldUser.name : '未分配'}变更为${newUser ? newUser.name : '未知'}。原因：${assignmentReason || '未填写'}`,
        before: {
          assignedTo: oldUser ? oldUser.name : '未分配',
        },
        after: {
          assignedTo: newUser ? newUser.name : '未知',
        },
      }
    );

	    // 🔔 发送站内通知（保留站内/Socket 通知即可）
    await this.notificationHelper.notifyCustomerAssigned(assignedTo, {
      customerId: customerId,
      customerName: updated.name,
      phone: this.maskPhoneNumber(updated.phone),
      leadSource: updated.leadSource,
    }).catch(err => {
      this.logger.error(`发送客户分配通知失败: ${err.message}`);
    });

    // 🔔 发送小程序通知
    await axios.post('https://cloud1-3gasxujzfa738c39.service.tcloudbase.com/quickstartFunctions', {
      type: 'sendCustomerAssignNotify',
      notificationData: {
        assignedToId: assignedTo,
        customerName: updated.name,
        source: assignmentReason || '手动分配',
        assignerName: (adminUser as any).name,
        customerId: updated._id,
        assignTime: updated.assignedAt
      }
    }).catch(e => console.error('通知失败:', e));

    // 📝 记录操作日志 - 分配客户
    await this.logOperation(
      customerId,
      adminUserId,
      'assign',
      '分配负责人',
      {
        before: { assignedTo: oldUser ? oldUser.name : '未分配' },
        after: { assignedTo: newUser ? newUser.name : '未知' },
        description: `将客户分配给 ${newUser ? newUser.name : '未知'}${assignmentReason ? '，原因：' + assignmentReason : ''}`,
      }
    );

    return updated;
  }

  // 批量分配客户
  async batchAssignCustomers(
    customerIds: string[],
    assignedTo: string,
    assignmentReason: string | undefined,
    adminUserId: string
  ): Promise<{ success: number; failed: number; errors: Array<{ customerId: string; error: string }> }> {
    // 验证管理员/经理权限
    const adminUser = await this.userModel.findById(adminUserId).select('role name username active').lean();
    if (!adminUser || !['admin', 'manager'].includes((adminUser as any).role)) {
      throw new ForbiddenException('只有管理员或经理可以批量分配客户');
    }

    // 验证目标用户
    const targetUser = await this.userModel.findById(assignedTo).select('name username role active').lean();
    if (!targetUser) {
      throw new NotFoundException('指定的负责人不存在');
    }
    if ((targetUser as any).active === false) {
      throw new ConflictException('指定的负责人未激活');
    }
    if (!['admin', 'employee', 'manager'].includes((targetUser as any).role)) {
      throw new ConflictException('指定的负责人角色不允许被分配');
    }

    const now = new Date();
    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ customerId: string; error: string }> = [];

    // 批量处理每个客户
    for (const customerId of customerIds) {
      try {
        // 验证客户
        const customer = await this.customerModel.findById(customerId).exec();
        if (!customer) {
          errors.push({ customerId, error: '客户不存在' });
          failedCount++;
          continue;
        }

        const oldAssignedTo = (customer as any).assignedTo ? new Types.ObjectId((customer as any).assignedTo) : undefined;

        // 如果负责人未变化，跳过
        if (oldAssignedTo && oldAssignedTo.toString() === assignedTo) {
          successCount++;
          continue;
        }

        // 更新客户分配信息
        const updated = await this.customerModel.findByIdAndUpdate(
          customerId,
          {
            assignedTo: new Types.ObjectId(assignedTo),
            assignedBy: new Types.ObjectId(adminUserId),
            assignedAt: now,
            assignmentReason: assignmentReason || '',
          },
          { new: true }
        ).exec();

        if (!updated) {
          errors.push({ customerId, error: '更新客户信息失败' });
          failedCount++;
          continue;
        }

        // 记录分配审计日志
        await this.assignmentLogModel.create({
          customerId: new Types.ObjectId(customerId),
          oldAssignedTo,
          newAssignedTo: new Types.ObjectId(assignedTo),
          assignedBy: new Types.ObjectId(adminUserId),
          assignedAt: now,
          reason: assignmentReason,
        } as any);

        // 📝 记录操作日志 - 批量分配客户
        const oldUser = oldAssignedTo ? await this.userModel.findById(oldAssignedTo).select('name username').lean() : null;
        const newUser = await this.userModel.findById(assignedTo).select('name username').lean();

        await this.logOperation(
          customerId,
          adminUserId,
          'batch_assign',
          '批量分配客户',
          {
            description: `负责人由${oldUser ? oldUser.name : '未分配'}变更为${newUser ? newUser.name : '未知'}。原因：${assignmentReason || '未填写'}`,
            before: {
              assignedTo: oldUser ? oldUser.name : '未分配',
            },
            after: {
              assignedTo: newUser ? newUser.name : '未知',
            },
          }
        );

	        // 🔔 发送站内通知（为每个客户单独发送，微信模板消息改由小程序端处理）
        await this.notificationHelper.notifyCustomerAssigned(assignedTo, {
          customerId: customerId,
          customerName: updated.name,
          phone: this.maskPhoneNumber(updated.phone),
          leadSource: updated.leadSource,
        }).catch(err => {
          this.logger.error(`发送客户分配通知失败: ${err.message}`);
        });

        successCount++;
      } catch (error) {
        errors.push({ customerId, error: error.message || '分配失败' });
        failedCount++;
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      errors,
    };
  }

  // 获取可分配的用户列表
  async getAssignableUsers(): Promise<Array<Pick<User, any>>> {
    const users = await this.userModel
      .find({ active: true, role: { $in: ['admin', 'employee', 'manager'] } })
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

  // 获取客户跟进记录（过滤掉系统自动生成的记录）
  async getFollowUps(customerId: string): Promise<CustomerFollowUp[]> {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 同时支持 ObjectId 和字符串格式的 customerId（历史数据兼容）
    const allFollowUps = await this.customerFollowUpModel
      .find({
        $or: [
          { customerId: customer._id },  // ObjectId 格式
          { customerId: customerId }      // 字符串格式（历史数据兼容）
        ]
      })
      .populate('createdBy', '_id name username')
      .sort({ createdAt: -1 })
      .exec();

    // 🔧 过滤掉系统自动生成的记录，只返回员工手动填写的跟进记录
    return allFollowUps.filter(followUp => !this.isSystemFollowUp(followUp));
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

  // 发送批量分配通知
  private async sendBatchAssignmentNotification(count: number, targetUser: any, assignmentReason?: string): Promise<void> {
    try {
      // 检查用户是否绑定了微信
      if (!targetUser.wechatOpenId) {
        console.log(`用户 ${targetUser.name} 未绑定微信，跳过批量分配通知发送`);
        return;
      }

      // 构建客户列表页面URL
      const listUrl = `${process.env.FRONTEND_URL || 'https://crm.andejiazheng.com'}/customers`;

      // 这里可以发送一个汇总通知，告知用户有多少个客户被分配给他
      // 由于现有的通知模板是针对单个客户的，这里暂时记录日志
      // 后续可以添加专门的批量分配通知模板
      console.log(`批量分配通知：${targetUser.name} 被分配了 ${count} 个客户，原因：${assignmentReason || '未填写'}`);

      // TODO: 实现批量分配的微信通知模板
    } catch (error) {
      console.error(`发送批量分配通知失败：${error.message}`, error);
      // 不抛出错误，避免影响主业务流程
    }
  }

  /**
   * 从Excel文件导入客户数据
   * @param filePath Excel文件路径
   * @param userId 当前用户ID
   */
  async importFromExcel(filePath: string, userId: string): Promise<{ success: number; fail: number; errors: string[] }> {
    this.logger.log(`开始处理客户Excel文件导入: ${filePath}`);

    const result = {
      success: 0,
      fail: 0,
      errors: [] as string[]
    };

    try {
      // 使用ExcelJS读取文件
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      // 获取第一个工作表
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new BadRequestException('Excel文件中没有找到工作表');
      }

      // 检查是否有数据
      if (worksheet.rowCount <= 1) {
        throw new BadRequestException('Excel文件中没有数据');
      }

      // 获取表头
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString().trim() || '';
      });

      // 检查必需的列是否存在
      const requiredColumns = ['姓名', '电话', '线索来源'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        throw new BadRequestException(`Excel文件缺少必需的列: ${missingColumns.join(', ')}`);
      }

      // 解析每一行数据
      const promises = [];

      // 从第二行开始，跳过表头
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData: Record<string, any> = {};

        // 获取每个单元格的值
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            rowData[header] = cell.value;
          }
        });

        // 检查必填字段
        if (!rowData['姓名'] || !rowData['电话'] || !rowData['线索来源']) {
          result.fail++;
          result.errors.push(`第 ${rowNumber} 行缺少必填字段`);
          continue;
        }

        // 转换数据为DTO格式
        const customerData = this.mapExcelRowToCustomerDto(rowData, userId);

        // 创建客户(异步)
        promises.push(
          this.create(customerData, userId)
            .then(() => {
              result.success++;
            })
            .catch(error => {
              result.fail++;
              const errorMsg = error.message || '未知错误';
              result.errors.push(`第 ${rowNumber} 行导入失败: ${errorMsg}`);
            })
        );
      }

      // 等待所有创建操作完成
      await Promise.all(promises);

      // 清理临时文件
      fs.unlinkSync(filePath);

      this.logger.log(`客户Excel导入完成，成功: ${result.success}, 失败: ${result.fail}`);
      return result;
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      this.logger.error(`客户Excel导入过程中发生错误: ${error.message}`);
      throw error;
    }
  }

  /**
   * 将Excel行数据映射到客户DTO
   */
  private mapExcelRowToCustomerDto(rowData: Record<string, any>, userId: string): CreateCustomerDto {
    const dto: any = {
      name: rowData['姓名']?.toString().trim(),
      phone: rowData['电话']?.toString().trim(),
      leadSource: rowData['线索来源']?.toString().trim(),
      contractStatus: rowData['客户状态']?.toString().trim() || '待定',
      leadLevel: rowData['线索等级']?.toString().trim() || 'O类', // 默认O类
    };

    // 可选字段
    if (rowData['微信号']) {
      dto.wechatId = rowData['微信号']?.toString().trim();
    }

    if (rowData['身份证号']) {
      dto.idCardNumber = rowData['身份证号']?.toString().trim();
    }

    if (rowData['需求品类']) {
      dto.serviceCategory = rowData['需求品类']?.toString().trim();
    }

    if (rowData['薪资预算']) {
      dto.salaryBudget = Number(rowData['薪资预算']) || undefined;
    }

    if (rowData['期望上户日期']) {
      dto.expectedStartDate = rowData['期望上户日期']?.toString().trim();
    }

    if (rowData['预产期']) {
      dto.expectedDeliveryDate = rowData['预产期']?.toString().trim();
    }

    if (rowData['家庭面积']) {
      dto.homeArea = Number(rowData['家庭面积']) || undefined;
    }

    if (rowData['家庭人口']) {
      dto.familySize = Number(rowData['家庭人口']) || undefined;
    }

    if (rowData['休息制度']) {
      dto.restSchedule = rowData['休息制度']?.toString().trim();
    }

    if (rowData['地址']) {
      dto.address = rowData['地址']?.toString().trim();
    }

    if (rowData['年龄要求']) {
      dto.ageRequirement = rowData['年龄要求']?.toString().trim();
    }

    if (rowData['性别要求']) {
      dto.genderRequirement = rowData['性别要求']?.toString().trim();
    }

    if (rowData['籍贯要求']) {
      dto.originRequirement = rowData['籍贯要求']?.toString().trim();
    }

    if (rowData['学历要求']) {
      dto.educationRequirement = rowData['学历要求']?.toString().trim();
    }

    if (rowData['成交金额']) {
      dto.dealAmount = Number(rowData['成交金额']) || undefined;
    }

    if (rowData['备注']) {
      dto.remarks = rowData['备注']?.toString().trim();
    }

    return dto as CreateCustomerDto;
  }

  // ==================== 公海相关方法 ====================

  // 获取公海客户列表
  async getPublicPoolCustomers(query: PublicPoolQueryDto): Promise<{
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search, leadSource, serviceCategory, leadLevel, minBudget, maxBudget } = query;

    const searchConditions: any = { inPublicPool: true };

    // 搜索条件（支持姓名、电话、微信号）
    if (search) {
      searchConditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { wechatId: { $regex: search, $options: 'i' } },
      ];
    }

    // 筛选条件
    if (leadSource) {
      searchConditions.leadSource = leadSource;
    }
    if (serviceCategory) {
      searchConditions.serviceCategory = serviceCategory;
    }
    if (leadLevel) {
      searchConditions.leadLevel = leadLevel;
    }
    if (minBudget !== undefined || maxBudget !== undefined) {
      searchConditions.salaryBudget = {};
      if (minBudget !== undefined) {
        searchConditions.salaryBudget.$gte = minBudget;
      }
      if (maxBudget !== undefined) {
        searchConditions.salaryBudget.$lte = maxBudget;
      }
    }

    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.customerModel
        .find(searchConditions)
        .sort({ publicPoolEntryTime: -1 }) // 最新进入的排在前面
        .skip(skip)
        .limit(limit)
        .populate('lastFollowUpBy', 'name username')
        .lean()
        .exec(),
      this.customerModel.countDocuments(searchConditions).exec(),
    ]);

    return {
      customers: customers as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 员工领取客户
  async claimCustomers(customerIds: string[], userId: string): Promise<{
    success: number;
    failed: number;
    errors: Array<{ customerId: string; error: string }>;
  }> {
    const user = await this.userModel.findById(userId).select('name username role').lean();
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查用户当前持有的客户数量
    const currentCustomerCount = await this.customerModel.countDocuments({
      assignedTo: new Types.ObjectId(userId),
      inPublicPool: false,
    });

    const maxCustomersPerEmployee = 50; // 可以后续配置化
    const availableSlots = maxCustomersPerEmployee - currentCustomerCount;

    if (availableSlots <= 0) {
      throw new BadRequestException(`您已达到客户持有上限（${maxCustomersPerEmployee}个），无法继续领取`);
    }

    if (customerIds.length > availableSlots) {
      throw new BadRequestException(`您最多还可以领取 ${availableSlots} 个客户`);
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ customerId: string; error: string }> = [];
    const now = new Date();

    for (const customerId of customerIds) {
      try {
        // 查找客户并检查是否在公海中
        const customer = await this.customerModel.findById(customerId).exec();
        if (!customer) {
          errors.push({ customerId, error: '客户不存在' });
          failedCount++;
          continue;
        }

        if (!(customer as any).inPublicPool) {
          errors.push({ customerId, error: '客户不在公海中' });
          failedCount++;
          continue;
        }

        // 更新客户信息
        await this.customerModel.findByIdAndUpdate(
          customerId,
          {
            inPublicPool: false,
            assignedTo: new Types.ObjectId(userId),
            assignedBy: new Types.ObjectId(userId),
            assignedAt: now,
            assignmentReason: '从公海领取',
            leadLevel: null, // 清除"流失"标签，让用户重新评估
            $inc: { claimCount: 1 },
          },
          { new: true }
        ).exec();

        // 记录分配历史
        await this.assignmentLogModel.create({
          customerId: new Types.ObjectId(customerId),
          oldAssignedTo: null, // 从公海领取，没有原负责人
          newAssignedTo: new Types.ObjectId(userId),
          assignedBy: new Types.ObjectId(userId),
          reason: '从公海领取',
          assignedAt: now,
        });

        // 记录公海日志
        await this.publicPoolLogModel.create({
          customerId: new Types.ObjectId(customerId),
          action: 'claim',
          operatorId: new Types.ObjectId(userId),
          toUserId: new Types.ObjectId(userId),
          reason: '员工从公海领取',
          operatedAt: now,
        });

        // 创建系统跟进记录
        await this.customerFollowUpModel.create({
          customerId: new Types.ObjectId(customerId),
          type: 'other' as any,
          content: `系统：${user.name}从公海领取了该客户`,
          createdBy: new Types.ObjectId(userId),
        });

        successCount++;
      } catch (error) {
        errors.push({ customerId, error: error.message || '领取失败' });
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount, errors };
  }

  // 管理员从公海分配客户
  async assignFromPool(customerIds: string[], assignedTo: string, reason: string | undefined, adminUserId: string): Promise<{
    success: number;
    failed: number;
    errors: Array<{ customerId: string; error: string }>;
  }> {
    // 验证管理员权限
    const adminUser = await this.userModel.findById(adminUserId).select('role name username').lean();
    if (!adminUser || !['admin', 'manager'].includes((adminUser as any).role)) {
      throw new ForbiddenException('只有管理员或经理可以从公海分配客户');
    }

    // 验证目标用户
    const targetUser = await this.userModel.findById(assignedTo).select('name username role active').lean();
    if (!targetUser) {
      throw new NotFoundException('指定的负责人不存在');
    }
    if (!(targetUser as any).active) {
      throw new ConflictException('指定的负责人未激活');
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ customerId: string; error: string }> = [];
    const now = new Date();

    for (const customerId of customerIds) {
      try {
        const customer = await this.customerModel.findById(customerId).exec();
        if (!customer) {
          errors.push({ customerId, error: '客户不存在' });
          failedCount++;
          continue;
        }

        if (!(customer as any).inPublicPool) {
          errors.push({ customerId, error: '客户不在公海中' });
          failedCount++;
          continue;
        }

        // 更新客户信息
        await this.customerModel.findByIdAndUpdate(
          customerId,
          {
            inPublicPool: false,
            assignedTo: new Types.ObjectId(assignedTo),
            assignedBy: new Types.ObjectId(adminUserId),
            assignedAt: now,
            assignmentReason: reason || '从公海分配',
            leadLevel: null, // 清除"流失"标签，让用户重新评估
            $inc: { claimCount: 1 },
          },
          { new: true }
        ).exec();

        // 记录分配历史
        await this.assignmentLogModel.create({
          customerId: new Types.ObjectId(customerId),
          oldAssignedTo: null, // 从公海分配，没有原负责人
          newAssignedTo: new Types.ObjectId(assignedTo),
          assignedBy: new Types.ObjectId(adminUserId),
          reason: reason || '从公海分配',
          assignedAt: now,
        });

        // 记录公海日志
        await this.publicPoolLogModel.create({
          customerId: new Types.ObjectId(customerId),
          action: 'assign',
          operatorId: new Types.ObjectId(adminUserId),
          toUserId: new Types.ObjectId(assignedTo),
          reason: reason || '管理员从公海分配',
          operatedAt: now,
        });

        // 创建系统跟进记录
        await this.customerFollowUpModel.create({
          customerId: new Types.ObjectId(customerId),
          type: 'other' as any,
          content: `系统：${adminUser.name}从公海将客户分配给${targetUser.name}。原因：${reason || '未填写'}`,
          createdBy: new Types.ObjectId(adminUserId),
        });

        // 🔔 发送站内通知
        await this.notificationHelper.notifyCustomerAssignedFromPool(assignedTo, {
          customerId: customerId,
          customerName: customer.name,
        }).catch(err => {
          this.logger.error(`发送公海分配通知失败: ${err.message}`);
        });

        successCount++;
      } catch (error) {
        errors.push({ customerId, error: error.message || '分配失败' });
        failedCount++;
      }
    }

    // 发送通知
    if (successCount > 0) {
      await this.sendAssignmentNotification(null, targetUser as any, `从公海分配了${successCount}个客户`);
    }

    return { success: successCount, failed: failedCount, errors };
  }

  // 释放客户到公海
  async releaseToPool(customerId: string, reason: string, userId: string): Promise<Customer> {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    if ((customer as any).inPublicPool) {
      throw new ConflictException('客户已在公海中');
    }

    // 检查是否是负责人或管理员
    const user = await this.userModel.findById(userId).select('role').lean();
    const isOwner = (customer as any).assignedTo?.toString() === userId;
    const isAdmin = user && ['admin', 'manager'].includes((user as any).role);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('只有客户负责人或管理员可以释放客户到公海');
    }

    const now = new Date();
    const oldAssignedTo = (customer as any).assignedTo;
    const releaseReason = reason;

    // 更新客户状态
    const updated = await this.customerModel.findByIdAndUpdate(
      customerId,
      {
        inPublicPool: true,
        publicPoolEntryTime: now,
        publicPoolEntryReason: releaseReason,
        assignedTo: null,
        leadLevel: '流失', // 进入公海时自动设置为"流失"
      },
      { new: true }
    ).exec();

    // 记录公海日志
    await this.publicPoolLogModel.create({
      customerId: new Types.ObjectId(customerId),
      action: 'release',
      operatorId: new Types.ObjectId(userId),
      fromUserId: oldAssignedTo ? new Types.ObjectId(oldAssignedTo) : undefined,
      reason: releaseReason,
      operatedAt: now,
    });

    // 记录分配历史（释放到公海）
    await this.assignmentLogModel.create({
      customerId: new Types.ObjectId(customerId),
      oldAssignedTo: oldAssignedTo ? new Types.ObjectId(oldAssignedTo) : undefined,
      newAssignedTo: undefined, // 释放到公海，新负责人为空
      assignedBy: new Types.ObjectId(userId),
      assignedAt: now,
      reason: releaseReason,
      action: 'release',
    } as any);

    // 创建系统跟进记录
    const operatorUser = await this.userModel.findById(userId).select('name').lean();
    await this.customerFollowUpModel.create({
      customerId: new Types.ObjectId(customerId),
      type: 'other' as any,
      content: `系统：${operatorUser?.name}将客户释放到公海。原因：${releaseReason}`,
      createdBy: new Types.ObjectId(userId),
    });

    // 📝 记录操作日志 - 释放到公海
    await this.logOperation(
      customerId,
      userId,
      'release_to_pool',
      '释放到公海',
      {
        description: `将客户释放到公海，原因：${releaseReason}`,
      }
    );

    return updated;
  }

  // 批量释放到公海
  async batchReleaseToPool(customerIds: string[], reason: string, userId: string): Promise<{
    success: number;
    failed: number;
    errors: Array<{ customerId: string; error: string }>;
  }> {
    const user = await this.userModel.findById(userId).select('role name').lean();
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ customerId: string; error: string }> = [];
    const now = new Date();
    const releaseReason = reason;

    for (const customerId of customerIds) {
      try {
        const customer = await this.customerModel.findById(customerId).exec();
        if (!customer) {
          errors.push({ customerId, error: '客户不存在' });
          failedCount++;
          continue;
        }

        if ((customer as any).inPublicPool) {
          errors.push({ customerId, error: '客户已在公海中' });
          failedCount++;
          continue;
        }

        // 检查权限
        const isOwner = (customer as any).assignedTo?.toString() === userId;
        const isAdmin = ['admin', 'manager'].includes((user as any).role);

        if (!isOwner && !isAdmin) {
          errors.push({ customerId, error: '无权释放此客户' });
          failedCount++;
          continue;
        }

        const oldAssignedTo = (customer as any).assignedTo;

        // 更新客户状态
        await this.customerModel.findByIdAndUpdate(
          customerId,
          {
            inPublicPool: true,
            publicPoolEntryTime: now,
            publicPoolEntryReason: releaseReason,
            assignedTo: null,
            leadLevel: '流失', // 进入公海时自动设置为"流失"
          },
          { new: true }
        ).exec();

        // 记录公海日志
        await this.publicPoolLogModel.create({
          customerId: new Types.ObjectId(customerId),
          action: 'release',
          operatorId: new Types.ObjectId(userId),
          fromUserId: oldAssignedTo ? new Types.ObjectId(oldAssignedTo) : undefined,
          reason: releaseReason,
          operatedAt: now,
        });

        // 记录分配历史（释放到公海）
        await this.assignmentLogModel.create({
          customerId: new Types.ObjectId(customerId),
          oldAssignedTo: oldAssignedTo ? new Types.ObjectId(oldAssignedTo) : undefined,
          newAssignedTo: undefined, // 释放到公海，新负责人为空
          assignedBy: new Types.ObjectId(userId),
          assignedAt: now,
          reason: releaseReason,
          action: 'release',
        } as any);

        // 创建系统跟进记录
        await this.customerFollowUpModel.create({
          customerId: new Types.ObjectId(customerId),
          type: 'other' as any,
          content: `系统：${user.name}将客户释放到公海。原因：${releaseReason}`,
          createdBy: new Types.ObjectId(userId),
        });

        successCount++;
      } catch (error) {
        errors.push({ customerId, error: error.message || '释放失败' });
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount, errors };
  }

  // 获取公海统计数据
  async getPublicPoolStatistics(): Promise<any> {
    const total = await this.customerModel.countDocuments({ inPublicPool: true });

    // 今日进入公海的客户数
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEntered = await this.customerModel.countDocuments({
      inPublicPool: true,
      publicPoolEntryTime: { $gte: todayStart },
    });

    // 今日从公海领取的客户数
    const todayClaimed = await this.publicPoolLogModel.countDocuments({
      action: { $in: ['claim', 'assign'] },
      operatedAt: { $gte: todayStart },
    });

    // 按线索来源统计
    const byLeadSource = await this.customerModel.aggregate([
      { $match: { inPublicPool: true } },
      { $group: { _id: '$leadSource', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // 按线索等级统计
    const byLeadLevel = await this.customerModel.aggregate([
      { $match: { inPublicPool: true } },
      { $group: { _id: '$leadLevel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return {
      total,
      todayEntered,
      todayClaimed,
      byLeadSource: byLeadSource.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byLeadLevel: byLeadLevel.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  // 获取客户的公海历史记录
  async getPublicPoolLogs(customerId: string): Promise<any[]> {
    const logs = await this.publicPoolLogModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .populate('operatorId', 'name username')
      .populate('fromUserId', 'name username')
      .populate('toUserId', 'name username')
      .sort({ operatedAt: -1 })
      .lean()
      .exec();

    return logs;
  }

  // 获取用户当前持有的客户数量
  async getUserCustomerCount(userId: string): Promise<number> {
    return await this.customerModel.countDocuments({
      assignedTo: new Types.ObjectId(userId),
      inPublicPool: false,
    });
  }

  // ==================== 小程序首页统计相关方法 ====================

  // 今日待办统计
  async getTodayTodoStats(userId: string): Promise<any> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    // 今日待跟进客户数（今天需要跟进的客户）
    const todayFollowUpCount = await this.customerModel.countDocuments({
      assignedTo: new Types.ObjectId(userId),
      nextFollowUpDate: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    // 今日已跟进客户数（今天已经跟进过的客户）
    const todayFollowedCount = await this.customerFollowUpModel.countDocuments({
      createdBy: new Types.ObjectId(userId),
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    // 待处理线索数（新分配给我但还未跟进的客户）
    const pendingLeadsCount = await this.customerModel.countDocuments({
      assignedTo: new Types.ObjectId(userId),
      lastFollowUpDate: null,
    });

    // 本月分配客户数（本月分配给该用户的客户）
    const monthAssigned = await this.customerModel.countDocuments({
      assignedTo: new Types.ObjectId(userId),
      assignedAt: { $gte: thisMonthStart },
    });

    // 今日分配客户数（今天分配给该用户的客户）
    const todayAssigned = await this.customerModel.countDocuments({
      assignedTo: new Types.ObjectId(userId),
      assignedAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    // 今日签约合同数（今天该用户签约的合同）
    const todaySigned = await this.contractModel.countDocuments({
      createdBy: new Types.ObjectId(userId),
      contractStatus: 'active',
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    return {
      todayFollowUpCount,
      todayFollowedCount,
      pendingLeadsCount,
      monthAssigned,
      todayAssigned,
      todaySigned,
    };
  }

  // 业绩进度统计
  async getPerformanceProgress(userId: string): Promise<any> {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    // 本月签约数（统计本月创建的active状态合同）
    const monthlySignedCount = await this.contractModel.countDocuments({
      createdBy: new Types.ObjectId(userId),
      contractStatus: 'active',
      createdAt: { $gte: thisMonthStart },
    });

    // 本月业绩金额（统计本月创建的active状态合同的客户服务费总和）
    const monthlyContracts = await this.contractModel.find({
      createdBy: new Types.ObjectId(userId),
      contractStatus: 'active',
      createdAt: { $gte: thisMonthStart },
    }).select('customerServiceFee').lean().exec();

    const monthlyPerformance = monthlyContracts.reduce((sum, contract) => sum + (contract.customerServiceFee || 0), 0);

    // 本月目标（可以从用户配置或固定值获取）
    const monthlyTarget = 100000; // 默认10万，后续可以配置化

    // 完成率
    const completionRate = monthlyTarget > 0 ? (monthlyPerformance / monthlyTarget) * 100 : 0;

    return {
      monthlySignedCount,
      monthlyPerformance,
      monthlyTarget,
      completionRate: Math.round(completionRate * 100) / 100, // 保留2位小数
    };
  }

  // 合同统计
  async getContractStats(userId: string): Promise<any> {
    // 总合同数（该用户创建的所有合同）
    const totalContracts = await this.contractModel.countDocuments({
      createdBy: new Types.ObjectId(userId),
    });

    // 进行中的合同（active状态）
    const activeContracts = await this.contractModel.countDocuments({
      createdBy: new Types.ObjectId(userId),
      contractStatus: 'active',
    });

    // 已完成的合同（这里假设结束日期已过的active合同为已完成，或者可以根据实际业务逻辑调整）
    const now = new Date();
    const completedContracts = await this.contractModel.countDocuments({
      createdBy: new Types.ObjectId(userId),
      contractStatus: 'active',
      endDate: { $lt: now },
    });

    // 待签约的合同（draft或signing状态）
    const pendingContracts = await this.contractModel.countDocuments({
      createdBy: new Types.ObjectId(userId),
      contractStatus: { $in: ['draft', 'signing'] },
    });

    return {
      totalContracts,
      activeContracts,
      completedContracts,
      pendingContracts,
    };
  }
}
