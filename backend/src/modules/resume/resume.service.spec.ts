import { ResumeService } from './resume.service';

/**
 * 专注验证 CRM 录简历反查推荐库（双向去重）的核心逻辑：
 *   ResumeService.validateReferralUniqueness
 *
 * ResumeService 依赖众多，这里手动构造实例，仅注入测试所需的 referralResumeModel。
 */

type AnyFn = (...args: any[]) => any;
const noop = () => undefined;

function buildReferralModel(hitDoc: any | null) {
  const lastQuery: { filter?: any } = {};
  const model: any = {
    findOne: jest.fn().mockImplementation((filter: any) => {
      lastQuery.filter = filter;
      return {
        select: () => ({
          lean: () => ({ exec: async () => hitDoc }),
        }),
      };
    }),
  };
  return { model, lastQuery };
}

function makeService(referralResumeModel: any): ResumeService {
  const dummyModel = {} as any;
  const dummyService: Record<string, AnyFn> = new Proxy({}, { get: () => noop });
  return new ResumeService(
    dummyModel,                // resumeModel
    dummyModel,                // contractModel
    dummyModel,                // resumeOperationLogModel
    dummyService as any,       // uploadService
    dummyService as any,       // jwtService
    dummyModel,                // employeeEvaluationModel
    dummyService as any,       // resumeQueryService
    dummyModel,                // userModel
    dummyService as any,       // dashubaoService
    dummyModel,                // backgroundCheckModel
    dummyService as any,       // qwenAIService
    referralResumeModel,       // referralResumeModel（被测试）
  );
}

describe('ResumeService.validateReferralUniqueness', () => {
  it('手机号命中 pending_review 推荐 → 抛 ConflictException(DUPLICATE_REFERRAL_PHONE)', async () => {
    const { model, lastQuery } = buildReferralModel({
      _id: 'ref_1',
      phone: '13800000000',
      idCard: undefined,
      referrerName: '张推荐',
      status: 'pending_review',
    });
    const svc = makeService(model);

    await expect(
      (svc as any).validateReferralUniqueness('13800000000', undefined),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        error: 'DUPLICATE_REFERRAL_PHONE',
        referrerName: '张推荐',
        referralStatus: 'pending_review',
      }),
    });

    // 查询条件必须排除 rejected/invalid/activated/released 四种状态
    expect(lastQuery.filter.status.$nin).toEqual(
      expect.arrayContaining(['rejected', 'invalid', 'activated', 'released']),
    );
  });

  it('身份证命中 following_up 推荐 → 抛 ConflictException(DUPLICATE_REFERRAL_ID_NUMBER)', async () => {
    const { model } = buildReferralModel({
      _id: 'ref_2',
      phone: undefined,
      idCard: '110101199001011234',
      referrerName: '李推荐',
      status: 'following_up',
    });
    const svc = makeService(model);

    await expect(
      (svc as any).validateReferralUniqueness(undefined, '110101199001011234'),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        error: 'DUPLICATE_REFERRAL_ID_NUMBER',
        referralStatus: 'following_up',
      }),
    });
  });

  it('未命中任何推荐 → 放行（不抛异常）', async () => {
    const { model } = buildReferralModel(null);
    const svc = makeService(model);

    await expect(
      (svc as any).validateReferralUniqueness('13900000000', undefined),
    ).resolves.toBeUndefined();
  });

  it('phone 与 idCard 都未提供 → 直接放行，且不查库', async () => {
    const { model } = buildReferralModel(null);
    const svc = makeService(model);

    await expect(
      (svc as any).validateReferralUniqueness(undefined, undefined),
    ).resolves.toBeUndefined();
    expect(model.findOne).not.toHaveBeenCalled();
  });

  it('命中记录但状态为 released → 不应被返回（通过 $nin 过滤）→ 放行', async () => {
    // 模拟 MongoDB 的 $nin 过滤：released 状态的记录不会命中
    const { model, lastQuery } = buildReferralModel(null);
    const svc = makeService(model);

    await expect(
      (svc as any).validateReferralUniqueness('13700000000', undefined),
    ).resolves.toBeUndefined();

    // 验证查询条件包含 released 到排除列表
    expect(lastQuery.filter.status.$nin).toContain('released');
    expect(lastQuery.filter.status.$nin).toContain('activated');
    expect(lastQuery.filter.status.$nin).toContain('rejected');
    expect(lastQuery.filter.status.$nin).toContain('invalid');
  });

  it('推荐记录无 referrerName → 错误信息兜底"未知推荐人"', async () => {
    const { model } = buildReferralModel({
      _id: 'ref_3',
      phone: '13600000000',
      referrerName: undefined,
      status: 'approved',
    });
    const svc = makeService(model);

    await expect(
      (svc as any).validateReferralUniqueness('13600000000', undefined),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        referrerName: '未知推荐人',
      }),
    });
  });
});
