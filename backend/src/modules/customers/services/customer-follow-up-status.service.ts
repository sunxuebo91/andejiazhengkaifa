import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../models/customer.model';
import { CustomerFollowUp } from '../models/customer-follow-up.entity';

@Injectable()
export class CustomerFollowUpStatusService {
  readonly labels = {
    new: '新客未跟进',
    transferred: '流转未跟进',
    followed: '已跟进',
  } as const;

  private readonly signedCustomerContractStatus = '已签约';
  private readonly signedCustomerLeadLevel = 'O类';

  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(CustomerFollowUp.name) private readonly customerFollowUpModel: Model<CustomerFollowUp>,
  ) {}

  isSystemFollowUp(followUp: any): boolean {
    const content = followUp.content || '';
    const type = followUp.type || '';

    return type === 'other' && (
      content.startsWith('系统：') ||
      content.startsWith('系统:') ||
      content.includes('系统自动流转') ||
      (content.includes('负责人由') && content.includes('变更为'))
    );
  }

  calculateFollowUpStatus(customer: any, followUps: any[], assignedToId?: string): string | null {
    if (this.isSignedCustomer(customer)) {
      return null;
    }

    const currentAssignedToId = assignedToId || this.extractId(customer.assignedTo);
    const validFollowUps = (followUps || []).filter(f => !this.isSystemFollowUp(f));

    const hasOwnerFollowUp = !!currentAssignedToId && validFollowUps.some(followUp => {
      const createdById = this.extractId(followUp.createdBy);
      return createdById === currentAssignedToId;
    });

    if (hasOwnerFollowUp) {
      return this.labels.followed;
    }

    if ((customer.transferCount || 0) > 0) {
      return this.labels.transferred;
    }

    return this.labels.new;
  }

  async getFollowUpStatus(customerId: string): Promise<{
    customerId: string;
    customerName: string;
    followUpStatus: string | null;
    transferCount: number;
    hasFollowUp: boolean;
    currentOwnerHasFollowUp: boolean;
  }> {
    const customer = await this.customerModel.findById(customerId).lean().exec();
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    const followUps = await this.fetchValidFollowUps(customer._id, customerId);
    const assignedToId = this.extractId(customer.assignedTo);
    const currentOwnerHasFollowUp = !!assignedToId && followUps.some(followUp => {
      const createdById = this.extractId(followUp.createdBy);
      return createdById === assignedToId;
    });

    return {
      customerId: customer._id.toString(),
      customerName: customer.name,
      followUpStatus: this.calculateFollowUpStatus(customer, followUps, assignedToId),
      transferCount: customer.transferCount || 0,
      hasFollowUp: followUps.length > 0,
      currentOwnerHasFollowUp,
    };
  }

  async fetchValidFollowUps(customerObjectId: any, customerId: string): Promise<any[]> {
    const allFollowUps = await this.customerFollowUpModel
      .find({
        $or: [
          { customerId: customerObjectId },
          { customerId },
        ],
      })
      .populate('createdBy', '_id name username')
      .sort({ createdAt: -1 })
      .exec();

    return allFollowUps.filter(followUp => !this.isSystemFollowUp(followUp));
  }

  private isSignedCustomer(customer: any): boolean {
    return customer.contractStatus === this.signedCustomerContractStatus ||
      customer.leadLevel === this.signedCustomerLeadLevel;
  }

  private extractId(value: any): string | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'object') {
      return value._id?.toString?.() || value.toString?.();
    }

    return value.toString();
  }
}
