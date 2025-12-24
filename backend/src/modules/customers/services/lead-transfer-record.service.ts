import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LeadTransferRecord, LeadTransferRecordDocument } from '../models/lead-transfer-record.model';
import { LeadTransferQueryDto } from '../dto/lead-transfer-query.dto';

@Injectable()
export class LeadTransferRecordService {
  private readonly logger = new Logger(LeadTransferRecordService.name);

  constructor(
    @InjectModel(LeadTransferRecord.name) private recordModel: Model<LeadTransferRecordDocument>,
  ) {}

  /**
   * 查询流转记录
   */
  async findAll(query: LeadTransferQueryDto): Promise<{
    records: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, ...filters } = query;

    // 构建查询条件
    const conditions: any = {};

    if (filters.ruleId) {
      conditions.ruleId = filters.ruleId;
    }

    if (filters.customerId) {
      conditions.customerId = filters.customerId;
    }

    if (filters.fromUserId) {
      conditions.fromUserId = filters.fromUserId;
    }

    if (filters.toUserId) {
      conditions.toUserId = filters.toUserId;
    }

    if (filters.status) {
      conditions.status = filters.status;
    }

    // 日期范围过滤
    if (filters.startDate || filters.endDate) {
      conditions.transferredAt = {};
      if (filters.startDate) {
        conditions.transferredAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        conditions.transferredAt.$lte = new Date(filters.endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.recordModel
        .find(conditions)
        .populate('ruleId', 'ruleName')
        .populate('customerId', 'customerId name phone contractStatus')
        .populate('fromUserId', 'name username')
        .populate('toUserId', 'name username')
        .sort({ transferredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.recordModel.countDocuments(conditions).exec(),
    ]);

    // 转换数据格式，将 populate 的对象展平为前端期望的字段
    // 优先使用 snapshot 中保存的客户信息（防止客户被删除后无法显示）
    const formattedRecords = records.map((record: any) => ({
      _id: record._id,
      ruleId: record.ruleId?._id || record.ruleId,
      ruleName: record.ruleId?.ruleName || '未知规则',
      customerId: record.customerId?._id || record.customerId,
      customerNumber: record.snapshot?.customerNumber || record.customerId?.customerId || '-',
      customerName: record.snapshot?.customerName || record.customerId?.name || '未知客户',
      fromUserId: record.fromUserId?._id || record.fromUserId,
      fromUserName: record.fromUserId?.name || record.fromUserId?.username || '未知用户',
      toUserId: record.toUserId?._id || record.toUserId,
      toUserName: record.toUserId?.name || record.toUserId?.username || '未知用户',
      transferredAt: record.transferredAt,
      status: record.status,
      errorMessage: record.errorMessage,
      snapshot: record.snapshot,
    }));

    return {
      records: formattedRecords,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取流转统计
   */
  async getStatistics(startDate?: string, endDate?: string): Promise<any> {
    const conditions: any = {};

    if (startDate || endDate) {
      conditions.transferredAt = {};
      if (startDate) conditions.transferredAt.$gte = new Date(startDate);
      if (endDate) conditions.transferredAt.$lte = new Date(endDate);
    }

    const [totalCount, successCount, failedCount] = await Promise.all([
      this.recordModel.countDocuments(conditions).exec(),
      this.recordModel.countDocuments({ ...conditions, status: 'success' }).exec(),
      this.recordModel.countDocuments({ ...conditions, status: 'failed' }).exec(),
    ]);

    return {
      totalCount,
      successCount,
      failedCount,
      successRate: totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) : '0.00',
    };
  }

  /**
   * 获取用户流转统计
   */
  async getUserStatistics(userId: string, startDate?: string, endDate?: string): Promise<any> {
    const conditions: any = {};

    if (startDate || endDate) {
      conditions.transferredAt = {};
      if (startDate) conditions.transferredAt.$gte = new Date(startDate);
      if (endDate) conditions.transferredAt.$lte = new Date(endDate);
    }

    const [transferredOut, transferredIn] = await Promise.all([
      this.recordModel.countDocuments({ ...conditions, fromUserId: userId }).exec(),
      this.recordModel.countDocuments({ ...conditions, toUserId: userId }).exec(),
    ]);

    return {
      userId,
      transferredOut,
      transferredIn,
      balance: transferredOut - transferredIn,
    };
  }
}

