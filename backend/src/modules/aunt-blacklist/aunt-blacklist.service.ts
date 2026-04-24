import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuntBlacklist, AuntBlacklistDocument } from './models/aunt-blacklist.model';
import { Contract, ContractDocument, ContractStatus } from '../contracts/models/contract.model';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';
import { UpdateBlacklistDto } from './dto/update-blacklist.dto';
import { ReleaseBlacklistDto } from './dto/release-blacklist.dto';
import { QueryBlacklistDto } from './dto/query-blacklist.dto';

/** 算作"进行中"的合同状态 */
const ACTIVE_CONTRACT_STATUSES: ContractStatus[] = [
  ContractStatus.SIGNING,
  ContractStatus.SIGNED,
  ContractStatus.ACTIVE,
];

@Injectable()
export class AuntBlacklistService {
  private readonly logger = new Logger(AuntBlacklistService.name);

  constructor(
    @InjectModel(AuntBlacklist.name)
    private readonly blacklistModel: Model<AuntBlacklistDocument>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
  ) {}

  /**
   * 核心探针：给简历、合同、推荐等模块统一复用。
   * 输入 phone / idCard 任一命中即返回命中记录；均未命中返回 null。
   */
  async checkActive(params: { phone?: string; idCard?: string }): Promise<AuntBlacklistDocument | null> {
    const phone = (params.phone || '').trim();
    const idCard = (params.idCard || '').trim();
    if (!phone && !idCard) return null;

    const or: any[] = [];
    if (phone) or.push({ phone });
    if (idCard) or.push({ idCard });

    return this.blacklistModel
      .findOne({ status: 'active', $or: or })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * 创建黑名单记录
   * - phone / idCard 至少填一个
   * - 若目标阿姨存在进行中合同（signing/signed/active），拒绝拉黑
   * - 同一核心命中键已在黑名单 active 中则返回现有记录
   */
  async create(
    dto: CreateBlacklistDto,
    operator: { userId: string; name?: string },
  ): Promise<AuntBlacklistDocument> {
    const phone = (dto.phone || '').trim() || undefined;
    const idCard = (dto.idCard || '').trim() || undefined;
    if (!phone && !idCard) {
      throw new BadRequestException('手机号和身份证号至少填写一个');
    }

    // 已存在 active 记录则直接返回，避免重复
    const existing = await this.checkActive({ phone, idCard });
    if (existing) {
      throw new BadRequestException(
        `该阿姨已在黑名单中（原因：${existing.reason}），如需调整请先释放`,
      );
    }

    // 反查是否有进行中合同，若有则拒绝
    const activeContract = await this.findActiveContract({ phone, idCard });
    if (activeContract) {
      throw new BadRequestException(
        `该阿姨存在进行中的合同（编号 ${activeContract.contractNumber}，状态 ${activeContract.contractStatus}），请先处理合同后再拉黑`,
      );
    }

    const created = await this.blacklistModel.create({
      name: dto.name,
      phone,
      idCard,
      reason: dto.reason,
      reasonType: dto.reasonType,
      evidence: dto.evidence || [],
      sourceType: dto.sourceType || 'manual',
      sourceResumeId: dto.sourceResumeId,
      sourceReferralResumeId: dto.sourceReferralResumeId,
      remarks: dto.remarks,
      status: 'active',
      operatorId: operator.userId,
      operatorName: operator.name,
    });

    this.logger.log(
      `blacklist.create id=${created._id} phone=${phone || '-'} idCard=${idCard || '-'} operator=${operator.userId}`,
    );

    return created;
  }

  /**
   * 查询进行中合同（供 create 前置校验 / 前端提示复用）
   */
  async findActiveContract(params: { phone?: string; idCard?: string }) {
    const or: any[] = [];
    if (params.phone) or.push({ workerPhone: params.phone });
    if (params.idCard) or.push({ workerIdCard: params.idCard });
    if (or.length === 0) return null;
    return this.contractModel
      .findOne({
        $or: or,
        contractStatus: { $in: ACTIVE_CONTRACT_STATUSES },
        isLatest: true,
      })
      .select('_id contractNumber contractStatus')
      .lean()
      .exec();
  }

  /**
   * 列表查询（分页 + 关键词 + 状态）
   */
  async list(query: QueryBlacklistDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10) || 20));

    const cond: any = {};
    if (query.status) {
      cond.status = query.status;
    }
    if (query.keyword) {
      const kw = query.keyword.trim();
      if (kw) {
        cond.$or = [
          { name: { $regex: kw, $options: 'i' } },
          { phone: { $regex: kw, $options: 'i' } },
          { idCard: { $regex: kw, $options: 'i' } },
        ];
      }
    }

    const [items, total] = await Promise.all([
      this.blacklistModel
        .find(cond)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
      this.blacklistModel.countDocuments(cond).exec(),
    ]);

    return { items, total, page, pageSize };
  }

  async findById(id: string): Promise<AuntBlacklistDocument> {
    const doc = await this.blacklistModel.findById(id).exec();
    if (!doc) throw new NotFoundException('黑名单记录不存在');
    return doc;
  }

  async update(id: string, dto: UpdateBlacklistDto): Promise<AuntBlacklistDocument> {
    const doc = await this.findById(id);
    if (doc.status !== 'active') {
      throw new BadRequestException('已释放的黑名单记录不可编辑');
    }
    if (dto.reason !== undefined) doc.reason = dto.reason;
    if (dto.reasonType !== undefined) doc.reasonType = dto.reasonType;
    if (dto.evidence !== undefined) doc.evidence = dto.evidence;
    if (dto.remarks !== undefined) doc.remarks = dto.remarks;
    await doc.save();
    return doc;
  }

  /**
   * 释放黑名单（仅 admin 可调用，由 controller 侧的 @Roles('admin') 强制）
   */
  async release(
    id: string,
    dto: ReleaseBlacklistDto,
    operator: { userId: string; name?: string },
  ): Promise<AuntBlacklistDocument> {
    const doc = await this.findById(id);
    if (doc.status === 'released') {
      throw new BadRequestException('该黑名单记录已处于释放状态');
    }
    doc.status = 'released';
    doc.releasedBy = operator.userId;
    doc.releasedByName = operator.name;
    doc.releasedAt = new Date();
    doc.releaseReason = dto.releaseReason;
    await doc.save();

    this.logger.log(
      `blacklist.release id=${id} operator=${operator.userId} reason=${dto.releaseReason}`,
    );
    return doc;
  }

  /**
   * 批量探测：给列表页"是否黑名单"红 Tag 展示用
   * 入参多个 phone / idCard，返回命中 active 记录的集合
   */
  async batchCheckActive(
    keys: Array<{ phone?: string; idCard?: string }>,
  ): Promise<AuntBlacklistDocument[]> {
    const phones = Array.from(new Set(keys.map((k) => (k.phone || '').trim()).filter(Boolean)));
    const idCards = Array.from(new Set(keys.map((k) => (k.idCard || '').trim()).filter(Boolean)));
    if (phones.length === 0 && idCards.length === 0) return [];
    const or: any[] = [];
    if (phones.length > 0) or.push({ phone: { $in: phones } });
    if (idCards.length > 0) or.push({ idCard: { $in: idCards } });
    return this.blacklistModel
      .find({ status: 'active', $or: or })
      .lean()
      .exec();
  }
}
