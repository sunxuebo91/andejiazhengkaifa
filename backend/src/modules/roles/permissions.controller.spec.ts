import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PermissionsController } from './permissions.controller';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSION_CATALOG, ALL_PERMISSION_KEYS } from './permission-catalog';

/**
 * PermissionsController 单元测试
 *
 * 覆盖：
 * - catalog 接口返回结构正确
 * - 内容与 PERMISSION_CATALOG 一致，含关键权限位（admissions 修复的 training-order:*）
 * - key 全局唯一
 * - PermissionsGuard 在携带 admin:roles 时放行，缺权限时拒绝
 */

describe('PermissionsController', () => {
  let controller: PermissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
  });

  describe('getCatalog', () => {
    it('返回 success=true 与 PERMISSION_CATALOG 引用一致', () => {
      const result = controller.getCatalog();
      expect(result.success).toBe(true);
      expect(result.data).toBe(PERMISSION_CATALOG);
      expect(result.message).toBe('获取权限目录成功');
    });

    it('catalog 至少包含所有已知分组', () => {
      const result = controller.getCatalog();
      const titles = result.data.map((g) => g.title);
      expect(titles).toEqual(
        expect.arrayContaining([
          '阿姨管理', '客户管理', '合同管理', '保险管理', '背调管理',
          '职培线索', '职培合同', '员工评价', '用户管理', '系统管理',
        ]),
      );
    });

    it('每个权限项都带有 key/label/description/color', () => {
      const result = controller.getCatalog();
      result.data.forEach((group) => {
        group.permissions.forEach((perm) => {
          expect(typeof perm.key).toBe('string');
          expect(perm.key).toMatch(/^[a-z-]+:[a-z-]+$/);
          expect(typeof perm.label).toBe('string');
          expect(perm.label.length).toBeGreaterThan(0);
          expect(typeof perm.description).toBe('string');
          expect(typeof perm.color).toBe('string');
          expect(perm.color.length).toBeGreaterThan(0);
        });
      });
    });

    it('权限 key 全局唯一', () => {
      const unique = new Set(ALL_PERMISSION_KEYS);
      expect(unique.size).toBe(ALL_PERMISSION_KEYS.length);
    });

    it('包含本次修复涉及的关键权限位', () => {
      expect(ALL_PERMISSION_KEYS).toEqual(
        expect.arrayContaining([
          'training-order:view',
          'training-order:create',
          'training-lead:admin',
          'admin:roles',
        ]),
      );
    });

    it('不再出现旧命名 training_leads:admin', () => {
      expect(ALL_PERMISSION_KEYS).not.toContain('training_leads:admin');
    });
  });

  describe('PermissionsGuard 鉴权', () => {
    const reflector = new Reflector();
    const guard = new PermissionsGuard(reflector);

    // 构造 ExecutionContext：通过 prototype + method 让 Reflector 读到 @Permissions('admin:roles')
    const buildContext = (userPermissions: string[]) => ({
      getHandler: () => PermissionsController.prototype.getCatalog,
      getClass: () => PermissionsController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions: userPermissions } }),
      }),
    } as any);

    it('用户持有 admin:roles 可访问', () => {
      expect(guard.canActivate(buildContext(['admin:roles']))).toBe(true);
    });

    it('用户持有 admin:all（resource:all 通配）可访问', () => {
      expect(guard.canActivate(buildContext(['admin:all']))).toBe(true);
    });

    it('用户持有 * 通配可访问', () => {
      expect(guard.canActivate(buildContext(['*']))).toBe(true);
    });

    it('仅持有无关权限（如 resume:view）应被拒绝', () => {
      expect(guard.canActivate(buildContext(['resume:view']))).toBe(false);
    });

    it('用户无任何权限应被拒绝', () => {
      expect(guard.canActivate(buildContext([]))).toBe(false);
    });
  });
});
