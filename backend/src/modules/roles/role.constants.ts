export const ROLE_CODES = ['admin', 'manager', 'employee'] as const;

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
    permissions: ['resume:all', 'resume:assign', 'customer:all', 'contract:all', 'insurance:all', 'background-check:all', 'user:view', 'admin:settings'],
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
