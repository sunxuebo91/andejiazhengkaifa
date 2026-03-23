import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../models/customer.model';
import { CustomerFollowUp } from '../models/customer-follow-up.entity';
import { User } from '../../users/models/user.entity';
import { CustomerQueryDto } from '../dto/customer-query.dto';
import { AppLogger } from '../../../common/logging/app-logger';
import { CustomerFollowUpStatusService } from './customer-follow-up-status.service';

@Injectable()
export class CustomerQueryService {
  private readonly logger = new AppLogger(CustomerQueryService.name);

  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(CustomerFollowUp.name) private readonly customerFollowUpModel: Model<CustomerFollowUp>,
    private readonly customerFollowUpStatusService: CustomerFollowUpStatusService,
  ) {}

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
      followUpStatus,
      ...filters
    } = query as any;

    const searchConditions = await this.buildSearchConditions(
      {
        search,
        caregiverName,
        caregiverPhone,
        createdStartDate,
        createdEndDate,
        assignedStartDate,
        assignedEndDate,
        filters,
      },
      currentUserId,
    );

    const skip = (page - 1) * limit;

    this.logger.debug('customer.list.query_start', {
      page,
      limit,
      sortBy,
      sortOrder,
      followUpStatus,
      searchConditions,
    });

    if (followUpStatus) {
      return this.findAllWithFollowUpStatusFilter(searchConditions, followUpStatus, page, limit, skip);
    }

    const [customers, total] = await Promise.all([
      this.customerModel
        .find(searchConditions)
        .sort(this.buildSortOption(sortBy, sortOrder))
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', '_id name username')
        .lean()
        .exec(),
      this.customerModel.countDocuments(searchConditions).exec(),
    ]);

    const sortedCustomers = (customers || []).sort((a: any, b: any) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    const customerIds = sortedCustomers.map((customer: any) => customer._id);
    const allFollowUps = await this.customerFollowUpModel
      .find({ customerId: { $in: customerIds } })
      .select('customerId createdBy type content')
      .populate('createdBy', '_id')
      .lean()
      .exec();

    const followUpMap = new Map<string, any[]>();
    allFollowUps.forEach((followUp: any) => {
      const key = followUp.customerId.toString();
      if (!followUpMap.has(key)) {
        followUpMap.set(key, []);
      }
      followUpMap.get(key)!.push(followUp);
    });

    const customersWithFollowUpStatus = sortedCustomers.map((customer: any) => {
      const followUps = followUpMap.get(customer._id.toString()) || [];
      const assignedToId = customer.assignedTo?._id?.toString() || customer.assignedTo?.toString();
      const calculatedFollowUpStatus = this.customerFollowUpStatusService.calculateFollowUpStatus(
        customer,
        followUps,
        assignedToId,
      );

      return {
        ...customer,
        assignedToUser: customer.assignedTo ? {
          name: customer.assignedTo.name,
          username: customer.assignedTo.username,
        } : null,
        followUpStatus: calculatedFollowUpStatus,
      };
    });

    this.logger.info('customer.list.query_result', {
      currentUserId,
      returned: customersWithFollowUpStatus.length,
      total,
      firstCustomerId: customersWithFollowUpStatus[0]?._id?.toString?.() || customersWithFollowUpStatus[0]?._id || null,
      searchConditions,
    });

    return {
      customers: customersWithFollowUpStatus as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async searchForESign(search: string, limit = 10): Promise<Customer[]> {
    if (!search) {
      return [];
    }

    const searchConditions: any = {
      inPublicPool: false,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { phone: search.trim() },
        { wechatId: { $regex: search, $options: 'i' } },
        { wechatId: search.trim() },
      ],
    };

    return this.customerModel
      .find(searchConditions)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .populate('assignedTo', 'name username')
      .lean()
      .exec() as any;
  }

  private buildSortOption(sortBy: string, sortOrder: 'asc' | 'desc' | string): Record<string, 1 | -1> {
    const direction: 1 | -1 = sortOrder === 'asc' ? 1 : -1;
    const allowedSortFields = new Set(['createdAt', 'updatedAt', 'name', 'phone']);
    const primaryField = allowedSortFields.has(sortBy) ? sortBy : 'updatedAt';

    if (primaryField === 'updatedAt') {
      return { updatedAt: direction, createdAt: direction };
    }

    return { [primaryField]: direction, updatedAt: -1 } as Record<string, 1 | -1>;
  }

  private async buildSearchConditions(
    params: {
      search?: string;
      caregiverName?: string;
      caregiverPhone?: string;
      createdStartDate?: string;
      createdEndDate?: string;
      assignedStartDate?: string;
      assignedEndDate?: string;
      filters: Record<string, any>;
    },
    currentUserId?: string,
  ): Promise<Record<string, any>> {
    const {
      search,
      caregiverName,
      caregiverPhone,
      createdStartDate,
      createdEndDate,
      assignedStartDate,
      assignedEndDate,
      filters,
    } = params;

    const searchConditions: any = {
      inPublicPool: false,
    };

    if (!search) {
      if (!filters.contractStatus || filters.contractStatus !== '流失客户') {
        searchConditions.contractStatus = { $ne: '流失客户' };
      }
    }

    if (search) {
      searchConditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { phone: search.trim() },
        { wechatId: { $regex: search, $options: 'i' } },
        { wechatId: search.trim() },
      ];
    }

    if (filters.name) {
      searchConditions.name = { $regex: filters.name, $options: 'i' };
    }

    if (filters.phone) {
      searchConditions.$or = [
        { phone: { $regex: filters.phone, $options: 'i' } },
        { phone: filters.phone.trim() },
      ];
    }

    if (caregiverName) {
      searchConditions.caregiverName = { $regex: caregiverName, $options: 'i' };
    }

    if (caregiverPhone) {
      searchConditions.caregiverPhone = { $regex: caregiverPhone, $options: 'i' };
    }

    if (createdStartDate || createdEndDate) {
      searchConditions.createdAt = {};
      if (createdStartDate) {
        searchConditions.createdAt.$gte = new Date(createdStartDate);
      }
      if (createdEndDate) {
        const endDate = new Date(createdEndDate);
        endDate.setHours(23, 59, 59, 999);
        searchConditions.createdAt.$lte = endDate;
      }
    }

    if (assignedStartDate || assignedEndDate) {
      searchConditions.assignedAt = {};
      if (assignedStartDate) {
        searchConditions.assignedAt.$gte = new Date(assignedStartDate);
      }
      if (assignedEndDate) {
        const endDate = new Date(assignedEndDate);
        endDate.setHours(23, 59, 59, 999);
        searchConditions.assignedAt.$lte = endDate;
      }
    }

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

    Object.keys(filters).forEach((key) => {
      if (!filters[key]) {
        return;
      }
      if (key === 'assignedTo') {
        searchConditions[key] = new Types.ObjectId(filters[key]);
        return;
      }
      if (!['leadStatus', 'name', 'phone', 'sortBy', 'sortOrder'].includes(key)) {
        searchConditions[key] = filters[key];
      }
    });

    if (currentUserId) {
      const currentUser = await this.userModel.findById(currentUserId).select('role').lean();
      const role = (currentUser as any)?.role;
      // 普通员工、派单老师、招生老师只能看自己负责（assignedTo）或创建（createdBy）的客户
      const isRestrictedRole = ['employee', '普通员工', 'dispatch', 'admissions'].includes(role);
      if (isRestrictedRole) {
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

    return searchConditions;
  }

  private async findAllWithFollowUpStatusFilter(
    searchConditions: any,
    followUpStatus: string,
    page: number,
    limit: number,
    skip: number,
  ): Promise<{
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const systemKeywordRegex = ['创建', '分配', '领取', '释放', '流转', '自动', '系统'].join('|');

    const pipeline: any[] = [
      { $match: searchConditions },
      {
        $lookup: {
          from: 'customer_follow_ups',
          localField: '_id',
          foreignField: 'customerId',
          as: 'allFollowUps',
        },
      },
      {
        $addFields: {
          validFollowUps: {
            $filter: {
              input: '$allFollowUps',
              as: 'f',
              cond: {
                $not: {
                  $regexMatch: {
                    input: { $ifNull: ['$$f.content', ''] },
                    regex: systemKeywordRegex,
                    options: 'i',
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          hasAnyFollowUp: { $gt: [{ $size: '$validFollowUps' }, 0] },
          hasOwnerFollowUp: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$validFollowUps',
                    as: 'f',
                    cond: { $eq: ['$$f.createdBy', '$assignedTo'] },
                  },
                },
              },
              0,
            ],
          },
          transferCountVal: { $ifNull: ['$transferCount', 0] },
        },
      },
      {
        $addFields: {
          calculatedFollowUpStatus: {
            $cond: {
              if: {
                $or: [
                  { $eq: ['$contractStatus', '已签约'] },
                  { $eq: ['$leadLevel', 'O类'] },
                ],
              },
              then: null,
              else: {
                $cond: {
                  if: '$hasOwnerFollowUp',
                  then: this.customerFollowUpStatusService.labels.followed,
                  else: this.customerFollowUpStatusService.labels.new,
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          calculatedFollowUpStatus: {
            $cond: {
              if: { $ne: ['$calculatedFollowUpStatus', this.customerFollowUpStatusService.labels.new] },
              then: '$calculatedFollowUpStatus',
              else: {
                $cond: {
                  if: { $gt: ['$transferCountVal', 0] },
                  then: this.customerFollowUpStatusService.labels.transferred,
                  else: this.customerFollowUpStatusService.labels.new,
                },
              },
            },
          },
        },
      },
      { $match: { calculatedFollowUpStatus: followUpStatus } },
    ];

    const [countResult, customers] = await Promise.all([
      this.customerModel.aggregate([...pipeline, { $count: 'total' }]).exec(),
      this.customerModel.aggregate([
        ...pipeline,
        { $sort: { updatedAt: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'assignedTo',
            foreignField: '_id',
            as: 'assignedToInfo',
          },
        },
        {
          $addFields: {
            assignedTo: { $arrayElemAt: ['$assignedToInfo', 0] },
          },
        },
        {
          $project: {
            allFollowUps: 0,
            validFollowUps: 0,
            hasAnyFollowUp: 0,
            hasOwnerFollowUp: 0,
            transferCountVal: 0,
            assignedToInfo: 0,
          },
        },
      ]).exec(),
    ]);

    const total = countResult[0]?.total || 0;
    const formattedCustomers = customers.map((customer: any) => ({
      ...customer,
      followUpStatus: customer.calculatedFollowUpStatus,
      assignedToUser: customer.assignedTo ? {
        _id: customer.assignedTo._id,
        name: customer.assignedTo.name,
        username: customer.assignedTo.username,
      } : null,
      calculatedFollowUpStatus: undefined,
    }));

    this.logger.debug('customer.list.followup_filter_result', {
      total,
      returned: formattedCustomers.length,
      followUpStatus,
    });

    return {
      customers: formattedCustomers as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
