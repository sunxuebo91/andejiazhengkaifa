/**
 * 角色权限同步纯逻辑
 *
 * 与 sync-role-permissions.js 共用，便于单独做单元测试。
 * 修改 DEFAULT_ROLE_PERMISSIONS / RENAMES 需同步 `backend/src/modules/roles/role.constants.ts`
 * 及前端权限目录展示，避免漂移。
 */

// 与 backend/src/modules/roles/role.constants.ts DEFAULT_ROLE_DEFINITIONS 保持一致
const DEFAULT_ROLE_PERMISSIONS = {
  admin: ['*'],
  manager: [
    'resume:all', 'resume:assign',
    'customer:all', 'contract:all', 'insurance:all', 'background-check:all',
    'user:view', 'admin:settings',
    'evaluation:edit', 'evaluation:delete',
  ],
  employee: [
    'resume:view', 'resume:create', 'resume:edit',
    'customer:view', 'customer:create', 'customer:edit',
    'contract:view', 'contract:create', 'contract:edit',
    'insurance:view', 'insurance:create', 'insurance:edit',
    'background-check:view', 'background-check:create',
  ],
  operator: [
    'resume:view', 'resume:create', 'resume:edit', 'resume:assign',
    'customer:view', 'customer:create', 'customer:edit',
    'contract:view', 'contract:create', 'contract:edit', 'contract:delete',
    'insurance:view', 'insurance:create', 'insurance:edit',
    'background-check:view', 'background-check:create', 'background-check:edit',
    'training-lead:view', 'training-lead:create', 'training-lead:edit',
    'training-order:view', 'training-order:create',
    'user:view',
  ],
  admissions: [
    'resume:view', 'resume:create', 'resume:edit',
    'training-lead:view', 'training-lead:create', 'training-lead:edit',
    'training-order:view', 'training-order:create',
    'user:view',
  ],
  dispatch: [
    'resume:view', 'resume:create', 'resume:edit',
    'customer:view', 'customer:create', 'customer:edit',
    'contract:view', 'contract:create', 'contract:edit',
    'insurance:view', 'insurance:create', 'insurance:edit',
    'background-check:view', 'background-check:create', 'background-check:edit',
    'user:view',
  ],
};

const RENAMES = {
  'training_leads:admin': 'training-lead:admin',
};

/**
 * 对权限列表应用重命名规则，并去重（保留原顺序，重命名后的放原位置）
 * @param {string[]} list
 * @returns {{ list: string[], changed: boolean }}
 */
function applyRenames(list) {
  if (!Array.isArray(list)) return { list: [], changed: false };
  let changed = false;
  const seen = new Set();
  const out = [];
  for (const p of list) {
    const next = Object.prototype.hasOwnProperty.call(RENAMES, p) ? RENAMES[p] : p;
    if (next !== p) changed = true;
    if (!seen.has(next)) {
      seen.add(next);
      out.push(next);
    }
  }
  return { list: out, changed };
}

/**
 * 把 defaults 中缺失的权限并入 existing（只加不减）
 * 若 existing 含 '*' 则不做任何扩展
 * @param {string[]} existing
 * @param {string[]} defaults
 * @returns {{ merged: string[], added: string[] }}
 */
function mergePermissions(existing, defaults) {
  const base = Array.isArray(existing) ? existing : [];
  if (base.includes('*')) return { merged: base, added: [] };
  const safeDefaults = Array.isArray(defaults) ? defaults : [];
  const added = safeDefaults.filter((p) => !base.includes(p));
  if (added.length === 0) return { merged: base, added: [] };
  return { merged: [...base, ...added], added };
}

module.exports = {
  DEFAULT_ROLE_PERMISSIONS,
  RENAMES,
  applyRenames,
  mergePermissions,
};
