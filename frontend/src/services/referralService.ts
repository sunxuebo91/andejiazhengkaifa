import apiService from './api';

const BASE = '/api/referral';

export interface Referrer {
  _id: string;
  openid: string;
  name: string;
  phone: string;
  wechatId: string;
  idCard?: string;
  bankCardNumber?: string;
  bankName?: string;
  sourceStaffId: string;
  approvalStatus: 'pending_approval' | 'approved' | 'rejected';
  rejectedReason?: string;
  approvedAt?: string;
  totalReferrals: number;
  totalRewardAmount: number;
  onboardedCount?: number;   // 推荐成功上户量（聚合）
  lastLoginAt?: string;       // 最近登录时间（miniprogram_users）
  status: 'active' | 'disabled';
  createdAt: string;
}

export interface ReferralResume {
  _id: string;
  referrerId: string;
  referrerPhone: string;
  referrerName?: string;  // 推荐人姓名（冗余字段）
  name: string;
  phone?: string;
  idCard?: string;
  serviceType: string;
  experience?: string;
  remark?: string;
  assignedStaffId: string;
  rewardOwnerStaffId?: string;
  reviewStatus: 'pending_review' | 'approved' | 'rejected' | 'activated';
  reviewDeadlineAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  status: string;
  contractId?: string;
  contractSignedAt?: string;
  onboardedAt?: string;
  serviceFee?: number;
  rewardAmount?: number;
  rewardExpectedAt?: string;
  rewardPaidAt?: string;
  rewardStatus: string;
  createdAt: string;
}

export interface BindingLog {
  _id: string;
  referralResumeId: string;
  fromStaffId: string;
  toStaffId: string;
  reassignType: 'manual' | 'departure' | 'review_timeout';
  reason?: string;
  operatedBy: string;
  createdAt: string;
}

// ── 管理员：推荐人列表（含统计） ──────────────────────────────
export const listReferrers = (params?: { approvalStatus?: string; search?: string; page?: number; pageSize?: number }) =>
  apiService.get<{ list: Referrer[]; total: number }>(`${BASE}/admin/referrers`, params);

export const adminCreateReferrer = (adminStaffId: string, data: {
  name: string;
  phone: string;
  wechatId?: string;
  idCard?: string;
  bankCardNumber?: string;
  bankName?: string;
}) => apiService.post<Referrer>(`${BASE}/admin/create-referrer`, { adminStaffId, ...data });

export const updateReferrerInfo = (referrerId: string, data: { idCard?: string; bankCardNumber?: string; bankName?: string }) =>
  apiService.post(`${BASE}/admin/update-referrer-info`, { referrerId, ...data });

// ── 管理员：推荐人审批 ─────────────────────────────────────
export const listPendingReferrers = (page = 1, pageSize = 20) =>
  apiService.get<{ list: Referrer[]; total: number }>(`${BASE}/admin/pending-referrers`, { page, pageSize });

export const listAllReferrers = (approvalStatus?: string, page = 1, pageSize = 20) =>
  apiService.get<{ list: Referrer[]; total: number }>(`${BASE}/admin/pending-referrers`, { approvalStatus, page, pageSize });

export const approveReferrer = (adminStaffId: string, referrerId: string) =>
  apiService.post(`${BASE}/admin/approve-referrer`, { adminStaffId, referrerId });

export const rejectReferrer = (referrerId: string, reason: string) =>
  apiService.post(`${BASE}/admin/reject-referrer`, { referrerId, reason });

// ── 员工/管理员：推荐简历审核 ─────────────────────────────
// reviewStatus 支持特殊值：'processed'=已处理(approved+rejected)，'pending_review'=待审核，undefined=全部
export const getAssignedReferrals = (staffId: string, isAdmin: boolean, reviewStatus?: string, page = 1, pageSize = 20) =>
  apiService.get<{ list: ReferralResume[]; total: number }>(`${BASE}/staff/assigned-referrals`, {
    staffId, isAdmin: String(isAdmin), reviewStatus, page, pageSize,
  });

export const reviewReferral = (staffId: string, isAdmin: boolean, id: string, result: 'approve' | 'reject', note?: string) =>
  apiService.post(`${BASE}/staff/review-referral`, { staffId, isAdmin, id, result, note });

export const updateReferralStatus = (staffId: string, isAdmin: boolean, id: string, status: string) =>
  apiService.post(`${BASE}/staff/update-status`, { staffId, isAdmin, id, status });

export const processReward = (staffId: string, isAdmin: boolean, referralResumeId: string, action: string, remark?: string) =>
  apiService.post(`${BASE}/staff/process-reward`, { staffId, isAdmin, referralResumeId, action, remark });

// ── 管理员：全量推荐管理 ───────────────────────────────────
export const listAllReferrals = (params: { assignedStaffId?: string; status?: string; page?: number; pageSize?: number }) =>
  apiService.get<{ list: ReferralResume[]; total: number }>(`${BASE}/admin/all-referrals`, params);

export const reassignBinding = (adminStaffId: string, id: string, newStaffId: string, reason: string) =>
  apiService.post(`${BASE}/admin/reassign-binding`, { adminStaffId, id, newStaffId, reason });

export const getBindingLogs = (referralResumeId: string) =>
  apiService.get<BindingLog[]>(`${BASE}/admin/binding-logs/${referralResumeId}`);

export const adminProcessReward = (adminStaffId: string, referralResumeId: string, action: string, remark?: string) =>
  apiService.post(`${BASE}/admin/process-reward`, { adminStaffId, referralResumeId, action, remark });

// ── 管理员：从小程序云数据库同步推荐记录 ─────────────────────
export const syncFromCloudDb = (adminStaffId: string) =>
  apiService.post<{ imported: number; skipped: number; errors: number; details: string[] }>(
    `${BASE}/admin/sync-cloud-referrals`,
    { adminStaffId },
  );

// ── 管理员：员工离职 ────────────────────────────────────────
export const markStaffDeparted = (adminStaffId: string, staffId: string, leftAt: string) =>
  apiService.post<{ transferredCount: number }>(`${BASE}/admin/mark-staff-departed`, { adminStaffId, staffId, leftAt });
