/**
 * 权限目录（单一事实来源）
 *
 * 所有在后端 `@Permissions(...)` 装饰器中使用的权限位都应在此登记。
 * 角色管理前端 UI 通过 `GET /api/permissions/catalog` 拉取此目录，
 * 实现"权限即配置"——后端新增权限位只需在本文件增加一行，UI 即自动暴露。
 *
 * 颜色值约定与 antd Tag 的 preset color 一致：blue/green/cyan/red/orange/gold/purple/magenta/volcano/geekblue/lime/pink。
 */

export interface PermissionCatalogItem {
  /** 权限 code，与后端 `@Permissions(...)` 保持一致 */
  key: string;
  /** UI 展示文案 */
  label: string;
  /** UI 详细说明 */
  description: string;
  /** UI 标签颜色（RoleList 展示用） */
  color: string;
}

export interface PermissionCatalogGroup {
  /** 分组标题 */
  title: string;
  /** 该分组权限列表 */
  permissions: PermissionCatalogItem[];
}

export const PERMISSION_CATALOG: PermissionCatalogGroup[] = [
  {
    title: '阿姨管理',
    permissions: [
      { key: 'resume:view',   label: '查看阿姨简历', description: '允许查看阿姨简历列表和详情', color: 'blue' },
      { key: 'resume:create', label: '创建阿姨简历', description: '允许创建新的阿姨简历',       color: 'green' },
      { key: 'resume:edit',   label: '编辑阿姨简历', description: '允许编辑阿姨简历',           color: 'cyan' },
      { key: 'resume:assign', label: '分配阿姨',     description: '允许将阿姨分配给指定员工',   color: 'gold' },
      { key: 'resume:delete', label: '删除阿姨简历', description: '允许删除阿姨简历',           color: 'red' },
      { key: 'resume:all',    label: '阿姨管理(全部)', description: '阿姨管理全部权限，包含查看、创建、编辑、删除', color: 'orange' },
    ],
  },
  {
    title: '阿姨黑名单',
    permissions: [
      { key: 'blacklist:view',   label: '查看黑名单', description: '允许查看阿姨黑名单列表与详情', color: 'blue' },
      { key: 'blacklist:create', label: '加入黑名单', description: '允许将阿姨加入黑名单',         color: 'red' },
      { key: 'blacklist:edit',   label: '编辑黑名单', description: '允许编辑黑名单记录的原因/证据/备注（不含释放）', color: 'cyan' },
      { key: 'blacklist:all',    label: '黑名单(全部)', description: '黑名单管理全部权限，含查看、加入、编辑（释放操作仅管理员）', color: 'volcano' },
    ],
  },
  {
    title: '客户管理',
    permissions: [
      { key: 'customer:view',   label: '查看客户', description: '允许查看客户列表和详情', color: 'blue' },
      { key: 'customer:create', label: '创建客户', description: '允许创建新客户',         color: 'green' },
      { key: 'customer:edit',   label: '编辑客户', description: '允许编辑客户信息',       color: 'cyan' },
      { key: 'customer:delete', label: '删除客户', description: '允许删除客户',           color: 'red' },
      { key: 'customer:all',    label: '客户管理(全部)', description: '客户管理全部权限，包含查看、创建、编辑、删除', color: 'gold' },
    ],
  },
  {
    title: '合同管理',
    permissions: [
      { key: 'contract:view',   label: '查看合同', description: '允许查看合同列表和详情', color: 'blue' },
      { key: 'contract:create', label: '创建合同', description: '允许创建新合同',         color: 'green' },
      { key: 'contract:edit',   label: '编辑合同', description: '允许编辑合同信息',       color: 'cyan' },
      { key: 'contract:delete', label: '删除合同', description: '允许删除合同（需审批）',   color: 'red' },
      { key: 'contract:all',    label: '合同管理(全部)', description: '合同管理全部权限，包含查看、创建、编辑、删除', color: 'magenta' },
    ],
  },
  {
    title: '保险管理',
    permissions: [
      { key: 'insurance:view',   label: '查看保险', description: '允许查看保单列表和详情', color: 'blue' },
      { key: 'insurance:create', label: '创建保险', description: '允许创建新保单',         color: 'green' },
      { key: 'insurance:edit',   label: '编辑保险', description: '允许变更、退保、注销等保单操作', color: 'cyan' },
      { key: 'insurance:delete', label: '删除保险', description: '允许删除保单记录',       color: 'red' },
      { key: 'insurance:all',    label: '保险管理(全部)', description: '保险管理全部权限，包含查看、创建、编辑、删除', color: 'volcano' },
    ],
  },
  {
    title: '背调管理',
    permissions: [
      { key: 'background-check:view',   label: '查看背调', description: '允许查看背调列表和详情', color: 'blue' },
      { key: 'background-check:create', label: '创建背调', description: '允许发起新的背调',       color: 'green' },
      { key: 'background-check:edit',   label: '编辑背调', description: '允许同步、取消、处理背调记录', color: 'cyan' },
      { key: 'background-check:all',    label: '背调管理(全部)', description: '背调管理全部权限，包含查看、创建、编辑', color: 'geekblue' },
    ],
  },
  {
    title: '职培线索',
    permissions: [
      { key: 'training-lead:view',   label: '查看培训线索', description: '允许查看培训线索列表和详情', color: 'blue' },
      { key: 'training-lead:create', label: '创建培训线索', description: '允许创建新的培训线索',       color: 'green' },
      { key: 'training-lead:edit',   label: '编辑培训线索', description: '允许编辑培训线索信息',       color: 'cyan' },
      { key: 'training-lead:delete', label: '删除培训线索', description: '允许删除培训线索',           color: 'red' },
      { key: 'training-lead:admin',  label: '培训线索审批', description: '允许对培训线索执行审批类操作', color: 'purple' },
      { key: 'training-lead:all',    label: '培训线索(全部)', description: '培训线索全部权限，包含查看、创建、编辑、删除', color: 'lime' },
    ],
  },
  {
    title: '职培合同',
    permissions: [
      { key: 'training-order:view',   label: '查看职培合同', description: '允许查看职培合同列表和详情', color: 'blue' },
      { key: 'training-order:create', label: '创建职培合同', description: '允许发起职培合同签约',       color: 'green' },
      { key: 'training-order:all',    label: '职培合同(全部)', description: '职培合同全部权限，包含查看、创建', color: 'lime' },
    ],
  },
  {
    title: '员工评价',
    permissions: [
      { key: 'evaluation:edit',   label: '编辑员工评价', description: '允许编辑员工评价',   color: 'cyan' },
      { key: 'evaluation:delete', label: '删除员工评价', description: '允许删除员工评价',   color: 'red' },
      { key: 'evaluation:all',    label: '员工评价(全部)', description: '员工评价全部权限，包含编辑、删除', color: 'purple' },
    ],
  },
  {
    title: '用户管理',
    permissions: [
      { key: 'user:view',   label: '查看用户', description: '允许查看用户列表', color: 'blue' },
      { key: 'user:create', label: '创建用户', description: '允许创建新用户',   color: 'green' },
      { key: 'user:edit',   label: '编辑用户', description: '允许编辑用户信息', color: 'cyan' },
      { key: 'user:delete', label: '删除用户', description: '允许删除用户',     color: 'red' },
      { key: 'user:all',    label: '用户管理(全部)', description: '用户管理全部权限，包含查看、创建、编辑、删除', color: 'green' },
    ],
  },
  {
    title: '系统管理',
    permissions: [
      { key: 'admin:roles',    label: '角色管理', description: '允许管理角色和权限', color: 'purple' },
      { key: 'admin:settings', label: '系统设置', description: '允许修改系统设置',   color: 'red' },
      { key: 'admin:all',      label: '系统管理(全部)', description: '系统管理全部权限，包含角色管理和系统设置', color: 'red' },
    ],
  },
  {
    title: '褓贝后台',
    permissions: [
      { key: 'baobei:view', label: '查看褓贝后台', description: '允许查看 Banner、文章、爬虫源等内容', color: 'blue' },
      { key: 'baobei:edit', label: '编辑褓贝后台', description: '允许创建、编辑、删除 Banner 和文章', color: 'cyan' },
      { key: 'baobei:all',  label: '褓贝后台(全部)', description: '褓贝后台全部权限，包含 Banner 管理、文章管理、爬虫源管理、小程序用户管理', color: 'pink' },
    ],
  },
];

/** 扁平化全部权限 key 列表（校验用） */
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATALOG
  .flatMap((group) => group.permissions.map((item) => item.key));
