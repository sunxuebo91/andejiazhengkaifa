import { Types } from 'mongoose';
import { ResumeService } from '../resume.service';

/**
 * 简历"释放"机制单元测试：
 *   - assertReleasedForContract 三分支
 *   - releaseForContract 权限/幂等
 *   - getReleaseLogs 三类可见性
 */

type AnyFn = (...args: any[]) => any;
const noop = () => undefined;

function buildResumeModel(initial: any) {
  const state = { resume: initial, updates: [] as any[] };
  const model: any = {
    findById: jest.fn().mockImplementation(() => ({
      select: () => ({ lean: () => state.resume }),
    })),
    updateOne: jest.fn().mockImplementation((filter: any, update: any) => {
      state.updates.push({ filter, update });
      return Promise.resolve({ acknowledged: true, modifiedCount: 1 });
    }),
  };
  return { model, state };
}

function buildLogModel(seedLogs: any[] = []) {
  const created: any[] = [];
  const lastFindFilter: { filter?: any } = {};
  const model: any = {
    create: jest.fn().mockImplementation((doc: any) => {
      created.push(doc);
      return Promise.resolve(doc);
    }),
    find: jest.fn().mockImplementation((filter: any) => {
      lastFindFilter.filter = filter;
      const matched = seedLogs.filter(l => {
        if (filter.operationType?.$in && !filter.operationType.$in.includes(l.operationType)) return false;
        if (typeof filter.operationType === 'string' && filter.operationType !== l.operationType) return false;
        if (filter.operatorId && String(l.operatorId) !== String(filter.operatorId)) return false;
        return true;
      });
      return {
        populate: () => ({ sort: () => ({ lean: () => ({ exec: async () => matched }) }) }),
      };
    }),
  };
  return { model, created, lastFindFilter };
}

function buildUserModel(byId: Record<string, any>) {
  return {
    findById: jest.fn().mockImplementation((id: string) => ({
      select: () => ({ lean: async () => byId[String(id)] || null }),
    })),
  } as any;
}

function makeService(opts: {
  resumeModel: any;
  resumeOperationLogModel: any;
  userModel: any;
  notificationHelper: any;
}): ResumeService {
  const dummyModel = {} as any;
  const dummyService: Record<string, AnyFn> = new Proxy({}, { get: () => noop });
  return new ResumeService(
    opts.resumeModel,
    dummyModel,
    opts.resumeOperationLogModel,
    dummyService as any,
    dummyService as any,
    dummyModel,
    dummyService as any,
    opts.userModel,
    dummyService as any,
    dummyModel,
    dummyService as any,
    dummyModel,
    dummyService as any,
    dummyService as any,
    opts.notificationHelper,
  );
}

const RESUME_ID = '507f1f77bcf86cd799439011';
const CREATOR_ID = '507f1f77bcf86cd799439021';
const OTHER_ID = '507f1f77bcf86cd799439031';
const ADMIN_ID = '507f1f77bcf86cd799439041';

describe('ResumeService.assertReleasedForContract', () => {
  it('简历已释放 → 直接放行，不写日志、不通知', async () => {
    const { model: resumeModel } = buildResumeModel({
      _id: new Types.ObjectId(RESUME_ID), name: '张三', userId: new Types.ObjectId(CREATOR_ID),
      releasedForContract: true,
    });
    const { model: logModel, created } = buildLogModel();
    const notificationHelper: any = { notifyResumeReleaseRequested: jest.fn() };
    const svc = makeService({
      resumeModel, resumeOperationLogModel: logModel,
      userModel: buildUserModel({}), notificationHelper,
    });
    await expect(svc.assertReleasedForContract(RESUME_ID, OTHER_ID)).resolves.toBeUndefined();
    expect(created).toHaveLength(0);
    expect(notificationHelper.notifyResumeReleaseRequested).not.toHaveBeenCalled();
  });

  it('发起人 == 创建人 + 未释放 → 自动释放 + 写日志(auto_release_first_contract)', async () => {
    const { model: resumeModel, state } = buildResumeModel({
      _id: new Types.ObjectId(RESUME_ID), name: '张三', userId: new Types.ObjectId(CREATOR_ID),
      releasedForContract: false,
    });
    const { model: logModel, created } = buildLogModel();
    const notificationHelper: any = { notifyResumeReleaseRequested: jest.fn() };
    const svc = makeService({
      resumeModel, resumeOperationLogModel: logModel,
      userModel: buildUserModel({}), notificationHelper,
    });
    await expect(svc.assertReleasedForContract(RESUME_ID, CREATOR_ID)).resolves.toBeUndefined();
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].update.$set.releasedForContract).toBe(true);
    expect(created).toHaveLength(1);
    expect(created[0].operationType).toBe('auto_release_first_contract');
    expect(notificationHelper.notifyResumeReleaseRequested).not.toHaveBeenCalled();
  });

  it('他人发起 + 未释放 → 写日志(contract_blocked_by_release) + 通知创建人 + 抛 ConflictException', async () => {
    const { model: resumeModel } = buildResumeModel({
      _id: new Types.ObjectId(RESUME_ID), name: '张三', userId: new Types.ObjectId(CREATOR_ID),
      releasedForContract: false,
    });
    const { model: logModel, created } = buildLogModel();
    const notificationHelper: any = { notifyResumeReleaseRequested: jest.fn().mockResolvedValue([]) };
    const userModel = buildUserModel({
      [OTHER_ID]: { name: '李派单' }, [CREATOR_ID]: { name: '王招生' },
    });
    const svc = makeService({ resumeModel, resumeOperationLogModel: logModel, userModel, notificationHelper });
    await expect(svc.assertReleasedForContract(RESUME_ID, OTHER_ID))
      .rejects.toMatchObject({ status: 409 });
    expect(created).toHaveLength(1);
    expect(created[0].operationType).toBe('contract_blocked_by_release');
    expect(notificationHelper.notifyResumeReleaseRequested).toHaveBeenCalledWith(
      CREATOR_ID,
      expect.objectContaining({ resumeId: RESUME_ID, resumeName: '张三', initiatorName: '李派单' }),
    );
  });
});

describe('ResumeService.releaseForContract', () => {
  it('已释放 → 幂等返回 alreadyReleased=true，不再写日志', async () => {
    const { model: resumeModel } = buildResumeModel({
      _id: new Types.ObjectId(RESUME_ID), userId: new Types.ObjectId(CREATOR_ID),
      releasedForContract: true, releasedAt: new Date('2024-01-01'),
    });
    const { model: logModel, created } = buildLogModel();
    const svc = makeService({
      resumeModel, resumeOperationLogModel: logModel,
      userModel: buildUserModel({}), notificationHelper: {} as any,
    });
    const r = await svc.releaseForContract(RESUME_ID, CREATOR_ID, false);
    expect(r.alreadyReleased).toBe(true);
    expect(created).toHaveLength(0);
  });

  it('非创建人非管理员 → 抛 ForbiddenException', async () => {
    const { model: resumeModel } = buildResumeModel({
      _id: new Types.ObjectId(RESUME_ID), userId: new Types.ObjectId(CREATOR_ID),
      releasedForContract: false,
    });
    const { model: logModel } = buildLogModel();
    const svc = makeService({
      resumeModel, resumeOperationLogModel: logModel,
      userModel: buildUserModel({}), notificationHelper: {} as any,
    });
    await expect(svc.releaseForContract(RESUME_ID, OTHER_ID, false))
      .rejects.toMatchObject({ status: 403 });
  });

  it('创建人开启 → 释放成功 + 写日志(release_for_contract)', async () => {
    const { model: resumeModel, state } = buildResumeModel({
      _id: new Types.ObjectId(RESUME_ID), userId: new Types.ObjectId(CREATOR_ID),
      releasedForContract: false,
    });
    const { model: logModel, created } = buildLogModel();
    const svc = makeService({
      resumeModel, resumeOperationLogModel: logModel,
      userModel: buildUserModel({}), notificationHelper: {} as any,
    });
    const r = await svc.releaseForContract(RESUME_ID, CREATOR_ID, false);
    expect(r.alreadyReleased).toBe(false);
    expect(state.updates[0].update.$set.releasedForContract).toBe(true);
    expect(created[0].operationType).toBe('release_for_contract');
    expect(created[0].operationName).toContain('创建人');
  });

  it('管理员（非创建人）开启 → 释放成功 + 日志名称为管理员', async () => {
    const { model: resumeModel } = buildResumeModel({
      _id: new Types.ObjectId(RESUME_ID), userId: new Types.ObjectId(CREATOR_ID),
      releasedForContract: false,
    });
    const { model: logModel, created } = buildLogModel();
    const svc = makeService({
      resumeModel, resumeOperationLogModel: logModel,
      userModel: buildUserModel({}), notificationHelper: {} as any,
    });
    await svc.releaseForContract(RESUME_ID, ADMIN_ID, true);
    expect(created[0].operationType).toBe('release_for_contract');
    expect(created[0].operationName).toContain('管理员');
  });
});

describe('ResumeService.getReleaseLogs', () => {
  const seed = [
    { _id: 'l1', resumeId: new Types.ObjectId(RESUME_ID), operationType: 'release_for_contract', operatorId: new Types.ObjectId(CREATOR_ID) },
    { _id: 'l2', resumeId: new Types.ObjectId(RESUME_ID), operationType: 'auto_release_first_contract', operatorId: new Types.ObjectId(CREATOR_ID) },
    { _id: 'l3', resumeId: new Types.ObjectId(RESUME_ID), operationType: 'contract_blocked_by_release', operatorId: new Types.ObjectId(OTHER_ID) },
    { _id: 'l4', resumeId: new Types.ObjectId(RESUME_ID), operationType: 'contract_blocked_by_release', operatorId: new Types.ObjectId(ADMIN_ID) },
  ];

  function build(seedLogs: any[]) {
    const { model: resumeModel } = buildResumeModel({
      _id: new Types.ObjectId(RESUME_ID), userId: new Types.ObjectId(CREATOR_ID),
    });
    const { model: logModel, lastFindFilter } = buildLogModel(seedLogs);
    const svc = makeService({
      resumeModel, resumeOperationLogModel: logModel,
      userModel: buildUserModel({}), notificationHelper: {} as any,
    });
    return { svc, lastFindFilter };
  }

  it('管理员 → 返回全部 3 类释放相关日志', async () => {
    const { svc } = build(seed);
    const logs = await svc.getReleaseLogs(RESUME_ID, ADMIN_ID, true);
    expect(logs).toHaveLength(4);
  });

  it('创建人 → 返回全部 3 类释放相关日志', async () => {
    const { svc } = build(seed);
    const logs = await svc.getReleaseLogs(RESUME_ID, CREATOR_ID, false);
    expect(logs).toHaveLength(4);
  });

  it('其他用户 → 仅返回自己作为 operatorId 的 contract_blocked_by_release', async () => {
    const { svc, lastFindFilter } = build(seed);
    const logs = await svc.getReleaseLogs(RESUME_ID, OTHER_ID, false);
    expect(logs).toHaveLength(1);
    expect(logs[0]._id).toBe('l3');
    expect(lastFindFilter.filter.operationType).toBe('contract_blocked_by_release');
    expect(String(lastFindFilter.filter.operatorId)).toBe(OTHER_ID);
  });
});

