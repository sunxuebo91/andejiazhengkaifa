/** 推荐简历整体状态 */
export const RESUME_STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending_review: { color: 'orange',   label: '待审核' },
  rejected:       { color: 'red',      label: '已拒绝' },
  following_up:   { color: 'blue',     label: '推荐中' },
  contracted:     { color: 'green',    label: '已签单' },
  onboarded:      { color: 'cyan',     label: '已上户' },
  reward_pending:  { color: 'purple',   label: '返费待审核' },
  reward_approved: { color: 'gold',     label: '返费待打款' },
  reward_paid:     { color: 'geekblue', label: '返费已打款' },
  invalid:        { color: 'default',  label: '未录用' },
  activated:      { color: 'volcano',  label: '已激活' },
  released:       { color: 'lime',     label: '已释放' },
};

/** 推荐简历审核状态 */
export const REVIEW_STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending_review: { color: 'orange',  label: '待审核' },
  approved:       { color: 'green',   label: '已通过' },
  rejected:       { color: 'red',     label: '已拒绝' },
  activated:      { color: 'volcano', label: '已激活' },
};

/** 返费状态 */
export const REWARD_STATUS_MAP: Record<string, { color: string; label: string }> = {
  reviewing: { color: 'orange',   label: '审核中' },
  approved:  { color: 'gold',     label: '审核通过' },
  rejected:  { color: 'red',      label: '已驳回' },
  paid:      { color: 'geekblue', label: '已打款' },
};

/** 推荐人审批状态 */
export const REFERRER_APPROVAL_MAP: Record<string, { color: string; label: string }> = {
  pending_approval: { color: 'orange', label: '待审批' },
  approved:         { color: 'green',  label: '已通过' },
  rejected:         { color: 'red',    label: '已拒绝' },
};
