/* eslint-disable */
// 诊断脚本：排查某客户为什么没被自动流转
// 用法: node backend/scripts/diagnose-lead-transfer.js <customerId>
//   customerId 可以是业务编号 (CUSxxxxx) 或 Mongo _id

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const CUSTOMER_ID_ARG = process.argv[2] || 'CUS23963593828';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log(`\n✅ 已连接: ${MONGO_URI}`);
  console.log(`🔍 查询客户: ${CUSTOMER_ID_ARG}\n`);

  const db = mongoose.connection.db;
  const customers = db.collection('customers');
  const rules = db.collection('lead_transfer_rules');
  const records = db.collection('lead_transfer_records');
  const followUps = db.collection('customerfollowups');
  const users = db.collection('users');

  // 1. 查客户
  const isObjectId = /^[a-f0-9]{24}$/i.test(CUSTOMER_ID_ARG);
  const q = isObjectId
    ? { _id: new mongoose.Types.ObjectId(CUSTOMER_ID_ARG) }
    : { customerId: CUSTOMER_ID_ARG };
  const c = await customers.findOne(q);
  if (!c) {
    console.log('❌ 客户不存在');
    process.exit(1);
  }

  const owner = c.assignedTo ? await users.findOne({ _id: c.assignedTo }, { projection: { name: 1, username: 1 } }) : null;
  console.log('==== 客户基本信息 ====');
  console.log({
    _id: c._id.toString(),
    customerId: c.customerId,
    name: c.name,
    phone: c.phone,
    leadSource: c.leadSource,
    contractStatus: c.contractStatus,
    leadLevel: c.leadLevel,
    assignedTo: c.assignedTo?.toString(),
    assignedToName: owner ? `${owner.name}(${owner.username})` : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    lastActivityAt: c.lastActivityAt,
    lastTransferredAt: c.lastTransferredAt,
    transferCount: c.transferCount || 0,
    inPublicPool: !!c.inPublicPool,
    autoTransferEnabled: c.autoTransferEnabled !== false,
    isFrozen: !!c.isFrozen,
  });

  const fus = await followUps.find({ $or: [{ customerId: c._id }, { customerId: c._id.toString() }] }).sort({ createdAt: -1 }).toArray();
  console.log(`\n==== 跟进记录 (共 ${fus.length} 条，最近 5 条) ====`);
  for (const f of fus.slice(0, 5)) {
    console.log({ createdAt: f.createdAt, createdBy: f.createdBy?.toString(), type: f.type, content: (f.content || '').slice(0, 60) });
  }

  // 2. 查流转记录
  const rec = await records.find({ customerId: c._id }).sort({ transferredAt: -1 }).limit(5).toArray();
  console.log(`\n==== 历史流转记录 (最近 ${rec.length} 条) ====`);
  for (const r of rec) {
    console.log({ transferredAt: r.transferredAt, fromUser: r.fromUserId?.toString(), toUser: r.toUserId?.toString(), ruleId: r.ruleId?.toString(), status: r.status });
  }

  // 3. 查所有启用的 customer 规则
  const enabledRules = await rules.find({ enabled: true, $or: [{ targetModule: 'customer' }, { targetModule: { $exists: false } }] }).toArray();
  console.log(`\n==== 启用的客户流转规则 (共 ${enabledRules.length} 条) ====`);

  const now = new Date();
  for (const r of enabledRules) {
    console.log(`\n--- 规则: ${r.ruleName} (${r._id}) ---`);
    const tc = r.triggerConditions || {};
    const ew = r.executionWindow || {};
    console.log({
      enabled: r.enabled,
      targetModule: r.targetModule,
      inactiveHours: tc.inactiveHours,
      transferCooldownHours: tc.transferCooldownHours,
      maxTransferCount: tc.maxTransferCount,
      contractStatuses: tc.contractStatuses,
      leadSources: tc.leadSources,
      executionWindow: ew,
      userQuotas: (r.userQuotas || []).map(u => ({ userName: u.userName, role: u.role, userId: u.userId?.toString() })),
    });

    // 逐项匹配
    const checks = [];
    // a) 负责人在 source/both
    const sourceIds = (r.userQuotas || []).filter(u => u.role === 'source' || u.role === 'both').map(u => u.userId?.toString());
    checks.push(['assignedTo ∈ 流出人员(source/both)', sourceIds.includes(c.assignedTo?.toString()), `当前负责人=${c.assignedTo?.toString()}, 流出名单=${sourceIds.join(',')}`]);

    // b) 合同状态
    const statuses = tc.contractStatuses || [];
    checks.push(['contractStatus ∈ 规则状态列表', statuses.includes(c.contractStatus), `客户状态=${c.contractStatus}, 允许=${statuses.join(',')}`]);

    // c) 不活跃时间
    const threshold = new Date(now.getTime() - (tc.inactiveHours || 48) * 3600 * 1000);
    const lastAct = c.lastActivityAt || c.updatedAt;
    const hoursInactive = Math.floor((now - lastAct) / 3600000);
    checks.push([`lastActivityAt < 阈值(${tc.inactiveHours}h前)`, lastAct < threshold, `lastActivityAt=${lastAct && lastAct.toISOString()}, 已${hoursInactive}h无活动`]);

    // d) 公海/自动流转/冻结
    checks.push(['inPublicPool = false', !c.inPublicPool, `当前=${!!c.inPublicPool}`]);
    checks.push(['autoTransferEnabled ≠ false', c.autoTransferEnabled !== false, `当前=${c.autoTransferEnabled}`]);
    checks.push(['isFrozen ≠ true', !c.isFrozen, `当前=${!!c.isFrozen}`]);

    // e) 来源排除转介绍
    checks.push(["leadSource ≠ '转介绍'", c.leadSource !== '转介绍', `来源=${c.leadSource}`]);

    // f) 来源白名单
    if (tc.leadSources && tc.leadSources.length > 0) {
      checks.push(['leadSource ∈ 规则来源白名单', tc.leadSources.includes(c.leadSource), `来源=${c.leadSource}, 允许=${tc.leadSources.join(',')}`]);
    } else {
      checks.push(['leadSource ∈ 规则来源白名单', true, '（规则未限制来源）']);
    }

    // g) maxTransferCount
    if ((tc.maxTransferCount || 0) > 0) {
      checks.push([`transferCount < maxTransferCount(${tc.maxTransferCount})`, (c.transferCount || 0) < tc.maxTransferCount, `当前=${c.transferCount || 0}`]);
    } else {
      checks.push(['maxTransferCount 无限制', true, '0=不限']);
    }

    // h) 冷却期
    if ((tc.transferCooldownHours || 0) > 0) {
      const cooldownThreshold = new Date(now.getTime() - tc.transferCooldownHours * 3600 * 1000);
      const pass = !c.lastTransferredAt || c.lastTransferredAt < cooldownThreshold;
      checks.push([`lastTransferredAt < 冷却阈值(${tc.transferCooldownHours}h前)`, pass, `lastTransferredAt=${c.lastTransferredAt && c.lastTransferredAt.toISOString()}`]);
    } else {
      checks.push(['冷却期 无限制', true, '0=不限']);
    }

    // i) 执行时间窗口（仅提示，手动执行可忽略）
    if (ew.enabled) {
      const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const inWin = cur >= ew.startTime && cur <= ew.endTime;
      checks.push([`在执行时间窗口 ${ew.startTime}-${ew.endTime}`, inWin, `当前=${cur}（手动执行忽略此项）`]);
    }

    console.log('条件匹配：');
    for (const [label, ok, detail] of checks) {
      console.log(`   ${ok ? '✅' : '❌'} ${label}  —  ${detail}`);
    }
    const failed = checks.filter(x => !x[1]);
    if (failed.length === 0) {
      console.log('   🎯 所有条件都满足 —— 该客户应被此规则流转');
    } else {
      console.log(`   🚫 有 ${failed.length} 项未满足 —— 被此规则过滤掉`);
    }
  }

  if (enabledRules.length === 0) {
    console.log('⚠️  没有任何启用的客户流转规则！所有客户都不会被自动流转。');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
