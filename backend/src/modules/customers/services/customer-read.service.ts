import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../models/customer.model';
import { CustomerFollowUp } from '../models/customer-follow-up.entity';
import { User } from '../../users/models/user.entity';
import { CustomerAssignmentLog } from '../models/customer-assignment-log.model';
import { CustomerOperationLog } from '../models/customer-operation-log.model';
import { CustomerFollowUpStatusService } from './customer-follow-up-status.service';

@Injectable()
export class CustomerReadService {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(CustomerFollowUp.name) private readonly customerFollowUpModel: Model<CustomerFollowUp>,
    @InjectModel(CustomerAssignmentLog.name) private readonly assignmentLogModel: Model<CustomerAssignmentLog>,
    @InjectModel(CustomerOperationLog.name) private readonly operationLogModel: Model<CustomerOperationLog>,
    private readonly customerFollowUpStatusService: CustomerFollowUpStatusService,
  ) {}

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

    const [createdByUser, lastUpdatedByUser, assignedToUser, assignedByUser, followUps] = await Promise.all([
      this.findUserBrief(customer.createdBy),
      customer.lastUpdatedBy ? this.findUserBrief(customer.lastUpdatedBy) : null,
      customer.assignedTo ? this.findUserBrief(customer.assignedTo) : null,
      customer.assignedBy ? this.findUserBrief(customer.assignedBy) : null,
      this.getFollowUps(id),
    ]);

    return {
      ...customer.toObject(),
      createdByUser,
      lastUpdatedByUser,
      assignedToUser,
      assignedByUser,
      followUps,
      followUpStatus: this.customerFollowUpStatusService.calculateFollowUpStatus(customer.toObject(), followUps),
    };
  }

  async findByCustomerId(customerId: string): Promise<Customer> {
    const customer = await this.customerModel.findOne({ customerId }).exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }
    return customer;
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.customerModel.findOne({ phone }).exec();
  }

  async getAssignmentLogs(customerId: string) {
    const logs = await this.assignmentLogModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .populate('oldAssignedTo', 'name username')
      .populate('newAssignedTo', 'name username')
      .populate('assignedBy', 'name username')
      .sort({ assignedAt: -1 })
      .lean()
      .exec();

    return logs.map(log => ({
      ...log,
      oldAssignedToUser: log.oldAssignedTo,
      newAssignedToUser: log.newAssignedTo,
      assignedByUser: log.assignedBy,
    }));
  }

  async getFollowUps(customerId: string): Promise<CustomerFollowUp[]> {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    const allFollowUps = await this.customerFollowUpModel
      .find({
        $or: [
          { customerId: customer._id },
          { customerId },
        ],
      })
      .populate('createdBy', '_id name username')
      .sort({ createdAt: -1 })
      .exec();

    return allFollowUps.filter(
      followUp => !this.customerFollowUpStatusService.isSystemFollowUp(followUp),
    );
  }

  private async findUserBrief(userId: any): Promise<{ name: string; username: string } | null> {
    if (!userId) {
      return null;
    }

    const user = await this.userModel
      .findById(userId)
      .select('name username')
      .lean()
      .exec();

    return user ? { name: user.name, username: user.username } : null;
  }
}
