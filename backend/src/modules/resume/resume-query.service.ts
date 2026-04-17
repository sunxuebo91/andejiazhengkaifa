import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, IResume } from './models/resume.entity';
import { Contract, ContractDocument } from '../contracts/models/contract.model';
import { EmployeeEvaluation } from '../employee-evaluation/models/employee-evaluation.entity';
import { OrderStatus } from './dto/create-resume.dto';

@Injectable()
export class ResumeQueryService {
  private readonly logger = new Logger(ResumeQueryService.name);
  private hasCheckedUpdatedAt = false;

  constructor(
    @InjectModel(Resume.name) private readonly resumeModel: Model<IResume>,
    @InjectModel(Contract.name) private readonly contractModel: Model<ContractDocument>,
    @InjectModel(EmployeeEvaluation.name)
    private readonly employeeEvaluationModel: Model<EmployeeEvaluation>,
  ) {}

  private async syncSignedOrderStatus(resumeId: Types.ObjectId | string, currentStatus?: string) {
    if (currentStatus === OrderStatus.ON_SERVICE || currentStatus === OrderStatus.SIGNED) {
      return currentStatus;
    }

    const signedContract = await this.contractModel.findOne({
      workerId: resumeId,
      $or: [
        { esignStatus: { $in: ['1', '2'] } },
        { contractStatus: 'active' },
      ],
    }).select('_id').lean().exec();

    if (!signedContract) {
      return currentStatus;
    }

    await this.resumeModel.updateOne(
      { _id: resumeId },
      { orderStatus: OrderStatus.SIGNED },
    ).exec();

    return OrderStatus.SIGNED;
  }

  async findAll(
    page: number,
    pageSize: number,
    keyword?: string,
    jobType?: string,
    orderStatus?: string,
    maxAge?: number,
    nativePlace?: string,
    ethnicity?: string,
    currentUserId?: string,
    isDraft?: boolean,
    isAdmin?: boolean,
    filterLowQuality?: boolean,
  ) {
    if (!this.hasCheckedUpdatedAt) {
      await this.batchFixMissingUpdatedAt();
      this.hasCheckedUpdatedAt = true;
    }

    const query: any = {};
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } },
        { idNumber: { $regex: keyword, $options: 'i' } },
      ];
    }
    if (jobType) query.jobType = jobType;
    if (orderStatus) query.orderStatus = orderStatus;
    if (maxAge !== undefined && maxAge !== null) query.age = { $lte: maxAge };
    if (nativePlace) query.nativePlace = nativePlace;
    if (ethnicity) query.ethnicity = ethnicity;
    if (isDraft === true) {
      query.isDraft = true;
    } else if (isDraft === false) {
      // 标准简历：isDraft 为 false 或字段不存在（兼容旧数据）
      query.isDraft = { $ne: true };
    }
    // isDraft === undefined 时不加过滤，返回全部

    // ── 褓贝小程序公开列表：过滤掉"无照片且薪资为0"的简历 ──
    // 条件：必须满足（有个人照片 OR 有photoUrls OR 薪资>0）其中之一
    if (filterLowQuality) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { 'personalPhoto.0': { $exists: true } }, // personalPhoto 数组有内容
          { 'photoUrls.0': { $exists: true } },      // photoUrls 数组有内容
          { expectedSalary: { $gt: 0 } },            // 薪资 > 0
        ],
      });
    }

    // ── 推荐来源简历隐藏过滤 ──────────────────────────────
    // isHidden=true 的简历只有「referralAssignedStaffId 对应员工」和「管理员」可见
    // 管理员：跳过过滤；普通员工：只能看到自己归属的或非隐藏的
    if (!isAdmin) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { isHidden: { $ne: true } },                  // 未隐藏的全部可见
          { referralAssignedStaffId: currentUserId },    // 隐藏但归属本人
        ],
      });
    }

    const total = await this.resumeModel.countDocuments(query).exec();

    let items = await this.resumeModel
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('userId', 'username name')
      .lean()
      .exec();

    items = items.sort((a: any, b: any) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    if (items.length > 0) {
      const resumeIds = items.map((item: any) => item._id);
      const signedContracts = await this.contractModel.find({
        workerId: { $in: resumeIds },
        $or: [
          { esignStatus: { $in: ['1', '2'] } },
          { contractStatus: 'active' },
        ],
      }).select('workerId').lean().exec();

      const signedWorkerIds = new Set(signedContracts.map((contract: any) => contract.workerId?.toString()));
      const needUpdateIds = items
        .filter((item: any) => signedWorkerIds.has(item._id?.toString()))
        .filter((item: any) => item.orderStatus !== OrderStatus.ON_SERVICE && item.orderStatus !== OrderStatus.SIGNED)
        .map((item: any) => item._id);

      if (needUpdateIds.length > 0) {
        await this.resumeModel.updateMany(
          { _id: { $in: needUpdateIds } },
          { orderStatus: OrderStatus.SIGNED },
        ).exec();
      }

      items = items.map((item: any) => (
        signedWorkerIds.has(item._id?.toString()) && item.orderStatus !== OrderStatus.ON_SERVICE
          ? { ...item, orderStatus: OrderStatus.SIGNED }
          : item
      ));
    }

    // 已上户（orderStatus=on-service）的简历可见性控制：
    // 月嫂（yuesao）不涉及上户，跳过过滤，始终可见
    // 其他工种：
    // 1. 有有效合同 → 只有管理员和合同归属人能看到
    // 2. 无有效合同 → 状态异常，自动修正为"想接单"（accepting）
    if (items.length > 0) {
      const onServiceItems = items.filter((item: any) => item.orderStatus === 'on-service' && item.phone && item.jobType !== 'yuesao');
      const phoneList = onServiceItems.map((item: any) => item.phone);
      if (phoneList.length > 0) {
        const activeContracts = await this.contractModel.find({
          workerPhone: { $in: phoneList },
          contractStatus: 'active',
        }).select('workerPhone createdBy').lean().exec();

        // phone -> 合同归属人ID
        const contractOwnerMap = new Map<string, string>();
        activeContracts.forEach((contract: any) => {
          const phone = contract.workerPhone;
          const ownerId = contract.createdBy?.toString();
          if (phone && ownerId) {
            contractOwnerMap.set(phone, ownerId);
          }
        });

        // 收集需要自动修正状态的简历ID（已上户但无有效合同）
        const needFixIds: any[] = [];

        items = items.map((item: any) => {
          if (item.orderStatus !== 'on-service' || item.jobType === 'yuesao') return item;
          const contractOwnerId = contractOwnerMap.get(item.phone);
          if (!contractOwnerId) {
            // 已上户但无有效合同 → 状态异常，修正为"想接单"
            needFixIds.push(item._id);
            return { ...item, orderStatus: 'accepting' };
          }
          return item;
        });

        // 异步批量修正数据库中的异常状态
        if (needFixIds.length > 0) {
          this.resumeModel.updateMany(
            { _id: { $in: needFixIds } },
            { orderStatus: 'accepting' },
          ).exec().catch(err => this.logger.error('自动修正已上户状态失败:', err.message));
        }

        // 非管理员：已上户+有效合同的简历只有归属人能看到（月嫂除外）
        if (!isAdmin) {
          items = items.filter((item: any) => {
            if (item.jobType === 'yuesao') return true;
            if (item.orderStatus !== 'on-service') return true;
            const contractOwnerId = contractOwnerMap.get(item.phone);
            if (!contractOwnerId) return true;
            if (currentUserId) return contractOwnerId === currentUserId;
            return false;
          });
        }
      }
    }

    const itemsWithAvatar = items.map((item: any) => {
      // 优先使用工装照作为头像，其次个人照片，最后兼容旧photoUrls
      const uniformUrl = item?.uniformPhoto?.url;
      const firstPersonal = Array.isArray(item?.personalPhoto) && item.personalPhoto.length > 0 ? item.personalPhoto[0]?.url : undefined;
      const firstLegacy = Array.isArray(item?.photoUrls) && item.photoUrls.length > 0 ? item.photoUrls[0] : undefined;
      return { ...item, avatarUrl: uniformUrl || firstPersonal || firstLegacy || '' };
    });

    return {
      items: itemsWithAvatar,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, currentUserId?: string, isAdmin?: boolean) {
    const resume = await this.resumeModel
      .findById(new Types.ObjectId(id))
      .populate('userId', 'username name')
      .exec();

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    // ── 推荐来源简历隐藏拦截 ─────────────────────────────
    if ((resume as any).isHidden && !isAdmin) {
      const assignedStaffId = (resume as any).referralAssignedStaffId;
      if (!currentUserId || currentUserId !== assignedStaffId) {
        throw new NotFoundException('简历不存在');
      }
    }

    // 已上户（orderStatus=on-service）的简历可见性控制
    // 月嫂（yuesao）不涉及上户，跳过过滤
    if (resume.orderStatus === 'on-service' && resume.phone && (resume as any).jobType !== 'yuesao') {
      const activeContract = await this.contractModel.findOne({
        workerPhone: resume.phone,
        contractStatus: 'active',
      }).select('createdBy').lean().exec();

      if (!activeContract) {
        // 已上户但无有效合同 → 状态异常，自动修正为"想接单"
        resume.orderStatus = 'accepting' as any;
        this.resumeModel.updateOne(
          { _id: resume._id },
          { orderStatus: 'accepting' },
        ).exec().catch(err => this.logger.error('自动修正已上户状态失败:', err.message));
      } else if (!isAdmin) {
        // 有有效合同，非管理员只有归属人能看到
        const contractOwnerId = activeContract.createdBy?.toString();
        if (!currentUserId || (contractOwnerId && contractOwnerId !== currentUserId)) {
          throw new NotFoundException('简历不存在');
        }
      }
    }

    if (resume.lastUpdatedBy) {
      try {
        const userCollection = this.resumeModel.db.collection('users');
        const lastUpdatedByUser = await userCollection.findOne(
          { _id: resume.lastUpdatedBy },
          { projection: { username: 1, name: 1 } },
        );
        if (lastUpdatedByUser) {
          (resume as any).lastUpdatedBy = lastUpdatedByUser;
        }
      } catch (error) {
        this.logger.error(`获取lastUpdatedBy用户信息失败: ${error.message}`, error.stack);
      }
    }

    try {
      const evaluations = await this.employeeEvaluationModel
        .find({
          employeeId: new Types.ObjectId(id),
          status: 'published',
        })
        .sort({ evaluationDate: -1 })
        .limit(10)
        .lean()
        .exec();
      (resume as any).employeeEvaluations = evaluations;
    } catch (error) {
      this.logger.error(`获取员工评价失败: ${error.message}`, error.stack);
      (resume as any).employeeEvaluations = [];
    }

    try {
      const syncedStatus = await this.syncSignedOrderStatus(resume._id.toString(), resume.orderStatus);
      if (syncedStatus && syncedStatus !== resume.orderStatus) {
        (resume as any).orderStatus = syncedStatus;
      }
    } catch (error) {
      this.logger.error(`同步已签约状态失败: ${error.message}`, error.stack);
    }

    return resume;
  }

  async findByPhone(phone: string) {
    return this.resumeModel.findOne({ phone }).lean();
  }

  async findByIdNumber(idNumber: string): Promise<IResume | null> {
    if (!idNumber) {
      return null;
    }
    return this.resumeModel.findOne({ idNumber }).exec();
  }

  async batchFixMissingUpdatedAt() {
    try {
      const resumesWithoutUpdatedAt = await this.resumeModel.find({
        $or: [
          { updatedAt: { $exists: false } },
          { updatedAt: null },
        ],
      });

      for (const resume of resumesWithoutUpdatedAt) {
        const fallbackDate = (resume as any).createdAt || new Date();
        await this.resumeModel.findByIdAndUpdate(
          resume._id,
          { updatedAt: fallbackDate },
          { new: true },
        );
      }
    } catch (error) {
      this.logger.error(`批量修复updatedAt字段失败: ${error.message}`);
    }
  }
}
