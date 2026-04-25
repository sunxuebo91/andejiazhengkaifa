/* eslint-disable */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housekeeping';

(async () => {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const now = new Date();
  console.log('🕐 当前服务器时间:', now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  console.log('   星期:', ['日','一','二','三','四','五','六'][now.getDay()]);
  console.log('');

  // 1. 列出所有规则及关键字段
  const rules = await db.collection('lead_transfer_rules').find({}).toArray();
  console.log(`📋 共 ${rules.length} 条规则\n`);
  for (const r of rules) {
    console.log(`── 规则: ${r.ruleName} (${r._id})`);
    console.log(`   enabled: ${r.enabled}`);
    console.log(`   targetModule: ${r.targetModule || 'customer'}`);
    console.log(`   triggerConditions:`, JSON.stringify({
      inactiveHours: r.triggerConditions?.inactiveHours,
      transferCooldownHours: r.triggerConditions?.transferCooldownHours,
      maxTransferCount: r.triggerConditions?.maxTransferCount,
      contractStatuses: r.triggerConditions?.contractStatuses,
      leadSources: r.triggerConditions?.leadSources,
    }));
    console.log(`   executionWindow:`, JSON.stringify(r.executionWindow));
    console.log(`   executionState:`, JSON.stringify(r.executionState));
    console.log(`   statistics:`, JSON.stringify(r.statistics));
    console.log(`   userQuotas count: ${r.userQuotas?.length}`);
    console.log('');
  }

  // 2. 今日记录数
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayCount = await db.collection('lead_transfer_records').countDocuments({
    transferredAt: { $gte: startOfToday },
  });
  console.log(`📊 今日(00:00至今) lead_transfer_records 数: ${todayCount}`);

  // 3. 最近一条记录
  const lastRec = await db.collection('lead_transfer_records')
    .find({}).sort({ transferredAt: -1 }).limit(1).toArray();
  if (lastRec[0]) {
    console.log(`📌 最近一条记录: transferredAt=${lastRec[0].transferredAt?.toLocaleString?.('zh-CN', { timeZone: 'Asia/Shanghai' })}, status=${lastRec[0].status}`);
  }

  // 4. 昨日19:00之后的记录数（确认昨天19:04的批次大小）
  const y19 = new Date(now);
  y19.setDate(y19.getDate() - 1);
  y19.setHours(19, 0, 0, 0);
  const y20 = new Date(y19);
  y20.setHours(20, 0, 0, 0);
  const y19count = await db.collection('lead_transfer_records').countDocuments({
    transferredAt: { $gte: y19, $lt: y20 },
  });
  console.log(`📊 昨日19:00-20:00 记录数: ${y19count}`);

  // 5. 今日各小时的记录分布
  for (let h = 0; h <= now.getHours(); h++) {
    const hStart = new Date(startOfToday); hStart.setHours(h, 0, 0, 0);
    const hEnd = new Date(startOfToday);   hEnd.setHours(h + 1, 0, 0, 0);
    const c = await db.collection('lead_transfer_records').countDocuments({
      transferredAt: { $gte: hStart, $lt: hEnd },
    });
    if (c > 0) console.log(`   今日 ${String(h).padStart(2,'0')}:00 → ${c} 条`);
  }

  // 6. 检查每条规则今天能捞到多少符合条件的客户（按规则查）
  console.log('\n🔍 各启用规则当前可流转客户数（根据触发条件即时查询）:');
  for (const rule of rules.filter(r => r.enabled)) {
    const tc = rule.triggerConditions || {};
    const threshold = new Date(now.getTime() - (tc.inactiveHours || 0) * 3600 * 1000);
    const sourceUserIds = (rule.userQuotas || [])
      .filter(u => u.role === 'source' || u.role === 'both')
      .map(u => new mongoose.Types.ObjectId(u.userId));
    const query = {
      assignedTo: { $in: sourceUserIds },
      contractStatus: { $in: tc.contractStatuses || [] },
      $or: [
        { lastActivityAt: { $lt: threshold } },
        { lastActivityAt: { $exists: false }, updatedAt: { $lt: threshold } },
        { lastActivityAt: null, updatedAt: { $lt: threshold } },
      ],
      inPublicPool: false,
      autoTransferEnabled: { $ne: false },
      isFrozen: { $ne: true },
      leadSource: { $ne: '转介绍' },
    };
    if (tc.leadSources?.length) query.leadSource = { $in: tc.leadSources };
    const cntNoCooldown = await db.collection('customers').countDocuments(query);

    // 加上 cooldown 过滤
    const query2 = { ...query };
    if ((tc.transferCooldownHours || 0) > 0) {
      const cooldownThreshold = new Date(now.getTime() - tc.transferCooldownHours * 3600 * 1000);
      query2.$and = [
        ...(query2.$and || []),
        { $or: [
          { lastTransferredAt: { $exists: false } },
          { lastTransferredAt: null },
          { lastTransferredAt: { $lt: cooldownThreshold } },
        ]},
      ];
      const cnt2 = await db.collection('customers').countDocuments(query2);
      console.log(`   规则「${rule.ruleName}」: 不含冷却=${cntNoCooldown}, 含${tc.transferCooldownHours}h冷却=${cnt2}`);
      // 找出被冷却挡住的客户中最早的 lastTransferredAt
      const stuckSample = await db.collection('customers').find({
        ...query,
        lastTransferredAt: { $gte: cooldownThreshold },
      }).project({ customerId: 1, name: 1, lastTransferredAt: 1 }).sort({ lastTransferredAt: 1 }).limit(3).toArray();
      if (stuckSample.length) {
        console.log(`     ↳ 被冷却期挡住的样例:`);
        for (const s of stuckSample) {
          console.log(`       ${s.customerId} ${s.name} lastTransferredAt=${s.lastTransferredAt?.toLocaleString?.('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
        }
      }
    } else {
      console.log(`   规则「${rule.ruleName}」: ${cntNoCooldown} 条候选（无冷却）`);
    }
  }

  await mongoose.connection.close();
})().catch(err => { console.error(err); process.exit(1); });
