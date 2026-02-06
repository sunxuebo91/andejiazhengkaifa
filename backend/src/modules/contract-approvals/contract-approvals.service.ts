import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ContractDeletionApproval, ContractDeletionApprovalDocument } from './models/contract-deletion-approval.model';
import { CreateDeletionApprovalDto, ApproveDeletionDto, RejectDeletionDto } from './dto/create-deletion-approval.dto';

@Injectable()
export class ContractApprovalsService {
  constructor(
    @InjectModel(ContractDeletionApproval.name)
    private approvalModel: Model<ContractDeletionApprovalDocument>,
  ) {}

  // 创建删除审批请求
  async createDeletionApproval(
    contractId: string,
    contractNumber: string,
    userId: string,
    userName: string,
    reason: string,
  ): Promise<ContractDeletionApproval> {
    // 检查是否已有待审批的请求
    const existingApproval = await this.approvalModel.findOne({
      contractId: new Types.ObjectId(contractId),
      status: 'pending',
    });

    if (existingApproval) {
      throw new BadRequestException('该合同已有待审批的删除请求');
    }

    const approval = new this.approvalModel({
      contractId: new Types.ObjectId(contractId),
      contractNumber,
      requestedBy: new Types.ObjectId(userId),
      requestedByName: userName,
      reason,
      status: 'pending',
    });

    return approval.save();
  }

  // 获取所有审批请求（管理员）
  async findAll(status?: string, page: number = 1, limit: number = 10): Promise<{
    approvals: ContractDeletionApproval[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: any = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [approvals, total] = await Promise.all([
      this.approvalModel
        .find(query)
        .populate('contractId', 'contractNumber customerName workerName')
        .populate('requestedBy', 'username name')
        .populate('approvedBy', 'username name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.approvalModel.countDocuments(query),
    ]);

    return {
      approvals,
      total,
      page,
      limit,
    };
  }

  // 获取用户自己的删除请求
  async findMyRequests(userId: string): Promise<ContractDeletionApproval[]> {
    return this.approvalModel
      .find({ requestedBy: new Types.ObjectId(userId) })
      .populate('contractId', 'contractNumber customerName workerName')
      .sort({ createdAt: -1 })
      .exec();
  }

  // 获取单个审批请求
  async findOne(id: string): Promise<ContractDeletionApproval> {
    const approval = await this.approvalModel
      .findById(id)
      .populate('contractId')
      .populate('requestedBy', 'username name')
      .populate('approvedBy', 'username name')
      .exec();

    if (!approval) {
      throw new NotFoundException('审批请求不存在');
    }

    return approval;
  }

  // 批准删除请求
  async approve(
    id: string,
    approverId: string,
    approverName: string,
    dto: ApproveDeletionDto,
  ): Promise<ContractDeletionApproval> {
    const approval = await this.approvalModel.findById(id);

    if (!approval) {
      throw new NotFoundException('审批请求不存在');
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException('该请求已被处理');
    }

    approval.status = 'approved';
    approval.approvedBy = new Types.ObjectId(approverId);
    approval.approvedByName = approverName;
    approval.approvalComment = dto.comment;
    approval.approvedAt = new Date();

    return approval.save();
  }

  // 拒绝删除请求
  async reject(
    id: string,
    approverId: string,
    approverName: string,
    dto: RejectDeletionDto,
  ): Promise<ContractDeletionApproval> {
    const approval = await this.approvalModel.findById(id);

    if (!approval) {
      throw new NotFoundException('审批请求不存在');
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException('该请求已被处理');
    }

    approval.status = 'rejected';
    approval.approvedBy = new Types.ObjectId(approverId);
    approval.approvedByName = approverName;
    approval.approvalComment = dto.comment;
    approval.approvedAt = new Date();

    return approval.save();
  }
}

