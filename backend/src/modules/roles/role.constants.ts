export const ROLE_CODES = ['admin', 'manager', 'employee', 'operator', 'admissions', 'dispatch'] as const;

export type RoleCode = typeof ROLE_CODES[number];

export interface DefaultRoleDefinition {
  code: RoleCode;
  name: string;
  description: string;
  permissions: string[];
  active: boolean;
}

export const DEFAULT_ROLE_DEFINITIONS: DefaultRoleDefinition[] = [
  {
    code: 'admin',
    name: '系统管理员',
    description: '拥有系统所有权限',
    permissions: ['*'],
    active: true,
  },
  {
    code: 'manager',
    name: '经理',
    description: '可以管理团队、阿姨资源、客户和合同',
    permissions: ['resume:all', 'resume:assign', 'customer:all', 'contract:all', 'insurance:all', 'background-check:all', 'user:view', 'admin:settings', 'evaluation:edit', 'evaluation:delete'],
    active: true,
  },
  {
    code: 'employee',
    name: '普通员工',
    description: '可以管理阿姨资源、客户和自己的合同',
    permissions: [
      'resume:view',
      'resume:create',
      'resume:edit',
      'customer:view',
      'customer:create',
      'customer:edit',
      'contract:view',
      'contract:create',
      'contract:edit',
      'insurance:view',
      'insurance:create',
      'insurance:edit',
      'background-check:view',
      'background-check:create',
    ],
    active: true,
  },
  {
    code: 'operator',
    name: '运营',
    description: '可查看全部内容并操作，可申请删除（需审批）',
    permissions: [
      'resume:view',
      'resume:create',
      'resume:edit',
      'resume:assign',
      'customer:view',
      'customer:create',
      'customer:edit',
      'contract:view',
      'contract:create',
      'contract:edit',
      'contract:delete',  // 🔧 新增：允许申请删除合同（需要审批，不是直接删除）
      'insurance:view',
      'insurance:create',
      'insurance:edit',
      'background-check:view',
      'background-check:create',
      'background-check:edit',
      'training-lead:view',
      'training-lead:create',
      'training-lead:edit',
      'training-order:view',
      'training-order:create',
      'user:view',
    ],
    active: true,
  },
  {
    code: 'admissions',
    name: '招生老师',
    description: '负责职培管理和阿姨简历管理',
    permissions: [
      'resume:view',
      'resume:create',
      'resume:edit',
      'training-lead:view',
      'training-lead:create',
      'training-lead:edit',
      'training-order:view',
      'training-order:create',
      'user:view',
    ],
    active: true,
  },
  {
    code: 'dispatch',
    name: '派单老师',
    description: '负责客户管理、阿姨管理、合同管理、背调管理和保险管理',
    permissions: [
      'resume:view',
      'resume:create',
      'resume:edit',
      'customer:view',
      'customer:create',
      'customer:edit',
      'contract:view',
      'contract:create',
      'contract:edit',
      'insurance:view',
      'insurance:create',
      'insurance:edit',
      'background-check:view',
      'background-check:create',
      'background-check:edit',
      'user:view',
    ],
    active: true,
  },
];

const ROLE_ALIASES: Record<string, RoleCode> = {
  admin: 'admin',
  administrator: 'admin',
  系统管理员: 'admin',
  管理员: 'admin',
  超级管理员: 'admin',
  manager: 'manager',
  经理: 'manager',
  主管: 'manager',
  employee: 'employee',
  staff: 'employee',
  普通员工: 'employee',
  员工: 'employee',
  销售: 'employee',
  operator: 'operator',
  运营: 'operator',
  运营专员: 'operator',
  admissions: 'admissions',
  招生老师: 'admissions',
  招生: 'admissions',
  dispatch: 'dispatch',
  派单老师: 'dispatch',
  派单: 'dispatch',
};

const DEFAULT_ROLE_MAP = new Map<RoleCode, DefaultRoleDefinition>(
  DEFAULT_ROLE_DEFINITIONS.map((role) => [role.code, role]),
);

export function normalizeRoleCode(role?: string | null): RoleCode | null {
  if (!role) {
    return null;
  }

  const trimmedRole = role.trim();
  if (!trimmedRole) {
    return null;
  }

  return ROLE_ALIASES[trimmedRole] ?? ROLE_ALIASES[trimmedRole.toLowerCase()] ?? null;
}

export function getDefaultRoleDefinition(role?: string | null): DefaultRoleDefinition | null {
  const normalizedRole = normalizeRoleCode(role);
  if (!normalizedRole) {
    return null;
  }

  return DEFAULT_ROLE_MAP.get(normalizedRole) ?? null;
}

export function getDefaultPermissionsForRole(role?: string | null): string[] {
  const definition = getDefaultRoleDefinition(role);
  return definition ? [...definition.permissions] : ['resume:view', 'customer:view'];
}
