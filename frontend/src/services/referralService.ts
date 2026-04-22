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
  sourceStaffName?: string | null;  // 推荐人归属员工姓名（后端批量查询返回）
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
  assignedStaffName?: string | null;       // 归属员工姓名（后端批量查询返回）
  referrerSourceStaffId?: string | null;   // 推荐人的来源员工 ID（扫了谁的海报注册成推荐人）
  referrerSourceStaffName?: string | null; // 来源员工姓名（后端批量查询返回）
  rewardOwnerStaffId?: string;
  rewardOwnerStaffName?: string | null;    // 返费归属员工姓名（后端批量查询返回）
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
  // 小程序结算申请时推荐人提交的收款信息
  payeeName?: string;
  payeePhone?: string;
  bankCard?: string;
  bankName?: string;
  settlementAppliedAt?: string;
  linkedResumeId?: string;     // 已释放或已激活时关联的 resumes._id
  releasedAt?: string;         // 释放到简历库的时间
  releasedBy?: string;         // 执行释放操作的员工ID
  createdAt: string;
  // 关联合同数据（通过 admin/referral-detail/:id 接口获取）
  contract?: {
    orderNumber?: string;
    orderType?: string;
    serviceFee?: number;
    nannySalary?: number;
    onboardDate?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    createdByName?: string;
  };
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

export const deleteReferrer = (adminStaffId: string, referrerId: string) =>
  apiService.post(`${BASE}/admin/delete-referrer`, { adminStaffId, referrerId });

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

// 释放推荐记录到简历库（管理员 或 assignedStaffId）
export const releaseToResumeLibrary = (staffId: string, isAdmin: boolean, referralResumeId: string) =>
  apiService.post<{ resumeId: string }>(`${BASE}/staff/release-to-resume-library`, { staffId, isAdmin, referralResumeId });

// ── 管理员：全量推荐管理 ───────────────────────────────────
export const listAllReferrals = (params: { assignedStaffId?: string; status?: string; page?: number; pageSize?: number }) =>
  apiService.get<{ list: ReferralResume[]; total: number }>(`${BASE}/admin/all-referrals`, params);

export const reassignBinding = (adminStaffId: string, id: string, newStaffId: string, reason: string) =>
  apiService.post(`${BASE}/admin/reassign-binding`, { adminStaffId, id, newStaffId, reason });

export const getBindingLogs = (referralResumeId: string) =>
  apiService.get<BindingLog[]>(`${BASE}/admin/binding-logs/${referralResumeId}`);

export const adminProcessReward = (adminStaffId: string, referralResumeId: string, action: string, remark?: string) =>
  apiService.post(`${BASE}/admin/process-reward`, { adminStaffId, referralResumeId, action, remark });

export const getReferralAdminDetail = (id: string) =>
  apiService.get<ReferralResume>(`${BASE}/admin/referral-detail/${id}`);

export const deleteReferralResume = (adminStaffId: string, referralResumeId: string) =>
  apiService.post(`${BASE}/admin/delete-referral`, { adminStaffId, referralResumeId });

// ── 管理员：从小程序云数据库同步推荐记录 ─────────────────────
export const syncFromCloudDb = (adminStaffId: string) =>
  apiService.post<{ imported: number; activated: number; skipped: number; errors: number; details: string[] }>(
    `${BASE}/admin/sync-cloud-referrals`,
    { adminStaffId },
  );

// ── 管理员：员工离职 ────────────────────────────────────────
export const markStaffDeparted = (adminStaffId: string, staffId: string, leftAt: string) =>
  apiService.post<{ transferredCount: number }>(`${BASE}/admin/mark-staff-departed`, { adminStaffId, staffId, leftAt });
