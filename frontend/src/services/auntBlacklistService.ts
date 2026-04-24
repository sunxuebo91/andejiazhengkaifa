import apiService from './api';

const BASE = '/api/aunt-blacklist';

export type BlacklistStatus = 'active' | 'released';

export type BlacklistReasonType =
  | 'fraud'
  | 'serious_complaint'
  | 'work_quality'
  | 'contract_breach'
  | 'other';

export type BlacklistSourceType = 'resume' | 'referral' | 'manual';

export interface BlacklistEvidence {
  url: string;
  filename?: string;
  size?: number;
  mimetype?: string;
}

export interface AuntBlacklist {
  _id: string;
  name: string;
  phone?: string;
  idCard?: string;
  reason: string;
  reasonType: BlacklistReasonType;
  evidence: BlacklistEvidence[];
  sourceType: BlacklistSourceType;
  sourceResumeId?: string;
  sourceReferralResumeId?: string;
  status: BlacklistStatus;
  operatorId: string;
  operatorName?: string;
  releasedBy?: string;
  releasedByName?: string;
  releasedAt?: string;
  releaseReason?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlacklistListQuery {
  keyword?: string;
  status?: BlacklistStatus;
  page?: number;
  pageSize?: number;
}

export interface BlacklistListResult {
  items: AuntBlacklist[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateBlacklistPayload {
  name: string;
  phone?: string;
  idCard?: string;
  reason: string;
  reasonType: BlacklistReasonType;
  evidence?: BlacklistEvidence[];
  sourceType?: BlacklistSourceType;
  sourceResumeId?: string;
  sourceReferralResumeId?: string;
  remarks?: string;
}

export interface UpdateBlacklistPayload {
  reason?: string;
  reasonType?: BlacklistReasonType;
  evidence?: BlacklistEvidence[];
  remarks?: string;
}

export interface ReleaseBlacklistPayload {
  releaseReason: string;
}

export interface BlacklistCheckHit {
  hit: true;
  id: string;
  name: string;
  reason: string;
  reasonType: BlacklistReasonType;
  createdAt?: string;
}

export interface BlacklistCheckMiss {
  hit: false;
}

export type BlacklistCheckResult = BlacklistCheckHit | BlacklistCheckMiss;

// ── 列表 / 详情 ───────────────────────────────────────────────
export const listBlacklist = (query: BlacklistListQuery = {}) => {
  const params: Record<string, string> = {};
  if (query.keyword) params.keyword = query.keyword;
  if (query.status) params.status = query.status;
  if (query.page !== undefined) params.page = String(query.page);
  if (query.pageSize !== undefined) params.pageSize = String(query.pageSize);
  return apiService.get<BlacklistListResult>(BASE, params);
};

export const getBlacklistDetail = (id: string) =>
  apiService.get<AuntBlacklist>(`${BASE}/${id}`);

// ── 命中探针（录入/合同创建前的实时校验） ───────────────────────
export const checkBlacklist = (params: { phone?: string; idCard?: string }) =>
  apiService.get<BlacklistCheckResult>(`${BASE}/check`, params);

// ── 加入 / 编辑 ───────────────────────────────────────────────
export const createBlacklist = (data: CreateBlacklistPayload) =>
  apiService.post<AuntBlacklist>(BASE, data);

export const updateBlacklist = (id: string, data: UpdateBlacklistPayload) =>
  apiService.patch<AuntBlacklist>(`${BASE}/${id}`, data);

// ── 释放（仅 admin） ──────────────────────────────────────────
export const releaseBlacklist = (id: string, data: ReleaseBlacklistPayload) =>
  apiService.post<AuntBlacklist>(`${BASE}/${id}/release`, data);

// ── 文案辅助：原因类型 label ──────────────────────────────────
export const BLACKLIST_REASON_TYPE_LABELS: Record<BlacklistReasonType, string> = {
  fraud: '诈骗/欺骗',
  serious_complaint: '严重投诉',
  work_quality: '工作质量恶劣',
  contract_breach: '严重违约',
  other: '其他',
};

export const BLACKLIST_SOURCE_TYPE_LABELS: Record<BlacklistSourceType, string> = {
  resume: '简历库',
  referral: '推荐库',
  manual: '手动添加',
};

export const BLACKLIST_STATUS_LABELS: Record<BlacklistStatus, string> = {
  active: '生效中',
  released: '已释放',
};
