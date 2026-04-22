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

function makeService(overrides: {
  usersService: any;
  referralResumeModel?: any;
  resumeService?: any;
}): ReferralService {
  const dummyModel = {} as any;
  const dummyService: Record<string, AnyFn> = new Proxy({}, { get: () => noop });
  return new ReferralService(
    dummyModel,                                     // referrerModel
    overrides.referralResumeModel ?? dummyModel,    // referralResumeModel
    dummyModel,                                     // bindingLogModel
    dummyModel,                                     // rewardModel
    dummyModel,                                     // mpUserModel
    dummyModel,                                     // contractModel
    (overrides.resumeService ?? dummyService) as any, // resumeService
    overrides.usersService,                         // usersService
    dummyService as any,                            // mpUserService
    dummyService as any,                            // notificationService
    dummyService as any,                            // notificationHelperService
    dummyService as any,                            // wechatCloudService
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

describe('ReferralService.releaseToResumeLibrary', () => {
  /** 构造 mock referralResumeModel，findById 返回传入的 doc，updateOne 记录调用 */
  function buildRefModel(doc: any) {
    const updateCalls: any[] = [];
    const model: any = {
      findById: jest.fn().mockReturnValue({ exec: async () => doc }),
      updateOne: jest.fn().mockImplementation((filter: any, update: any) => {
        updateCalls.push({ filter, update });
        return { exec: async () => ({ modifiedCount: 1 }) };
      }),
    };
    return { model, updateCalls };
  }

  it('非 admin 且 assignedStaffId 不匹配 → 403 ForbiddenException', async () => {
    const doc = { _id: 'ref_1', status: 'approved', assignedStaffId: 'staff_OWNER' };
    const { model } = buildRefModel(doc);
    const svc = makeService({
      usersService: { findById: jest.fn(), findAdminUser: jest.fn() },
      referralResumeModel: model,
    });

    await expect(
      svc.releaseToResumeLibrary('staff_OTHER', false, 'ref_1'),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('状态不在 approved/following_up（如 contracted）→ 400 BadRequestException', async () => {
    const doc = { _id: 'ref_2', status: 'contracted', assignedStaffId: 'staff_OWNER' };
    const { model, updateCalls } = buildRefModel(doc);
    const svc = makeService({
      usersService: { findById: jest.fn(), findAdminUser: jest.fn() },
      referralResumeModel: model,
    });

    await expect(
      svc.releaseToResumeLibrary('staff_OWNER', false, 'ref_2'),
    ).rejects.toMatchObject({ status: 400 });
    expect(updateCalls).toHaveLength(0); // 未触发任何状态变更
  });

  it('已存在 linkedResumeId → 400（防重）', async () => {
    const doc = { _id: 'ref_3', status: 'approved', assignedStaffId: 'staff_OWNER', linkedResumeId: 'resume_EXIST' };
    const { model } = buildRefModel(doc);
    const svc = makeService({
      usersService: { findById: jest.fn(), findAdminUser: jest.fn() },
      referralResumeModel: model,
    });

    await expect(
      svc.releaseToResumeLibrary('staff_OWNER', true, 'ref_3'),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('成功路径：assignedStaff 本人释放 → 状态置为 released 且回写 linkedResumeId', async () => {
    const doc = {
      _id: 'ref_4', status: 'following_up', assignedStaffId: 'staff_OWNER',
      name: '张阿姨', phone: '13800000000', idCard: undefined,
      serviceType: 'yuesao', experience: '三年月嫂', remark: '客户满意',
      referrerName: '李推荐',
    };
    const { model, updateCalls } = buildRefModel(doc);
    const resumeService = {
      createMinimalFromReferral: jest.fn().mockResolvedValue({ _id: 'resume_NEW' }),
      logOperation: jest.fn().mockResolvedValue(undefined),
    };
    const svc = makeService({
      usersService: { findById: jest.fn().mockResolvedValue({ name: '归属员工A' }), findAdminUser: jest.fn() },
      referralResumeModel: model,
      resumeService,
    });

    const result = await svc.releaseToResumeLibrary('staff_OWNER', false, 'ref_4');

    expect(result).toEqual({ resumeId: 'resume_NEW' });
    // 第一次 updateOne：置 released + releasedAt/releasedBy
    expect(updateCalls[0].update.$set).toMatchObject({ status: 'released', releasedBy: 'staff_OWNER' });
    expect(updateCalls[0].update.$set.releasedAt).toBeInstanceOf(Date);
    // 第二次 updateOne：回写 linkedResumeId
    expect(updateCalls[1].update.$set).toEqual({ linkedResumeId: 'resume_NEW' });
    // createMinimalFromReferral 透传推荐信息
    expect(resumeService.createMinimalFromReferral).toHaveBeenCalledWith(expect.objectContaining({
      name: '张阿姨', phone: '13800000000', jobType: 'yuesao',
      referrerName: '李推荐', operatorStaffId: 'staff_OWNER',
    }));
    // 写简历操作日志
    expect(resumeService.logOperation).toHaveBeenCalledWith(
      'resume_NEW',
      'staff_OWNER',
      'release_from_referral',
      '从推荐库释放',
      expect.objectContaining({ relatedId: 'ref_4', relatedType: 'referral_resume' }),
    );
  });

  it('成功路径：admin 释放他人名下记录 → 也能通过', async () => {
    const doc = {
      _id: 'ref_5', status: 'approved', assignedStaffId: 'staff_OTHER',
      name: '王阿姨', phone: '13900000000', serviceType: 'baiban-baomu',
      referrerName: '赵推荐',
    };
    const { model, updateCalls } = buildRefModel(doc);
    const resumeService = {
      createMinimalFromReferral: jest.fn().mockResolvedValue({ _id: 'resume_5' }),
      logOperation: jest.fn().mockResolvedValue(undefined),
    };
    const svc = makeService({
      usersService: { findById: jest.fn().mockResolvedValue({ name: 'X' }), findAdminUser: jest.fn() },
      referralResumeModel: model,
      resumeService,
    });

    const result = await svc.releaseToResumeLibrary('admin_1', true, 'ref_5');

    expect(result).toEqual({ resumeId: 'resume_5' });
    expect(updateCalls[0].update.$set.status).toBe('released');
    expect(updateCalls[0].update.$set.releasedBy).toBe('admin_1');
  });

  it('createMinimalFromReferral 失败 → 回滚 status 到原状态', async () => {
    const doc = {
      _id: 'ref_6', status: 'approved', assignedStaffId: 'staff_OWNER',
      name: '孙阿姨', phone: '13700000000', serviceType: 'yuesao',
    };
    const { model, updateCalls } = buildRefModel(doc);
    const resumeService = {
      createMinimalFromReferral: jest.fn().mockRejectedValue(new Error('手机号已被使用')),
      logOperation: jest.fn().mockResolvedValue(undefined),
    };
    const svc = makeService({
      usersService: { findById: jest.fn().mockResolvedValue(null), findAdminUser: jest.fn() },
      referralResumeModel: model,
      resumeService,
    });

    await expect(
      svc.releaseToResumeLibrary('staff_OWNER', false, 'ref_6'),
    ).rejects.toThrow('手机号已被使用');

    // 两次 update：先置 released，再回滚
    expect(updateCalls).toHaveLength(2);
    expect(updateCalls[0].update.$set.status).toBe('released');
    expect(updateCalls[1].update.$set.status).toBe('approved');
    expect(updateCalls[1].update.$unset).toEqual({ releasedAt: 1, releasedBy: 1 });
  });
});


describe('ReferralService.resolveSourceStaffId', () => {
  // 一个合法的 24 位 hex ObjectId 字符串，供 Types.ObjectId.isValid 通过
  const VALID_OID = '68c919be2c0648781936c5f9';

  it('优先级 1：sourceOpenid 命中 users.wechatOpenId → 直接使用真实 _id', async () => {
    const usersService = {
      findByWeChatOpenId: jest.fn().mockResolvedValue({ _id: { toString: () => 'staff_A' } }),
      findByPhone: jest.fn(),
      findById: jest.fn(),
      findAdminUser: jest.fn(),
      updateWeChatInfo: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveSourceStaffId({
      sourceOpenid: 'o-xxx',
      sourcePhone: '13800000000',
      sourceStaffId: VALID_OID,
    });

    expect(result).toBe('staff_A');
    // 命中即停，不应继续往下查
    expect(usersService.findByPhone).not.toHaveBeenCalled();
    expect(usersService.findById).not.toHaveBeenCalled();
    expect(usersService.findAdminUser).not.toHaveBeenCalled();
  });

  it('优先级 2：sourceOpenid 未命中，sourcePhone 命中 → 使用真实 _id，且 wechatOpenId 空时回填', async () => {
    const usersService = {
      findByWeChatOpenId: jest.fn().mockResolvedValue(null),
      findByPhone: jest.fn().mockResolvedValue({
        _id: { toString: () => 'staff_B' },
        wechatOpenId: undefined,
      }),
      findById: jest.fn(),
      findAdminUser: jest.fn(),
      updateWeChatInfo: jest.fn().mockResolvedValue(undefined),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveSourceStaffId({
      sourceOpenid: 'o-new',
      sourcePhone: '13900000000',
      sourceStaffId: VALID_OID,
    });

    expect(result).toBe('staff_B');
    expect(usersService.updateWeChatInfo).toHaveBeenCalledWith('staff_B', { openId: 'o-new' });
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('优先级 2：phone 命中但员工已有 wechatOpenId → 不重复回填', async () => {
    const usersService = {
      findByWeChatOpenId: jest.fn().mockResolvedValue(null),
      findByPhone: jest.fn().mockResolvedValue({
        _id: { toString: () => 'staff_B' },
        wechatOpenId: 'o-old',
      }),
      findById: jest.fn(),
      findAdminUser: jest.fn(),
      updateWeChatInfo: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveSourceStaffId({
      sourceOpenid: 'o-new',
      sourcePhone: '13900000000',
    });

    expect(result).toBe('staff_B');
    expect(usersService.updateWeChatInfo).not.toHaveBeenCalled();
  });

  it('优先级 3：openid/phone 均未命中，sourceStaffId 合法且查到 → 使用该 _id', async () => {
    const usersService = {
      findByWeChatOpenId: jest.fn().mockResolvedValue(null),
      findByPhone: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue({ _id: { toString: () => 'staff_C' } }),
      findAdminUser: jest.fn(),
      updateWeChatInfo: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveSourceStaffId({
      sourceOpenid: 'o-ghost',
      sourcePhone: '13700000000',
      sourceStaffId: VALID_OID,
    });

    expect(result).toBe('staff_C');
    expect(usersService.findById).toHaveBeenCalledWith(VALID_OID);
    expect(usersService.findAdminUser).not.toHaveBeenCalled();
  });

  it('sourceStaffId 非合法 ObjectId → 跳过 findById 直接兜底管理员', async () => {
    const usersService = {
      findByWeChatOpenId: jest.fn().mockResolvedValue(null),
      findByPhone: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      findAdminUser: jest.fn().mockResolvedValue({ _id: { toString: () => 'admin_1' } }),
      updateWeChatInfo: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveSourceStaffId({
      sourceStaffId: 'not-an-objectid',
    });

    expect(result).toBe('admin_1');
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('三件套全部未命中 → 兜底管理员 _id', async () => {
    const usersService = {
      findByWeChatOpenId: jest.fn().mockResolvedValue(null),
      findByPhone: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      findAdminUser: jest.fn().mockResolvedValue({ _id: { toString: () => 'admin_1' } }),
      updateWeChatInfo: jest.fn(),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveSourceStaffId({
      sourceOpenid: 'o-ghost',
      sourcePhone: '13700000000',
      sourceStaffId: VALID_OID,
    });

    expect(result).toBe('admin_1');
    expect(usersService.findAdminUser).toHaveBeenCalledTimes(1);
  });

  it('三件套未命中且无管理员 → 抛 BadRequestException', async () => {
    const usersService = {
      findByWeChatOpenId: jest.fn().mockResolvedValue(null),
      findByPhone: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      findAdminUser: jest.fn().mockResolvedValue(null),
      updateWeChatInfo: jest.fn(),
    };
    const svc = makeService({ usersService });

    await expect(
      (svc as any).resolveSourceStaffId({ sourceStaffId: VALID_OID }),
    ).rejects.toThrow('未能定位到有效的来源员工');
  });

  it('phone 命中但 updateWeChatInfo 抛错 → 不影响主流程，仍返回真实 _id', async () => {
    const usersService = {
      findByWeChatOpenId: jest.fn().mockResolvedValue(null),
      findByPhone: jest.fn().mockResolvedValue({
        _id: { toString: () => 'staff_B' },
        wechatOpenId: null,
      }),
      findById: jest.fn(),
      findAdminUser: jest.fn(),
      updateWeChatInfo: jest.fn().mockRejectedValue(new Error('db write failed')),
    };
    const svc = makeService({ usersService });

    const result = await (svc as any).resolveSourceStaffId({
      sourceOpenid: 'o-new',
      sourcePhone: '13900000000',
    });

    expect(result).toBe('staff_B');
    expect(usersService.updateWeChatInfo).toHaveBeenCalled();
  });
});
