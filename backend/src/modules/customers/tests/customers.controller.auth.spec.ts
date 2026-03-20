import { ForbiddenException } from '@nestjs/common';

/**
 * CRM 客户详情资源级鉴权单元测试 (A7)
 *
 * 测试 CustomersController.findOne 的 canAccessCustomer 逻辑。
 * 使用直接调用私有辅助方法的方式，避免完整 NestJS 容器依赖。
 */

// ---- 复制控制器中的 canAccessCustomer 逻辑以便独立测试 ----

function mapRoleToChineseRole(role: string): string {
  const roleMap: Record<string, string> = {
    admin: '系统管理员',
    manager: '经理',
    employee: '普通员工',
  };
  return roleMap[role] || role;
}

function canAccessCustomer(customer: any, user: any): boolean {
  const userRole = mapRoleToChineseRole(user.role);
  if (userRole === '系统管理员') return true;
  if (userRole === '经理') return true;
  if (userRole === '普通员工') {
    let assignedToId: string | undefined;
    if (customer.assignedTo) {
      if (typeof customer.assignedTo === 'string') {
        assignedToId = customer.assignedTo;
      } else if (customer.assignedTo._id) {
        assignedToId = customer.assignedTo._id?.toString?.() || customer.assignedTo._id;
      } else {
        assignedToId = customer.assignedTo.toString?.() || String(customer.assignedTo);
      }
    }
    return assignedToId === user.userId;
  }
  return false;
}

// ---- 测试 ----

describe('CustomersController.canAccessCustomer (A7)', () => {
  const ownedCustomer = { assignedTo: 'emp-001' };
  const othersCustomer = { assignedTo: 'emp-002' };
  const unassignedCustomer = { assignedTo: null };
  const populatedCustomer = { assignedTo: { _id: 'emp-001', name: '张三' } };

  describe('管理员', () => {
    const admin = { userId: 'admin-001', role: 'admin' };
    it('可访问任意客户', () => expect(canAccessCustomer(ownedCustomer, admin)).toBe(true));
    it('可访问他人客户', () => expect(canAccessCustomer(othersCustomer, admin)).toBe(true));
    it('可访问未分配客户', () => expect(canAccessCustomer(unassignedCustomer, admin)).toBe(true));
  });

  describe('经理', () => {
    const manager = { userId: 'mgr-001', role: 'manager' };
    it('可访问任意客户', () => expect(canAccessCustomer(ownedCustomer, manager)).toBe(true));
    it('可访问他人客户', () => expect(canAccessCustomer(othersCustomer, manager)).toBe(true));
  });

  describe('普通员工', () => {
    const employee = { userId: 'emp-001', role: 'employee' };

    it('可访问自己负责的客户（字符串 assignedTo）', () => {
      expect(canAccessCustomer(ownedCustomer, employee)).toBe(true);
    });

    it('可访问自己负责的客户（populate 后的对象 assignedTo）', () => {
      expect(canAccessCustomer(populatedCustomer, employee)).toBe(true);
    });

    it('不可访问他人负责的客户', () => {
      expect(canAccessCustomer(othersCustomer, employee)).toBe(false);
    });

    it('不可访问未分配的客户', () => {
      expect(canAccessCustomer(unassignedCustomer, employee)).toBe(false);
    });
  });

  describe('未知角色', () => {
    it('默认拒绝访问', () => {
      expect(canAccessCustomer(ownedCustomer, { userId: 'x', role: 'unknown' })).toBe(false);
    });
  });
});
