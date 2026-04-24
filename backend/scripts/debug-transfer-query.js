/* eslint-disable */
// 调试脚本：复刻 executeRuleTransfer 的查询，看为什么返回 0 条
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const RULE_ID = '69eb46932dc23dc8b200b630';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping');
  const db = mongoose.connection.db;
  const rule = await db.collection('lead_transfer_rules').findOne({ _id: new mongoose.Types.ObjectId(RULE_ID) });
  const tc = rule.triggerConditions;
  const now = new Date();
  const threshold = new Date(now.getTime() - tc.inactiveHours * 3600 * 1000);
  const sourceUserIds = (rule.userQuotas || [])
    .filter(u => u.role === 'source' || u.role === 'both')
    .map(u => new mongoose.Types.ObjectId(u.userId));

  const query = {
    assignedTo: { $in: sourceUserIds },
    contractStatus: { $in: tc.contractStatuses },
    $or: [
      { lastActivityAt: { $lt: threshold } },
      { lastActivityAt: { $exists: false }, updatedAt: { $lt: threshold } },
      { lastActivityAt: null, updatedAt: { $lt: threshold } },
    ],
    inPublicPool: false,
    autoTransferEnabled: { $ne: false },
    isFrozen: { $ne: true },
    leadSource: tc.leadSources?.length ? { $in: tc.leadSources } : { $ne: '转介绍' },
  };
  if ((tc.transferCooldownHours ?? 0) > 0) {
    const cd = new Date(now.getTime() - tc.transferCooldownHours * 3600 * 1000);
    query.$and = [{ $or: [{ lastTransferredAt: { $exists: false } }, { lastTransferredAt: null }, { lastTransferredAt: { $lt: cd } }] }];
  }

  const customers = db.collection('customers');
  const total = await customers.countDocuments(query);
  console.log(`\n🎯 完整查询命中: ${total}\n`);

  // 逐条放宽条件看卡在哪
  const steps = [
    ['assignedTo in 源负责人', { assignedTo: query.assignedTo }],
    ['+ contractStatus in 待定/匹配中', { assignedTo: query.assignedTo, contractStatus: query.contractStatus }],
    ['+ lastActivity/updatedAt < 48h 前', { assignedTo: query.assignedTo, contractStatus: query.contractStatus, $or: query.$or }],
    ['+ inPublicPool=false', { assignedTo: query.assignedTo, contractStatus: query.contractStatus, $or: query.$or, inPublicPool: false }],
    ['+ autoTransferEnabled ≠ false', { assignedTo: query.assignedTo, contractStatus: query.contractStatus, $or: query.$or, inPublicPool: false, autoTransferEnabled: { $ne: false } }],
    ['+ isFrozen ≠ true', { assignedTo: query.assignedTo, contractStatus: query.contractStatus, $or: query.$or, inPublicPool: false, autoTransferEnabled: { $ne: false }, isFrozen: { $ne: true } }],
    ['+ leadSource 白名单', { assignedTo: query.assignedTo, contractStatus: query.contractStatus, $or: query.$or, inPublicPool: false, autoTransferEnabled: { $ne: false }, isFrozen: { $ne: true }, leadSource: query.leadSource }],
    ['+ 24h 冷却期', query],
  ];
  for (const [label, q] of steps) {
    const c = await customers.countDocuments(q);
    console.log(`  ${label.padEnd(40, ' ')} → ${c}`);
  }

  // 看目标客户 CUS23963593828 当前状态
  console.log('\n===== 目标客户 CUS23963593828 =====');
  const target = await customers.findOne({ customerId: 'CUS23963593828' });
  if (target) {
    console.log({
      _id: target._id.toString(),
      assignedTo: target.assignedTo?.toString(),
      contractStatus: target.contractStatus,
      lastActivityAt: target.lastActivityAt,
      updatedAt: target.updatedAt,
      lastTransferredAt: target.lastTransferredAt,
      inPublicPool: target.inPublicPool,
      autoTransferEnabled: target.autoTransferEnabled,
      isFrozen: target.isFrozen,
      leadSource: target.leadSource,
      transferCount: target.transferCount,
      hoursSinceActivity: ((Date.now() - (target.lastActivityAt || target.updatedAt).getTime()) / 3600000).toFixed(1),
      hoursSinceTransfer: target.lastTransferredAt ? ((Date.now() - target.lastTransferredAt.getTime()) / 3600000).toFixed(1) : null,
    });
  } else {
    console.log('不存在');
  }

  // 看几个最老的候选
  console.log('\n===== 最老 10 条命中记录 =====');
  const oldest = await customers.find(query).sort({ lastActivityAt: 1, updatedAt: 1 }).limit(10).toArray();
  for (const c of oldest) {
    console.log({
      customerId: c.customerId,
      assignedTo: c.assignedTo?.toString(),
      contractStatus: c.contractStatus,
      lastActivityAt: c.lastActivityAt,
      lastTransferredAt: c.lastTransferredAt,
      leadSource: c.leadSource,
    });
  }

  await mongoose.disconnect();
})();
