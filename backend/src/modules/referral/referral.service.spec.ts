import { ReferralService } from './referral.service';

/**
 * 专注验证本次改造的两块核心逻辑：
 *   1. resolveAssignedStaffId —— assignedStaffId 的三级回落
 *   2. getStaffPublicInfo —— 员工公共信息暴露（含 isActive）
 *
 * 因 ReferralService 依赖众多，这里手动构造实例，仅注入测试所需的 usersService，
 * 其他依赖用最小占位对象，避免拉起完整 TestingModule。
 */

type AnyFn = (...args: any[]) => any;
const noop = () => undefined;

function makeService(overrides: { usersService: any }): ReferralService {
  const dummyModel = {} as any;
  const dummyService: Record<string, AnyFn> = new Proxy({}, { get: () => noop });
  return new ReferralService(
    dummyModel,                 // referrerModel
    dummyModel,                 // referralResumeModel
    dummyModel,                 // bindingLogModel
    dummyModel,                 // rewardModel
    dummyModel,                 // mpUserModel
    dummyModel,                 // contractModel
    dummyService as any,        // resumeService
    overrides.usersService,     // usersService（被测试）
    dummyService as any,        // mpUserService
    dummyService as any,        // notificationService
    dummyService as any,        // wechatCloudService
  );
}

describe('ReferralService.resolveAssignedStaffId', () => {
  it('targetStaffId 对应员工在职 → 直接使用 targetStaffId', async () => {
    const usersService = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'staff_C') return { _id: 'staff_C', name: 'C员工', isActive: true };
        throw new Error(`unexpected findById(${id})`);
      }),
      findAdminUser: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveAssignedStaffId('staff_C', 'staff_A');

    expect(result).toBe('staff_C');
    expect(usersService.findById).toHaveBeenCalledWith('staff_C');
    expect(usersService.findAdminUser).not.toHaveBeenCalled();
  });

  it('targetStaffId 为空 → 回落 sourceStaffId（且 sourceStaffId 在职）', async () => {
    const usersService = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'staff_A') return { _id: 'staff_A', name: 'A员工', isActive: true };
        return null;
      }),
      findAdminUser: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveAssignedStaffId(undefined, 'staff_A');

    expect(result).toBe('staff_A');
    expect(usersService.findAdminUser).not.toHaveBeenCalled();
  });

  it('targetStaffId 空字符串 → 按空处理，回落 sourceStaffId', async () => {
    const usersService = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'staff_A') return { _id: 'staff_A', isActive: true };
        return null;
      }),
      findAdminUser: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveAssignedStaffId('   ', 'staff_A');

    expect(result).toBe('staff_A');
  });

  it('targetStaffId 员工已离职 → 回落到在职的 sourceStaffId', async () => {
    const usersService = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'staff_C') return { _id: 'staff_C', name: 'C员工', isActive: false };
        if (id === 'staff_A') return { _id: 'staff_A', name: 'A员工', isActive: true };
        return null;
      }),
      findAdminUser: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveAssignedStaffId('staff_C', 'staff_A');

    expect(result).toBe('staff_A');
    expect(usersService.findAdminUser).not.toHaveBeenCalled();
  });

  it('targetStaffId 不存在 → 回落到在职的 sourceStaffId', async () => {
    const usersService = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'staff_A') return { _id: 'staff_A', isActive: true };
        return null;
      }),
      findAdminUser: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveAssignedStaffId('ghost_staff', 'staff_A');

    expect(result).toBe('staff_A');
  });

  it('target 和 source 都离职 → 兜底管理员', async () => {
    const usersService = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'staff_C') return { _id: 'staff_C', isActive: false };
        if (id === 'staff_A') return { _id: 'staff_A', isActive: false };
        return null;
      }),
      findAdminUser: jest.fn().mockResolvedValue({ _id: 'admin_1', name: '系统管理员' }),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveAssignedStaffId('staff_C', 'staff_A');

    expect(result).toBe('admin_1');
    expect(usersService.findAdminUser).toHaveBeenCalledTimes(1);
  });

  it('target 和 source 都离职 且 无管理员 → 回退到原候选（保底不抛错）', async () => {
    const usersService = {
      findById: jest.fn().mockImplementation(async () => ({ isActive: false })),
      findAdminUser: jest.fn().mockResolvedValue(null),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveAssignedStaffId('staff_C', 'staff_A');

    expect(result).toBe('staff_C');
  });

  it('findById 抛异常 → 视作员工不存在并按离职路径处理', async () => {
    const usersService = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'staff_C') throw new Error('db down');
        if (id === 'staff_A') return { _id: 'staff_A', isActive: true };
        return null;
      }),
      findAdminUser: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveAssignedStaffId('staff_C', 'staff_A');

    expect(result).toBe('staff_A');
  });
});

describe('ReferralService.getStaffPublicInfo', () => {
  it('返回员工公共信息，isActive=true', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        _id: 'staff_1',
        name: '张三',
        avatar: 'https://cdn/x.png',
        phone: '13800000000',
        isActive: true,
      }),
      findAdminUser: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await svc.getStaffPublicInfo('staff_1');

    expect(result).toEqual({
      _id: 'staff_1',
      name: '张三',
      avatar: 'https://cdn/x.png',
      phone: '13800000000',
      isActive: true,
    });
  });

  it('员工已离职 → isActive=false', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        _id: 'staff_2',
        name: '李四',
        isActive: false,
      }),
      findAdminUser: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await svc.getStaffPublicInfo('staff_2');

    expect(result?.isActive).toBe(false);
    expect(result?.name).toBe('李四');
  });

  it('isActive 字段缺失 → 默认视作在职（isActive=true）', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({ _id: 'staff_3', name: '王五' }),
      findAdminUser: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await svc.getStaffPublicInfo('staff_3');

    expect(result?.isActive).toBe(true);
  });

  it('员工不存在 → 返回 null', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue(null),
      findAdminUser: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await svc.getStaffPublicInfo('ghost');

    expect(result).toBeNull();
  });

  it('findById 抛异常 → 返回 null（被 catch 吞掉）', async () => {
    const usersService = {
      findById: jest.fn().mockRejectedValue(new Error('db down')),
      findAdminUser: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await svc.getStaffPublicInfo('any_id');

    expect(result).toBeNull();
  });
});
