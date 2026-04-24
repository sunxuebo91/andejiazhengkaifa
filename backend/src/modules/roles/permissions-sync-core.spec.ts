/**
 * 迁移脚本纯逻辑单元测试
 *
 * 覆盖 `backend/scripts/permissions-sync-core.js` 的两个纯函数：
 * - applyRenames：重命名 + 去重，幂等
 * - mergePermissions：按默认清单做并集，只加不减，遇到 '*' 时跳过
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const core = require('../../../scripts/permissions-sync-core');

describe('permissions-sync-core', () => {
  describe('applyRenames', () => {
    it('把 training_leads:admin 重命名为 training-lead:admin', () => {
      const { list, changed } = core.applyRenames(['training_leads:admin', 'resume:view']);
      expect(changed).toBe(true);
      expect(list).toEqual(['training-lead:admin', 'resume:view']);
    });

    it('无需重命名时 changed 为 false 且列表原样返回', () => {
      const { list, changed } = core.applyRenames(['resume:view', 'training-lead:admin']);
      expect(changed).toBe(false);
      expect(list).toEqual(['resume:view', 'training-lead:admin']);
    });

    it('重命名后若与既有值重复需去重', () => {
      const { list, changed } = core.applyRenames([
        'training_leads:admin',
        'training-lead:admin',
      ]);
      expect(changed).toBe(true);
      expect(list).toEqual(['training-lead:admin']);
    });

    it('幂等：对已重命名的列表再次执行不产生变化', () => {
      const once = core.applyRenames(['training_leads:admin', 'resume:view']);
      const twice = core.applyRenames(once.list);
      expect(twice.changed).toBe(false);
      expect(twice.list).toEqual(once.list);
    });

    it('非数组输入安全返回空数组', () => {
      expect(core.applyRenames(undefined as any)).toEqual({ list: [], changed: false });
      expect(core.applyRenames(null as any)).toEqual({ list: [], changed: false });
    });
  });

  describe('mergePermissions', () => {
    it('把默认权限里缺失项并入现有列表', () => {
      const existing = ['resume:view', 'resume:create'];
      const defaults = ['resume:view', 'training-order:view', 'training-order:create'];
      const { merged, added } = core.mergePermissions(existing, defaults);
      expect(added).toEqual(['training-order:view', 'training-order:create']);
      expect(merged).toEqual([
        'resume:view',
        'resume:create',
        'training-order:view',
        'training-order:create',
      ]);
    });

    it('existing 已完全覆盖 defaults 时不改动', () => {
      const existing = ['a', 'b', 'c'];
      const defaults = ['a', 'b'];
      const { merged, added } = core.mergePermissions(existing, defaults);
      expect(added).toEqual([]);
      expect(merged).toBe(existing);
    });

    it('existing 含通配符 * 时不追加任何权限', () => {
      const existing = ['*'];
      const defaults = ['resume:view', 'training-order:create'];
      const { merged, added } = core.mergePermissions(existing, defaults);
      expect(added).toEqual([]);
      expect(merged).toEqual(['*']);
    });

    it('保留管理员手动添加的自定义权限（只加不减）', () => {
      const existing = ['resume:view', 'custom:extra'];
      const defaults = ['resume:view', 'resume:create'];
      const { merged } = core.mergePermissions(existing, defaults);
      expect(merged).toContain('custom:extra');
      expect(merged).toContain('resume:create');
    });

    it('existing 非数组时按空数组处理', () => {
      const { merged, added } = core.mergePermissions(undefined as any, ['x', 'y']);
      expect(added).toEqual(['x', 'y']);
      expect(merged).toEqual(['x', 'y']);
    });
  });

  describe('DEFAULT_ROLE_PERMISSIONS', () => {
    it('admissions 角色包含 training-order:view/create（本次修复目标）', () => {
      expect(core.DEFAULT_ROLE_PERMISSIONS.admissions).toEqual(
        expect.arrayContaining(['training-order:view', 'training-order:create']),
      );
    });

    it('admin 角色为通配符', () => {
      expect(core.DEFAULT_ROLE_PERMISSIONS.admin).toEqual(['*']);
    });

    it('不再使用下划线风格的 training_leads:admin', () => {
      const allValues = Object.values(core.DEFAULT_ROLE_PERMISSIONS).flat();
      expect(allValues).not.toContain('training_leads:admin');
    });
  });

  describe('端到端：rename + merge 组合', () => {
    it('模拟旧 admissions 角色：重命名 + 合并缺失权限', () => {
      const legacyPermissions = ['resume:view', 'training_leads:admin'];
      const { list: renamed } = core.applyRenames(legacyPermissions);
      const { merged, added } = core.mergePermissions(
        renamed,
        core.DEFAULT_ROLE_PERMISSIONS.admissions,
      );
      expect(renamed).toContain('training-lead:admin');
      expect(added).toEqual(expect.arrayContaining(['training-order:view', 'training-order:create']));
      expect(merged).toEqual(expect.arrayContaining([
        'training-lead:admin',
        'training-order:view',
        'training-order:create',
      ]));
    });
  });
});
